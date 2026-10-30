# Contract: Manage and view a Booking (F-SCHED-04, 05, 06, 07; F-SCHED-08 side effects)

Source: spec-BKG §5.1 FR-004..FR-008. Actor from the demo session cookie `hab_demo_account`.
Every request first runs `expireDueHolds(now)` (research R3). Error body:
`{ "error": { "code": "...", "message": "..." } }`; nothing is written on any error.

Common errors: `403 FORBIDDEN` (not the owning Local Provider; for GET: not the owning Provider
or Agency), `404 NOT_FOUND` (unknown Booking), `409 BOOKING_TERMINAL` (Completed/Cancelled, BR-011),
`400 VALIDATION_ERROR`. Only `Slot Unavailable`, `Booking Not Booked` and `Tour Start Time Not
Reached` are named by the spec; the other codes are implementation labels.

## GET `/api/bkg/bookings/{bookingId}` — F-SCHED-07 (US-3)

Owning Local Provider or owning Tour Agency. `200`:

| Field | Note |
|---|---|
| `booking_id`, `experience_name`, `start_at`, `end_at`, `group_size`, `agreed_price`, `notice_period`, `cancellation_policy`, `status`, `last_updated_at` | FR-007 §5.1 |
| `agency_contact` | Provider view only (#53) |
| `provider_profile_link` | Agency view only (#53) |
| `hold_expires_at` | On hold only |
| `actions` | `{ confirm, update, cancel, mark_arrival }` booleans from `bookingActions` (BR-017); all false for Agency, Completed, Cancelled |

## PATCH `/api/bkg/bookings/{bookingId}` — F-SCHED-04 (US-5)

Body: at least one of `start_at`, `duration`, `group_size`, `agreed_price`, `booking_conditions`
(#48). Any other field (including `status`, `experience_id`, `agency_id`) → `400` (BR-007, #48).
Re-check when `start_at` or `duration` changes → `409 SLOT_UNAVAILABLE` (#47). `group_size` >
max → `400` (#7). No change (#52) → `200` with the current Booking as `updated_booking`, nothing written, no message, and `agency_notification_message_id` = `null`, `audit_log_id` = `null`.

`200`: `updated_booking`, `private_schedule_synced`, `public_schedule_updated` (when time changed),
`agency_notification_message_id`, `audit_log_id`.

## POST `/api/bkg/bookings/{bookingId}/status` — F-SCHED-05 (US-5)

Body: `target_status` (`Booked` | `Cancelled`), `cancellation_reason` (required, non-empty, for
`Cancelled`). Allowed: On hold → Booked (only `now < hold_expires_at`, #45), On hold → Cancelled,
Booked → Cancelled. A Cancelled or Completed Booking → `409 BOOKING_TERMINAL`; any other transition
on a non-terminal Booking (e.g. Booked → Booked) → `409 INVALID_TRANSITION`; `Completed` → `400`
(AC-BKG-COMPLETE).

`200`: `booking_status`, `status_history_entry` {from_status, to_status, changed_by, changed_at,
reason}, `schedules_synced`, `agency_notification_message_id`.

## POST `/api/bkg/bookings/{bookingId}/arrival` — F-SCHED-06 (US-5)

No body. For the owning Provider this route answers `200` in every case below, terminal Bookings
included (FR-006 reports a rejected arrival through `transition_applied`, not an error; this is
the one exception to `409 BOOKING_TERMINAL`):

| Case | `transition_applied` | `booking_status` | `validation_error` | other |
|---|---|---|---|---|
| Booked, `now >= start_at` | true | Completed | — | `arrived_at`, `status_history_entry`, `private_schedule_synced = true`, `availability_released = true` |
| not Booked | false | current | `Booking Not Booked` | `private_schedule_synced = false`, `availability_released = false` |
| Booked, `now < start_at` | false | Booked | `Tour Start Time Not Reached` | same |

## F-SCHED-08 side effect (every successful create, update, status change, arrival, expiry)

One `chat_messages` row, `message_kind = Booking Update`, text per #49, in the Chat chosen by
FR-008 / research R4; Agency `unread_count` +1; never a second Active Chat for the pair.
Internal result: `private_schedule_updated`, `chat_auto_message_id`, `latest_update_at`,
`recipient_read_status` (`Unseen` right after sending).
