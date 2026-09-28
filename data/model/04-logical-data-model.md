# 04 — Logical data model

This is a candidate relational model derived from the [Function List](../../docs/spec/docs/function-list.md) and module §6/BR/IO contracts. Relation names and `*_id` identifiers are modeling notation. The source says only `ID`; UUID/bigint, SQL column types, indexes, generated keys and storage vendor remain open. Fields listed as `?` are nullable/optional in the source; otherwise the indicated source contract controls requiredness. No computed UI field automatically becomes a stored column.

## Identity, registration and administration

| Relation | Candidate key, attributes and references | Source / integrity rule |
|---|---|---|
| `role` | `role_code` | F-AUTH-15/16; canonical `ADMIN`, `Tour_Agency`, `Local_Provider` from consistency contract §Shared field. |
| `permission` | `permission_code`, `action`, `resource` | AUT §6; F-AUTH-15/16. Exact permission vocabulary is `[NEEDS CLARIFICATION]`. |
| `role_permission` | `(role_code, permission_code)` | AUT §6 many-to-many Role–Permission; cannot grant admin subtype scope through role alone. |
| `user_account` | `user_id`, `email`, `password_hash`, `role_code → role`, `admin_type?`, `account_status`, `full_name`, `title?`, `phone?`, `avatar_ref?`, `must_change_password?`, `last_login?`, `created_date` | F-AUTH-04/07/19/20/22/24/25; `email` unique after normalization; `admin_type` required iff role ADMIN. Agency status: Pending Approval/Approved/Rejected/Disabled; Admin/Provider status: Active/Disabled. No plaintext password. |
| `session` | `session_id`, `user_id → user_account`, `role_context`, `expires_at`, `revoked_at?` | AUT §6; F-AUTH-07/09/17. Session lifetime/transport Plan choice. |
| `password_reset_token` | `token_id`, `user_id → user_account`, `token_verifier`, `issued_at`, `expires_at`, `used_at?` | F-AUTH-11/12; 15-minute, single-use link. Verifier storage representation Plan choice. |
| `registration_resubmission_token` | `token_id`, `registration_request_id → agency_registration_request`, `token_verifier`, `issued_at`, `expires_at`, `used_at?` | F-AUTH-18/26; time-limited, single-use link. Exact validity period `[NEEDS CLARIFICATION]`. |
| `agency_registration_request` | `registration_request_id`, `email`, `pending_password_hash`, `current_status`, `agency_user_id? → user_account`, `current_version_no`, `created_at` | F-AUTH-02/04/18/26; the pre-account request retains only a server-side password hash. Pending Approval/Approved/Rejected/Disabled are account states; Request More Information is a review decision while account remains Pending Approval. Exact request-state enum needs confirmation. |
| `registration_otp_challenge` | `challenge_id`, `registration_request_id → agency_registration_request`, `email`, `verifier`, `issued_at`, `expires_at`, `used_at?`, `attempt_count`, `resend_count` | F-AUTH-23/04. Six digits; valid 10 minutes; maximum 5 verification attempts per challenge; maximum 3 resends/email/15 minutes; a new OTP invalidates the previous active OTP. |
| `registration_submission_version` | `(registration_request_id, version_no)`, `submitted_at`, `company_name`, `company_type`, `tax_id`, `location`, `contact_information`, `team_size`, `tour_types`, `submitted_by` | F-AUTH-02/04/26. Append-only; resubmit increments version and retains previous documents/reviews. Attribute decomposition and missing types carried to review. |
| `agency_review_record` | `review_id`, `(registration_request_id, version_no)? → registration_submission_version`, `major_change_id? → agency_major_change_request`, `hdt_user_id → user_account`, `decision`, `comments?`, `decided_at` | F-AUTH-18/26; exactly one reviewed subject; reviews remain after resubmission/rejection. Decisions Approve, Request More Information, Reject. |
| `ubnd_village_assignment` | `ubnd_user_id → user_account`, `village_id → village` | F-AUTH-19; unique `ubnd_user_id`, one assigned village per UBND. HDT has no village assignment. |
| `audit_log` | `audit_id`, `actor_user_id → user_account`, `action`, `target`, `occurred_at`, `change_or_result?` | AUT §6; F-AUTH-18/19/20/22/25. Audit scope/retention `[NEEDS CLARIFICATION]`. |

