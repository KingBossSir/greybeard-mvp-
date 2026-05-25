import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ledgerEvents, profiles } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { getLedgerPubkeyHex, verifyChain } from "@/lib/ledger";

/**
 * GET /api/ledger/:profileId — authenticated export of a profile's full chain.
 * The signed ledger may contain sensitive operational payloads (IP, group
 * context, invite phone, provider refs), so only the owning user may export
 * the full attestation record.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { profileId } = await params;
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId));
  if (!profile || !profile.isLive || profile.userId !== session.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const events = await db
    .select()
    .from(ledgerEvents)
    .where(eq(ledgerEvents.profileId, profileId))
    .orderBy(asc(ledgerEvents.seq));

  const chain = await verifyChain(profileId);
  const pubkey = await getLedgerPubkeyHex();

  return NextResponse.json(
    {
      profileId,
      handle: profile.handle,
      pubkey,
      chain: chain.ok ? "verified" : "broken",
      events: events.map((e) => ({
        seq: e.seq,
        type: e.type,
        payload: e.payload,
        hash: e.hash,
        prevHash: e.prevHash,
        signature: e.signature,
        ts: e.createdAt.toISOString(),
      })),
    },
    { headers: { "cache-control": "no-store" } }
  );
}
