import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  uniqueIndex,
  index,
  primaryKey,
  serial,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

/* ────────────────────────────────────────────────────────────────────────────
 * AUTH (NextAuth v5 Drizzle adapter shape)
 * ──────────────────────────────────────────────────────────────────────────── */

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (a) => ({ pk: primaryKey({ columns: [a.provider, a.providerAccountId] }) })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (v) => ({ pk: primaryKey({ columns: [v.identifier, v.token] }) })
);

/* ────────────────────────────────────────────────────────────────────────────
 * GREYBEARD CORE
 * ──────────────────────────────────────────────────────────────────────────── */

/** Profile = the verified ID a user owns. One per user. */
export const profiles = pgTable(
  "profiles",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Public handle: gb_7k3n_q92f_ae10 */
    handle: text("handle").notNull().unique(),
    displayName: text("display_name").notNull(),
    company: text("company"),
    country: text("country"), // ISO-3166 alpha-2
    tier: text("tier", { enum: ["provisional", "verified", "charter"] }).notNull().default("provisional"),
    score: integer("score").notNull().default(0),
    dealsClosed: integer("deals_closed").notNull().default(0),
    dealsDisputed: integer("deals_disputed").notNull().default(0),
    isLive: boolean("is_live").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    liveAt: timestamp("live_at"),
  },
  (t) => ({ userIdx: uniqueIndex("profiles_user_idx").on(t.userId) })
);

/** Invitation token issued by an inviter — short-lived, single-use. */
export const invites = pgTable(
  "invites",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Hash of the bearer token. Raw token only exists in the WhatsApp deep link. */
    tokenHash: text("token_hash").notNull().unique(),
    inviterProfileId: text("inviter_profile_id").references(() => profiles.id, { onDelete: "set null" }),
    groupContext: text("group_context"), // e.g. "Tema Cocoa · 800MT FOB"
    inviteePhone: text("invitee_phone"), // E.164, optional
    consumedAt: timestamp("consumed_at"),
    consumedBy: text("consumed_by").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ expiresIdx: index("invites_expires_idx").on(t.expiresAt) })
);

/** Verification step state for the 5-step flow. */
export const verifications = pgTable("verifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  step: text("step", {
    enum: ["identity", "liveness", "location", "company", "screening"],
  }).notNull(),
  status: text("status", {
    enum: ["pending", "in_progress", "passed", "failed", "review"],
  }).notNull().default("pending"),
  /** Provider IDs, scores, hashes — never raw PII. */
  result: jsonb("result").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

/** Vault entries: encrypted document metadata. Bytes live in S3/local. */
export const vaultDocs = pgTable("vault_docs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerProfileId: text("owner_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  kind: text("kind", {
    enum: ["passport", "national_id", "proof_of_funds", "company_doc", "esg_cert", "bl", "other"],
  }).notNull(),
  /** Storage location (s3 key or local path). Opaque to clients. */
  storageRef: text("storage_ref").notNull(),
  /** SHA-256 of plaintext content. */
  contentHash: text("content_hash").notNull(),
  /** Per-doc data encryption key, wrapped by master key. */
  wrappedDek: text("wrapped_dek").notNull(),
  /** AES-GCM IV (hex, 12 bytes). */
  iv: text("iv").notNull(),
  byteLength: integer("byte_length").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Time-bounded share grants for vault docs. */
export const vaultShares = pgTable(
  "vault_shares",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    docId: text("doc_id").notNull().references(() => vaultDocs.id, { onDelete: "cascade" }),
    /** Hash of the share token. */
    tokenHash: text("token_hash").notNull().unique(),
    recipientProfileId: text("recipient_profile_id").references(() => profiles.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ expIdx: index("vault_shares_expires_idx").on(t.expiresAt) })
);

/** The append-only, ed25519-signed audit ledger. */
export const ledgerEvents = pgTable(
  "ledger_events",
  {
    /** Monotonic per-profile ordering. */
    seq: serial("seq").primaryKey(),
    profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // e.g. "card.flashed", "profile.live", "screening.complete"
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    /** SHA-256(prevHash || canonicalize(payload)) — hex. */
    hash: text("hash").notNull(),
    /** SHA-256 of previous event for this profile (or 64 zeros for genesis). */
    prevHash: text("prev_hash").notNull(),
    /** Ed25519 signature of `hash`, hex. */
    signature: text("signature").notNull(),
    /** Public key used to sign — allows key rotation. */
    pubkey: text("pubkey").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    profileSeqIdx: index("ledger_profile_seq_idx").on(t.profileId, t.seq),
    profilePrevHashUq: uniqueIndex("ledger_profile_prev_hash_uq").on(t.profileId, t.prevHash),
  })
);

/** Deals — minimal MVP shape. */
export const deals = pgTable("deals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  reference: text("reference").notNull().unique(), // e.g. SPA-2026-0520-TMA
  title: text("title").notNull(),
  status: text("status", { enum: ["draft", "signed", "escrowed", "closed", "disputed"] })
    .notNull()
    .default("draft"),
  amountCents: integer("amount_cents"),
  currency: text("currency").default("USD"),
  createdBy: text("created_by").notNull().references(() => profiles.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

export const dealParticipants = pgTable(
  "deal_participants",
  {
    dealId: text("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["buyer", "seller", "agent", "observer"] }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.dealId, t.profileId] }) })
);

/** Vouches given between profiles. Cap enforced in application logic. */
export const vouches = pgTable("vouches", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  fromProfileId: text("from_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  toProfileId: text("to_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  weight: text("weight", { enum: ["standard", "charter"] }).notNull().default("standard"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Profile = InferSelectModel<typeof profiles>;
export type LedgerEvent = InferSelectModel<typeof ledgerEvents>;
export type VaultDoc = InferSelectModel<typeof vaultDocs>;
export type Invite = InferSelectModel<typeof invites>;
