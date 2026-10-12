# Data Model: Profile Management (PRF) — Core Slice

Source of truth: `data/04-data-model.md`. This file lists **only** which tables this slice
reads and writes, and the FR/BR that drives each access. No field definitions are
duplicated here. Field types, keys and constraints are in `data/04-data-model.md`.

---

## Tables read and written by this slice

| Table | Operations | FR / BR |
|-------|-----------|---------|
| `agency_profiles` | READ, WRITE (non-major fields) | FR-001, FR-002 |
| `agency_major_change_requests` | READ, WRITE (INSERT on major change) | FR-002 / BR-017 |
| `agency_review_records` | READ only (derive `major_change_review_status`) | FR-002 |
| `provider_profiles` | READ, WRITE (`verification_status`, `published_version_no`) | FR-003, FR-004, FR-005 |
| `provider_profile_versions` | READ, WRITE (INSERT new version on major change or first submission) | FR-004, FR-005 / BR-006, BR-007, BR-018 |
| `provider_version_documents` | READ, WRITE (business registration certificate) | FR-004 / BR-006 |
| `provider_version_media` | READ, WRITE (profile images per version) | FR-004 / BR-008 |
| `provider_operating_hours` | READ, WRITE (upsert per weekday slot) | FR-004 / BR-021 |
| `provider_verification_reviews` | READ, WRITE (INSERT on UBND decision) | FR-005 / BR-005 |
| `ubnd_village_assignments` | READ only (village-scope check) | FR-005 / BR-005 |
| `experiences` | READ, WRITE (create, update, archive, hard-delete) | FR-006 / BR-010, BR-014, BR-019, BR-020 |
| `experience_discount_rules` | READ, WRITE (upsert group discounts / special rates) | FR-006 / BR-010 |
| `profile_media` | READ, WRITE (agency images, experience images with category) | FR-002, FR-006 / BR-008, BR-009, BR-015 |
| `ai_description_drafts` | WRITE (INSERT draft); READ (retrieve for display) | FR-007 / BR-011, BR-012, BR-013 |
| `stored_files` | READ (validate file_id before media insert) | FR-002, FR-004, FR-006 |
| `bookings` | READ only (check `status` for Experience lock/delete rules) | FR-006 / BR-014, BR-019 |
| `user_accounts` | READ only (`account_status`, `role_code`, `admin_type`) | FR-001, FR-002, FR-003 / BR-001, BR-003, BR-004 |
| `villages` | READ only (validate village membership) | FR-003, FR-005 / BR-005 |
| `audit_logs` | WRITE (INSERT on every profile/experience change) | FR-002, FR-004, FR-006 |

## Tables NOT touched by this slice

`roles`, `permissions`, `role_permissions`, `sessions`, `password_reset_tokens`,
`agency_registration_requests`, `registration_*`, `matching_*`, `tour_preference_profiles`,
`recommendation_results`, `agency_preference_profiles`, `preference_signals`,
`quote_requests`, `explore_sessions`, `explore_interactions`, `ranking_*`,
`booking_status_history`, `chat_*`, `notifications`

## Key derivations (not stored columns)

| Derived field | Source | Used by |
|--------------|--------|---------|
| `requires_hdt_rereview` | Row in `agency_major_change_requests` where `review_status = Pending Review` | FR-002 output |
| `major_change_review_status` | `agency_major_change_requests.review_status` mapped to spec enum | FR-002 output |
| `published_profile_version_status` | `provider_profiles.published_version_no IS NULL` → `None`, otherwise `Verified` | FR-004 output |
| `rereview_required` | Pending version with different content from published version | FR-004 output |
| `published_version_updated` | Boolean: did `published_version_no` change during this review action | FR-005 output |
| `availability_summary` | Computed from `provider_operating_hours` rows | FR-003 public output |
| `quality_metrics` | Aggregated from `bookings` (count, avg, cancel rate) + profile completeness | FR-003 HDT output |
| `participant_capacity` | `min=1`, `max=experiences.max_participants` for published experiences | FR-003 public output |

## Naming mismatches (API layer maps; data/ columns unchanged)

| Spec output name | Data column | Table |
|-----------------|-------------|-------|
| `agency_name` | `company_name` | `agency_profiles` |
| `contact` | `contact_info` | `agency_profiles` |
| `provider_name` | `business_name` | `provider_profile_versions` |
| `general_description` | `description` | `provider_profile_versions` |
| `reviewer_id` | `reviewer_user_id` | `provider_verification_reviews` |
