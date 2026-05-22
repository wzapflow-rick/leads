import { Pool } from "pg";

// Conexão com PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000, // 10 segundos de timeout
  idleTimeoutMillis: 30000,
  max: 10,
});

// Helper para executar queries
export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(text, params);
    return result.rows as T[];
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err.code === "ECONNREFUSED") {
      console.error("[v0] PostgreSQL connection refused. Check if:");
      console.error("[v0] 1. The database server is running");
      console.error("[v0] 2. The port is open on the firewall");
      console.error("[v0] 3. postgresql.conf has listen_addresses = '*'");
      console.error("[v0] 4. pg_hba.conf allows external connections");
      throw new Error("Não foi possível conectar ao banco de dados. Verifique se o servidor está acessível.");
    }
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Helper para executar query e retornar um único resultado
export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

// Interfaces
export interface Lead {
  id?: number;
  nome: string;
  telefone: string;
  endereco?: string;
  cidade: string;
  estado: string;
  nicho: string;
  website?: string;
  rating?: number;
  status: "novo" | "contatado" | "respondeu" | "convertido";
  google_place_id?: string;
  created_at?: string;
}

export interface Template {
  id?: number;
  nome: string;
  mensagem: string;
  ativo: boolean;
  created_at?: string;
}

export interface Envio {
  id?: number;
  lead_id: number;
  template_id: number;
  instancia: string;
  status: "enviado" | "erro" | "entregue";
  message_id?: string;
  enviado_em?: string;
  erro_mensagem?: string;
}

// Response padronizado para manter compatibilidade
export interface ListResponse<T> {
  list: T[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}

// ============ LEADS ============

export async function getLeads(filters?: Record<string, string>): Promise<ListResponse<Lead>> {
  let sql = "SELECT * FROM maquina_de_leads";
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (filters) {
    Object.entries(filters).forEach(([key, value], index) => {
      conditions.push(`${key} = $${index + 1}`);
      params.push(value);
    });
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY created_at DESC NULLS LAST, id DESC LIMIT 1000";

  const rows = await query<Lead>(sql, params);

  return {
    list: rows,
    pageInfo: {
      totalRows: rows.length,
      page: 1,
      pageSize: 1000,
      isFirstPage: true,
      isLastPage: true,
    },
  };
}

export async function createLead(lead: Omit<Lead, "id">): Promise<Lead> {
  const sql = `
    INSERT INTO maquina_de_leads (nome, telefone, endereco, cidade, estado, nicho, website, rating, status, google_place_id, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;
  const params = [
    lead.nome,
    lead.telefone,
    lead.endereco || null,
    lead.cidade,
    lead.estado,
    lead.nicho,
    lead.website || null,
    lead.rating ? Math.round(lead.rating) : null,
    lead.status || "novo",
    lead.google_place_id || null,
    lead.created_at || new Date().toISOString(),
  ];

  const result = await queryOne<Lead>(sql, params);
  if (!result) throw new Error("Falha ao criar lead");
  return result;
}

export async function createLeadsBulk(leads: Omit<Lead, "id">[]): Promise<Lead[]> {
  if (leads.length === 0) return [];

  const values: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const lead of leads) {
    values.push(
      `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
    );
    params.push(
      lead.nome,
      lead.telefone,
      lead.endereco || null,
      lead.cidade,
      lead.estado,
      lead.nicho,
      lead.website || null,
      lead.rating ? Math.round(lead.rating) : null,
      lead.status || "novo",
      lead.google_place_id || null,
      lead.created_at || new Date().toISOString()
    );
  }

  const sql = `
    INSERT INTO maquina_de_leads (nome, telefone, endereco, cidade, estado, nicho, website, rating, status, google_place_id, created_at)
    VALUES ${values.join(", ")}
    RETURNING *
  `;

  return query<Lead>(sql, params);
}

