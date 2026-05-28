# Deploying greybeard MVP (Vercel + Neon)

## One-time setup

1. **Neon Postgres**
   - Create a project at https://neon.tech.
   - Copy the *pooled* connection string (`?sslmode=require&pgbouncer=true`).
2. **Upstash Redis** (rate limiting)
   - Create a free Redis DB; grab `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. Optional for dev — required for prod.
3. **Generate secrets locally** (don't commit):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # AUTH_SECRET
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"     # LEDGER_SIGNING_KEY
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"     # VAULT_MASTER_KEY
   ```

## Deploy to Vercel

1. `vercel link` (or import the repo from the dashboard).
2. Add **every** variable from `.env.example` in **Project → Settings → Environment Variables**.
   Mark `LEDGER_SIGNING_KEY`, `VAULT_MASTER_KEY`, `AUTH_SECRET`, and `WHATSAPP_APP_SECRET` as **Encrypted** and **Production only**.
   The app will also accept `NEXTAUTH_SECRET` and Vercel-style `POSTGRES_URL*` aliases, but standardizing on `AUTH_SECRET` + `DATABASE_URL` keeps the deploy easier to reason about.
   Deploys use npm's built-in `min-release-age=7`, so versions published within the last 7 days are rejected during `npm ci`.
3. Apply DB migrations once:
   ```bash
   DATABASE_URL=... npm run db:migrate
   ```
4. Push to `main`. Vercel builds and deploys.

## Hardening checklist before flipping to public beta

| Item | Status |
| --- | --- |
| Real KYC provider wired (`TRULIOO_API_KEY` set, mock disabled) | ☐ |
| Real screening provider wired (`COMPLY_ADVANTAGE_API_KEY` set) | ☐ |
| `VAULT_DRIVER=s3` with KMS-encrypted bucket, deny-public bucket policy, lifecycle rules | ☐ |
| WhatsApp WABA approved + webhook URL registered + `WHATSAPP_APP_SECRET` set | ☐ |
| `LEDGER_SIGNING_KEY` rotated; pubkey published on a static `.well-known/greybeard.json` | ☐ |
| Magic-link domain DKIM/SPF/DMARC configured | ☐ |
| Rate limits validated (Upstash dashboard shows traffic) | ☐ |
| Postgres backups: Neon point-in-time enabled, tested restore | ☐ |
| Logs scrubbed of PII (no email, document hash, IP in info logs) | ☐ |
| Penetration test or bug-bounty engagement scheduled | ☐ |
| Privacy policy + terms link from landing | ☐ |
| `robots` allowed once you're ready to be indexed (currently `noindex`) | ☐ |

## Operational runbooks

### A user's chain reports `broken`
1. Sign in as the profile owner, then open `/api/ledger/<profileId>` — the `chain: broken` field will appear with the broken seq number.
2. Check Neon for the row at that seq: did a manual edit happen? (Should be impossible — Postgres has no UPDATE/DELETE grant for the app role.)
3. If the row was tampered, snapshot the chain, rotate the signing key, and notify the user.

### Key rotation
The ledger records the `pubkey` used to sign each event. To rotate:
1. Generate a new 32-byte seed.
2. Set `LEDGER_SIGNING_KEY` to the new value (keep the old in a vault).
3. Subsequent events sign with the new key; old events still verify against their stored pubkey.
4. Publish both pubkeys on `.well-known/greybeard.json`.

### A vault doc was downloaded from an old share link
Cannot happen — share tokens are marked `usedAt` on first download (atomic in the consumer). If you suspect abuse, query `vault_shares` for `usedAt > expiresAt` (zero rows expected).
