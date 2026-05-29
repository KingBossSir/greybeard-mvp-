export const COUNTRY_OPTIONS = [
  ["AE", "United Arab Emirates"],
  ["CA", "Canada"],
  ["CI", "Cote d'Ivoire"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["GB", "United Kingdom"],
  ["GH", "Ghana"],
  ["NG", "Nigeria"],
  ["SG", "Singapore"],
  ["US", "United States"],
  ["ZA", "South Africa"],
] as const;

export function regionFromLocale(locale?: string | null) {
  if (!locale) return "";
  const region = locale.split("-")[1];
  return region?.toUpperCase() ?? "";
}
