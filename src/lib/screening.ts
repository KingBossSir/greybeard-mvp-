/**
 * Sanctions / PEP / adverse-media screening adapter.
 *
 * Production: ComplyAdvantage, Refinitiv World-Check, or LexisNexis.
 * MVP: mock that always returns "clear" unless the name matches a hard-coded
 *      watchlist (so QA can exercise the human-review path).
 */

export type Listref = "ofac" | "un" | "eu" | "uk" | "pep" | "adverse_media";

export interface ScreeningHit {
  list: Listref;
  matchScore: number;
  entry: string;
}

export interface ScreeningResult {
  ok: boolean;        // true ⇒ clean; false ⇒ needs human review
  hits: ScreeningHit[];
  providerRef: string;
}

// Tiny demo watchlist — DO NOT use in production.
const DEMO_WATCHLIST = new Set(["test sanctioned", "qa pep", "demo adverse"]);

export async function screen(args: {
  fullName: string;
  dateOfBirth?: string;
  country?: string;
}): Promise<ScreeningResult> {
  if (process.env.COMPLY_ADVANTAGE_API_KEY && process.env.COMPLY_ADVANTAGE_API_KEY !== "mock") {
    throw new Error("ComplyAdvantage integration not wired — set COMPLY_ADVANTAGE_API_KEY=mock to use the mock.");
  }
  const norm = args.fullName.trim().toLowerCase();
  const flagged = DEMO_WATCHLIST.has(norm);

  return {
    ok: !flagged,
    hits: flagged ? [{ list: "ofac", matchScore: 0.92, entry: norm }] : [],
    providerRef: `mock_scr_${Buffer.from(norm).toString("base64url").slice(0, 12)}`,
  };
}
