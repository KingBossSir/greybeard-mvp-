import { createHash } from "node:crypto";

/**
 * Three-signal location cross-check: GPS, IP, SIM country must agree.
 * Sanctioned regions hard-stop.
 *
 * For the MVP we accept the inputs from the client; production should:
 *   - GPS:  W3C Geolocation API → server-validated (do NOT trust the lat/lng
 *           blindly; recompute the country via reverse-geocoder).
 *   - IP:   Vercel `request.geo` or MaxMind GeoLite2.
 *   - SIM:  Twilio Lookup v2 / WhatsApp MSISDN → country code.
 *
 * Per the PDF: precise GPS is captured ONLY at deal-signing moments and only
 * the hash of (lat,lng,ts) goes into the deal's audit entry. The profile
 * verification record stores city-level only.
 */

// ISO-3166-1 alpha-2. Update as your compliance team updates the deny list.
const SANCTIONED = new Set([
  "IR", // Iran
  "KP", // North Korea
  "SY", // Syria
  "CU", // Cuba
  // Regional carve-outs (Crimea, Donetsk, Luhansk) handled with finer geofence.
]);

export interface GeoSignals {
  gpsCountry: string;   // alpha-2
  ipCountry: string;    // alpha-2
  simCountry: string;   // alpha-2
  gpsCity?: string;
  gpsLat?: number;
  gpsLng?: number;
}

export interface GeoVerdict {
  ok: boolean;
  reason?: "mismatch" | "sanctioned";
  signals: { gps: string; ip: string; sim: string };
  storedCity?: string;
  /** Hash of precise coords for audit entries (deal-signing only). */
  preciseHash?: string;
}

export function crossCheck(s: GeoSignals): GeoVerdict {
  const sig = { gps: s.gpsCountry.toUpperCase(), ip: s.ipCountry.toUpperCase(), sim: s.simCountry.toUpperCase() };
  if (SANCTIONED.has(sig.gps) || SANCTIONED.has(sig.ip) || SANCTIONED.has(sig.sim)) {
    return { ok: false, reason: "sanctioned", signals: sig };
  }
  if (sig.gps !== sig.ip || sig.ip !== sig.sim) {
    return { ok: false, reason: "mismatch", signals: sig };
  }
  return { ok: true, signals: sig, storedCity: s.gpsCity };
}

export function hashPreciseCoords(lat: number, lng: number, tsIso: string): string {
  // Round to 5 dp (~1.1m), then hash with the timestamp. Output is auditable
  // (you could brute-force a small grid given the ts) but cannot be reversed
  // into a precise track.
  const rounded = `${lat.toFixed(5)},${lng.toFixed(5)},${tsIso}`;
  return createHash("sha256").update(rounded).digest("hex");
}

export function isSanctioned(country: string): boolean {
  return SANCTIONED.has(country.toUpperCase());
}

const PHONE_PREFIX_TO_COUNTRY = [
  ["+971", "AE"],
  ["+965", "KW"],
  ["+972", "IL"],
  ["+973", "BH"],
  ["+974", "QA"],
  ["+975", "BT"],
  ["+977", "NP"],
  ["+234", "NG"],
  ["+233", "GH"],
  ["+232", "SL"],
  ["+231", "LR"],
  ["+230", "MU"],
  ["+229", "BJ"],
  ["+228", "TG"],
  ["+227", "NE"],
  ["+226", "BF"],
  ["+225", "CI"],
  ["+224", "GN"],
  ["+223", "ML"],
  ["+221", "SN"],
  ["+220", "GM"],
  ["+216", "TN"],
  ["+212", "MA"],
  ["+211", "SS"],
  ["+20", "EG"],
  ["+65", "SG"],
  ["+44", "GB"],
  ["+33", "FR"],
  ["+49", "DE"],
  ["+39", "IT"],
  ["+34", "ES"],
  ["+1", "US"],
] as const;

export function countryFromE164(phone?: string | null) {
  if (!phone?.startsWith("+")) return undefined;
  const match = PHONE_PREFIX_TO_COUNTRY.find(([prefix]) => phone.startsWith(prefix));
  return match?.[1];
}
