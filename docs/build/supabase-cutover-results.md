# Supabase cutover results — 2026-11-07

Live application APIs and server pages now use PostgreSQL. JSON is an isolated ordinary-test fixture only; there is no live fallback. Existing role flows and APIs are preserved.

- Ordinary suite: 1,043 pass; 14 hosted cases skip by default.
- Explicit hosted suite: 14 pass, including real-hash Auth, registration/OTP/re-review/approval and account disable, Matching/preferences, durable Explore/dedup/consent, Provider editing, Quote → Chat → Booking → Schedule, access denials, rollback and locks across independent connections. Hosted fixture writes roll back.
- Verified TLS and restricted hab_app login; 47/47 public tables RLS; no anon/authenticated table grants.
- 47 CSV seed validation passes.
- Earlier HTTP smoke: 34 pages / 58 checks across four roles; final repeat recorded below.
- 21 non-conflicting legacy Provider/Matching records imported; idempotent rerun produces no changes. Conflicting old Chat/Booking history is preserved in the untouched JSON archive. Old login sessions are not restored.
- No push, merge, real email delivery, Supabase Auth or object-storage migration. File metadata is PostgreSQL-backed; file bytes remain in local ignored directories. Table-filter compatibility reads and coarse aggregate locks should be optimized for high-volume production.

## Changed files and reasons

