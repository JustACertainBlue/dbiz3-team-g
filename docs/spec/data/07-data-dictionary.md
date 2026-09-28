# 08 — Physical data dictionary

PostgreSQL candidate. `PK`, `FK`, `UQ`, `NN` mean primary key, foreign key, unique and not null. `?` means nullable. Full executable checks and references are authoritative in [`schema.sql`](schema.sql).

## Reference and identity

| Table | Columns | Key constraints | Source |
|---|---|---|---|
| `roles` | `role_code varchar(32) NN`, `display_name varchar(80) NN` | PK `role_code`; code ∈ ADMIN/Tour_Agency/Local_Provider | F-AUTH-15/16 |
| `permissions` | `permission_code varchar(80) NN`, `action varchar(80) NN`, `resource varchar(80) NN` | PK `permission_code` | AUT §6; F-AUTH-15/16 |
| `role_permissions` | `role_code varchar(32) NN`, `permission_code varchar(80) NN` | composite PK; two FKs | AUT §6 |
| `villages` | `village_id uuid NN`, `source_code varchar(80) NN`, `name varchar(255) NN`, `district?`, `city_province varchar(120) NN`, `is_active boolean NN` | PK; UQ `source_code`; seeded | F-PROFILE-03/04; F-MATCH-05; approved Q-11 remains provisional |
| `user_accounts` | `user_id uuid`, `email varchar(254)`, `password_hash text`, `role_code`, `admin_type?`, `account_status`, `full_name`, `title?`, `phone?`, `avatar_storage_key?`, `must_change_password`, `last_login?`, `created_at`, `updated_at` | PK; UQ lower(email); subtype/status checks | F-AUTH-04/07/19/20/22/24/25 |
| `account_status_history` | `history_id uuid`, `user_id uuid`, `from_status?`, `to_status`, `changed_by?`, `changed_at`, `reason?` | PK; user/actor FKs; append-only by service policy | F-AUTH-18/22; ADM snapshot rule; Q-08 candidate |
| `ubnd_village_assignments` | `ubnd_user_id uuid`, `village_id uuid`, `assigned_by uuid`, `assigned_at` | PK/UQ `ubnd_user_id`; village/admin FKs | F-AUTH-19 |
| `sessions` | `session_id uuid`, `user_id uuid`, `role_context`, `expires_at`, `revoked_at?`, `created_at` | PK; user FK | F-AUTH-07/09/17 |
| `password_reset_tokens` | `token_id uuid`, `user_id uuid`, `token_verifier text`, `issued_at`, `expires_at`, `used_at?` | PK; UQ verifier; expiry > issue | F-AUTH-11/12 |

## Registration and profiles

