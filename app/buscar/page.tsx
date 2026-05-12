"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { LeadSearchForm } from "@/components/lead-search-form";
import { LeadResultsTable } from "@/components/lead-results-table";
import type { PlaceResult } from "@/lib/google-places";

export default function BuscarPage() {
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [filters, setFilters] = useState({ nicho: "", cidade: "", estado: "" });

  const handleResults = (
    newResults: PlaceResult[],
    newFilters: { nicho: string; cidade: string; estado: string }
  ) => {
    setResults(newResults);
    setFilters(newFilters);
  };

  const handleSave = () => {
    // Results saved, could clear or refresh
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Buscar Leads</h1>
            <p className="text-muted-foreground mt-1">
              Encontre novos contatos no Google Maps por nicho e localizacao
            </p>
          </div>

          <LeadSearchForm onResults={handleResults} />

          {results.length > 0 && (
            <LeadResultsTable
              results={results}
              filters={filters}
              onSave={handleSave}
            />
          )}
        </div>
      </main>
    </div>
  );
}