| File | Reason |
|---|---|
| `data/runtime-persistence.md` | Document approved runtime persistence and align physical constraints with existing ERD. |
| `docs/build/supabase-cutover-progress.md` | Record actual architecture, setup, scope and validation. |
| `docs/build/supabase-migration.md` | Record actual architecture, setup, scope and validation. |
| `docs/env/supabase-quickstart.md` | Record actual architecture, setup, scope and validation. |
| `scripts/db/audit.mjs` | Provide guarded database operations and safe legacy comparison/import. |
| `scripts/db/check.mjs` | Provide guarded database operations and safe legacy comparison/import. |
| `scripts/db/config.mjs` | Provide guarded database operations and safe legacy comparison/import. |
| `scripts/db/import-legacy.mjs` | Provide guarded database operations and safe legacy comparison/import. |
| `scripts/db/migrate.mjs` | Provide guarded database operations and safe legacy comparison/import. |
| `scripts/db/provision-app.mjs` | Provide guarded database operations and safe legacy comparison/import. |
| `scripts/db/seed.mjs` | Provide guarded database operations and safe legacy comparison/import. |
| `scripts/db/shared.mjs` | Provide guarded database operations and safe legacy comparison/import. |
| `scripts/db/test.mjs` | Provide guarded database operations and safe legacy comparison/import. |
| `src/lib/db/application-store.ts` | Provide shared asynchronous PostgreSQL storage, connection and aggregate transactions. |
| `src/lib/db/async-collections.ts` | Provide shared asynchronous PostgreSQL storage, connection and aggregate transactions. |
| `src/lib/db/async-store.ts` | Provide shared asynchronous PostgreSQL storage, connection and aggregate transactions. |
| `src/lib/db/postgres-experiences.ts` | Provide shared asynchronous PostgreSQL storage, connection and aggregate transactions. |
| `src/lib/db/repository.ts` | Provide shared asynchronous PostgreSQL storage, connection and aggregate transactions. |
| `supabase/.gitignore` | Configure verified TLS and versioned schema/server-access/runtime migrations. |
| `supabase/certs/prod-ca-2021.crt` | Configure verified TLS and versioned schema/server-access/runtime migrations. |
| `supabase/config.toml` | Configure verified TLS and versioned schema/server-access/runtime migrations. |
| `supabase/migrations/20261107041151_hab_initial_schema.sql` | Configure verified TLS and versioned schema/server-access/runtime migrations. |
| `supabase/migrations/20261107041154_hab_server_access.sql` | Configure verified TLS and versioned schema/server-access/runtime migrations. |
| `supabase/migrations/20261107043615_hab_runtime_persistence.sql` | Configure verified TLS and versioned schema/server-access/runtime migrations. |
| `supabase/migrations/20261107051127_hab_review_history.sql` | Configure verified TLS and versioned schema/server-access/runtime migrations. |
| `tests/contract/explore-persisted-scope.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/postgres/application-flow.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/postgres/experience-flow.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/postgres-client.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/postgres-config.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/postgres-repository.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/postgres-store.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `.env.example` | Record actual architecture, setup, scope and validation. |
| `AGENTS.md` | Record actual architecture, setup, scope and validation. |
| `data/04-data-model.md` | Document approved runtime persistence and align physical constraints with existing ERD. |
| `data/06-physical-data-model.md` | Document approved runtime persistence and align physical constraints with existing ERD. |
| `data/07-data-dictionary.md` | Document approved runtime persistence and align physical constraints with existing ERD. |
| `data/08-physical-erd.mmd` | Document approved runtime persistence and align physical constraints with existing ERD. |
| `data/README.md` | Document approved runtime persistence and align physical constraints with existing ERD. |
| `data/schema.sql` | Document approved runtime persistence and align physical constraints with existing ERD. |
| `docs/build/build-log.md` | Record actual architecture, setup, scope and validation. |
| `package-lock.json` | Pin database dependencies and expose operational commands. |
| `package.json` | Pin database dependencies and expose operational commands. |
| `src/app/admin/providers/[id]/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/admin/providers/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/agency/[agencyId]/agency-booking-gate.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/agency/[agencyId]/bookings/[bookingId]/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/agency/[agencyId]/bookings/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/agency/[agencyId]/edit/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/agency/[agencyId]/schedule/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/ai-matching/layout.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/adm/dashboard/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/adm/filter-options/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/adm/villages/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/ait/matching/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/ait/preferences/[agencyId]/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/ait/sessions/[id]/chat/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/ait/sessions/[id]/messages/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/ait/sessions/[id]/quote/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/ait/sessions/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/auth/account/avatar/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/auth/account/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/auth/agency-reviews/documents/[fileId]/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/auth/agency-reviews/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/auth/change-password/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/auth/forgot-password/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/auth/login/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/auth/logout/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/auth/reset-password/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/auth/session/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/auth/users/create/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/auth/users/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/bkg/agency/bookings/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/bkg/bookings/[bookingId]/arrival/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/bkg/bookings/[bookingId]/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/bkg/bookings/[bookingId]/status/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/bkg/bookings/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/bkg/providers/[providerId]/schedule/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/demo/handoff/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/demo/villages/[id]/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/explore/events/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/explore/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/explore/session/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/iac/chats/[id]/attachments/[attachmentId]/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/iac/chats/[id]/attachments/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/iac/chats/[id]/close/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/iac/chats/[id]/messages/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/iac/chats/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/prf/agency/[agencyId]/major-change/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/prf/agency/[agencyId]/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/prf/ai/description/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/prf/experience/[experienceId]/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/prf/experience/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/prf/media/[fileId]/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/prf/media/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/prf/provider/[providerId]/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/prf/provider/[providerId]/verify/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/register/resubmit/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/api/register/verify-otp/route.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/components/SessionHeader.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/explore/ExploreTracker.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/explore/experiences/[id]/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/explore/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/explore/providers/[id]/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/explore/providers/[id]/schedule/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/messages/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/provider/[providerId]/bookings/[bookingId]/load-provider-booking.ts` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/provider/[providerId]/bookings/new/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/provider/[providerId]/bookings/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/provider/[providerId]/dashboard/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/provider/[providerId]/edit/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/provider/[providerId]/experiences/ExperienceImagesField.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/provider/[providerId]/experiences/[experienceId]/delete/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/provider/[providerId]/experiences/[experienceId]/edit/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/provider/[providerId]/experiences/[experienceId]/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/provider/[providerId]/experiences/new/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/provider/[providerId]/experiences/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/provider/[providerId]/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/provider/[providerId]/schedule/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/app/village/[villageId]/page.tsx` | Await shared PostgreSQL/session services while preserving page/API contracts. |
| `src/lib/adm/admin-session.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/adm/metrics-service.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/adm/pending-service.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/adm/scope-guard.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/auth/account-service.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/auth/admin-accounts.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/auth/agency-review.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/auth/lifecycle.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/auth/product-session.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/auth/registration-service.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/auth/server-session.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/auth/session.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/booking/agency-bookings.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/booking/agency-sync.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/booking/availability.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/booking/booking-access.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/booking/booking-detail.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/booking/change-status.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/booking/create-booking.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/booking/expire-holds.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/booking/list-bookings.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/booking/mark-arrival.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/booking/provider-schedule.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/booking/update-booking.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/booking/write-lock.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/db/client.ts` | Provide shared asynchronous PostgreSQL storage, connection and aggregate transactions. |
| `src/lib/db/seed-loader.ts` | Provide shared asynchronous PostgreSQL storage, connection and aggregate transactions. |
| `src/lib/demo/commercial-handoff-service.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/explore/demo-runtime.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/explore/runtime.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/explore/seed-repository.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/iac/chat-access.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/iac/chat-pairs.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/iac/chat-service.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/matching/session-service.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/preferences/preference-service.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/prf/agency-service.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/prf/ai-service.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/prf/audit-logger.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/prf/experience-service.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/prf/media-store.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/prf/provider-service.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/prf/seed-reader.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `src/lib/prf/visibility.ts` | Move domain reads/writes and authorization onto shared durable storage. |
| `tests/adm/integration/dashboard-scope.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/adm/unit/admin-page-access.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/adm/unit/admin-role-sync.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/adm/unit/scope-guard.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/contract/account-avatar-api.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/contract/auth-session-api.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/contract/product-login-api.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/contract/registration-api.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/integration/ait-exp-br-gaps.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/integration/aut-lifecycle.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/integration/aut-registration-flow.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/integration/demo-functional-flow.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/integration/exp-handoff-signal.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/prf/integration/provider-ux-api.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/prf/unit/profile-media.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/prf/unit/provider-page-view.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/prf/unit/provider-profile-a2.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/prf/unit/provider-versioning.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/prf/unit/visibility.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/account-service.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/admin-accounts.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/agency-review.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/ai-matching-access.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/auth-guard.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/auth-session-context.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/bkg-agency-sync.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/bkg-availability-consistency.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/bkg-availability.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/bkg-booking-access.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/bkg-detail-page-access.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/bkg-expire-holds.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/bkg-list-access.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/bkg-page-access.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/bkg-schedule-access.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/bkg-schedule-entry.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/bkg-write-lock.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/iac-access.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/iac-attach-download.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/iac-attach-list.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/iac-attach-send.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/iac-chat-pairs.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/iac-close-after.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/iac-close-chat.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/iac-fixtures.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/iac-list-chats.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/iac-open-booking.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/iac-send-message.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |
| `tests/unit/product-session.test.ts` | Verify async domain contracts, role scope, rollback and PostgreSQL-backed flows. |

User-installed skill directories and skill lock were inspected and preserved. Credentials remain only in ignored environment files.

Final verification: production build and TypeScript pass. Fresh localhost smoke passed 34 pages / 58 HTTP checks across all four roles after the final migration/import. GET /login returns 200. Server remains running at http://localhost:3000.

