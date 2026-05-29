import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAccessProfile } from "@/lib/local-access";
import { issueSelfOnboardingInvite } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default async function GetStarted() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin?next=/get-started");

  const profile = await getAccessProfile({
    id: session.user.id,
    name: session.user.name,
  });

  if (profile.isFallback || profile.isLive) {
    redirect("/account");
  }

  const token = await issueSelfOnboardingInvite({
    userId: session.user.id,
    profileId: profile.id,
    context: "GreyBeard self-onboarding",
  });

  redirect(`/verify/${token}`);
}
