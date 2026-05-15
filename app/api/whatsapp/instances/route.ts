import { NextResponse } from "next/server";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";

interface InstanceData {
  instanceName: string;
  status: string;
  owner?: string;
  connectionStatus?: string;
}

export async function GET() {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return NextResponse.json(
        { error: "Evolution API nao configurada", instances: [], connected: [] },
        { status: 500 }
      );
    }

    const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Suporta diferentes formatos da Evolution API (v1 e v2)
    const formatted: InstanceData[] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        // Formato v1: { instance: { instanceName, status, owner } }
        if (item.instance && item.instance.instanceName) {
          formatted.push({
            instanceName: item.instance.instanceName,
            status: item.instance.status || item.instance.connectionStatus || "unknown",
            owner: item.instance.owner,
          });
        }
        // Formato v2: { instanceName, status, connectionStatus }
        else if (item.instanceName) {
          formatted.push({
            instanceName: item.instanceName,
            status: item.status || item.connectionStatus || "unknown",
            owner: item.owner,
          });
        }
        // Formato alternativo: { name, state }
        else if (item.name) {
          formatted.push({
            instanceName: item.name,
            status: item.state || item.status || "unknown",
            owner: item.owner,
          });
        }
      }
    }

    // Filter only connected instances
    const connected = formatted.filter(
      (inst) => 
        inst.status === "open" || 
        inst.status === "connected" || 
        inst.status === "CONNECTED"
    );

    return NextResponse.json({
      instances: formatted,
      connected,
    });
  } catch (error) {
    console.error("Fetch instances error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Erro ao buscar instancias",
        instances: [],
        connected: [],
      },
      { status: 500 }
    );
  }
}
