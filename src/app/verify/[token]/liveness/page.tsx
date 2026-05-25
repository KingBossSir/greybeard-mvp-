"use client";
import { use, useState } from "react";
import { IosFrame } from "@/components/IosFrame";
import { StepHeader } from "@/components/StepHeader";
import { Button } from "@/components/Button";
import { submitLiveness } from "@/lib/actions";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function LivenessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setErr(null);
    try {
      // Simulate 12 captured frame hashes. Production: webcam → MediaPipe Face
      // → 16 frames hashed client-side; only the digests + signed liveness
      // assertion ever reach the server. Raw video is NEVER stored (per spec).
      const hashes: string[] = [];
      for (let i = 0; i < 12; i++) hashes.push(await sha256Hex(`frame-${i}-${Date.now()}`));
      const fd = new FormData();
      fd.set("frameHashes", JSON.stringify(hashes));
      await submitLiveness(token, fd);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Liveness failed");
      setBusy(false);
    }
  }

  return (
    <IosFrame>
      <StepHeader title="Liveness" subtitle="Hold the phone at eye level" back={`/verify/${token}/identity`} current={2} />
      <div className="px-5 pt-10 pb-6 flex flex-col items-center">
        <div className="aspect-square w-[260px] rounded-full bg-[var(--color-ink)] flex items-center justify-center">
          <div className="aspect-square w-[200px] rounded-full bg-gradient-to-br from-[#332] to-[#221] border border-[var(--color-ink-3)]" />
        </div>
        <div className="mt-4 text-[14px] font-medium text-[var(--color-ink)]">Turn your head slowly →</div>
        <div className="mono mt-1 text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">
          live · no recording stored
        </div>
        {err && <p className="mt-3 text-[12px] text-[var(--color-warn)]">{err}</p>}
        <div className="mt-10 w-full pb-8">
          <Button disabled={busy} className="w-full" onClick={go}>
            {busy ? "Verifying…" : "Capture liveness"}
          </Button>
        </div>
      </div>
    </IosFrame>
  );
}
