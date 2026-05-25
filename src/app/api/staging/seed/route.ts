import { NextResponse } from "next/server";
import { isProd } from "@/lib/env";
import { reset, seed } from "@/lib/seed";
import { safeEqual } from "@/lib/crypto";

/**
 * POST /api/staging/seed
 *   Headers: x-ops-token: <STAGING_OPS_TOKEN>
 *   Query:   ?reset=1 to truncate before seeding
 *
 * Hard-gated:
 *   - 404 in production (route effectively does not exist there)
 *   - constant-time token check
 *   - never enabled if STAGING_OPS_TOKEN is unset
 */
export async function POST(req: Request) {
  if (isProd()) return new NextResponse("not_found", { status: 404 });

  const expected = process.env.STAGING_OPS_TOKEN;
  if (!expected || expected.length < 32) return new NextResponse("not_found", { status: 404 });

  const provided = req.headers.get("x-ops-token") ?? "";
  if (!safeEqual(provided, expected)) return new NextResponse("forbidden", { status: 403 });

  const url = new URL(req.url);
  const shouldReset = url.searchParams.get("reset") === "1";

  try {
    if (shouldReset) await reset();
    await seed();
    return NextResponse.json({ ok: true, reset: shouldReset });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "fail" }, { status: 500 });
  }
}
