import { NextResponse } from "next/server";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";

interface InstanceData {
  instanceName: string;
  status: string;
  owner?: string;
}

// Busca status de conexao de uma instancia especifica
async function getConnectionStatus(instanceName: string): Promise<string> {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`,
      {
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_API_KEY,
        },
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      // Pode retornar { state: "open" } ou { instance: { state: "open" } }
      return data.state || data.instance?.state || data.status || "unknown";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
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

    // Extrai nomes das instancias de diferentes formatos
    const instanceNames: string[] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.instance?.instanceName) {
          instanceNames.push(item.instance.instanceName);
        } else if (item.instanceName) {
          instanceNames.push(item.instanceName);
        } else if (item.name) {
          instanceNames.push(item.name);
        }
      }
    }

    // Busca status de conexao de cada instancia em paralelo
    const statusPromises = instanceNames.map(async (name) => {
      const status = await getConnectionStatus(name);
      return { instanceName: name, status };
    });

    const formatted: InstanceData[] = await Promise.all(statusPromises);

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
