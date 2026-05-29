import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthSecret } from "./env";

const SESSION_COOKIE = "greybeard.session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const authSecret = getAuthSecret() ?? "greybeard-dev-fallback-secret";

const SessionPayloadSchema = z.object({
  id: z.string().min(16).max(128),
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
});

type SessionPayload = z.infer<typeof SessionPayloadSchema>;

function generateDisplayName(input?: string) {
  const normalized = input?.trim().replace(/\s+/g, " ").slice(0, 80);
  if (normalized) return normalized;
  return `Operator ${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

function base64urlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64urlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signValue(value: string) {
  return createHmac("sha256", authSecret).update(value).digest("base64url");
}

function serializeSession(payload: SessionPayload) {
  const body = base64urlEncode(JSON.stringify(payload));
  const sig = signValue(body);
  return `${body}.${sig}`;
}

async function persistSession(payload: SessionPayload) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, serializeSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

function parseSessionCookie(raw?: string | null): SessionPayload | null {
  if (!raw) return null;
  const [body, providedSig] = raw.split(".");
  if (!body || !providedSig) return null;

  const expectedSig = signValue(body);
  const provided = Buffer.from(providedSig);
  const expected = Buffer.from(expectedSig);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    return SessionPayloadSchema.parse(JSON.parse(base64urlDecode(body)));
  } catch {
    return null;
  }
}

export async function auth() {
  const cookieStore = await cookies();
  const payload = parseSessionCookie(cookieStore.get(SESSION_COOKIE)?.value);
  if (!payload) return null;

  return {
    user: {
      id: payload.id,
      name: payload.name,
      email: payload.email,
    },
  };
}

export async function createLocalAccess(displayNameInput: string, redirectTo = "/account") {
  const displayName = generateDisplayName(displayNameInput);
  const payload: SessionPayload = {
    id: crypto.randomUUID(),
    name: displayName,
  };

  await persistSession(payload);
  redirect(redirectTo);
}

export async function updateLocalAccessProfile(input: { name?: string; email?: string | null }) {
  const session = await auth();
  if (!session?.user?.id) return;
  await persistSession({
    id: session.user.id,
    name: input.name ?? session.user.name ?? undefined,
    email: input.email ?? session.user.email ?? undefined,
  });
}

export async function signOut(options?: { redirectTo?: string }) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });

  redirect(options?.redirectTo ?? "/");
}
