import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invites } from "@/lib/schema";
import { hashToken } from "@/lib/crypto";
import { IosFrame } from "@/components/IosFrame";
import { Button } from "@/components/Button";

export default async function Welcome({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [inv] = await db.select().from(invites).where(eq(invites.tokenHash, hashToken(token)));
  if (!inv || inv.expiresAt.getTime() < Date.now()) notFound();

  return (
    <IosFrame>
      <div className="px-5 pt-3 pb-4">
        <div className="flex items-baseline justify-between text-[13px]">
          <Link href="/" className="text-[var(--color-ink-3)]">← greybeard</Link>
          <span className="mono text-[10px] uppercase tracking-wider text-[var(--color-signal)]">SECURE</span>
        </div>
      </div>

      <div className="px-5">
        <div className="h-9 w-9 rounded-[10px] bg-[var(--color-ink)] flex items-center justify-center text-white font-medium">g</div>
        <h1 className="mt-4 text-[26px] font-semibold leading-[1.15] tracking-tight text-[var(--color-ink)]">
          Hi. Verify your identity.
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-ink-3)]">
          About four minutes. We'll only ask for what regulation requires. When we're done you'll have a portable verified profile you can drop into any chat.
        </p>

        <ol className="mt-6 space-y-3">
          {[
            ["01", "Identity", "Photo of your passport or national ID"],
            ["02", "Liveness", "A 15-second selfie video"],
            ["03", "Location", "GPS · IP · SIM must agree"],
            ["04", "Company & ownership", "Confirm who you sign for"],
            ["05", "Screening", "Sanctions, PEP, adverse-media checks"],
          ].map(([n, t, d]) => (
            <li key={n} className="flex items-start gap-3 border-b border-[var(--color-line)] pb-3 last:border-0">
              <span className="mono text-[11px] text-[var(--color-ink-4)] pt-0.5 w-6">{n}</span>
              <div>
                <div className="text-[14px] font-medium text-[var(--color-ink)]">{t}</div>
                <div className="text-[12px] text-[var(--color-ink-4)]">{d}</div>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-5 text-[11px] leading-relaxed text-[var(--color-ink-4)]">
          Your documents move to an encrypted vault you control. They never sit in this chat.
        </p>

        <div className="mt-6 pb-8">
          <Link href={`/verify/${token}/identity`} className="block">
            <Button className="w-full">Begin</Button>
          </Link>
        </div>
      </div>
    </IosFrame>
  );
}