| Table | Columns | Key constraints | Source |
|---|---|---|---|
| `agency_registration_requests` | `registration_request_id uuid`, `email`, `pending_password_hash`, `current_status`, `agency_user_id?`, `current_version_no`, `created_at`, `updated_at` | PK; Agency user FK; status check | F-AUTH-02/04/18/26; approved Q-01 |
| `registration_otp_challenges` | `challenge_id uuid`, `registration_request_id`, `email`, `otp_verifier`, `issued_at`, `expires_at`, `used_at?`, `invalidated_at?`, `attempt_count`, `resend_sequence` | PK; request FK; attempt 0–5; 10-minute expiry | F-AUTH-23 |
| `registration_resubmission_tokens` | `token_id uuid`, `registration_request_id`, `token_verifier`, `issued_at`, `expires_at`, `used_at?`, `invalidated_at?` | PK; UQ verifier; 24-hour expiry | F-AUTH-18/26; approved Q-02 |
| `registration_submission_versions` | `registration_request_id`, `version_no`, `submitted_at`, `submitted_by?`, `full_name`, `company_name`, `company_type`, `tax_id`, `location jsonb`, `contact_information jsonb`, `team_size`, `tour_types jsonb` | composite PK; request/user FKs; positive version/team size | F-AUTH-02/04/26 |
| `stored_files` | `file_id uuid`, `storage_key`, `file_name`, `media_type`, `file_size_bytes`, `uploaded_by?`, `created_at` | PK; UQ storage key; positive size | F-AUTH-02/26; F-CHAT-05; approved Q-03 |
| `registration_documents` | `registration_request_id`, `version_no`, `file_id`, `document_type` | composite PK; version/file FKs | F-AUTH-02/26; approved Q-03 |
| `agency_profiles` | `agency_id uuid`, `user_id uuid`, `registration_request_id uuid`, approved company/contact/location/team/tour fields, `description?`, `created_at`, `updated_at` | PK; UQ user and registration; tax candidate UQ | F-AUTH-04; F-PROFILE-01/02 |
| `agency_major_change_requests` | `major_change_id uuid`, `agency_id`, `proposed_company_name?`, `proposed_tax_id?`, `review_status`, `submitted_at`, `reviewed_at?` | PK; Agency FK; partial UQ pending/Request More Information | F-PROFILE-02; F-AUTH-18; approved Q-13 provisional |
| `agency_review_records` | `review_id uuid`, registration subject pair? or `major_change_id?`, `hdt_user_id`, `decision`, `comments?`, `decided_at` | PK; exactly one subject; FKs | F-AUTH-18/26 |
| `provider_profiles` | `provider_id uuid`, `user_id`, `village_id`, `business_registration_number`, `current_version_no?`, `published_version_no?`, `verification_status`, timestamps | PK; UQ user; village FK | F-AUTH-20; F-PROFILE-03–05 |
| `provider_profile_versions` | `provider_id`, `version_no`, `version_status`, public/legal/contact/location/content fields, `submitted_at?`, `published_at?` | composite PK; one working + one published partial UQ | F-PROFILE-04/05; approved Q-04 |
| `provider_verification_reviews` | `review_id uuid`, `provider_id`, `version_no`, `reviewer_user_id`, `decision`, `revision_comments?`, `reviewed_at` | PK; version/reviewer FKs | F-PROFILE-05 |
| `provider_operating_hours` | `operating_hour_id uuid`, `provider_id`, `weekday smallint`, `local_start time`, `local_end time` | PK; UQ provider/day/start/end; 1–7 weekday; start < end | F-PROFILE-04; F-SCHED-09 |
| `experiences` | `experience_id uuid`, `provider_id`, name/description/category, `duration_minutes`, `price_per_person numeric(18,2)`, `max_participants`, `notice_period_hours`, address, `cancellation_policy jsonb`, `archived_at?`, timestamps | PK; UQ `(experience_id,provider_id)`; positive checks | F-PROFILE-06 |
| `experience_discount_rules` | `rule_id uuid`, `experience_id`, `rule_kind`, `pax_threshold`, `discount_percentage numeric(5,2)` | PK; FK; UQ experience/kind/threshold; percent 0–100 | F-PROFILE-06; PRF Q23 |
| `profile_media` | `profile_media_id uuid`, `file_id`, exactly one of Agency/Provider/Experience owner, `category?`, `display_order` | PK; owner/file FKs; exactly one owner | F-PROFILE-02/04/06 |
| `provider_version_media` | `provider_id`, `version_no`, `file_id`, `category`, `display_order` | composite PK; version/file FKs | F-PROFILE-04/05; approved Q-04 |
| `ai_description_drafts` | `draft_id uuid`, one Provider/Experience owner, original/refined text, `profile_context?`, `created_at`, `accepted_at?` | PK; exactly one owner | F-PROFILE-07; Q-10 provisional |

## Matching and Explore

