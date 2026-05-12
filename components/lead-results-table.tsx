"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Loader2, Star, Phone, Globe, MapPin } from "lucide-react";
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

  if (results.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Resultados da Busca ({results.length} encontrados)
          </CardTitle>
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
      </CardHeader>
      <CardContent>
        {message && (
          <div
            className={`mb-4 rounded-lg border p-3 ${
              message.type === "success"
                ? "border-success/50 bg-success/10 text-success"
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
                  className="border-b border-border hover:bg-secondary/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selected.has(place.place_id)}
                      onChange={() => toggleSelect(place.place_id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-foreground">
                        {place.name}
                      </span>
                      {place.website && (
                        <a
                          href={place.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Globe className="h-3 w-3" />
                          Website
                        </a>
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
