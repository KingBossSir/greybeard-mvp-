import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { getAccessProfile } from "@/lib/local-access";
import { Button } from "@/components/Button";
import { getLedgerPubkeyHex } from "@/lib/ledger";

export default async function Settings() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const profile = await getAccessProfile({
    id: session.user.id,
    name: session.user.name,
  });
  const pubkey = await getLedgerPubkeyHex();

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/dashboard" className="text-[13px] text-[var(--color-ink-3)]">← Dashboard</Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Settings</h1>

      <section className="mt-6 rounded-[14px] border border-[var(--color-line)] bg-[var(--color-paper)] p-5">
        <h2 className="text-[14px] font-medium">Account</h2>
        <dl className="mono mt-3 text-[12px] grid grid-cols-[140px_1fr] gap-y-2">
          <dt className="text-[var(--color-ink-4)]">name</dt><dd>{session.user.name ?? "—"}</dd>
          <dt className="text-[var(--color-ink-4)]">access</dt><dd>{profile.isFallback ? "local browser session (fallback mode)" : "local browser session"}</dd>
          <dt className="text-[var(--color-ink-4)]">handle</dt><dd>{profile?.handle ?? "—"}</dd>
          <dt className="text-[var(--color-ink-4)]">tier</dt><dd>{profile?.tier}</dd>
        </dl>
      </section>

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
