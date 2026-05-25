import { VMark } from "./VMark";

interface Props {
  initials: string;
  name: string;
  company?: string | null;
  handle: string;
  since: number;
  tier: "provisional" | "verified" | "charter";
  score: number;
  dealsClosed: number;
  dealsDisputed: number;
  credentials: string[];
}

export function ProfileCard(p: Props) {
  const pct = Math.min(100, Math.round((p.score / 1000) * 100));
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-bg-2)] text-sm font-semibold text-[var(--color-ink)]">
          {p.initials}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-[var(--color-ink)]">{p.name}</span>
            {p.tier !== "provisional" && <VMark />}
            {p.tier === "provisional" && <VMark label="provisional" />}
          </div>
          {p.company && <div className="text-[13px] text-[var(--color-ink-3)]">{p.company}</div>}
          <div className="mono mt-0.5 text-[11px] text-[var(--color-ink-4)]">
            {p.handle} · since {p.since}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--color-line)] pt-3 text-xs text-[var(--color-ink-3)]">
        <div>
          <div className="uppercase tracking-wide text-[10px]">Tier</div>
          <div className="mt-1 text-[var(--color-ink)] font-medium capitalize">{p.tier}</div>
          <div className="mt-1 h-1 w-full rounded-full bg-[var(--color-bg-2)]">
            <div className="h-1 rounded-full bg-[var(--color-signal)]" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div>
          <div className="uppercase tracking-wide text-[10px]">Score</div>
          <div className="mt-1 text-[var(--color-ink)] num font-medium">
            <span className="text-lg">{p.score}</span>
            <span className="mono ml-0.5 text-[var(--color-ink-4)]">/ 1000</span>
          </div>
        </div>
        <div>
          <div className="uppercase tracking-wide text-[10px]">Deals</div>
          <div className="mt-1 text-[var(--color-ink)] num font-medium">
            <span className="text-lg">{p.dealsClosed}</span>{" "}
            <span className="text-[10px] text-[var(--color-ink-4)]">{p.dealsDisputed} disputed</span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-[var(--color-line)] pt-3">
        <div className="text-[10px] uppercase tracking-wide text-[var(--color-ink-4)]">Credentials</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.credentials.map((c) => (
            <span
              key={c}
              className="rounded-full border border-[var(--color-line)] px-2 py-0.5 text-[11px] text-[var(--color-ink-3)]"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
