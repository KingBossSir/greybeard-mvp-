# Staging environment

A `staging` branch deploys to `https://staging.greybeard.app` with completely separate secrets, DB, and (when wired) WhatsApp number. Two flavors are supported:

1. **Cloud staging** — Vercel preview + Neon branch (recommended; auto-deployed by CI)
2. **Self-hosted staging** — `docker-compose.staging.yml` for a one-VM box

## How it differs from prod

| | Prod | Staging |
| --- | --- | --- |
| URL | `greybeard.app` | `staging.greybeard.app` |
| `GREYBEARD_ENV` | `production` | `staging` |
| DB | Neon `main` branch | Neon `staging` branch (separate data) |
| Signing key | prod `LEDGER_SIGNING_KEY` | **different** — staging chain doesn't verify against prod pubkey |
| Vault master key | prod | **different** — staging vault doesn't decrypt prod blobs |
| KYC / screening | real (Trulioo, ComplyAdvantage) | mocked by default (set `*_API_KEY=mock`) |
| WhatsApp | prod WABA | Meta test number, or unset |
| Robots | indexable | `noindex, nofollow` (vercel.json + meta) |
| Visual marker | none | orange banner: **STAGING — TEST DATA ONLY** (from `EnvBanner`) |
| `/api/staging/seed` endpoint | 404 | gated by `STAGING_OPS_TOKEN` |

## One-time setup — cloud staging

1. **Neon branch**
   ```bash
   neonctl branches create --name staging --project-id <your-project>
   neonctl connection-string staging --pooled  # use this for STAGING_DATABASE_URL
   ```
2. **Vercel**
   - Same project as prod.
   - Add `staging` branch to *Settings → Git → Production Branch overrides* as a **Preview** branch.
   - Add domain `staging.greybeard.app` → assign to Preview deployments.
3. **GitHub Environment**
   - *Settings → Environments → New: `staging`* (optionally with a required reviewer for migrations).
   - Secrets:
     - `VERCEL_TOKEN` — from vercel.com/account/tokens
     - `STAGING_DATABASE_URL` — the Neon `staging` connection string
     - `STAGING_OPS_TOKEN` — `openssl rand -hex 32`
4. **Vercel project env vars** (Preview scope)
   - Copy every key from `.env.staging.example` and fill in.
   - Generate `AUTH_SECRET` / `LEDGER_SIGNING_KEY` / `VAULT_MASTER_KEY` **fresh** — never reuse prod values.

That's it. Push to `staging` → CI runs `typecheck`, `test`, `audit`, migrates Neon, deploys Vercel, smoke-tests `/api/health`, then reseeds fixtures.

## Self-hosted staging

For a board demo on a single Hetzner box, or for an offline-friendly local stack:

```bash
cp .env.staging.example .env.staging
# fill in the 3 secrets + Resend key, leave provider keys as "mock"

npm run staging:up           # docker compose up -d
npm run db:migrate           # against the in-compose Postgres
npm run db:seed              # populate fixtures

open http://localhost:3000
```

Bring it down with `npm run staging:down`. The `-v` flag in that script destroys the volumes — explicit by design so you don't carry stale data across sessions.

## Reseed staging data

Vercel staging:
```bash
curl -X POST "https://staging.greybeard.app/api/staging/seed?reset=1" \
  -H "x-ops-token: $STAGING_OPS_TOKEN"
```

Local:
```bash
npm run db:reset && npm run db:seed
```

Fixtures created by the seed:

| Handle | Tier | Score | Email (magic-link login) |
| --- | --- | --- | --- |
| `gb_seed_adaeze_okafor` | charter | 742 | adaeze@staging.greybeard.app |
| `gb_seed_daniel_aluko` | verified | 612 | daniel@staging.greybeard.app |
| `gb_seed_marcus_lin` | verified | 558 | marcus@staging.greybeard.app |
| `gb_seed_kareem_hassan` | provisional | 410 | kareem@staging.greybeard.app |

Plus two fixed invite tokens for QA — see `src/lib/seed.ts:FIXED_INVITE_TOKENS`. Each one is reusable; the seed clears `consumedAt` on every run.

## What staging is **not** for

- Load testing → spin up a separate `loadtest` Neon branch + Vercel project. Staging is for human QA at low traffic.
- Real KYC submissions → mocks are on by default. Don't flip them unless you're piloting a vendor.
- Sending real WhatsApp messages to real numbers → use Meta's test number.

## Promoting staging → prod

```bash
git checkout main
git merge --ff-only staging
git push origin main      # triggers .github/workflows/deploy-prod.yml (TODO)
```

CI does not currently auto-deploy prod. Add `deploy-prod.yml` (mirror of `deploy-staging.yml` against the `production` environment) once you're past beta.
