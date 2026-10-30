---
description: "Task list for BKG US-6 List Bookings"
---

# Tasks: BKG List Bookings (US-6)

**Input**: Design documents from `specs/012-bkg-list/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/list-bookings-api.md](contracts/list-bookings-api.md), [quickstart.md](quickstart.md)

**Tests**: Required by the constitution (Principle II). Every test task comes before the code task it checks and is run and **seen failing because the code is missing** before that code task starts. No test is edited to make it pass.

**Organization**: one user story, **US-6** (`[US6]`): F-SCHED-10 API, screen BKG133, minimal DSH018 (#65). US-1, US-2 are out of scope; US-3, US-4, US-5 (on `main`) are reused, not changed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[US6]**: user story of the task

## Shared test fixtures

All values from `data/seed/` through the volatile repository (`NODE_ENV=test`); `now` injected.

- `SEED_NOW` = `2026-09-30T00:00:00+07:00` (`src/lib/booking/clock.ts`)
- Provider `DEMO_IDENTITIES.provider` = `50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374` (Monday 08:00–17:00, Experience `c9f9faf7-2987-5ae4-b1ed-95c095fcce69` "Nặn gốm thủ công")
- Its Booked `4bf17b30-9819-5c47-b745-06be7171087b` (Mon 2026-10-05 09:00–10:00, Agency `ebf4fcfa…` "Công ty Du lịch Hồng Hà", 6 pax) and Booked `5782011c…` (Sat 2026-10-10, Agency `2a1f0cc1…`). At `SEED_NOW` both are before start (`requires_action` false); at `2026-10-06T00:00:00+07:00` only `4bf17b30…` needs arrival
- Other Provider `70efa801-a908-5e16-8510-fd094fbdc020` with On hold `54d7a276-90a2-5c70-be22-cb59ea95ea14`, `hold_expires_at` = `2026-10-01T08:00:00+07:00` (active at `SEED_NOW`, due at `2026-10-02T00:00:00+07:00`); its owner session = `{ ...DEMO_IDENTITIES.provider, providerId: '70efa801…' }`
- New On hold fixtures with `createBooking(DEMO_IDENTITIES.provider, …, { now })` on Mondays 2026-10-12 / 2026-10-19 (Agency Tràng An `02e568d8…`)

---

## Phase 1: Setup

- [X] T001 Confirm `.specify/feature.json` points to `specs/012-bkg-list`; run `npm ci`, `npm test` (baseline 427 passed), `npm run lint` and `uv run tools/start_feature.py --check`; record the baseline in `docs/build/build-log.md`

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the Hanoi local-date helper (#62) and the list authorization (#67) used by the service and both screens.

### Tests first

- [X] T002 [P] Date helper test in `tests/unit/bkg-hanoi-date.test.ts` for `hanoiDate(timestamp)` in `src/lib/booking/clock.ts`: `2026-10-05T09:00:00+07:00` → `2026-10-05`; `2026-10-04T17:30:00Z` (= 00:30 on 10-05 in Hanoi) → `2026-10-05`; `2026-10-05T23:59:59+07:00` → `2026-10-05` (#31, #62)
- [X] T003 [P] Authorization test in `tests/unit/bkg-list-access.test.ts` for `authorizeProviderList(session, requestedProviderId?)` in `src/lib/booking/booking-access.ts`: owning Local Provider without a requested id → its `providerId`; with its own id → same; with `70efa801…` → `FORBIDDEN`; Tour Agency, UBND, HDT, Guest → `FORBIDDEN` (AS-5, #67, BR-001, BR-002, BR-014)
- [X] T004 Run `npx vitest run tests/unit/bkg-hanoi-date.test.ts tests/unit/bkg-list-access.test.ts`; confirm both fail because `hanoiDate` / `authorizeProviderList` do not exist; paste the output into `docs/build/build-log.md`

### Code

- [X] T005 [P] Add `hanoiDate(timestamp: number): string` to `src/lib/booking/clock.ts` (makes T002 pass)
- [X] T006 [P] Add `authorizeProviderList(session, requestedProviderId?)` to `src/lib/booking/booking-access.ts`, returning the session's `providerId` or throwing `BookingError('FORBIDDEN')` (makes T003 pass)

**Checkpoint**: 427 + T002/T003 green; nothing else changed.

---

## Phase 3: User Story 6 — List Bookings (Priority: P1) 🎯

**Goal**: the Local Provider sees its own Bookings ordered by start, filtered by status and dates, with the ones that need action highlighted, and opens BKG135 from a row; DSH018 shows the action summary.

**Independent Test**: quickstart §4 (API) and §5 (screens).

### Tests for User Story 6 (write all, run, see them fail)

Fixture time rule (analyze H1): every On hold fixture is created with the **same `now`** as the
call that checks it, so it is not expired by the list's own expiry (#64).

- [X] T007 [P] [US6] Ownership and order tests in `tests/unit/bkg-list-bookings.test.ts` for `listProviderBookings(session, query, { now })` in `src/lib/booking/list-bookings.ts`, at `SEED_NOW`: Provider `50f2c8fc…` gets only its own Bookings — `4bf17b30…`, `5782011c…`, never `54d7a276…` (AS-1, SC-011); after creating On hold fixtures on 2026-10-12 and 2026-10-19 the order is ascending `start_at` (`4bf17b30…`, `5782011c…`, 10-12, 10-19) (AS-1, #60); two Bookings with the same `start_at` (create one, then set a second fixture's `start_at`/`end_at` to the same values in the volatile repository) are ordered by `booking_id` (#60)
- [X] T008 [P] [US6] Row shape and types in `tests/unit/bkg-list-bookings.test.ts`, at `SEED_NOW`: row of `4bf17b30…` has `booking_id`, `experience_name` = "Nặn gốm thủ công", `agency_name` = "Công ty Du lịch Hồng Hà", `start_at`, `end_at`, `group_size` = 6 with `typeof === 'number'`, `status` = Booked, no `hold_expires_at`, `requires_action`; an On hold fixture row has `hold_expires_at`; `typeof total_count` and every `status_counts` value are `'number'` (§5.1 FR-010, #57 lesson)
- [X] T009 [P] [US6] `requires_action` tests in `tests/unit/bkg-list-bookings.test.ts` (#59, AS-3, SC-011): at `SEED_NOW` both seed Booked rows → false; at `2026-10-06T00:00:00+07:00` `4bf17b30…` → true, `5782011c…` → false; at exactly `2026-10-05T09:00:00+07:00` `4bf17b30…` → true (BR-010); an On hold fixture created and listed at `SEED_NOW` → true; a **Cancelled** row made by `changeStatus(provider, id, { target_status: 'Cancelled', cancellation_reason: 'test' }, { now })` on a fixture → false; a **Completed** row made by `markArrival(provider, '4bf17b30…', { now: 2026-10-06 })` → false (analyze M3: through the services, not by editing the repository); every row's `requires_action` equals `bookingActions(status, now, start_at, 'provider').confirm || .mark_arrival`
- [X] T010 [P] [US6] Filter and count tests in `tests/unit/bkg-list-bookings.test.ts` (AS-2, #61, #62), at `SEED_NOW`: `status = Booked` → 2 rows, `total_count` 2; `status = Cancelled` → `[]`, `total_count` 0, while `status_counts` still has `Booked: 2` and all four keys (zero included); `date_from = date_to = 2026-10-05` → only `4bf17b30…`, `status_counts.Booked` 1; `date_from = 2026-10-06` → only `5782011c…` (inclusive bounds, local date)
- [X] T011 [P] [US6] Validation and paging tests in `tests/unit/bkg-list-bookings.test.ts` (#62, #63): `date_from > date_to`, `date_from = '2026-13-01'`, `date_from = '05/10/2026'`, `status = 'Done'`, `page = 0`, `page = 1.5`, `page_size = 0`, `page_size = 101` → each `VALIDATION_ERROR`; `page_size = 1, page = 2` → only the second row, `total_count` 2; `page = 5` → `bookings: []`, `total_count` 2 (AS-6); defaults `page` 1, `page_size` 20
- [X] T012 [P] [US6] Expiry and order tests in `tests/unit/bkg-list-bookings.test.ts` (#64, #67): owner of `70efa801…` at `2026-10-02T00:00:00+07:00` → `54d7a276…` listed Cancelled with `requires_action` false and one expiry history row; **a denied list request writes nothing**: UBND, Agency, and Provider `50f2c8fc…` naming `70efa801…`, each at `2026-10-02`, reject with `FORBIDDEN` and leave `bookings`, `booking_status_history`, `chat_messages`, `chat_sessions` and `chat_participants` exactly as before (deep-equal snapshot), `54d7a276…` still On hold; an invalid query from the owner (`page_size = 101`) also writes nothing
- [X] T013 [P] [US6] Summary tests in `tests/unit/bkg-list-summary.test.ts` for `providerBookingSummary(session, { now })` in `src/lib/booking/list-bookings.ts` (#65): with `now` = `2026-10-06T00:00:00+07:00`, create **21** On hold fixtures for `50f2c8fc…` with that same `now` (7 hourly slots 09:00–15:00 on each of the Mondays 2026-10-12, 2026-10-19, 2026-10-26; more than one page of 20); then `status_counts` = `{ On hold: 21, Booked: 2, Completed: 0, Cancelled: 0 }` and `requires_action_count` = 22 (21 holds + `4bf17b30…`), all numbers; Agency, UBND, HDT, Guest → `FORBIDDEN`
- [X] T014 [P] [US6] Out-of-filter count tests in `tests/unit/bkg-list-summary.test.ts` for `countActionsOutsideFilter(session, query, { now })` in `src/lib/booking/list-bookings.ts` (analyze H2): at `2026-10-06T00:00:00+07:00`, with one On hold fixture on 2026-10-12 created at that `now`: query `{ date_from: '2026-10-06' }` → 1 (`4bf17b30…` Booked past start is outside the filter; the hold is inside); query `{}` → 0; query `{ status: 'On hold' }` → 1; result is a number; Agency → `FORBIDDEN`
- [X] T015 [P] [US6] Row view tests in `tests/unit/bkg-list-row-view.test.ts` for `bookingListRowView(row, providerId)` in `src/lib/booking/list-row-view.ts` (analyze C1, M1): `detail_href` = `/provider/50f2c8fc…/bookings/{booking_id}` (AS-4 → F-SCHED-07, BKG135); `needs_action_label` = "Cần xử lý" when `requires_action`, otherwise `null` (SC-011: text, not colour only); `hold_expiry` only for On hold; `when` = "YYYY-MM-DD HH:mm → HH:mm" from `start_at`/`end_at`
- [X] T016 [P] [US6] API tests in `tests/integration/bkg-list-api.test.ts` for `GET /api/bkg/bookings` (`src/app/api/bkg/bookings/route.ts`, wall clock): `provider` → 200, `data.bookings` ascending, `typeof data.total_count === 'number'`, `typeof data.bookings[0].group_size === 'number'`; `?status=Cancelled` → 200 `[]`; `?date_from=2026-10-06&date_to=2026-10-05` → 400 `VALIDATION_ERROR`; `?page_size=101` → 400; `?provider_id=70efa801…` → 403; `agency`, `ubnd`, `hdt`, `guest` → 403; `agency` with `?page_size=101` → 403 (authorize before validate); `POST` create on Monday `2027-01-04T09:00:00+07:00` still returns 201 (analyze L1; 004/011 unchanged)
- [X] T017 [US6] Run `npx vitest run tests/unit/bkg-list-bookings.test.ts tests/unit/bkg-list-summary.test.ts tests/unit/bkg-list-row-view.test.ts tests/integration/bkg-list-api.test.ts`; confirm they fail because `list-bookings`, `list-row-view` and the `GET` export are missing; paste the output into `docs/build/build-log.md`

### Implementation for User Story 6

- [X] T018 [US6] Implement `listProviderBookings` in `src/lib/booking/list-bookings.ts`: `authorizeProviderList` → validate query (#62, #63) → `expireDueHolds(now)` → read `bookings` of the Provider, join `experiences.name` and `agency_profiles.company_name`, filter by `hanoiDate(start_at)` and status, sort (#60), count (#61), page (#63), `requires_action` via `bookingActions` (#59), numbers via `Number()` (makes T007–T012 pass)
- [X] T019 [US6] Implement `providerBookingSummary` and `countActionsOutsideFilter` in `src/lib/booking/list-bookings.ts`: walk every page with `page_size` 100; summary returns `status_counts` and `requires_action_count`; out-of-filter count = all `requires_action` Bookings minus those matching the query (makes T013, T014 pass)
- [X] T020 [P] [US6] Implement `bookingListRowView` in `src/lib/booking/list-row-view.ts` (makes T015 pass)
- [X] T021 [US6] Add `GET` to `src/app/api/bkg/bookings/route.ts`: demo session, query parameters to the service, `BookingError` → status as in `POST`; `POST` unchanged (makes T016 pass)
- [X] T022 [US6] Screen BKG133 in `src/app/provider/[providerId]/bookings/page.tsx` (server component; `canOpenCreateBooking` gate with access-denied message; filter form status / date_from / date_to as page query parameters, `date_from` default = today via `hanoiDate(Date.now())`, "Xoá bộ lọc" link that sets an empty `date_from`; **always** a line "N Booking cần xử lý nằm ngoài bộ lọc" from `countActionsOutsideFilter` with a "Xem tất cả" link (analyze H2); rows through `bookingListRowView`: date/time, Agency, Experience, pax, status, hold expiry for On hold, "Cần xử lý" label, Detail → `detail_href`; Create → BKG134; Messages → `/messages`; empty state (AS-6); previous/next page links); reuse `bookingDetailStyles` from `src/app/provider/[providerId]/bookings/[bookingId]/BookingDetailView.tsx`
- [X] T023 [US6] Screen DSH018 summary in `src/app/provider/[providerId]/dashboard/page.tsx` (same gate; `providerBookingSummary`; four status counts, "N Booking cần xử lý", Bookings → BKG133) (#65)
- [X] T024 [US6] Point the "Bookings" links in `src/app/provider/[providerId]/page.tsx` and `src/app/provider/[providerId]/edit/page.tsx` to `/provider/{providerId}/bookings`; leave `src/app/agency/[agencyId]/page.tsx` unchanged (#66)
- [X] T025 [US6] Run `npm test`: all suites pass (427 + Foundational + US-6), no test file edited since T017; mark T002–T024 `[X]` in `specs/012-bkg-list/tasks.md`

**Checkpoint**: US-6 complete through API and screens.

---

## Phase 4: Polish and verification

- [ ] T026 Run `npm run lint`, `python data/scripts/validate_seed.py`, `uv run tools/start_feature.py --check`; do not commit the rewritten `tsconfig.tsbuildinfo`
- [ ] T027 Walk quickstart §4 (API) and §5 (screens) of `specs/012-bkg-list/quickstart.md` after `npm run demo:reset` with **one** dev server; record each step (clicked in the browser vs checked by curl) in `docs/build/build-log.md` (Windows run still needed for G1)
- [ ] T028 Draft the build-log entries for this feature in `docs/build/build-log.md` (§2 entries, §3 spec issues, §4 lessons)
- [ ] T029 Draft the update of `docs/build/mvp-alpha-checklist.md` §3: close #12 (Provider page → BKG133 → BKG135); add new limitations if any — show to the human before writing

---

## Dependencies and execution order

- Phase 1 → Phase 2 → Phase 3 → Phase 4.
- Phase 2: T002, T003 → T004 → T005, T006.
- Phase 3: T007–T016 → T017 → T018 → T019 → T020 → T021 → T022 → T023 → T024 → T025.
- Test → code pairs: T002→T005, T003→T006, T007–T012→T018, T013/T014→T019, T015→T020, T016→T021; screens T022–T024 use the tested helpers and are checked in the demo (T027).

## Parallel examples

```text
Phase 2 tests:  T002, T003
Phase 2 code:   T005, T006
Phase 3 tests:  T007–T012 (one file, write together), T013/T014 (one file), T015, T016
```

## Implementation strategy

Build loop mapping: Step 5 = T001–T004, T005/T006 only after their red run, T007–T017 (tests and
their red runs); Step 6 = T018–T025; Step 7 = T026–T027; Step 8 = T028–T029, commit, PR.

## Trace check (plan.md rows → tasks)

| Plan trace row | Test task | Code task |
|---|---|---|
| AS-1, FR-010 own only, SC-011 | T007, T016 | T018, T021 |
| AS-1, #60 order + tie | T007 | T018 |
| AS-2, #62 filters | T010, T016 | T018, T021 |
| #62 validation 400 | T011, T016 | T018, T021 |
| #63 paging | T011 | T018 |
| #61 counts | T010, T013 | T018, T019 |
| AS-3, #59, SC-011 `requires_action` | T009 | T018 |
| FR-010 `hold_expires_at` On hold only | T008, T015 | T018, T020 |
| §5.1 numbers (#57 lesson) | T008, T013, T014, T016 | T018, T019, T021 |
| #64 expiry before read | T012 | T018 |
| #64/#67 order, denied writes nothing | T012, T016 | T006, T018 |
| AS-5, #67, BR-001/002/014 | T003, T012, T013, T014, T016 | T006, T018, T019, T021 |
| #62 Hanoi local date | T002 | T005 |
| AS-4 Detail → BKG135 | T015 (`detail_href`), demo T027 | T020, T022 |
| AS-6 empty state | T011 (empty page), demo T027 | T022 |
| #65 DSH018 summary | T013, demo T027 | T019, T023 |
| UI choice + analyze H2 out-of-filter line | T014, demo T027 | T019, T022 |
| #66 route and links | demo T027 | T022, T024 |
| SC-011 highlight not colour only | T015 (`needs_action_label`), demo T027 | T020, T022 |
