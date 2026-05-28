import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "./db";
import { profiles, users } from "./schema";
import { getAuthSecret } from "./env";

const authSecret = getAuthSecret();
const LocalAccessSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .optional()
    .or(z.literal("")),
});

function generateDisplayName(input?: string) {
  if (input) return input;
  return `Operator ${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

function generateHandle() {
  return `gb_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  secret: authSecret,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  providers: [
    Credentials({
      credentials: {
        displayName: { label: "Display name", type: "text" },
      },
      async authorize(rawCredentials) {
        const parsed = LocalAccessSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const displayName = generateDisplayName(parsed.data.displayName || undefined);
        const userId = crypto.randomUUID();

        try {
          await db.insert(users).values({
            id: userId,
            name: displayName,
            email: null,
            emailVerified: null,
          });

          await db.insert(profiles).values({
            userId,
            handle: generateHandle(),
            displayName,
          });
        } catch (error) {
          console.warn("[auth] local access proceeding without database persistence", error);
        }

        return {
          id: userId,
          name: displayName,
          email: null,
        };
      },
    }),
  ],
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? token.sub ?? "");
        session.user.name = token.name;
        if (typeof token.email === "string") {
          session.user.email = token.email;
        } else {
          delete (session.user as { email?: string }).email;
        }
      }
      return session;
    },
  },
}));
