"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";

type InviteResult = {
  url: string;
  expiresAt: string;
};

export function InviteGenerator() {
  const [groupContext, setGroupContext] = useState("");
  const [inviteePhone, setInviteePhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);

  const whatsAppUrl = useMemo(() => {
    if (!result) return null;
    const body = `GreyBeard verification invite\n${groupContext || "Counterparty onboarding"}\n\nOpen this secure link to verify once and carry your card into the deal chat:\n${result.url}`;
    return `https://wa.me/?text=${encodeURIComponent(body)}`;
  }, [groupContext, result]);

  async function createInvite() {
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch("/api/verify/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupContext: groupContext.trim() || "GreyBeard verification",
          inviteePhone: inviteePhone.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || "Unable to mint invite");
      }
      setResult(body);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Unable to mint invite");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!result?.url) return;
    await navigator.clipboard.writeText(result.url);
  }

  return (
    <div className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-paper)] p-5">
      <div className="mono text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">Invite a counterparty</div>
      <h2 className="mt-1 text-[20px] font-semibold tracking-tight">Generate a real onboarding link</h2>
      <p className="mt-2 text-[12px] text-[var(--color-ink-3)]">
        Add the deal context, optionally include the recipient's phone, then share the link directly into WhatsApp or any other chat.
      </p>

      <div className="mt-4 grid gap-3">
        <input
          value={groupContext}
          onChange={(e) => setGroupContext(e.target.value)}
          placeholder="Tema Cocoa · 800MT FOB"
          className="w-full rounded-[10px] border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-3 py-2.5 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
        />
        <input
          value={inviteePhone}
          onChange={(e) => setInviteePhone(e.target.value)}
          placeholder="+2348012345678 (optional)"
          className="w-full rounded-[10px] border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-3 py-2.5 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
        />
        <Button disabled={busy || !groupContext.trim()} className="w-full" onClick={createInvite}>
          {busy ? "Minting…" : "Create invite"}
        </Button>
      </div>

      {err && <p className="mt-3 text-[12px] text-[var(--color-warn)]">{err}</p>}

      {result && (
        <div className="mt-4 rounded-[12px] border border-[var(--color-line-strong)] bg-[var(--color-bg-2)] p-4">
          <div className="text-[13px] font-medium text-[var(--color-ink)]">Invite ready</div>
          <div className="mono mt-2 break-all rounded-[8px] bg-[var(--color-paper)] p-3 text-[11px] text-[var(--color-ink-3)]">
            {result.url}
          </div>
          <div className="mono mt-2 text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">
            expires {new Date(result.expiresAt).toLocaleString()}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <Button variant="outline" onClick={copyLink}>Copy link</Button>
            {whatsAppUrl ? (
              <a href={whatsAppUrl} target="_blank" rel="noreferrer" className="block">
                <Button className="w-full">Share to WhatsApp</Button>
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
