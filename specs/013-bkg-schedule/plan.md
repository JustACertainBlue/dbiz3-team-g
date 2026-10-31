# Implementation Plan: BKG View Schedule (US-1) and Calculated Availability (US-2)

**Branch**: `013-bkg-schedule` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md) (snapshot of `docs/spec/specs/spec-BKG.md`)

**Input**: Feature specification from `specs/013-bkg-schedule/spec.md`

## Summary

US-2: F-SCHED-09 calculates a Provider's Available, occupied (On hold / Booked) and Unavailable
periods from its operating hours and active Bookings. US-1: F-SCHED-01 shows that calendar to the
owning Local Provider (SCH139) and to Tour Agencies (SCH140, anonymised); F-SCHED-02 shows a Tour
Agency its own Bookings as a list (BKG137) and a calendar (SCH141). The Provider and Agency
navigation links are pointed at the new screens (#68, #69).

Same stack, storage and structure as `specs/011-bkg-manage` and `specs/012-bkg-list`. Two
independent phases. See [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js >= 22

**Primary Dependencies**: Next.js 14 (App Router), React 18 — already in `package.json`; no new dependency (calendar is a CSS grid, #70)

**Storage**: shared JSON runtime `src/lib/demo/json-repository.ts` (`demoRepository()`); tests use the volatile copy. No PostgreSQL. This slice only reads, except the expiry it triggers (#50, #80).

**Testing**: Vitest 2 (`npm test`), TypeScript check (`npm run lint`)

**Target Platform**: local Next.js development server on macOS and Windows, free tools only

**Project Type**: web application — the one Next.js project, collocated API routes

**Performance Goals**: none stated; range capped at 31 days (#71)

**Constraints**: `data/` and `docs/spec/` unchanged; US-3/4/5/6 behaviour unchanged (459 tests stay green); create/update checks unchanged (#81); clock injected in tests (`SEED_NOW`); demo session instead of AUT (#33); one dev server per `runtime.json`

**Scale/Scope**: seed size (8 Bookings, one operating-hours weekday per Provider); US-1 and US-2

## Scope and trace

In scope: **US-2 (P1)** F-SCHED-09 and **US-1 (P1)** F-SCHED-01, F-SCHED-02; screens SCH139,
SCH140, SCH141, BKG137; navigation links (#68, #69). Out of scope: Request Quote logic on SCH140
(links to Explore, #75); manual availability editing (#25). US-3, US-4, US-5, US-6 are on `main`.

**Phase A** (US-2 + F-SCHED-01 + SCH139/SCH140) and **Phase B** (F-SCHED-02 + SCH141/BKG137 + nav)
share no new file and are each demonstrable alone.

| Spec item | Plan element | Test level | Phase |
|---|---|---|---|
| FR-009, US-2 AS-1, #72 Available / On hold / Booked / Unavailable split, merge, `[start, end)` | `buildCalendarBlocks` (pure) | unit | A |
| US-2 AS-2, SC-003 On hold / Booked occupy | `buildCalendarBlocks` | unit | A |
| US-2 AS-3 Completed / Cancelled do not block | `buildCalendarBlocks` | unit | A |
| US-2 AS-4, AC-BKG-HOURS no hours → no Available | `buildCalendarBlocks` | unit | A |
| #32 Booking outside hours shown occupied | `buildCalendarBlocks` | unit | A |
| #77 F-SCHED-09 output (`availability_calendar`, `available_slots`, `occupied_slots`, `calculated_at`), `date_to` default | `calculateAvailability` | unit | A |
| #81 F-SCHED-09 agrees with create (Available accepted, occupied/Unavailable → Slot Unavailable) | consistency test only | unit | A |
| FR-001 defaults today .. +29, #71 validation and 31-day cap | `getProviderSchedule` | unit + API | A |
| #78 `operating_hours` seven ISO keys | `getProviderSchedule` | unit | A |
| #73 owner view carries `booking_id`; public view keys = exactly {start_at, end_at, status} (allow-list) | projection by view | unit + API | A |
| US-1 AS-1 Provider sees hours + own blocks | SCH139 | API + demo | A |
| US-1 AS-2, BR-009, SC-010 Agency view hides Agency identity, price, contact, conditions, hold expiry | SCH140 projection | unit (allow-list) + API | A |
| #74 access: Agency + Verified Provider; unknown/non-Verified → NOT_FOUND; owner → SCH139; others → FORBIDDEN | `authorizeProviderSchedule` | unit + API | A |
| #80 authorize → validate → expire → read; denied/invalid writes nothing | order in services | unit (snapshot) | A, B |
| #76 SCH139 quick actions = BKG135 rules | reuse `BookingActionsBar`, `bookingActions` | demo | A |
| #75 SCH140 Request Quote → Explore page; Select day highlights | SCH140 | demo | A |
| #82 SCH140 route; Agency-only "Xem lịch trống" link; owner redirected to SCH139 | page + link | demo | A |
| FR-002, US-1 AS-3 only own Bookings | `listAgencyBookings` | unit + API | B |
| US-1 AS-5 filters status / village / date range | `listAgencyBookings` | unit + API | B |
| #79 numbers, `provider_name` from published profile version, `village_name` | projection | unit | B |
| US-1 AS-4, SC-004 reflects latest data (#36 derived from `bookings`) | read after a status change | unit | B |
| #68 BKG137 list, SCH141 calendar, BKG138 Back → BKG137, Agency nav | screens + links | demo | B |
| #69 Provider nav Dashboard → DSH018, Schedule → SCH139 | link edits | demo | B |

## Constitution Check

*GATE: checked before Phase 0 and again after Phase 1.*

| Principle | Result | Reason |
|---|---|---|
| I. Spec is the source of truth | PASS | Rules cite FR-001/002/009, US-1/US-2 AS, BR-009, SC-003/004/010 and Closed questions #24, #25, #28–#33, #36, #50, #57, #68–#82 (#82 = SCH140 route, raised by the first plan review). |
| II. Business rules test-first | PASS (planned) | tasks.md puts a test before every code task of each trace row, incl. the #73 allow-list and the #80 denied-writes-nothing tests. |
| III. Thin vertical slice | PASS | Two phases, each end to end (service → API → screens) and demonstrable alone. |
| IV. Synthetic data, no secrets | PASS | Seed only; demo identities. |
| V. Humans approve every change | PASS | Branch `013-bkg-schedule`; agent does not push or merge; shared nav files flagged for PRF/EXP owners in the PR (#69 note). |

Post-design re-check: unchanged — data-model.md redefines no column; every route traces to FR-001/002/009 or a screen spec.

## Project Structure

### Documentation (this feature)

```text
specs/013-bkg-schedule/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/schedule-api.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/lib/booking/
├── availability.ts        # A: F-SCHED-09 buildCalendarBlocks (pure) + calculateAvailability
├── provider-schedule.ts   # A: F-SCHED-01 getProviderSchedule (owner / public view)
├── agency-bookings.ts     # B: F-SCHED-02 listAgencyBookings
├── booking-access.ts      # (011/012) + authorizeProviderSchedule (A), authorizeAgencyList (B)
├── clock.ts               # (012) hanoiDate, + addDays helper (A)
└── booking-actions.ts     # (011) reused by SCH139 (#76)
src/app/api/bkg/providers/[providerId]/schedule/route.ts   # A: GET = F-SCHED-01
src/app/api/bkg/agency/bookings/route.ts                   # B: GET = F-SCHED-02
src/app/provider/[providerId]/schedule/page.tsx            # A: SCH139
src/app/explore/providers/[id]/schedule/page.tsx           # A: SCH140 (#82)
src/app/explore/providers/[id]/page.tsx                    # A: "Xem lịch trống" link for Agencies (#82) — shared file, EXP owner
src/app/agency/[agencyId]/schedule/page.tsx                # B: SCH141
src/app/agency/[agencyId]/bookings/page.tsx                # B: BKG137
src/app/schedule-calendar/CalendarGrid.tsx                 # A: shared CSS-grid calendar (#70), reused by B
src/app/provider/[providerId]/page.tsx, edit/page.tsx      # B: nav links (#69) — shared file, PRF owner
src/app/agency/[agencyId]/page.tsx                         # B: nav links (#68) — shared file, PRF owner
src/app/agency/[agencyId]/bookings/[bookingId]/page.tsx    # B: BKG138 Back → BKG137 (#68)
tests/unit/bkg-availability*.test.ts, bkg-provider-schedule*.test.ts, bkg-agency-bookings*.test.ts,
tests/integration/bkg-schedule-api.test.ts, bkg-agency-bookings-api.test.ts
```

**Structure Decision**: same layout as 011/012. The calendar component lives in a route-less
folder (`src/app/schedule-calendar/`, no `page.tsx`) so both phases can import it; Phase B only
reuses it.

## UI choices (plan only, not in the spec)

- SCH139 and SCH140 open on FR-001's default range (today .. +29); "← 30 ngày trước / 30 ngày sau →"
  links move the range.
- SCH141 opens on today .. +29 (#71 UI choice); BKG137 has no default date (full history), with
  filters status / village / date range.
- Calendar rows (#70): one row per day, 00:00–24:00 timeline, each block with its status text.
- SCH141/BKG137 rows link to BKG138 (View booking); Chat → `/messages`.

## Complexity Tracking

| Item | Why | Consequence / when resolved |
|---|---|---|
| Login and RBAC | AUT not on `main`; #33 | Demo session; ownership enforced in code. |
| F-SCHED-09 not wired into create/update (#81) | Avoid touching 004/011 paths | Consistency test proves they agree. |
| A read that writes (expiry, #50/#80) | No background worker | After authorization and validation only; denied/invalid writes nothing (tested). |
| Shared navigation files (#69, #82) | Provider/Agency pages belong to PRF; Explore Provider page to EXP | Link-only edits; PR description asks the PRF and EXP owners to review. |
| Request Quote on SCH140 (#75) | Belongs to EXP/IAC | Link to the Explore Provider page only. |
| Denied pages answer 200 + message | Same as checklist §3 #10 | APIs answer 403/404. |
