import { z } from "zod";

const ISO_COUNTRY = z.string().regex(/^[A-Z]{2}$/);
const E164 = z.string().regex(/^\+[1-9]\d{6,14}$/);

export const StartVerificationSchema = z.object({
  inviteToken: z.string().min(32).max(128),
});

export const IdentitySubmitSchema = z.object({
  declaredCountry: ISO_COUNTRY,
  // Base64-encoded image; size limit enforced before decode.
  documentBase64: z.string().min(100).max(8 * 1024 * 1024),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export const LivenessSubmitSchema = z.object({
  frameHashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)).min(8).max(64),
});

export const LocationSubmitSchema = z.object({
  gpsCountry: ISO_COUNTRY,
  ipCountry: ISO_COUNTRY,
  simCountry: ISO_COUNTRY,
  gpsCity: z.string().max(120).optional(),
});

export const CompanySubmitSchema = z.object({
  registryId: z.string().min(1).max(64).optional(),
  signingPersonally: z.boolean().default(false),
}).refine((v) => v.signingPersonally || !!v.registryId, "registryId required unless signing personally");

export const FlashSchema = z.object({
  groupContext: z.string().max(200).optional(),
});

export const InviteCreateSchema = z.object({
  groupContext: z.string().max(200),
  inviteePhone: E164.optional(),
});

export type StartVerification = z.infer<typeof StartVerificationSchema>;
