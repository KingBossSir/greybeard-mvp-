import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/schema";
import { appendEvent } from "@/lib/ledger";
import { FlashSchema } from "@/lib/validators";
import { limiters, clientIp } from "@/lib/ratelimit";

/**
 * POST /api/flash — drop your card into a chat.
 * Returns a server-signed payload with a short-lived nonce in the URL so a
 * forwarded screenshot can be re-verified by tap-through (URL fetches the
 * card view which re-signs and re-renders).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = await limiters.flash.limit(`u:${session.user.id}`);
  if (!rl.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  const parsed = FlashSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.flatten() }, { status: 400 });

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.user.id));
  if (!profile || !profile.isLive) return NextResponse.json({ error: "profile_not_live" }, { status: 409 });

  const ev = await appendEvent({
    profileId: profile.id,
    type: "card.flashed",
    payload: { group: parsed.data.groupContext ?? null, ip: clientIp(req.headers) },
  });

  const url = `${new URL(req.url).origin}/card/${profile.id}#v=${ev.seq}`;
  return NextResponse.json({
    url,
    seq: ev.seq,
    hash: ev.hash,
    signature: ev.signature,
    pubkey: ev.pubkey,
  });
}
