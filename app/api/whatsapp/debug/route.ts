import { NextResponse } from "next/server";

export async function GET() {
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const evolutionKey = process.env.EVOLUTION_API_KEY;

  const hasUrl = !!evolutionUrl;
  const hasKey = !!evolutionKey;

  // Tenta fazer uma requisicao de teste
  let connectionTest = null;
  let error = null;
  let rawResponse = null;

  if (hasUrl && hasKey) {
    try {
      const response = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
        headers: {
          "Content-Type": "application/json",
          apikey: evolutionKey,
        },
      });

      const responseText = await response.text();
      
      try {
        rawResponse = JSON.parse(responseText);
      } catch {
        rawResponse = responseText;
      }

      if (response.ok) {
        connectionTest = {
          success: true,
          httpStatus: response.status,
          dataType: typeof rawResponse,
          isArray: Array.isArray(rawResponse),
          itemCount: Array.isArray(rawResponse) ? rawResponse.length : null,
          firstItemKeys: Array.isArray(rawResponse) && rawResponse.length > 0 
            ? Object.keys(rawResponse[0]) 
            : null,
        };
      } else {
        connectionTest = {
          success: false,
          status: response.status,
          error: responseText,
        };
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Erro desconhecido";
    }
  }

  return NextResponse.json({
    config: {
      EVOLUTION_API_URL: hasUrl ? evolutionUrl : "NAO CONFIGURADA",
      EVOLUTION_API_KEY: hasKey ? "CONFIGURADA (oculta)" : "NAO CONFIGURADA",
    },
    connectionTest,
    rawResponse,
    error,
  });
}
