import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * WhatsApp Cloud API adapter.
 *
 * MVP:
 *   - verifyWebhookSignature: validates `X-Hub-Signature-256` from Meta.
 *   - sendInviteCard: posts a templated message (templates must be pre-approved
 *     in the Meta WhatsApp Business Manager).
 *
 * The bot itself runs the deterministic slash-command parser in `parseCommand`.
 */

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return false;
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const provided = signatureHeader.slice("sha256=".length);
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type SlashCommand =
  | { kind: "flash" }
  | { kind: "verify"; mention: string }
  | { kind: "draft"; freeform: string }
  | { kind: "escrow" }
  | { kind: "side" }
  | { kind: "unknown"; text: string };

/** Deterministic slash-command parser — NO LLM in the critical path. */
export function parseCommand(text: string): SlashCommand {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/") && !trimmed.startsWith("@gb")) return { kind: "unknown", text: trimmed };

  const body = trimmed.replace(/^@gb\s+/, "/");
  const [cmd, ...rest] = body.slice(1).split(/\s+/);

  switch (cmd) {
    case "flash":  return { kind: "flash" };
    case "verify": return { kind: "verify", mention: rest.join(" ").replace(/^@/, "") };
    case "draft":  return { kind: "draft", freeform: rest.join(" ") };
    case "escrow": return { kind: "escrow" };
    case "side":   return { kind: "side" };
    default:       return { kind: "unknown", text: trimmed };
  }
}

interface WhatsAppMessage {
  to: string; // E.164
  body: string;
}

export async function sendMessage(msg: WhatsAppMessage): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[whatsapp] mock send →", msg.to, ":", msg.body);
      return;
    }
    throw new Error("WhatsApp credentials missing");
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: msg.to,
      type: "text",
      text: { body: msg.body, preview_url: false },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp send failed: ${res.status} ${err}`);
  }
}
