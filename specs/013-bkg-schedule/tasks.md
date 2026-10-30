---
description: "Task list for BKG US-1 View Schedule and US-2 View Calculated Availability"
---

# Tasks: BKG View Schedule (US-1) and Calculated Availability (US-2)

**Input**: Design documents from `specs/013-bkg-schedule/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/schedule-api.md](contracts/schedule-api.md), [quickstart.md](quickstart.md)

**Tests**: Required by the constitution (Principle II). Every test task comes before the code task it checks and is run and **seen failing because the code is missing** before that code task starts. No test is edited to make it pass.

**Organization**: two independent phases, each demonstrable alone. **Phase A** — US-2 F-SCHED-09 (`[US2]`) and US-1 F-SCHED-01 (`[US1]`) with SCH139, SCH140 and the Explore link (#82). **Phase B** — US-1 F-SCHED-02 (`[US1]`) with BKG137, SCH141, navigation (#68, #69) and BKG138 Back. US-3..US-6 are on `main` and are not changed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[US1]** / **[US2]**: user story of the task

## Shared test fixtures

All values from `data/seed/` through the volatile repository (`NODE_ENV=test`); `now` injected.

- `SEED_NOW` = `2026-09-30T00:00:00+07:00`
- Provider `DEMO_IDENTITIES.provider` = `50f2c8fc…` (Bát Tràng, Verified, open **Monday 08:00–17:00**); its Booked `4bf17b30…` (Mon 2026-10-05 09:00–10:00, Agency `ebf4fcfa…` Hồng Hà) and Booked `5782011c…` (Sat 2026-10-10 09:00–10:00, outside hours, #32)
- Provider `70efa801…` (Vạn Phúc, Verified, open **Tuesday 08:00–17:00**): Booked `0d7cb86c…` (Tue 2026-10-06 09:00–10:15), On hold `54d7a276…` (Sun 2026-10-11 09:00–10:15, Agency `14390b41…`, hold until `2026-10-01T08:00:00+07:00`)
- Provider `3a5d2ffc…` (Hạ Thái, **Pending Verification**) — non-Verified case (#74)
- Agency `DEMO_IDENTITIES.agency` = Tràng An `02e568d8…`: seed Completed `0971a1b6…` (Phú Vinh `0858b5e8…`, 2026-09-26 09:00–10:30); Agency Hồng Hà session = `{ ...DEMO_IDENTITIES.agency, agencyId: 'ebf4fcfa…' }`
- Hold fixtures are created with `createBooking(DEMO_IDENTITIES.provider, …, { now })` using the **same `now`** as the call that checks them (012 lesson); Monday slots between 09:00 and 15:00
- Write snapshot for #80: deep copy of `bookings`, `booking_status_history`, `chat_messages`, `chat_sessions`, `chat_participants`

---

## Phase 1: Setup

- [X] T001 Confirm `.specify/feature.json` points to `specs/013-bkg-schedule`; run `npm ci`, `npm test` (baseline 459 passed), `npm run lint`, `uv run tools/start_feature.py --check`; record the baseline in `docs/build/build-log.md`

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: date helpers and the two access checks, in files both phases touch (`clock.ts`, `booking-access.ts`), so Phase A and Phase B never edit the same file afterwards.

### Tests first

- [X] T002 [P] Date helper tests in `tests/unit/bkg-schedule-dates.test.ts` for `addDays(date, n)` and `isQueryDate(value)` in `src/lib/booking/clock.ts`: `addDays('2026-10-01', 29)` = `'2026-10-30'`, `addDays('2026-12-31', 1)` = `'2027-01-01'`; `isQueryDate('2026-10-05')` true, `'2026-13-01'`, `'2026-02-30'`, `'05/10/2026'`, `''` false (#62, #71)
- [X] T003 [P] Access tests in `tests/unit/bkg-schedule-access.test.ts` for `authorizeProviderSchedule(session, providerId)` and `authorizeAgencyList(session)` in `src/lib/booking/booking-access.ts` (#74, #33, BR-002, BR-008): owner Provider on `50f2c8fc…` → `'owner'`; Tour Agency on `50f2c8fc…` → `'public'`; Tour Agency on `3a5d2ffc…` (Pending Verification) and on `no-such-provider` → `NOT_FOUND`; Provider `50f2c8fc…` on `70efa801…`, UBND, HDT, Guest → `FORBIDDEN`; `authorizeAgencyList`: Tour Agency → its `agencyId`; Local Provider, UBND, HDT, Guest → `FORBIDDEN`
- [X] T004 Run `npx vitest run tests/unit/bkg-schedule-dates.test.ts tests/unit/bkg-schedule-access.test.ts`; confirm they fail because the functions are missing; paste the output into `docs/build/build-log.md`

### Code

- [X] T005 [P] Add `addDays` and `isQueryDate` to `src/lib/booking/clock.ts` (makes T002 pass)
- [X] T006 [P] Add `authorizeProviderSchedule` and `authorizeAgencyList` to `src/lib/booking/booking-access.ts` (makes T003 pass)
- [X] T018 [P] Shared calendar component `src/app/schedule-calendar/CalendarGrid.tsx` (no `page.tsx`; moved here by analyze H1 so Phase A and Phase B share no task): one row per day, 00:00–24:00 timeline, blocks sized by duration with a status text label (not colour only), narrow-screen chip list (#70); props `days`, `blocks` (`status` is any string, shown as written, so SCH141 can show Completed and Cancelled too — analyze M2), optional `selectedDate`, optional `hrefFor(block)`

**Checkpoint**: 459 + T002/T003 green; `CalendarGrid` exists for both phases.

---

## Phase 3 (Phase A): US-2 Availability + US-1 Provider Schedule (Priority: P1) 🎯

**Goal**: F-SCHED-09 calculates the calendar; F-SCHED-01 shows it on SCH139 (owner) and SCH140 (Agencies, #82).

**Independent Test**: quickstart §2 (API) and §3 (screens).

### Tests for Phase A (write all, run, see them fail)

- [X] T007 [P] [US2] Block tests in `tests/unit/bkg-availability.test.ts` for `buildCalendarBlocks(hours, bookings, dateFrom, dateTo, view)` in `src/lib/booking/availability.ts` (#72, FR-009): for `50f2c8fc…` on 2026-10-05 (owner view) the day is exactly Unavailable 00:00–08:00, Available 08:00–09:00, Booked 09:00–10:00 with `booking_id` `4bf17b30…`, Available 10:00–17:00, Unavailable 17:00–24:00 (`+07:00` timestamps, half-open, next day starts at 00:00 of 10-06); on 2026-10-06 (Tuesday, no hours) one Unavailable block 00:00–24:00 (US-2 AS-4, AC-BKG-HOURS); on 2026-10-10 Booked 09:00–10:00 inside Unavailable (#32); a Cancelled and a Completed Booking on a Monday leave Available (US-2 AS-3); two adjacent Available ranges are merged; no hours at all → no Available block in the range
- [X] T008 [P] [US2] F-SCHED-09 output tests in `tests/unit/bkg-availability.test.ts` for `calculateAvailability(providerId, { date_from, date_to? }, now)`: `date_to` omitted → one day; `availability_calendar` deep-equals `buildCalendarBlocks` for the range; `available_slots` = the Available blocks' `{start_at, end_at}`; `occupied_slots` = `{booking_id, start_at, end_at, status}` of On hold / Booked; `calculated_at` = `now` (#77); creating an On hold fixture on 2026-10-12 09:00 (same `now`) makes that hour occupied (US-2 AS-2, SC-003)
- [X] T009 [P] [US2] Consistency test in `tests/unit/bkg-availability-consistency.test.ts` (#81): for `50f2c8fc…` at `SEED_NOW`, every slot is **taken from** `calculateAvailability(...)` (analyze M4, so the red run fails on the missing module): the first hour of the first `available_slots` entry of 2026-10-12 → `createBooking` returns `On hold`; the `occupied_slots` entry of 2026-10-05 (start + 30 min) → `SLOT_UNAVAILABLE`; the first hour of the Unavailable block starting 2026-10-12 17:00 → `SLOT_UNAVAILABLE`; the first hour of 2026-10-13 08:00 inside the all-day Unavailable block (Tuesday) → `SLOT_UNAVAILABLE`
- [X] T010 [P] [US1] F-SCHED-01 tests in `tests/unit/bkg-provider-schedule.test.ts` for `getProviderSchedule(session, providerId, query, { now })` in `src/lib/booking/provider-schedule.ts`: no dates at `SEED_NOW` → blocks from 2026-09-30 to 2026-10-29 inclusive (30 days); `date_from > date_to`, a 32-day span, malformed dates → `VALIDATION_ERROR`, a 31-day span accepted (#71); `operating_hours` has keys `'1'`…`'7'`, `'1'` = `[{ local_start: '08:00:00', local_end: '17:00:00' }]`, the others `[]` (#78); owner view of 2026-10-05 has `booking_id` on the Booked block (#73)
- [X] T011 [P] [US1] Public-view allow-list tests in `tests/unit/bkg-provider-schedule.test.ts` (#73 human note, US-1 AS-2, BR-009, SC-010): as Tour Agency on `50f2c8fc…` for 2026-10-01..2026-10-31, **every** block's `Object.keys(...).sort()` equals `['end_at', 'start_at', 'status']` exactly; the serialized response contains no Agency id, agency name, agreed price or hold expiry of any seed Booking
- [X] T012 [P] [US1] Order tests in `tests/unit/bkg-provider-schedule.test.ts` (#80): owner of `70efa801…` at `2026-10-02T00:00:00+07:00` for 2026-10-11 → `54d7a276…` was expired first, so 2026-10-11 is Unavailable all day with no On hold block; **denied requests write nothing**: UBND, Guest, Provider `50f2c8fc…` on `70efa801…`, and an Agency on `3a5d2ffc…`, each at 2026-10-02, leave the write snapshot deep-equal and `54d7a276…` On hold; an invalid range from the owner also writes nothing
- [X] T013 [P] [US1] API tests in `tests/integration/bkg-schedule-api.test.ts` for `GET /api/bkg/providers/{providerId}/schedule` (`src/app/api/bkg/providers/[providerId]/schedule/route.ts`, wall clock): `provider` on own id with 2026-10-01..2026-10-31 → 200, blocks and `operating_hours`; `agency` → 200 and every block has exactly `start_at`, `end_at`, `status`; 46-day range → 400; `ubnd`, `hdt`, `guest` → 403; `agency` on `3a5d2ffc…` and on an unknown id → 404; `provider` on `70efa801…` → 403
- [X] T039 [P] [US1] SCH140 entry tests in `tests/unit/bkg-schedule-entry.test.ts` for `scheduleEntryFor(session, providerId)` in `src/lib/booking/provider-schedule.ts` (analyze M3, #74, #82): owner Provider on `50f2c8fc…` → `'redirect-owner'`; Tour Agency on `50f2c8fc…` → `'public'`; Tour Agency on `3a5d2ffc…` and on an unknown id → `'not-found'`; another Provider, UBND, HDT, Guest → `'denied'`; and `showScheduleLink(session)` (the Explore "Xem lịch trống" link) → true only for an authenticated Tour Agency
- [X] T014 [US1] Run `npx vitest run tests/unit/bkg-availability.test.ts tests/unit/bkg-availability-consistency.test.ts tests/unit/bkg-provider-schedule.test.ts tests/unit/bkg-schedule-entry.test.ts tests/integration/bkg-schedule-api.test.ts`; confirm they fail because `availability`, `provider-schedule` and the route are missing; paste the output into `docs/build/build-log.md`

### Implementation for Phase A

- [X] T015 [US2] Implement `buildCalendarBlocks` and `calculateAvailability` in `src/lib/booking/availability.ts` (makes T007, T008 pass; T009 must stay green)
- [X] T016 [US1] Implement `getProviderSchedule` in `src/lib/booking/provider-schedule.ts`: `authorizeProviderSchedule` → validate (#71, `isQueryDate`, `addDays`) → `expireDueHolds(now)` → `calculateAvailability`; public blocks built from the allow-list `{ start_at, end_at, status }`; `operating_hours` with seven keys; plus `scheduleEntryFor` and `showScheduleLink` (makes T010–T012, T039 pass)
- [X] T017 [US1] Add `GET` in `src/app/api/bkg/providers/[providerId]/schedule/route.ts` with the `BookingError` → status mapping (400, 403, 404) (makes T013 pass)
- [X] T019 [US1] Screen SCH139 in `src/app/provider/[providerId]/schedule/page.tsx` (`canOpenCreateBooking` gate; `getProviderSchedule` owner view; range links "← 30 ngày trước / 30 ngày sau →"; selecting an own block (query `booking`) shows a panel with `BookingActionsBar` from `src/app/provider/[providerId]/bookings/[bookingId]/BookingActionsBar.tsx` and View → BKG135 (#76); Create → BKG134; Operating hours → `/provider/{providerId}/edit`)
- [X] T020 [US1] Screen SCH140 in `src/app/explore/providers/[id]/schedule/page.tsx` (#82), branching on `scheduleEntryFor` (tested): `'redirect-owner'` → redirect to `/provider/{id}/schedule`; `'public'` → public view; `'not-found'` → not-found message; `'denied'` → access-denied message; "Select day" (query `day`) highlights that row; Request Quote → `/explore/providers/{id}` (#75)
- [X] T021 [US1] Add the "Xem lịch trống" link to `src/app/explore/providers/[id]/page.tsx`, shown only when `showScheduleLink(session)` (tested by T039), next to the Chat action (#82) — EXP-owned file: one link only
- [X] T022 [US1] Run `npm test`: all suites pass (459 + Foundational + Phase A), no test file edited since T014; mark T002–T021 and T039 `[X]` in `specs/013-bkg-schedule/tasks.md`

**Checkpoint**: Phase A demonstrable alone (quickstart §2–§3).

---

## Phase 4 (Phase B): US-1 Agency Schedule and Booking History (Priority: P1)

**Goal**: F-SCHED-02 lists a Tour Agency's own Bookings on BKG137 and SCH141; navigation points to the new screens.

**Independent Test**: quickstart §4 (API) and §5 (screens). Needs only Phase 2.

### Tests for Phase B (write all, run, see them fail)

- [X] T023 [P] [US1] F-SCHED-02 tests in `tests/unit/bkg-agency-bookings.test.ts` for `listAgencyBookings(session, query, { now })` in `src/lib/booking/agency-bookings.ts` (FR-002, US-1 AS-3, AS-5): Tràng An at `SEED_NOW` → only `0971a1b6…`; Hồng Hà session → only `4bf17b30…`; after creating a Tràng An hold on 2026-10-12 at `SEED_NOW`: ascending order (`0971a1b6…`, new), `status = 'On hold'` → the new one, `village_id` of Bát Tràng → the new one, `date_from = '2026-10-01'` → the new one; invalid date / `date_from > date_to` / unknown status → `VALIDATION_ERROR`
- [X] T024 [P] [US1] Row tests in `tests/unit/bkg-agency-bookings.test.ts` (#79): row `0971a1b6…` has `village_name` "Phú Vinh", `provider_name` "Xưởng thủ công Phú Vinh", `experience_name`, `start_at`, `end_at`, `status` Completed, `last_updated_at` = `updated_at`; `typeof` `group_size`, `agreed_price`, `notice_period` = `'number'`; `cancellation_policy` is an object
- [X] T025 [P] [US1] Sync and order tests in `tests/unit/bkg-agency-bookings.test.ts` (US-1 AS-4, SC-004, #36, #80): after `changeBookingStatus(provider, holdId, Booked)` the Agency list shows Booked; Agency `14390b41…` session at `2026-10-02T00:00:00+07:00` sees `54d7a276…` Cancelled (expired first); **denied requests write nothing**: Local Provider, UBND, HDT, Guest at 2026-10-02 → `FORBIDDEN`, write snapshot deep-equal, `54d7a276…` still On hold; an invalid query from an Agency writes nothing
- [X] T026 [P] [US1] API tests in `tests/integration/bkg-agency-bookings-api.test.ts` for `GET /api/bkg/agency/bookings` (`src/app/api/bkg/agency/bookings/route.ts`): `agency` → 200 with `0971a1b6…` and numbers; `?status=Cancelled` → 200 `[]`; `?date_from=2026-10-06&date_to=2026-10-05` → 400; `provider`, `ubnd`, `hdt`, `guest` → 403
- [X] T027 [US1] Run `npx vitest run tests/unit/bkg-agency-bookings.test.ts tests/integration/bkg-agency-bookings-api.test.ts`; confirm they fail because `agency-bookings` and the route are missing; paste the output into `docs/build/build-log.md`

### Implementation for Phase B

- [X] T028 [US1] Implement `listAgencyBookings` in `src/lib/booking/agency-bookings.ts`: `authorizeAgencyList` → validate → `expireDueHolds(now)` → read; names from `villages.name` and the Provider's `published_version_no` in `provider_profile_versions` (#79) (makes T023–T025 pass)
- [X] T029 [US1] Add `GET` in `src/app/api/bkg/agency/bookings/route.ts` (makes T026 pass)
- [X] T030 [US1] Screen BKG137 in `src/app/agency/[agencyId]/bookings/page.tsx` (`canViewAgencyBooking`-style gate: Tour Agency on its own `agencyId`; filters status / village / date range as page query; rows with Booking detail → BKG138; Schedule → SCH141; empty state)
- [X] T031 [US1] Screen SCH141 in `src/app/agency/[agencyId]/schedule/page.tsx` (same gate; date range and **status filter** as page query (screen-spec SCH141 element 3, analyze M1), passed to `listAgencyBookings`; default range today .. +29, UI choice; `CalendarGrid` with own Booking blocks labelled by status, View booking → BKG138; Chat → `/messages`)
- [X] T032 [US1] Navigation (#68, #69): in `src/app/provider/[providerId]/page.tsx` and `src/app/provider/[providerId]/edit/page.tsx` "Dashboard" → `/provider/{id}/dashboard`, "Schedule" → `/provider/{id}/schedule`; in `src/app/agency/[agencyId]/page.tsx` "Bookings" → `/agency/{id}/bookings`, "Schedule" → `/agency/{id}/schedule`; in `src/app/agency/[agencyId]/bookings/[bookingId]/page.tsx` Back → `/agency/{agencyId}/bookings`
- [X] T033 [US1] Run `npm test`: all suites pass, no test file edited since T027; mark T023–T032 `[X]` in `specs/013-bkg-schedule/tasks.md`

**Checkpoint**: Phase B demonstrable alone (quickstart §4–§5).

---

## Phase 5: Polish and verification

- [X] T034 Run `npm run lint`, `python data/scripts/validate_seed.py`, `uv run tools/start_feature.py --check`; do not commit the rewritten `tsconfig.tsbuildinfo`
- [X] T035 Walk quickstart §2–§5 of `specs/013-bkg-schedule/quickstart.md` after `npm run demo:reset` with **one** dev server; record each step (clicked vs curl) in `docs/build/build-log.md` (Windows G1 still pending)
- [X] T036 Draft build-log entries in `docs/build/build-log.md` (§2 entries, §3 spec issues incl. #82 found by the plan review, §4 lessons)
- [X] T037 Update `docs/build/mvp-alpha-checklist.md` §3: close #11 (BKG138 Back → BKG137) and #13 (nav Dashboard → DSH018; note the other DSH018 panels remain), extend #10 to SCH139/SCH140/SCH141/BKG137 (human approved writing directly, analyze L3)
- [X] T038 Draft the PR description in `specs/013-bkg-schedule/pr-notes.md` with a section for the PRF owner (`src/app/provider/[providerId]/page.tsx`, `edit/page.tsx`, `src/app/agency/[agencyId]/page.tsx`: link edits only) and the EXP owner (`src/app/explore/providers/[id]/page.tsx`: one link, #82)

---

## Dependencies and execution order

- Phase 1 → Phase 2 → (Phase A ∥ Phase B) → Phase 5.
- Phase 2: T002, T003 → T004 → T005, T006, T018.
- Phase A: T007–T013, T039 → T014 → T015 → T016 → T017 → T019 → T020 → T021 → T022.
- Phase B: T023–T026 → T027 → T028 → T029 → T030 → T031 → T032 → T033.
- Test → code pairs: T002→T005, T003→T006, T007/T008→T015, T009 guards T015, T010–T012→T016, T013→T017, T023–T025→T028, T026→T029; screens T019–T021, T030–T032 are checked in the demo (T035).
- Phase A and Phase B touch disjoint files after Phase 2 (`CalendarGrid.tsx` is Foundational, analyze H1).

## Parallel examples

```text
Phase 2 tests:  T002, T003      Phase 2 code: T005, T006
Phase A tests:  T007/T008 (one file), T009, T010–T012 (one file), T013
Phase B tests:  T023–T025 (one file), T026
```

## Implementation strategy

Step 5 = T001–T004, T005/T006/T018 after their red run, T007–T014, T039 and T023–T027 (red runs); Step 6 =
T015–T022 then T028–T033; Step 7 = T034–T035; Step 8 = T036–T038, commit, PR. Phase A can ship
first as the MVP (calendar for Provider and Agencies).

## Trace check (plan.md rows → tasks)

| Plan trace row | Test task | Code task |
|---|---|---|
| FR-009, US-2 AS-1, #72 split/merge | T007 | T015 |
| US-2 AS-2, SC-003 | T007, T008 | T015 |
| US-2 AS-3 | T007 | T015 |
| US-2 AS-4, AC-BKG-HOURS | T007 | T015 |
| #32 | T007 | T015 |
| #77 F-SCHED-09 output | T008 | T015 |
| #81 consistency with create | T009 | (no change; guards T015) |
| FR-001 defaults, #71 | T002, T010, T013 | T005, T016, T017 |
| #78 operating_hours | T010 | T016 |
| #73 owner booking_id; public allow-list | T010, T011, T013 | T016, T017 |
| US-1 AS-1 | T010, T013, demo T035 | T016, T019 |
| US-1 AS-2, BR-009, SC-010 | T011, T013 | T016, T020 |
| #74 access | T003, T012, T013 | T006, T016, T020 |
| #80 order, denied/invalid writes nothing | T012, T025 | T016, T028 |
| #76 SCH139 quick actions | demo T035 | T019 |
| #75, #82 SCH140 + Explore link | T039, demo T035 | T016, T020, T021 |
| FR-002, US-1 AS-3 | T023, T026 | T028, T029 |
| US-1 AS-5 filters | T023, T026 | T028, T029 |
| #79 numbers and names | T024, T026 | T028 |
| US-1 AS-4, SC-004, #36 | T025 | T028 |
| #68 BKG137/SCH141/Back, Agency nav | demo T035 | T030–T032 |
| #69 Provider nav | demo T035 | T032 |
