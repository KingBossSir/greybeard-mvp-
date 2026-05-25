import { IosFrame } from "@/components/IosFrame";
import { StepHeader } from "@/components/StepHeader";
import { Button } from "@/components/Button";
import { lookup } from "@/lib/registry";
import { submitCompany } from "@/lib/actions";

export default async function CompanyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const candidates = await lookup("NG");

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
          We pulled this from public registries. Pick the one that's you.
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
