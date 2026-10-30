# Data model: BKG List Bookings (US-6)

Canonical definitions: [`data/04-data-model.md`](../../data/04-data-model.md) and
[`data/schema.sql`](../../data/schema.sql). This file redefines no column; it lists only the
tables this slice reads and writes, and why. Access goes through `demoRepository()`; values are strings.

## Tables read

| Table | Columns used | For | Rule |
|---|---|---|---|
| `bookings` | `booking_id`, `provider_id`, `agency_id`, `experience_id`, `start_at`, `end_at`, `group_size`, `status`, `hold_expires_at` | own list, filters, order, counts, `requires_action` | FR-010, #59–#63, `data/02-crud-matrix.md` F-SCHED-10 R BKG |
| `experiences` | `experience_id`, `name` | `experience_name` | FR-010, crud matrix F-SCHED-10 R EXP |
| `agency_profiles` | `agency_id`, `company_name` | `agency_name` | FR-010, crud matrix F-SCHED-10 R AGY |

## Tables written

Only by the existing expiry (`expireDueHolds`, spec #50, #64), after authorization; unchanged from
`specs/011-bkg-manage/data-model.md`:

| Table | Change | Rule |
|---|---|---|
| `bookings` | due On hold → `status = Cancelled`, `updated_at` | BR-004, #46, #50 |
| `booking_status_history` | one row per expiry | BR-019, #46 |
| `chat_messages`, `chat_sessions`, `chat_participants` | one Booking Update message per expiry | FR-008, #49 |

A denied list request writes none of these (#64, #67).

## Output shape (§5.1 FR-010, not stored)

Each row: `booking_id`, `experience_name`, `agency_name`, `start_at`, `end_at`, `group_size`
(number), `status`, `hold_expires_at` (On hold only), `requires_action` (#59). Plus `status_counts`
(four keys, numbers, #61) and `total_count` (number). See
[contracts/list-bookings-api.md](contracts/list-bookings-api.md).

## State

No new state or transition. `requires_action` is derived from `status`, `hold_expires_at`,
`start_at` and `now` (#59).
