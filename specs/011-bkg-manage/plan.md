# Implementation Plan: BKG Manage Booking (US-5) and View Bookings (US-3)

**Branch**: `011-bkg-manage` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md) (snapshot of `docs/spec/specs/spec-BKG.md`)

**Input**: Feature specification from `specs/011-bkg-manage/spec.md`

## Summary

US-5: the Local Provider updates Booking details (F-SCHED-04), confirms or cancels (F-SCHED-05),
marks group arrival (F-SCHED-06); On hold Bookings expire automatically after 72 hours; every
event (create, update, status change, arrival, expiry) syncs the Agency through one Chat
"Booking Update" message (F-SCHED-08). US-3: Provider and Agency open a Booking Detail with
status-appropriate buttons (F-SCHED-07).

Same stack, storage and structure as `specs/004-bkg-core`. Every rule the JSON runtime does not
enforce is application code with its own test. See [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js >= 22

**Primary Dependencies**: Next.js 14 (App Router), React 18 — already in `package.json`; no new dependency

**Storage**: shared JSON runtime `src/lib/demo/json-repository.ts` (`demoRepository()`); one atomic persist per event (spec #44); tests use the volatile copy (`NODE_ENV=test`). No PostgreSQL.

**Testing**: Vitest 2 (`npm test`), TypeScript check (`npm run lint`)

**Target Platform**: local Next.js development server on macOS and Windows, free tools only

**Project Type**: web application — the one Next.js project, collocated API routes

**Performance Goals**: none stated in the spec; FR-008 "within seconds" is met because sync happens in the same write

**Constraints**: `data/` and `docs/spec/` unchanged; one Node process per `runtime.json`; clock injected in tests (seed time `2026-09-30T00:00:00+07:00`); demo session instead of AUT

**Scale/Scope**: seed size (8 Bookings, 8 chat sessions); US-5 and US-3 only

## Scope and trace

In scope: **US-5 (P1) Manage Booking** (F-SCHED-04/05/06/08, 72-hour expiry) and **US-3 (P1)
View Bookings** (F-SCHED-07; screens BKG135, BKG138, BKG144, BKG136).

Out of scope: US-1 View Schedule (F-SCHED-01/02, SCH139/SCH140/SCH141, DSH018), US-2 View
Calculated Availability (full F-SCHED-09 calendar), US-6 List Bookings (F-SCHED-10, BKG133).
US-4 is on `main` (`specs/004-bkg-core`).

Two independent phases: **Phase US-5** is demonstrable through the API alone; **Phase US-3** adds
the screens on top of it.

### Phase US-5

| Story / rule | What this slice does | Verified by |
|---|---|---|
| AC-BKG-RACE (build-log §4) | Test-only `afterConflictCheck` async pause in create and in F-SCHED-04 time changes; race test fails without `withBookingWriteLock`, passes with it — written **before** any `await` enters the lock | unit test + mutation run |
| BR-001, US-5 AS-7, SC-005, SC-006 | Only the owning Local Provider updates, changes status, marks arrival; Agency, UBND, HDT, Guest denied, nothing written | unit + API test |
| BR-007 | F-SCHED-04 rejects a status field; F-SCHED-05 changes only status | unit test |
| BR-011, SC-008, US-5 AS-5 | Completed/Cancelled reject every mutation | unit test |
| F-SCHED-04; #47, #48, #6, #7, #42, BR-020 | Allowed fields only; On hold/Booked only; start/duration change re-checks hours (#29, #31) and overlap excluding itself; `end_at` recomputed; `hold_expires_at` kept; group <= max | unit test |
| F-SCHED-04; #27 | One `audit_logs` row (`booking.update`, before/after) in the same persist | unit test |
| F-SCHED-05; FR-005, #10, #45, AC-BKG-COMPLETE; US-5 AS-1, AS-2 | On hold → Booked only while `now < hold_expires_at`; On hold/Booked → Cancelled with reason; never Completed; other transitions rejected | unit test |
| F-SCHED-06; BR-010, FR-006, #11; US-5 AS-4 | Booked and `now >= start_at` → Completed, `arrival_at`, `availability_released`; otherwise `Booking Not Booked` / `Tour Start Time Not Reached`, nothing written | unit test |
| BR-019, #44 | Status + `updated_at` + one history row in one persist; injected persist failure leaves neither | unit test |
| BR-004, #40, #45, #46, AC-BKG-EXPIRY | `expireDueHolds(now)`: due On hold → Cancelled, `changed_by` empty, fixed reason; idempotent; confirm vs expiry at the deadline → exactly one transition, one message | unit test |
| F-SCHED-08; FR-008, BR-012, #13, #26, #27, #36, #49; US-5 AS-6 | One `Booking Update` message per event (create, update, status, arrival, expiry), #49 template, FR-008 Chat order, Agency `unread_count` +1, `recipient_read_status` derived; never a second Active Chat per pair | unit + API test |
| F-SCHED-03 (create, from 004) | Create now also sends the Booking Update message (closes 004 Known limitation #7) | existing 004 tests stay green + new test |

### Phase US-3

| Story / rule | What this slice does | Verified by |
|---|---|---|
| US-3 AS-1, AS-2, FR-007 | Provider sees own Booking with `agency_contact`; Agency sees own Booking read-only with `provider_profile_link`; fields as FR-007 §5.1 | unit + API test |
| US-3 AS-3, BR-002, BR-008 | Another Agency's Booking → denied | unit + API test |
| US-3 AS-4, BR-014 | HDT, UBND, Guest → denied | unit + API test |
| BR-017, US-3 AS-5, SC-007 | `bookingActions(status, now, start_at, actor)` pure function, every FR-007 matrix row | unit test |
| Screens BKG135, BKG138, BKG144, BKG136 | Pages use the US-5 API and the action function; BKG134 navigates to BKG135 after create | browser demo path (quickstart) |

## Constitution Check

*GATE: checked before Phase 0 and again after Phase 1.*

| Principle | Result | Reason |
|---|---|---|
| I. Spec is the source of truth | PASS | Every rule cites FR/BR/AS/AC or a Closed spec question (#6–#13, #26–#56). The points the spec did not state are Closed as #50–#56 (research.md §Decisions recorded in the spec). |
| II. Business rules test-first | PASS (planned) | tasks.md must put a test task before every code task for each trace row; the race test comes before any `await` in the lock. |
| III. Thin vertical slice | PASS | Two stories, each end to end: US-5 through the API, US-3 through the screens; US-1/2/6 out of scope. |
| IV. Synthetic data, no secrets | PASS | Seed only; demo identities are seed accounts; no keys. |
| V. Humans approve every change | PASS | Branch `011-bkg-manage`; agent does not push or merge; shared-file changes flagged for their owners. |

Post-design re-check: unchanged — data-model.md redefines no column; every contract route traces to F-SCHED-04/05/06/07.

## Project Structure

### Documentation (this feature)

```text
specs/011-bkg-manage/
├── spec.md              # read-only snapshot (start_feature.py)
├── plan.md              # this file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── manage-booking-api.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

Extends `specs/004-bkg-core`; no new scaffold.

```text
src/lib/booking/
├── create-booking.ts      # (004) + afterConflictCheck test hook + Booking Update message on create
├── booking-access.ts      # load a Booking and check actor ownership (Provider / Agency) — BR-001/002/014
├── update-booking.ts      # F-SCHED-04
├── change-status.ts       # F-SCHED-05
├── mark-arrival.ts        # F-SCHED-06
├── expire-holds.ts        # expireDueHolds(now) + dev timer start
├── agency-sync.ts         # F-SCHED-08: resolve Chat, build #49 message, participant rows
├── booking-detail.ts      # F-SCHED-07 projection
└── booking-actions.ts     # BR-017 pure button-state function
src/lib/demo/json-repository.ts   # extend the batch to inserts + updates in one persist (shared file)
src/app/api/bkg/bookings/[bookingId]/route.ts           # GET = F-SCHED-07, PATCH = F-SCHED-04
src/app/api/bkg/bookings/[bookingId]/status/route.ts    # POST = F-SCHED-05
src/app/api/bkg/bookings/[bookingId]/arrival/route.ts   # POST = F-SCHED-06
src/app/provider/[providerId]/bookings/[bookingId]/page.tsx          # BKG135
src/app/provider/[providerId]/bookings/[bookingId]/edit/page.tsx     # BKG144
src/app/provider/[providerId]/bookings/[bookingId]/arrival/page.tsx  # BKG136
src/app/agency/[agencyId]/bookings/[bookingId]/page.tsx              # BKG138
tests/unit/bkg-*.test.ts, tests/integration/bkg-*.test.ts
```

**Structure Decision**: same layout as 004. Expiry runs at the start of every BKG service call
and, in the dev server, on a timer (research R3). Shared files touched: `json-repository.ts`
(AIT/PRF/EXP owners review); `commercial-handoff-service.ts` is **not** changed.

## Complexity Tracking

| Item | Why | Consequence / when resolved |
|---|---|---|
| Login and deployment | Out of scope until Session 11; AUT not on `main` | Demo session (`hab_demo_account`); ownership checked by `provider_id` / `agency_id`. Seed `role_permissions` (OQ #33, Open) are not enforced by the prototype. |
| One persist instead of a DB transaction (#44) | JSON runtime has no transactions | Every event writes Booking, history, audit and Chat rows in one persist; nothing kept on failure. |
| Batch with updates in a shared file | F-SCHED-04/05/06 update existing rows | `json-repository.ts` batch extended additively; AIT/PRF/EXP owners must review; 350 existing tests must stay green. |
| In-process lock | No database lock | Two Node processes on one `runtime.json` are not protected. |
| Expiry worker on the JSON runtime | No background process | `expireDueHolds(now)` runs at the start of every BKG request and on a dev-server timer. The dev-server expiry timer is per process; idempotent expiry (#46) keeps two processes safe, but only one dev server should run on one `runtime.json`. |
| First request after `demo:reset` expires seed On hold `54d7a276…` | Its hold ended 2026-10-01 | Demo data changes on the first BKG request (Cancelled + one message in Chat `14390b41`/`70efa801`); expected, documented in quickstart. |
| No Agency/Provider Booking list (US-6, US-1) | Out of scope | BKG135/BKG138 are opened from BKG134, the Provider page link, or by URL (#54). |
| `commercial-handoff-service.ts` `message_kind` values not in schema | Belongs to AIT/IAC | Recorded in research.md only; not fixed here. BKG writes only `Booking Update`. |
| Chat pre-fill of BKG134 | Needs IAC | Still deferred (004 H2). |
