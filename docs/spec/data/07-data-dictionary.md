# 07 — Physical data dictionary

PostgreSQL 16 candidate, generated from [`schema.sql`](schema.sql) (which loads and validates with the full seed).
`PK`/`FK`/`UQ`/`NN` = primary key / foreign key / unique / not null; `?` = nullable. Full CHECK/EXCLUDE/trigger
definitions are authoritative in `schema.sql`.

## `roles`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `role_code` | varchar(32) | NN | PK |
| `display_name` | varchar(80) | NN |  |

## `permissions`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `permission_code` | varchar(80) | NN | PK |
| `action` | varchar(80) | NN |  |
| `resource` | varchar(80) | NN |  |

## `role_permissions`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `role_code` | varchar(32) | NN | PK, FK→roles |
| `permission_code` | varchar(80) | NN | PK, FK→permissions |

## `villages`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `village_id` | uuid | NN | PK |
| `source_code` | varchar(80) | NN | UQ |
| `name` | varchar(255) | NN |  |
| `district` | varchar(120) | ? |  |
| `city_province` | varchar(120) | NN |  |
| `is_active` | boolean | NN |  |

## `user_accounts`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `user_id` | uuid | NN | PK |
| `email` | varchar(254) | NN |  |
| `password_hash` | text | NN |  |
| `role_code` | varchar(32) | NN | FK→roles |
| `admin_type` | varchar(8) | ? |  |
| `account_status` | varchar(24) | NN |  |
| `full_name` | varchar(100) | NN |  |
| `title` | varchar(120) | ? |  |
| `phone` | varchar(16) | ? |  |
| `avatar_file_id` | uuid | ? |  |
| `must_change_password` | boolean | NN |  |
| `password_changed_at` | timestamptz | ? |  |
| `last_login` | timestamptz | ? |  |
| `created_at` | timestamptz | NN |  |
| `updated_at` | timestamptz | NN |  |

## `account_status_history`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `history_id` | uuid | NN | PK |
| `user_id` | uuid | NN | FK→user_accounts |
| `from_status` | varchar(24) | ? |  |
| `to_status` | varchar(24) | NN |  |
| `changed_by` | uuid | ? | FK→user_accounts |
| `changed_at` | timestamptz | NN |  |
| `reason` | text | ? |  |

## `ubnd_village_assignments`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `ubnd_user_id` | uuid | NN | PK, FK→user_accounts |
| `village_id` | uuid | NN | FK→villages |
| `assigned_by` | uuid | NN | FK→user_accounts |
| `assigned_at` | timestamptz | NN |  |

## `sessions`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `session_id` | uuid | NN | PK |
| `user_id` | uuid | NN | FK→user_accounts |
| `role_context` | varchar(32) | NN |  |
| `token_hash` | text | ? |  |
| `expires_at` | timestamptz | NN |  |
| `revoked_at` | timestamptz | ? |  |
| `created_at` | timestamptz | NN |  |

## `password_reset_tokens`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `token_id` | uuid | NN | PK |
| `user_id` | uuid | NN | FK→user_accounts |
| `token_verifier` | text | NN | UQ |
| `issued_at` | timestamptz | NN |  |
| `expires_at` | timestamptz | NN |  |
| `used_at` | timestamptz | ? |  |

## `agency_registration_requests`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `registration_request_id` | uuid | NN | PK |
| `email` | varchar(254) | NN |  |
| `pending_password_hash` | text | ? |  |
| `current_status` | varchar(32) | NN |  |
| `agency_user_id` | uuid | ? | FK→user_accounts, UQ |
| `current_version_no` | integer | NN |  |
| `created_at` | timestamptz | NN |  |
| `updated_at` | timestamptz | NN |  |

## `registration_otp_challenges`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `challenge_id` | uuid | NN | PK |
| `registration_request_id` | uuid | NN | FK→agency_registration_requests |
| `email` | varchar(254) | NN |  |
| `otp_verifier` | text | NN |  |
| `issued_at` | timestamptz | NN |  |
| `expires_at` | timestamptz | NN |  |
| `used_at` | timestamptz | ? |  |
| `invalidated_at` | timestamptz | ? |  |
| `attempt_count` | smallint | NN |  |
| `resend_sequence` | smallint | NN |  |

