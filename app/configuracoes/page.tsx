"use client";

import useSWR from "swr";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Smartphone,
  Database,
  Map,
} from "lucide-react";
import type { Instance } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ConfiguracoesPage() {
  const {
    data: instancesData,
    error: instancesError,
    isLoading: instancesLoading,
    mutate: mutateInstances,
  } = useSWR<{ instances: Instance[]; connected: Instance[] }>(
    "/api/whatsapp/instances",
    fetcher
  );

  const instances = instancesData?.instances || [];
  const connectedCount = instancesData?.connected?.length || 0;

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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mutateInstances()}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
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
                <p className="text-muted-foreground">Nenhuma instancia encontrada</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="success">{connectedCount} conectadas</Badge>
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
                            <CheckCircle className="h-4 w-4 text-success" />
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
                        <Badge variant={isConnected ? "success" : "secondary"}>
                          {inst.status}
                        </Badge>
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
    </div>
  );
}
