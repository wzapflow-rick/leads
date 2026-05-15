const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "";

export interface EvolutionInstance {
  instance: {
    instanceName: string;
    instanceId: string;
    status: string;
    serverUrl: string;
    apikey: string;
    owner: string;
  };
}

export interface SendMessageResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    extendedTextMessage?: {
      text: string;
    };
    conversation?: string;
  };
  messageTimestamp: string;
  status: string;
}

async function evolutionFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${EVOLUTION_API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Evolution API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function fetchInstances(): Promise<EvolutionInstance[]> {
  return evolutionFetch<EvolutionInstance[]>("/instance/fetchInstances");
}

export async function getConnectionState(instanceName: string): Promise<{
  instance: { instanceName: string; state: string };
}> {
  return evolutionFetch(`/instance/connectionState/${instanceName}`);
}

export async function sendTextMessage(
  instanceName: string,
  number: string,
  text: string
): Promise<SendMessageResponse> {
  // Format number: remove all non-digits, ensure it starts with country code
  const formattedNumber = number.replace(/\D/g, "");
  
  return evolutionFetch<SendMessageResponse>(
    `/message/sendText/${instanceName}`,
    {
      method: "POST",
      body: JSON.stringify({
        number: formattedNumber,
        text: text,
      }),
    }
  );
}

export async function checkNumberExists(
  instanceName: string,
  number: string
): Promise<{ exists: boolean; jid: string }> {
  const formattedNumber = number.replace(/\D/g, "");
  
  const response = await evolutionFetch<{ exists: boolean; jid: string }[]>(
    `/chat/whatsappNumbers/${instanceName}`,
    {
      method: "POST",
      body: JSON.stringify({
        numbers: [formattedNumber],
      }),
    }
  );
  
  return response[0] || { exists: false, jid: "" };
}

export async function createInstance(instanceName: string): Promise<{
  instance: { instanceName: string; status: string };
  hash: { apikey: string };
  qrcode?: { base64: string };
}> {
  return evolutionFetch(`/instance/create`, {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    }),
  });
}

export async function connectInstance(instanceName: string): Promise<{
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}> {
  return evolutionFetch(`/instance/connect/${instanceName}`);
}

export async function getQRCode(instanceName: string): Promise<{
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}> {
  return evolutionFetch(`/instance/connect/${instanceName}`);
}

export async function logoutInstance(instanceName: string): Promise<void> {
  await evolutionFetch(`/instance/logout/${instanceName}`, {
    method: "DELETE",
  });
}

export async function deleteInstance(instanceName: string): Promise<void> {
  await evolutionFetch(`/instance/delete/${instanceName}`, {
    method: "DELETE",
  });
}

export async function restartInstance(instanceName: string): Promise<void> {
  await evolutionFetch(`/instance/restart/${instanceName}`, {
    method: "PUT",
  });
}
