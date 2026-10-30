# Research: BKG Manage Booking (US-5) and View Bookings (US-3)

No `NEEDS CLARIFICATION` remains in plan.md. Decisions come from the team (2026-10-30), from
Closed questions of `docs/spec/specs/spec-BKG.md` §10 (#6–#13, #26–#49), or from the code on `main`.
Stack, storage and structure are those of `specs/004-bkg-core` (see its research R1–R9).

## R1. Race test before any await (AC-BKG-RACE, build-log §4)

- **Decision**: add a test-only option `afterConflictCheck?: () => Promise<void>` to `createBooking`
  and to the F-SCHED-04 service, awaited between the conflict check and the write. A new race
  test fires two conflicting writes with a 10 ms pause; a recorded mutation run (lock removed)
  must show it failing; with the lock it passes. This test exists before any other `await` is
  added inside `withBookingWriteLock`.
- **Rationale**: 004 showed T015 passes even without the lock because check + write are synchronous.

## R2. One atomic persist per event, with updates (#44, BR-019)

- **Decision**: extend the repository batch so one call applies inserts **and** updates
  (`bookings`, `chat_sessions`, `chat_participants`) and persists once; memory changes only after
  the write succeeds. F-SCHED-04 writes `bookings` + `audit_logs` + `chat_messages` (+ Chat rows);
  F-SCHED-05/06 and expiry write `bookings` + `booking_status_history` + `chat_messages` (+ Chat rows).
- **Rationale**: BR-019 and F-SCHED-08 must not leave a status without its history or message.
  For the same reason the spec edge case "a schedule sync succeeds for Provider but fails for
  Agency view" cannot happen: Booking, history and message are written together (analyze L1).
- **Alternatives**: separate `update()` calls (each persists on its own — breaks #44); reusing
  `src/lib/prf/audit-logger.ts` (it persists separately and uses the wall clock) — not used here.
- **Shared file**: `src/lib/demo/json-repository.ts` change is additive; AIT/PRF/EXP owners review.

## R3. Expiry worker on the JSON runtime (BR-004, #40, #45, #46, AC-BKG-EXPIRY)

- **Decision**: `expireDueHoldsLocked(now)` cancels every On hold with `now >= hold_expires_at`
  (history `changed_by` empty, reason "Automatic expiry: 72-hour On hold elapsed", one
  Booking Update message each); it takes no lock, because `withBookingWriteLock` is not re-entrant
  and calling a locking variant from inside the lock would deadlock (analyze H1).
  `expireDueHolds(now)` takes the lock and calls it; it is used by the timer, read paths and tests.
  Expiry runs (a) at the start of every BKG service call, create included, inside the write lock,
  before the requested action (analyze M2), and (b) on a 60 s `setInterval` (`.unref()`) started once
  per dev server process and never under `NODE_ENV=test` (analyze M1).
- **Why it is race-safe**: expiry and confirm both run inside the lock and both re-read
  `status`; the first one wins, the second sees a non-On hold status and does nothing / is
  rejected. Running it twice changes nothing and sends no second message (#26).
- **Consequence**: a confirm at or after the deadline is rejected because expiry runs first (#45).
- **Limit**: the timer is per process; idempotent expiry keeps two processes safe, but only one
  dev server should run on one `runtime.json`.

## R4. F-SCHED-08 Chat resolution (FR-008, #13, #27, #49)

- **Decision**: for each event write one `chat_messages` row: `message_kind = 'Booking Update'`,
  `sender_user_id` empty (system-generated), `booking_id`, `experience_id`, text from the #49
  template. Chat order: (1) `source_chat_session_id` if that Chat is Active **and** belongs to the
  same Agency–Provider pair; (2) the most recent Active Chat of the pair (by `last_message_at`,
  then `started_at`); (3) else a new Active Chat, `source = 'Booking'`, `booking_id` set, with
  participant rows for the Agency user and the Provider user.
- **One Active Chat per pair**: the schema's partial unique index does not exist in the JSON
  runtime, so (3) runs only after (1)/(2) found nothing, inside the write lock; tests cover two
  events in a row and an existing Active Chat.
- **Read state (#27)**: the Agency participant's `unread_count` +1; `recipient_read_status` is
  `Seen` when its `last_read_message_id` is this message, otherwise `Unseen` (so `Unseen` right
  after sending). `chat_sessions.last_message_at` = message time.

## R5. Access (BR-001, BR-002, BR-008, BR-014)

- **Decision**: one helper loads the Booking and returns the actor's view: owning Local Provider
  (`booking.provider_id === session.providerId`) → full + actions; owning Agency
  (`booking.agency_id === session.agencyId`) → read-only; everyone else → denied. Seed
  `role_permissions` are not consulted (OQ #33 stays Open).

## R6. Clock

- Same as 004: services take `now`; tests use `2026-09-30T00:00:00+07:00`; timestamps written
  with `+07:00`. Seed Booked `4bf17b30…` starts 2026-10-05 09:00 — before/after start tests use
  `now` on either side of it.

## R7. Seed facts used by tests and demo

- Demo Provider `50f2c8fc…`: Booked `4bf17b30…` (Agency `ebf4fcfa…`, Active Chat with that Agency),
  Booked `5782011c…` (Agency `2a1f0cc1…`, Active Chat). Agency `02e568d8…` has no Chat with it → new Chat.
- On hold `54d7a276…` (Provider `70efa801…`, Agency `14390b41…`, Active Chat) expired 2026-10-01 08:00;
  the first BKG request after `demo:reset` cancels it (expected).

## R8. Recorded, not fixed: `message_kind` in commercial-handoff-service

`src/lib/demo/commercial-handoff-service.ts` writes `message_kind` values `'Experience Context'`
and `'Text'`, which `data/schema.sql` (`chat_message_kind_chk`) does not allow. BKG writes only
`'Booking Update'`. Fixing it belongs to AIT/IAC and is not part of this slice.

## Decisions recorded in the spec

Every point the spec did not state when this plan was drafted is Closed in `docs/spec/specs/spec-BKG.md` §10 #50–#56 (branch `linh/bkg-oq-50-56`, 2026-10-30), with a line under `## Clarifications`. No interpretation remains open.

| Spec §10 | Decision used in this plan | Where |
|---|---|---|
| #50 | Expiry is applied at the next BKG request or within one timer tick (60 s) after `hold_expires_at`, not at the exact second | R3 |
| #51 | Lifecycle actions (update, confirm, cancel, arrival) on **existing** Bookings stay allowed after the Provider loses Verified status or the Experience is archived; BR-018 blocks only new Bookings | services |
| #52 | An F-SCHED-04 request whose values equal the current ones writes nothing and sends no message; `agency_notification_message_id` and `audit_log_id` are null | update-booking |
| #53 | `agency_contact` = `agency_profiles.company_name` + `contact_info`; `provider_profile_link` = `/explore/providers/{provider_id}` | booking-detail |
| #54 | Without BKG133/BKG137 lists, BKG135 is opened from BKG134 after create, from the Provider page, or by URL; BKG138 is at `/agency/{agencyId}/bookings/{bookingId}` and opened by URL or from the Booking Update message | screens |
| #55 | One Booking Update message per event is both `chat_auto_message_id` (FR-008) and `agency_notification_message_id` (FR-004/005) | R4 |
| #56 | `source_chat_session_id` is used only if that Chat is Active and belongs to the same Agency–Provider pair | R4 |
