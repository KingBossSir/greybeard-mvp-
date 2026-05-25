import Link from "next/link";

interface Props {
  title: string;
  subtitle: string;
  back: string;
  current: 1 | 2 | 3 | 4 | 5;
}

export function StepHeader({ title, subtitle, back, current }: Props) {
  const pct = (current / 5) * 100;
  return (
    <div className="px-5 pt-3 pb-4">
      <div className="flex items-baseline justify-between text-[13px]">
        <Link href={back} className="text-[var(--color-ink-3)] hover:text-[var(--color-ink)]">
          ← {title}
        </Link>
        <span className="mono text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">
          step {current} of 5
        </span>
      </div>
      <div className="text-[12px] text-[var(--color-ink-4)] mt-0.5">{subtitle}</div>
      <div className="mt-3 h-[2px] w-full overflow-hidden rounded-full bg-[var(--color-bg-2)]">
        <div className="h-[2px] bg-[var(--color-signal)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
