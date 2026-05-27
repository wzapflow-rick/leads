import { NextRequest, NextResponse } from "next/server";
import { searchPlaces, searchPlacesExpanded, calculateLeadScore, isProfessionalWebsite } from "@/lib/google-places";

// Bairros principais de grandes cidades para busca expandida
const BAIRROS_PRINCIPAIS: Record<string, string[]> = {
  "Sao Paulo": ["Moema", "Pinheiros", "Vila Mariana", "Santana", "Tatuape", "Lapa", "Perdizes", "Itaim Bibi", "Jardins", "Bela Vista"],
  "Rio de Janeiro": ["Copacabana", "Ipanema", "Leblon", "Tijuca", "Barra da Tijuca", "Botafogo", "Flamengo", "Meier", "Centro"],
  "Belo Horizonte": ["Savassi", "Funcionarios", "Lourdes", "Centro", "Pampulha", "Buritis", "Contagem"],
  "Curitiba": ["Batel", "Centro", "Agua Verde", "Portao", "Boa Vista", "Santa Felicidade"],
  "Porto Alegre": ["Moinhos de Vento", "Centro", "Cidade Baixa", "Petropolis", "Menino Deus"],
  "Salvador": ["Pituba", "Barra", "Rio Vermelho", "Itaigara", "Centro"],
  "Fortaleza": ["Aldeota", "Meireles", "Centro", "Fatima", "Papicu"],
  "Recife": ["Boa Viagem", "Centro", "Casa Forte", "Espinheiro", "Pina"],
  "Brasilia": ["Asa Sul", "Asa Norte", "Lago Sul", "Sudoeste", "Aguas Claras"],
  "Goiania": ["Setor Bueno", "Setor Marista", "Centro", "Jardim Goias"],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nicho, cidade, estado, usarBairros = false, apenasQuentes = false } = body;

    if (!nicho || !cidade || !estado) {
      return NextResponse.json(
        { error: "Nicho, cidade e estado sao obrigatorios" },
        { status: 400 }
      );
    }

    let places;
    
    if (usarBairros) {
      // Busca expandida com bairros
      const bairros = BAIRROS_PRINCIPAIS[cidade] || [];
      places = await searchPlacesExpanded(nicho, cidade, estado, bairros);
    } else {
      // Busca normal
      places = await searchPlaces(nicho, cidade, estado, 3);
      
      // Adiciona score de qualidade
      places = places.map(place => {
        const { score, quality } = calculateLeadScore(place);
        return {
          ...place,
          lead_score: score,
          lead_quality: quality,
          has_professional_website: isProfessionalWebsite(place.website),
          is_operational: place.business_status === "OPERATIONAL" || !place.business_status,
        };
      });
    }

    // Filtra apenas com telefone
    let placesWithPhone = places.filter(
      (place) =>
        place.formatted_phone_number || place.international_phone_number
    );

    // Filtra apenas operacionais
    placesWithPhone = placesWithPhone.filter(
      (place) => place.is_operational !== false
    );

    // Filtra apenas leads quentes se solicitado
    if (apenasQuentes) {
      placesWithPhone = placesWithPhone.filter(
        (place) => place.lead_quality === "quente" || place.lead_quality === "morno"
      );
    }

    // Ordena por score de qualidade (maior primeiro)
    placesWithPhone.sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0));

    // Estatisticas
    const stats = {
      total: placesWithPhone.length,
      quentes: placesWithPhone.filter(p => p.lead_quality === "quente").length,
      mornos: placesWithPhone.filter(p => p.lead_quality === "morno").length,
      frios: placesWithPhone.filter(p => p.lead_quality === "frio").length,
      semWebsite: placesWithPhone.filter(p => !p.website).length,
      comSistema: placesWithPhone.filter(p => p.has_professional_website).length,
    };

    return NextResponse.json({
      results: placesWithPhone,
      stats,
      totalWithoutPhone: places.length - placesWithPhone.length,
      bairrosDisponiveis: BAIRROS_PRINCIPAIS[cidade] || [],
    });
  } catch (error) {
    console.error("Google Places API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar lugares" },
      { status: 500 }
    );
  }
}
