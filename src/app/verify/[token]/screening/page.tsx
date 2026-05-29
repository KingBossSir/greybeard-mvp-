import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { IosFrame } from "@/components/IosFrame";
import { StepHeader } from "@/components/StepHeader";
import { Button } from "@/components/Button";
import { submitScreening } from "@/lib/actions";
import { getOnboardingState, getOnboardingTargetPath } from "@/lib/onboarding";

const LISTS = [
  ["OFAC SDN", "United States Treasury · 8,141 entries"],
  ["UN consolidated list", "United Nations · 1,022 entries"],
  ["EU sanctions", "European Union · 1,506 entries"],
  ["UK HMT", "United Kingdom Treasury · 2,704 entries"],
  ["PEP database", "Global · 1.4M entries"],
  ["Adverse media · 5y", "News, court records, regulatory actions"],
] as const;

export default async function ScreeningPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  const state = await getOnboardingState(token, session?.user?.id);
  if (!state) redirect("/");
  if (state.requiresAccess) redirect(`/signin?next=${encodeURIComponent(`/verify/${token}/screening`)}`);
  if (state.boundToOtherUser) redirect(`/verify/${token}`);
  if (state.summary.nextStep !== "screening") {
    redirect(getOnboardingTargetPath(token, state.summary.nextStep, state.isLive));
  }
  async function run() {
    "use server";
    await submitScreening(token);
  }

  return (
    <IosFrame>
      <StepHeader title="Screening" subtitle="Six lists, one screen" back={`/verify/${token}/company`} current={5} />
      <div className="px-5 pt-4 pb-6">
        <h2 className="text-[20px] font-semibold tracking-tight text-[var(--color-ink)]">Running checks across 6 lists</h2>
        <p className="mt-2 text-[12px] text-[var(--color-ink-3)]">
          We check you and your beneficial owners against international sanctions, PEP databases, and adverse media. If anything matches, a human reviews — never an algorithm alone.
        </p>
        <div className="mt-4 rounded-[10px] bg-[var(--color-bg-2)] p-3 text-[11px] text-[var(--color-ink-3)]">
          <b className="text-[var(--color-ink)]">Profile:</b> {state.profile?.displayName ?? "—"} · {state.profile?.company ?? "Signing personally"} · {state.profile?.country ?? "—"}
        </div>

        <ul className="mt-5 space-y-1">
          {LISTS.map(([name, desc]) => (
            <li key={name} className="flex items-center justify-between border-b border-[var(--color-line)] py-2.5">
              <div>
                <div className="text-[13px] text-[var(--color-ink)]">{name}</div>
                <div className="mono text-[10px] text-[var(--color-ink-4)]">{desc}</div>
              </div>
              <span className="mono text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">queued</span>
            </li>
          ))}
        </ul>

        <form action={run} className="mt-6 pb-8">
          <Button type="submit" className="w-full">Run screening</Button>
        </form>
      </div>
    </IosFrame>
  );
}
