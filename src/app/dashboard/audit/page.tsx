import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAccessProfile, getAuditLedgerEvents } from "@/lib/local-access";
import { verifyChain } from "@/lib/ledger";

export default async function AuditLog() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const profile = await getAccessProfile({
    id: session.user.id,
    name: session.user.name,
  });
  if (!profile.isLive && !profile.isFallback) redirect("/get-started");
  const events = await getAuditLedgerEvents(profile.id);
  const chain = profile.isFallback ? null : await verifyChain(profile.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-[13px] text-[var(--color-ink-3)]">← Dashboard</Link>
        <span
          className={`mono text-[11px] uppercase tracking-wider ${
            !chain || chain.ok ? "text-[var(--color-signal)]" : "text-[var(--color-warn)]"
          }`}
        >
          {chain ? `chain ${chain.ok ? "verified" : `broken @ ${chain.brokenAt}`}` : "local mode"}
        </span>
      </div>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Audit ledger</h1>
      <p className="mt-2 text-[13px] text-[var(--color-ink-3)]">
        Every event below is signed with ed25519 and chained to the previous hash. Exportable from your authenticated ledger endpoint for auditor review.
      </p>
      {profile.isFallback && (
        <p className="mt-3 text-[12px] text-[var(--color-ink-4)]">
          The database is currently unavailable, so audit events cannot be loaded for this browser-only session yet.
        </p>
      )}

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
