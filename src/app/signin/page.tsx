import { signIn } from "@/lib/auth";
import { Button } from "@/components/Button";

export default function SignIn() {
  async function action(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    if (!email) return;
    await signIn("email", { email, redirectTo: "/account" });
  }

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in to greybeard</h1>
      <p className="mt-2 text-[13px] text-[var(--color-ink-3)]">
        We'll email you a one-time link. Expires in 10 minutes.
      </p>
      <form action={action} className="mt-6 space-y-3">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-3 py-2.5 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
        />
        <Button type="submit" className="w-full">Send link</Button>
      </form>
    </main>
  );
}
