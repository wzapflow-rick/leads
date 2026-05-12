"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Send, UserCheck } from "lucide-react";

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
