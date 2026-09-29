# 07 — PostgreSQL candidate physical model

The current [System Configuration](../docs/architecture/system%20configuration.md) proposes PostgreSQL, so this package uses PostgreSQL 16 syntax as a reviewable physical candidate. The later Plan step may change the DBMS. Business identity, cardinality and lifecycle remain governed by the approved conceptual/logical model.

## Table groups

| Group | Tables | Main responsibility |
|---|---|---|
| Reference and identity | `roles`, `permissions`, `role_permissions`, `villages`, `user_accounts`, `account_status_history`, `ubnd_village_assignments`, `sessions` | Authentication, role/subtype and village scope |
| Registration | `agency_registration_requests`, `registration_otp_challenges`, `registration_resubmission_tokens`, `registration_submission_versions`, `agency_review_records` | Versioned registration, OTP and HDT decisions |
| Files | `stored_files`, `registration_documents`, `chat_attachments`, `profile_media` | Shared private/object-storage metadata with owner-specific links |
| Profiles/catalog | `agency_profiles`, `agency_major_change_requests`, `provider_profiles`, `provider_profile_versions`, `provider_version_media`, `provider_verification_reviews`, `provider_operating_hours`, `experiences`, `experience_discount_rules` | Approved business data, submitted Provider versions and Experience catalog |
| Matching/Explore | `matching_sessions`, `matching_messages`, `tour_preference_profiles`, `recommendation_results`, `agency_preference_profiles`, `preference_signals`, `quote_requests`, `explore_sessions`, `explore_interactions`, `ranking_parameter_versions`, `ranking_quality_assessments` | Agency intent, ranking results, signals and quality evaluation |
| Booking/communication | `bookings`, `booking_status_history`, `chat_sessions`, `chat_participants`, `chat_messages`, `notifications` | Booking lifecycle, one active Agency–Provider chat and recipient notifications |
| Accountability | `audit_logs` | Security and administrative evidence |

## Physical choices

- UUIDs are supplied by application/seed code; the schema does not require a UUID extension.
- PostgreSQL `jsonb` holds source fields explicitly defined as Object/Map or evolving AI parameter payloads. Stable identities, repeating lists and relationships remain normalized.
- `citext` is avoided. A unique index on `lower(email)` enforces case-insensitive email uniqueness without another extension.
- `btree_gist` supports an exclusion constraint preventing overlapping On hold/Booked Bookings for one Provider. Atomic write logic must still surface a friendly Slot Unavailable result.
- File bytes stay in private object storage. `stored_files.storage_key` is unique; registration/chat/profile link tables enforce context-specific access.
- Partial unique indexes enforce one active Chat per Agency–Provider, one pending Agency major change, one editable/submitted Provider version and one published Provider version.
- Transaction records freeze `agreed_price_total`, `conditions_snapshot`, start, duration and group size. Experience edits never rewrite Booking history.
- Status history supports dashboard as-of calculations. `account_status_history` is the provisional implementation of approved recommendation Q-08.

## Migration order

1. Extensions/reference: `btree_gist`, roles, permissions, villages.
2. Identity/security: users, scope assignments, sessions, tokens and account history.
3. Registration/files: requests, versions, files, documents and reviews.
4. Profiles/catalog: Agency, Provider versions, hours, Experiences and media.
5. Matching/Explore: sessions, profiles, results, signals and metrics.
6. Booking: booking plus status history and overlap constraint.
7. Chat/notifications/audit.
8. Reference seed, then scenario seed within one transaction.

## Deletion and retention candidate

`ON DELETE CASCADE` is limited to subordinate configuration/content that has no independent historical meaning, such as a role-permission link. Historical Registration, Booking, Chat, review, notification and audit paths use `RESTRICT` or nullable context. Deactivation/archive is preferred. Retention periods remain Q-06 and must be approved before production cleanup jobs exist.

## Traceability

The schema comments and [Data Dictionary](07-data-dictionary.md) cite the owning Function IDs. The complete Function-to-entity relation remains [CRUD Matrix](02-crud-matrix.md). Any schema change that cannot cite a Function/BR or approved Q decision returns to [Review](05-review.md).
