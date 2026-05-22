import { NextRequest, NextResponse } from "next/server";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/lib/db";

export async function GET() {
  try {
    const result = await getTemplates();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Get templates error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.nome || !body.mensagem) {
      return NextResponse.json(
        { error: "Nome e mensagem sao obrigatorios" },
        { status: 400 }
      );
    }

    const template = await createTemplate({
      nome: body.nome,
      mensagem: body.mensagem,
      ativo: body.ativo ?? true,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Create template error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar template" },
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

    const updated = await updateTemplate(id, data);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update template error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar template" },
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

    await deleteTemplate(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete template error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao deletar template" },
      { status: 500 }
    );
  }
}
