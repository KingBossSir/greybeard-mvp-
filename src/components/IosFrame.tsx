import type { ReactNode } from "react";

/** Phone frame for the verification webview screens. Visual only. */
export function IosFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto my-8 max-w-[400px]">
      <div className="overflow-hidden rounded-[36px] border border-[var(--color-line-strong)] bg-[var(--color-paper)] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.15)]">
        <div className="flex h-[52px] items-center justify-between px-6 text-xs font-medium text-[var(--color-ink)]">
          <span>9:41</span>
          <span className="h-3 w-20 rounded-full bg-[var(--color-ink)]" />
          <span className="mono">●●● ●</span>
        </div>
        <div className="min-h-[700px]">{children}</div>
      </div>
    </div>
  );
}
