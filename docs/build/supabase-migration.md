# Supabase PostgreSQL migration — current cutover

All live modules now use the asynchronous PostgreSQL application store. The sections below preserve the earlier foundation record; their JSON-live statements describe that earlier checkpoint, not current runtime. Current instructions: [quickstart](../env/supabase-quickstart.md).

Current cutover includes durable Matching/Explore/preferences/Auth rate limits, aggregate transactions and cross-connection locks, review-history constraint correction matching the existing ERD, and 21 safely imported Provider/Matching records. Conflicting legacy demo Chat/Booking history remains archived locally. No push or merge.

# Supabase PostgreSQL migration

## Scope and architecture

Start from main `34a906c`; preserve the integrated AUT, PRF, EXP, AIT, BKG, IAC and ADM flows.
Supabase hosts PostgreSQL 17. The application keeps its Next.js APIs and canonical SessionContext.
Data API remains disabled. Database migration access and application access are separate.

Dependencies: pin `pg` and `@types/pg` at 8.23.1, Supabase CLI at 3.0.0, and
`@next/env` at 14.2.35 for local operational commands. Commit package lock changes.

## Rollout gates

1. Verify installed Supabase skills and the hosted development connection without exposing credentials.
2. Validate the existing schema and 47 CSVs in a rollback-only transaction.
3. Create CLI-generated migration files: the original schema, then server-only access hardening.
4. Apply migrations and seed once to the fresh development project; record checksums and reject drift.
5. Establish a verified-TLS, bounded connection pool, a least-privilege application login, and transactions.
6. Verify a PostgreSQL Provider Experience update is visible through the PostgreSQL public catalog,
   including access denials, active-booking locks, rollback and database constraints.
7. Migrate all consumers of a business aggregate together before switching its live application traffic.
   Do not silently mirror JSON writes or read stale JSON after a PostgreSQL write.
8. Migrate Auth/identity, profile versions/media, commercial handoff/Chat, Booking/Schedule,
   matching/preferences and dashboards. Then explicitly switch application storage and verify every role.

## Important boundary

The foundation does not make the current application PostgreSQL-backed merely because DATABASE_URL
exists. Existing JSON routes must remain functional until their asynchronous consumers are migrated.
The PostgreSQL service slice is verified against the hosted database before API cutover.
No production-ready claim, Supabase Auth migration, Data API enablement, UI redesign or GitHub push
is included in this foundation run. Real email and durable file storage remain separate integrations.

## Ownership and data

`data/schema.sql` and CSVs remain the canonical supplied design and synthetic fixtures; do not rewrite
them as part of installation. Initial migration copies that DDL. Subsequent deployment changes use
new migrations and explain any divergence. Migrations are applied by an owner connection; the
application connection cannot create/drop tables or alter permissions. Runtime credentials are only
stored in the git-ignored local environment file. Never log connection strings or passwords.

## Validation

Validation on 2026-11-07:

- Official Supabase skills found in `.agents/skills/`; Claude Code junctions point to the same content.
- Main advanced to `34a906c` (including the previously pushed UX changes); work continues on
  `codex/supabase-foundation` without overwriting teammate changes.
- Changelog reviewed: CLI 3 changes local/remote defaults; v3.0.0 is explicitly pinned.
- Existing schema plus all CSV imports passed a rollback-only hosted PostgreSQL run before installation.
- Both migrations applied successfully. Supabase PostgreSQL 17.11: 47 business tables, 481 seed rows.
- Owner and restricted application connections pass hostname/CA-verified TLS using the certificate
  downloaded by the human; no `rejectUnauthorized: false` workaround.
- Hosted service tests: 6 pass; test writes roll back. Provider update is read through the same
  PostgreSQL catalog; wrong roles/owners, active-booking locks and invalid prices are rejected.
- Database audit: 47/47 tables have RLS, anon/authenticated have no table DML grants, and the three
  business trigger functions are invoker functions, not callable by anon.
