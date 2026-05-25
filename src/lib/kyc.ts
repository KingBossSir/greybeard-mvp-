import { createHash } from "node:crypto";

/**
 * KYC adapter — identity document + liveness verification.
 *
 * Production: Trulioo GlobalGateway, Onfido, or Veriff.
 * MVP: deterministic mock keyed on the content hash so the same passport
 *      always produces the same verdict — repeatable for testing.
 */

export interface IdentityResult {
  ok: boolean;
  matchScore: number;       // 0..1
  documentType: "passport" | "national_id";
  country: string;          // alpha-2
  documentNumberHash: string;  // we never store the raw doc number
  fullNameDigest: string;   // hash of normalized name for de-dup
  providerRef: string;      // upstream verification id
  reasons?: string[];
}

export interface LivenessResult {
  ok: boolean;
  matchScore: number;       // selfie ↔ portrait
  isLive: boolean;
  providerRef: string;
}

const mockProvider = process.env.TRULIOO_API_KEY ? "trulioo" : "mock";

export async function verifyIdentity(args: {
  documentBytes: Buffer;
  mimeType: string;
  declaredCountry: string;
}): Promise<IdentityResult> {
  if (mockProvider !== "mock") {
    // TODO: POST multipart to Trulioo, parse response.
    throw new Error("Trulioo integration not wired — set TRULIOO_API_KEY=mock to use the mock.");
  }

  const h = createHash("sha256").update(args.documentBytes).digest("hex");
  // Deterministic mock: first nibble decides outcome.
  const firstNibble = parseInt(h[0]!, 16);
  const ok = firstNibble < 14; // ~88% pass rate

  return {
    ok,
    matchScore: ok ? 0.94 : 0.41,
    documentType: "passport",
    country: args.declaredCountry.toUpperCase(),
    documentNumberHash: h,
    fullNameDigest: h.slice(0, 32),
    providerRef: `mock_${h.slice(0, 16)}`,
    reasons: ok ? undefined : ["mrz_unreadable"],
  };
}

export async function verifyLiveness(args: {
  frameHashes: string[];
  identityProviderRef: string;
}): Promise<LivenessResult> {
  if (mockProvider !== "mock") {
    throw new Error("Trulioo integration not wired");
  }
  // Deterministic on the joined frame hashes.
  const seed = createHash("sha256").update(args.frameHashes.join("|")).digest();
  const score = 0.7 + (seed[0]! / 255) * 0.3;
  return {
    ok: score > 0.8,
    isLive: score > 0.8,
    matchScore: score,
    providerRef: `mock_live_${args.identityProviderRef.slice(-8)}`,
  };
}
