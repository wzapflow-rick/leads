import { NextResponse } from "next/server";
import { getStats } from "@/lib/db";

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json(stats);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    
    // Se as tabelas nao existirem, retorna valores zerados
    if (errorMessage.includes("ERR_TABLE_NOT_FOUND")) {
      return NextResponse.json({
        totalLeads: 0,
        leadsPorStatus: {},
        totalEnvios: 0,
        enviosHoje: 0,
        setupRequired: true,
      });
    }
    
    console.error("Get stats error:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
