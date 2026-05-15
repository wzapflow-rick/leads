"use client";

import { useState } from "react";
import useSWR from "swr";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Smartphone,
  Database,
  Map,
  Plus,
  QrCode,
  X,
} from "lucide-react";
import type { Instance } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ConfiguracoesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [newInstanceName, setNewInstanceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [qrLoading, setQRLoading] = useState(false);
  const [qrError, setQRError] = useState<string | null>(null);

  const {
    data: instancesData,
    error: instancesError,
    isLoading: instancesLoading,
    mutate: mutateInstances,
  } = useSWR<{ instances: Instance[]; connected: Instance[] }>(
    "/api/whatsapp/instances",
    fetcher,
    { refreshInterval: 5000 } // Atualiza a cada 5 segundos para ver status
  );

  const instances = instancesData?.instances || [];
  const connectedCount = instancesData?.connected?.length || 0;

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) return;
    
    setIsCreating(true);
    try {
      const res = await fetch("/api/whatsapp/instances/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceName: newInstanceName }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar instancia");
      }
      
      // Se retornou QR code, mostra
      if (data.qrcode) {
        setQRCode(data.qrcode);
        setSelectedInstance(data.instance.instanceName);
        setShowCreateModal(false);
        setShowQRModal(true);
      }
      
      setNewInstanceName("");
      mutateInstances();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao criar instancia");
    } finally {
      setIsCreating(false);
    }
  };

  const handleShowQRCode = async (instanceName: string) => {
    setSelectedInstance(instanceName);
    setShowQRModal(true);
    setQRLoading(true);
    setQRError(null);
    setQRCode(null);

    try {
      const res = await fetch(`/api/whatsapp/instances/qrcode?instance=${instanceName}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao obter QR code");
      }

      if (data.connected) {
        setQRError("Instancia ja esta conectada!");
        mutateInstances();
      } else if (data.qrcode) {
        setQRCode(data.qrcode);
      } else {
        setQRError("QR code nao disponivel. Tente novamente.");
      }
    } catch (error) {
      setQRError(error instanceof Error ? error.message : "Erro ao obter QR code");
    } finally {
      setQRLoading(false);
    }
  };

  const refreshQRCode = () => {
    if (selectedInstance) {
      handleShowQRCode(selectedInstance);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configuracoes</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas integracoes e APIs
            </p>
          </div>

          {/* WhatsApp Instances */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Instancias WhatsApp</CardTitle>
                    <CardDescription>
                      Evolution API - Instancias conectadas
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => mutateInstances()}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Nova Instancia
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {instancesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : instancesError ? (
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span>Erro ao conectar com Evolution API. Verifique as credenciais.</span>
                </div>
              ) : instances.length === 0 ? (
                <div className="text-center py-8">
                  <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Nenhuma instancia encontrada</p>
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeira instancia
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="default" className="bg-emerald-500">{connectedCount} conectadas</Badge>
                    <Badge variant="secondary">
                      {instances.length - connectedCount} offline
                    </Badge>
                  </div>
                  {instances.map((inst) => {
                    const isConnected =
                      inst.status === "open" || inst.status === "connected";
                    return (
                      <div
                        key={inst.instanceName}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                      >
                        <div className="flex items-center gap-3">
                          {isConnected ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium">{inst.instanceName}</p>
                            {inst.owner && (
                              <p className="text-xs text-muted-foreground">
                                {inst.owner}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isConnected && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleShowQRCode(inst.instanceName)}
                            >
                              <QrCode className="h-4 w-4 mr-1" />
                              Conectar
                            </Button>
                          )}
                          <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-emerald-500" : ""}>
                            {inst.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* NocoDB Setup */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>NocoDB - Setup das Tabelas</CardTitle>
                  <CardDescription>Banco de dados para leads e templates</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Variaveis de ambiente necessarias:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><code className="bg-secondary px-1 rounded">NOCODB_URL</code> - URL da sua instancia NocoDB</li>
                  <li><code className="bg-secondary px-1 rounded">NOCODB_TOKEN</code> - Token de API do NocoDB</li>
                </ul>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Criar Tabelas no NocoDB</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Acesse seu NocoDB e crie as seguintes tabelas com os campos especificados:
                </p>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-secondary/50 border">
                    <h5 className="font-medium text-sm mb-2">1. Tabela: leads</h5>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>nome (Text)</div>
                      <div>telefone (Text)</div>
                      <div>endereco (Text)</div>
                      <div>cidade (Text)</div>
                      <div>estado (Text)</div>
                      <div>nicho (Text)</div>
                      <div>website (URL)</div>
                      <div>rating (Number)</div>
                      <div>status (SingleSelect)</div>
                      <div>google_place_id (Text)</div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Status: novo, contatado, respondeu, convertido
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/50 border">
                    <h5 className="font-medium text-sm mb-2">2. Tabela: templates</h5>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>nome (Text)</div>
                      <div>mensagem (LongText)</div>
                      <div>ativo (Checkbox)</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/50 border">
                    <h5 className="font-medium text-sm mb-2">3. Tabela: envios</h5>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>lead_id (Number)</div>
                      <div>template_id (Number)</div>
                      <div>instancia (Text)</div>
                      <div>status (SingleSelect)</div>
                      <div>message_id (Text)</div>
                      <div>enviado_em (DateTime)</div>
                      <div>erro_mensagem (Text)</div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Status: enviado, erro, entregue
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Map className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Google Places API</CardTitle>
                  <CardDescription>Busca de estabelecimentos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Configure a variavel de ambiente:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><code className="bg-secondary px-1 rounded">GOOGLE_PLACES_API_KEY</code> - API Key do Google Cloud</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-4">
                  APIs necessarias: Places API (New)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Evolution API</CardTitle>
                  <CardDescription>Envio de mensagens WhatsApp</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Configure as variaveis de ambiente:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><code className="bg-secondary px-1 rounded">EVOLUTION_API_URL</code> - URL da sua Evolution API</li>
                  <li><code className="bg-secondary px-1 rounded">EVOLUTION_API_KEY</code> - API Key global</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Modal Criar Instancia */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Criar Nova Instancia</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Nome da Instancia
                </label>
                <Input
                  placeholder="Ex: minha_empresa"
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateInstance()}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use apenas letras, numeros, _ e -
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateInstance}
                  disabled={isCreating || !newInstanceName.trim()}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar e Conectar"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Conectar: {selectedInstance}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowQRModal(false);
                  setQRCode(null);
                  setQRError(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {qrLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
                </div>
              ) : qrError ? (
                <div className="text-center py-4">
                  {qrError.includes("conectada") ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle className="h-16 w-16 text-emerald-500 mb-4" />
                      <p className="text-emerald-500 font-medium">{qrError}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <XCircle className="h-16 w-16 text-destructive mb-4" />
                      <p className="text-destructive mb-4">{qrError}</p>
                      <Button onClick={refreshQRCode}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Tentar Novamente
                      </Button>
                    </div>
                  )}
                </div>
              ) : qrCode ? (
                <div className="flex flex-col items-center">
                  <div className="bg-white p-4 rounded-lg mb-4">
                    <img
                      src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                      alt="QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Abra o WhatsApp no seu celular, va em Dispositivos Conectados
                    e escaneie o QR Code acima.
                  </p>
                  <Button variant="outline" onClick={refreshQRCode}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar QR Code
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
