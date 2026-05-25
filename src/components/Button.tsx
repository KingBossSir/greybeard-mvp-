import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "outline";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", className = "", ...rest }, ref
) {
  const styles =
    variant === "primary"
      ? "bg-[var(--color-ink)] text-white hover:bg-[var(--color-ink-2)] disabled:bg-[var(--color-ink-4)]"
      : variant === "outline"
      ? "border border-[var(--color-line-strong)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-[var(--color-paper-2)]"
      : "text-[var(--color-ink)] hover:bg-[var(--color-bg-2)]";

  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed ${styles} ${className}`}
      {...rest}
    />
  );
});
