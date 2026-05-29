import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAccessProfile } from "@/lib/local-access";

export default async function Deals() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const profile = await getAccessProfile({
    id: session.user.id,
    name: session.user.name,
  });
  if (!profile.isLive && !profile.isFallback) redirect("/get-started");
  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Link href="/dashboard" className="text-[13px] text-[var(--color-ink-3)]">← Dashboard</Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Deals</h1>
      <p className="mt-2 text-[13px] text-[var(--color-ink-3)]">No deals yet. Drop your card into a group with <span className="mono">/flash</span> to get going.</p>
    </main>
  );
}
