# Implementation Plan: BKG Create Booking (US-4)

**Branch**: `004-bkg-core` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md) (snapshot of `docs/spec/specs/spec-BKG.md`)

**Input**: Feature specification from `specs/004-bkg-core/spec.md`

## Summary

A Local Provider creates a Booking for an Agency after negotiation (F-SCHED-03, screen BKG134).
Every new Booking starts On hold with `hold_expires_at = created_at + 72h`, blocks the Provider's
time slot immediately and is visible to the Agency at once. Before committing, the system
re-checks the requested interval against the Provider's operating hours and all On hold/Booked
Bookings of that Provider; a conflict is rejected with Slot Unavailable and writes nothing.

The slice runs on the shared JSON runtime already used by AIT, PRF and EXP. Rules that
`data/schema.sql` would enforce in PostgreSQL (exclusion constraint, CHECKs, capacity trigger,
single transaction) become application code, each with its own test. See [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js >= 22

**Primary Dependencies**: Next.js 14 (App Router), React 18 — already in `package.json`; no new dependency

**Storage**: shared JSON runtime `src/lib/demo/json-repository.ts` (`demoRepository()`): `data/seed/*.csv` copied to `.demo-data/runtime.json`; tests use the volatile copy (`NODE_ENV=test`). No PostgreSQL in this slice; `data/schema.sql` stays the canonical schema.

**Testing**: Vitest 2 (`npm test`), TypeScript check (`npm run lint`)

**Target Platform**: local Next.js development server on macOS and Windows, free tools only

**Project Type**: web application — one Next.js project with collocated API routes

**Performance Goals**: none stated in the spec; no target invented

**Constraints**: `data/` and `docs/spec/` unchanged; one Node process (the write lock is in-process); clock injected in tests (seed time `2026-09-30T00:00:00+07:00`); demo session instead of AUT

**Scale/Scope**: seed size (8 Providers with operating hours, 8 Bookings); US-4 only

## Scope and trace

In scope: **US-4 (P1) Create Booking** — F-SCHED-03, screen BKG134, plus the part of F-SCHED-09
needed for the conflict check (operating-hours fit and occupied intervals).

Out of scope: US-1 View Schedule (F-SCHED-01/02), US-2 View Calculated Availability (full
F-SCHED-09 calendar), US-3 View Bookings (F-SCHED-07, BKG135), US-5 Manage Booking
(F-SCHED-04/05/06/08, expiry worker), US-6 List Bookings (F-SCHED-10, BKG133).

| Story / rule | What this slice does | Verified by |
|---|---|---|
| US-4 AS-1, BR-003 | New Booking has status On hold | unit test on create service |
| FR-003 output, BR-009 | Output has exactly the FR-003 fields; `public_schedule_block` exposes only `start_at`, `end_at`, `status` | unit + API test |
| US-4 AS-2, BR-004, AC-BKG-HOLD | `hold_expires_at = created_at + 72h` from the injected clock | unit test |
| US-4 AS-3, BR-005 | The new interval is occupied immediately: a second overlapping create fails | unit test |
| US-4 AS-4, BR-012 (create only); spec #36 | Agency view derived from `bookings` by `agency_id`; no separate copy (research R2) | unit test: row readable by `agency_id` right after create |
| US-4 AS-5, FR-003, AC-BKG-RACE; spec #40, #41 | Conflict with operating hours or an On hold/Booked Booking (an expired On hold still blocks) → Slot Unavailable, nothing written; touching intervals allowed; two concurrent creates on one interval → one commit | unit + concurrency test |
| US-4 AS-6, BR-001 | Only Local Provider creates; Tour Agency, ADMIN (HDT/UBND), Guest → denied, nothing written | unit + API test |
| US-4 AS-6, BR-001 (screen BKG134) | `canOpenCreateBooking(session, providerId)` gates the page: only the Local Provider whose `providerId` matches the URL | unit test (analyze M1) |
| FR-003 input `source_chat_session_id` | Stored as given when present, empty when absent; Chat pre-fill itself is deferred (Complexity Tracking) | unit test (analyze H2) |
| BR-018; spec #37 | Provider `Verified` and its user `account_status = Active`; Experience owned by that Provider and not archived | unit test per failing condition |
| spec #39 | Selected Agency's user `account_status = Approved`; any other status (seed has `Approved` and `Disabled`; `Pending Approval`/`Rejected` built in the test fixture) → rejected, nothing written | unit test + API test: non-Approved Agency → `AGENCY_NOT_ELIGIBLE`, `bookings` and `booking_status_history` unchanged |
| spec #38 | `duration_minutes` any value > 0, independent of the Experience's duration | unit test: a duration different from the Experience's is accepted |
| BR-019 | Booking row + initial history row (null → On hold) in one persist; a failed persist leaves neither | unit test with failing persist |
| BR-020; spec #42 | `end_at = start_at + duration_minutes`; `conditions_snapshot` prefilled from the Experience, may be adjusted, shape validated | unit test |
| OQ #7, #8; schema CHECKs | `group_size` 1..`max_participants`; `agreed_price_total` > 0 (total, VND); `duration_minutes` > 0 | unit tests at boundaries |
| AC-BKG-HOURS; Clarifications #28, #29, #31 | Whole `[start_at, end_at)` inside one window of that ISO weekday in Asia/Ho_Chi_Minh; no hours → no available period | unit test |
| Clarification #30 | No notice-period check at creation | unit test: start sooner than notice period still accepted |

## Constitution Check

*GATE: checked before Phase 0 and again after Phase 1.*

| Principle | Result | Reason |
|---|---|---|
| I. Spec is the source of truth | PASS | Every rule above cites an FR/BR/AS/AC or a Closed open question of `docs/spec/specs/spec-BKG.md`. Every point the spec did not state is now Closed in spec §10 #36–#43 (research.md §Decisions recorded in the spec); none remains open. |
| II. Business rules test-first | PASS (planned) | tasks.md must place one test task before each code task for every row of the trace table; tests run red before code. Rules PostgreSQL would enforce get their own tests because the JSON runtime enforces none of them. |
| III. Thin vertical slice | PASS | One user story (US-4) end to end: BKG134 page → `POST /api/bkg/bookings` → service → JSON runtime. Other stories listed out of scope. |
| IV. Synthetic data, no secrets | PASS | Reads only `data/seed/*.csv` through the repository; no keys; demo identities are synthetic seed accounts. |
| V. Humans approve every change | PASS | Work on branch `004-bkg-core`; agent does not push or merge; PR reviewed by a non-author. |

Post-design re-check (after Phase 1): unchanged — data-model.md redefines no column, contracts trace to FR-003 only.

## Project Structure

### Documentation (this feature)

```text
specs/004-bkg-core/
├── spec.md              # read-only snapshot (start_feature.py)
├── plan.md              # this file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── create-booking-api.md
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

Same single Next.js project as AIT/PRF/EXP (see `specs/001-exp-core/plan.md`). No second scaffold.

```text
src/lib/booking/
├── clock.ts               # injectable "now" (default: wall clock; tests pass the seed time)
├── operating-hours.ts     # ISO weekday + local time in Asia/Ho_Chi_Minh; whole-interval fit
├── conflicts.ts           # overlap of [start_at, end_at) with On hold/Booked of one provider
├── write-lock.ts          # in-process mutex around check + write
└── create-booking.ts      # F-SCHED-03 service: role, eligibility, validation, conflict, persist
src/lib/demo/json-repository.ts   # add one method that applies several table writes and persists once
src/app/api/bkg/bookings/route.ts # POST = F-SCHED-03
src/app/provider/[providerId]/bookings/new/page.tsx   # BKG134 Create Booking
tests/unit/bkg-*.test.ts          # rule tests (service level, injected clock, volatile repository)
tests/integration/bkg-create-api.test.ts   # through the route handler, incl. do-it-twice
```

**Structure Decision**: booking rules live in `src/lib/booking/` like `src/lib/explore/` and
`src/lib/prf/`; the API route and page follow the existing `src/app/api/*` and
`src/app/provider/[providerId]/*` patterns. The only change to shared code is one additive
repository method (single-persist batch), needed for BR-019.

## Complexity Tracking

| Item | Why | Consequence / when resolved |
|---|---|---|
| Login and deployment | Out of scope until Session 11; AUT is not on `main` | Demo session (`hab_demo_account`, `src/lib/auth/demo-session.ts`). Role checks still tested for every role. |
| JSON runtime instead of PostgreSQL | Team decision B1: keep the one runtime shared by AIT/PRF/EXP | EXCLUDE, hold/end CHECKs, capacity trigger, conditions CHECK and the transaction become app code + tests. |
| Single persist instead of a database transaction (BR-019; analyze H1) | Repository has no transactions; team decision 2026-10-30 to keep the one-persist design | New batch method writes `bookings` + `booking_status_history` and persists once; in-memory state changes only after the write succeeds, so the result is both-or-neither but not a database transaction. Known limitation in `mvp-alpha-checklist.md` §3; spec Clarification #44 to be added in the next spec change. |
| In-process mutex (AC-BKG-RACE) | No database lock | Safe for one Node process only; two processes on one `runtime.json` can still race. Recorded as a Known limitation. |
| Chat auto-message and F-SCHED-08 sync | Belong to US-5 | FR-003 output `private_schedule_synced` reflects the derived Agency view only; no `chat_messages` row is written in this slice. |
| Chat pre-fill of BKG134 (FR-003 "may pre-fill"; analyze H2) | Needs Chat context from IAC/US-5 | `source_chat_session_id` is accepted and stored as given; nothing is pre-filled from Chat in this slice. Deferred to US-5 / IAC. |
| Open Questions #26/#27 (Booking Event persistence, `audit_log_id`) | Needed by F-SCHED-04/08 | Deferred to US-5. |
| Open Question #33 (Agency booking-read permission) | Only needed for F-SCHED-02/07 | Not needed for US-4. |
| BKG134 navigation | Success goes to BKG135 (US-3), Cancel to BKG133 (US-6), both out of scope | Per spec #43 the page shows the created Booking (id, status, hold expiry) in place; Cancel returns to the Provider page. |
| No expiry worker | US-5 | Per spec #40 an On hold Booking past `hold_expires_at` keeps blocking its slot until the worker exists (research R6). |
| Race test does not prove the write lock (AC-BKG-RACE) | Check and write are one synchronous block today, so T015 passes even without the lock (build-log §4) | US-5 must add the async-pause race test before adding any await inside the booking write lock. |
