---
description: "Task list for BKG US-5 Manage Booking and US-3 View Bookings"
---

# Tasks: BKG Manage Booking (US-5) and View Bookings (US-3)

**Input**: Design documents from `specs/011-bkg-manage/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/manage-booking-api.md](contracts/manage-booking-api.md), [quickstart.md](quickstart.md)

**Tests**: Required by the constitution (Principle II). Every test task comes before the code task it checks and is run and **seen failing because the code is missing** before that code task starts. No test is edited to make it pass.

**Organization**: two user stories, two independent phases. **Phase US-5** (`[US5]`) is demonstrable through the API alone. **Phase US-3** (`[US3]`) adds the screens. US-1, US-2, US-4 (already on `main`) and US-6 are not in this file.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[US5]** / **[US3]**: user story of the task

## Shared test fixtures

All values from `data/seed/` through the volatile repository (`NODE_ENV=test`); `now` injected.

- `SEED_NOW` = `2026-09-30T00:00:00+07:00` (`src/lib/booking/clock.ts`)
- Provider `DEMO_IDENTITIES.provider` = `50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374` (user `c2c7fe0d…`, Monday 08:00–17:00, Experience `c9f9faf7-2987-5ae4-b1ed-95c095fcce69`, max 12)
- Its Booked `4bf17b30-9819-5c47-b745-06be7171087b` (Mon 2026-10-05 09:00–10:00, Agency `ebf4fcfa-1013-5ecd-b7c6-e0d8e9fa0277`, Active Chat with that Agency) and Booked `5782011c…` (Sat 2026-10-10, Agency `2a1f0cc1…`, Active Chat)
- Agency `DEMO_IDENTITIES.agency` = `02e568d8-d65e-54b1-a554-b411150d1dcb` (Approved, **no** Chat with Provider `50f2c8fc…` → new Chat case)
- On hold `54d7a276-90a2-5c70-be22-cb59ea95ea14` (Provider `70efa801-a908-5e16-8510-fd094fbdc020`, Agency `14390b41-4e6c-5b8d-be3a-05e7c5e761bd`, Active Chat), `hold_expires_at` = `2026-10-01T08:00:00+07:00`
- New On hold fixtures are created with `createBooking(DEMO_IDENTITIES.provider, …, { now })` on Mondays 2026-10-12 / 2026-10-19

---

## Phase 1: Setup

- [X] T001 Confirm `.specify/feature.json` points to `specs/011-bkg-manage`; run `npm ci`, `npm test` (baseline 350 passed), `npm run lint` and `uv run tools/start_feature.py --check`; record the baseline in `docs/build/build-log.md`

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: one-persist batch with updates (#44) and the shared ownership check used by both stories.

### Tests first

- [X] T002 [P] Batch-with-updates test in `tests/unit/bkg-repository-batch-update.test.ts`: `applyBatch` accepts, in one call, inserts `{ table, row }` and updates `{ table, match, changes }`; all are applied with **one** persist; when the persist throws, none of them is visible afterwards; an update whose `match` finds no row throws and nothing is applied; the existing insert-only call shape of 004 still works (`tests/unit/bkg-repository-batch.test.ts` stays green)
- [X] T003 [P] Ownership test in `tests/unit/bkg-booking-access.test.ts` for `loadBookingForActor(session, bookingId)` in `src/lib/booking/booking-access.ts`: owning Provider → view `provider`; owning Agency → view `agency`; another Agency, `DEMO_IDENTITIES.ubnd`, `.hdt`, `.guest`, another Provider → `FORBIDDEN`; unknown id → `NOT_FOUND` (BR-001, BR-002, BR-008, BR-014)
- [X] T004 Run `npx vitest run tests/unit/bkg-repository-batch-update.test.ts tests/unit/bkg-booking-access.test.ts`; confirm they fail because the code is missing; paste the output into `docs/build/build-log.md`

### Code

- [X] T005 Extend `applyBatch` in `src/lib/demo/json-repository.ts` and its types in `src/lib/demo/types.ts` to accept inserts and updates in one persist (memory swapped only after the write); additive, existing methods unchanged; shared file — AIT/PRF/EXP owners review (makes T002 pass; the 350 existing tests stay green)
- [X] T006 [P] Implement `loadBookingForActor` in `src/lib/booking/booking-access.ts` (makes T003 pass)

**Checkpoint**: T002–T003 pass; full `npm test` green.

---

## Phase 3: User Story 5 — Manage Booking (Priority: P1) 🎯

**Goal**: the Provider updates, confirms, cancels and marks arrival; On hold expires after 72 h; every event sends one Booking Update message to the Agency.

**Independent Test**: quickstart §4 (16 `curl` steps, macOS and Windows) — create → update → no-op update (#52) → update outside hours (409) → confirm → arrival before start (not applied) → arrival on seed `4bf17b30…` (Completed) → cancel without/with reason → update a Cancelled Booking (409) → Agency 403 → one message per successful event in `/messages`.

### Race test first (before any `await` enters the write lock)

- [X] T007 [US5] Race test with async pause in `tests/unit/bkg-race-pause.test.ts` (AC-BKG-RACE, build-log §4): (a) two `createBooking` calls for the same Provider and interval, both with `afterConflictCheck: () => new Promise(r => setTimeout(r, 10))`, started with `Promise.allSettled` → exactly one fulfilled, the other `SLOT_UNAVAILABLE`, `bookings` +1, `booking_status_history` +1; (b) two `updateBooking` calls moving two different On hold Bookings of the Provider into the same free interval with the same pause → exactly one applied, the other `SLOT_UNAVAILABLE`
- [X] T008 [US5] Add the test-only option `afterConflictCheck?: () => Promise<void>` to `createBooking` in `src/lib/booking/create-booking.ts`: the lock callback becomes `async` and awaits it between `findConflict` and the write; update the comment above the lock to point at `tests/unit/bkg-race-pause.test.ts` (makes T007 (a) runnable; (b) still fails because `update-booking.ts` is missing)
- [X] T009 [US5] Mutation check for (a): temporarily replace `withBookingWriteLock(...)` in `src/lib/booking/create-booking.ts` by a direct call, run `npx vitest run tests/unit/bkg-race-pause.test.ts -t "createBooking"` and **see it fail** (two Bookings committed); put the lock back by hand (not `git restore`, which would also drop T008) and re-run to see it pass; paste both outputs into `docs/build/build-log.md`

### Tests for User Story 5 (write all, run, see them fail)

- [X] T010 [P] [US5] F-SCHED-04 tests in `tests/unit/bkg-update-booking.test.ts` for `updateBooking(session, bookingId, input, { now })` in `src/lib/booking/update-booking.ts`: #48 only `start_at`, `duration`, `group_size`, `agreed_price`, `booking_conditions` (any other key, including `status`, → `VALIDATION_ERROR`, BR-007); empty body → `VALIDATION_ERROR`; works on On hold and Booked, Completed/Cancelled → `BOOKING_TERMINAL` (BR-011); #47 new start 16:30 + 60 min → `SLOT_UNAVAILABLE`, moving into Booked `4bf17b30…` → `SLOT_UNAVAILABLE`, moving by 30 min inside its own slot → accepted (overlap excludes itself), duration 90 → re-checked and `end_at` + 90 min (BR-020); `hold_expires_at` unchanged after a date change (#6); `group_size` 13 → `VALIDATION_ERROR` (#7); invalid `booking_conditions` → `VALIDATION_ERROR` (#42); one `audit_logs` row `booking.update` with before/after of changed fields (#27); identical values → nothing written, `audit_log_id` and `agency_notification_message_id` = `null` (#52); output keys exactly `updated_booking`, `private_schedule_synced`, `public_schedule_updated`, `agency_notification_message_id`, `audit_log_id`; injected persist failure → no Booking change, no audit row, no message (#44)
- [X] T011 [P] [US5] F-SCHED-05 tests in `tests/unit/bkg-change-status.test.ts` for `changeBookingStatus(session, bookingId, input, { now })` in `src/lib/booking/change-status.ts`: On hold → Booked when `now < hold_expires_at` (US-5 AS-1); at `now = hold_expires_at` confirm rejected and the Booking ends `Cancelled` by expiry (#45); On hold → Cancelled and Booked → Cancelled with reason (US-5 AS-2); missing or blank `cancellation_reason` → `VALIDATION_ERROR` (#10); `target_status` `Completed` → `VALIDATION_ERROR` (AC-BKG-COMPLETE); any target on a Cancelled or Completed Booking → `BOOKING_TERMINAL`; Booked → Booked, On hold → On hold and any other transition not listed in FR-005 on a non-terminal Booking → `INVALID_TRANSITION` (analyze M5); each accepted change: `status`, `updated_at` and exactly one history row (`changed_by` = Provider user, `reason`) in one persist; injected persist failure leaves neither (BR-019, #44); output keys exactly `booking_status`, `status_history_entry`, `schedules_synced`, `agency_notification_message_id`
- [X] T012 [P] [US5] F-SCHED-06 tests in `tests/unit/bkg-mark-arrival.test.ts` for `markGroupArrival(session, bookingId, { now })` in `src/lib/booking/mark-arrival.ts`: Booked `4bf17b30…` at `now = 2026-10-05T09:00:00+07:00` → `transition_applied = true`, `Completed`, `arrival_at = now`, one history row, `availability_released = true`, and `findConflict` no longer sees it (FR-006, #11, US-5 AS-4); at `08:59` → `transition_applied = false`, `Tour Start Time Not Reached`, nothing written (BR-010); an On hold and a Cancelled Booking → `Booking Not Booked`, nothing written; output keys exactly as FR-006
- [X] T013 [P] [US5] Expiry tests in `tests/unit/bkg-expire-holds.test.ts` for `expireDueHolds(now)` in `src/lib/booking/expire-holds.ts`: at `2026-10-01T07:59:59+07:00` On hold `54d7a276…` unchanged; at `08:00:00` → `Cancelled`, history `changed_by` empty and reason `Automatic expiry: 72-hour On hold elapsed` (BR-004, #46); a second run changes nothing and adds no message (#26); a confirm racing expiry at the deadline ends with exactly one transition and one message (AC-BKG-EXPIRY); any BKG service call (`changeBookingStatus` on another Booking) at `08:00` cancels `54d7a276…` first (#50); Bookings already Booked/Cancelled are untouched; existing On hold past expiry still blocks its slot until expired (#40); `expireDueHoldsLocked(now)` does the same without taking the lock, and a service call that runs it inside the lock (`changeBookingStatus` at `08:00`) resolves within 1 s — no deadlock (analyze H1); **create over an expired hold (analyze M2)**: create an On hold for Mon 2026-10-12 09:00–10:00 with `now = SEED_NOW` (hold until 2026-10-03T00:00:00+07:00), then `createBooking` for the same slot with `now = 2026-10-03T00:00:00+07:00` → succeeds; the first Booking is `Cancelled` with reason `Automatic expiry: 72-hour On hold elapsed`, and a Booking Update message exists for that expiry
- [X] T014 [P] [US5] F-SCHED-08 tests in `tests/unit/bkg-agency-sync.test.ts` for `src/lib/booking/agency-sync.ts` through the five events: each successful create, update, status change, arrival and expiry writes exactly one `chat_messages` row (`message_kind = Booking Update`, `sender_user_id` empty, `booking_id`, text per the #49 template) and its id is both `chat_auto_message_id` and `agency_notification_message_id` (#55); Chat order (#13): Active `source_chat_session_id` of the same pair is used; a Closed one, one of another pair, or an id that no longer exists is skipped and the FR-008 order continues (#56, spec edge case, analyze M6); else the latest Active Chat of the pair (`4bf17b30…` → Chat with Agency `ebf4fcfa…`); else a new Active Chat `source = Booking`, `booking_id`, two participant rows (Agency `02e568d8…`); **two events in a row** for that pair and an event on a pair with an **existing Active Chat** never create a second Active Chat for the pair; Agency participant `unread_count` +1, `recipient_read_status = Unseen`, `chat_sessions.last_message_at` = message time (#27); rejected or no-op actions write no message (BR-012, US-5 AS-6)
- [X] T015 [P] [US5] Access tests in `tests/unit/bkg-manage-access.test.ts`: `updateBooking`, `changeBookingStatus`, `markGroupArrival` called as `DEMO_IDENTITIES.agency`, `.ubnd`, `.hdt`, `.guest` or another Provider → `FORBIDDEN`, nothing written (BR-001, US-5 AS-7, SC-005, SC-006); the owning Provider can still update/cancel after its `verification_status` is set to `Revision Required` or the Experience is archived (#51)
- [X] T016 [P] [US5] API tests in `tests/integration/bkg-manage-api.test.ts` with cookie `hab_demo_account`: `PATCH /api/bkg/bookings/{id}` 200 / 400 / 409 `SLOT_UNAVAILABLE` / 409 `BOOKING_TERMINAL` / 200 with `null` ids for a no-op (#52); `POST …/status` 200 / 400 missing reason / 409 `INVALID_TRANSITION`; `POST …/arrival` 200 with `transition_applied` true and false; every route as `agency` → 403; unknown id → 404 (contract `specs/011-bkg-manage/contracts/manage-booking-api.md`)
- [X] T017 [US5] Run `npx vitest run tests/unit/bkg-update-booking.test.ts tests/unit/bkg-change-status.test.ts tests/unit/bkg-mark-arrival.test.ts tests/unit/bkg-expire-holds.test.ts tests/unit/bkg-agency-sync.test.ts tests/unit/bkg-manage-access.test.ts tests/integration/bkg-manage-api.test.ts tests/unit/bkg-race-pause.test.ts`; confirm every new suite fails because the code is missing (T007 (b) included); paste the output into `docs/build/build-log.md`

### Implementation for User Story 5

- [X] T018 [P] [US5] Implement `src/lib/booking/agency-sync.ts`: resolve the Chat in the FR-008 order inside the caller's lock (#13, #56), build the #49 message, return the batch inserts/updates (message, Chat, participants) for the caller's single persist (makes T014 Chat cases pass)
- [X] T019 [US5] In `src/lib/booking/create-booking.ts`: inside the lock, call `expireDueHoldsLocked(now)` before the operating-hours and conflict checks (#50, analyze M2), and add the Booking Update message of the create event to the existing `applyBatch` call via `agency-sync.ts` (closes 004 Known limitation #7; the 004 tests stay green; makes the T013 M2 case pass)
- [X] T020 [US5] Implement `src/lib/booking/expire-holds.ts`: `expireDueHoldsLocked(now)` (no lock; for callers already inside `withBookingWriteLock`; conditional on stored `On hold` and `now >= hold_expires_at`, one batch per Booking with history + message), `expireDueHolds(now)` (takes the lock, then calls the locked variant; for the timer and tests) and `startExpiryTimer()` (60 s `setInterval` with `.unref()`, started once per process via a `globalThis` flag, **no-op when `NODE_ENV=test`**) (analyze H1, M1; makes T013 pass)
- [X] T021 [US5] Implement `src/lib/booking/update-booking.ts` (F-SCHED-04): calls `expireDueHoldsLocked(now)` first inside the lock (H1); allowed fields only; re-check on start/duration change with `fitsOperatingHours` and `findConflict` excluding itself (add an optional `excludeBookingId` parameter to `src/lib/booking/conflicts.ts`; 004 tests stay green); `afterConflictCheck` option; one batch with Booking update + `audit_logs` row + message; no-op returns `null` ids; add `BOOKING_TERMINAL` and `INVALID_TRANSITION` to `BookingErrorCode` in `src/lib/booking/create-booking.ts` (makes T010 and T007 (b) pass)
- [X] T022 [US5] Mutation check for (b): temporarily remove the lock in `src/lib/booking/update-booking.ts`, run `npx vitest run tests/unit/bkg-race-pause.test.ts -t "updateBooking"` and see it fail, put the lock back by hand, re-run to see it pass; paste both outputs into `docs/build/build-log.md`
- [X] T023 [US5] Implement `src/lib/booking/change-status.ts` (F-SCHED-05): `expireDueHoldsLocked(now)` first inside the lock (H1), transitions per FR-005 and #45, reason required for Cancelled, one batch with Booking + history + message (makes T011 pass)
- [X] T024 [US5] Implement `src/lib/booking/mark-arrival.ts` (F-SCHED-06): `expireDueHoldsLocked(now)` first inside the lock (H1), Booked and `now >= start_at`, `arrival_at`, one batch with Booking + history + message; rejected cases return `transition_applied = false` without writing (makes T012 pass)
- [X] T025 [US5] Make T015 pass: ownership through `loadBookingForActor` in `src/lib/booking/update-booking.ts`, `src/lib/booking/change-status.ts`, `src/lib/booking/mark-arrival.ts`; no BR-018 check on existing Bookings (#51)
- [X] T026 [US5] Implement routes `PATCH` in `src/app/api/bkg/bookings/[bookingId]/route.ts`, `POST` in `src/app/api/bkg/bookings/[bookingId]/status/route.ts` and `POST` in `src/app/api/bkg/bookings/[bookingId]/arrival/route.ts`: demo session, error mapping per contract, `startExpiryTimer()` on module load, a no-op under `NODE_ENV=test` (M1) (makes T016 pass). #57 (decided after this task): the `PATCH` body's `updated_booking` moves to the T034 serializer
- [X] T027 [US5] Run `npm test`: all suites pass (350 existing + Foundational + US-5), no test file edited since T017; mark T007–T026 `[X]` in `specs/011-bkg-manage/tasks.md`

**Checkpoint**: US-5 works end to end through the API (quickstart §4).

---

## Phase 4: User Story 3 — View Bookings (Priority: P1)

**Goal**: Provider and Agency open a Booking Detail; the Provider acts from it through BKG144 and BKG136.

**Independent Test**: quickstart §5 — create on BKG134 → BKG135 with On hold buttons → BKG144 update → confirm → BKG136 arrival on seed `4bf17b30…` → terminal, no buttons; Agency on BKG138 read-only; other Agency/UBND/HDT/Guest denied.

### Tests for User Story 3 (write all, run, see them fail)

- [X] T028 [P] [US3] Button-state tests in `tests/unit/bkg-booking-actions.test.ts` for `bookingActions(status, now, startAt, actor)` in `src/lib/booking/booking-actions.ts`, one case per FR-007 matrix row: On hold → `confirm`, `update`, `cancel` true, `mark_arrival` false; Booked and `now < start_at` → `update`, `cancel` true, `mark_arrival` false (BR-017, SC-007); Booked and `now >= start_at` (exactly equal included) → `update`, `cancel`, `mark_arrival` true; Completed and Cancelled → all false (US-3 AS-5); actor `agency` → all false in every status
- [X] T029 [P] [US3] Detail tests in `tests/unit/bkg-booking-detail.test.ts` for `getBookingDetail(session, bookingId, { now })` in `src/lib/booking/booking-detail.ts`: Provider view of `4bf17b30…` has the FR-007 fields, `agency_contact` = Agency `company_name` + `contact_info` and no `provider_profile_link` (US-3 AS-1, #53); Agency `ebf4fcfa…` view has `provider_profile_link = /explore/providers/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374`, no `agency_contact`, all actions false (US-3 AS-2); `hold_expires_at` only for On hold; `last_updated_at` = `updated_at`; another Agency → `FORBIDDEN` (US-3 AS-3, BR-002, BR-008); UBND, HDT, Guest → `FORBIDDEN` (US-3 AS-4, BR-014); runs `expireDueHolds(now)` (the locking variant) first (#50); `group_size`, `agreed_price` and `notice_period` are JSON numbers (§5.1 FR-007, #57). #57: `updateBooking(provider, id, { group_size: 11 })` returns an `updated_booking` deep-equal to `getBookingDetail(provider, id)` read right after (spec names, `group_size` = 11 and `agreed_price` = 2000000 as numbers, no `duration_minutes`/`agreed_price_total`), also for the no-change case (#52)
- [X] T030 [P] [US3] Page-access tests in `tests/unit/bkg-detail-page-access.test.ts` for `canManageBooking(session, providerId, booking)` and `canViewAgencyBooking(session, agencyId, booking)` in `src/lib/booking/booking-access.ts`: the owning Provider on its own URL → true, on another Provider's URL or another Provider's Booking → false; the owning Agency on its own URL → true, another Agency → false; UBND, HDT, Guest → false (BKG135/BKG144/BKG136 and BKG138 gates)
- [X] T031 [P] [US3] API tests in `tests/integration/bkg-booking-detail-api.test.ts` for `GET /api/bkg/bookings/{id}`: `provider` → 200 with `agency_contact` and `actions`; a Booking created for Tràng An (`02e568d8…`) read with cookie `agency` → 200 read-only, all actions false; `agency` on `4bf17b30…` (Agency `ebf4fcfa…`) → 403; `ubnd`, `hdt`, `guest` → 403; unknown → 404; #57: `PATCH` with `{ group_size: 11 }` as `provider` → 200 and `updated_booking` deep-equals the body of the following `GET` as `provider`, with `typeof group_size`, `agreed_price`, `notice_period` = `number`
- [X] T032 [US3] Run `npx vitest run tests/unit/bkg-booking-actions.test.ts tests/unit/bkg-booking-detail.test.ts tests/unit/bkg-detail-page-access.test.ts tests/integration/bkg-booking-detail-api.test.ts`; confirm they fail because the code is missing; paste the output into `docs/build/build-log.md`

### Implementation for User Story 3

- [X] T033 [P] [US3] Implement `src/lib/booking/booking-actions.ts` (makes T028 pass)
- [X] T034 [US3] Implement `src/lib/booking/booking-detail.ts` using `loadBookingForActor` and `bookingActions`, with one serializer `toBookingDetail(row, view, now)` that converts the stored strings to numbers once; `getBookingDetail` and `updateBooking`'s `updated_booking` (T021/T026 output, both branches incl. #52) both use it (#57) (makes T029 and the #57 case of T031 pass)
- [X] T035 [US3] Add `canManageBooking` and `canViewAgencyBooking` to `src/lib/booking/booking-access.ts` (makes T030 pass)
- [X] T036 [US3] Add `GET` to `src/app/api/bkg/bookings/[bookingId]/route.ts` (makes T031 pass)
- [X] T037 [US3] Screen BKG135 in `src/app/provider/[providerId]/bookings/[bookingId]/page.tsx` (server component; `canManageBooking` gate; FR-007 fields; buttons from `bookingActions`: Confirm/Book and Cancel post to `/status`, Update → BKG144, Mark Group Arrival → BKG136; disabled buttons shown disabled, SC-007)
- [X] T038 [US3] Screen BKG144 in `src/app/provider/[providerId]/bookings/[bookingId]/edit/page.tsx` and `src/app/provider/[providerId]/bookings/[bookingId]/edit/EditBookingForm.tsx` (fields of screen-spec BKG144; target status select without Completed; reason required for Cancelled; Save → `PATCH` and/or `/status`; Discard → BKG135; stale errors cleared on change, price input without step restriction as in BKG134)
- [X] T039 [US3] Screen BKG136 in `src/app/provider/[providerId]/bookings/[bookingId]/arrival/page.tsx` (booking and scheduled start; Confirm Group Arrival → `/arrival`; shows `validation_error` when not applied; Cancel → BKG135)
- [X] T040 [US3] Screen BKG138 in `src/app/agency/[agencyId]/bookings/[bookingId]/page.tsx` (`canViewAgencyBooking` gate; read-only FR-007 fields; no action buttons; Chat → `/messages`; Back → `/explore`)
- [X] T041 [US3] In `src/app/provider/[providerId]/bookings/new/CreateBookingForm.tsx` navigate to BKG135 after a successful create (replaces the in-place result of #43, per #54)
- [X] T042 [US3] Run `npm test`: all suites pass, no test file edited since T032; mark T028–T041 `[X]` in `specs/011-bkg-manage/tasks.md`

**Checkpoint**: US-3 screens work on top of US-5.

---

## Phase 5: Polish and verification

- [X] T043 Run `npm run lint`, `python data/scripts/validate_seed.py`, `uv run tools/start_feature.py --check`; do not commit the rewritten `tsconfig.tsbuildinfo`
- [X] T044 Walk quickstart §4 (API) and §5 (screens) of `specs/011-bkg-manage/quickstart.md` after `npm run demo:reset` with **one** dev server; record each step in `docs/build/build-log.md` (Windows run still needed for G1)
- [X] T045 Draft the build-log entries for this feature in `docs/build/build-log.md` (§2 entries, §3 spec issues, §4 lessons, including the T009/T022 mutation results)
- [X] T046 Draft updates for `docs/build/mvp-alpha-checklist.md` §3: close #7 (Chat message now sent), update #6 (race test now proves the lock) and #8 (expiry worker exists, lazy + timer per #50); add new BKG limitations if any — show to the human before writing

---

## Dependencies and execution order

- Phase 1 → Phase 2 → Phase 3 (US-5) → Phase 4 (US-3) → Phase 5.
- Phase 2: T002, T003 → T004 → T005, T006.
- Phase 3: **T007 → T008 → T009 first**; then T010–T016 → T017 → T018 → T019 → T020 → T021 → T022 → T023 → T024 → T025 → T026 → T027.
- Phase 4: T028–T031 → T032 → T033 → T034 → T035 → T036 → T037 → T038 → T039 → T040 → T041 → T042.
- Test → code pairs: T002→T005, T003→T006, T007(a)→T008/T009, T007(b)→T021/T022, T014→T018/T019, T013→T020, T010→T021, T011→T023, T012→T024, T015→T025, T016→T026, T028→T033, T029→T034, T030→T035, T031→T036 (#57 case → T034).
- US-3 depends on US-5 only through the API and services; US-5 needs no screen.

## Parallel examples

```text
Phase 2 tests:  T002, T003
Phase 3 tests:  T010, T011, T012, T013, T014, T015, T016 (after T007–T009)
Phase 4 tests:  T028, T029, T030, T031
```

## Implementation strategy

MVP increment 1 = Phases 1–3 (US-5 through the API). Increment 2 = Phase 4 (US-3 screens).
Build loop mapping: Step 5 = T001–T006, T007–T009, T010–T017, T028–T032 (tests and their red
runs; T005/T006/T008 are the Foundational and race-hook code they need); Step 6 = T018–T027 and
T033–T042. The red run of Phase 4 tests may be done in Step 5 together with Phase 3 because
they do not depend on Phase 3 code.
