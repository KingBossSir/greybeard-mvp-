import { promises as fs } from "node:fs";
import path from "node:path";
import { decryptDocument, encryptDocument } from "./crypto";
import { db } from "./db";
import { vaultDocs, vaultShares, type VaultDoc } from "./schema";
import { hashToken, mintToken } from "./crypto";
import { eq } from "drizzle-orm";

/**
 * Vault driver: persists the encrypted blob to local FS or S3.
 * Metadata always lives in Postgres.
 */
interface Driver {
  put(storageRef: string, bytes: Buffer): Promise<void>;
  get(storageRef: string): Promise<Buffer>;
}

class LocalDriver implements Driver {
  private root = path.resolve(process.cwd(), ".vault");
  async put(ref: string, bytes: Buffer) {
    const target = this.resolve(ref);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes, { mode: 0o600 });
  }
  async get(ref: string) {
    return fs.readFile(this.resolve(ref));
  }
  private resolve(ref: string): string {
    // Defence in depth: refs are mint()ed UUIDs, but reject path traversal anyway.
    if (ref.includes("..") || ref.includes("/") || ref.includes("\\")) {
      throw new Error("invalid vault ref");
    }
    return path.join(this.root, ref);
  }
}

class S3Driver implements Driver {
  async put(_ref: string, _bytes: Buffer) {
    throw new Error("S3 driver: TODO — wire @aws-sdk/client-s3 PutObject with SSE-KMS");
  }
  async get(_ref: string): Promise<Buffer> {
    throw new Error("S3 driver: TODO — wire @aws-sdk/client-s3 GetObject");
  }
}

function driver(): Driver {
  switch (process.env.VAULT_DRIVER) {
    case "s3":
      return new S3Driver();
    case "local":
    case undefined:
      return new LocalDriver();
    default:
      throw new Error(`Unknown VAULT_DRIVER=${process.env.VAULT_DRIVER}`);
  }
}

export async function storeDocument(args: {
  ownerProfileId: string;
  kind: VaultDoc["kind"];
  mimeType: string;
  bytes: Buffer;
}): Promise<VaultDoc> {
  if (args.bytes.byteLength === 0) throw new Error("empty document");
  if (args.bytes.byteLength > 25 * 1024 * 1024) throw new Error("document exceeds 25MB cap");

  const enc = encryptDocument(args.bytes);
  const storageRef = crypto.randomUUID();
  await driver().put(storageRef, enc.ciphertext);

  const [row] = await db
    .insert(vaultDocs)
    .values({
      ownerProfileId: args.ownerProfileId,
      kind: args.kind,
      storageRef,
      contentHash: enc.contentHash,
      wrappedDek: enc.wrappedDek,
      iv: enc.iv,
      byteLength: args.bytes.byteLength,
      mimeType: args.mimeType,
    })
    .returning();
  if (!row) throw new Error("vault insert failed");
  return row;
}

export async function fetchDocument(docId: string, requestingProfileId: string): Promise<{
  bytes: Buffer;
  meta: VaultDoc;
}> {
  const [doc] = await db.select().from(vaultDocs).where(eq(vaultDocs.id, docId));
  if (!doc) throw new Error("not found");
  if (doc.ownerProfileId !== requestingProfileId) {
    // Check if a valid share exists.
    // Caller should usually go through `consumeShare` instead; this is a safety net.
    throw new Error("forbidden");
  }
  const sealed = await driver().get(doc.storageRef);
  return { bytes: decryptDocument(sealed, doc.wrappedDek), meta: doc };
}

/** Mint a 24h single-use share link for a vault doc. Returns the raw token. */
export async function createShareLink(args: {
  docId: string;
  recipientProfileId?: string;
  ttlSeconds?: number;
}): Promise<{ token: string; expiresAt: Date }> {
  const ttl = args.ttlSeconds ?? 24 * 60 * 60;
  const expiresAt = new Date(Date.now() + ttl * 1000);
  const token = mintToken();
  await db.insert(vaultShares).values({
    docId: args.docId,
    tokenHash: hashToken(token),
    recipientProfileId: args.recipientProfileId,
    expiresAt,
  });
  return { token, expiresAt };
}

/** Validate + mark a share consumed, return the document bytes. */
export async function consumeShare(rawToken: string): Promise<{ bytes: Buffer; meta: VaultDoc }> {
  const tokenHash = hashToken(rawToken);
  const [share] = await db.select().from(vaultShares).where(eq(vaultShares.tokenHash, tokenHash));
  if (!share) throw new Error("invalid token");
  if (share.usedAt) throw new Error("token already used");
  if (share.expiresAt.getTime() < Date.now()) throw new Error("token expired");

  await db.update(vaultShares).set({ usedAt: new Date() }).where(eq(vaultShares.id, share.id));

  const [doc] = await db.select().from(vaultDocs).where(eq(vaultDocs.id, share.docId));
  if (!doc) throw new Error("doc missing");
  const sealed = await driver().get(doc.storageRef);
  return { bytes: decryptDocument(sealed, doc.wrappedDek), meta: doc };
}
