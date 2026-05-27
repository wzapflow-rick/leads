const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";

export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  business_status?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  // Novos campos de qualidade
  lead_score?: number;
  lead_quality?: "quente" | "morno" | "frio";
  has_professional_website?: boolean;
  is_operational?: boolean;
}

export interface TextSearchResult {
  places: {
    id: string;
    displayName: { text: string };
    formattedAddress: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
    rating?: number;
    userRatingCount?: number;
    types?: string[];
    businessStatus?: string;
  }[];
  nextPageToken?: string;
}

export async function searchPlaces(
  query: string,
  cidade: string,
  estado: string,
  maxPages: number = 3 // Busca ate 3 paginas = 60 resultados
): Promise<PlaceResult[]> {
  const textQuery = `${query} em ${cidade}, ${estado}, Brasil`;
  const allResults: PlaceResult[] = [];
  let pageToken: string | undefined = undefined;
  let currentPage = 0;

  while (currentPage < maxPages) {
    // Use the new Places API (Text Search)
    const requestBody: Record<string, unknown> = {
      textQuery,
      languageCode: "pt-BR",
      regionCode: "BR",
      maxResultCount: 20,
    };

    // Adiciona pageToken se existir (para proximas paginas)
    if (pageToken) {
      requestBody.pageToken = pageToken;
    }

    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.types,places.businessStatus,nextPageToken",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Places API Error: ${response.status} - ${error}`);
    }

    const data: TextSearchResult = await response.json();

    if (!data.places || data.places.length === 0) {
      break;
    }

    // Transform e adiciona aos resultados
    const pageResults = data.places.map((place) => ({
      place_id: place.id,
      name: place.displayName?.text || "",
      formatted_address: place.formattedAddress || "",
      formatted_phone_number: place.nationalPhoneNumber,
      international_phone_number: place.internationalPhoneNumber,
      website: place.websiteUri,
      rating: place.rating,
      user_ratings_total: place.userRatingCount,
      types: place.types,
      business_status: place.businessStatus,
    }));

    allResults.push(...pageResults);
    currentPage++;

    // Verifica se tem mais paginas
    if (data.nextPageToken) {
      pageToken = data.nextPageToken;
      // Aguarda um pouco antes da proxima requisicao (evita rate limiting)
      await new Promise((resolve) => setTimeout(resolve, 500));
    } else {
      break; // Nao tem mais paginas
    }
  }

  return allResults;
}

export async function getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,rating,userRatingCount,types,businessStatus",
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const place = await response.json();

  return {
    place_id: place.id,
    name: place.displayName?.text || "",
    formatted_address: place.formattedAddress || "",
    formatted_phone_number: place.nationalPhoneNumber,
    international_phone_number: place.internationalPhoneNumber,
    website: place.websiteUri,
    rating: place.rating,
    user_ratings_total: place.userRatingCount,
    types: place.types,
    business_status: place.businessStatus,
  };
}

// Detecta se o website parece profissional (indica que ja tem sistema)
export function isProfessionalWebsite(website?: string): boolean {
  if (!website) return false;
  
  const lowerUrl = website.toLowerCase();
  
  // Links para redes sociais = nao tem website proprio
  const socialMediaPatterns = [
    "facebook.com", "fb.com", "instagram.com", "twitter.com", 
    "linkedin.com", "youtube.com", "tiktok.com", "wa.me", "whatsapp"
  ];
  
  if (socialMediaPatterns.some(pattern => lowerUrl.includes(pattern))) {
    return false;
  }
  
  // Plataformas de delivery = ja usa sistema
  const deliveryPlatforms = [
    "ifood.com", "rappi.com", "uber.com", "aiqfome", "deliverymuch",
    "goomer.com", "anota.ai", "cardapio.ai", "menudigital", "cardapiodigital"
  ];
  
  if (deliveryPlatforms.some(platform => lowerUrl.includes(platform))) {
    return true; // Lead frio - ja tem sistema
  }
  
  // Se tem dominio proprio (.com.br, .com) provavelmente tem sistema
  if (lowerUrl.includes(".com.br") || (lowerUrl.includes(".com") && !lowerUrl.includes("."))) {
    return true;
  }
  
  return false;
}

// Calcula score de qualidade do lead (0-100)
export function calculateLeadScore(place: PlaceResult): { score: number; quality: "quente" | "morno" | "frio" } {
  let score = 50; // Base score
  
  // Sem website = +25 pontos (lead quente)
  if (!place.website) {
    score += 25;
  } else if (isProfessionalWebsite(place.website)) {
    score -= 30; // Ja tem sistema
  } else {
    score += 10; // Tem apenas rede social
  }
  
  // Poucas avaliacoes = negocio menor = +20 pontos
  const ratings = place.user_ratings_total || 0;
  if (ratings === 0) {
    score += 15;
  } else if (ratings <= 20) {
    score += 20;
  } else if (ratings <= 50) {
    score += 15;
  } else if (ratings <= 100) {
    score += 10;
  } else if (ratings > 500) {
    score -= 15; // Negocio grande
  }
  
  // Rating medio (3.5-4.5) = ideal, nem muito ruim nem perfeito
  const rating = place.rating || 0;
  if (rating >= 3.5 && rating <= 4.5) {
    score += 10;
  } else if (rating === 5.0 && ratings > 50) {
    score -= 5; // Perfeito com muitas avaliacoes = suspeito ou ja bem estabelecido
  } else if (rating < 3.0) {
    score -= 10; // Rating muito baixo
  }
  
  // Status operacional
  if (place.business_status === "CLOSED_TEMPORARILY" || place.business_status === "CLOSED_PERMANENTLY") {
    score -= 50;
  }
  
  // Normaliza entre 0-100
  score = Math.max(0, Math.min(100, score));
  
  // Define qualidade
  let quality: "quente" | "morno" | "frio";
  if (score >= 70) {
    quality = "quente";
  } else if (score >= 45) {
    quality = "morno";
  } else {
    quality = "frio";
  }
  
  return { score, quality };
}

// Busca expandida com bairros para mais resultados
export async function searchPlacesExpanded(
  query: string,
  cidade: string,
  estado: string,
  bairros: string[] = []
): Promise<PlaceResult[]> {
  const allResults: PlaceResult[] = [];
  const seenIds = new Set<string>();
  
  // Busca principal pela cidade
  const mainResults = await searchPlaces(query, cidade, estado, 3);
  for (const result of mainResults) {
    if (!seenIds.has(result.place_id)) {
      seenIds.add(result.place_id);
      allResults.push(result);
    }
  }
  
  // Busca por bairros (se fornecidos)
  for (const bairro of bairros) {
    try {
      const bairroResults = await searchPlaces(query, `${bairro}, ${cidade}`, estado, 2);
      for (const result of bairroResults) {
        if (!seenIds.has(result.place_id)) {
          seenIds.add(result.place_id);
          allResults.push(result);
        }
      }
      // Delay entre requisicoes
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch {
      // Ignora erro de bairro especifico
    }
  }
  
  // Adiciona score de qualidade a cada resultado
  return allResults.map(place => {
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
