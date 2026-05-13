"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Send, UserCheck, AlertCircle } from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function StatsCards() {
  const { data, error, isLoading } = useSWR("/api/stats", fetcher, {
    refreshInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Erro ao carregar estatisticas. Verifique as configuracoes.
        </p>
      </div>
    );
  }

  if (data.setupRequired) {
    return (
      <Card className="border-amber-500/50 bg-amber-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            Configuracao Necessaria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            As tabelas do banco de dados ainda nao foram criadas. Acesse seu NocoDB e crie as seguintes tabelas:
          </p>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded bg-background border">
              <p className="font-medium mb-2">Tabela: leads</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>nome (Text)</li>
                <li>telefone (Text)</li>
                <li>endereco (Text)</li>
                <li>cidade (Text)</li>
                <li>estado (Text)</li>
                <li>nicho (Text)</li>
                <li>website (URL)</li>
                <li>rating (Number)</li>
                <li>status (SingleSelect: novo, contatado, respondeu, convertido)</li>
                <li>google_place_id (Text)</li>
              </ul>
            </div>
            <div className="p-3 rounded bg-background border">
              <p className="font-medium mb-2">Tabela: templates</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>nome (Text)</li>
                <li>mensagem (LongText)</li>
                <li>ativo (Checkbox)</li>
              </ul>
            </div>
            <div className="p-3 rounded bg-background border">
              <p className="font-medium mb-2">Tabela: envios</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>lead_id (Number)</li>
                <li>template_id (Number)</li>
                <li>instancia (Text)</li>
                <li>status (SingleSelect: enviado, erro, entregue)</li>
                <li>message_id (Text)</li>
                <li>enviado_em (DateTime)</li>
                <li>erro_mensagem (Text)</li>
              </ul>
            </div>
          </div>
          <Link 
            href="/configuracoes" 
            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            Ver instrucoes completas
          </Link>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      title: "Total de Leads",
      value: data.totalLeads || 0,
      icon: Users,
      description: "Leads capturados",
    },
    {
      title: "Leads Novos",
      value: data.leadsPorStatus?.novo || 0,
      icon: UserCheck,
      description: "Aguardando contato",
    },
    {
      title: "Mensagens Enviadas",
      value: data.totalEnvios || 0,
      icon: Send,
      description: "Total de envios",
    },
    {
      title: "Enviadas Hoje",
      value: data.enviosHoje || 0,
      icon: MessageSquare,
      description: "Mensagens de hoje",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
