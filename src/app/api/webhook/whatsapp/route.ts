import { NextResponse } from "next/server";
import { parseCommand, sendMessage, verifyWebhookSignature } from "@/lib/whatsapp";
import { limiters, clientIp } from "@/lib/ratelimit";

/**
 * GET — Meta verification handshake (echoes the challenge).
 * POST — incoming messages. Signature MUST validate before any side effects.
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

interface WhatsAppEntry {
  changes?: Array<{
    value?: {
      messages?: Array<{ from: string; text?: { body: string } }>;
    };
  }>;
}
interface WhatsAppEvent { entry?: WhatsAppEntry[] }

export async function POST(req: Request) {
  const rl = await limiters.webhook.limit(`ip:${clientIp(req.headers)}`);
  if (!rl.success) return new NextResponse("rate_limited", { status: 429 });

  // CRITICAL: read the body as the exact raw string Meta signed.
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("invalid_signature", { status: 401 });
  }

  let body: WhatsAppEvent;
  try { body = JSON.parse(raw); } catch { return new NextResponse("bad_json", { status: 400 }); }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const msg of change.value?.messages ?? []) {
        const cmd = parseCommand(msg.text?.body ?? "");
        const reply = await handleCommand(cmd, msg.from);
        if (reply) await sendMessage({ to: msg.from, body: reply });
      }
    }
  }

  // Meta requires 200 within ~5s — never block on heavy work here.
  return NextResponse.json({ ok: true });
}

async function handleCommand(cmd: ReturnType<typeof parseCommand>, _from: string): Promise<string | null> {
  switch (cmd.kind) {
    case "flash":
      return "Open https://greybeard.app/account to flash your card. (web-based for the beta)";
    case "verify":
      return `To verify ${cmd.mention}, ask them to open the invite link in this chat.`;
    case "draft":
      return "Contract drafting is in the web app for the beta — open https://greybeard.app/dashboard.";
    case "escrow":
      return "Escrow instructions go via the web app. Ops will confirm receipt within 30 min during banking hours.";
    case "side":
      return "Encrypted side-channel: upload via the web app, recipient gets a 24h signed link.";
    case "unknown":
      return null;
  }
}
