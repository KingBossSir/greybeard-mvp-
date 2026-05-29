import { describe, it, expect } from "vitest";
import { countryFromE164, crossCheck, hashPreciseCoords, isSanctioned } from "@/lib/geo";

describe("geo cross-check", () => {
  it("passes when all three signals agree", () => {
    expect(crossCheck({ gpsCountry: "NG", ipCountry: "NG", simCountry: "NG", gpsCity: "Lagos" }).ok).toBe(true);
  });
  it("fails on mismatch", () => {
    const r = crossCheck({ gpsCountry: "NG", ipCountry: "GB", simCountry: "NG" });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("mismatch");
  });
  it("hard-stops sanctioned regions", () => {
    const r = crossCheck({ gpsCountry: "IR", ipCountry: "IR", simCountry: "IR" });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("sanctioned");
  });
  it("case-insensitive country codes", () => {
    const r = crossCheck({ gpsCountry: "ng", ipCountry: "NG", simCountry: "Ng" });
    expect(r.ok).toBe(true);
  });
});

describe("precise coordinate hashing", () => {
  it("is deterministic", () => {
    const a = hashPreciseCoords(6.5244, 3.3792, "2026-05-24T09:31:00Z");
    const b = hashPreciseCoords(6.5244, 3.3792, "2026-05-24T09:31:00Z");
    expect(a).toBe(b);
  });
  it("changes with timestamp", () => {
    const a = hashPreciseCoords(6.5244, 3.3792, "2026-05-24T09:31:00Z");
    const b = hashPreciseCoords(6.5244, 3.3792, "2026-05-24T09:31:01Z");
    expect(a).not.toBe(b);
  });
  it("produces 64-char hex", () => {
    const h = hashPreciseCoords(0, 0, "2026-01-01T00:00:00Z");
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("isSanctioned", () => {
  it("flags Iran/NK/Syria/Cuba", () => {
    expect(isSanctioned("IR")).toBe(true);
    expect(isSanctioned("KP")).toBe(true);
    expect(isSanctioned("SY")).toBe(true);
    expect(isSanctioned("CU")).toBe(true);
  });
  it("does not flag Nigeria", () => {
    expect(isSanctioned("NG")).toBe(false);
  });
});

describe("countryFromE164", () => {
  it("maps supported dial prefixes", () => {
    expect(countryFromE164("+2348012345678")).toBe("NG");
    expect(countryFromE164("+233201234567")).toBe("GH");
    expect(countryFromE164("+971501234567")).toBe("AE");
  });

  it("returns undefined for missing or unknown numbers", () => {
    expect(countryFromE164(undefined)).toBeUndefined();
    expect(countryFromE164("08012345678")).toBeUndefined();
  });
});
