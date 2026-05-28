# greybeard MVP — Security Audit & Threat Model

Status: **internal beta**. This document is the audit checklist for going to public beta and, later, production money flows.

---

## 1. Trust assumptions

| What you trust | Why |
| --- | --- |
| The hosting provider (Vercel) | Reasonable; no untrusted code runs on the same VM. |
| Neon Postgres TLS + at-rest encryption | Industry standard; AES-256, AWS-backed. |
| WhatsApp Cloud API signing | Meta signs every webhook with HMAC-SHA-256 using your app secret. |
| The single ledger signing key | High-value secret. Rotate quarterly; publish old + new pubkeys. |
| Trulioo / ComplyAdvantage (when live) | We pass them PII. Vendor SOC 2 review required before flip. |

## 2. STRIDE per surface

### 2.1 Verification webview (`/verify/<token>/…`)

| Threat | Mitigation |
| --- | --- |
| **S**poofing — attacker uses someone else's invite token | Token is 256-bit `base64url` (32 bytes from `crypto.randomBytes`). Stored only as HMAC-SHA-256 hash; raw token never logged. Single-use: bound to the first user that consumes it (`invites.consumedBy`). |
| **T**ampering — replay of an old screening verdict | Each step is appended as a ledger event. The chain is recomputable from any auditor — replay would change the chain hash. |
| **R**epudiation — user denies submitting their passport | Doc hash + provider ref + ed25519-signed event. |
| **I**nformation disclosure — passport ends up in browser cache | We never render passport bytes back. Documents are uploaded → base64 in the request → encrypted to vault. Server actions never return them. CSP `default-src 'self'`; no third-party scripts. |
| **D**enial of service | Rate limit at `verifyStart` (5/10min/IP) and per-step (20/10min/IP). |
| **E**levation of privilege — invitee promotes to charter | Tier transitions go through `actions.ts` only; client cannot set tier or score. Score recomputed server-side from immutable inputs. |

### 2.2 Vault (`/lib/vault.ts`, `/api/vault/[docId]`)

