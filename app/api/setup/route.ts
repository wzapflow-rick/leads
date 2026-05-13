import { NextResponse } from "next/server";

const NOCODB_URL = process.env.NOCODB_URL;
const NOCODB_TOKEN = process.env.NOCODB_TOKEN;

async function nocodbRequest(endpoint: string, method: string = "GET", body?: unknown) {
  const res = await fetch(`${NOCODB_URL}/api/v2${endpoint}`, {
    method,
    headers: {
      "xc-token": NOCODB_TOKEN!,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`NocoDB error: ${res.status} - ${error}`);
  }
  
  return res.json();
}

async function getOrCreateBase() {
  // Listar bases existentes
  const bases = await nocodbRequest("/meta/bases");
  
  // Procurar base "Leads"
  let base = bases.list?.find((b: { title: string }) => b.title === "Leads");
  
  if (!base) {
    // Criar base se nao existir
    base = await nocodbRequest("/meta/bases", "POST", {
      title: "Leads",
      type: "database",
    });
  }
  
  return base;
}

async function tableExists(baseId: string, tableName: string) {
  try {
    const tables = await nocodbRequest(`/meta/bases/${baseId}/tables`);
    return tables.list?.some((t: { title: string }) => t.title === tableName);
  } catch {
    return false;
  }
}

async function createTable(baseId: string, tableName: string, columns: { title: string; uidt: string; dtxp?: string; cdf?: string }[]) {
  return nocodbRequest(`/meta/bases/${baseId}/tables`, "POST", {
    title: tableName,
    columns: [
      { title: "Id", uidt: "ID" },
      { title: "CreatedAt", uidt: "CreatedTime" },
      { title: "UpdatedAt", uidt: "LastModifiedTime" },
      ...columns,
    ],
  });
}

export async function GET() {
  if (!NOCODB_URL || !NOCODB_TOKEN) {
    return NextResponse.json(
      { error: "Variaveis NOCODB_URL e NOCODB_TOKEN nao configuradas" },
      { status: 500 }
    );
  }

  try {
    const results: string[] = [];
    
    // Obter ou criar base
    const base = await getOrCreateBase();
    results.push(`Base "Leads" OK (ID: ${base.id})`);
    
    // Criar tabela leads
    if (!(await tableExists(base.id, "leads"))) {
      await createTable(base.id, "leads", [
        { title: "nome", uidt: "SingleLineText" },
        { title: "telefone", uidt: "SingleLineText" },
        { title: "endereco", uidt: "SingleLineText" },
        { title: "cidade", uidt: "SingleLineText" },
        { title: "estado", uidt: "SingleLineText" },
        { title: "nicho", uidt: "SingleLineText" },
        { title: "website", uidt: "URL" },
        { title: "rating", uidt: "Decimal" },
        { title: "status", uidt: "SingleSelect", dtxp: "'novo','contatado','respondeu','convertido'" },
        { title: "google_place_id", uidt: "SingleLineText" },
      ]);
      results.push("Tabela 'leads' criada com sucesso!");
    } else {
      results.push("Tabela 'leads' ja existe");
    }
    
    // Criar tabela templates
    if (!(await tableExists(base.id, "templates"))) {
      await createTable(base.id, "templates", [
        { title: "nome", uidt: "SingleLineText" },
        { title: "mensagem", uidt: "LongText" },
        { title: "ativo", uidt: "Checkbox", cdf: "1" },
      ]);
      results.push("Tabela 'templates' criada com sucesso!");
    } else {
      results.push("Tabela 'templates' ja existe");
    }
    
    // Criar tabela envios
    if (!(await tableExists(base.id, "envios"))) {
      await createTable(base.id, "envios", [
        { title: "lead_id", uidt: "Number" },
        { title: "template_id", uidt: "Number" },
        { title: "instancia", uidt: "SingleLineText" },
        { title: "status", uidt: "SingleSelect", dtxp: "'enviado','erro','entregue'" },
        { title: "message_id", uidt: "SingleLineText" },
        { title: "enviado_em", uidt: "DateTime" },
        { title: "erro_mensagem", uidt: "LongText" },
      ]);
      results.push("Tabela 'envios' criada com sucesso!");
    } else {
      results.push("Tabela 'envios' ja existe");
    }

    return NextResponse.json({
      success: true,
      message: "Setup concluido!",
      results,
      baseId: base.id,
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Erro no setup",
        hint: "Verifique se NOCODB_URL e NOCODB_TOKEN estao corretos"
      },
      { status: 500 }
    );
  }
}
