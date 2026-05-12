import { Sidebar } from "@/components/sidebar";
import { StatsCards } from "@/components/stats-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Users, MessageSquare, Settings } from "lucide-react";
import Link from "next/link";

const quickActions = [
  {
    title: "Buscar Leads",
    description: "Encontre novos contatos no Google Maps",
    href: "/buscar",
    icon: Search,
  },
  {
    title: "Meus Leads",
    description: "Gerencie seus contatos salvos",
    href: "/leads",
    icon: Users,
  },
  {
    title: "Templates",
    description: "Configure mensagens automaticas",
    href: "/templates",
    icon: MessageSquare,
  },
  {
    title: "Configuracoes",
    description: "Configure APIs e instancias",
    href: "/configuracoes",
    icon: Settings,
  },
];

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Visao geral da sua maquina de leads
            </p>
          </div>

          <StatsCards />

          <div>
            <h2 className="text-xl font-semibold mb-4">Acoes Rapidas</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <action.icon className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-base">{action.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Como Funciona</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                <li>
                  <span className="text-foreground font-medium">Configure as APIs</span> - 
                  Adicione suas credenciais do Google Places, Evolution API e NocoDB
                </li>
                <li>
                  <span className="text-foreground font-medium">Busque Leads</span> - 
                  Pesquise estabelecimentos por nicho e localizacao
                </li>
                <li>
                  <span className="text-foreground font-medium">Salve os Contatos</span> - 
                  Selecione e salve os leads no seu banco de dados
                </li>
                <li>
                  <span className="text-foreground font-medium">Crie Templates</span> - 
                  Configure mensagens personalizadas com variaveis
                </li>
                <li>
                  <span className="text-foreground font-medium">Envie Mensagens</span> - 
                  Selecione leads e envie mensagens via WhatsApp
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