## `registration_resubmission_tokens`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `token_id` | uuid | NN | PK |
| `registration_request_id` | uuid | NN | FK→agency_registration_requests |
| `token_verifier` | text | NN | UQ |
| `issued_at` | timestamptz | NN |  |
| `expires_at` | timestamptz | NN |  |
| `used_at` | timestamptz | ? |  |
| `invalidated_at` | timestamptz | ? |  |

## `registration_submission_versions`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `registration_request_id` | uuid | NN | PK, FK→agency_registration_requests |
| `version_no` | integer | NN | PK |
| `submitted_at` | timestamptz | NN |  |
| `submitted_by` | uuid | ? | FK→user_accounts |
| `full_name` | varchar(100) | NN |  |
| `company_name` | varchar(255) | NN |  |
| `company_type` | varchar(32) | NN |  |
| `tax_id` | varchar(13) | NN |  |
| `location` | jsonb | NN |  |
| `contact_information` | jsonb | NN |  |
| `team_size` | integer | NN |  |
| `tour_types` | jsonb | NN |  |

## `stored_files`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `file_id` | uuid | NN | PK |
| `storage_key` | text | NN | UQ |
| `file_name` | varchar(255) | NN |  |
| `media_type` | varchar(100) | NN |  |
| `file_size_bytes` | bigint | NN |  |
| `width_px` | integer | ? |  |
| `height_px` | integer | ? |  |
| `uploaded_by` | uuid | ? | FK→user_accounts |
| `created_at` | timestamptz | NN |  |

## `registration_documents`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `registration_request_id` | uuid | NN | PK |
| `version_no` | integer | NN | PK |
| `file_id` | uuid | NN | PK, FK→stored_files |
| `document_type` | varchar(80) | NN |  |
| `REFERENCES` | registration | ? |  |

## `agency_profiles`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `agency_id` | uuid | NN | PK |
| `user_id` | uuid | NN | FK→user_accounts, UQ |
| `registration_request_id` | uuid | NN | FK→agency_registration_requests, UQ |
| `company_name` | varchar(255) | NN |  |
| `company_type` | varchar(32) | NN |  |
| `tax_id` | varchar(13) | NN |  |
| `location` | jsonb | NN |  |
| `description` | varchar(1000) | ? |  |
| `contact_info` | jsonb | NN |  |
| `team_size` | integer | NN |  |
| `tour_types` | jsonb | NN |  |
| `created_at` | timestamptz | NN |  |
| `updated_at` | timestamptz | NN |  |

## `agency_major_change_requests`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `major_change_id` | uuid | NN | PK |
| `agency_id` | uuid | NN | FK→agency_profiles |
| `proposed_company_name` | varchar(255) | ? |  |
| `proposed_tax_id` | varchar(13) | ? |  |
| `review_status` | varchar(32) | NN |  |
| `submitted_at` | timestamptz | NN |  |
| `reviewed_at` | timestamptz | ? |  |

## `agency_review_records`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `review_id` | uuid | NN | PK |
| `registration_request_id` | uuid | ? |  |
| `registration_version_no` | integer | ? |  |
| `major_change_id` | uuid | ? | FK→agency_major_change_requests |
| `hdt_user_id` | uuid | NN | FK→user_accounts |
| `decision` | varchar(32) | NN |  |
| `comments` | text | ? |  |
| `decided_at` | timestamptz | NN |  |
| `REFERENCES` | registration | ? |  |

## `provider_profiles`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `provider_id` | uuid | NN | PK |
| `user_id` | uuid | NN | FK→user_accounts, UQ |
| `village_id` | uuid | NN | FK→villages |
| `current_version_no` | integer | ? |  |
| `published_version_no` | integer | ? |  |
| `verification_status` | varchar(32) | NN |  |
| `created_at` | timestamptz | NN |  |
| `updated_at` | timestamptz | NN |  |

