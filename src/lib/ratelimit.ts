import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limit with Upstash Redis when configured; otherwise an in-memory
 * fallback for local dev. Memory fallback is per-instance — DO NOT rely on it
 * in production behind multiple Vercel functions.
 */

class MemoryLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  constructor(private max: number, private windowMs: number) {}
  async limit(key: string) {
    const now = Date.now();
    const b = this.buckets.get(key);
    if (!b || b.resetAt < now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { success: true, remaining: this.max - 1, reset: now + this.windowMs };
    }
    b.count += 1;
    return { success: b.count <= this.max, remaining: Math.max(0, this.max - b.count), reset: b.resetAt };
  }
}

function makeLimiter(max: number, window: `${number} ${"s" | "m" | "h"}`) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(max, window),
      analytics: true,
      prefix: "gb",
    });
  }
  const ms = parseWindow(window);
  return new MemoryLimiter(max, ms);
}

function parseWindow(w: `${number} ${"s" | "m" | "h"}`): number {
  const [n, unit] = w.split(" ");
  const v = Number(n);
  if (unit === "s") return v * 1000;
  if (unit === "m") return v * 60_000;
  return v * 3_600_000;
}

// Per-endpoint limiters. Tune as needed.
export const limiters = {
  verifyStart: makeLimiter(5, "10 m"),     // 5 per 10 min per IP
  verifyStep: makeLimiter(20, "10 m"),     // 20 per 10 min per profile
  flash: makeLimiter(60, "1 h"),           // 60 per hour per profile
  webhook: makeLimiter(120, "1 m"),        // generous for WhatsApp callbacks
  vaultDownload: makeLimiter(30, "10 m"),  // 30 per 10 min per share token
};

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
