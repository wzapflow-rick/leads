export type LeadStatus = "novo" | "contatado" | "respondeu" | "convertido";

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
  status: LeadStatus;
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

export interface Instance {
  instanceName: string;
  status: string;
  owner?: string;
}

export interface SearchFilters {
  nicho: string;
  cidade: string;
  estado: string;
}

export interface SendMessagePayload {
  instanceName: string;
  leadIds: number[];
  templateId: number;
  delayMs: number;
}
