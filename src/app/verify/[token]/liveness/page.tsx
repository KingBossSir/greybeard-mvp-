import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOnboardingState, getOnboardingTargetPath } from "@/lib/onboarding";
import { IosFrame } from "@/components/IosFrame";
import { StepHeader } from "@/components/StepHeader";
import { LivenessCapture } from "@/components/onboarding/LivenessCapture";

export default async function LivenessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  const state = await getOnboardingState(token, session?.user?.id);
  if (!state) redirect("/");
  if (state.requiresAccess) redirect(`/signin?next=${encodeURIComponent(`/verify/${token}/liveness`)}`);
  if (state.boundToOtherUser) redirect(`/verify/${token}`);
  if (state.summary.nextStep !== "liveness") {
    redirect(getOnboardingTargetPath(token, state.summary.nextStep, state.isLive));
  }

  return (
    <IosFrame>
      <StepHeader title="Liveness" subtitle="Live camera capture" back={`/verify/${token}/identity`} current={2} />
      <LivenessCapture token={token} />
    </IosFrame>
  );
}
