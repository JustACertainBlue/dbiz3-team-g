# Data model: BKG View Schedule (US-1) and Calculated Availability (US-2)

Canonical definitions: [`data/04-data-model.md`](../../data/04-data-model.md) and
[`data/schema.sql`](../../data/schema.sql). This file redefines no column; it lists only the
tables this slice reads and writes, and why. Access goes through `demoRepository()`; values are strings.

## Tables read

| Table | Columns used | For | Rule | Phase |
|---|---|---|---|---|
| `provider_operating_hours` | `provider_id`, `weekday`, `local_start`, `local_end` | Available windows, `operating_hours` | FR-009, #28, #29, #72, #78 | A |
| `bookings` | `booking_id`, `provider_id`, `agency_id`, `experience_id`, `start_at`, `end_at`, `status`, `group_size`, `agreed_price_total`, `conditions_snapshot`, `updated_at` | occupied blocks (A); Agency list (B) | FR-009, #72, #32 (A); FR-002, #79 (B) | A, B |
| `provider_profiles` | `provider_id`, `village_id`, `verification_status`, `published_version_no` | SCH140 access (Verified, #74); village and name (B) | #74, #79 | A, B |
| `provider_profile_versions` | `provider_id`, `version_no`, `business_name` | `provider_name` | #79 | B |
| `villages` | `village_id`, `name` | `village_name`, village filter | FR-002, #79 | B |
| `experiences` | `experience_id`, `name` | `experience_name` | FR-002 | B |

## Tables written

Only by the existing expiry (`expireDueHolds`, #50, #80), after authorization and validation;
unchanged from `specs/011-bkg-manage/data-model.md`: `bookings` (status, updated_at),
`booking_status_history`, `chat_messages`, `chat_sessions`, `chat_participants`. A denied or invalid
request writes none of these.

## Derived shapes (not stored)

- Calendar block: `{ start_at, end_at, status ∈ Available | On hold | Booked | Unavailable }`;
  owner view may add `booking_id` (#73). See [contracts/schedule-api.md](contracts/schedule-api.md).
- `operating_hours`: seven ISO weekday keys → `[{ local_start, local_end }]` (#78).
- F-SCHED-02 row: §5.1 FR-002 fields with JSON numbers (#79).

No new state or transition.
