/**
 * Trust score composition.
 *
 * Spec from the PDF:
 *   KYC + bank linked             +320  STATIC
 *   Vouch · Charter weight        +60   ONE-TIME
 *   Liveness (re-verified)        +30   STATIC
 *   Deals closed                  log-scale up to ~35% of total
 *   Time on platform              accrues
 *   Counterparty diversity        accrues
 *   Inactivity decay              −1 / week
 *
 * Tiers:
 *   provisional  0–500
 *   verified     501–800
 *   charter      801–1000
 */

export interface ScoreInputs {
  kycComplete: boolean;
  bankLinked: boolean;
  livenessOk: boolean;
  vouchesReceived: { weight: "standard" | "charter" }[];
  dealsClosedDisputeFree: number;
  counterpartyCountries: number;
  daysOnPlatform: number;
  daysSinceLastEvent: number;
}

const MAX = 1000;
const DEALS_CAP = 350; // ≈ 35% of total

export function computeScore(i: ScoreInputs): {
  total: number;
  tier: "provisional" | "verified" | "charter";
  breakdown: Record<string, number>;
} {
  const breakdown: Record<string, number> = {};

  breakdown["KYC + bank linked"] = i.kycComplete && i.bankLinked ? 320 : 0;
  breakdown["Liveness"] = i.livenessOk ? 30 : 0;

  let vouches = 0;
  for (const v of i.vouchesReceived) vouches += v.weight === "charter" ? 60 : 25;
  // Cap vouch contribution at 120 — no farming.
  breakdown["Vouches"] = Math.min(vouches, 120);

  // Log-scale on deals. d=0→0, d=1→~60, d=10→~210, asymptotic to 350.
  const deals = Math.round(DEALS_CAP * (Math.log10(i.dealsClosedDisputeFree + 1) / Math.log10(50)));
  breakdown["Deals closed"] = Math.min(deals, DEALS_CAP);

  breakdown["Counterparty diversity"] = Math.min(i.counterpartyCountries * 8, 60);
  breakdown["Time on platform"] = Math.min(Math.floor(i.daysOnPlatform / 7), 50);
  breakdown["Inactivity decay"] = -Math.floor(i.daysSinceLastEvent / 7);

  const raw = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const total = Math.max(0, Math.min(raw, MAX));

  const tier =
    total >= 801 ? "charter" :
    total >= 501 ? "verified" :
    "provisional";

  return { total, tier, breakdown };
}
