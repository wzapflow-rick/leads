import { NextRequest, NextResponse } from "next/server";
import {
  getLeads,
  createLead,
  createLeadsBulk,
  updateLead,
  deleteLead,
  checkLeadExists,
} from "@/lib/nocodb";
import type { Lead } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const nicho = searchParams.get("nicho");
    const cidade = searchParams.get("cidade");

    const filters: Record<string, string> = {};
    if (status) filters.status = status;
    if (nicho) filters.nicho = nicho;
    if (cidade) filters.cidade = cidade;

    const result = await getLeads(Object.keys(filters).length > 0 ? filters : undefined);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get leads error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar leads" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if it's a bulk insert
    if (Array.isArray(body)) {
      // Filter out duplicates based on google_place_id
      const uniqueLeads: Omit<Lead, "Id">[] = [];
      
      for (const lead of body) {
        if (lead.google_place_id) {
          const exists = await checkLeadExists(lead.google_place_id);
          if (!exists) {
            uniqueLeads.push({
              ...lead,
              status: lead.status || "novo",
              created_at: new Date().toISOString(),
            });
          }
        } else {
          uniqueLeads.push({
            ...lead,
            status: lead.status || "novo",
            created_at: new Date().toISOString(),
          });
        }
      }

      if (uniqueLeads.length === 0) {
        return NextResponse.json({
          created: [],
          message: "Todos os leads ja existem no banco",
          skipped: body.length,
        });
      }

      const created = await createLeadsBulk(uniqueLeads);
      return NextResponse.json({
        created,
        message: `${created.length} leads criados`,
        skipped: body.length - uniqueLeads.length,
      });
    }

    // Single lead insert
    if (body.google_place_id) {
      const exists = await checkLeadExists(body.google_place_id);
      if (exists) {
        return NextResponse.json(
          { error: "Lead ja existe no banco" },
          { status: 409 }
        );
      }
    }

    const lead = await createLead({
      ...body,
      status: body.status || "novo",
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Create lead error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar lead" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID e obrigatorio" },
        { status: 400 }
      );
    }

    const updated = await updateLead(id, data);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update lead error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar lead" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID e obrigatorio" },
        { status: 400 }
      );
    }

    await deleteLead(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete lead error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao deletar lead" },
      { status: 500 }
    );
  }
}
