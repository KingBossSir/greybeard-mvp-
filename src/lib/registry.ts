/**
 * Public company registry lookup.
 *
 * Production: OpenCorporates, country-specific feeds (Companies House UK,
 *             CAC Nigeria, etc.), or a vendor like Sayari.
 * MVP: hard-coded fixtures so the company-select screen is populated.
 */

export interface CompanyHit {
  registryId: string;       // e.g. "RC 1148229"
  name: string;
  country: string;          // alpha-2
  city?: string;
  incorporatedYear?: number;
  directors: number;
}

const FIXTURES: Record<string, CompanyHit[]> = {
  NG: [
    { registryId: "RC 1148229", name: "Sahel Cocoa Partners Ltd", country: "NG", city: "Lagos", incorporatedYear: 2019, directors: 2 },
    { registryId: "RC 982440",  name: "Okafor Holdings Limited",  country: "NG", city: "Lagos", incorporatedYear: 2016, directors: 1 },
  ],
  GH: [
    { registryId: "CS 048-2021", name: "Tema Coastal Trading", country: "GH", city: "Tema", incorporatedYear: 2021, directors: 3 },
  ],
  AE: [
    { registryId: "FZE-44102", name: "Crescent Foods FZE", country: "AE", city: "Dubai", incorporatedYear: 2020, directors: 2 },
  ],
};

export async function lookup(country: string): Promise<CompanyHit[]> {
  return FIXTURES[country.toUpperCase()] ?? [];
}

/**
 * Beneficial-owner resolution. Deep traces (e.g. Mauritius holdco layers)
 * run asynchronously — MVP returns a synthetic single-layer result. The PDF
 * notes the deep trace can take 4–24h and that the user keeps moving while
 * it completes.
 */
export interface BoNode {
  name: string;
  pct: number;
  country: string;
  type: "individual" | "company";
}

export async function resolveBeneficialOwners(registryId: string): Promise<BoNode[]> {
  // Deterministic, fixture-driven.
  if (registryId.endsWith("9")) {
    return [{ name: "A. Okafor", pct: 60, country: "NG", type: "individual" }];
  }
  return [{ name: "Holding Co.", pct: 100, country: "MU", type: "company" }];
}
