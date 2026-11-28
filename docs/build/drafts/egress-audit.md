# Supabase egress audit (28/11/2026)

Symptom: org Free locked at 29.3 GB / 5 GB egress, 99% "Shared Pooler Egress" (query results pulled from PostgreSQL through the pooler), Storage 0.5%. PROD with almost no users still used 0.1–3 GB/day; DEV more.

**Evidence labels.** *Measured* = counted by `tests/unit/egress-budget.test.ts` with `tests/helpers/counting-store.ts`, which wraps the fixture store and charges each call the way `AsyncPostgresStore` behaves (rows and `JSON.stringify` bytes; seed data, so absolute numbers are small). *Inferred* = read from code, not run. *Not verified*: anything about real PROD/DEV volumes. DEV/PROD are locked (402) and were not contacted; `.env*` were not read.

## 1. Root cause in one paragraph

`AsyncPostgresStore.all(name)` is `SELECT * FROM <table>`, and `find`, `update`, `remove`, `transaction`, `snapshot` and every `applyBatch` update read the **whole table** and apply the predicate in JavaScript. Callers use these on tables that only grow (`bookings`, `sessions`, `chat_messages`, `explore_*`). So egress per request ∝ table size, and anything that runs on a timer or a 10-second poll multiplies it.

## 2. Periodic work

| Job | Where | Frequency | Reads per run (before) |
|---|---|---|---|
| Hold-expiry scanner | `src/instrumentation.ts` → `startExpiryTimer` (`expire-holds.ts`) | 60 s, per server process, 1440 runs/day | `expireDueHolds` → `withBookingWriteLock` (transaction + 13 advisory locks) → `all('bookings')` **whole table**, filtered in JS. Runs even when no booking is On hold. |
| Browser polling | `AutoRefresh` (agency schedule, agency bookings list/detail, provider booking detail) and `/messages` chat (`startPolling`, 10 s while the tab is visible) | 360 requests/hour per open tab | each refresh re-renders a server page: auth + `loadExploreRuntime` (16 tables) + `expireDueHolds` (whole bookings) + chat reads |
| Other `setInterval` | `register/otp` page (client countdown) | — | none (no DB) |

No other server-side timers exist (`grep setInterval src`). Every read path that lists bookings also calls `expireDueHolds` (`list-bookings`, `provider-schedule`, `booking-detail`, `agency-bookings`), so the whole-table read was paid per page view too.

## 3. Data layer, per request

| Operation | Tables read whole (before) | Measured rows / bytes (before) | after |
|---|---|---|---|
| Sweeper tick, nothing due | `bookings` + 13-table lock | 8 / 5,747 B | **0 / 0**, no lock, no transaction |
| Sweeper tick, one due | bookings ×2, experiences, agency_profiles, chat_sessions ×3, chat_messages, chat_participants ×2 | 99 / 45,421 B | 86 / 38,106 B (bookings scanned once, by the guarded UPDATE only) |
| Auth on every request (`productSessionFromRequest`) | `sessions`, `user_accounts` ×2, `agency_profiles` | 69 / 34,849 B | **4 / 2,090 B** (keyed `WHERE`) |
| `/messages` chat poll (`getChatHistory`) | `chat_messages` ×2, chat_sessions, chat_participants ×2, user_accounts, chat_attachments, stored_files | 148 / 51,358 B | 71 / 24,548 B (messages, attachments, files keyed) |
| `loadExploreRuntime()` (explore, villages, village, provider, agency bookings, free slots, AIT matching) | 16 tables incl. `explore_sessions`, `explore_interactions`, **every `password_hash`** | 211 / 79,370 B | cold 195 / 61,312 B; warm = live tables only |
| `/explore` render (loaded the snapshot **twice**: page + `demoRuntime()`) | 2 × 16 tables | 422 / 158,740 B | cold 211 / 69,706 B; **warm 66 / 24,826 B** |
| `/admin` | `loadBookings`, `loadChatSessions`, `loadAgencies`, `loadProviders`, provider versions, `booking_status_history`, `user_accounts`, villages, review queue tables (inferred from `src/lib/adm/v3-loaders.ts`, `pending-service.ts`) | not measured | unchanged (still whole tables) |
| `/ai-matching` | `loadExperiences` (experiences, providers, versions, villages) + `loadExploreRuntime` + `matching_messages` / `matching_sessions` (inferred) | not measured | explore part cached; matching sessions/messages now keyed (messages of all agencies by `sender` still read) |

