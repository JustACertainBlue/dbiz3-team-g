# Data model: BKG Manage Booking (US-5) and View Bookings (US-3)

Canonical definitions: [`data/04-data-model.md`](../../data/04-data-model.md) and
[`data/schema.sql`](../../data/schema.sql). This file redefines no column; it lists only the
tables this slice reads and writes, and why. Access goes through `demoRepository()`; values are strings.

## Tables read

| Table | Columns used | For | Rule |
|---|---|---|---|
| `bookings` | all | load the Booking; overlap check excluding itself | F-SCHED-04..07, BR-005, #47 |
| `experiences` | `experience_id`, `name`, `max_participants` | group-size limit, message text, detail | #7, #49, FR-007 |
| `provider_profiles` | `provider_id`, `user_id` | ownership; Provider participant of a new Chat | BR-001, #13 |
| `user_accounts` | `user_id` | participant users | #13 |
| `agency_profiles` | `agency_id`, `user_id`, `company_name`, `contact_info` | Agency participant; `agency_contact` | #13, FR-007, #53 |
| `provider_operating_hours` | `provider_id`, `weekday`, `local_start`, `local_end` | re-check on time change | #29, #31, #47 |
| `chat_sessions` | `chat_session_id`, `agency_id`, `provider_id`, `status`, `last_message_at`, `started_at` | Chat resolution | FR-008, #13 |
| `chat_participants` | `chat_session_id`, `user_id`, `last_read_message_id`, `unread_count` | `recipient_read_status` | #27 |

## Tables written

| Table | Change | Rule |
|---|---|---|
| `bookings` | F-SCHED-04: `start_at`, `duration_minutes`, `end_at`, `group_size`, `agreed_price_total`, `conditions_snapshot`, `updated_at` (never `status`, `hold_expires_at`, `experience_id`, `agency_id`). F-SCHED-05/expiry: `status`, `updated_at`. F-SCHED-06: `status = Completed`, `arrival_at`, `updated_at` | #48, BR-007, BR-020, FR-005, FR-006, #11 |
| `booking_status_history` | one row per status change: `from_status`, `to_status`, `changed_by` (Provider user; empty for expiry), `changed_at`, `reason` (required for Cancelled; fixed text for expiry) | BR-019, #10, #46 |
| `audit_logs` | one row per F-SCHED-04: `action = booking.update`, `target_type = booking`, `target_id`, `change_or_result` = before/after of changed fields | #27 |
| `chat_messages` | one per event: `message_kind = Booking Update`, `sender_user_id` empty, `booking_id`, `experience_id`, `text` (#49), `sent_at` | FR-008, #49 |
| `chat_sessions` | `last_message_at`; a new Active row (`source = Booking`, `booking_id`) only when the pair has no Active Chat | FR-008, #13 |
| `chat_participants` | Agency row `unread_count` +1; two new rows for a new Chat | #27, #13 |

All rows of one event are written in one persist (#44).

## State transitions (US-5)

```text
On hold --F-SCHED-05 confirm (now < hold_expires_at)--> Booked
On hold --F-SCHED-05 cancel (reason)------------------> Cancelled
On hold --expiry (now >= hold_expires_at)-------------> Cancelled  (changed_by empty, fixed reason)
Booked  --F-SCHED-05 cancel (reason)------------------> Cancelled
Booked  --F-SCHED-06 arrival (now >= start_at)--------> Completed (arrival_at)
Completed, Cancelled: terminal (BR-011)
```

## Spec field → column

| Spec | Column |
|---|---|
| `duration` | `bookings.duration_minutes` |
| `agreed_price` | `bookings.agreed_price_total` |
| `booking_conditions` | `bookings.conditions_snapshot` |
| `arrived_at` | `bookings.arrival_at` |
| `last_updated_at` | `bookings.updated_at` |
| `cancellation_reason` | `booking_status_history.reason` |
| `chat_auto_message_id`, `agency_notification_message_id` | `chat_messages.message_id` (#55) |
| `audit_log_id` | `audit_logs.audit_id` |
