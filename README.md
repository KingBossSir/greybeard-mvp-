# greybeard MVP

Verify once · flash anywhere. Verified identity, portable into any chat.

This is the deployable beta scaffold. The trust-layer wedge (5-step onboarding, ed25519-signed audit ledger, encrypted vault, /flash card) is **shipped**. Downstream pieces (contract drafting, escrow booking, side-channel UX, deep BO trace) are deliberately **stubbed** behind clean adapter interfaces — flip env vars or implement the marked TODOs to take them live.

## Stack

- **Next.js 15** (App Router, RSC, Server Actions) + **React 19** + **TypeScript**
- **Tailwind v4** for styling
- **Neon Postgres** + **Drizzle ORM** + signed-event ledger
- **NextAuth v5** (database sessions, magic-link via Resend)
- **@noble/ed25519** + **@noble/hashes** for the audit ledger
- **Node crypto** (AES-256-GCM envelope encryption) for the vault
- **Upstash Ratelimit** (with in-memory fallback) for abuse control
- **Vitest** for security-critical tests

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# generate secrets:
node -e "console.log('AUTH_SECRET=' + require('crypto').randomBytes(32).toString('base64'))" >> .env
node -e "console.log('LEDGER_SIGNING_KEY=' + require('crypto').randomBytes(32).toString('hex'))" >> .env
node -e "console.log('VAULT_MASTER_KEY=' + require('crypto').randomBytes(32).toString('hex'))" >> .env
# Set DATABASE_URL to your Neon connection string.
# Set RESEND_API_KEY (or leave blank — magic links log to stdout in dev).

# 3. Migrate
npm run db:generate
npm run db:migrate

# 4. Run
npm run dev          # http://localhost:3000

# 5. Test
npm test
```

Install security defaults for this repo are intentionally strict:

- Lifecycle scripts are disabled by default via `.npmrc`.
- New dependencies should be pinned exactly (`save-exact=true`) rather than floating on a caret range.
- If a vetted package truly needs a postinstall step, review it first, then run a targeted `npm rebuild <package>` instead of re-enabling scripts globally.
- Use `npm run audit` after dependency changes; it now fails on high-severity production advisories.

## Walking through the flow locally

1. `POST /api/verify/start` with `{ "groupContext": "Tema Cocoa · 800MT FOB" }`
   while signed in — get back a `/verify/<token>` URL.
2. Open the URL → click through the 5-step verification.
3. After screening clears, your profile is live. Visit `/account` (mobile view) or `/dashboard` (web).
4. `/flash`-test: `POST /api/flash` returns a server-signed payload + a card URL.

The verification flow uses **deterministic mocks** for KYC, screening, and registry lookups — set provider API keys to swap in real services.

## Deployment

See [DEPLOY.md](./DEPLOY.md). Short version: Vercel + Neon, push the `main` branch, configure env vars, run `npm run db:migrate` once.

## Security

See [SECURITY.md](./SECURITY.md) — full threat model, audit checklist, and the production gaps you must close before taking real money.

## Project layout

```
src/
├─ app/                          # Next.js routes (RSC + Server Actions)
│  ├─ verify/[token]/{step}/    # 5-step onboarding
│  ├─ account/                  # mobile account home (post-onboard)
│  ├─ dashboard/                # desktop dashboard + audit log + settings
│  ├─ card/[id]/                # public card view (where /flash links land)
│  └─ api/                      # /flash, ledger export, vault, WhatsApp webhook
├─ components/                   # IosFrame, ProfileCard, Button, VMark, StepHeader
├─ lib/
│  ├─ schema.ts                 # Drizzle schema (single source of truth)
│  ├─ db.ts                     # Neon client
│  ├─ ledger.ts                 # ed25519-signed append-only ledger
│  ├─ crypto.ts                 # AES-256-GCM envelope encryption + tokens
│  ├─ vault.ts                  # local + S3 drivers, share-link issuance
│  ├─ kyc.ts                    # Trulioo adapter (mock by default)
│  ├─ screening.ts              # ComplyAdvantage adapter (mock by default)
│  ├─ registry.ts               # company registry fixtures
│  ├─ whatsapp.ts               # Meta Cloud API + signature verification
│  ├─ geo.ts                    # 3-signal cross-check + sanctioned-region stop
│  ├─ score.ts                  # trust score composition
│  ├─ ratelimit.ts              # Upstash + memory fallback
│  ├─ validators.ts             # zod schemas — input validation at the boundary
│  ├─ auth.ts                   # NextAuth v5 (magic-link)
│  └─ actions.ts                # Server Actions for each verification step
└─ tests/                        # vitest — ledger, signing, score, geo, crypto
```

## What's shipped vs stubbed

Matches the MVP scope document:

**Shipped:** 5-step onboarding · KYC adapter · GPS+IP+SIM cross-check ·
sanctioned-region hard-stop · vault (envelope encryption) · ed25519 ledger ·
profile card · /flash endpoint · web dashboard · audit-log export · 3 tiers.

**Stubbed (real interfaces, mock impls):** Trulioo · ComplyAdvantage ·
WhatsApp Cloud API · S3 driver · deep BO trace · contract drafting · escrow
wire-instruction generation.

**Deferred:** Native apps · Telegram/SMS · AI negotiation · public counterparty graph.
