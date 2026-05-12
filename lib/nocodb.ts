const NOCODB_URL = process.env.NOCODB_URL || "";
const NOCODB_TOKEN = process.env.NOCODB_TOKEN || "";
const NOCODB_BASE_ID = process.env.NOCODB_BASE_ID || "";

export interface Lead {
  Id?: number;
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
  Id?: number;
  nome: string;
  mensagem: string;
  ativo: boolean;
  created_at?: string;
}

export interface Envio {
  Id?: number;
  lead_id: number;
  template_id: number;
  instancia: string;
  status: "enviado" | "erro" | "entregue";
  message_id?: string;
  enviado_em?: string;
  erro_mensagem?: string;
}

interface NocoDBListResponse<T> {
  list: T[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}

async function nocoFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${NOCODB_URL}/api/v2${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "xc-token": NOCODB_TOKEN,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`NocoDB Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Leads CRUD
export async function getLeads(
  filters?: Record<string, string>
): Promise<NocoDBListResponse<Lead>> {
  let endpoint = `/tables/leads/records?limit=100`;

  if (filters) {
    const where = Object.entries(filters)
      .map(([key, value]) => `(${key},eq,${value})`)
      .join("~and");
    if (where) endpoint += `&where=${encodeURIComponent(where)}`;
  }

  return nocoFetch<NocoDBListResponse<Lead>>(endpoint);
}

export async function createLead(lead: Omit<Lead, "Id">): Promise<Lead> {
  return nocoFetch<Lead>(`/tables/leads/records`, {
    method: "POST",
    body: JSON.stringify(lead),
  });
}

export async function createLeadsBulk(leads: Omit<Lead, "Id">[]): Promise<Lead[]> {
  return nocoFetch<Lead[]>(`/tables/leads/records`, {
    method: "POST",
    body: JSON.stringify(leads),
  });
}

export async function updateLead(
  id: number,
  data: Partial<Lead>
): Promise<Lead> {
  return nocoFetch<Lead>(`/tables/leads/records`, {
    method: "PATCH",
    body: JSON.stringify({ Id: id, ...data }),
  });
}

export async function deleteLead(id: number): Promise<void> {
  await nocoFetch(`/tables/leads/records`, {
    method: "DELETE",
    body: JSON.stringify({ Id: id }),
  });
}

export async function checkLeadExists(googlePlaceId: string): Promise<boolean> {
  const result = await nocoFetch<NocoDBListResponse<Lead>>(
    `/tables/leads/records?where=(google_place_id,eq,${googlePlaceId})&limit=1`
  );
  return result.list.length > 0;
}

// Templates CRUD
export async function getTemplates(): Promise<NocoDBListResponse<Template>> {
  return nocoFetch<NocoDBListResponse<Template>>(
    `/tables/templates/records?limit=100`
  );
}

export async function createTemplate(
  template: Omit<Template, "Id">
): Promise<Template> {
  return nocoFetch<Template>(`/tables/templates/records`, {
    method: "POST",
    body: JSON.stringify(template),
  });
}

export async function updateTemplate(
  id: number,
  data: Partial<Template>
): Promise<Template> {
  return nocoFetch<Template>(`/tables/templates/records`, {
    method: "PATCH",
    body: JSON.stringify({ Id: id, ...data }),
  });
}

export async function deleteTemplate(id: number): Promise<void> {
  await nocoFetch(`/tables/templates/records`, {
    method: "DELETE",
    body: JSON.stringify({ Id: id }),
  });
}

// Envios CRUD
export async function getEnvios(): Promise<NocoDBListResponse<Envio>> {
  return nocoFetch<NocoDBListResponse<Envio>>(
    `/tables/envios/records?limit=100&sort=-enviado_em`
  );
}

export async function createEnvio(envio: Omit<Envio, "Id">): Promise<Envio> {
  return nocoFetch<Envio>(`/tables/envios/records`, {
    method: "POST",
    body: JSON.stringify(envio),
  });
}

export async function updateEnvio(
  id: number,
  data: Partial<Envio>
): Promise<Envio> {
  return nocoFetch<Envio>(`/tables/envios/records`, {
    method: "PATCH",
    body: JSON.stringify({ Id: id, ...data }),
  });
}

// Stats
export async function getStats(): Promise<{
  totalLeads: number;
  leadsPorStatus: Record<string, number>;
  totalEnvios: number;
  enviosHoje: number;
}> {
  const [leadsResult, enviosResult] = await Promise.all([
    getLeads(),
    getEnvios(),
  ]);

  const leads = leadsResult.list;
  const envios = enviosResult.list;

  const hoje = new Date().toISOString().split("T")[0];
  const enviosHoje = envios.filter(
    (e) => e.enviado_em?.startsWith(hoje)
  ).length;

  const leadsPorStatus = leads.reduce(
    (acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    totalLeads: leads.length,
    leadsPorStatus,
    totalEnvios: envios.length,
    enviosHoje,
  };
}