Large or unbounded tables that are **not** read by any `all()` today: `audit_logs`, `notifications` (grep shows no whole-table read), good. `sessions` was read whole on every authenticated request; fixed.

## 4. Ranking of sources (estimated, PROD idle, no users)

Bytes/row from the seed: bookings ≈ 718 B. Sweeper = 1440 × rows × 718 B per process per day (formula measured, row counts of PROD **not verified**):

| bookings rows in the DB | sweeper/day before | after |
|---|---|---|
| 8 (seed) | 8.3 MB | ≈ 0.4 MB (query overhead only, assumed ~300 B × 1440) |
| 500 | 0.52 GB | ≈ 0.4 MB |
| 2,000 | 2.07 GB | ≈ 0.4 MB |

This reproduces PROD's 0.1–3 GB/day with no users for a few hundred to a few thousand bookings, **so the sweeper is the #1 suspect for PROD (inferred, not verified)**. Each DEV server process runs its own sweeper and each open tab adds polling, hence DEV > PROD.

1. Hold-expiry scanner (whole `bookings`, 1440×/day/process).
2. Polling pages: per refresh ≈ 288 rows / 119.9 KB before (explore snapshot 79.4 KB + auth 34.8 KB + expireDueHolds 5.7 KB, seed scale) → 43 MB per open tab-hour; after ≤ 27 KB (explore warm 24.8 KB as an upper bound + auth 2.1 KB) → ≤ 9.7 MB per tab-hour, and it no longer grows with `sessions`/`explore_*`.
3. Auth on every request, including every image/API call from a page (`sessions` whole table).
4. `/explore` double snapshot with unbounded `explore_interactions`.
5. `chat_messages` whole table per chat poll and per send.
6. Admin dashboard whole-table loaders (not changed in this PR).

## 5. Scripts and tests that open a real database

- `npm run test:postgres` (`scripts/db/test.mjs`): hosted tests, only when run by hand; fixtures roll back. Not part of `npm test`/CI.
- `npm run test:storage`, `storage:*`, `db:*` (`check`, `audit`, `migrate`, `seed`, `content-load`, `set-test-passwords`): one-off, hand-run.
- `scripts/smoke-auth.mjs`: HTTP against `HAB_SMOKE_ORIGIN` (default localhost), so it hits the DB through whatever server it targets.
- `npm test` (all 2608 tests), `npm run lint`, `npm run build`: fixtures / no DB. CI (`.github/workflows/ci.yml`) has no DB secrets.
- A dev server (`npm run dev`) with `DATABASE_APP_URL` set is the main background reader: scanner + any open tab.

## 6. What changed (all behind unchanged behaviour)

- `ApplicationStore.where / project / dueHolds` (SQL-side filters) with a fall-back for hand-made test stores.
- Sweeper: `dueHolds` query (`status='On hold' AND hold_expires_at <= $1`), quiet path returns before taking any lock; 72 h rule untouched.
- Auth, chat messages/attachments/files, booking paid-message checks, matching sessions/messages: keyed `WHERE`.
- `loadExploreRuntime({ sessions? })`: no session/interaction tables unless asked, accounts without secrets, catalog tables in a 30 s in-process cache (`HAB_READ_CACHE_SECONDS`, 0 under tests), dropped on any write by the same process; `/explore` and `/api/explore/session` load once.
- `HAB_DISABLE_SCHEDULERS=1` switches the scanner off (default ON; reads still expire holds).

Known limits: another server instance sees a catalog change after ≤ 30 s; `bookings` is still read whole by explore/admin/schedule loaders; the Admin dashboard loaders are untouched; DB-side index on `bookings(status, hold_expires_at)` not added (needs a migration, a human call).
