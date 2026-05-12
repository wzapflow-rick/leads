"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Send, Loader2, CheckCircle, XCircle } from "lucide-react";
import type { Template, Instance } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SendMessageModalProps {
  leadIds: number[];
  onClose: () => void;
  onSuccess: () => void;
}

export function SendMessageModal({ leadIds, onClose, onSuccess }: SendMessageModalProps) {
  const { data: templatesData } = useSWR<{ list: Template[] }>(
    "/api/templates",
    fetcher
  );
  const { data: instancesData } = useSWR<{ connected: Instance[] }>(
    "/api/whatsapp/instances",
    fetcher
  );

  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<string>("");
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<{
    total: number;
    success: number;
    errors: number;
    details: { leadId: number; nome: string; success: boolean; error?: string }[];
  } | null>(null);

  const templates = templatesData?.list?.filter((t) => t.ativo) || [];
  const instances = instancesData?.connected || [];

  const handleSend = async () => {
    if (!selectedTemplate || !selectedInstance) {
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceName: selectedInstance,
          leadIds,
          templateId: selectedTemplate,
          delayMs: delaySeconds * 1000,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao enviar");
      }

      setResults({
        total: data.summary.total,
        success: data.summary.success,
        errors: data.summary.errors,
        details: data.results,
      });
    } catch (error) {
      setResults({
        total: leadIds.length,
        success: 0,
        errors: leadIds.length,
        details: [
          {
            leadId: 0,
            nome: "Erro geral",
            success: false,
            error: error instanceof Error ? error.message : "Erro desconhecido",
          },
        ],
      });
    } finally {
      setIsSending(false);
    }
  };

  const selectedTemplateData = templates.find((t) => t.Id === selectedTemplate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Enviar Mensagem ({leadIds.length} leads)</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {results ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-secondary">
                  <p className="text-2xl font-bold">{results.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="p-4 rounded-lg bg-success/20">
                  <p className="text-2xl font-bold text-success">{results.success}</p>
                  <p className="text-sm text-muted-foreground">Sucesso</p>
                </div>
                <div className="p-4 rounded-lg bg-destructive/20">
                  <p className="text-2xl font-bold text-destructive">{results.errors}</p>
                  <p className="text-sm text-muted-foreground">Erros</p>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {results.details.map((detail, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      detail.success ? "bg-success/10" : "bg-destructive/10"
                    }`}
                  >
                    <span className="text-sm">{detail.nome}</span>
                    {detail.success ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-destructive">{detail.error}</span>
                        <XCircle className="h-4 w-4 text-destructive" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button onClick={onSuccess} className="w-full">
                Fechar
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Instancia WhatsApp</label>
                <Select
                  value={selectedInstance}
                  onChange={(e) => setSelectedInstance(e.target.value)}
                >
                  <option value="">Selecione uma instancia</option>
                  {instances.map((inst) => (
                    <option key={inst.instanceName} value={inst.instanceName}>
                      {inst.instanceName} ({inst.owner || "Sem nome"})
                    </option>
                  ))}
                </Select>
                {instances.length === 0 && (
                  <p className="text-xs text-destructive">
                    Nenhuma instancia conectada encontrada
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Template de Mensagem</label>
                <Select
                  value={selectedTemplate?.toString() || ""}
                  onChange={(e) => setSelectedTemplate(parseInt(e.target.value))}
                >
                  <option value="">Selecione um template</option>
                  {templates.map((template) => (
                    <option key={template.Id} value={template.Id}>
                      {template.nome}
                    </option>
                  ))}
                </Select>
                {templates.length === 0 && (
                  <p className="text-xs text-destructive">
                    Nenhum template ativo encontrado
                  </p>
                )}
              </div>

              {selectedTemplateData && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preview da Mensagem</label>
                  <div className="p-3 rounded-lg bg-secondary text-sm whitespace-pre-wrap">
                    {selectedTemplateData.mensagem}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Variaveis: {"{nome}"}, {"{cidade}"}, {"{estado}"}, {"{nicho}"}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Intervalo entre mensagens (segundos)
                </label>
                <Input
                  type="number"
                  min={3}
                  max={60}
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 5)}
                />
                <p className="text-xs text-muted-foreground">
                  Minimo 3 segundos para evitar bloqueio
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={!selectedTemplate || !selectedInstance || isSending}
                  className="flex-1"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
