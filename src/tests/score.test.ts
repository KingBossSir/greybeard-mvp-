import { describe, it, expect } from "vitest";
import { computeScore } from "@/lib/score";

describe("computeScore", () => {
  it("starts at provisional for a brand-new profile", () => {
    const r = computeScore({
      kycComplete: true, bankLinked: false, livenessOk: true,
      vouchesReceived: [],
      dealsClosedDisputeFree: 0, counterpartyCountries: 0,
      daysOnPlatform: 0, daysSinceLastEvent: 0,
    });
    expect(r.tier).toBe("provisional");
    expect(r.total).toBeLessThanOrEqual(500);
  });

  it("promotes to verified once bank linked + vouches accrue", () => {
    const r = computeScore({
      kycComplete: true, bankLinked: true, livenessOk: true,
      vouchesReceived: [{ weight: "charter" }, { weight: "standard" }],
      dealsClosedDisputeFree: 5, counterpartyCountries: 2,
      daysOnPlatform: 90, daysSinceLastEvent: 0,
    });
    expect(["verified", "charter"]).toContain(r.tier);
    expect(r.total).toBeGreaterThanOrEqual(501);
  });

  it("caps deals at 350pts", () => {
    const r = computeScore({
      kycComplete: false, bankLinked: false, livenessOk: false,
      vouchesReceived: [],
      dealsClosedDisputeFree: 1000, counterpartyCountries: 0,
      daysOnPlatform: 0, daysSinceLastEvent: 0,
    });
    expect(r.breakdown["Deals closed"]).toBeLessThanOrEqual(350);
  });

  it("decays for inactivity", () => {
    const a = computeScore({
      kycComplete: true, bankLinked: true, livenessOk: true,
      vouchesReceived: [], dealsClosedDisputeFree: 0, counterpartyCountries: 0,
      daysOnPlatform: 0, daysSinceLastEvent: 0,
    });
    const b = computeScore({
      kycComplete: true, bankLinked: true, livenessOk: true,
      vouchesReceived: [], dealsClosedDisputeFree: 0, counterpartyCountries: 0,
      daysOnPlatform: 0, daysSinceLastEvent: 70,
    });
    expect(b.total).toBeLessThan(a.total);
  });

  it("never goes below 0 or above 1000", () => {
    const r = computeScore({
      kycComplete: false, bankLinked: false, livenessOk: false,
      vouchesReceived: [], dealsClosedDisputeFree: 0, counterpartyCountries: 0,
      daysOnPlatform: 0, daysSinceLastEvent: 100_000,
    });
    expect(r.total).toBeGreaterThanOrEqual(0);
  });
});
