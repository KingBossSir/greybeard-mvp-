"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { invites, profiles, verifications } from "./schema";
import {
  IdentitySubmitSchema,
  LivenessSubmitSchema,
  LocationSubmitSchema,
  CompanySubmitSchema,
} from "./validators";
import { hashToken } from "./crypto";
import { verifyIdentity, verifyLiveness } from "./kyc";
import { crossCheck, isSanctioned } from "./geo";
import { screen } from "./screening";
import { resolveBeneficialOwners } from "./registry";
import { storeDocument } from "./vault";
import { appendEvent } from "./ledger";
import { auth } from "./auth";
import { limiters, clientIp } from "./ratelimit";
import { computeScore } from "./score";

type VerificationStep = "identity" | "liveness" | "location" | "company" | "screening";

async function requireProfile(token: string) {
  // Resolve invite → ensure session user matches consumedBy (or claim now).
  const [inv] = await db.select().from(invites).where(eq(invites.tokenHash, hashToken(token)));
  if (!inv) throw new Error("invalid token");
  if (inv.expiresAt.getTime() < Date.now()) throw new Error("token expired");

  const session = await auth();
  if (!session?.user?.id) throw new Error("not authenticated");

  // Bind the invite to this user on first use.
  if (!inv.consumedBy) {
    await db.update(invites).set({ consumedBy: session.user.id, consumedAt: new Date() }).where(eq(invites.id, inv.id));
  } else if (inv.consumedBy !== session.user.id) {
    throw new Error("token bound to different user");
  }

  // Ensure profile exists for this user.
  let [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.user.id));
  if (!profile) {
    const handle = `gb_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const inserted = await db
      .insert(profiles)
      .values({
        userId: session.user.id,
        handle,
        displayName: session.user.name ?? "Pending",
      })
      .returning();
    profile = inserted[0]!;
  }
  return profile;
}

async function requirePassedSteps(profileId: string, steps: VerificationStep[]) {
  if (!steps.length) return;

  const rows = await db
    .select({ step: verifications.step, status: verifications.status })
    .from(verifications)
    .where(and(eq(verifications.profileId, profileId), inArray(verifications.step, steps)));

  const byStep = new Map(rows.map((row) => [row.step, row.status]));
  for (const step of steps) {
    if (byStep.get(step) !== "passed") {
      throw new Error(`${step} step required first`);
    }
  }
}

async function setStep(profileId: string, step: VerificationStep, result: Record<string, unknown>, passed: boolean) {
  // Idempotent upsert.
  const existing = await db
    .select()
    .from(verifications)
    .where(and(eq(verifications.profileId, profileId), eq(verifications.step, step)));
  if (existing.length) {
    await db.update(verifications)
      .set({ status: passed ? "passed" : "failed", result, completedAt: new Date() })
      .where(eq(verifications.id, existing[0]!.id));
  } else {
    await db.insert(verifications).values({
      profileId,
      step,
      status: passed ? "passed" : "failed",
      result,
      completedAt: new Date(),
    });
  }
}

export async function submitIdentity(token: string, formData: FormData) {
  const h = await headers();
  const rl = await limiters.verifyStep.limit(`ip:${clientIp(h)}`);
  if (!rl.success) throw new Error("rate limited");

  const parsed = IdentitySubmitSchema.parse({
    declaredCountry: formData.get("declaredCountry"),
    documentBase64: formData.get("documentBase64"),
    mimeType: formData.get("mimeType"),
  });
  if (isSanctioned(parsed.declaredCountry)) throw new Error("sanctioned region");

  const profile = await requireProfile(token);
  const bytes = Buffer.from(parsed.documentBase64, "base64");
  if (bytes.byteLength > 8 * 1024 * 1024) throw new Error("file too large");

  const doc = await storeDocument({
    ownerProfileId: profile.id,
    kind: "passport",
    mimeType: parsed.mimeType,
    bytes,
  });

  const id = await verifyIdentity({ documentBytes: bytes, mimeType: parsed.mimeType, declaredCountry: parsed.declaredCountry });

  await setStep(profile.id, "identity", {
    providerRef: id.providerRef,
    matchScore: id.matchScore,
    documentNumberHash: id.documentNumberHash,
    docId: doc.id,
    country: id.country,
  }, id.ok);

  await appendEvent({
    profileId: profile.id,
    type: "doc.identity",
    payload: { providerRef: id.providerRef, country: id.country, ok: id.ok, docHash: id.documentNumberHash },
  });

  redirect(`/verify/${token}/liveness`);
}

export async function submitLiveness(token: string, formData: FormData) {
  const h = await headers();
  const rl = await limiters.verifyStep.limit(`ip:${clientIp(h)}`);
  if (!rl.success) throw new Error("rate limited");

  const raw = formData.get("frameHashes");
  const parsed = LivenessSubmitSchema.parse({ frameHashes: typeof raw === "string" ? JSON.parse(raw) : [] });

  const profile = await requireProfile(token);
  const [identityStep] = await db.select().from(verifications).where(and(eq(verifications.profileId, profile.id), eq(verifications.step, "identity")));
  if (!identityStep || identityStep.status !== "passed") throw new Error("identity step required first");

  const r = await verifyLiveness({
    frameHashes: parsed.frameHashes,
    identityProviderRef: (identityStep.result as { providerRef: string }).providerRef,
  });
  await setStep(profile.id, "liveness", { providerRef: r.providerRef, matchScore: r.matchScore, isLive: r.isLive }, r.ok);
  await appendEvent({ profileId: profile.id, type: "liveness.ok", payload: { matchScore: r.matchScore, ok: r.ok } });

  redirect(`/verify/${token}/location`);
}

export async function submitLocation(token: string, formData: FormData) {
  const h = await headers();
  const rl = await limiters.verifyStep.limit(`ip:${clientIp(h)}`);
  if (!rl.success) throw new Error("rate limited");

  const parsed = LocationSubmitSchema.parse({
    gpsCountry: formData.get("gpsCountry"),
    ipCountry: formData.get("ipCountry"),
    simCountry: formData.get("simCountry"),
    gpsCity: formData.get("gpsCity") || undefined,
  });

  const verdict = crossCheck(parsed);
  const profile = await requireProfile(token);
  await requirePassedSteps(profile.id, ["identity", "liveness"]);
  await setStep(profile.id, "location", { signals: verdict.signals, reason: verdict.reason ?? null, city: verdict.storedCity }, verdict.ok);
  await appendEvent({
    profileId: profile.id,
    type: "location.verified",
    payload: { ok: verdict.ok, signals: verdict.signals, reason: verdict.reason ?? null, city: verdict.storedCity },
  });
  if (!verdict.ok) throw new Error(verdict.reason === "sanctioned" ? "Sanctioned region" : "Location signals mismatch");
  redirect(`/verify/${token}/company`);
}

export async function submitCompany(token: string, formData: FormData) {
  const h = await headers();
  const rl = await limiters.verifyStep.limit(`ip:${clientIp(h)}`);
  if (!rl.success) throw new Error("rate limited");

  const parsed = CompanySubmitSchema.parse({
    registryId: formData.get("registryId") || undefined,
    signingPersonally: formData.get("signingPersonally") === "on",
  });
  const profile = await requireProfile(token);
  await requirePassedSteps(profile.id, ["identity", "liveness", "location"]);

  let bo = parsed.signingPersonally ? [] : await resolveBeneficialOwners(parsed.registryId!);
  await setStep(profile.id, "company", { registryId: parsed.registryId ?? null, signingPersonally: parsed.signingPersonally, bo }, true);
  await appendEvent({
    profileId: profile.id,
    type: "company.confirmed",
    payload: { registryId: parsed.registryId ?? null, personal: parsed.signingPersonally, boDepth: bo.length },
  });
  redirect(`/verify/${token}/screening`);
}

export async function submitScreening(token: string) {
  const profile = await requireProfile(token);
  await requirePassedSteps(profile.id, ["identity", "liveness", "location", "company"]);

  await appendEvent({
    profileId: profile.id,
    type: "screening.queued",
    payload: { lists: ["ofac", "un", "eu", "uk", "pep", "adverse_media"] },
  });

  const result = await screen({ fullName: profile.displayName, country: profile.country ?? undefined });

  await setStep(profile.id, "screening", { hits: result.hits, providerRef: result.providerRef }, result.ok);
  await appendEvent({
    profileId: profile.id,
    type: "screening.complete",
    payload: { hits: result.hits.length, ok: result.ok },
  });

  if (!result.ok) {
    // Hits route to a human compliance officer; we do not auto-fail or auto-pass.
    await db.update(profiles).set({ tier: "provisional" }).where(eq(profiles.id, profile.id));
    redirect(`/verify/${token}/done?review=1`);
  }

  // Clean — issue the card.
  const initial = computeScore({
    kycComplete: true,
    bankLinked: false,
    livenessOk: true,
    vouchesReceived: [],
    dealsClosedDisputeFree: 0,
    counterpartyCountries: 0,
    daysOnPlatform: 0,
    daysSinceLastEvent: 0,
  });

  await db
    .update(profiles)
    .set({ tier: "provisional", isLive: true, liveAt: new Date(), score: initial.total })
    .where(eq(profiles.id, profile.id));

  await appendEvent({
    profileId: profile.id,
    type: "profile.live",
    payload: { tier: "provisional", score: initial.total },
  });

  redirect(`/verify/${token}/done`);
}
