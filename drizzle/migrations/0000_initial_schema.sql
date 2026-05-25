CREATE TABLE "accounts" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "deal_participants" (
	"deal_id" text NOT NULL,
	"profile_id" text NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "deal_participants_deal_id_profile_id_pk" PRIMARY KEY("deal_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"amount_cents" integer,
	"currency" text DEFAULT 'USD',
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	CONSTRAINT "deals_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"inviter_profile_id" text,
	"group_context" text,
	"invitee_phone" text,
	"consumed_at" timestamp,
	"consumed_by" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "ledger_events" (
	"seq" serial PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"hash" text NOT NULL,
	"prev_hash" text NOT NULL,
	"signature" text NOT NULL,
	"pubkey" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"company" text,
	"country" text,
	"tier" text DEFAULT 'provisional' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"deals_closed" integer DEFAULT 0 NOT NULL,
	"deals_disputed" integer DEFAULT 0 NOT NULL,
	"is_live" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"live_at" timestamp,
	CONSTRAINT "profiles_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vault_docs" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_profile_id" text NOT NULL,
	"kind" text NOT NULL,
	"storage_ref" text NOT NULL,
	"content_hash" text NOT NULL,
	"wrapped_dek" text NOT NULL,
	"iv" text NOT NULL,
	"byte_length" integer NOT NULL,
	"mime_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"doc_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"recipient_profile_id" text,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vault_shares_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "verificationTokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationTokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"step" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "vouches" (
	"id" text PRIMARY KEY NOT NULL,
	"from_profile_id" text NOT NULL,
	"to_profile_id" text NOT NULL,
	"weight" text DEFAULT 'standard' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_participants" ADD CONSTRAINT "deal_participants_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_participants" ADD CONSTRAINT "deal_participants_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_inviter_profile_id_profiles_id_fk" FOREIGN KEY ("inviter_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_consumed_by_users_id_fk" FOREIGN KEY ("consumed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_events" ADD CONSTRAINT "ledger_events_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_docs" ADD CONSTRAINT "vault_docs_owner_profile_id_profiles_id_fk" FOREIGN KEY ("owner_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_shares" ADD CONSTRAINT "vault_shares_doc_id_vault_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."vault_docs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_shares" ADD CONSTRAINT "vault_shares_recipient_profile_id_profiles_id_fk" FOREIGN KEY ("recipient_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouches" ADD CONSTRAINT "vouches_from_profile_id_profiles_id_fk" FOREIGN KEY ("from_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouches" ADD CONSTRAINT "vouches_to_profile_id_profiles_id_fk" FOREIGN KEY ("to_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invites_expires_idx" ON "invites" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "ledger_profile_seq_idx" ON "ledger_events" USING btree ("profile_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_profile_prev_hash_uq" ON "ledger_events" USING btree ("profile_id","prev_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vault_shares_expires_idx" ON "vault_shares" USING btree ("expires_at");