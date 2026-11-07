# Runtime persistence additions — Supabase development

Approved by the human on 2026-11-07: persist state already used by the application, keeping existing
business rules. These additions supplement the 47 business entities; they do not add a new module.
Executable deployment history is in `../supabase/migrations/`. Applied migrations are immutable.

| Existing entity | Additional attribute | Storage and rationale |
|---|---|---|
| `matching_sessions` | `status` | `varchar(10) NOT NULL DEFAULT 'active'`, `active/closed`; the existing Matching service already returned and updated this state in JSON. |
| `explore_interactions` | `client_event_id` | Nullable `varchar(128)`; unique with `session_id` when present, preventing browser retries from counting one event twice. Historical CSV rows can omit it. |
| `agency_preference_profiles` | `matching_context` | `jsonb NOT NULL DEFAULT '{}'`; stores the existing Matching session/profile context returned by the preferences API. |
| `agency_preference_profiles` | `affinity_tags` | `jsonb NOT NULL DEFAULT '{}'`; stores the existing tag weights previously kept in a process-local Map. |
| `agency_preference_profiles` | `baseline_preference_weights` | Nullable `jsonb`; original Explore weight baseline, so replaying durable session events does not repeatedly add the same signals to an already updated profile. Existing profiles copy `preference_weights` at migration. |

The existing `explore_interactions.duration_on_previous_screen`, `explore_sessions.ranked_results`
and `ranking_version_id` are reused. No duplicate duration column or new viewed-section field is added.
No-tracking sessions retain null ranking snapshots and produce no interaction records.

| Technical table | Attributes | Rationale |
|---|---|---|
| `hab_runtime.auth_rate_limits` | `runtime_id uuid PK`, `key varchar(64) NOT NULL`, `at bigint NOT NULL` | Persists the existing password-recovery request counter: hashed email key and request epoch in milliseconds. Unknown emails are counted too, preserving the generic response. Index `(key, at)` supports the existing time window; expired entries are removed by the service. |

This private technical table is not a 48th business entity. It starts empty and has no fabricated CSV
or FK to UserAccount: unknown emails must also be rate limited without revealing membership.
It is excluded from the business ERD, included as an isolated technical node in the Physical ERD,
and accessible only to the trusted backend database login, with RLS enabled.

Foreign keys remain enforced, but are now deferrable inside an atomic multi-table operation.
This lets registration and profile-version aggregates insert their linked records before COMMIT;
it does not permit orphaned records to commit. SQL CHECK, UNIQUE and exclusion constraints remain.

The browser keeps using the existing Next.js APIs and canonical `SessionContext`. Only the backend
uses `hab_app`; it cannot create schemas, roles or bypass RLS. This is application-managed auth,
not Supabase Auth: there are no `auth.uid()` policies or credentials shipped to the browser.
The three role/permission catalog tables remain read-only to this login.

Seed CSVs remain the original 47 synthetic business-entity fixtures. New optional/defaulted fields
need no artificial seed rows. Runtime state and user uploads are not committed as seed data.

## Review history constraint correction

The conceptual ERD already specifies zero or more review decisions per submitted version.
PRF FR-005 records every decision, and the current AUT flow can reissue Request More Information
for the same version. The two physical subject-level UNIQUE constraints contradicted that contract.
Migration `20261107051127_hab_review_history.sql` removes only those constraints and replaces them
with subject/time indexes. `review_id` stays the primary key; reviewer, subject FK, decision and
comment checks stay enforced. No business lifecycle or ERD cardinality is changed.