| Table | Columns | Key constraints | Source |
|---|---|---|---|
| `matching_sessions` | `matching_session_id uuid`, `agency_id`, `conversation_context?`, `started_at`, `last_activity_at` | PK; Agency FK | F-MATCH-01/02/09/13 |
| `matching_messages` | `message_id uuid`, `matching_session_id`, `sender`, `text`, `sent_at` | PK; session FK; text <= 2,000 chars | F-MATCH-02/09 |
| `tour_preference_profiles` | `matching_session_id`, hard constraints/attributes/inferred preferences/weights JSONB, `is_complete`, `updated_at` | PK/FK; application asserts normalized weights | F-MATCH-03/04/09 |
| `recommendation_results` | `result_id uuid`, `matching_session_id`, `run_no`, `experience_id`, rank/scores/explanation, `created_at` | PK; UQ session/run/rank and session/run/experience | F-MATCH-05–08; approved Q-10 provisional |
| `agency_preference_profiles` | `agency_id`, `preference_weights jsonb`, `updated_at` | PK/FK Agency | F-MATCH-10/16; F-EXPLORE-09 |
| `preference_signals` | `signal_id uuid`, Agency/session/experience refs, type/value/confidence/base weight, `captured_at` | PK; score checks | F-MATCH-14/15; F-EXPLORE-07–09 |
| `quote_requests` | `quote_request_id uuid`, `agency_id`, `experience_id`, `source`, `created_at` | PK; UQ Agency–Experience | F-MATCH-11; F-EXPLORE-11 |
| `explore_sessions` | `session_id uuid`, `agency_id?`, `anonymous_session_ref?`, consent/scope, start/end | PK; exactly one or no identity according to scope | F-EXPLORE-05/06 |
| `explore_interactions` | `interaction_id uuid`, session/experience/provider refs, action type/time/duration/filter JSONB | PK; session FK | F-EXPLORE-05–07/13 |
| `ranking_parameter_versions` | `version_id uuid`, `parameter_map jsonb`, `tuning_log?`, `version_status`, `created_at` | PK; at most one Active candidate | F-EXPLORE-15/17; Q-12 provisional |
| `ranking_quality_assessments` | `assessment_id uuid`, `version_id`, period, score/assessment/KPI JSONB | PK; period and score checks | F-EXPLORE-14/16 |

## Booking, Chat and accountability

| Table | Columns | Key constraints | Source |
|---|---|---|---|
| `bookings` | `booking_id uuid`, Agency/Provider/Experience refs, `source_chat_session_id?`, start/duration/group/price/conditions, status, create/update/expiry/arrival | PK; composite Experience–Provider FK; positive checks; expiry = create +72h; exclusion overlap for active states | F-SCHED-03–07 |
| `booking_status_history` | `history_id uuid`, `booking_id`, from/to status, actor?, time, reason? | PK; Booking/user FKs | F-SCHED-05/06/08 |
| `chat_sessions` | `chat_session_id uuid`, Agency/Provider, source, optional Experience/Quote/Booking context, status/timestamps/closer | PK; partial UQ active Agency–Provider | F-CHAT-01/04; F-SCHED-08 |
| `chat_participants` | `chat_session_id`, `user_id`, `last_read_message_id?`, `unread_count` | composite PK; FKs; nonnegative count | F-CHAT-01/03 |
| `chat_messages` | `message_id uuid`, `chat_session_id`, sender?, text?, kind, Booking?, sent time | PK; FKs; content required unless system kind | F-CHAT-02/03; F-SCHED-08 |
| `chat_attachments` | `attachment_id uuid`, `message_id`, `file_id`, `uploaded_by`, `created_at` | PK; UQ file per message; FKs | F-CHAT-05; approved Q-03 |
| `notifications` | `notification_id uuid`, recipient, event type/source refs/payload, created/read time, email status | PK; recipient FK; read >= create | Consistency contract §Dashboard notifications |
| `audit_logs` | `audit_id uuid`, actor?, action, target type/id, occurred time, change/result JSONB | PK; actor FK; immutable by service policy | AUT §6; administrative mutation functions |

## Values handled outside single-row checks

- No overlapping operating-hour ranges per Provider/day requires an exclusion constraint or transactional validator.
- Provider reviewer village must equal Provider village and reviewer assignment; enforce in transaction or trigger after Plan.
- At least one Experience image in each required category and maximum registration/chat file counts require deferred/transaction validation.
- Preference-weight sum, Booking state-transition legality and token resend windows require service/transaction checks plus tests; a CHECK constraint alone cannot inspect other rows or previous state.
