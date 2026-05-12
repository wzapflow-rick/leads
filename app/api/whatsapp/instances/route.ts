import { NextResponse } from "next/server";
import { fetchInstances } from "@/lib/evolution-api";

export async function GET() {
  try {
    const instances = await fetchInstances();

    // Transform to simpler format
    const formatted = instances.map((inst) => ({
      instanceName: inst.instance.instanceName,
      status: inst.instance.status,
      owner: inst.instance.owner,
    }));

    // Filter only connected instances
    const connected = formatted.filter(
      (inst) => inst.status === "open" || inst.status === "connected"
    );

    return NextResponse.json({
      instances: formatted,
      connected,
    });
  } catch (error) {
    console.error("Fetch instances error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar instancias" },
      { status: 500 }
    );
  }
}
