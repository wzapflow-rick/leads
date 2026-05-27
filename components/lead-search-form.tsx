"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAZILIAN_STATES } from "@/lib/utils";
import { Search, Loader2, Filter, ChevronDown, ChevronUp, Flame, ThermometerSun, Snowflake, Globe, MapPin } from "lucide-react";
import type { PlaceResult } from "@/lib/google-places";

interface LeadSearchFormProps {
  onResults: (results: PlaceResult[], filters: { nicho: string; cidade: string; estado: string }) => void;
}

// Nichos sugeridos para delivery
const NICHOS_SUGERIDOS = [
  "pizzaria delivery",
  "hamburgueria artesanal",
  "restaurante delivery",
  "marmitaria",
  "acai delivery",
  "comida japonesa delivery",
  "pastelaria",
  "lanchonete",
  "comida caseira",
  "espetinho",
  "churrasquinho",
  "doceria",
  "confeitaria",
  "salgados",
  "quentinha",
  "food truck",
  "espetaria",
  "petiscaria",
];

export function LeadSearchForm({ onResults }: LeadSearchFormProps) {
  const [nicho, setNicho] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [maxAvaliacoes, setMaxAvaliacoes] = useState<number>(100);
  const [excluirRedes, setExcluirRedes] = useState(true);
  const [apenasQuentes, setApenasQuentes] = useState(false);
  const [usarBairros, setUsarBairros] = useState(false);
  const [excluirComSistema, setExcluirComSistema] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    quentes: number;
    mornos: number;
    frios: number;
    semWebsite: number;
    comSistema: number;
  } | null>(null);
  const [bairrosDisponiveis, setBairrosDisponiveis] = useState<string[]>([]);

  // Redes/franquias conhecidas para excluir
  const REDES_FRANQUIAS = [
    "mcdonald", "burger king", "subway", "domino", "pizza hut", 
    "habib", "giraffas", "bob's", "outback", "madero", "applebee",
    "china in box", "spoleto", "ragazzo", "jeronimo", "bullguer",
    "burger king", "kfc", "popeyes", "taco bell", "wendy"
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStats(null);

    if (!nicho || !cidade || !estado) {
      setError("Preencha todos os campos");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/google-places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          nicho, 
          cidade, 
          estado,
          usarBairros,
          apenasQuentes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao buscar");
      }

      let results: PlaceResult[] = data.results;
      setBairrosDisponiveis(data.bairrosDisponiveis || []);

      // Filtrar por max avaliacoes (negocios menores)
      if (maxAvaliacoes > 0) {
        results = results.filter(
          (r) => !r.user_ratings_total || r.user_ratings_total <= maxAvaliacoes
        );
      }

      // Excluir redes/franquias
      if (excluirRedes) {
        results = results.filter((r) => {
          const nomeLower = r.name.toLowerCase();
          return !REDES_FRANQUIAS.some((rede) => nomeLower.includes(rede));
        });
      }

      // Excluir quem ja tem sistema (website profissional)
      if (excluirComSistema) {
        results = results.filter((r) => !r.has_professional_website);
      }

      // Atualiza stats apos filtros locais
      const filteredStats = {
        total: results.length,
        quentes: results.filter(p => p.lead_quality === "quente").length,
        mornos: results.filter(p => p.lead_quality === "morno").length,
        frios: results.filter(p => p.lead_quality === "frio").length,
        semWebsite: results.filter(p => !p.website).length,
        comSistema: results.filter(p => p.has_professional_website).length,
      };

      setStats(filteredStats);
      onResults(results, { nicho, cidade, estado });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Buscar Estabelecimentos no Google Maps
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Nicho / Categoria
              </label>
              <Input
                placeholder="Ex: pizzaria delivery, hamburgueria"
                value={nicho}
                onChange={(e) => setNicho(e.target.value)}
                list="nichos-sugeridos"
              />
              <datalist id="nichos-sugeridos">
                {NICHOS_SUGERIDOS.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Cidade
              </label>
              <Input
                placeholder="Ex: Sao Paulo"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Estado
              </label>
              <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="">Selecione o estado</option>
                {BRAZILIAN_STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Botao para mostrar filtros avancados */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filtros avancados (encontrar leads de qualidade)
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {/* Filtros avancados */}
          {showAdvanced && (
            <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Max. avaliacoes
                  </label>
                  <Select 
                    value={maxAvaliacoes.toString()} 
                    onChange={(e) => setMaxAvaliacoes(Number(e.target.value))}
                  >
                    <option value="0">Sem limite</option>
                    <option value="20">Ate 20 avaliacoes</option>
                    <option value="50">Ate 50 avaliacoes</option>
                    <option value="100">Ate 100 avaliacoes</option>
                    <option value="200">Ate 200 avaliacoes</option>
                    <option value="500">Ate 500 avaliacoes</option>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Negocios menores = mais propensos a comprar
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Filtros de qualidade
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={excluirComSistema}
                        onChange={(e) => setExcluirComSistema(e.target.checked)}
                        className="rounded border-border"
                      />
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      Excluir quem ja tem sistema
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={excluirRedes}
                        onChange={(e) => setExcluirRedes(e.target.checked)}
                        className="rounded border-border"
                      />
                      Excluir redes/franquias
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={apenasQuentes}
                        onChange={(e) => setApenasQuentes(e.target.checked)}
                        className="rounded border-border"
                      />
                      <Flame className="h-3 w-3 text-orange-500" />
                      Apenas leads quentes/mornos
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Busca expandida
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={usarBairros}
                        onChange={(e) => setUsarBairros(e.target.checked)}
                        className="rounded border-border"
                      />
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      Buscar por bairros (mais resultados)
                    </label>
                    {bairrosDisponiveis.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Bairros: {bairrosDisponiveis.join(", ")}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Busca por bairros pode encontrar ate 3x mais resultados
                  </p>
                </div>
              </div>

              {/* Legenda de qualidade */}
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium mb-2">Legenda de qualidade:</p>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span>Quente: Sem website, poucas avaliacoes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ThermometerSun className="h-4 w-4 text-yellow-500" />
                    <span>Morno: Potencial medio</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Snowflake className="h-4 w-4 text-blue-500" />
                    <span>Frio: Ja tem sistema ou negocio grande</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando{usarBairros ? " (busca expandida)" : ""}...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar Leads
                </>
              )}
            </Button>

            {stats && (
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="text-muted-foreground">
                  {stats.total} encontrados:
                </span>
                <span className="flex items-center gap-1 text-orange-500">
                  <Flame className="h-4 w-4" />
                  {stats.quentes} quentes
                </span>
                <span className="flex items-center gap-1 text-yellow-500">
                  <ThermometerSun className="h-4 w-4" />
                  {stats.mornos} mornos
                </span>
                <span className="flex items-center gap-1 text-blue-500">
                  <Snowflake className="h-4 w-4" />
                  {stats.frios} frios
                </span>
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
