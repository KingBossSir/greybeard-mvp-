import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ledgerEvents, profiles } from "@/lib/schema";
import { verifyChain } from "@/lib/ledger";

export default async function AuditLog() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.user.id));
  if (!profile) redirect("/");

  const events = await db
    .select()
    .from(ledgerEvents)
    .where(eq(ledgerEvents.profileId, profile.id))
    .orderBy(asc(ledgerEvents.seq));

  const chain = await verifyChain(profile.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-[13px] text-[var(--color-ink-3)]">← Dashboard</Link>
        <span
          className={`mono text-[11px] uppercase tracking-wider ${
            chain.ok ? "text-[var(--color-signal)]" : "text-[var(--color-warn)]"
          }`}
        >
          chain {chain.ok ? "verified" : `broken @ ${chain.brokenAt}`}
        </span>
      </div>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Audit ledger</h1>
      <p className="mt-2 text-[13px] text-[var(--color-ink-3)]">
        Every event below is signed with ed25519 and chained to the previous hash. Exportable from your authenticated ledger endpoint for auditor review.
      </p>

      <table className="mono mt-6 w-full text-[11px]">
        <thead className="text-left text-[var(--color-ink-4)] uppercase tracking-wider">
          <tr>
            <th className="py-2 w-12">#</th>
            <th>type</th>
            <th>hash</th>
            <th>prev</th>
            <th className="text-right">ts</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.seq} className="border-t border-[var(--color-line)]">
              <td className="py-2 text-[var(--color-ink-4)]">{e.seq}</td>
              <td className="text-[var(--color-ink)]">{e.type}</td>
              <td className="text-[var(--color-ink-3)]">{e.hash.slice(0, 14)}…</td>
              <td className="text-[var(--color-ink-4)]">{e.prevHash.slice(0, 8)}…</td>
              <td className="text-right text-[var(--color-ink-4)]">{e.createdAt.toISOString().replace("T", " ").slice(0, 19)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
