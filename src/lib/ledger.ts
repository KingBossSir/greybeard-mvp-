import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "./db";
import { ledgerEvents, type LedgerEvent } from "./schema";

ed.etc.sha512Sync = (...m: Uint8Array[]) => sha512(ed.etc.concatBytes(...m));

const GENESIS_HASH = "0".repeat(64);
const LEDGER_PREV_HASH_CONSTRAINT = "ledger_profile_prev_hash_uq";
const MAX_APPEND_RETRIES = 3;

function getSigningKey(): Uint8Array {
  const hex = process.env.LEDGER_SIGNING_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("LEDGER_SIGNING_KEY must be 32-byte hex (64 chars)");
  }
  return hexToBytes(hex);
}

let cachedPubkey: string | null = null;
export async function getLedgerPubkeyHex(): Promise<string> {
  if (cachedPubkey) return cachedPubkey;
  const pub = await ed.getPublicKeyAsync(getSigningKey());
  cachedPubkey = bytesToHex(pub);
  return cachedPubkey;
}

/**
 * Canonical JSON: sorted keys, no whitespace, UTF-8.
 * Required so the hash is reproducible by external auditors.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(",")}}`;
}

export function computeEventHash(prevHash: string, payload: unknown): string {
  const input = `${prevHash}|${canonicalize(payload)}`;
  return bytesToHex(sha256(new TextEncoder().encode(input)));
}

/**
 * Append an event to the per-profile ledger. Hash chains to the previous event
 * (or to GENESIS_HASH for the first), and the hash is ed25519-signed.
 *
 * Concurrency: serializable transaction prevents two appends racing on the same
 * profile and forking the chain. (Neon http driver runs each statement as its
 * own implicit txn; for the MVP we rely on the unique (profile_id, prev_hash)
 * invariant — see migration. For higher throughput, swap to neon-serverless
 * pooled driver and wrap in db.transaction.)
 */
export async function appendEvent(args: {
  profileId: string;
  type: string;
  payload: Record<string, unknown>;
}): Promise<LedgerEvent> {
  const { profileId, type, payload } = args;

  for (let attempt = 0; attempt < MAX_APPEND_RETRIES; attempt += 1) {
    const last = await db
      .select()
      .from(ledgerEvents)
      .where(eq(ledgerEvents.profileId, profileId))
      .orderBy(desc(ledgerEvents.seq))
      .limit(1);

    const prevHash = last[0]?.hash ?? GENESIS_HASH;
    const fullPayload = { type, ...payload, ts: new Date().toISOString() };
    const hash = computeEventHash(prevHash, fullPayload);

    const sig = await ed.signAsync(hexToBytes(hash), getSigningKey());
    const pubkey = await getLedgerPubkeyHex();

    try {
      const [inserted] = await db
        .insert(ledgerEvents)
        .values({
          profileId,
          type,
          payload: fullPayload,
          hash,
          prevHash,
          signature: bytesToHex(sig),
          pubkey,
        })
        .returning();

      if (!inserted) throw new Error("ledger insert failed");
      return inserted;
    } catch (error) {
      if (isLedgerAppendConflict(error) && attempt < MAX_APPEND_RETRIES - 1) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("ledger append contention");
}

/** Verify a single event's signature and chain link. */
export async function verifyEvent(ev: LedgerEvent, prevHash: string): Promise<boolean> {
  if (ev.prevHash !== prevHash) return false;
  const recomputed = computeEventHash(prevHash, ev.payload);
  if (recomputed !== ev.hash) return false;
  return ed.verifyAsync(hexToBytes(ev.signature), hexToBytes(ev.hash), hexToBytes(ev.pubkey));
}

/** Verify an entire chain for a profile, from genesis onward. */
export async function verifyChain(profileId: string): Promise<{ ok: boolean; brokenAt?: number }> {
  const events = await db
    .select()
    .from(ledgerEvents)
    .where(eq(ledgerEvents.profileId, profileId))
    .orderBy(asc(ledgerEvents.seq));

  let prev = GENESIS_HASH;
  for (const ev of events) {
    const ok = await verifyEvent(ev, prev);
    if (!ok) return { ok: false, brokenAt: ev.seq };
    prev = ev.hash;
  }
  return { ok: true };
}

function isLedgerAppendConflict(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const dbError = error as Error & { code?: string; constraint?: string; cause?: { code?: string; constraint?: string; message?: string } };
  const code = dbError.code ?? dbError.cause?.code;
  const constraint = dbError.constraint ?? dbError.cause?.constraint;
  const message = `${dbError.message} ${dbError.cause?.message ?? ""}`;
  return (
    code === "23505" &&
    (constraint === LEDGER_PREV_HASH_CONSTRAINT || message.includes(LEDGER_PREV_HASH_CONSTRAINT))
  );
}

export { GENESIS_HASH };
