import { NextResponse } from "next/server";
import { consumeShare } from "@/lib/vault";
import { limiters } from "@/lib/ratelimit";
import { clientIp } from "@/lib/ratelimit";

/**
 * GET /api/vault/:docId?t=<rawToken>
 * Single-use, time-bounded vault download. Token is validated server-side and
 * marked consumed. The docId in the URL is just a sanity check — the token
 * resolves to the actual document.
 */
export async function GET(req: Request, { params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  if (!token || token.length < 32 || token.length > 256) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const rl = await limiters.vaultDownload.limit(`ip:${clientIp(req.headers)}`);
  if (!rl.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  try {
    const { bytes, meta } = await consumeShare(token);
    if (meta.id !== docId) {
      return NextResponse.json({ error: "token_doc_mismatch" }, { status: 403 });
    }
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "content-type": meta.mimeType,
        "content-length": String(meta.byteLength),
        "content-disposition": `attachment; filename="${meta.kind}.bin"`,
        "cache-control": "private, no-store, max-age=0",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "fail" }, { status: 403 });
  }
}