`email` and `tax_id` are candidate natural identifiers, but the sources do not explicitly say whether tax ID is globally unique across historical rejected registration versions. Only duplicate account email is explicitly checked (F-AUTH-03); see review Q-05.

## Catalog, profiles and media

| Relation | Candidate key, attributes and references | Source / integrity rule |
|---|---|---|
| `village` | `village_id`, source-provided name/location fields | F-PROFILE-03/04, F-MATCH-05; seeded read-only. Exact seed source and natural key `[NEEDS CLARIFICATION]`. |
| `agency_profile` | `agency_id`, `user_id → user_account`, `company_name`, `company_type`, `tax_id`, `location`, `description?`, `contact_info`, `team_size`, `tour_types`, `account_status` | PRF §6; F-PROFILE-01/02. `user_id` unique in MVP; account status must have one authority, preferably `user_account` pending owner confirmation. |
| `agency_major_change_request` | `major_change_id`, `agency_id → agency_profile`, `proposed_company_name?`, `proposed_tax_id?`, `review_status`, `submitted_at`, `reviewed_at?` | F-PROFILE-02/F-AUTH-18; major proposed values stay separate; account remains Approved. Rejected proposal must not replace approved values. Review history retained through `agency_review_record`. |
| `provider_profile` | `provider_id`, `user_id → user_account`, `village_id → village`, `business_name`, `craft_type`, `artisan_names`, `business_registration_number`, `business_registration_certificate_ref`, `location_address`, `description?`, `booking_conditions?`, `verification_status`, `published_verified_version?` | F-AUTH-20, F-PROFILE-03–05. `user_id` unique in MVP; village mandatory. Version persistence `[NEEDS CLARIFICATION]`. |
| `provider_profile_version` | `(provider_id → provider_profile, version_no)`, `verification_status`, `submitted_at?`, `published_at?`, content snapshot | F-PROFILE-04/05; one latest editable version and at most one currently published Verified version. Exact snapshot fields and concurrent pending-version rule Q-04. |
| `provider_verification_review` | `review_id`, `(provider_id, version_no) → provider_profile_version`, `reviewer_user_id → user_account`, `decision`, `revision_comments?`, `reviewed_at` | F-PROFILE-05; reviewer UBND must be assigned to provider village. |
| `provider_operating_hours` | `(provider_id → provider_profile, weekday, local_start, local_end)` candidate key | F-PROFILE-04, F-SCHED-09; weekly local windows; start < end, no overlapping windows per day; absent windows yield no availability. Multiple windows/day allowed by TimeRange wording, exact weekday representation Plan choice. |
| `experience` | `experience_id`, `provider_id → provider_profile`, `name`, `description`, `category`, `duration_minutes`, `price_per_person`, `max_participants`, `notice_period_hours`, `experience_location_address`, `cancellation_policy`, `archived_at?` | F-PROFILE-06; >0 price/capacity/duration, >=0 notice. Active Booking locks commercial/schedule-sensitive fields; hard delete only with zero Booking references. |
| `experience_discount_rule` | `experience_id → experience`, `rule_kind`, `pax_threshold`, `discount_percentage` | F-PROFILE-06 and PRF Q23; `rule_kind` represents group discount vs special rate; positive threshold and 0–100 percentage. Rule ordering/stacking remains unspecified. |
| `media` | `media_id`, `storage_ref`, `media_type`, `category?`, `metadata` | F-PROFILE-02/04/06; media bytes live outside relational data; image validation from consistency contract §Shared field. |
| `profile_media` | `(media_id → media, agency_id? → agency_profile, provider_id? → provider_profile, experience_id? → experience)` | PRF §6; exactly one owner per media reference; Experience must retain one image in each required category under F-PROFILE-06. A split owner table is an alternative physical design. |
| `ai_description_draft` | `draft_id`, `provider_id?`, `experience_id?`, `original_description`, `refined_description_draft`, `profile_context?` | PRF §6; F-PROFILE-07. Exactly one source owner; whether unaccepted drafts persist `[NEEDS CLARIFICATION]`. |

