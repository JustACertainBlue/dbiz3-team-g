# Supabase development database quickstart

## What is ready and what is not

The initial import contains 47 business tables and 481 synthetic seed rows. Live Next.js APIs and server pages now use PostgreSQL through the shared asynchronous application store. Ordinary tests alone use isolated JSON fixtures. Missing database configuration or a database error never triggers a JSON fallback. Auth sessions, Matching, preferences, Explore tracking, profiles, Quote/Chat, Booking/Schedule and Admin reads share PostgreSQL.

Storage, Supabase Auth, real email, production deployment and scheduled workers are separate work.

## Local environment

Use `.env.local` (git-ignored):

```dotenv
# Owner/migration URI from Supabase Connect > Session pooler. Server tools only.
DATABASE_URL=
# Restricted role, generated locally by db:provision-app. Never use the owner URI here.
DATABASE_APP_URL=
# Optional override; otherwise use the checked-in public Supabase CA certificate.
DATABASE_SSL_CA_FILE=
```

Keep credentials out of screenshots, chat, command arguments and committed files. The public CA
certificate in `supabase/certs/prod-ca-2021.crt` is not a password, API key or private key. It was
downloaded by the project owner from Supabase Database Settings. Its file SHA-256 is
`700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7`.
TLS verifies both the trusted certificate chain and the actual pooler hostname; verification is
never disabled to work around a connection error. `pg_stat_ssl` behind a shared pooler does not
describe the client's TLS socket; `db:check` checks the Node connection's encrypted/authorized flags.

## Fresh development project

Install dependencies with `npm ci` (`npm.cmd ci` in restrictive Windows PowerShell).
Use a fresh development project and keep the Data API disabled. Then run from repository root:

```text
npm run db:check
npm run db:migrate
npm run db:seed
npm run db:provision-app
npm run db:check:app
npm run db:audit
npm run test:postgres
```

`db:migrate` explicitly targets DATABASE_URL; it refuses to adopt an untracked nonempty public
schema. It keeps a checksum-verified ledger in `hab_internal.migrations`, serializes migration
runners with a database advisory lock, and commits each migration with its history entry.
Checksums normalize CRLF/LF so Windows/macOS clones agree. Existing migration files must not be
edited after application; add a new one using `npx supabase migration new <name>`.

This project currently uses **the npm migration runner and its private ledger**, not Supabase CLI's
`supabase_migrations` ledger. Do not mix `supabase db push` with this workflow or reset the hosted
database. CLI 3.0.0 is pinned for local config/migration generation; its defaults differ from v2.
`supabase/config.toml` governs an optional local stack and does not alter hosted project settings.

`db:seed` imports the existing load manifest with parameterized inserts in a single transaction.
It refuses nonempty seed tables and skips an already completed seed, preserving subsequent data.
Do not use the application's `demo:reset` as a PostgreSQL reset command.

`db:provision-app` creates the restricted login once and appends its generated credential only to
`.env.local`. It does not rotate or overwrite an existing application credential on rerun.
The seed password hashes are synthetic fixtures; seeded accounts are not production credentials.

## Application access model

- The owner URI is for explicitly requested migration/seed/admin commands only.
- `getDbClient()` requires DATABASE_APP_URL and rejects an owner-role URI.
- `hab_app` has no superuser, role creation, database creation, schema creation or RLS bypass.
- The trusted server login reads all business tables and writes the business aggregates; role/permission catalogs remain read-only. Per-user authorization is enforced by canonical session/service guards.
- Tables deny access to anonymous/Supabase-authenticated Data API roles. Backend policies allow the
  trusted server role; **per-user ownership and organization scope remain service responsibilities**.
- No generic `auth.uid()` policy is assumed: the current application uses its own opaque session.
- Do not connect browser code using DATABASE_APP_URL or store it in a NEXT_PUBLIC variable.

## Tests

```text
npm test
npm run lint
npm run build
python data/scripts/validate_seed.py
npm run test:postgres
```

Ordinary tests skip `tests/postgres/` and never connect to hosted infrastructure. The explicit
PostgreSQL command loads local environment variables and opts in to those tests. Test changes are
rolled back; no seed reset or production credentials are needed. The tests cover role restrictions,
Provider update → PostgreSQL catalog, Guest/private-price separation, ownership, cancellation
preservation, discounts, active-Booking field locks and negative-price database constraints.

## Safe team workflow

One member reviews shared migrations and repository contracts. Module owners adapt their services
and API consumers to asynchronous database operations. Move all readers/writers of an aggregate
together, test on two identities, and only then switch live traffic. Never silently dual-write or
fall back to stale JSON when PostgreSQL is unavailable. Review code through a feature-branch PR;
the human decides when to merge. Keep a separate production project before real user onboarding.

## Run the application

After environment setup, run `npm run dev` and open http://localhost:3000/login. Do not run demo:reset to reset PostgreSQL. Development fixture login remains available for the four synthetic identities; production accepts actual password hashes only.

The old `.demo-data/runtime.json` is preserved as a comparison archive, not an active database. A guarded three-way importer (`node scripts/db/import-legacy.mjs`) is read-only by default; `--apply --tables=...` refuses conflicts and never imports deletions or old login sessions. In this cutover, 21 non-conflicting Provider/Matching records were imported. Old Chat/Booking demo history with conflicting state was preserved in JSON rather than overwritten into PostgreSQL.

Database transactions keep related writes on one checked-out connection; nested service calls join it. Aggregate advisory locks cover empty-table races across backend connections. Some compatibility queries still load/filter a table in the service; replace hot paths with indexed SQL criteria and pagination before high-volume production use. File bytes remain in local ignored upload directories; their metadata is now PostgreSQL-backed. Move bytes to durable object storage before hosted production deployment. Real email/OTP delivery remains unavailable without service configuration.
