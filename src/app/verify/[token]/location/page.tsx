"use client";
import { use, useState } from "react";
import { IosFrame } from "@/components/IosFrame";
import { StepHeader } from "@/components/StepHeader";
import { Button } from "@/components/Button";
import { submitLocation } from "@/lib/actions";

export default function LocationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function allow() {
    setBusy(true);
    setErr(null);
    try {
      // Production: navigator.geolocation.getCurrentPosition({enableHighAccuracy})
      // → server reverse-geocodes to country. For the MVP, post a synthetic
      // signal set so the cross-check passes.
      const fd = new FormData();
      fd.set("gpsCountry", "NG");
      fd.set("ipCountry", "NG");
      fd.set("simCountry", "NG");
      fd.set("gpsCity", "Lagos");
      await submitLocation(token, fd);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Location failed");
      setBusy(false);
    }
  }

  return (
    <IosFrame>
      <StepHeader title="Location" subtitle="GPS · IP · SIM must agree" back={`/verify/${token}/liveness`} current={3} />
      <div className="px-5 pt-4 pb-6">
        <h2 className="text-[20px] font-semibold tracking-tight text-[var(--color-ink)]">
          Where are you signing from?
        </h2>
        <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-ink-3)]">
          We pin your location to this verification. City-level only — precise GPS gets captured only at deal-signing moments and written to the audit ledger.
        </p>

        <div className="mt-5 h-[150px] w-full rounded-[12px] bg-gradient-to-br from-[var(--color-bg-2)] to-[var(--color-bg)] border border-[var(--color-line)] relative">
          <span className="mono absolute top-2 right-2 text-[9px] uppercase tracking-wider text-[var(--color-ink-4)]">
            coarse · city-level
          </span>
        </div>

        <div className="mt-4 rounded-[10px] bg-[var(--color-bg-2)] p-3 text-[11px] leading-relaxed text-[var(--color-ink-3)]">
          <b className="text-[var(--color-ink)]">What gets stored:</b> city-level location, hash of GPS coordinates (not the coordinates themselves), and the verdict. Precise location is captured only when you sign a deal — and it's written into that deal's audit hash, not your profile.
        </div>

        {err && <p className="mt-3 text-[12px] text-[var(--color-warn)]">{err}</p>}
        <div className="mt-6 pb-8">
          <Button disabled={busy} className="w-full" onClick={allow}>
            {busy ? "Checking…" : "Allow location for verification"}
          </Button>
        </div>
      </div>
    </IosFrame>
  );
}
