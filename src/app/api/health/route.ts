import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/** Liveness + readiness in one. Docker/Vercel health checks hit this. */
export async function GET() {
  const started = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json(
      { ok: true, env: env(), db: "ok", elapsedMs: Date.now() - started },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, env: env(), db: "fail", error: e instanceof Error ? e.message : "unknown" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
}
