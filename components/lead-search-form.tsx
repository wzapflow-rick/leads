"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAZILIAN_STATES } from "@/lib/utils";
import { Search, Loader2, Filter, ChevronDown, ChevronUp } from "lucide-react";
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
];

export function LeadSearchForm({ onResults }: LeadSearchFormProps) {
  const [nicho, setNicho] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [maxAvaliacoes, setMaxAvaliacoes] = useState<number>(100);
  const [excluirSemTelefone, setExcluirSemTelefone] = useState(true);
  const [excluirRedes, setExcluirRedes] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalBuscados, setTotalBuscados] = useState<number | null>(null);

  // Redes/franquias conhecidas para excluir
  const REDES_FRANQUIAS = [
    "mcdonald", "burger king", "subway", "domino", "pizza hut", 
    "habib", "giraffas", "bob's", "outback", "madero", "applebee",
    "china in box", "spoleto", "ragazzo", "jeronimo", "bullguer"
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTotalBuscados(null);

    if (!nicho || !cidade || !estado) {
      setError("Preencha todos os campos");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/google-places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nicho, cidade, estado }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao buscar");
      }

      let results: PlaceResult[] = data.results;
      const totalOriginal = results.length;

      // Filtrar por max avaliacoes (negocios menores)
      if (maxAvaliacoes > 0) {
        results = results.filter(
          (r) => !r.user_ratings_total || r.user_ratings_total <= maxAvaliacoes
        );
      }

      // Excluir sem telefone
      if (excluirSemTelefone) {
        results = results.filter(
          (r) => r.formatted_phone_number || r.international_phone_number
        );
      }

      // Excluir redes/franquias
      if (excluirRedes) {
        results = results.filter((r) => {
          const nomeLower = r.name.toLowerCase();
          return !REDES_FRANQUIAS.some((rede) => nomeLower.includes(rede));
        });
      }

      // Ordenar por menos avaliacoes primeiro (negocios menores)
      results.sort((a, b) => 
        (a.user_ratings_total || 0) - (b.user_ratings_total || 0)
      );

      setTotalBuscados(totalOriginal);
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
            Filtros avancados (encontrar negocios menores)
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
                    Max. avaliacoes (negocios menores)
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
                    Negocios com menos avaliacoes geralmente sao menores/mais novos
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Filtros automaticos
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={excluirSemTelefone}
                        onChange={(e) => setExcluirSemTelefone(e.target.checked)}
                        className="rounded border-border"
                      />
                      Apenas com telefone
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
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Dica de busca
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Use termos especificos como &quot;pizzaria delivery&quot;, 
                    &quot;hamburgueria artesanal&quot;, &quot;marmitaria&quot; para encontrar 
                    negocios menores. Evite termos genericos como &quot;restaurante&quot;.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando (ate 60 resultados)...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar Leads
                </>
              )}
            </Button>

            {totalBuscados !== null && (
              <span className="text-sm text-muted-foreground">
                {totalBuscados} encontrados no Google, filtros aplicados
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
