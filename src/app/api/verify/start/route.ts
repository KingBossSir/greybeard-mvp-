import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { invites, profiles } from "@/lib/schema";
import { hashToken, mintToken } from "@/lib/crypto";
import { InviteCreateSchema } from "@/lib/validators";
import { limiters, clientIp } from "@/lib/ratelimit";
import { appendEvent } from "@/lib/ledger";

/**
 * POST /api/verify/start — inviter mints an invitation for a new counterparty.
 * Returns a single-use URL: /verify/<rawToken>. The raw token is only ever in
 * this response and the WhatsApp deep link; only its hash is stored.
 */
export async function POST(req: Request) {
  const rl = await limiters.verifyStart.limit(`ip:${clientIp(req.headers)}`);
  if (!rl.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  const parsed = InviteCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const [inviter] = await db.select().from(profiles).where(eq(profiles.userId, session.user.id));

  const token = mintToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  await db.insert(invites).values({
    tokenHash: hashToken(token),
    inviterProfileId: inviter?.id ?? null,
    groupContext: parsed.data.groupContext,
    inviteePhone: parsed.data.inviteePhone,
    expiresAt,
  });

  if (inviter) {
    await appendEvent({
      profileId: inviter.id,
      type: "invite.issued",
      payload: { group: parsed.data.groupContext, phone: parsed.data.inviteePhone ?? null },
    });
  }

  const url = `${new URL(req.url).origin}/verify/${token}`;
  return NextResponse.json({ url, expiresAt });
}