## Discovery, matching and inquiry

| Relation | Candidate key, attributes and references | Source / integrity rule |
|---|---|---|
| `matching_session` | `matching_session_id`, `agency_id → agency_profile`, `conversation_context?`, `last_activity_at`, `started_at` | F-MATCH-01/02/09/13; created when an authorized Agency opens the assistant. |
| `matching_message` | `message_id`, `matching_session_id → matching_session`, `sender`, `text`, `sent_at` | F-MATCH-02/09; user input <=2,000 characters. |
| `tour_preference_profile` | `matching_session_id → matching_session`, `hard_constraints`, `matching_attributes`, `inferred_preferences?`, `preference_weights`, `is_complete` | F-MATCH-03/04/09; weights 0–1 sum to 1 across non-hard constraints; schema of nested attributes can remain structured until Plan. |
| `recommendation_result` | `matching_session_id → matching_session`, `experience_id → experience`, `rank`, `match_score`, `experience_fit_score`, `explanation` | F-MATCH-05–08; persistence `[NEEDS CLARIFICATION]`; if stored, candidate key `(matching_session_id, rank)` and result-run identity for reruns. |
| `agency_preference_profile` | `agency_id → agency_profile`, `preference_weights`, `updated_at` | F-MATCH-10/16, F-EXPLORE-09; one shared Agency record; avoid separate AIT and Explore copies. |
| `preference_signal` | `signal_id`, `agency_id → agency_profile`, `matching_session_id?`, `experience_id?`, `signal_type`, `value`, `confidence_score?`, `captured_at`, `base_weight?` | F-MATCH-14/15, F-EXPLORE-07–09. Reweighted value = base × 0.5^(age_days/30); can be derived; retention differs by signal source and needs confirmation. |
| `quote_request` | `quote_request_id`, `agency_id → agency_profile`, `experience_id → experience`, `created_at`, `source` | F-MATCH-11, F-EXPLORE-11; unique `(agency_id, experience_id)` even after Booking cancellation; not a Booking. |
| `explore_session` | `session_id`, `agency_id? → agency_profile`, `anonymous_session_ref?`, `analytics_consent`, `tracking_scope`, `started_at`, `ended_at?` | F-EXPLORE-05/06; Guest must not be linked to a user identity; non-essential Guest analytics only with consent. |
| `explore_interaction` | `interaction_id`, `session_id → explore_session`, `experience_id?`, `provider_id?`, `action_type`, `occurred_at`, `duration_on_previous_screen?`, `filter_values?` | F-EXPLORE-05–07/13; may be absent when tracking scope forbids logging. |
| `ranking_parameter_version` | `version_id`, `parameter_map`, `tuning_log`, `created_at`, `deployment_status?` | F-EXPLORE-15/17; approval/deployment authority remains unresolved. |
| `ranking_quality_assessment` | `assessment_id`, `version_id → ranking_parameter_version`, `period_start`, `period_end`, `score`, `assessment`, `kpi_values` | F-EXPLORE-14/16; do not persist separate copies of all dashboard metrics. |

## Booking, communication and notification

