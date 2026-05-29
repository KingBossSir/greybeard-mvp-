import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { IosFrame } from "@/components/IosFrame";
import { StepHeader } from "@/components/StepHeader";
import { Button } from "@/components/Button";
import { lookup } from "@/lib/registry";
import { submitCompany } from "@/lib/actions";
import { getOnboardingState, getOnboardingTargetPath } from "@/lib/onboarding";

export default async function CompanyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  const state = await getOnboardingState(token, session?.user?.id);
  if (!state) redirect("/");
  if (state.requiresAccess) redirect(`/signin?next=${encodeURIComponent(`/verify/${token}/company`)}`);
  if (state.boundToOtherUser) redirect(`/verify/${token}`);
  if (state.summary.nextStep !== "company") {
    redirect(getOnboardingTargetPath(token, state.summary.nextStep, state.isLive));
  }

  const candidates = await lookup(state.profile?.country ?? "NG");

  async function action(formData: FormData) {
    "use server";
    await submitCompany(token, formData);
  }

  return (
    <IosFrame>
      <StepHeader title="Company & ownership" subtitle="Pre-filled from public registries" back={`/verify/${token}/location`} current={4} />
      <div className="px-5 pt-4 pb-6">
        <h2 className="text-[20px] font-semibold tracking-tight text-[var(--color-ink)]">Who are you signing for?</h2>
        <p className="mt-2 text-[12px] text-[var(--color-ink-3)]">
          We pulled these from the registry for {state.profile?.country ?? "your region"}. Pick the right entity, or enter one manually if it is not listed yet.
        </p>

        <form action={action} className="mt-5 space-y-2">
          {candidates.map((c, i) => (
            <label
              key={c.registryId}
              className="flex items-start gap-3 rounded-[10px] border border-[var(--color-line-strong)] bg-[var(--color-paper)] p-3 cursor-pointer has-[:checked]:border-[var(--color-ink)] has-[:checked]:bg-[var(--color-bg-2)]"
            >
              <input
                type="radio"
                name="registryId"
                value={c.registryId}
                defaultChecked={i === 0}
                className="mt-0.5 accent-[var(--color-ink)]"
              />
              <div className="flex-1">
                <div className="text-[14px] font-medium text-[var(--color-ink)]">{c.name}</div>
                <div className="mono text-[10px] text-[var(--color-ink-4)] mt-0.5">
                  {c.registryId} · {c.city} · {c.incorporatedYear} · {c.directors} directors
                </div>
              </div>
            </label>
          ))}
          <div className="rounded-[10px] border border-[var(--color-line)] bg-[var(--color-paper)] p-3">
            <label className="block text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-4)]">
              Manual company name
            </label>
            <input
              type="text"
              name="companyName"
              placeholder="Enter the legal entity if it's not listed"
              className="mt-2 w-full rounded-[10px] border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-3 py-2.5 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
            />
          </div>
          <label className="flex items-start gap-3 rounded-[10px] border border-[var(--color-line)] bg-[var(--color-paper)] p-3 cursor-pointer has-[:checked]:border-[var(--color-ink)]">
            <input type="checkbox" name="signingPersonally" className="mt-0.5 accent-[var(--color-ink)]" />
            <div>
              <div className="text-[14px] font-medium text-[var(--color-ink)]">None of these — I'm signing personally</div>
              <div className="text-[11px] text-[var(--color-ink-4)] mt-0.5">Lower deal ceiling applies</div>
            </div>
          </label>

          <div className="pt-4 pb-6">
            <Button type="submit" className="w-full">Continue</Button>
          </div>
        </form>
      </div>
    </IosFrame>
  );
}
