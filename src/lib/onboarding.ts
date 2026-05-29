import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { hashToken, mintToken } from "./crypto";
import { invites, profiles, verifications, type Invite, type Profile } from "./schema";

export const VERIFICATION_STEPS = [
  "identity",
  "liveness",
  "location",
  "company",
  "screening",
] as const;

export type VerificationStep = (typeof VERIFICATION_STEPS)[number];
export type VerificationStatus = "pending" | "in_progress" | "passed" | "failed" | "review";

export type VerificationStatusMap = Record<VerificationStep, VerificationStatus>;

export interface VerificationSummary {
  stepStatus: VerificationStatusMap;
  completedCount: number;
  nextStep: VerificationStep | null;
  awaitingReview: boolean;
  identityOk: boolean;
  livenessOk: boolean;
  locationOk: boolean;
  companyOk: boolean;
  screeningOk: boolean;
}

export interface OnboardingState {
  invite: Invite;
  profile: Profile | null;
  summary: VerificationSummary;
  isLive: boolean;
  requiresAccess: boolean;
  boundToOtherUser: boolean;
}

function blankStatusMap(): VerificationStatusMap {
  return {
    identity: "pending",
    liveness: "pending",
    location: "pending",
    company: "pending",
    screening: "pending",
  };
}

export function summarizeVerificationRows(
  rows: Array<{ step: VerificationStep; status: VerificationStatus }>
): VerificationSummary {
  const stepStatus = blankStatusMap();
  for (const row of rows) stepStatus[row.step] = row.status;

  const completedCount = VERIFICATION_STEPS.filter((step) => stepStatus[step] === "passed").length;
  const awaitingReview = stepStatus.screening === "review";
  const nextStep = awaitingReview
    ? null
    : VERIFICATION_STEPS.find((step) => stepStatus[step] !== "passed") ?? null;

  return {
    stepStatus,
    completedCount,
    nextStep,
    awaitingReview,
    identityOk: stepStatus.identity === "passed",
    livenessOk: stepStatus.liveness === "passed",
    locationOk: stepStatus.location === "passed",
    companyOk: stepStatus.company === "passed",
    screeningOk: stepStatus.screening === "passed",
  };
}

export async function getVerificationSummary(profileId: string): Promise<VerificationSummary> {
  try {
    const rows = await db
      .select({ step: verifications.step, status: verifications.status })
      .from(verifications)
      .where(eq(verifications.profileId, profileId));
    return summarizeVerificationRows(rows);
  } catch (error) {
    console.warn("[onboarding] unable to load verification summary", error);
    return summarizeVerificationRows([]);
  }
}

export async function getOnboardingState(token: string, userId?: string | null): Promise<OnboardingState | null> {
  const [invite] = await db.select().from(invites).where(eq(invites.tokenHash, hashToken(token)));
  if (!invite || invite.expiresAt.getTime() < Date.now()) return null;

  const requiresAccess = !userId;
  const boundToOtherUser = !!userId && !!invite.consumedBy && invite.consumedBy !== userId;

  let profile: Profile | null = null;
  if (userId) {
    const [found] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    profile = found ?? null;
  }

  const summary = profile ? await getVerificationSummary(profile.id) : summarizeVerificationRows([]);
  return {
    invite,
    profile,
    summary,
    isLive: !!profile?.isLive,
    requiresAccess,
    boundToOtherUser,
  };
}

export function getOnboardingTargetPath(token: string, nextStep: VerificationStep | null, isLive = false) {
  if (isLive || nextStep === null) return `/verify/${token}/done`;
  return `/verify/${token}/${nextStep}`;
}

export async function getStepStatus(profileId: string, step: VerificationStep) {
  const [row] = await db
    .select()
    .from(verifications)
    .where(and(eq(verifications.profileId, profileId), eq(verifications.step, step)));
  return row ?? null;
}

export function credentialBadges(summary: VerificationSummary) {
  const badges: string[] = [];
  if (summary.identityOk) badges.push("Identity verified");
  if (summary.livenessOk) badges.push("Liveness verified");
  if (summary.locationOk) badges.push("Location cross-check");
  if (summary.companyOk) badges.push("Ownership resolved");
  if (summary.screeningOk) badges.push("Screening clear");
  if (summary.awaitingReview) badges.push("Compliance review");
  return badges.length ? badges : ["Onboarding in progress"];
}

export async function issueSelfOnboardingInvite(args: {
  userId: string;
  profileId?: string | null;
  context?: string;
}) {
  const token = mintToken();
  await db.insert(invites).values({
    tokenHash: hashToken(token),
    inviterProfileId: args.profileId ?? null,
    groupContext: args.context ?? "GreyBeard onboarding",
    inviteePhone: null,
    consumedBy: args.userId,
    consumedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  return token;
}
