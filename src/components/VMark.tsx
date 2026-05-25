export function VMark({ label = "verified" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-signal)]">
      <span
        className="block h-1.5 w-1.5 rounded-full bg-[var(--color-signal)]"
        style={{ boxShadow: "0 0 0 3px var(--color-signal-soft)" }}
      />
      {label}
    </span>
  );
}
