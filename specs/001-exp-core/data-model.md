# EXP data mapping

Canonical definitions: `data/04-data-model.md`, `data/schema.sql`; fixtures: `data/seed/`. The current prototype reads seed CSVs and keeps new events in memory; it performs no PostgreSQL writes or schema changes.

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

## Later extension: existing entities and runtime limits

| Prototype output / rule | Canonical entity or derivation | Current implementation |
|---|---|---|
| Provider/Experience detail | `provider_profiles` → published `provider_profile_versions`; `experiences`; `villages`; `profile_media`/`provider_version_media` → `stored_files` | Read from seed and projected by role. No media binaries. |
| Public available/blocked periods | `provider_operating_hours` and Provider-wide `bookings` in On hold/Booked states | Derived in memory; no Booking identity or price is sent to a Guest. |
| Group discount and booking conditions | `experience_discount_rules`, `experiences.notice_period_hours`, `experiences.cancellation_policy`, `provider_profile_versions.booking_conditions` | Visible to approved Agency only. |
| Tracking scope and ranked exposures | `explore_sessions.session_id`, `agency_id`, `analytics_consent`, `tracking_scope`, `ranking_version_id`, `ranked_results` | A local session cookie and in-memory state simulate these fields; no row is inserted. |
| Browsing event | `explore_interactions.session_id`, `experience_id`, `provider_id`, `action_type`, `occurred_at`, `duration_on_previous_screen`, `filter_values` | Events are validated/deduplicated in memory; no row is inserted. |
| Agency personalization | `agency_preference_profiles.preference_weights`; historical seed `explore_interactions` | A development-only in-memory preference map is updated for the acting Agency. |
| Ranking version, quality and audit | `ranking_parameter_versions`, `ranking_quality_assessments`, `audit_logs` | Reads the Active seed version. KPI, replay and promotion gates are pure functions; no scheduler, transaction or audit write runs. |
| Quote/Chat handoff | `quote_requests` unique `(agency_id, experience_id)` and `chat_sessions` pair conversation | Permission/reuse rules are tested through interfaces. No live Quote or Chat persistence is connected. |

FR-006 has no explicit entity/attributes for the complete detail visit (entered/exited times, scroll depth, viewed sections and next action). FR-007 has no explicit physical `source_context`. Village coordinates needed for Nearby and optional Experience included/excluded item fields are also unresolved. These are **open questions 28–31 in the source EXP spec**, not columns added by this feature. The user explicitly chose to leave `data/` unchanged for the prototype.
