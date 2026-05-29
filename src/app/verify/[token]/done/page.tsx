import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invites, profiles } from "@/lib/schema";
import { hashToken } from "@/lib/crypto";
import { credentialBadges, getVerificationSummary } from "@/lib/onboarding";
import { IosFrame } from "@/components/IosFrame";
import { ProfileCard } from "@/components/ProfileCard";
import { Button } from "@/components/Button";

export default async function DonePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ review?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const [inv] = await db.select().from(invites).where(eq(invites.tokenHash, hashToken(token)));
  if (!inv?.consumedBy) redirect("/");

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, inv.consumedBy));
  if (!profile) redirect("/");
  const summary = await getVerificationSummary(profile.id);

  const initials = profile.displayName.split(/\s+/).map((s) => s[0]?.toUpperCase()).slice(0, 2).join("");

  return (
    <IosFrame>
      <div className="px-5 pt-3 pb-2">
        <div className="flex items-baseline justify-between text-[13px]">
          <Link href="/" className="text-[var(--color-ink-3)]">← Your greybeard profile</Link>
          <span className="mono text-[10px] uppercase tracking-wider text-[var(--color-signal)]">live</span>
        </div>
      </div>

      <div className="px-5">
        {sp.review && (
          <div className="mb-4 rounded-[10px] border border-[var(--color-warn)] bg-[var(--color-warn-soft)] p-3 text-[12px] text-[var(--color-ink-2)]">
            One or more screening lists returned a possible match. A compliance officer is reviewing — you'll hear back within 24h.
          </div>
        )}

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
          credentials={credentialBadges(summary)}
        />

        <h3 className="mono mt-6 text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">How to use it</h3>
        <ol className="mt-3 space-y-3">
          {[
            ["01", "Drop your card into any chat", "Type /flash in any deal group with greybeard present."],
            ["02", "Ask the bot to verify someone", "Type /verify @them to invite a counterparty."],
            ["03", "Draft, escrow, ledger", "Slash commands handle contracts, escrow setup, and the audit hash. We don't speak until you ask."],
          ].map(([n, t, d]) => (
            <li key={n} className="flex items-start gap-3">
              <span className="mono text-[11px] text-[var(--color-ink-4)] pt-0.5 w-6">{n}</span>
              <div>
                <div className="text-[13px] font-medium text-[var(--color-ink)]">{t}</div>
                <div className="text-[11px] text-[var(--color-ink-4)]">{d}</div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 pb-6 grid grid-cols-2 gap-2">
          <Link href="/account"><Button variant="outline" className="w-full">Account</Button></Link>
          <Link href={`/card/${profile.id}`}><Button className="w-full">View card</Button></Link>
        </div>
      </div>
    </IosFrame>
  );
}
