import { NextRequest, NextResponse } from "next/server";
import { getQRCode, getConnectionState } from "@/lib/evolution-api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get("instance");

    if (!instanceName) {
      return NextResponse.json(
        { error: "Nome da instancia e obrigatorio" },
        { status: 400 }
      );
    }

    // First check connection state
    const state = await getConnectionState(instanceName);
    
    if (state.instance.state === "open" || state.instance.state === "connected") {
      return NextResponse.json({
        connected: true,
        state: state.instance.state,
      });
    }

    // Get QR code if not connected
    const qrData = await getQRCode(instanceName);

    return NextResponse.json({
      connected: false,
      state: state.instance.state,
      qrcode: qrData.base64,
      pairingCode: qrData.pairingCode,
    });
  } catch (error) {
    console.error("Get QR code error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao obter QR code" },
      { status: 500 }
    );
  }
}
