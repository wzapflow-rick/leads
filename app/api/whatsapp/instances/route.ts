import { NextResponse } from "next/server";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";

interface InstanceData {
  instanceName: string;
  status: string;
  owner?: string;
  profileName?: string;
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

    // Formato da Evolution API v2:
    // { name, connectionStatus, ownerJid, profileName, ... }
    const formatted: InstanceData[] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        formatted.push({
          instanceName: item.name || item.instanceName || item.instance?.instanceName,
          status: item.connectionStatus || item.status || item.instance?.status || "unknown",
          owner: item.ownerJid || item.owner,
          profileName: item.profileName,
        });
      }
    }

    // Filter only connected instances (connectionStatus === "open")
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