## `provider_profile_versions`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `provider_id` | uuid | NN | PK, FK→provider_profiles |
| `version_no` | integer | NN | PK |
| `version_status` | varchar(32) | NN |  |
| `business_registration_number` | varchar(80) | ? |  |
| `business_name` | varchar(255) | ? |  |
| `craft_type` | varchar(120) | ? |  |
| `artisan_names` | jsonb | ? |  |
| `location_address` | text | ? |  |
| `description` | text | ? |  |
| `contact_information` | jsonb | ? |  |
| `booking_conditions` | jsonb | ? |  |
| `submitted_at` | timestamptz | ? |  |
| `published_at` | timestamptz | ? |  |

## `provider_verification_reviews`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `review_id` | uuid | NN | PK |
| `provider_id` | uuid | NN | FK→provider_profile_versions |
| `version_no` | integer | NN | FK→provider_profile_versions |
| `reviewer_user_id` | uuid | NN | FK→user_accounts |
| `decision` | varchar(24) | NN |  |
| `revision_comments` | text | ? |  |
| `reviewed_at` | timestamptz | NN |  |

## `provider_version_documents`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `provider_id` | uuid | NN | PK, FK→provider_profile_versions |
| `version_no` | integer | NN | PK, FK→provider_profile_versions |
| `file_id` | uuid | NN | PK, FK→stored_files |
| `document_type` | varchar(80) | NN |  |

## `provider_operating_hours`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `operating_hour_id` | uuid | NN | PK |
| `provider_id` | uuid | NN | FK→provider_profiles, UQ |
| `weekday` | smallint | NN | UQ |
| `local_start` | time | NN | UQ |
| `local_end` | time | NN | UQ |

## `experiences`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `experience_id` | uuid | NN | PK, UQ |
| `provider_id` | uuid | NN | FK→provider_profiles, UQ |
| `name` | varchar(255) | NN |  |
| `description` | text | NN |  |
| `category` | varchar(80) | NN |  |
| `duration_minutes` | integer | NN |  |
| `price_per_person` | numeric(18,2) | NN |  |
| `max_participants` | integer | NN |  |
| `notice_period_hours` | integer | NN |  |
| `experience_location_address` | text | NN |  |
| `cancellation_policy` | jsonb | NN |  |
| `archived_at` | timestamptz | ? |  |
| `created_at` | timestamptz | NN |  |
| `updated_at` | timestamptz | NN |  |

## `experience_discount_rules`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `rule_id` | uuid | NN | PK |
| `experience_id` | uuid | NN | FK→experiences, UQ |
| `rule_kind` | varchar(24) | NN | UQ |
| `pax_threshold` | integer | NN | UQ |
| `discount_percentage` | numeric(5,2) | NN |  |

## `profile_media`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `profile_media_id` | uuid | NN | PK |
| `file_id` | uuid | NN | FK→stored_files |
| `agency_id` | uuid | ? | FK→agency_profiles |
| `provider_id` | uuid | ? | FK→provider_profiles |
| `experience_id` | uuid | ? | FK→experiences |
| `category` | varchar(80) | ? |  |
| `display_order` | integer | NN |  |

## `provider_version_media`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `provider_id` | uuid | NN | PK, FK→provider_profile_versions |
| `version_no` | integer | NN | PK, FK→provider_profile_versions |
| `file_id` | uuid | NN | PK, FK→stored_files |
| `category` | varchar(80) | NN |  |
| `display_order` | integer | NN |  |

## `ai_description_drafts`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `draft_id` | uuid | NN | PK |
| `provider_id` | uuid | ? | FK→provider_profiles |
| `experience_id` | uuid | ? | FK→experiences |
| `original_description` | text | NN |  |
| `refined_description_draft` | text | NN |  |
| `profile_context` | jsonb | ? |  |
| `created_at` | timestamptz | NN |  |
| `accepted_at` | timestamptz | ? |  |

