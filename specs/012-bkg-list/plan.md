# Implementation Plan: BKG List Bookings (US-6)

**Branch**: `012-bkg-list` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md) (snapshot of `docs/spec/specs/spec-BKG.md`)

**Input**: Feature specification from `specs/012-bkg-list/spec.md`

## Summary

US-6: the Local Provider sees its own Bookings in one management list (F-SCHED-10), filtered by
status and date range, ordered by scheduled start, with the Bookings that need its action
highlighted, and opens a Booking's detail (F-SCHED-07, BKG135, already on `main`). Screens:
BKG133 Booking Management and a minimal DSH018 with only the "Own booking action summary" (#65).

Same stack, storage and structure as `specs/011-bkg-manage`. The list is one read-only service
that reuses `bookingActions` (#59) and the existing expiry (#64). See [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js >= 22

**Primary Dependencies**: Next.js 14 (App Router), React 18 — already in `package.json`; no new dependency

**Storage**: shared JSON runtime `src/lib/demo/json-repository.ts` (`demoRepository()`); tests use the volatile copy (`NODE_ENV=test`). No PostgreSQL. This slice only reads, except the expiry it triggers (#64), which already exists.

**Testing**: Vitest 2 (`npm test`), TypeScript check (`npm run lint`)

**Target Platform**: local Next.js development server on macOS and Windows, free tools only

**Project Type**: web application — the one Next.js project, collocated API routes

**Performance Goals**: none stated in the spec; seed size makes in-memory filtering enough

**Constraints**: `data/` and `docs/spec/` unchanged; US-3/US-4/US-5 behaviour unchanged (427 tests stay green); clock injected in tests (`SEED_NOW` = `2026-09-30T00:00:00+07:00`); demo session instead of AUT; one dev server per `runtime.json`

**Scale/Scope**: seed size (8 Bookings, 2 of them for demo Provider `50f2c8fc…`); US-6 only

## Scope and trace

In scope: **US-6 (P1) List Bookings** — F-SCHED-10; screens BKG133 (`/provider/{providerId}/bookings`,
#66) and a minimal DSH018 (`/provider/{providerId}/dashboard`, #65: `status_counts`, number of
Bookings with `requires_action`, Bookings button → BKG133).

Out of scope: US-1 View Schedule (F-SCHED-01/02, SCH139/SCH140/SCH141, BKG137 Agency booking list,
and the DSH018 profile, schedule and conversation panels), US-2 View Calculated Availability (full
F-SCHED-09 calendar). US-3, US-4 and US-5 are on `main` (`specs/004-bkg-core`, `specs/011-bkg-manage`)
and are reused, not changed.

| Spec item | Plan element | Test level |
|---|---|---|
| AS-1, FR-010 own Bookings only, SC-011 | `listProviderBookings` filters `provider_id` from the session | unit + API |
| AS-1, #60 ascending `start_at`, tie `booking_id` | sort in the service | unit |
| AS-2, #62 status / date filters (local date of `start_at`, inclusive) | filter in the service; `hanoiDate` helper | unit + API |
| #62 `date_from > date_to` → 400; bad date / bad status → 400 | `validateListQuery` | unit + API |
| #63 `page` >= 1, `page_size` 1–100, else 400; page beyond last → empty + `total_count` | paging in the service | unit + API |
| #61 `status_counts` (Provider + date range, all four keys) and `total_count` (all filters) | counts in the service | unit |
| AS-3, #59, SC-011 `requires_action` = `bookingActions(...).confirm \|\| .mark_arrival` | reuse `src/lib/booking/booking-actions.ts` | unit |
| FR-010 `hold_expires_at` only for On hold | row projection | unit |
| §5.1 types: `group_size`, counts are JSON numbers (#57 lesson) | row projection | unit + API (`typeof … === 'number'`) |
| #64 expiry before listing; just-expired hold listed Cancelled, `requires_action` false | `expireDueHolds(now)` after authorization | unit |
| #64/#67 order: authorize → expire → read; denied request writes nothing | service order | unit (snapshot of bookings, history, chat rows) |
| AS-5, #67, BR-001/BR-002/BR-014 Agency, UBND, HDT, Guest, other `provider_id` → 403 | `authorizeProviderList` | unit + API |
| AS-4 select → F-SCHED-07 | BKG133 row link → BKG135 (on `main`) | demo |
| AS-6 explicit empty state | BKG133 empty panel | demo |
| #65 DSH018 summary over all of the Provider's Bookings | `providerBookingSummary` reusing the list service | unit + demo |
| #66 BKG133 route; Provider pages' Bookings links → BKG133; Agency link unchanged | page + link edits | demo |
| SC-011 highlight not by colour alone | "Cần xử lý" label + marker | demo |

## Constitution Check

*GATE: checked before Phase 0 and again after Phase 1.*

| Principle | Result | Reason |
|---|---|---|
| I. Spec is the source of truth | PASS | Every rule cites FR-010, AS-1..AS-6, SC-011, a BR or a Closed spec question (#31, #50, #57, #59–#67). Field sources follow `data/02-crud-matrix.md` (F-SCHED-10 reads BKG, AGY, EXP). The two UI choices (default date, label text) are presentation only and listed as such. |
| II. Business rules test-first | PASS (planned) | tasks.md must put a test task before every code task for each trace row above, including the denied-read-writes-nothing test and the `typeof … === 'number'` assertions. |
| III. Thin vertical slice | PASS | One story end to end: service → API → BKG133 → BKG135 (existing), plus the DSH018 panel that reads the same service. |
| IV. Synthetic data, no secrets | PASS | Seed only; demo identities are seed accounts; no keys. |
| V. Humans approve every change | PASS | Branch `012-bkg-list`; agent does not push or merge; no shared runtime file is changed. |

Post-design re-check: unchanged — data-model.md redefines no column; every contract route traces to F-SCHED-10 or DSH018 (#65).

## Project Structure

### Documentation (this feature)

```text
specs/012-bkg-list/
├── spec.md              # read-only snapshot of docs/spec/specs/spec-BKG.md
├── plan.md              # this file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── list-bookings-api.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

Extends `specs/011-bkg-manage`; no new scaffold.

```text
src/lib/booking/
├── list-bookings.ts       # F-SCHED-10: validate query, authorize, expire, filter, sort, count, page
├── booking-actions.ts     # (011) reused for requires_action (#59)
├── booking-access.ts      # (011) + authorizeProviderList(session, providerId?) (#67)
├── clock.ts               # (004) + hanoiDate(timestamp) for #62
└── expire-holds.ts        # (011) expireDueHolds(now), reused (#64)
src/app/api/bkg/bookings/route.ts                     # + GET = F-SCHED-10 (POST unchanged)
src/app/provider/[providerId]/bookings/page.tsx       # BKG133 (server component, gate + filters)
src/app/provider/[providerId]/dashboard/page.tsx      # DSH018 booking action summary only
src/app/provider/[providerId]/page.tsx                # Bookings link → BKG133 (#66)
src/app/provider/[providerId]/edit/page.tsx           # Bookings link → BKG133 (#66)
tests/unit/bkg-list-*.test.ts, tests/integration/bkg-list-api.test.ts
```

**Structure Decision**: same layout as 011. BKG133 is a server component that calls the list
service directly with the demo session (like BKG135); filters are GET query parameters of the page
URL, so no client state is needed.

## UI choices (plan only, not in the spec)

- BKG133 opens with `date_from` = today in Asia/Ho_Chi_Minh; a "Xoá bộ lọc" link removes all filters to
  show past Bookings. The API has no default date.
- Each row: date and time, Agency, Experience, pax, status, hold expiry for On hold, a "Cần xử lý"
  label for `requires_action` (text, not colour alone, SC-011), and Detail → BKG135.
- Buttons: Create → BKG134, Messages → `/messages`. Previous/next page links; page size = API default 20.
- Empty state text for zero Bookings and for a filter that matches none (AS-6).
- DSH018 is reached by URL (no other DSH018 panel exists yet); its Bookings button opens BKG133.

## Complexity Tracking

| Item | Why | Consequence / when resolved |
|---|---|---|
| Login and deployment | Out of scope until Session 11; AUT not on `main` | Demo session (`hab_demo_account`); ownership by `provider_id`. Seed `role_permissions` (OQ #33, Open) are not enforced. |
| Filtering in memory | JSON runtime has no query engine | Whole `bookings` table read per request; fine at seed size; PostgreSQL will use `bookings_provider_start_idx`. |
| A read that writes (expiry, #64) | Expiry has no background worker (#50) | The list runs `expireDueHolds(now)` after authorization; a denied request writes nothing (tested). |
| Denied pages answer HTTP 200 with a message | Same as BKG134/135 (checklist §3 #10) | API answers 403; pages render no Booking data. |
| DSH018 other panels | Belong to PRF, SCH, CHAT | Only the booking action summary is built (#65). DSH018 is reached by URL; the shared Provider navigation (DSH018/EXP067/BKG133/SCH139/COM065) is not built in this slice. |
| BKG137 Agency list | US-1 / F-SCHED-02 | Agency `/bookings` link stays as it is (#66); checklist §3 #11 stays open. |
