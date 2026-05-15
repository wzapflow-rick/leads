import { NextRequest, NextResponse } from "next/server";
import { sendTextMessage } from "@/lib/evolution-api";
import { getLeads, updateLead, getTemplates } from "@/lib/nocodb";
import { parseTemplate, formatPhone } from "@/lib/utils";

// Envia UMA mensagem por vez para evitar timeout da Vercel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instanceName, leadId, templateId, message: customMessage } = body;

    // Modo single: envia para um lead especifico
    if (leadId && (templateId || customMessage)) {
      return await sendSingleMessage(instanceName, leadId, templateId, customMessage);
    }

    // Modo batch: retorna lista de leads para o frontend processar um a um
    const { leadIds } = body;
    
    if (!instanceName || !leadIds || !templateId) {
      return NextResponse.json(
        { error: "instanceName, leadIds e templateId sao obrigatorios" },
        { status: 400 }
      );
    }

    // Get template
    const templatesResult = await getTemplates();
    const template = templatesResult.list.find((t) => t.Id === templateId);

    if (!template) {
      return NextResponse.json(
        { error: "Template nao encontrado" },
        { status: 404 }
      );
    }

    // Get leads
    const leadsResult = await getLeads();
    const leadIdsSet = new Set(leadIds.map((id: number | string) => String(id)));
    
    const getLeadId = (lead: Record<string, unknown>): number | undefined => {
      return (lead.Id || lead.id || lead.nc_Id) as number | undefined;
    };
    
    const leads = leadsResult.list.filter((lead) => {
      const id = getLeadId(lead as unknown as Record<string, unknown>);
      return id !== undefined && leadIdsSet.has(String(id));
    });

    if (leads.length === 0) {
      return NextResponse.json(
        { error: "Nenhum lead encontrado" },
        { status: 404 }
      );
    }

    // Retorna a lista de leads para o frontend processar
    const leadsToSend = leads.map((lead) => ({
      id: getLeadId(lead as unknown as Record<string, unknown>),
      nome: lead.nome,
      telefone: lead.telefone,
      message: parseTemplate(template.mensagem, {
        nome: lead.nome,
        cidade: lead.cidade,
        estado: lead.estado,
        nicho: lead.nicho,
      }),
    }));

    return NextResponse.json({
      mode: "batch",
      total: leadsToSend.length,
      leads: leadsToSend,
      templateName: template.nome,
    });
  } catch (error) {
    console.error("Send messages error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao enviar mensagens" },
      { status: 500 }
    );
  }
}

// Envia mensagem para um unico lead
async function sendSingleMessage(
  instanceName: string,
  leadId: number,
  templateId?: number,
  customMessage?: string
) {
  try {
    // Get lead info
    const leadsResult = await getLeads();
    const getLeadId = (lead: Record<string, unknown>): number | undefined => {
      return (lead.Id || lead.id || lead.nc_Id) as number | undefined;
    };
    
    const lead = leadsResult.list.find(
      (l) => getLeadId(l as unknown as Record<string, unknown>) === leadId
    );

    if (!lead) {
      return NextResponse.json({ error: "Lead nao encontrado" }, { status: 404 });
    }

    if (!lead.telefone) {
      return NextResponse.json({ 
        success: false, 
        leadId,
        error: "Lead sem telefone" 
      });
    }

    // Get message
    let message = customMessage;
    if (!message && templateId) {
      const templatesResult = await getTemplates();
      const template = templatesResult.list.find((t) => t.Id === templateId);
      if (template) {
        message = parseTemplate(template.mensagem, {
          nome: lead.nome,
          cidade: lead.cidade,
          estado: lead.estado,
          nicho: lead.nicho,
        });
      }
    }

    if (!message) {
      return NextResponse.json({ 
        success: false, 
        leadId,
        error: "Mensagem nao definida" 
      });
    }

    // Format phone and send
    const phone = formatPhone(lead.telefone);
    const response = await sendTextMessage(instanceName, phone, message);

    // Update lead status
    try {
      await updateLead(leadId, { status: "contatado" });
    } catch (updateErr) {
      console.error("Erro ao atualizar status:", updateErr);
    }

    return NextResponse.json({
      success: true,
      leadId,
      nome: lead.nome,
      messageId: response.key?.id,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      leadId,
      error: error instanceof Error ? error.message : "Erro ao enviar",
    });
  }
}
