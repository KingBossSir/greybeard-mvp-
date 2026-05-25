import { createCipheriv, createDecipheriv, randomBytes, createHash, timingSafeEqual, createHmac } from "node:crypto";
import { getAuthSecret } from "./env";

/**
 * Envelope encryption: per-document AES-256-GCM Data Encryption Key (DEK),
 * wrapped by a master key. In production the master key lives in KMS; for the
 * MVP we accept a 32-byte hex env var (`VAULT_MASTER_KEY`).
 */

function getMasterKey(): Buffer {
  const hex = process.env.VAULT_MASTER_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("VAULT_MASTER_KEY must be 32-byte hex (64 chars)");
  }
  return Buffer.from(hex, "hex");
}

export interface EncryptedBlob {
  ciphertext: Buffer;
  iv: string;          // hex
  wrappedDek: string;  // hex(iv || tag || ciphertext) of the DEK under master
  contentHash: string; // hex sha256 of plaintext
}

/** Encrypt arbitrary bytes with a fresh DEK; wrap the DEK under the master key. */
export function encryptDocument(plaintext: Buffer): EncryptedBlob {
  const dek = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dek, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  // GCM convention: store iv||tag||ct so decryption needs only the DEK.
  const sealed = Buffer.concat([iv, tag, ciphertext]);

  const wrappedDek = wrapKey(dek);
  const contentHash = createHash("sha256").update(plaintext).digest("hex");

  return {
    ciphertext: sealed,
    iv: iv.toString("hex"),
    wrappedDek,
    contentHash,
  };
}

export function decryptDocument(sealed: Buffer, wrappedDek: string): Buffer {
  const dek = unwrapKey(wrappedDek);
  const iv = sealed.subarray(0, 12);
  const tag = sealed.subarray(12, 28);
  const ct = sealed.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", dek, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

function wrapKey(dek: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getMasterKey(), iv);
  const ct = Buffer.concat([cipher.update(dek), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("hex");
}

function unwrapKey(wrapped: string): Buffer {
  const buf = Buffer.from(wrapped, "hex");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getMasterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Token helpers — single-use bearer tokens (invites, vault shares).
 * Store only `hashToken(raw)` server-side; the raw value is the URL secret.
 * ──────────────────────────────────────────────────────────────────────────── */

const TOKEN_PEPPER_ENV = "AUTH_SECRET/NEXTAUTH_SECRET"; // double-duty: a per-deployment secret.

export function mintToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(raw: string): string {
  const pepper = getAuthSecret();
  if (!pepper) throw new Error(`${TOKEN_PEPPER_ENV} missing — cannot hash tokens`);
  return createHmac("sha256", pepper).update(raw).digest("hex");
}

/** Constant-time comparison wrapper. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
