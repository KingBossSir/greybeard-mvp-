import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ledgerEvents, profiles } from "@/lib/schema";
import { getLedgerPubkeyHex, verifyChain } from "@/lib/ledger";

/**
 * GET /api/ledger/:profileId — public, signed export of an entire chain.
 * No auth required — the ledger IS the public attestation. The profile must be
 * `isLive` to be exported (prevents in-flight verification leakage).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId));
  if (!profile || !profile.isLive) {
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
