"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { submitIdentity } from "@/lib/actions";
import { Button } from "@/components/Button";
import { COUNTRY_OPTIONS, regionFromLocale } from "@/lib/countries";

function prettyBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string" || !result.includes(",")) {
        reject(new Error("Unable to read that document"));
        return;
      }
      resolve(result.split(",")[1]!);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read that document"));
    reader.readAsDataURL(file);
  });
}

export function IdentityCapture({ token }: { token: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [country, setCountry] = useState("NG");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const inferred = regionFromLocale(navigator.language);
    if (COUNTRY_OPTIONS.some(([code]) => code === inferred)) {
      setCountry(inferred);
    }
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canSubmit = useMemo(() => !!file && !!country && !busy, [busy, country, file]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = e.target.files?.[0];
    if (!nextFile) return;
    if (nextFile.size > 8 * 1024 * 1024) {
      setErr("File too large (max 8MB)");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(nextFile.type)) {
      setErr("JPEG, PNG, or WebP only");
      return;
    }
    setErr(null);
    setFile(nextFile);
  }

  async function submit() {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const b64 = await fileToBase64(file);
      const fd = new FormData();
      fd.set("documentBase64", b64);
      fd.set("mimeType", file.type);
      fd.set("declaredCountry", country);
      await submitIdentity(token, fd);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Upload failed");
      setBusy(false);
    }
  }

  return (
    <div className="px-5 pt-6 pb-6">
      <label className="block text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-4)]">
        Document country
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

      <div
        className="mt-5 overflow-hidden rounded-[12px] border-2 border-dashed border-[var(--color-line-strong)] bg-[var(--color-bg-2)] cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Document preview" className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="aspect-[4/3] w-full px-6 py-8 flex flex-col items-center justify-center text-center">
            <div className="text-[14px] font-medium text-[var(--color-ink)]">Frame your passport or national ID</div>
            <div className="mt-1 text-[11px] text-[var(--color-ink-4)]">
              Good light, no glare, all four edges visible. Tap to take a photo or choose a file.
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={onPick}
      />

      {file && (
        <div className="mt-3 rounded-[10px] border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-[12px] text-[var(--color-ink-3)]">
          <div className="font-medium text-[var(--color-ink)]">{file.name}</div>
          <div className="mono mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">
            {file.type.replace("image/", "")} · {prettyBytes(file.size)}
          </div>
        </div>
      )}

      {err && <p className="mt-3 text-[12px] text-[var(--color-warn)]">{err}</p>}
      <div className="mt-6 pb-8">
        <Button disabled={!canSubmit} className="w-full" onClick={submit}>
          {busy ? "Uploading…" : file ? "Submit identity" : "Choose document"}
        </Button>
      </div>
    </div>
  );
}