| Relation | Candidate key, attributes and references | Source / integrity rule |
|---|---|---|
| `booking` | `booking_id`, `agency_id → agency_profile`, `provider_id → provider_profile`, `experience_id → experience`, `start_at`, `duration_minutes`, `group_size`, `agreed_price_total`, `conditions_snapshot`, `status`, `created_at`, `hold_expires_at`, `arrival_at?` | F-SCHED-03–07; one slot, create On hold, original hold expires after 72h; provider must own Experience; price is a transaction snapshot independent of later Experience edits. |
| `booking_status_history` | `history_id`, `booking_id → booking`, `from_status?`, `to_status`, `changed_by? → user_account`, `changed_at`, `reason?` | BKG §6; F-SCHED-05/06/08. Append-only accepted transitions, including worker expiry. |
| `chat_session` | `chat_session_id`, `agency_id → agency_profile`, `provider_id → provider_profile`, `source`, `experience_id?`, `quote_request_id?`, `booking_id?`, `status`, `started_at`, `last_message_at?`, `closed_at?`, `closed_by?` | F-CHAT-01/04; at most one Active Chat per Agency–Provider pair; Closed terminal. Context IDs do not create separate threads. |
| `chat_participant` | `(chat_session_id → chat_session, user_id → user_account)`, `last_read_message_ref?`, `unread_count?` | IAC §6; F-CHAT-01/03. Only Agency and Provider participants; read cursor or stored count is a Plan choice. |
| `chat_message` | `message_id`, `chat_session_id → chat_session`, `sender_user_id? → user_account`, `text?`, `message_kind`, `booking_id?`, `sent_at` | F-CHAT-02/03, F-SCHED-08; booking system messages may have no human sender; no E2EE claim. |
| `private_attachment` | `attachment_id`, `message_id? → chat_message`, `registration_request_id?`, `version_no?`, `uploaded_by?`, `storage_ref`, `file_name`, `file_type`, `file_size`, `created_at` | F-CHAT-05, F-AUTH-02/26. Exactly one owning context; legal/chat access rules differ. See review Q-03. |
| `notification` | `notification_id`, `recipient_user_id → user_account`, `event_type`, `source_ref`, `created_at`, `read_at?`, `email_delivery_status?` | Consistency contract §Dashboard; review and Booking notifications. Recipient-scoped read state; delivery attempts may need separate relation after delivery semantics confirmed. |

## State transitions and temporal rules

| State owner | Permitted transitions established by source | Evidence |
|---|---|---|
| Agency account/review | New verified registration → Pending Approval; HDT → Approved/Rejected/Request More Information; Request More Information keeps account Pending Approval; resubmit returns to HDT review; major-change proposal does not suspend an Approved Agency; Disabled/enable through account management | F-AUTH-04/18/22/26, F-PROFILE-02; consistency contract §Authentication |
| Provider account | Active ↔ Disabled through scoped admin actions | F-AUTH-20/22; consistency contract §Shared field |
| Provider profile | Draft → Pending Verification → Verified or Revision Required; last published Verified version stays visible during later review | F-PROFILE-04/05; consistency contract §Profile |
| Booking | Create On hold; On hold → Booked or Cancelled; Booked → Cancelled; Booked → Completed on/after start via Mark Group Arrival. The 72-hour worker also changes On hold → Cancelled; Completed/Cancelled are terminal | F-SCHED-03/05/06; BKG BR-011 and consistency contract §Booking. |
| Chat | Active → Closed; Closed never reopens | F-CHAT-01/04; consistency contract §Chat |

Dashboard totals use Agency/Provider state at selected end date; Booking trends/status use `booking.created_at` within the period; activity uses event timestamps; active collaborations count unique Agency–Provider pairs with current On hold/Booked Booking at end date. This requires historical status timestamps, not only current status; see review Q-08 (consistency contract §Dashboard).

## Normalization and integrity review

- Separate repeated submission versions, review decisions, media, operating windows, discount rules, booking transitions, messages and attachments from parent records (1NF/2NF).
- Store one shared Agency Preference Profile; Explore and Matching consume it rather than maintaining two inconsistent copies (3NF; EXP Open Question 13).
- Keep `provider_id` on Booking as an explicit historical scope only if it must remain stable when Experience ownership changes; otherwise derive through Experience. Ownership transfer is not specified; see Q-09.
- `agency_profile.account_status` repeats `user_account.account_status` in PRF §6. Use one authoritative value at physical design, with the other as a view. Source owner must confirm before DDL.
- Booking's agreed price and conditions are frozen transaction values. Updating Experience does not rewrite an existing Booking (F-SCHED-03/04; PRF F-PROFILE-06).
- No cascade delete may erase Registration versions/reviews, Bookings/history, Chat/messages/files or audit evidence. Exact delete/retention policy is Q-06. Village deletion is outside MVP.
