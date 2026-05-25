import { describe, it, expect, beforeAll } from "vitest";
import { canonicalize, computeEventHash } from "@/lib/ledger";

beforeAll(() => {
  // tests don't need a DB; we only exercise pure helpers.
});

describe("canonicalize", () => {
  it("sorts object keys deterministically", () => {
    expect(canonicalize({ b: 2, a: 1 })).toBe(`{"a":1,"b":2}`);
  });
  it("handles nested arrays + objects", () => {
    expect(canonicalize({ z: [{ y: 1, x: 2 }] })).toBe(`{"z":[{"x":2,"y":1}]}`);
  });
  it("escapes strings via JSON.stringify", () => {
    expect(canonicalize({ s: 'a"b' })).toBe(`{"s":"a\\"b"}`);
  });
  it("is stable across key insertion order", () => {
    const a = canonicalize({ a: 1, b: { x: 1, y: 2 } });
    const b = canonicalize({ b: { y: 2, x: 1 }, a: 1 });
    expect(a).toBe(b);
  });
});

describe("computeEventHash", () => {
  it("changes when payload changes", () => {
    const h1 = computeEventHash("00".repeat(32), { type: "x" });
    const h2 = computeEventHash("00".repeat(32), { type: "y" });
    expect(h1).not.toBe(h2);
  });
  it("changes when prevHash changes", () => {
    const h1 = computeEventHash("00".repeat(32), { type: "x" });
    const h2 = computeEventHash("01".repeat(32), { type: "x" });
    expect(h1).not.toBe(h2);
  });
  it("is reproducible across runs", () => {
    const h1 = computeEventHash("ab".repeat(32), { type: "x", n: 1 });
    const h2 = computeEventHash("ab".repeat(32), { type: "x", n: 1 });
    expect(h1).toBe(h2);
  });
});
