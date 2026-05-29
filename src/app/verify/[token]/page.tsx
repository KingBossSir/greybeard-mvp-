import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOnboardingState, getOnboardingTargetPath } from "@/lib/onboarding";
import { IosFrame } from "@/components/IosFrame";
import { Button } from "@/components/Button";

export default async function Welcome({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  const state = await getOnboardingState(token, session?.user?.id);
  if (!state) notFound();

  if (state.boundToOtherUser) {
    redirect("/signin");
  }

  const ctaHref = state.requiresAccess
    ? `/signin?next=${encodeURIComponent(`/verify/${token}`)}`
    : getOnboardingTargetPath(token, state.summary.nextStep, state.isLive);
  const ctaLabel = state.requiresAccess
    ? "Create local access"
    : state.isLive
      ? "Open verified profile"
      : state.summary.completedCount > 0
        ? "Resume onboarding"
        : "Begin";

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
          {state.requiresAccess ? "Open your secure invite." : "Verify your identity."}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--color-ink-3)]">
          About four minutes. We only ask for what regulation requires. When you finish, you get a portable verified profile you can drop into any chat.
        </p>

        {state.invite.groupContext && (
          <div className="mt-4 rounded-[10px] border border-[var(--color-line)] bg-[var(--color-paper)] p-3">
            <div className="mono text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">Deal context</div>
            <div className="mt-1 text-[13px] text-[var(--color-ink)]">{state.invite.groupContext}</div>
          </div>
        )}

        <ol className="mt-6 space-y-3">
          {[
            ["01", "Identity", "Photo of your passport or national ID"],
            ["02", "Liveness", "A 15-second selfie video"],
            ["03", "Location", "GPS · IP · SIM must agree"],
            ["04", "Company & ownership", "Confirm who you sign for"],
            ["05", "Screening", "Sanctions, PEP, adverse-media checks"],
          ].map(([n, t, d], index) => {
            const step = ["identity", "liveness", "location", "company", "screening"][index]!;
            const status = state.summary.stepStatus[step as keyof typeof state.summary.stepStatus];
            return (
            <li key={n} className="flex items-start gap-3 border-b border-[var(--color-line)] pb-3 last:border-0">
              <span className="mono text-[11px] text-[var(--color-ink-4)] pt-0.5 w-6">{n}</span>
              <div>
                <div className="flex items-center gap-2 text-[14px] font-medium text-[var(--color-ink)]">
                  <span>{t}</span>
                  {!state.requiresAccess && status === "passed" && (
                    <span className="mono text-[10px] uppercase tracking-wider text-[var(--color-signal)]">done</span>
                  )}
                  {!state.requiresAccess && state.summary.nextStep === step && (
                    <span className="mono text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">next</span>
                  )}
                </div>
                <div className="text-[12px] text-[var(--color-ink-4)]">{d}</div>
              </div>
            </li>
          )})}
        </ol>

        <p className="mt-5 text-[11px] leading-relaxed text-[var(--color-ink-4)]">
          Your documents move to an encrypted vault you control. They never sit in this chat.
        </p>

        <div className="mt-6 pb-8">
          <Link href={ctaHref} className="block">
            <Button className="w-full">{ctaLabel}</Button>
          </Link>
          {state.requiresAccess && (
            <p className="mt-3 text-[12px] text-[var(--color-ink-4)]">
              This build uses browser-local access instead of email magic links, so you can start the invite immediately without Resend.
            </p>
          )}
        </div>
      </div>
    </IosFrame>
  );
}
