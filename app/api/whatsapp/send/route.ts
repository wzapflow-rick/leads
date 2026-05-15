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

    // Get leads - converter IDs para comparacao correta (string/number)
    const leadsResult = await getLeads();
    const leadIdsSet = new Set(leadIds.map((id: number | string) => String(id)));
    const leads = leadsResult.list.filter((lead) =>
      lead.Id !== undefined && leadIdsSet.has(String(lead.Id))
    );

    if (leads.length === 0) {
      return NextResponse.json(
        { error: `Nenhum lead encontrado. IDs solicitados: ${leadIds.join(", ")}` },
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
      const leadId = lead.Id;

      // Verifica se o lead tem ID valido
      if (!leadId) {
        results.push({
          leadId: 0,
          nome: lead.nome || "Desconhecido",
          success: false,
          error: "Lead sem ID valido",
        });
        continue;
      }

      if (!lead.telefone) {
        results.push({
          leadId,
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
        try {
          await updateLead(leadId, { status: "contatado" });
        } catch (updateErr) {
          console.error("Erro ao atualizar status do lead:", updateErr);
        }

        // Log envio
        try {
          await createEnvio({
            lead_id: leadId,
            template_id: templateId,
            instancia: instanceName,
            status: "enviado",
            message_id: response.key?.id || "",
            enviado_em: new Date().toISOString(),
          });
        } catch (envioErr) {
          console.error("Erro ao criar registro de envio:", envioErr);
        }

        results.push({
          leadId,
          nome: lead.nome,
          success: true,
          messageId: response.key?.id,
        });
      } catch (error) {
        // Log failed envio (mas nao falha se o log der erro)
        try {
          await createEnvio({
            lead_id: leadId,
            template_id: templateId,
            instancia: instanceName,
            status: "erro",
            erro_mensagem: error instanceof Error ? error.message : "Erro desconhecido",
            enviado_em: new Date().toISOString(),
          });
        } catch (envioErr) {
          console.error("Erro ao criar registro de envio com erro:", envioErr);
        }

        results.push({
          leadId,
          nome: lead.nome,
          success: false,
          error: error instanceof Error ? error.message : "Erro ao enviar",
        });
      }

      // Wait between messages (except for the last one)
      if (i < leads.length - 1) {
        await delay(Math.max(delayMs, 30000)); // Minimum 30 seconds
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
