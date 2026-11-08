# ADR 0001 — Hosting: one Render web service with Supabase PostgreSQL and Storage

- Status: Accepted (decided by linhkhanh-vu, 2026-11-07); replaces the JSON-runtime version proposed in PR #71
- Context: [`docs/build/deploy-readiness.md`](../build/deploy-readiness.md) (written before the Supabase cutover),
  [`docs/build/supabase-cutover-results.md`](../build/supabase-cutover-results.md),
  [`docs/env/supabase-quickstart.md`](../env/supabase-quickstart.md),
  [`docs/build/claude-context/07-session10-11-requirements.md`](../build/claude-context/07-session10-11-requirements.md)

## Context

Session 11 requires a public link that another team opens on a phone over mobile data to run one Must-have
flow. Since PRs #72–#74 the app (Next.js 14, Node ≥ 22) keeps all live data in **Supabase PostgreSQL**
(`src/lib/db/application-store.ts`; JSON is only the ordinary-test fixture) and private uploads in **Supabase
Storage**. The app connects with the restricted `hab_app` login (`DATABASE_APP_URL`). One piece of state still
lives inside the server process: the timer that cancels expired On hold Bookings (`startExpiryTimer`,
`src/lib/booking/expire-holds.ts`), started by the first BKG request in each process.

## Decision

1. Host the Next.js app as **one Render web service** (always-on server), **exactly one instance**, because the
   On hold expiry timer runs in the process; several instances would each run their own timer.
   - Build: `npm ci && npm run build` · Start: `npm run start` (`NODE_ENV=production`, port from `PORT`)
   - Node: `engines.node` = `22.x` in `package.json` (was `>=22`, which let Render pick Node 26; CI uses 22)
2. **Data** in Supabase PostgreSQL, **files** in Supabase Storage. Data is **not** lost on restart or redeploy.
3. **Separate databases for development and production** (two Supabase projects, or at least two databases).
   Nothing in `scripts/db/*` or the app distinguishes them: `db:seed`, `db:migrate`, `test:postgres` and
   `db:set-test-passwords` act on whatever `DATABASE_URL` / `DATABASE_APP_URL` point at. The hosted database is
   changed only by planned steps (migrate, seed once, test accounts), never during a test session
   (`docs/test/test-plan.md` §3).
4. **Login for testers**: synthetic test accounts get real passwords from environment variables through the
   manual one-off command `npm run db:set-test-passwords` (not at app start). The development-only
   "any non-empty password" login stays off in production.
5. **Email**: no email service. Registration OTP, password recovery, account creation and admin password
   reset show "Email chưa được cấu hình" and create no OTP, token, account or temporary password (EARS line in
   spec-AUT).

## Environment variables on the web service (names only)

| Name | Note |
|---|---|
| `DATABASE_APP_URL` | Required; restricted `hab_app` login of the **production** database |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Required for private files; server only, never `NEXT_PUBLIC_` |
| `SUPABASE_STORAGE_BUCKET` | Optional (default `hab-private`) |
| `DATABASE_SSL_CA_FILE` | Optional (repo CA file used when empty) |
| `DATABASE_URL` | **Not** on the web service (owner login, migrations only) |
| `HAB_EMAIL_MODE` | **Not** set in production |

The test-account passwords are needed only where `db:set-test-passwords` runs (a laptop with the production
`DATABASE_APP_URL`), not on the web service.

## Consequences (trade-offs accepted)

- **Idle sleep**: a free Render plan may sleep when idle, so the first request after a pause can be slow. The
  current free-plan behaviour and limits of Render and of Supabase (database size, pausing of inactive
  projects, storage, egress) are **to re-check** before deploying; no numbers are assumed here.
- **One instance**: no horizontal scaling until the expiry timer moves out of the process.
- **No email**: outside users cannot self-register or recover a password; they use the "[T-Khach]" test
  Agency account.
- **Shared test data**: data created by testers persists; testers prefix it with `[T-<name>]`.

## Flow for outside testers (Session 11 public link)

Use a Must flow from `docs/prd.md`, not Request Quote (Could):

- **Shortest, no login**: Guest → `/explore` → open an Experience → open its Provider (EXP F-EXPLORE-01 to 03).
- **With login** (account "[T-Khach]"): log in → Explore → Experience → "Chat với Provider" → send one message
  (IAC F-CHAT-01 to 03, core Chat is Must).

## Notice for testers (copy into the message that shares the link)

> This is a test version. Use only the test account you were given and do not enter real personal data.
> Start anything you create with [T-<your name>]. Registration and "forgot password" need email, which is not
> set up: you will see "Email chưa được cấu hình". The first page may take a while if the server was asleep.

## Alternatives not chosen

- Serverless functions: the expiry timer and long-lived database pool need a running process.
- Running the expiry as a scheduled job so several instances are possible: later, if load requires it.
- A "public demo" mode with the any-password login in production: rejected (anyone could act as HDT Admin).
