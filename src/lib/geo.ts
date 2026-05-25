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
