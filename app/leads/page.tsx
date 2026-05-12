import { Sidebar } from "@/components/sidebar";
import { LeadsTable } from "@/components/leads-table";

export default function LeadsPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Meus Leads</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus contatos e envie mensagens
            </p>
          </div>

          <LeadsTable />
        </div>
      </main>
    </div>
  );
}
