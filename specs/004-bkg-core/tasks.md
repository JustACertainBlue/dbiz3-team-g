---
description: "Task list for BKG US-4 Create Booking"
---

# Tasks: BKG Create Booking (US-4)

**Input**: Design documents from `specs/004-bkg-core/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/create-booking-api.md](contracts/create-booking-api.md)

**Tests**: Required by the constitution (Principle II). Every test task comes before the code task it checks and must be run and **seen failing because the code is missing** before that code task starts. No test is edited to make it pass.

**Organization**: one user story in scope, US-4 (spec label `[US4]`). US-1, US-2, US-3, US-5 and US-6 are out of scope.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[US4]**: task belongs to User Story 4 (Create Booking)

## Shared test fixtures (used by the tasks below)

All values are from `data/seed/` (read through the volatile repository, `NODE_ENV=test`):

- `now` = `2026-09-30T00:00:00+07:00` (`data/seed/manifest.json` `generated_at`)
- Provider session: `DEMO_IDENTITIES.provider` — Provider `50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374` (Verified, account Active, weekday 1 08:00–17:00), Experience `c9f9faf7-2987-5ae4-b1ed-95c095fcce69` (60 min, max 12, notice 24 h, policy `{"before_hours":24,"refund_percent":80}`)
- Existing Booked of that Provider: `4bf17b30…` Mon 2026-10-05 09:00–10:00 (+07:00)
- Free Monday: 2026-10-12 (ISO weekday 1)
- Agencies: Approved `02e568d8-d65e-54b1-a554-b411150d1dcb`; Disabled `ab81de3b-a65e-5f0d-9407-894ac464a0e9`; Pending Approval / Rejected built by updating an Agency user's `account_status` in the volatile repository
- Ineligible Providers/Experiences: Draft Provider `c8e989d4…` with Experience `67a2cbab-850c-5f69-b496-59f2e9a5f594`; archived Experience `800b5192-03c7-5953-849b-32a321e12a47`; Verified-but-Disabled Provider built by updating `user_accounts.account_status` of Provider `50f2c8fc…`'s user
- Expired On hold: `54d7a276…` (Provider `70efa801…`, Sun 2026-10-11 09:00–10:15, hold expired 2026-10-01 08:00)

---

## Phase 1: Setup

**Purpose**: confirm the shared app runs before adding BKG code (no new scaffold, no new dependency)

- [X] T001 Confirm `.specify/feature.json` points to `specs/004-bkg-core`, then run `npm ci`, `npm test` and `uv run tools/start_feature.py --check` from the repository root; record the last test line in `docs/build/build-log.md` as the baseline
- [X] T002 Create the empty folder `src/lib/booking/` (no file content yet) as named in `specs/004-bkg-core/plan.md` §Project Structure

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: clock, single-persist batch and write lock used by every US-4 rule

**⚠️ No US-4 task starts until this phase is complete**

### Tests first (write, run, see them fail)

- [X] T003 [P] Seed-value test in `tests/integration/bkg-seed.test.ts`: `SEED_NOW` exported by `src/lib/booking/clock.ts` equals `generated_at` in `data/seed/manifest.json` (`2026-09-30T00:00:00+07:00`), and the only seed `bookings` row with status On hold has `hold_expires_at` on 2026-10-01 — the value stated in `data/05-review.md` ("its remaining On hold record expires on 2026-10-01")
- [X] T004 [P] BR-019 storage test in `tests/unit/bkg-repository-batch.test.ts`: a new repository method `applyBatch([{ table, row }, …])` on `JsonDemoRepository` inserts a `bookings` row and a `booking_status_history` row with one persist; when the persist step throws (injected failure), neither row is in `all('bookings')` / `all('booking_status_history')` afterwards
- [X] T005 [P] Write-lock test in `tests/unit/bkg-write-lock.test.ts`: two async critical sections passed to `withBookingWriteLock()` from `src/lib/booking/write-lock.ts` never interleave (the second starts only after the first resolves or rejects), and a rejected section releases the lock
- [X] T006 Run `npx vitest run tests/integration/bkg-seed.test.ts tests/unit/bkg-repository-batch.test.ts tests/unit/bkg-write-lock.test.ts`; confirm each fails because the module or method is missing (not a typo) and paste the output into `docs/build/build-log.md`

### Code

- [ ] T007 [P] Implement `src/lib/booking/clock.ts`: `SEED_NOW` constant and `type Clock = () => Date` with a wall-clock default (makes T003 pass)
- [ ] T008 Add `applyBatch` to `src/lib/demo/json-repository.ts` and its signature to `DemoRepository` in `src/lib/demo/types.ts`: build the new tables on a copy, persist once, swap in memory only after the write succeeds; keep every existing method unchanged (makes T004 pass). Shared file used by AIT/PRF/EXP: the 280 existing tests must still pass (analyze M4)
- [ ] T009 [P] Implement `src/lib/booking/write-lock.ts`: in-process promise-chain mutex `withBookingWriteLock<T>(fn: () => Promise<T> | T): Promise<T>` (makes T005 pass)

**Checkpoint**: T003–T005 pass; full `npm test` still green

---

## Phase 3: User Story 4 — Create Booking (Priority: P1) 🎯 MVP

**Goal**: a Local Provider creates an On hold Booking on BKG134; the slot is blocked at once and the Agency can see it.

**Independent Test**: as the demo Provider, `POST /api/bkg/bookings` (or BKG134) for Mon 2026-10-12 09:00, 60 min, 10 pax, Agency `02e568d8…` → 201 On hold with 72 h expiry; the same request again → 409 Slot Unavailable; as the Agency → 403. Runs without any other BKG story.

### Tests for User Story 4 (write all first, run, see them fail) ⚠️

- [X] T010 [P] [US4] Operating-hours tests in `tests/unit/bkg-operating-hours.test.ts` for `fitsOperatingHours(hours, startAt, endAt)` in `src/lib/booking/operating-hours.ts`: Clarification #28 (2026-10-12 is weekday 1, 2026-10-11 is weekday 7); #29 (Mon 08:00–17:00 fits exactly; Mon 16:30 + 60 min does not; Mon 07:30 + 60 min does not); #31 (an input given in UTC, `2026-10-12T02:00:00Z`, is read as Mon 09:00 in Asia/Ho_Chi_Minh and fits); AC-BKG-HOURS (no hours rows → nothing fits); an interval crossing midnight never fits
- [X] T011 [P] [US4] Conflict tests in `tests/unit/bkg-conflicts.test.ts` for `findConflict(bookings, providerId, startAt, endAt)` in `src/lib/booking/conflicts.ts`: BR-005 (Mon 2026-10-05 09:30–10:30 overlaps Booked `4bf17b30…`); #41 (10:00–11:00 touching that Booking is allowed); only On hold and Booked block (Completed/Cancelled rows and other providers ignored); #40 (expired On hold `54d7a276…` still blocks Sun 2026-10-11 09:30 for Provider `70efa801…`); OQ #32 (that seed row counts as occupied even though it lies outside its Provider's hours)
- [X] T012 [P] [US4] Create lifecycle tests in `tests/unit/bkg-create-booking.test.ts` for `createBooking(session, input, { now })` in `src/lib/booking/create-booking.ts`, using the shared fixtures: AS-1/BR-003 status On hold; AS-2/BR-004/AC-BKG-HOLD `hold_expires_at = created_at + 72h` with `now = SEED_NOW`; AS-3/BR-005 a second overlapping create is rejected with Slot Unavailable; AS-4/#36 right after create the row is returned by a `bookings` lookup on `agency_id` and the output has `private_schedule_synced = true`; AS-5 a request outside hours or overlapping writes no `bookings` or `booking_status_history` row; BR-019 exactly one history row `from_status` empty → `to_status` On hold, `changed_by` = Provider user, `changed_at = created_at`, and an injected persist failure leaves neither row; BR-020 `end_at = start_at + duration_minutes` and `conditions_snapshot` defaults to the Experience's `notice_period_hours` and `cancellation_policy`; output fields are exactly those of FR-003 and `public_schedule_block` has only `start_at`, `end_at`, `status` (BR-009)
- [X] T013 [P] [US4] Eligibility tests in `tests/unit/bkg-create-eligibility.test.ts`: AS-6/BR-001 `DEMO_IDENTITIES.agency`, `.ubnd`, `.hdt`, `.guest` are denied and nothing is written; BR-018 Draft Provider `c8e989d4…` → rejected, Experience `c9f9faf7…` archived in the fixture → rejected (archived `800b5192…` belongs to a non-Verified Provider and would be rejected first), an Experience of another Provider → rejected; #37 Provider `50f2c8fc…` with its user set to `Disabled` → rejected; #39 Disabled Agency `ab81de3b…` → rejected, an Agency user set to `Pending Approval` and to `Rejected` → rejected, Approved `02e568d8…` → accepted; every rejection leaves `bookings` and `booking_status_history` unchanged
- [X] T014 [P] [US4] Input validation tests in `tests/unit/bkg-create-validation.test.ts`: OQ #7 `group_size` 12 accepted, 13 and 0 rejected; OQ #8 `agreed_price` 0 rejected, positive total stored as `agreed_price_total`; `duration` 0 rejected; #38 `duration` 90 (Experience is 60) accepted and `end_at` follows 90; #42 adjusted `booking_conditions` with `notice_period` -1, non-integer, or empty `cancellation_policy` rejected, a valid adjusted value stored in `conditions_snapshot`; Clarification #30 a start sooner than `notice_period_hours` after `now` is still accepted; missing required field rejected; FR-003 `source_chat_session_id` stored as given when present and empty when absent (analyze H2)
- [X] T015 [P] [US4] Race test in `tests/unit/bkg-create-race.test.ts` (AC-BKG-RACE): two `createBooking` calls for the same Provider and interval started together with `Promise.all` → exactly one succeeds, the other is Slot Unavailable, and `bookings` gains exactly one row and `booking_status_history` exactly one row
- [X] T016 [P] [US4] API test in `tests/integration/bkg-create-api.test.ts` through `POST` exported by `src/app/api/bkg/bookings/route.ts`, with the cookie `hab_demo_account`: provider → 201 and the FR-003 body; same body twice → second is 409 `SLOT_UNAVAILABLE`; agency cookie → 403 `FORBIDDEN`; Disabled Agency `ab81de3b…` → 409 `AGENCY_NOT_ELIGIBLE` with `bookings` unchanged (#39); `group_size` 13 → 400 `VALIDATION_ERROR`; unknown `experience_id` → 404 `NOT_FOUND`; Provider user `Disabled` → 409 `PROVIDER_NOT_ELIGIBLE` (#37); unknown `agency_id` → 404 `NOT_FOUND` (analyze M2) (contract `specs/004-bkg-core/contracts/create-booking-api.md`)
- [X] T017 [US4] Run `npx vitest run tests/unit/bkg-operating-hours.test.ts tests/unit/bkg-conflicts.test.ts tests/unit/bkg-create-booking.test.ts tests/unit/bkg-create-eligibility.test.ts tests/unit/bkg-create-validation.test.ts tests/unit/bkg-create-race.test.ts tests/integration/bkg-create-api.test.ts`; confirm every suite fails because the module is missing, and paste the output into `docs/build/build-log.md`
- [X] T029 [P] [US4] Page-access test in `tests/unit/bkg-page-access.test.ts` for `canOpenCreateBooking(session, providerId)` exported by `src/lib/booking/create-booking.ts` (analyze M1; AS-6/BR-001 on screen BKG134): the demo Provider on its own `providerId` → true; the demo Provider on another Provider's id → false; `DEMO_IDENTITIES.agency`, `.ubnd`, `.hdt`, `.guest` → false
- [X] T030 [US4] Run `npm test` after the analyze additions (T014, T016, T029); confirm the new cases fail because the code is missing, the 280 existing tests still pass, and paste the output into `docs/build/build-log.md`

### Implementation for User Story 4

- [ ] T018 [P] [US4] Implement `src/lib/booking/operating-hours.ts`: ISO weekday and local minutes in Asia/Ho_Chi_Minh (same formula as `src/lib/explore/availability.ts`), whole `[start, end)` inside one window of that weekday (makes T010 pass)
- [ ] T019 [P] [US4] Implement `src/lib/booking/conflicts.ts`: half-open overlap against rows of the same `provider_id` with status On hold or Booked, using stored status only (makes T011 pass)
- [ ] T020 [US4] Implement `src/lib/booking/create-booking.ts` (depends on T007–T009, T018, T019): role check (BR-001), Provider Verified + user Active (BR-018, #37), Experience own and unarchived (BR-018), Agency exists and user Approved (#39), input validation (OQ #7, #8, #38, #42, duration > 0), conditions prefill (BR-020), `source_chat_session_id` stored as given (H2), then inside `withBookingWriteLock`: operating-hours fit + conflict check, build the `bookings` row (`end_at`, `hold_expires_at`, `+07:00` timestamps from the injected clock) and the history row, `applyBatch` once; typed errors map to the contract codes (makes T012–T015 pass)
- [ ] T031 [US4] Add `canOpenCreateBooking(session, providerId)` to `src/lib/booking/create-booking.ts`: true only for an authenticated Local Provider whose `providerId` equals the argument (makes T029 pass)
- [ ] T021 [US4] Implement `POST` in `src/app/api/bkg/bookings/route.ts`: read `demoSessionFromRequest`, parse JSON body, call `createBooking`, map errors to 400/403/404/409 bodies of the contract (makes T016 pass)
- [ ] T022 [US4] Implement screen BKG134 in `src/app/provider/[providerId]/bookings/new/page.tsx` (server component: denies access unless `canOpenCreateBooking(session, providerId)` (T031); reads the session Provider's unarchived Experiences and Approved Agencies through `demoRepository()`) and `src/app/provider/[providerId]/bookings/new/CreateBookingForm.tsx` (client form: fields of screen-spec BKG134 §3, conditions prefilled from the chosen Experience, rate × pax shown as a suggestion only, posts to `/api/bkg/bookings`, shows the created Booking in place per #43, Cancel returns to `/provider/[providerId]`)
- [ ] T023 [US4] Add a "Create Booking" link for the owning Provider in `src/app/provider/[providerId]/page.tsx` pointing to `/provider/[providerId]/bookings/new` (no other change to that page)
- [ ] T024 [US4] Run `npm test`; all suites pass, including the 280 existing tests (analyze M4), with no test file edited since T030; mark T018–T023 and T031 `[X]` in `specs/004-bkg-core/tasks.md`

**Checkpoint**: US-4 works end to end through the API and BKG134

---

## Phase 4: Polish and verification

- [ ] T025 Run `npm run lint`, `python data/scripts/validate_seed.py` and `uv run tools/start_feature.py --check`; do not commit the rewritten `tsconfig.tsbuildinfo`
- [ ] T026 Walk the demo path in `specs/004-bkg-core/quickstart.md` §4 after `npm run demo:reset` and record each step's result in `docs/build/build-log.md` (Step 7 needs a second laptop: macOS and Windows)
- [ ] T027 Draft the build-log entry for this run in `docs/build/build-log.md` (§2 entry; §3 spec issues; §4 agent mistakes, if any)
- [ ] T028 Draft BKG rows for `docs/build/mvp-alpha-checklist.md` §3 Known limitations: in-process lock only (one Node process), single persist instead of a DB transaction, Chat auto-message/F-SCHED-08 deferred to US-5, no expiry worker (#40), demo session instead of AUT — show to the human before writing

---

## Dependencies and execution order

- Phase 1 → Phase 2 → Phase 3 → Phase 4.
- Inside Phase 2: T003–T005 → T006 (red run) → T007–T009.
- Inside Phase 3: T010–T016 → T017 (red run) → T029 → T030 (red run after analyze additions) → T018, T019 → T020 → T031 → T021 → T022 → T023 → T024.
- Test → code pairs: T003→T007, T004→T008, T005→T009, T010→T018, T011→T019, T012/T013/T014/T015→T020, T029→T031, T016→T021.

## Parallel examples

```text
Phase 2 tests:   T003, T004, T005 together (three new files)
Phase 3 tests:   T010, T011, T012, T013, T014, T015, T016 together (seven new files)
Phase 3 code:    T018 and T019 together; T020 after both
```

## Implementation strategy

MVP = Phase 1 + Phase 2 + Phase 3 (US-4 only). Stop at the Phase 3 checkpoint, run the
independent test above, then Phase 4. Steps 5 and 6 of the build loop map to: Step 5 =
Setup + Foundational (T001–T009, whose own tests T003–T005 are seen failing in T006 before
T007–T009) and the US-4 test tasks T010–T017, with no code that makes those pass; Step 6 =
T018–T024.
