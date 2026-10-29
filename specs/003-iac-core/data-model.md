# Data Model: In-app Chat (IAC) — Core Slice (US-1)

Source of truth: `data/04-data-model.md` and `data/schema.sql`. This file lists **only** which tables this slice reads and writes, and the FR/BR that drives each access. No field definitions or data structures are redefined here. Field types, keys, and constraints are in `data/schema.sql`.

---

## 1. Tables Read and Written by This Slice

| Table | Operations | FR / BR Traced | Purpose in This Slice |
|---|---|---|---|
| `chat_sessions` | READ, WRITE (INSERT new session, UPDATE `last_message_at`) | FR-001, FR-002, FR-003 / BR-001, BR-004, BR-005, BR-013 | Stores persistent conversation thread between Agency and Provider; enforces unique active pair constraint (`chat_one_active_pair_uq`). |
| `chat_participants` | READ, WRITE (INSERT participants on session creation, UPDATE `unread_count` / `last_read_message_id`) | FR-001, FR-002, FR-003 / BR-002, BR-016, BR-017 | Tracks session participants, unread counter per participant, and validates authorization. |
| `chat_messages` | READ, WRITE (INSERT message, query history) | FR-002, FR-003 / BR-006, BR-007, BR-012, BR-014, BR-015 | Immutable message history with sender, timestamp, text (max 4000), message kind (`User Text`), and optional context IDs. |
| `agency_profiles` | READ only | FR-001, FR-003 / BR-001, BR-016 | Resolves Agency organization name (`agency_name`) for chat list display. |
| `provider_profiles` | READ only | FR-001, FR-003 / BR-001, BR-016 | Resolves Provider business name (`business_name`) for chat list display. |
| `user_accounts` | READ only | FR-001, FR-002, FR-003 / BR-002, BR-003 | Resolves participant display names (`full_name`) and validates active account status. |
| `experiences` | READ only | FR-001, FR-002 / BR-012 | Validates referenced experience context when chat originated from Explore or AI Matching. |
| `quote_requests` | READ only | FR-001, FR-002 / BR-012 | Validates referenced quote request context when chat originated from Request Quote. |
| `bookings` | READ only | FR-001, FR-002 / BR-012, BR-018 | Validates referenced booking context when chat originated from Booking; ensures chat does not modify bookings. |

---

## 2. Tables NOT Touched by This Slice

The following tables exist in `data/schema.sql` but are strictly out of scope for this initial core slice:
- `chat_attachments`, `stored_files` (FR-005 document attachments is Should-have, deferred).
- `notifications` (system notification creation is out of scope for MVP slice).
- `roles`, `permissions`, `role_permissions`, `sessions`, `password_reset_tokens` (Auth module).
- `agency_registration_requests`, `registration_*` (Registration module).
- `provider_profile_versions`, `provider_version_*`, `provider_operating_hours`, `provider_verification_reviews`, `ubnd_village_assignments` (Profile module).
- `experience_discount_rules`, `profile_media`, `ai_description_drafts` (Profile module).
- `matching_sessions`, `tour_preference_profiles`, `recommendation_results`, `agency_preference_profiles`, `preference_signals` (AI Matching module).
- `explore_sessions`, `explore_interactions`, `ranking_parameter_versions` (Explore module).
- `booking_status_history` (Booking module).
- `audit_logs` (Admin module).

---

## 3. Key Derivations (Not Stored Columns)

| Derived Field | Calculation / Source | Spec Section |
|---|---|---|
| `is_new_session` | `true` if a new `chat_sessions` row was inserted; `false` if existing active session was returned. | §5.1 FR-001 |
| `participant_name` | Resolved from `user_accounts.full_name` via `chat_participants.user_id`. | §5.1 FR-003 |
| `organization` | Resolved from `agency_profiles.agency_name` or `provider_profiles.business_name`. | §5.1 FR-003 |
| `last_message_preview` | Extracted snippet from latest `chat_messages.text` (truncated to 80 chars if longer). | §5.1 FR-003 |
| `has_more_messages` | Boolean: `true` if count of remaining historical messages exceeds returned page size (50). | §5.1 FR-003 |

---

## 4. Field Name Mappings (API Layer Maps; `data/` Schema Unchanged)

| Spec Output / Input Name (§5.1) | Canonical Column Name in `data/schema.sql` | Table |
|---|---|---|
| `last_message_timestamp` | `last_message_at` | `chat_sessions` |
| `message_text` | `text` | `chat_messages` |
| `sender_id` | `sender_user_id` | `chat_messages` |
| `chat_status` | `status` | `chat_sessions` |

