"use client";
import { use, useRef, useState } from "react";
import { IosFrame } from "@/components/IosFrame";
import { StepHeader } from "@/components/StepHeader";
import { Button } from "@/components/Button";
import { submitIdentity } from "@/lib/actions";

export default function IdentityPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setErr("File too large (max 8MB)"); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setErr("JPEG/PNG/WebP only"); return; }
    setBusy(true);
    setErr(null);
    try {
      const buf = await file.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const fd = new FormData();
      fd.set("documentBase64", b64);
      fd.set("mimeType", file.type);
      fd.set("declaredCountry", "NG"); // hard-coded for demo; production: dropdown
      await submitIdentity(token, fd);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Upload failed");
      setBusy(false);
    }
  }

  return (
    <IosFrame>
      <StepHeader title="Identity" subtitle="Hold steady — auto-captures" back={`/verify/${token}`} current={1} />
      <div className="px-5 pt-6 pb-6">
        <div
          className="aspect-[4/3] w-full rounded-[12px] border-2 border-dashed border-[var(--color-line-strong)] bg-[var(--color-bg-2)] flex flex-col items-center justify-center cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <div className="text-[14px] font-medium text-[var(--color-ink)]">Frame your passport</div>
          <div className="text-[11px] text-[var(--color-ink-4)] mt-1 text-center px-4">
            MRZ at the bottom. Good light, no glare. Tap to choose a file.
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={onPick}
        />
        {err && <p className="mt-3 text-[12px] text-[var(--color-warn)]">{err}</p>}
        <div className="mt-6 pb-8">
          <Button disabled={busy} className="w-full" onClick={() => inputRef.current?.click()}>
            {busy ? "Uploading…" : "Capture"}
          </Button>
        </div>
      </div>
    </IosFrame>
  );
}
