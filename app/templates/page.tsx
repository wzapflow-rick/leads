import { Sidebar } from "@/components/sidebar";
import { TemplatesManager } from "@/components/templates-manager";

export default function TemplatesPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Templates</h1>
            <p className="text-muted-foreground mt-1">
              Configure templates de mensagens para envio automatico
            </p>
          </div>

          <TemplatesManager />
        </div>
      </main>
    </div>
  );
}
