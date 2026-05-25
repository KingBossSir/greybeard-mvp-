import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-[10px] bg-[var(--color-ink)] flex items-center justify-center text-white font-medium">g</div>
        <span className="text-[15px] font-medium tracking-tight">greybeard</span>
        <span className="mono ml-3 text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">
          / MVP · beta
        </span>
      </div>

      <p className="mono mt-12 text-[11px] uppercase tracking-wider text-[var(--color-ink-4)]">
        verify once · flash anywhere
      </p>
      <h1 className="mt-3 text-5xl md:text-6xl font-semibold leading-[1.05] tracking-tight">
        The deal already happens in the chat.{" "}
        <span className="text-[var(--color-ink-4)]">GreyBeard verifies who you're dealing with.</span>
      </h1>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-6 border-t border-[var(--color-line)] pt-8">
        {[
          ["WEDGE", "Verified ID, portable into any chat."],
          ["CHANNEL", "WhatsApp first. Telegram + SMS hot-standby by day 90."],
          ["COST", "Free for invitees. Inviter pays the platform fee."],
          ["MVP TARGET", "50 verified IDs · 10 closed deals · 90 days."],
        ].map(([h, b]) => (
          <div key={h}>
            <div className="mono text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">{h}</div>
            <div className="mt-2 text-[13px] text-[var(--color-ink-2)]">{b}</div>
          </div>
        ))}
      </div>

      <div className="mt-12 flex gap-3">
        <Link
          href="/signin"
          className="rounded-[var(--radius-sm)] bg-[var(--color-ink)] px-5 py-3 text-sm font-medium text-white"
        >
          Sign in
        </Link>
        <Link
          href="/dashboard"
          className="rounded-[var(--radius-sm)] border border-[var(--color-line-strong)] px-5 py-3 text-sm font-medium text-[var(--color-ink)]"
        >
          Dashboard
        </Link>
      </div>

      <p className="mono mt-16 text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">
        14 scenes · 3 phases · shipped + stubbed
      </p>
    </main>
  );
}
