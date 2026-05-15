"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Send, Loader2, CheckCircle, XCircle, Pause, Play } from "lucide-react";
import type { Template, Instance } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface LeadToSend {
  id: number;
  nome: string;
  telefone: string;
  message: string;
}

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
  const [delaySeconds, setDelaySeconds] = useState(60);
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [leadsToSend, setLeadsToSend] = useState<LeadToSend[]>([]);
  const [results, setResults] = useState<{
    total: number;
    success: number;
    errors: number;
    details: { leadId: number; nome: string; success: boolean; error?: string }[];
  } | null>(null);
  
  const abortRef = useRef(false);
  const pauseRef = useRef(false);

  const templates = templatesData?.list?.filter((t) => t.ativo) || [];
  const instances = instancesData?.connected || [];

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleSend = async () => {
    if (!selectedTemplate || !selectedInstance) {
      return;
    }

    setIsSending(true);
    abortRef.current = false;
    pauseRef.current = false;

    try {
      // Primeiro, pega a lista de leads com mensagens parseadas
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceName: selectedInstance,
          leadIds,
          templateId: selectedTemplate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao preparar envio");
      }

      if (data.mode !== "batch") {
        throw new Error("Resposta inesperada da API");
      }

      const leads: LeadToSend[] = data.leads;
      setLeadsToSend(leads);
      
      const details: { leadId: number; nome: string; success: boolean; error?: string }[] = [];
      let successCount = 0;
      let errorCount = 0;

      // Envia um por vez com delay
      for (let i = 0; i < leads.length; i++) {
        if (abortRef.current) break;
        
        // Pausa
        while (pauseRef.current && !abortRef.current) {
          await sleep(500);
        }
        if (abortRef.current) break;

        setCurrentIndex(i);
        const lead = leads[i];

        try {
          const sendRes = await fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instanceName: selectedInstance,
              leadId: lead.id,
              message: lead.message,
            }),
          });

          const sendData = await sendRes.json();

          if (sendData.success) {
            successCount++;
            details.push({
              leadId: lead.id,
              nome: lead.nome,
              success: true,
            });
          } else {
            errorCount++;
            details.push({
              leadId: lead.id,
              nome: lead.nome,
              success: false,
              error: sendData.error || "Erro desconhecido",
            });
          }
        } catch (err) {
          errorCount++;
          details.push({
            leadId: lead.id,
            nome: lead.nome,
            success: false,
            error: err instanceof Error ? err.message : "Erro de conexao",
          });
        }

        // Atualiza resultados em tempo real
        setResults({
          total: leads.length,
          success: successCount,
          errors: errorCount,
          details: [...details],
        });

        // Delay entre mensagens (exceto na ultima)
        if (i < leads.length - 1 && !abortRef.current) {
          await sleep(delaySeconds * 1000);
        }
      }

      setResults({
        total: leads.length,
        success: successCount,
        errors: errorCount,
        details,
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
      setIsPaused(false);
    }
  };

  const handlePause = () => {
    pauseRef.current = !pauseRef.current;
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    abortRef.current = true;
    pauseRef.current = false;
    setIsPaused(false);
  };

  const selectedTemplateData = templates.find((t) => t.Id === selectedTemplate);

  const isFinished = results && !isSending;
  const progress = leadsToSend.length > 0 ? ((currentIndex + 1) / leadsToSend.length) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {isSending 
              ? `Enviando... (${currentIndex + 1}/${leadsToSend.length})` 
              : `Enviar Mensagem (${leadIds.length} leads)`}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={isFinished ? onSuccess : onClose} disabled={isSending && !isFinished}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSending && leadsToSend.length > 0 && (
            <div className="space-y-4">
              {/* Barra de progresso */}
              <div className="space-y-2">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Enviando para: {leadsToSend[currentIndex]?.nome || "..."}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>

              {/* Stats em tempo real */}
              {results && (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-secondary">
                    <p className="text-xl font-bold">{results.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/20">
                    <p className="text-xl font-bold text-emerald-500">{results.success}</p>
                    <p className="text-xs text-muted-foreground">Sucesso</p>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/20">
                    <p className="text-xl font-bold text-destructive">{results.errors}</p>
                    <p className="text-xs text-muted-foreground">Erros</p>
                  </div>
                </div>
              )}

              {/* Botoes de controle */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handlePause}
                  className="flex-1"
                >
                  {isPaused ? (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Continuar
                    </>
                  ) : (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Pausar
                    </>
                  )}
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleStop}
                  className="flex-1"
                >
                  <X className="mr-2 h-4 w-4" />
                  Parar
                </Button>
              </div>

              {isPaused && (
                <p className="text-center text-sm text-amber-500">
                  Envio pausado. Clique em Continuar para retomar.
                </p>
              )}
            </div>
          )}

          {isFinished && results && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-secondary">
                  <p className="text-2xl font-bold">{results.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-500/20">
                  <p className="text-2xl font-bold text-emerald-500">{results.success}</p>
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
                      detail.success ? "bg-emerald-500/10" : "bg-destructive/10"
                    }`}
                  >
                    <span className="text-sm">{detail.nome}</span>
                    {detail.success ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
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
          )}
          
          {!isSending && !results && (
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
                  Intervalo entre mensagens
                </label>
                <Select
                  value={delaySeconds.toString()}
                  onChange={(e) => setDelaySeconds(parseInt(e.target.value))}
                >
                  <option value="30">30 segundos</option>
                  <option value="60">1 minuto (recomendado)</option>
                  <option value="120">2 minutos</option>
                  <option value="180">3 minutos</option>
                  <option value="300">5 minutos (seguro)</option>
                  <option value="600">10 minutos (ultra seguro)</option>
                </Select>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-500 font-medium mb-1">
                    Protecao contra banimento
                  </p>
                  <p className="text-xs text-amber-500/80">
                    Intervalos maiores sao mais seguros. Para {leadIds.length} leads com intervalo de {delaySeconds >= 60 ? `${Math.floor(delaySeconds / 60)} min` : `${delaySeconds}s`}, 
                    o envio levara aproximadamente {Math.ceil((leadIds.length * delaySeconds) / 60)} minutos.
                  </p>
                </div>
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
