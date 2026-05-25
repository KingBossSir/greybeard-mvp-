/**
 * Deterministic seed for staging + local dev.
 *
 * Creates a small cast of profiles + invite tokens + a few ledger events so
 * QA can exercise /flash, /verify, and the dashboard without running through
 * the full onboarding flow.
 *
 * Idempotent: re-running upserts by handle.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { invites, ledgerEvents, profiles, users } from "./schema";
import { hashToken } from "./crypto";
import { appendEvent } from "./ledger";

interface SeedProfile {
  email: string;
  handle: string;
  displayName: string;
  company: string;
  country: string;
  tier: "provisional" | "verified" | "charter";
  score: number;
  dealsClosed: number;
}

const SEED_PROFILES: SeedProfile[] = [
  { email: "adaeze@staging.greybeard.app", handle: "gb_seed_adaeze_okafor", displayName: "Adaeze Okafor", company: "Sahel Cocoa Partners Ltd", country: "NG", tier: "charter", score: 742, dealsClosed: 47 },
  { email: "daniel@staging.greybeard.app", handle: "gb_seed_daniel_aluko",  displayName: "Daniel Aluko",  company: "Aluko Trading Co.",       country: "NG", tier: "verified", score: 612, dealsClosed: 22 },
  { email: "marcus@staging.greybeard.app", handle: "gb_seed_marcus_lin",    displayName: "Marcus Lin",    company: "Pacific Rim Imports",     country: "SG", tier: "verified", score: 558, dealsClosed: 14 },
  { email: "kareem@staging.greybeard.app", handle: "gb_seed_kareem_hassan", displayName: "Kareem Hassan", company: "Crescent Foods FZE",      country: "AE", tier: "provisional", score: 410, dealsClosed: 0 },
];

const FIXED_INVITE_TOKENS = {
  // RAW tokens — only used in staging. The hash is what hits the DB.
  // Print these from the seed script so QA can paste them into the URL.
  kareem: "STAGING-INVITE-KAREEM-32CHARS-MIN-AAAAAAAAAAAAAAAAAA",
  open:   "STAGING-INVITE-OPEN-32CHARS-MIN-BBBBBBBBBBBBBBBBBBBBBB",
};

export async function seed() {
  console.log("[seed] starting…");

  for (const p of SEED_PROFILES) {
    // user
    const [existingUser] = await db.select().from(users).where(eq(users.email, p.email));
    const userId = existingUser?.id ?? crypto.randomUUID();
    if (!existingUser) {
      await db.insert(users).values({ id: userId, email: p.email, name: p.displayName, emailVerified: new Date() });
    }

    // profile
    const [existingProfile] = await db.select().from(profiles).where(eq(profiles.handle, p.handle));
    if (existingProfile) {
      await db.update(profiles)
        .set({ tier: p.tier, score: p.score, dealsClosed: p.dealsClosed, displayName: p.displayName, company: p.company, country: p.country, isLive: true, liveAt: new Date() })
        .where(eq(profiles.id, existingProfile.id));
    } else {
      const [inserted] = await db.insert(profiles).values({
        userId, handle: p.handle, displayName: p.displayName, company: p.company, country: p.country,
        tier: p.tier, score: p.score, dealsClosed: p.dealsClosed, isLive: true, liveAt: new Date(),
      }).returning();
      // Genesis-ish events so /audit shows something.
      if (inserted) {
        await appendEvent({ profileId: inserted.id, type: "doc.identity", payload: { country: p.country, ok: true } });
        await appendEvent({ profileId: inserted.id, type: "screening.complete", payload: { hits: 0, ok: true } });
        await appendEvent({ profileId: inserted.id, type: "profile.live", payload: { tier: p.tier, score: p.score } });
      }
    }
    console.log(`[seed] profile ${p.handle} (${p.tier} · ${p.score})`);
  }

  // Fixed-token invites for QA
  const [adaeze] = await db.select().from(profiles).where(eq(profiles.handle, "gb_seed_adaeze_okafor"));
  for (const [name, rawToken] of Object.entries(FIXED_INVITE_TOKENS)) {
    const tokenHash = hashToken(rawToken);
    const [existing] = await db.select().from(invites).where(eq(invites.tokenHash, tokenHash));
    if (existing) {
      await db.update(invites)
        .set({ expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), consumedAt: null, consumedBy: null })
        .where(eq(invites.id, existing.id));
    } else {
      await db.insert(invites).values({
        tokenHash,
        inviterProfileId: adaeze?.id,
        groupContext: `STAGING · ${name}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }
    console.log(`[seed] invite ${name} → /verify/${rawToken}`);
  }

  console.log("[seed] done");
}

export async function reset() {
  if (process.env.GREYBEARD_ENV === "production") {
    throw new Error("refusing to reset production");
  }
  console.log("[reset] wiping all data…");
  // Order matters — children first.
  await db.execute(sql`TRUNCATE
    ledger_events, vault_shares, vault_docs, verifications,
    invites, vouches, deal_participants, deals, profiles,
    sessions, accounts, "verificationTokens", users
    RESTART IDENTITY CASCADE`);
  console.log("[reset] done");
}

// CLI: `tsx src/lib/seed.ts [reset]`
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  (async () => {
    if (arg === "reset") await reset();
    await seed();
  })().catch((e) => { console.error(e); process.exit(1); });
}
