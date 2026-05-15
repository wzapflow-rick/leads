import { NextRequest, NextResponse } from "next/server";
import { createInstance } from "@/lib/evolution-api";

export async function POST(request: NextRequest) {
  try {
    const { instanceName } = await request.json();

    if (!instanceName) {
      return NextResponse.json(
        { error: "Nome da instancia e obrigatorio" },
        { status: 400 }
      );
    }

    // Sanitize instance name (remove spaces, special chars)
    const sanitizedName = instanceName
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .substring(0, 50);

    const result = await createInstance(sanitizedName);

    return NextResponse.json({
      success: true,
      instance: result.instance,
      qrcode: result.qrcode?.base64,
    });
  } catch (error) {
    console.error("Create instance error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar instancia" },
      { status: 500 }
    );
  }
}
