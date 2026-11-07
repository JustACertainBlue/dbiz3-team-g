# ADR 0001 — Hosting: one always-on Render web service

- Status: Accepted (decided by linhkhanh-vu, 2026-11-07)
- Context documents: [`docs/build/deploy-readiness.md`](../build/deploy-readiness.md),
  [`docs/build/claude-context/07-session10-11-requirements.md`](../build/claude-context/07-session10-11-requirements.md)

## Context

Session 11 requires a public link that another team can open on a phone over mobile data to run one
Must-have flow. The product is one Next.js 14 app (Node ≥ 22) that keeps all data in a JSON runtime file
(`.demo-data/runtime.json`, created from `data/seed/*.csv` on first use). It also relies on two things that live
inside the server process:

- a cross-process directory lock (`runtime.json.lock`) around every write; and
- an in-process timer that cancels expired On hold Bookings (`startExpiryTimer`, `src/lib/booking/expire-holds.ts`).

Uploaded files (chat attachments, registration documents, avatars, provider media) are stored next to that
file under `.demo-data/`. The PostgreSQL client (`src/lib/db/client.ts`) is not implemented.

Hosting levels considered (Session 11): static site and static + BaaS cannot run the Next.js API routes with
this file storage; serverless functions would give every request its own short-lived file system and no
timer; an always-on server keeps one process with its file and timer.

## Decision

1. Host the app as **one Render web service** (always-on server, level 5), **exactly one instance**.
   - Build: `npm ci && npm run build`
   - Start: `npm run start` (`next start`, `NODE_ENV=production`, port from the platform's `PORT`)
   - Node: `engines.node >= 22` in `package.json`
2. **Login for testers** (decision 1b): one synthetic test account per role, given real passwords at every
   start from platform environment variables. These are Agency, Provider, UBND = `thanhvien1@example.invalid`
   (Bát Tràng, an active village) and HDT. They do not need a password change. The development-only "any
   non-empty password" login stays off in production. (Implemented in a separate PR.)
3. **Email** (decision 2b): no email service. Registration OTP, password recovery, account creation and
   admin password reset show a clear "email not configured" message and create no OTP. (Separate PR, with an
   EARS line in spec-AUT.)
4. **Data** (decision 3a): no persistent storage. Data created on the hosted version is lost on every
   restart or redeploy; the app starts again from the seed.

## Consequences (trade-offs accepted)

- **Idle sleep**: on a free plan the service may sleep when idle, so the first request after a pause can be
  slow. The exact free-plan behaviour and limits are **to re-check** on Render before deploying (Session 11:
  limits change often). If it sleeps, consider a paid plan for the review and street-test weeks.
- **Data loss on restart**: Bookings, Chats, uploaded files and accounts created by testers disappear on each
  restart or redeploy. The four test accounts come back because they are recreated at start.
- **No email**: outside users cannot self-register or recover a password on the hosted version; they use the
  test accounts. The Must-have flow for outside testing is Explore → Request Quote / Chat (Agency).
- **One instance only**: scaling out would give each instance its own data file; do not add instances.
- **Explore tracking** is switched off in production (checklist §3 #58); Explore itself works.
- **Seed UBND issues** #64/#65 stay with the `data/` owner; the hosted UBND test account is `thanhvien1`.

## Notice for testers (copy into the message that shares the link)

> This is a test version. Use only the test account you were given; do not enter real personal data.
> Everything you create (bookings, chats, files) may disappear when the server restarts or is updated.
> Registration and "forgot password" need email, which is not set up: you will see "email not configured".
> The first page may take a while to open if the server was asleep.

## Alternatives not chosen

- Persistent disk (keeps data across restarts; cost and plan support to re-check). Revisit before Session 13–14
  if testers need data to survive.
- Implement PostgreSQL (`DATABASE_URL` reserved in `.env.example`): larger work, after MVP RC.
- A "public demo" mode that keeps the any-password login in production: rejected, because anyone with the
  link could act as an HDT Admin.
