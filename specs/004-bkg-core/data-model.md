# Data model: BKG Create Booking (US-4)

Canonical definitions: [`data/04-data-model.md`](../../data/04-data-model.md) and
[`data/schema.sql`](../../data/schema.sql). This file redefines no column; it lists only the
tables this slice reads and writes, and why. Runtime access goes through
`demoRepository()`; every value is stored as a string.

## Tables read

| Table | Columns used | For | Rule |
|---|---|---|---|
| `experiences` | `experience_id`, `provider_id`, `max_participants`, `notice_period_hours`, `cancellation_policy`, `archived_at`, `price_per_person` | ownership, not archived, capacity, conditions prefill, rate × pax suggestion | BR-018, OQ #7, BR-020, FR-003 |
| `provider_profiles` | `provider_id`, `user_id`, `verification_status` | Provider must be `Verified` | BR-018 |
| `user_accounts` | `user_id`, `account_status` | Provider's user `Active`; selected Agency's user `Approved` | BR-018, spec #37, #39 |
| `provider_operating_hours` | `provider_id`, `weekday`, `local_start`, `local_end` | whole-interval fit, ISO weekday | FR-003, AC-BKG-HOURS, Clarifications #28/#29/#31 |
| `agency_profiles` | `agency_id`, `user_id`, `company_name` | `agency_id` exists; link to the Agency's user for #39; selector label on BKG134 | FR-003, spec #39 |
| `bookings` | `provider_id`, `start_at`, `end_at`, `status` | occupied intervals (On hold, Booked) | BR-005, AC-BKG-RACE |

## Tables written

| Table | Row written | Rule |
|---|---|---|
| `bookings` | one row: `booking_id` (new uuid), `agency_id`, `provider_id` (from the Experience), `experience_id`, `source_chat_session_id` (optional, empty when absent), `start_at`, `duration_minutes` (any value > 0, spec #38), `end_at = start_at + duration_minutes`, `group_size`, `agreed_price_total`, `conditions_snapshot`, `status = On hold`, `created_at = updated_at = now`, `hold_expires_at = created_at + 72h`, `arrival_at` empty | FR-003, BR-003, BR-004, BR-020 |
| `booking_status_history` | one row: `history_id` (new uuid), `booking_id`, `from_status` empty, `to_status = On hold`, `changed_by` = Provider `user_id`, `changed_at = created_at`, `reason` empty | BR-019 |

Both rows are written in one persist (research R5).

## Spec field → column (FR-003)

| Spec field | Column |
|---|---|
| `duration` | `bookings.duration_minutes` |
| `agreed_price` | `bookings.agreed_price_total` (total for the group, VND, OQ #8) |
| `booking_conditions {notice_period, cancellation_policy}` | `bookings.conditions_snapshot {notice_period_hours, cancellation_policy}` |

## Validation (schema CHECKs and trigger reproduced in code)

| Schema source | Rule in code |
|---|---|
| `booking_duration_chk`, `booking_end_chk`, `booking_duration_end_chk` | `duration_minutes` integer > 0; `end_at = start_at + duration_minutes` |
| `booking_group_chk`, trigger `booking_group_within_capacity` | `group_size` integer, 1 ≤ `group_size` ≤ `experiences.max_participants` |
| `booking_price_chk` | `agreed_price_total` > 0 |
| `booking_hold_expiry_chk` | `hold_expires_at = created_at + 72h` |
| `booking_conditions_chk` | `notice_period_hours` integer ≥ 0; `cancellation_policy` non-empty object (spec #42) |
| `booking_status_chk` | `status = On hold` at create |
| EXCLUDE USING gist (provider, `[start_at, end_at)`, On hold/Booked) | conflict check inside the write lock |
| FK `(experience_id, provider_id)` → `experiences` | `provider_id` taken from the Experience; Experience must belong to the session Provider |

## State

Create only: `(none) → On hold`. All other transitions belong to US-5.
