import { signIn } from "@/lib/auth";
import { Button } from "@/components/Button";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SignIn() {
  const session = await auth();
  if (session?.user?.id) redirect("/account");

  async function action(formData: FormData) {
    "use server";
    const displayName = String(formData.get("displayName") ?? "");
    await signIn("credentials", { displayName, redirectTo: "/account" });
  }

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">Open GreyBeard</h1>
      <p className="mt-2 text-[13px] text-[var(--color-ink-3)]">
        No email setup required. This creates local access for this browser and drops you straight into the app.
      </p>
      <form action={action} className="mt-6 space-y-3">
        <input
          name="displayName"
          type="text"
          autoComplete="name"
          placeholder="What should we call you?"
          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-3 py-2.5 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
        />
        <Button type="submit" className="w-full">Create local access</Button>
      </form>
      <p className="mt-3 text-[12px] text-[var(--color-ink-4)]">
        If you sign out, this browser session is cleared. There is no email recovery flow in this build.
      </p>
    </main>
  );
}
