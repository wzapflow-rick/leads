import { NextResponse } from "next/server";
import { getStats } from "@/lib/nocodb";

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar estatisticas" },
      { status: 500 }
    );
  }
}
