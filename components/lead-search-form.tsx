"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAZILIAN_STATES } from "@/lib/utils";
import { Search, Loader2 } from "lucide-react";
import type { PlaceResult } from "@/lib/google-places";

interface LeadSearchFormProps {
  onResults: (results: PlaceResult[], filters: { nicho: string; cidade: string; estado: string }) => void;
}

export function LeadSearchForm({ onResults }: LeadSearchFormProps) {
  const [nicho, setNicho] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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

      onResults(data.results, { nicho, cidade, estado });
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
                placeholder="Ex: dentistas, restaurantes, advogados"
                value={nicho}
                onChange={(e) => setNicho(e.target.value)}
              />
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

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Buscar Leads
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