- Migration and seed reruns pass without duplicate tables/records. Ledger is `hab_internal.migrations`;
  do not mix this guarded npm runner with Supabase CLI's separate migration history.
- Ordinary suite: 1,037 tests pass, six hosted tests intentionally skip unless explicitly opted in.
- Existing localhost smoke: 34 page responses / 58 HTTP checks pass across four identities.
- Local source-of-truth specs and data files remain unchanged. No GitHub push/merge performed.

The initial new transaction tests were observed failing against the old stub before implementation.
Full application cutover is not complete: all live routes still use JSON. Quickstart and operational
boundaries: `docs/env/supabase-quickstart.md`.

## Changed files and rationale

| File | Purpose |
|---|---|
| `.env.example` | Document separate owner/application URIs and the optional CA path; no real credentials. |
| `AGENTS.md` | Describe the new PostgreSQL foundation while explicitly retaining JSON as live storage. |
| `docs/build/build-log.md` | Record this agent run, real database changes, test evidence and rollout boundaries. |
| `docs/build/supabase-migration.md` | Explain architecture, commands, deployment ledger and remaining cutover work. |
| `docs/env/supabase-quickstart.md` | Explain architecture, commands, deployment ledger and remaining cutover work. |
| `package-lock.json` | Pin PostgreSQL/CLI dependencies and expose guarded database commands. |
| `package.json` | Pin PostgreSQL/CLI dependencies and expose guarded database commands. |
| `scripts/db/audit.mjs` | Provide safe database connection, migration, seed, provisioning, audit and test operations. |
| `scripts/db/check.mjs` | Provide safe database connection, migration, seed, provisioning, audit and test operations. |
| `scripts/db/config.mjs` | Provide safe database connection, migration, seed, provisioning, audit and test operations. |
| `scripts/db/migrate.mjs` | Provide safe database connection, migration, seed, provisioning, audit and test operations. |
| `scripts/db/provision-app.mjs` | Provide safe database connection, migration, seed, provisioning, audit and test operations. |
| `scripts/db/seed.mjs` | Provide safe database connection, migration, seed, provisioning, audit and test operations. |
| `scripts/db/shared.mjs` | Provide safe database connection, migration, seed, provisioning, audit and test operations. |
| `scripts/db/test.mjs` | Provide safe database connection, migration, seed, provisioning, audit and test operations. |
| `src/lib/db/client.ts` | Replace the placeholder with verified-TLS pooled queries and single-connection transactions. |
| `src/lib/db/postgres-experiences.ts` | Implement a PostgreSQL Experience service slice with ownership and active-booking guards. |
| `supabase/.gitignore` | Configure an optional local Supabase stack consistently with the hosted development approach. |
| `supabase/certs/prod-ca-2021.crt` | Supply the public CA downloaded by the human, enabling hostname/certificate verification. |
| `supabase/config.toml` | Configure an optional local Supabase stack consistently with the hosted development approach. |
| `supabase/migrations/20261107041151_hab_initial_schema.sql` | Deploy the existing business schema and server-only least-privilege access. |
| `supabase/migrations/20261107041154_hab_server_access.sql` | Deploy the existing business schema and server-only least-privilege access. |
| `tests/postgres/experience-flow.test.ts` | Verify transaction rollback, connection safety and the hosted Experience/catalog service. |
| `tests/unit/postgres-client.test.ts` | Verify transaction rollback, connection safety and the hosted Experience/catalog service. |
| `tests/unit/postgres-config.test.ts` | Verify transaction rollback, connection safety and the hosted Experience/catalog service. |

User-installed skill directories and `skills-lock.json` were inspected, not rewritten. The only local credential change is the generated restricted application URI appended to ignored `.env.local`.

Build and TypeScript pass after the final TLS configuration. The 47-CSV validator passes. No source-of-truth files under `docs/spec/` or `data/` were modified.
