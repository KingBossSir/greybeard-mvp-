import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOnboardingState, getOnboardingTargetPath } from "@/lib/onboarding";
import { IosFrame } from "@/components/IosFrame";
import { StepHeader } from "@/components/StepHeader";
import { LocationCapture } from "@/components/onboarding/LocationCapture";

export default async function LocationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  const state = await getOnboardingState(token, session?.user?.id);
  if (!state) redirect("/");
  if (state.requiresAccess) redirect(`/signin?next=${encodeURIComponent(`/verify/${token}/location`)}`);
  if (state.boundToOtherUser) redirect(`/verify/${token}`);
  if (state.summary.nextStep !== "location") {
    redirect(getOnboardingTargetPath(token, state.summary.nextStep, state.isLive));
  }

  return (
    <IosFrame>
      <StepHeader title="Location" subtitle="Live GPS cross-check" back={`/verify/${token}/liveness`} current={3} />
      <LocationCapture token={token} />
    </IosFrame>
  );
}
