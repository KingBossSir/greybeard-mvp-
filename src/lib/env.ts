/**
 * Tiny env helper. `GREYBEARD_ENV` is the single source of truth for
 * "which environment am I". NODE_ENV stays `production` everywhere except
 * local dev — Vercel sets it that way.
 */

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
  return "greybeard-beta-local-session-v1";
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
      "[auth] AUTH_SECRET missing; using the beta local-session fallback. Set AUTH_SECRET explicitly for long-term production stability."
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
