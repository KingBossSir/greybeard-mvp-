import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Counterparties() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Link href="/dashboard" className="text-[13px] text-[var(--color-ink-3)]">← Dashboard</Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Counterparties</h1>
      <p className="mt-2 text-[13px] text-[var(--color-ink-3)]">No counterparties yet.</p>
    </main>
  );
}
