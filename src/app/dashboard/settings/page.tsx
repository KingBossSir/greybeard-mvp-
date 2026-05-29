import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { getAccessProfile } from "@/lib/local-access";
import { Button } from "@/components/Button";
import { getLedgerPubkeyHex } from "@/lib/ledger";
import { updateProfileSettings } from "@/lib/actions";
import { COUNTRY_OPTIONS } from "@/lib/countries";

export default async function Settings({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const sp = await searchParams;
  const profile = await getAccessProfile({
    id: session.user.id,
    name: session.user.name,
  });
  if (!profile.isLive && !profile.isFallback) redirect("/get-started");
  const pubkey = await getLedgerPubkeyHex();

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/dashboard" className="text-[13px] text-[var(--color-ink-3)]">← Dashboard</Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Settings</h1>

      {sp.saved && (
        <div className="mt-4 rounded-[12px] border border-[var(--color-line)] bg-[var(--color-bg-2)] px-4 py-3 text-[12px] text-[var(--color-ink-3)]">
          Profile details updated.
        </div>
      )}

      <form action={updateProfileSettings} className="mt-6 rounded-[14px] border border-[var(--color-line)] bg-[var(--color-paper)] p-5">
        <h2 className="text-[14px] font-medium">Account</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-4)]">Display name</label>
            <input
              name="displayName"
              defaultValue={profile.displayName}
              className="mt-2 w-full rounded-[10px] border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-3 py-2.5 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-4)]">Company</label>
            <input
              name="company"
              defaultValue={profile.company ?? ""}
              className="mt-2 w-full rounded-[10px] border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-3 py-2.5 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-4)]">Country</label>
            <select
              name="country"
              defaultValue={profile.country ?? ""}
              className="mt-2 w-full rounded-[10px] border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-3 py-2.5 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
            >
              <option value="">Select country</option>
              {COUNTRY_OPTIONS.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <dl className="mono mt-3 text-[12px] grid grid-cols-[140px_1fr] gap-y-2">
          <dt className="text-[var(--color-ink-4)]">access</dt><dd>{profile.isFallback ? "local browser session (fallback mode)" : "local browser session"}</dd>
          <dt className="text-[var(--color-ink-4)]">handle</dt><dd>{profile?.handle ?? "—"}</dd>
          <dt className="text-[var(--color-ink-4)]">tier</dt><dd>{profile?.tier}</dd>
        </dl>
        <div className="mt-5">
          <Button type="submit">Save profile</Button>
        </div>
      </form>

      <section className="mt-6 rounded-[14px] border border-[var(--color-line)] bg-[var(--color-paper)] p-5">
        <h2 className="text-[14px] font-medium">Ledger public key</h2>
        <p className="mt-1 text-[12px] text-[var(--color-ink-3)]">
          Auditors use this key to verify your event chain.
        </p>
        <code className="mono mt-3 block break-all rounded-[8px] bg-[var(--color-bg-2)] p-3 text-[11px]">{pubkey}</code>
      </section>

      <form action={logout} className="mt-6">
        <Button variant="outline">Clear local access</Button>
      </form>
    </main>
  );
}
