"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Loader2, Star, Phone, Globe, MapPin, Flame, ThermometerSun, Snowflake, ExternalLink } from "lucide-react";
import type { PlaceResult } from "@/lib/google-places";

interface LeadResultsTableProps {
  results: PlaceResult[];
  filters: { nicho: string; cidade: string; estado: string };
  onSave: () => void;
}

export function LeadResultsTable({ results, filters, onSave }: LeadResultsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const toggleSelect = (placeId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(placeId)) {
      newSelected.delete(placeId);
    } else {
      newSelected.add(placeId);
    }
    setSelected(newSelected);
  };

  const toggleSelectAll = () => {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map((r) => r.place_id)));
    }
  };

  // Selecionar apenas leads quentes
  const selectQuentes = () => {
    const quentes = results.filter(r => r.lead_quality === "quente");
    setSelected(new Set(quentes.map(r => r.place_id)));
  };

  const handleSave = async () => {
    if (selected.size === 0) {
      setMessage({ type: "error", text: "Selecione pelo menos um lead" });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const selectedLeads = results
        .filter((r) => selected.has(r.place_id))
        .map((r) => ({
          nome: r.name,
          telefone: r.formatted_phone_number || r.international_phone_number || "",
          endereco: r.formatted_address,
          cidade: filters.cidade,
          estado: filters.estado,
          nicho: filters.nicho,
          website: r.website,
          rating: r.rating,
          google_place_id: r.place_id,
          status: "novo" as const,
        }));

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedLeads),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar");
      }

      setMessage({
        type: "success",
        text: `${data.created?.length || 0} leads salvos! ${data.skipped || 0} ja existiam.`,
      });
      setSelected(new Set());
      onSave();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao salvar leads",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getQualityIcon = (quality?: string) => {
    switch (quality) {
      case "quente":
        return <Flame className="h-4 w-4 text-orange-500" />;
      case "morno":
        return <ThermometerSun className="h-4 w-4 text-yellow-500" />;
      case "frio":
        return <Snowflake className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getQualityBadge = (quality?: string, score?: number) => {
    const colors = {
      quente: "bg-orange-500/20 text-orange-600 border-orange-500/30",
      morno: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
      frio: "bg-blue-500/20 text-blue-600 border-blue-500/30",
    };
    
    const labels = {
      quente: "Quente",
      morno: "Morno",
      frio: "Frio",
    };

    if (!quality) return null;

    return (
      <Badge variant="outline" className={`gap-1 ${colors[quality as keyof typeof colors]}`}>
        {getQualityIcon(quality)}
        {labels[quality as keyof typeof labels]}
        {score !== undefined && <span className="text-xs opacity-70">({score})</span>}
      </Badge>
    );
  };

  const getWebsiteStatus = (place: PlaceResult) => {
    if (!place.website) {
      return (
        <span className="text-xs text-green-600 flex items-center gap-1">
          Sem website
        </span>
      );
    }
    
    if (place.has_professional_website) {
      return (
        <a
          href={place.website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-red-500 hover:underline"
        >
          <Globe className="h-3 w-3" />
          Tem sistema
          <ExternalLink className="h-3 w-3" />
        </a>
      );
    }

    return (
      <a
        href={place.website}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-yellow-600 hover:underline"
      >
        <Globe className="h-3 w-3" />
        Rede social
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  };

  if (results.length === 0) {
    return null;
  }

  const quentesCount = results.filter(r => r.lead_quality === "quente").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>
            Resultados da Busca ({results.length} encontrados)
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {quentesCount > 0 && (
              <Button variant="outline" size="sm" onClick={selectQuentes}>
                <Flame className="mr-1 h-4 w-4 text-orange-500" />
                Selecionar {quentesCount} quentes
              </Button>
            )}
            <Button onClick={handleSave} disabled={isSaving || selected.size === 0}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Selecionados ({selected.size})
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {message && (
          <div
            className={`mb-4 rounded-lg border p-3 ${
              message.type === "success"
                ? "border-green-500/50 bg-green-500/10 text-green-600"
                : "border-destructive/50 bg-destructive/10 text-destructive"
            }`}
          >
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={selected.size === results.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Qualidade
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Estabelecimento
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Telefone
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Endereco
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Rating
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((place) => (
                <tr
                  key={place.place_id}
                  className={`border-b border-border hover:bg-secondary/50 transition-colors ${
                    place.lead_quality === "quente" ? "bg-orange-500/5" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selected.has(place.place_id)}
                      onChange={() => toggleSelect(place.place_id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {getQualityBadge(place.lead_quality, place.lead_score)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-foreground">
                        {place.name}
                      </span>
                      {getWebsiteStatus(place)}
                      {place.user_ratings_total !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {place.user_ratings_total} avaliacoes
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {place.formatted_phone_number ||
                        place.international_phone_number ||
                        "-"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground max-w-xs truncate">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      {place.formatted_address}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {place.rating ? (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        {place.rating.toFixed(1)}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
