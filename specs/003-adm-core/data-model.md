# Data Model: Admin Dashboard (ADM) — Core Slice

**Feature**: `003-adm-core` | **Spec**: [specs/003-adm-core/spec.md](spec.md)

**Source of Truth**: `data/data-model-ADM.md` (and canonical [`data/04-data-model.md`](../../data/04-data-model.md), [`data/schema.sql`](../../data/schema.sql)).

This file lists **only** which tables and collections this slice reads, and the FR / BR that drives each access. No field definitions, types, keys, or constraints are redefined here.

---

## 1. Access Characteristics

- **Strictly Read-Only**: In compliance with `BR-006` and `BR-013`, this slice performs **zero write operations** (no `INSERT`, `UPDATE`, or `DELETE`).
- **Scope-Constrained**: Queries are parameterized and scoped strictly by the authenticated actor's permissions (`BR-001`, `BR-002`, `BR-003`, `BR-008`, `BR-009`, `BR-010`).

---

## 2. Tables Read by this Slice

| Table | Operations | Key Attributes Accessed | Driving FR / BR |
|---|---|---|---|
| `user_accounts` | READ only | `user_id`, `role_code`, `admin_type`, `account_status` | FR-001, FR-002, FR-007, FR-008 / BR-001, BR-002, BR-008, BR-015 |
| `ubnd_village_assignments` | READ only | `ubnd_user_id`, `village_id` | FR-001, FR-002, FR-005 / BR-002, BR-003, BR-008, BR-009, BR-010 |
| `villages` | READ only | `village_id`, `name`, `district`, `city_province`, `is_active` | FR-002, FR-005, FR-008 / BR-004, BR-005, BR-009 |
| `agency_profiles` | READ only | `agency_id`, `user_id`, `company_name` | FR-002, FR-006, FR-007, FR-009, FR-010 / BR-008, BR-014, BR-015 |
| `provider_profiles` | READ only | `provider_id`, `user_id`, `village_id`, `verification_status`, `published_version_no` | FR-002, FR-005, FR-006, FR-008, FR-009, FR-010 / BR-009, BR-014, BR-016 |
| `provider_profile_versions` | READ only | `provider_id`, `version_no`, `business_name`, `craft_type`, `version_status` | FR-008, FR-009, FR-010 / BR-009 |
| `experiences` | READ only | `experience_id`, `provider_id`, `name` | FR-009 |
| `bookings` | READ only | `booking_id`, `agency_id`, `provider_id`, `experience_id`, `start_at`, `created_at`, `status`, `agreed_price_total` | FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010 / BR-007, BR-010, BR-017, BR-018 |
| `quote_requests` | READ only | `quote_request_id`, `agency_id`, `experience_id`, `created_at` | FR-007, FR-008 / BR-015, BR-016 (activity detection) |
| `chat_sessions` | READ only | `session_id`, `agency_id`, `provider_id`, `created_at` | FR-007, FR-008 / BR-015, BR-016 (activity detection) |
| `chat_messages` | READ only | `message_id`, `session_id`, `sender_id`, `created_at` | FR-007, FR-008 / BR-015, BR-016 (activity detection) |

---

## 3. Tables NOT Touched by this Slice

The following tables are outside the scope of the Admin Dashboard monitoring slice and are neither read nor written:

- **Authentication & Security Lifecycle**: `roles`, `permissions`, `role_permissions`, `sessions`, `password_reset_tokens`, `registration_otp_challenges`, `registration_resubmission_tokens`, `agency_registration_requests`, `registration_submission_versions`, `registration_documents`, `agency_review_records`, `agency_major_change_requests`, `stored_files`, `audit_logs`.
- **Provider Media & Detailed Verification**: `provider_verification_reviews`, `provider_version_documents`, `provider_operating_hours`, `experience_discount_rules`, `profile_media`, `provider_version_media`, `ai_description_drafts`.
- **AI Matching & Explore Algorithms**: `matching_sessions`, `matching_messages`, `tour_preference_profiles`, `recommendation_results`, `agency_preference_profiles`, `preference_signals`, `explore_sessions`, `explore_interactions`, `ranking_parameter_versions`, `ranking_quality_assessments`.
- **Notifications & Chat Internals**: `chat_participants`, `chat_attachments`, `notifications`, `booking_status_history`.

---

## 4. Key Derivations (Not Stored Columns)

The Admin Dashboard displays synthesized, aggregated analytical values that are calculated on the fly rather than persisted in the database:

| Derived Field | Calculation / Source | Driving FR / BR |
|---|---|---|
| `active_collaborations` | Count of unique `(agency_id, provider_id)` pairs with $\ge 1$ booking in `On hold` or `Booked` status in the reporting scope. | FR-003, BR-017 |
| `collaboration_frequency` | Count of `Booked` and `Completed` bookings for an `(agency_id, provider_id)` pair (excludes `On hold` and `Cancelled`). | FR-010, BR-018 |
| `booking_trend_series` | Time-series aggregation grouped by date buckets (Daily for 1–31d, Weekly for 32–180d, Monthly for >180d). | FR-009, BR-019 |
| `active_agency_count` | Count of unique Agencies with $\ge 1$ Quote Request, $\ge 1$ Chat action, or $\ge 1$ Booking in the period. | FR-007, BR-015 |
| `active_provider_count` | Count of unique Providers with $\ge 1$ Quote Request received, $\ge 1$ Chat interaction, or $\ge 1$ Booking in the period. | FR-008, BR-016 |
| `trend_pct` | Percentage change comparing current period metrics against the immediately preceding period of identical day length; `null` if no prior data exists. | FR-003, FR-007, BR-003, BR-011 |
| `provider_activity_matrix` | Aggregated count matrix by `craft_type` and `activity_type` (`Quote Request`, `Chat`, `Booking`). | FR-008 |

---

## 5. Naming Mismatches (API Layer Maps; `data/` Columns Unchanged)

To preserve strict immutability of `data/`, the API and service layers translate between the specification output names and canonical schema columns:

| Spec Output / Section 5.1 Name | Schema Column Name | Canonical Table in `data/` |
|---|---|---|
| `agency_name` | `company_name` | `agency_profiles` |
| `provider_name` | `business_name` | `provider_profile_versions` (published version) |
| `experience_name` | `name` | `experiences` |
| `price` | `agreed_price_total` | `bookings` |
| `date` | `start_at` | `bookings` |
| `assigned_village_id` | `village_id` | `ubnd_village_assignments` |
| `role` | `role_code` | `user_accounts` |
