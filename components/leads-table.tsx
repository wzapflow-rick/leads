"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SendMessageModal } from "./send-message-modal";
import {
  Trash2,
  Send,
  Phone,
  Globe,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { Lead } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusColors: Record<string, "default" | "secondary" | "success" | "warning"> = {
  novo: "secondary",
  contatado: "warning",
  respondeu: "success",
  convertido: "default",
};

const statusLabels: Record<string, string> = {
  novo: "Novo",
  contatado: "Contatado",
  respondeu: "Respondeu",
  convertido: "Convertido",
};

export function LeadsTable() {
  const { data, error, isLoading, mutate } = useSWR<{ list: Lead[] }>(
    "/api/leads",
    fetcher
  );
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showSendModal, setShowSendModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const leads = data?.list || [];
  const filteredLeads = statusFilter
    ? leads.filter((l) => l.status === statusFilter)
    : leads;

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredLeads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredLeads.map((l) => l.Id!)));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este lead?")) return;

    setDeletingId(id);
    try {
      await fetch(`/api/leads?id=${id}`, { method: "DELETE" });
      mutate();
    } catch (error) {
      console.error("Error deleting lead:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      mutate();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-destructive mb-4">Erro ao carregar leads</p>
            <Button variant="outline" onClick={() => mutate()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Meus Leads ({leads.length})</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-40"
              >
                <option value="">Todos os status</option>
                <option value="novo">Novo</option>
                <option value="contatado">Contatado</option>
                <option value="respondeu">Respondeu</option>
                <option value="convertido">Convertido</option>
              </Select>
              <Button
                onClick={() => setShowSendModal(true)}
                disabled={selected.size === 0}
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar Mensagem ({selected.size})
              </Button>
              <Button variant="outline" onClick={() => mutate()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum lead encontrado</p>
              <p className="text-sm mt-2">
                Acesse &quot;Buscar Leads&quot; para encontrar novos contatos
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left">
                      <Checkbox
                        checked={selected.size === filteredLeads.length && filteredLeads.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Telefone
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Cidade
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Nicho
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.Id}
                      className="border-b border-border hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selected.has(lead.Id!)}
                          onChange={() => toggleSelect(lead.Id!)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground">
                            {lead.nome}
                          </span>
                          {lead.website && (
                            <a
                              href={lead.website}
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
                          {lead.telefone || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {lead.cidade}, {lead.estado}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{lead.nicho}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={lead.status}
                          onChange={(e) =>
                            handleStatusChange(lead.Id!, e.target.value)
                          }
                          className="w-32 h-8 text-xs"
                        >
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(lead.Id!)}
                          disabled={deletingId === lead.Id}
                        >
                          {deletingId === lead.Id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showSendModal && (
        <SendMessageModal
          leadIds={Array.from(selected)}
          onClose={() => setShowSendModal(false)}
          onSuccess={() => {
            setShowSendModal(false);
            setSelected(new Set());
            mutate();
          }}
        />
      )}
    </>
  );
}