- **Envelope encryption.** Each document gets a fresh AES-256-GCM DEK; DEK is wrapped under `VAULT_MASTER_KEY`. In production, swap the wrap step for AWS KMS `Encrypt` (the interface is ready — see `crypto.ts:wrapKey`).
- **Auth tag verification** on every decrypt — tampered ciphertext throws.
- **Path traversal:** `LocalDriver.resolve()` rejects `..` / `/` / `\` in storage refs.
- **Short-lived share links:** 24h default, single-use (`vault_shares.usedAt` flips on first consume via an atomic update), no enumeration (token in URL is the only capability — `docId` path param is a sanity check).
- **No directory listing:** S3 driver TODO is documented; you MUST enable bucket-public-access-block before the S3 flip.
- **PII at rest:** documents encrypted; metadata in Postgres (`vault_docs`) contains *only* the storage ref, content hash, kind, mime, and byte length — no filename, no extracted text.

### 2.3 Audit ledger (`/lib/ledger.ts`)

- **Append-only contract** at the application layer. Production tightening: revoke `UPDATE` and `DELETE` on `ledger_events` for the app DB role.
- **Hash chain.** `hash = SHA-256(prevHash || canonicalize(payload))`. `canonicalize` is sorted-key deterministic JSON so external auditors can recompute.
- **Signature.** `ed25519(hash, LEDGER_SIGNING_KEY)`. The pubkey is stored per row so key rotation doesn't break old events.
- **Chain verification.** `verifyChain()` walks the entire chain; `/api/ledger/:id` exposes an authenticated owner export with `chain: "verified" | "broken"`.
- **Race condition.** Concurrent writes to the same profile are constrained by a unique `(profile_id, prev_hash)` index, and the app retries on that conflict to preserve a single chain head.

### 2.4 WhatsApp webhook (`/api/webhook/whatsapp`)

- **Signature first.** `verifyWebhookSignature` is called before *any* parsing or side effects. Uses `timingSafeEqual` to prevent timing oracles.
- **Raw-body read.** `req.text()` then `JSON.parse(raw)`. We must NOT use `req.json()` directly — Meta signs the exact byte sequence.
- **Reflective auth.** GET handshake compares `hub.verify_token` against an env var (not a request value).
- **Rate limited** (120/min/IP) so a flood can't ping our DB.

### 2.5 Auth (NextAuth v5)

- **Local browser access only.** No passwords and no email delivery path in this build. Creating access on `/signin` provisions a user + profile and stores a signed session cookie in the browser.
- **JWT sessions** keep the auth surface small while email/recovery is intentionally disabled.
- **Per-deployment `AUTH_SECRET`** signs auth cookies and doubles as the token pepper for invite/share hashing (see `crypto.ts:hashToken`). Rotation invalidates all outstanding bearer tokens — design choice, document it.
- **Tradeoff:** this beta does not have cross-device recovery. If a user clears their browser session, the access cookie is gone.
- **CSP / `frame-ancestors 'none'`** prevents login-form embedding.

### 2.6 Headers (middleware + `next.config.ts`)

- HSTS preload, COOP, CORP, `X-Frame-Options: DENY`, `Permissions-Policy` opts out of microphone/payment.
- CSP with per-request nonce (`middleware.ts`). `script-src 'self' 'nonce-…' 'strict-dynamic'` — no inline script execution.
- `style-src 'unsafe-inline'` is required by Tailwind hydration; if you replace with extracted CSS you can tighten this.

### 2.7 Input validation

- Every server action and API route parses with **zod** (`validators.ts`).
- Image uploads capped at 8 MB; vault docs at 25 MB; reject non-allowlisted mime types.
- All ID fields (country, phone) validated against strict regex.

### 2.8 Rate limiting

- Per-endpoint sliding windows in `ratelimit.ts`. Upstash Redis in prod; in-memory fallback in dev (single-instance only — **DO NOT** ship to multi-instance prod without Upstash configured).

### 2.9 Logging

- Structured logs only at `info` level avoid PII.
- **TODO before prod:** wire OpenTelemetry exporter and add a log-scrubber middleware that strips `email`, `documentBase64`, `frameHashes`, `Authorization`, `Cookie`.

---

## 3. Cryptographic dependencies

| Library | Version | Purpose | Notes |
| --- | --- | --- | --- |
| `@noble/ed25519` | ^2.2 | Ledger signing | Audited, no native deps. Requires explicit sha-512 binding. |
| `@noble/hashes` | ^1.7 | SHA-256/512 | Audited. |
| `node:crypto` | builtin | AES-256-GCM, HMAC, CSPRNG | OpenSSL-backed. |
| `next-auth` | 5.0-beta | Sessions | Beta — pin version, watch CVE feed. |

Run `npm audit --omit=dev` before each release (`npm run audit`).

Repo-level npm defaults are hardened in `.npmrc`:

- `ignore-scripts=true` to block lifecycle-script execution during install by default.
- `save-exact=true` so newly added dependencies are pinned, not widened by caret ranges.
- `engine-strict=true` to fail fast on unsupported Node/npm runtimes.

If a reviewed package genuinely needs a postinstall hook, run a targeted `npm rebuild <package>` after review instead of globally re-enabling install scripts.

Current npm audit status for this repo:

- Critical and high-severity advisories were cleared by upgrading `next`, `next-auth`, `drizzle-orm`, `drizzle-kit`, and `postcss`.
- Remaining production finding: `next` currently bundles `postcss@8.4.31`, which still triggers GHSA-qx2v-qp2m-jg93 in `npm audit` even on the latest published `next` line checked during this audit.
- Remaining dev-only finding: latest `drizzle-kit` still pulls `@esbuild-kit/esm-loader` / `@esbuild-kit/core-utils`, which in turn retain the older `esbuild` advisory path.
- Treat both as tracked upstream dependencies and re-check on every `next` / `drizzle-kit` release before public beta.

## 4. Out-of-scope (intentional)

These are deferred per the MVP scope doc — listed here so reviewers know they aren't oversights:

- Smart escrow / blockchain. We use Postgres-backed signed events; smart contracts add attack surface without changing the trust story.
- Public counterparty graph. Privacy minefield; deferred.
- Native iOS/Android. Webview only. The PWA `manifest.json` is a future addition.
- AI/LLM in the critical path. Slash-only by design — every command is deterministic.

## 5. Privacy posture

- Documents: encrypted at rest, only the encrypted blob crosses the wire to the storage driver. Plaintext exists in process memory for the encrypt/decrypt operation only.
- Selfie video: **never stored**. Per spec, only frame hashes + match score reach the server. Confirm in `liveness/page.tsx` and `kyc.ts`.
- IP addresses: logged in `card.flashed` payloads. Those entries remain private to the profile owner in the authenticated ledger export; still document this in the privacy policy or strip before commit if your jurisdiction requires it.
- Right-to-erasure: cascade deletes (`onDelete: "cascade"`) on the `users` table reach profile, verifications, vault docs, ledger events. The encrypted blobs in S3/local require a separate sweep — **TODO: implement `eraseUser(userId)` that walks `vault_docs` and deletes storage refs**.

## 6. Audit log of this audit

| Date | Reviewer | Finding | Resolution |
| --- | --- | --- | --- |
| 2026-05-25 | codex | Upgraded direct dependencies to clear critical/high npm advisories | Landed in `package.json` + `package-lock.json` |
| 2026-05-25 | codex | Residual moderate npm audit findings remain in latest upstream `next` / `drizzle-kit` | Tracked in §3 pending upstream releases |
| 2026-05-24 | initial-build | TODO log scrubber | Tracked in §2.9 |
| 2026-05-24 | initial-build | TODO eraseUser sweep | Tracked in §5 |
| 2026-05-24 | initial-build | TODO S3 driver implementation | Tracked in DEPLOY.md hardening |