## `matching_sessions`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `matching_session_id` | uuid | NN | PK |
| `agency_id` | uuid | NN | FK→agency_profiles |
| `conversation_context` | jsonb | ? |  |
| `started_at` | timestamptz | NN |  |
| `last_activity_at` | timestamptz | NN |  |

## `matching_messages`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `message_id` | uuid | NN | PK |
| `matching_session_id` | uuid | NN | FK→matching_sessions |
| `sender` | varchar(16) | NN |  |
| `text` | varchar(2000) | NN |  |
| `sent_at` | timestamptz | NN |  |

## `tour_preference_profiles`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `matching_session_id` | uuid | NN | PK, FK→matching_sessions |
| `hard_constraints` | jsonb | NN |  |
| `matching_attributes` | jsonb | NN |  |
| `inferred_preferences` | jsonb | ? |  |
| `preference_weights` | jsonb | NN |  |
| `is_complete` | boolean | NN |  |
| `updated_at` | timestamptz | NN |  |

## `recommendation_results`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `result_id` | uuid | NN | PK |
| `matching_session_id` | uuid | NN | FK→matching_sessions, UQ |
| `run_no` | integer | NN | UQ |
| `experience_id` | uuid | NN | FK→experiences, UQ |
| `rank` | integer | NN | UQ |
| `match_score` | numeric(5,2) | NN |  |
| `experience_fit_score` | numeric(5,2) | NN |  |
| `explanation` | text | NN |  |
| `created_at` | timestamptz | NN |  |

## `agency_preference_profiles`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `agency_id` | uuid | NN | PK, FK→agency_profiles |
| `preference_weights` | jsonb | NN |  |
| `updated_at` | timestamptz | NN |  |

## `preference_signals`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `signal_id` | uuid | NN | PK |
| `agency_id` | uuid | NN | FK→agency_profiles |
| `matching_session_id` | uuid | ? | FK→matching_sessions |
| `experience_id` | uuid | ? | FK→experiences |
| `signal_type` | varchar(80) | NN |  |
| `signal_value` | jsonb | NN |  |
| `confidence_score` | numeric(4,3) | ? |  |
| `base_weight` | numeric(8,5) | ? |  |
| `captured_at` | timestamptz | NN |  |

## `quote_requests`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `quote_request_id` | uuid | NN | PK |
| `agency_id` | uuid | NN | FK→agency_profiles, UQ |
| `experience_id` | uuid | NN | FK→experiences, UQ |
| `source` | varchar(24) | NN |  |
| `matching_session_id` | uuid | ? | FK→matching_sessions |
| `created_at` | timestamptz | NN |  |

## `explore_sessions`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `session_id` | uuid | NN | PK |
| `agency_id` | uuid | ? | FK→agency_profiles |
| `anonymous_session_ref` | varchar(120) | ? |  |
| `analytics_consent` | boolean | NN |  |
| `tracking_scope` | varchar(32) | NN |  |
| `started_at` | timestamptz | NN |  |
| `ended_at` | timestamptz | ? |  |

## `explore_interactions`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `interaction_id` | uuid | NN | PK |
| `session_id` | uuid | NN | FK→explore_sessions |
| `experience_id` | uuid | ? | FK→experiences |
| `provider_id` | uuid | ? | FK→provider_profiles |
| `action_type` | varchar(32) | NN |  |
| `occurred_at` | timestamptz | NN |  |
| `duration_on_previous_screen` | integer | ? |  |
| `filter_values` | jsonb | ? |  |

## `ranking_parameter_versions`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `version_id` | uuid | NN | PK |
| `parameter_map` | jsonb | NN |  |
| `tuning_log` | text | ? |  |
| `version_status` | varchar(16) | NN |  |
| `created_at` | timestamptz | NN |  |

## `ranking_quality_assessments`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `assessment_id` | uuid | NN | PK |
| `version_id` | uuid | NN | FK→ranking_parameter_versions |
| `period_start` | date | NN |  |
| `period_end` | date | NN |  |
| `score` | numeric(5,2) | NN |  |
| `assessment` | varchar(8) | NN |  |
| `kpi_values` | jsonb | NN |  |

