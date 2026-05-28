/**
 * Tiny env helper. `GREYBEARD_ENV` is the single source of truth for
 * "which environment am I". NODE_ENV stays `production` everywhere except
 * local dev — Vercel sets it that way.
 */
import { createHash } from "node:crypto";

export type Env = "development" | "staging" | "production";

const AUTH_SECRET_KEYS = ["AUTH_SECRET", "NEXTAUTH_SECRET"] as const;
const DATABASE_URL_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
] as const;
const DIRECT_DATABASE_URL_KEYS = [
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL_NON_POOLING",
  ...DATABASE_URL_KEYS,
] as const;

function firstDefinedEnv(keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

declare global {
  // eslint-disable-next-line no-var
  var __greybeardAuthSecretFallbackWarned: boolean | undefined;
}

function deriveFallbackAuthSecret(): string | undefined {
  const material = [
    firstDefinedEnv(DIRECT_DATABASE_URL_KEYS),
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim(),
    process.env.VERCEL_URL?.trim(),
    process.env.NEXTAUTH_URL?.trim(),
    process.env.AUTH_URL?.trim(),
    process.env.GREYBEARD_ENV?.trim(),
  ].filter(Boolean);

  if (!material.length) {
    if (process.env.NODE_ENV !== "production") {
      return "greybeard-dev-fallback-secret";
    }
    return undefined;
  }

  return createHash("sha256")
    .update(`greybeard-beta:${material.join("|")}`)
    .digest("hex");
}

export function env(): Env {
  const v = process.env.GREYBEARD_ENV;
  if (v === "staging" || v === "production") return v;
  if (process.env.NODE_ENV === "production") return "production";
  return "development";
}

export const isStaging = () => env() === "staging";
export const isProd = () => env() === "production";
export const isDev = () => env() === "development";

export function getAuthSecret(): string | undefined {
  const explicit = firstDefinedEnv(AUTH_SECRET_KEYS);
  if (explicit) return explicit;

  const derived = deriveFallbackAuthSecret();
  if (derived && !globalThis.__greybeardAuthSecretFallbackWarned) {
    globalThis.__greybeardAuthSecretFallbackWarned = true;
    console.warn(
      "[auth] AUTH_SECRET missing; using a deterministic beta fallback derived from server env. Set AUTH_SECRET explicitly for long-term production stability."
    );
  }
  return derived;
}

export function getDatabaseUrl(options?: { preferDirect?: boolean }): string | undefined {
  const keys = options?.preferDirect ? DIRECT_DATABASE_URL_KEYS : DATABASE_URL_KEYS;
  return firstDefinedEnv(keys);
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || "noreply@greybeard.app";
}
