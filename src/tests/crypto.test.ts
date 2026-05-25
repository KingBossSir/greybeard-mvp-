import { beforeAll, describe, it, expect } from "vitest";
import { encryptDocument, decryptDocument, mintToken, hashToken, safeEqual } from "@/lib/crypto";
import { parseCommand, verifyWebhookSignature } from "@/lib/whatsapp";
import { createHmac } from "node:crypto";

beforeAll(() => {
  process.env.VAULT_MASTER_KEY = "aa".repeat(32);
  process.env.AUTH_SECRET = "test-pepper-do-not-use-in-prod";
  process.env.WHATSAPP_APP_SECRET = "test-app-secret";
});

describe("envelope encryption", () => {
  it("round-trips arbitrary bytes", () => {
    const plain = Buffer.from("hello passport bytes", "utf8");
    const enc = encryptDocument(plain);
    const back = decryptDocument(enc.ciphertext, enc.wrappedDek);
    expect(back.equals(plain)).toBe(true);
  });
  it("uses a fresh IV each call", () => {
    const a = encryptDocument(Buffer.from("a"));
    const b = encryptDocument(Buffer.from("a"));
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
  });
  it("detects tampered ciphertext", () => {
    const enc = encryptDocument(Buffer.from("secret"));
    const tampered = Buffer.from(enc.ciphertext);
    tampered[tampered.length - 1] ^= 0xff;
    expect(() => decryptDocument(tampered, enc.wrappedDek)).toThrow();
  });
});

describe("token hashing", () => {
  it("hashes are stable for the same input + pepper", () => {
    const t = mintToken();
    expect(hashToken(t)).toBe(hashToken(t));
  });
  it("different tokens produce different hashes", () => {
    expect(hashToken(mintToken())).not.toBe(hashToken(mintToken()));
  });
  it("mintToken produces sufficient entropy", () => {
    const t = mintToken();
    expect(t.length).toBeGreaterThanOrEqual(40);
  });
});

describe("safeEqual", () => {
  it("returns true on identical strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
  });
  it("returns false on different lengths without throwing", () => {
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("WhatsApp signature verification", () => {
  it("accepts a correctly signed body", () => {
    const body = '{"entry":[]}';
    const sig = "sha256=" + createHmac("sha256", "test-app-secret").update(body).digest("hex");
    expect(verifyWebhookSignature(body, sig)).toBe(true);
  });
  it("rejects a wrong signature", () => {
    expect(verifyWebhookSignature('{"x":1}', "sha256=" + "00".repeat(32))).toBe(false);
  });
  it("rejects missing header", () => {
    expect(verifyWebhookSignature("{}", null)).toBe(false);
  });
});

describe("slash command parser", () => {
  it("parses /flash", () => {
    expect(parseCommand("/flash")).toEqual({ kind: "flash" });
  });
  it("parses /verify @them", () => {
    expect(parseCommand("/verify @kareem")).toEqual({ kind: "verify", mention: "kareem" });
  });
  it("parses @gb draft …", () => {
    const c = parseCommand("@gb draft 200MT @ $3420");
    expect(c.kind).toBe("draft");
  });
  it("falls through unknown text", () => {
    const c = parseCommand("hello world");
    expect(c.kind).toBe("unknown");
  });
});
