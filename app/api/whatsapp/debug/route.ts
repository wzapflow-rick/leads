import { NextResponse } from "next/server";

export async function GET() {
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;

  const hasUrl = !!evolutionUrl;
  const hasKey = !!evolutionKey;

  // Tenta fazer uma requisicao de teste
  let connectionTest = null;
  let error = null;

  if (hasUrl && hasKey) {
    try {
      const response = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
        headers: {
          "Content-Type": "application/json",
          apikey: evolutionKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        connectionTest = {
          success: true,
          instanceCount: Array.isArray(data) ? data.length : 0,
          instances: Array.isArray(data)
            ? data.map((i: { instance?: { instanceName?: string; status?: string } }) => ({
                name: i.instance?.instanceName,
                status: i.instance?.status,
              }))
            : [],
        };
      } else {
        const errorText = await response.text();
        connectionTest = {
          success: false,
          status: response.status,
          error: errorText,
        };
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Erro desconhecido";
    }
  }

  return NextResponse.json({
    config: {
      EVOLUTION_API_URL: hasUrl ? `${evolutionUrl?.substring(0, 30)}...` : "NAO CONFIGURADA",
      EVOLUTION_API_KEY: hasKey ? "CONFIGURADA (oculta)" : "NAO CONFIGURADA",
    },
    connectionTest,
    error,
  });
}
