import { describe, it, expect, beforeAll } from "vitest";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { computeEventHash } from "@/lib/ledger";

ed.etc.sha512Sync = (...m: Uint8Array[]) => sha512(ed.etc.concatBytes(...m));

beforeAll(() => {
  // Pin a known seed for deterministic test signatures.
  process.env.LEDGER_SIGNING_KEY = "11".repeat(32);
  process.env.AUTH_SECRET = "test-secret-pepper-do-not-use-in-prod";
});

describe("ed25519 signing roundtrip", () => {
  it("signs and verifies an event hash", async () => {
    const seed = hexToBytes(process.env.LEDGER_SIGNING_KEY!);
    const pub = await ed.getPublicKeyAsync(seed);
    const hash = computeEventHash("00".repeat(32), { type: "test", n: 1 });
    const sig = await ed.signAsync(hexToBytes(hash), seed);
    expect(await ed.verifyAsync(sig, hexToBytes(hash), pub)).toBe(true);
  });

  it("rejects tampered payloads", async () => {
    const seed = hexToBytes(process.env.LEDGER_SIGNING_KEY!);
    const pub = await ed.getPublicKeyAsync(seed);
    const hash = computeEventHash("00".repeat(32), { type: "test", n: 1 });
    const sig = await ed.signAsync(hexToBytes(hash), seed);
    const wrong = computeEventHash("00".repeat(32), { type: "test", n: 2 });
    expect(await ed.verifyAsync(sig, hexToBytes(wrong), pub)).toBe(false);
  });

  it("public keys derive deterministically from the seed", async () => {
    const seed = hexToBytes("11".repeat(32));
    const p1 = bytesToHex(await ed.getPublicKeyAsync(seed));
    const p2 = bytesToHex(await ed.getPublicKeyAsync(seed));
    expect(p1).toBe(p2);
  });
});
