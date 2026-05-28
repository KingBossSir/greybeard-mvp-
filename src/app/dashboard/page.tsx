import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAccessProfile, getRecentLedgerEvents } from "@/lib/local-access";
import { computeScore } from "@/lib/score";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const profile = await getAccessProfile({
    id: session.user.id,
    name: session.user.name,
  });
  const events = await getRecentLedgerEvents(profile.id, 20);

  const sc = computeScore({
    kycComplete: true,
    bankLinked: true,
    livenessOk: true,
    vouchesReceived: [{ weight: "charter" }],
    dealsClosedDisputeFree: profile.dealsClosed,
    counterpartyCountries: 0,
    daysOnPlatform: 1,
    daysSinceLastEvent: 0,
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="flex items-center justify-between border-b border-[var(--color-line)] pb-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-[10px] bg-[var(--color-ink)] flex items-center justify-center text-white font-medium">g</div>
            <span className="text-[14px] font-medium tracking-tight">greybeard</span>
          </div>
          <nav className="flex gap-4 text-[13px] text-[var(--color-ink-3)]">
            <Link href="/dashboard" className="text-[var(--color-ink)] font-medium">Overview</Link>
            <Link href="/dashboard/deals">Deals</Link>
            <Link href="/dashboard/counterparties">Counterparties</Link>
            <Link href="/dashboard/audit">Audit log</Link>
            <Link href="/dashboard/settings">Settings</Link>
          </nav>
        </div>
        <div className="mono text-[11px] text-[var(--color-ink-4)]">{profile.handle}</div>
      </header>

      <section className="mt-8 flex items-start justify-between gap-8">
        <div>
          <p className="mono text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">Verified profile</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight flex items-center gap-3">
            {profile.displayName}
            <span className="mono inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-signal)]">
              <span className="h-2 w-2 rounded-full bg-[var(--color-signal)]" /> {profile.tier}
            </span>
          </h1>
          <p className="mt-1 text-[14px] text-[var(--color-ink-3)]">
            {profile.company ?? "—"} · {profile.country ?? "—"} · since {profile.liveAt?.getFullYear() ?? 2026}
          </p>
          {profile.isFallback && (
            <p className="mt-3 max-w-xl text-[12px] text-[var(--color-ink-4)]">
              Running in local-access mode. Session access is working, but database-backed profile data is temporarily unavailable.
            </p>
          )}
        </div>

        <div className="w-[280px] rounded-[14px] border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
          <div className="flex items-baseline justify-between">
            <span className="mono text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">Trust score</span>
            <span className="mono text-[10px] text-[var(--color-ink-4)]">0 — 1000</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-5xl font-semibold tabular-nums">{profile.score}</span>
            <span className="text-[12px] text-[var(--color-ink-4)]">· Greybeard</span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--color-bg-2)]">
            <div className="h-1.5 rounded-full bg-[var(--color-signal)]" style={{ width: `${(profile.score / 1000) * 100}%` }} />
          </div>
          <div className="mono mt-2 flex justify-between text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">
            <span>Provisional</span><span>Verified</span><span>Charter</span>
          </div>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-5 gap-4 border-t border-b border-[var(--color-line)] py-5">
        {[
          ["Deals closed", profile.dealsClosed.toString(), `${profile.dealsDisputed} disputed`],
          ["Counterparties", "—", ""],
          ["ESG-tagged", "—", ""],
          ["Vouches given", "0", "cap 3 / quarter"],
          ["Vouches received", "—", ""],
        ].map(([h, v, sub]) => (
          <div key={h}>
            <div className="mono text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">{h}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{v}</div>
            {sub && <div className="text-[11px] text-[var(--color-ink-4)] mt-0.5">{sub}</div>}
          </div>
        ))}
      </section>

      <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <div className="mono text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">Score composition</div>
          <h2 className="mt-1 text-[20px] font-semibold tracking-tight">What's driving your {sc.total}.</h2>
          <ul className="mt-4 space-y-3">
            {Object.entries(sc.breakdown).map(([name, pts]) => (
              <li key={name} className="border-b border-[var(--color-line)] pb-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] text-[var(--color-ink-2)]">{name}</span>
                  <span className="mono text-[12px] text-[var(--color-signal)]">
                    {pts > 0 ? `+${pts}` : pts === 0 ? "—" : pts}
                  </span>
                </div>
                <div className="mt-1 h-1 w-full bg-[var(--color-bg-2)] rounded-full">
                  <div
                    className="h-1 rounded-full bg-[var(--color-signal)]"
                    style={{ width: `${Math.max(0, Math.min(100, (pts / 350) * 100))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="mono text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">Audit ledger</div>
              <h2 className="mt-1 text-[20px] font-semibold tracking-tight">Append-only · signed events.</h2>
            </div>
            <Link href={`/api/ledger/${profile.id}`} className="rounded-[var(--radius-sm)] border border-[var(--color-line-strong)] px-3 py-1.5 text-[12px]">
              Export
            </Link>
          </div>

          <div className="mt-4 max-h-[480px] overflow-y-auto pr-2 space-y-2">
            {events.map((e) => (
              <div key={e.seq} className="border-b border-[var(--color-line)] pb-2">
                <div className="flex items-baseline justify-between">
                  <span className="mono text-[11px] text-[var(--color-ink-3)]">
                    {e.createdAt.toISOString().slice(11, 19)}
                  </span>
                  <span className="mono text-[10px] text-[var(--color-ink-4)]">
                    hash {e.hash.slice(0, 8)}…
                  </span>
                </div>
                <div className="mono text-[12px] text-[var(--color-ink)] mt-0.5">{e.type}</div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[10px] text-[var(--color-ink-4)]">
            Each event ed25519-signed and chained to the previous hash. Recomputable by any auditor with your public key.
          </p>
        </div>
      </section>
    </main>
  );
}
