import { env } from "@/lib/env";

/** Loud visual marker so testers never confuse staging with prod. */
export function EnvBanner() {
  const e = env();
  if (e === "production") return null;
  const label = e === "staging" ? "STAGING — TEST DATA ONLY" : "DEV";
  return (
    <div
      role="status"
      aria-label={label}
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-[var(--color-warn)] py-1.5 text-[11px] font-medium uppercase tracking-wider text-white"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white" />
      {label}
    </div>
  );
}
