/**
 * Tiny env helper. `GREYBEARD_ENV` is the single source of truth for
 * "which environment am I". NODE_ENV stays `production` everywhere except
 * local dev — Vercel sets it that way.
 */
export type Env = "development" | "staging" | "production";

export function env(): Env {
  const v = process.env.GREYBEARD_ENV;
  if (v === "staging" || v === "production") return v;
  if (process.env.NODE_ENV === "production") return "production";
  return "development";
}

export const isStaging = () => env() === "staging";
export const isProd = () => env() === "production";
export const isDev = () => env() === "development";
