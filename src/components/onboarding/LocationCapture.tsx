"use client";

import { useEffect, useMemo, useState } from "react";
import { submitLocation } from "@/lib/actions";
import { Button } from "@/components/Button";
import { COUNTRY_OPTIONS, regionFromLocale } from "@/lib/countries";

type Coordinates = {
  lat: number;
  lng: number;
  capturedAt: string;
};

export function LocationCapture({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [country, setCountry] = useState("NG");
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState<Coordinates | null>(null);

  useEffect(() => {
    const inferred = regionFromLocale(navigator.language);
    if (COUNTRY_OPTIONS.some(([code]) => code === inferred)) {
      setCountry(inferred);
    }
  }, []);

  const canSubmit = useMemo(() => !busy && !!country && !!city.trim() && !!coords, [busy, city, country, coords]);

  function locate() {
    setLocating(true);
    setErr(null);
    if (!("geolocation" in navigator)) {
      setErr("This browser does not expose geolocation.");
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          capturedAt: new Date().toISOString(),
        });
        setLocating(false);
      },
      (error) => {
        setErr(error.message || "Location permission is required");
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  }

  async function submit() {
    if (!coords) return;
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.set("gpsCountry", country);
      fd.set("gpsCity", city.trim());
      fd.set("gpsLat", String(coords.lat));
      fd.set("gpsLng", String(coords.lng));
      fd.set("gpsCapturedAt", coords.capturedAt);
      await submitLocation(token, fd);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Location verification failed");
      setBusy(false);
    }
  }

  return (
    <div className="px-5 pt-4 pb-6">
      <h2 className="text-[20px] font-semibold tracking-tight text-[var(--color-ink)]">
        Where are you signing from?
      </h2>
      <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-ink-3)]">
        We capture live browser GPS, compare it with edge IP geography and the invite phone country, and only store city-level location plus a hash of the precise coordinates.
      </p>

      <div className="mt-5 rounded-[12px] border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-medium text-[var(--color-ink)]">Browser GPS</div>
            <div className="mono text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">
              {coords ? `captured ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "not captured yet"}
            </div>
          </div>
          <Button variant="outline" onClick={locate} disabled={locating || busy}>
            {locating ? "Locating…" : coords ? "Refresh" : "Use current location"}
          </Button>
        </div>
      </div>

      <label className="mt-5 block text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-4)]">
        Country
      </label>
      <select
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        className="mt-2 w-full rounded-[10px] border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-3 py-2.5 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
      >
        {COUNTRY_OPTIONS.map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>

      <label className="mt-4 block text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-4)]">
        City
      </label>
      <input
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="Lagos"
        className="mt-2 w-full rounded-[10px] border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-3 py-2.5 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
      />

      <div className="mt-4 rounded-[10px] bg-[var(--color-bg-2)] p-3 text-[11px] leading-relaxed text-[var(--color-ink-3)]">
        <b className="text-[var(--color-ink)]">Stored:</b> city, country, cross-check verdict, and a one-way hash of the precise coordinates captured right now. Raw coordinates are not written to your public profile.
      </div>

      {err && <p className="mt-3 text-[12px] text-[var(--color-warn)]">{err}</p>}
      <div className="mt-6 pb-8">
        <Button disabled={!canSubmit} className="w-full" onClick={submit}>
          {busy ? "Checking…" : "Submit location"}
        </Button>
      </div>
    </div>
  );
}
