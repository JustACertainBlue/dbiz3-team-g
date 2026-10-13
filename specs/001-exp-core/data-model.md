# EXP US-1 data mapping

Canonical definitions: `data/04-data-model.md`, `data/schema.sql`; fixtures: `data/seed/`. All reads; no writes or schema changes.

| Spec §5.1 field | Entity.attribute / derivation |
|---|---|
| FR-001 `agency_id` | `agency_profiles.agency_id`, checked against `user_accounts.account_status=Approved` in local demo |
| FR-001 `agency_preference_profile` | `agency_preference_profiles.preference_weights`; optional |
| FR-001 `page`, `page_size` | Request parameters, not stored; default 1/12, cap 50 |
| FR-001 `experience_cards` | Projection from the rows below; no separate table |
| FR-001 `pagination` | Derived `page`, `page_size`, filtered `total_count`; not stored |
| FR-002 `id`, `name`, `description` | `experiences.experience_id`, `name`, `description` |
| FR-002 `type`, `duration`, `max_pax` | `experiences.category`, `duration_minutes`, `max_participants`; min pax is constant 1 in spec |
| FR-002 `price` | `experiences.price_per_person`, projected only for Agency |
| FR-002 `location.village_name` | `provider_profiles.village_id` → `villages.name` |
| FR-002 `provider_name` | `provider_profiles.published_version_no` → `provider_profile_versions.business_name` |
| FR-002 `images` | `profile_media.experience_id` → `stored_files.file_id`, `storage_key`, ordered by `display_order` |
| FR-002 `card_view`, `quick_preview` | Rendered UI components, not stored |
| BR-001 eligibility | `provider_profiles.verification_status`, published `provider_profile_versions.version_status`, `villages.is_active`, `experiences.archived_at`, `user_accounts.account_status` |

The `stored_files.storage_key` is a metadata pointer. The seed package has no matching binary images, so this slice displays a placeholder and records that limitation in the plan/build log.
