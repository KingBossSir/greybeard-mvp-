import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOnboardingState, getOnboardingTargetPath } from "@/lib/onboarding";
import { IosFrame } from "@/components/IosFrame";
import { StepHeader } from "@/components/StepHeader";
import { IdentityCapture } from "@/components/onboarding/IdentityCapture";

export default async function IdentityPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  const state = await getOnboardingState(token, session?.user?.id);
  if (!state) redirect("/");
  if (state.requiresAccess) redirect(`/signin?next=${encodeURIComponent(`/verify/${token}/identity`)}`);
  if (state.boundToOtherUser) redirect(`/verify/${token}`);
  if (state.summary.nextStep !== "identity") {
    redirect(getOnboardingTargetPath(token, state.summary.nextStep, state.isLive));
  }

  return (
    <IosFrame>
      <StepHeader title="Identity" subtitle="Capture a real document" back={`/verify/${token}`} current={1} />
      <IdentityCapture token={token} />
    </IosFrame>
  );
}
