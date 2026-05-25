import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/schema";
import { ProfileCard } from "@/components/ProfileCard";

/**
 * Public verification card landing — the URL that drops into chats via /flash.
 * No PII beyond what's already in the card. Re-renders the server-signed view
 * so a forwarded screenshot can be confirmed by tap-through.
 */
export default async function Card({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
  if (!profile || !profile.isLive) notFound();

  const initials = profile.displayName.split(/\s+/).map((s) => s[0]?.toUpperCase()).slice(0, 2).join("");

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-8 w-8 rounded-[10px] bg-[var(--color-ink)] flex items-center justify-center text-white font-medium">g</div>
        <span className="text-[14px] font-medium tracking-tight">greybeard</span>
        <span className="mono ml-2 text-[10px] uppercase tracking-wider text-[var(--color-signal)]">verified card</span>
      </div>

      <ProfileCard
        initials={initials}
        name={profile.displayName}
        company={profile.company}
        handle={profile.handle}
        since={profile.liveAt?.getFullYear() ?? 2026}
        tier={profile.tier}
        score={profile.score}
        dealsClosed={profile.dealsClosed}
        dealsDisputed={profile.dealsDisputed}
        credentials={["KYC complete", "BO resolved"]}
      />

      <p className="mono mt-4 text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">
        Server-signed view · {new Date().toISOString().slice(0, 10)}
      </p>
    </main>
  );
}
