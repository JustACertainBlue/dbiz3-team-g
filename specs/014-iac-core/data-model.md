# Data model: IAC core (F-CHAT-01..03)

Canonical definitions: [`data/04-data-model.md`](../../data/04-data-model.md) and
[`data/schema.sql`](../../data/schema.sql). This file redefines no column; it lists only the tables
this slice reads and writes, and why. Access goes through `demoRepository()`; values are strings.

## Tables written

| Table | Columns written | When | Rule |
|---|---|---|---|
| `chat_sessions` | all columns on create (`status` = `Active`, `source` ∈ schema enum, `matching_session_id` when `AI Matching`, `closed_at` / `closed_by` empty) | F-CHAT-01 new pair Chat | FR-001, #19, `chat_source_chk`, `chat_matching_link_chk`, `chat_one_active_pair_uq` |
| `chat_sessions` | `experience_id`, `quote_request_id`, `booking_id` (latest context, #21), `last_message_at` | F-CHAT-01 reuse; F-CHAT-02 send | FR-001, FR-002 |
| `chat_participants` | new rows (Agency user, Provider user, `unread_count` 0) | F-CHAT-01 new Chat | FR-001 |
| `chat_participants` | `unread_count` + 1 for the other participant (#26) | each stored message | BR-017 |
| `chat_participants` | `unread_count` = 0, `last_read_message_id` = newest message (#23) | first history page read | BR-017, #11 |
| `chat_messages` | new row: `message_kind` `User Text` (send, #18 context) or `Quote Request` (quote handoff); `sender_user_id`; `text` ≤ 4000; context ids; `sent_at` | F-CHAT-01 context, F-CHAT-02 | FR-002, #18, BR-006 (insert only) |
| `quote_requests` | unchanged behaviour of the quote handoff | Request Quote | EXP/AIT, unchanged |

BKG `agency-sync.ts` keeps writing `Booking Update` messages; it now finds or creates the pair
Chat through `chat-pairs.ts`.

## Tables read

| Table | Columns used | For | Rule |
|---|---|---|---|
| `agency_profiles` | `agency_id`, `user_id`, `company_name` | participant, `organization` | FR-003, #22 |
| `provider_profiles` | `provider_id`, `user_id`, `verification_status`, `published_version_no` | participant, Verified check on handoff | FR-001, FR-003 |
| `provider_profile_versions` | `provider_id`, `version_no`, `business_name` | `organization` | FR-003, #22 |
| `user_accounts` | `user_id`, `full_name` | `participant_name`, `sender_name` | FR-003, #22 |
| `experiences` | `experience_id`, `provider_id`, `name`, `archived_at` | handoff context | FR-001, #18 |
| `bookings` | `booking_id`, `agency_id`, `provider_id`, `experience_id` | `source = Booking` scope check | FR-001, edge "Booking outside scope" |
| `matching_sessions` | `matching_session_id`, `agency_id` | AIT ownership (existing route check) | FR-001 |
| `chat_attachments`, `stored_files` | `attachment_id`, `message_id`, `file_id`; `file_name`, `media_type`, `file_size_bytes` | read-only `attachments` in history | FR-003 output |

## State

`chat_sessions.status`: this slice creates `Active` only and never changes it. A `Closed` Chat is read
only: no message, no reopen (BR-021); a new interaction creates a new `Active` Chat. Active → Closed
is F-CHAT-04 (`015-iac-close`).

## Derived shapes (not stored)

Chat list entry and history item: see [contracts/chat-api.md](contracts/chat-api.md).
