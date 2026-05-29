import { asc, desc, eq } from "drizzle-orm";
import { db } from "./db";
import { ledgerEvents, profiles, users, type LedgerEvent, type Profile } from "./schema";

type SessionUserLike = {
  id: string;
  name?: string | null;
};

export type AccessProfile = Pick<
  Profile,
  "id" | "handle" | "displayName" | "company" | "country" | "tier" | "score" | "dealsClosed" | "dealsDisputed" | "liveAt"
> & { isFallback: boolean };

function fallbackHandle(userId: string) {
  return `gb_local_${userId.replace(/-/g, "").slice(0, 12)}`;
}

export function fallbackProfile(user: SessionUserLike): AccessProfile {
  return {
    id: user.id,
    handle: fallbackHandle(user.id),
    displayName: user.name ?? "Local Operator",
    company: null,
    country: null,
    tier: "provisional",
    score: 0,
    dealsClosed: 0,
    dealsDisputed: 0,
    liveAt: null,
    isFallback: true,
  };
}

async function hydrateSessionUser(user: SessionUserLike) {
  const displayName = user.name ?? "Local Operator";

  await db.insert(users).values({
    id: user.id,
    name: displayName,
    email: null,
    emailVerified: null,
  }).onConflictDoNothing();

  await db.insert(profiles).values({
    userId: user.id,
    handle: fallbackHandle(user.id),
    displayName,
  }).onConflictDoNothing();
}

export async function getAccessProfile(user: SessionUserLike): Promise<AccessProfile> {
  try {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
    if (profile) {
      return { ...profile, isFallback: false };
    }

    await hydrateSessionUser(user);
    const [hydrated] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
    if (hydrated) {
      return { ...hydrated, isFallback: false };
    }
  } catch (error) {
    console.warn("[access] falling back to local profile", error);
  }

  return fallbackProfile(user);
}

export async function getRecentLedgerEvents(profileId: string, limit: number) {
  try {
    return await db
      .select()
      .from(ledgerEvents)
      .where(eq(ledgerEvents.profileId, profileId))
      .orderBy(desc(ledgerEvents.seq))
      .limit(limit);
  } catch (error) {
    console.warn("[access] unable to load recent ledger events", error);
    return [] satisfies LedgerEvent[];
  }
}

export async function getAuditLedgerEvents(profileId: string) {
  try {
    return await db
      .select()
      .from(ledgerEvents)
      .where(eq(ledgerEvents.profileId, profileId))
      .orderBy(asc(ledgerEvents.seq));
  } catch (error) {
    console.warn("[access] unable to load audit ledger events", error);
    return [] satisfies LedgerEvent[];
  }
}