## `bookings`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `booking_id` | uuid | NN | PK |
| `agency_id` | uuid | NN | FK→agency_profiles |
| `provider_id` | uuid | NN | FK→experiences |
| `experience_id` | uuid | NN | FK→experiences |
| `source_chat_session_id` | uuid | ? |  |
| `start_at` | timestamptz | NN |  |
| `duration_minutes` | integer | NN |  |
| `group_size` | integer | NN |  |
| `agreed_price_total` | numeric(18,2) | NN |  |
| `conditions_snapshot` | jsonb | NN |  |
| `status` | varchar(16) | NN |  |
| `created_at` | timestamptz | NN |  |
| `updated_at` | timestamptz | NN |  |
| `hold_expires_at` | timestamptz | NN |  |
| `end_at` | timestamptz | NN |  |
| `arrival_at` | timestamptz | ? |  |

## `booking_status_history`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `history_id` | uuid | NN | PK |
| `booking_id` | uuid | NN | FK→bookings |
| `from_status` | varchar(16) | ? |  |
| `to_status` | varchar(16) | NN |  |
| `changed_by` | uuid | ? | FK→user_accounts |
| `changed_at` | timestamptz | NN |  |
| `reason` | text | ? |  |

## `chat_sessions`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `chat_session_id` | uuid | NN | PK |
| `agency_id` | uuid | NN | FK→agency_profiles |
| `provider_id` | uuid | NN | FK→provider_profiles |
| `source` | varchar(24) | NN |  |
| `matching_session_id` | uuid | ? | FK→matching_sessions |
| `experience_id` | uuid | ? | FK→experiences |
| `quote_request_id` | uuid | ? | FK→quote_requests |
| `booking_id` | uuid | ? | FK→bookings |
| `status` | varchar(8) | NN |  |
| `started_at` | timestamptz | NN |  |
| `last_message_at` | timestamptz | ? |  |
| `closed_at` | timestamptz | ? |  |
| `closed_by` | uuid | ? | FK→user_accounts |

## `chat_participants`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `chat_session_id` | uuid | NN | PK, FK→chat_sessions |
| `user_id` | uuid | NN | PK, FK→user_accounts |
| `last_read_message_id` | uuid | ? |  |
| `unread_count` | integer | NN |  |

## `chat_messages`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `message_id` | uuid | NN | PK |
| `chat_session_id` | uuid | NN | FK→chat_sessions |
| `sender_user_id` | uuid | ? | FK→user_accounts |
| `text` | varchar(4000) | ? |  |
| `message_kind` | varchar(24) | NN |  |
| `experience_id` | uuid | ? | FK→experiences |
| `quote_request_id` | uuid | ? | FK→quote_requests |
| `booking_id` | uuid | ? | FK→bookings |
| `sent_at` | timestamptz | NN |  |

## `chat_attachments`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `attachment_id` | uuid | NN | PK |
| `message_id` | uuid | NN | FK→chat_messages, UQ |
| `file_id` | uuid | NN | FK→stored_files, UQ |
| `uploaded_by` | uuid | NN | FK→user_accounts |
| `created_at` | timestamptz | NN |  |

## `notifications`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `notification_id` | uuid | NN | PK |
| `recipient_user_id` | uuid | NN | FK→user_accounts |
| `event_type` | varchar(80) | NN |  |
| `source_type` | varchar(80) | NN |  |
| `source_id` | uuid | ? |  |
| `payload` | jsonb | NN |  |
| `created_at` | timestamptz | NN |  |
| `read_at` | timestamptz | ? |  |
| `email_delivery_status` | varchar(16) | ? |  |

## `audit_logs`

| Column | Type | Null | Key / notes |
|---|---|---|---|
| `audit_id` | uuid | NN | PK |
| `actor_user_id` | uuid | ? | FK→user_accounts |
| `action` | varchar(120) | NN |  |
| `target_type` | varchar(80) | NN |  |
| `target_id` | uuid | ? |  |
| `occurred_at` | timestamptz | NN |  |
| `change_or_result` | jsonb | ? |  |

