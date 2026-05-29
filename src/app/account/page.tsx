import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAccessProfile, getRecentLedgerEvents } from "@/lib/local-access";
import { credentialBadges, getVerificationSummary } from "@/lib/onboarding";
import { IosFrame } from "@/components/IosFrame";
import { ProfileCard } from "@/components/ProfileCard";
import { Button } from "@/components/Button";

export default async function Account() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const profile = await getAccessProfile({
    id: session.user.id,
    name: session.user.name,
  });
  if (!profile.isLive && !profile.isFallback) redirect("/get-started");
  const events = await getRecentLedgerEvents(profile.id, 8);
  const summary = profile.isFallback ? null : await getVerificationSummary(profile.id);

  const initials = profile.displayName.split(/\s+/).map((s) => s[0]?.toUpperCase()).slice(0, 2).join("");

  return (
    <IosFrame>
      <div className="px-5 pt-3 pb-2 flex items-baseline justify-between text-[13px]">
        <Link href="/" className="text-[var(--color-ink-3)]">← Account</Link>
        <span className="mono text-[10px] uppercase tracking-wider text-[var(--color-signal)]">greybeard · live</span>
      </div>

      <div className="px-5">
        <ProfileCard
          initials={initials}
          name={profile.displayName}
          company={profile.company}
          handle={profile.handle}
          since={profile.createdAt.getFullYear()}
          tier={profile.tier}
          score={profile.score}
          dealsClosed={profile.dealsClosed}
          dealsDisputed={profile.dealsDisputed}
          credentials={summary ? credentialBadges(summary) : ["Local access mode"]}
        />

        {profile.isFallback && (
          <div className="mt-4 rounded-[12px] border border-[var(--color-line)] bg-[var(--color-paper)] p-4 text-[12px] text-[var(--color-ink-3)]">
            Local-access mode is active. Your browser session is working, but the backing database is unavailable, so profile history and deal data are temporarily limited.
          </div>
        )}

        <div className="mt-5 rounded-[12px] border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
          <div className="flex items-baseline justify-between">
            <span className="mono text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">Next tier · verified</span>
            <span className="mono text-[11px] text-[var(--color-ink-3)]">+90 pts</span>
          </div>
          <ul className="mt-3 space-y-2 text-[12px]">
            <li className="flex items-center gap-2 text-[var(--color-ink-3)]">
              <span className="text-[var(--color-signal)]">{summary?.identityOk ? "✓" : "○"}</span> Identity verified
            </li>
            <li className="flex items-center gap-2 text-[var(--color-ink-3)]">
              <span className="text-[var(--color-signal)]">{summary?.livenessOk ? "✓" : "○"}</span> Liveness verified
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[var(--color-ink)]">
                {summary?.companyOk ? "✓" : "○"} Company and ownership confirmed
              </span>
              <span className="mono text-[10px] text-[var(--color-ink-4)]">
                {summary?.companyOk ? "done" : "pending"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[var(--color-ink)]">
                {summary?.screeningOk ? "✓" : summary?.awaitingReview ? "!" : "○"} Screening and compliance
              </span>
              <span className="mono text-[10px] text-[var(--color-ink-4)]">
                {summary?.screeningOk ? "clear" : summary?.awaitingReview ? "review" : "pending"}
              </span>
            </li>
          </ul>
          <div className="mt-3 text-[10px] text-[var(--color-ink-4)]">
            Verified unlocks deal ceiling to $250k and multi-party deals.
          </div>
        </div>

        <h3 className="mono mt-6 text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">Recent activity</h3>
        <ul className="mt-3 space-y-2">
          {events.map((e) => (
            <li
              key={e.seq}
              className="flex items-center justify-between rounded-[10px] border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="mono text-[11px] text-[var(--color-ink)] truncate">{e.type}</div>
                <div className="mono text-[10px] text-[var(--color-ink-4)] truncate">
                  hash {e.hash.slice(0, 8)}…
                </div>
              </div>
              <span className="mono text-[10px] text-[var(--color-ink-4)] tabular-nums">
                {e.createdAt.toISOString().slice(11, 16)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 pb-6">
          <Link href="/dashboard"><Button variant="outline" className="w-full">See the desktop dashboard ↗</Button></Link>
        </div>
      </div>
    </IosFrame>
  );
}
