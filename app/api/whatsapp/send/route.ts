import { NextRequest, NextResponse } from "next/server";
import { sendTextMessage } from "@/lib/evolution-api";
import { getLeads, updateLead, getTemplates, createEnvio } from "@/lib/nocodb";
import { parseTemplate, delay, formatPhone } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instanceName, leadIds, templateId, delayMs = 3000 } = body;

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
    const leads = leadsResult.list.filter((lead) =>
      leadIds.includes(lead.Id)
    );

    if (leads.length === 0) {
      return NextResponse.json(
        { error: "Nenhum lead encontrado" },
        { status: 404 }
      );
    }

    const results: {
      leadId: number;
      nome: string;
      success: boolean;
      error?: string;
      messageId?: string;
    }[] = [];

    // Send messages with delay
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];

      if (!lead.telefone) {
        results.push({
          leadId: lead.Id!,
          nome: lead.nome,
          success: false,
          error: "Lead sem telefone",
        });
        continue;
      }

      try {
        // Parse template with lead variables
        const message = parseTemplate(template.mensagem, {
          nome: lead.nome,
          cidade: lead.cidade,
          estado: lead.estado,
          nicho: lead.nicho,
        });

        // Format phone number
        const phone = formatPhone(lead.telefone);

        // Send message
        const response = await sendTextMessage(instanceName, phone, message);

        // Update lead status
        await updateLead(lead.Id!, { status: "contatado" });

        // Log envio
        await createEnvio({
          lead_id: lead.Id!,
          template_id: templateId,
          instancia: instanceName,
          status: "enviado",
          message_id: response.key.id,
          enviado_em: new Date().toISOString(),
        });

        results.push({
          leadId: lead.Id!,
          nome: lead.nome,
          success: true,
          messageId: response.key.id,
        });
      } catch (error) {
        // Log failed envio
        await createEnvio({
          lead_id: lead.Id!,
          template_id: templateId,
          instancia: instanceName,
          status: "erro",
          erro_mensagem: error instanceof Error ? error.message : "Erro desconhecido",
          enviado_em: new Date().toISOString(),
        });

        results.push({
          leadId: lead.Id!,
          nome: lead.nome,
          success: false,
          error: error instanceof Error ? error.message : "Erro ao enviar",
        });
      }

      // Wait between messages (except for the last one)
      if (i < leads.length - 1) {
        await delay(Math.max(delayMs, 3000)); // Minimum 3 seconds
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      results,
      summary: {
        total: leads.length,
        success: successCount,
        errors: errorCount,
      },
    });
  } catch (error) {
    console.error("Send messages error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao enviar mensagens" },
      { status: 500 }
    );
  }
}