export async function updateLead(id: number, data: Partial<Lead>): Promise<Lead> {
  const fields: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    if (key !== "id" && value !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      params.push(value);
    }
  });

  if (fields.length === 0) {
    throw new Error("Nenhum campo para atualizar");
  }

  params.push(id);
  const sql = `UPDATE maquina_de_leads SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;

  const result = await queryOne<Lead>(sql, params);
  if (!result) throw new Error("Lead não encontrado");
  return result;
}

export async function deleteLead(id: number): Promise<void> {
  await query("DELETE FROM maquina_de_leads WHERE id = $1", [id]);
}

export async function checkLeadExists(googlePlaceId: string): Promise<boolean> {
  const result = await queryOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM maquina_de_leads WHERE google_place_id = $1",
    [googlePlaceId]
  );
  return parseInt(result?.count || "0") > 0;
}

// ============ TEMPLATES ============

export async function getTemplates(): Promise<ListResponse<Template>> {
  const rows = await query<Template>("SELECT * FROM templates ORDER BY created_at DESC NULLS LAST, id DESC");

  return {
    list: rows,
    pageInfo: {
      totalRows: rows.length,
      page: 1,
      pageSize: 100,
      isFirstPage: true,
      isLastPage: true,
    },
  };
}

export async function createTemplate(template: Omit<Template, "id">): Promise<Template> {
  const sql = `
    INSERT INTO templates (nome, mensagem, ativo, created_at)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const params = [
    template.nome,
    template.mensagem,
    template.ativo ?? true,
    template.created_at || new Date().toISOString(),
  ];

  const result = await queryOne<Template>(sql, params);
  if (!result) throw new Error("Falha ao criar template");
  return result;
}

export async function updateTemplate(id: number, data: Partial<Template>): Promise<Template> {
  const fields: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    if (key !== "id" && value !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      params.push(value);
    }
  });

  if (fields.length === 0) {
    throw new Error("Nenhum campo para atualizar");
  }

  params.push(id);
  const sql = `UPDATE templates SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;

  const result = await queryOne<Template>(sql, params);
  if (!result) throw new Error("Template não encontrado");
  return result;
}

export async function deleteTemplate(id: number): Promise<void> {
  await query("DELETE FROM templates WHERE id = $1", [id]);
}

// ============ ENVIOS ============

export async function getEnvios(): Promise<ListResponse<Envio>> {
  const rows = await query<Envio>("SELECT * FROM envios ORDER BY enviado_em DESC NULLS LAST, id DESC LIMIT 1000");

  return {
    list: rows,
    pageInfo: {
      totalRows: rows.length,
      page: 1,
      pageSize: 1000,
      isFirstPage: true,
      isLastPage: true,
    },
  };
}

export async function createEnvio(envio: Omit<Envio, "id">): Promise<Envio> {
  const sql = `
    INSERT INTO envios (lead_id, template_id, instancia, status, message_id, enviado_em, erro_mensagem, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const params = [
    envio.lead_id,
    envio.template_id,
    envio.instancia,
    envio.status,
    envio.message_id || null,
    envio.enviado_em || new Date().toISOString(),
    envio.erro_mensagem || null,
    new Date().toISOString(),
  ];

  const result = await queryOne<Envio>(sql, params);
  if (!result) throw new Error("Falha ao criar envio");
  return result;
}

export async function updateEnvio(id: number, data: Partial<Envio>): Promise<Envio> {
  const fields: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    if (key !== "id" && value !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      params.push(value);
    }
  });

  if (fields.length === 0) {
    throw new Error("Nenhum campo para atualizar");
  }

  params.push(id);
  const sql = `UPDATE envios SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;

  const result = await queryOne<Envio>(sql, params);
  if (!result) throw new Error("Envio não encontrado");
  return result;
}

// ============ STATS ============

export async function getStats(): Promise<{
  totalLeads: number;
  leadsPorStatus: Record<string, number>;
  totalEnvios: number;
  enviosHoje: number;
}> {
  const [leadsResult, enviosResult, enviosHojeResult] = await Promise.all([
    query<{ status: string; count: string }>(
      "SELECT status, COUNT(*) as count FROM maquina_de_leads GROUP BY status"
    ),
    queryOne<{ count: string }>("SELECT COUNT(*) as count FROM envios"),
    queryOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM envios WHERE DATE(enviado_em) = CURRENT_DATE"
    ),
  ]);

  const leadsPorStatus: Record<string, number> = {};
  let totalLeads = 0;

  for (const row of leadsResult) {
    const count = parseInt(row.count);
    leadsPorStatus[row.status] = count;
    totalLeads += count;
  }

  return {
    totalLeads,
    leadsPorStatus,
    totalEnvios: parseInt(enviosResult?.count || "0"),
    enviosHoje: parseInt(enviosHojeResult?.count || "0"),
  };
}
