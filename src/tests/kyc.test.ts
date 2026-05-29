import { describe, expect, it } from "vitest";
import { verifyLiveness } from "@/lib/kyc";

describe("verifyLiveness", () => {
  it("fails obviously repeated frames", async () => {
    const repeated = Array.from({ length: 12 }, () => "a".repeat(64));
    const result = await verifyLiveness({
      frameHashes: repeated,
      identityProviderRef: "mock_identity",
    });
    expect(result.ok).toBe(false);
    expect(result.isLive).toBe(false);
  });

  it("passes varied frame hashes", async () => {
    const varied = Array.from({ length: 12 }, (_, i) => `${(i + 1).toString(16).padStart(2, "0")}`.repeat(32));
    const result = await verifyLiveness({
      frameHashes: varied,
      identityProviderRef: "mock_identity",
    });
    expect(result.ok).toBe(true);
    expect(result.matchScore).toBeGreaterThan(0.8);
  });
});
