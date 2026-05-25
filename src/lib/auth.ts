import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { Resend } from "resend";
import type { Provider } from "next-auth/providers";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const emailMagicLink: Provider = {
  id: "email",
  name: "Email",
  type: "email",
  from: process.env.EMAIL_FROM ?? "noreply@greybeard.app",
  maxAge: 10 * 60, // 10 minutes
  async sendVerificationRequest({ identifier, url }) {
    if (!resend) {
      // Dev fallback: log to console.
      console.log(`[auth] magic link for ${identifier}: ${url}`);
      return;
    }
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "noreply@greybeard.app",
      to: identifier,
      subject: "Your greybeard sign-in link",
      text: `Sign in to greybeard: ${url}\n\nLink expires in 10 minutes. If you didn't request this, ignore.`,
    });
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  trustHost: true,
  session: { strategy: "database", maxAge: 60 * 60 * 24 * 30 },
  providers: [emailMagicLink],
  pages: { signIn: "/signin" },
  callbacks: {
    async session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
