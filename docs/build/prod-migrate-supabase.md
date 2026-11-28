# Runbook: move PROD to a new Supabase project (new organisation, Free plan)

Drafted 2026-11-28 for the human who runs it. **Approved 2026-11-28 with these decisions:** (1) the ref-change PR is built
(branch `chore/prod-ref-new-project`, §1.1); (2) back up old PROD today (§1.2); (3) trigger handling on restore (§6.A.3–A.5);
(4) images: branch (b) `storage:restore-from-sets` built, branch (a) specification only (§7.4); (5) `db:audit` is checked by hand, fixing `audit.mjs` to 49 tables is a later task (§5 row 2.7). **The agent runs nothing from this file**: no command, no DB or Storage
connection, no `.env*` read, no push. Every command below is typed by a human, from the repository root of the folder named
in each step. Sources read for this draft: ADR 0001, `docs/build/deploy-runbook.md`, `docs/build/prod-runbook-v3.md`,
`docs/env/supabase-quickstart.md`, `docs/env/supabase-storage.md`, `supabase/migrations/*`, `scripts/db/*`,
`scripts/storage/*`, `package.json`. Anything not found in those files is marked **[UNVERIFIED]** and is repeated in
section 10.

## 0. Why, and the facts this runbook rests on

| Fact | Source / status |
|---|---|
| Old PROD project ref `euxclvszgiknjosbwjya` (old organisation, egress blocked, HTTP 402). Treat as **retired** from now on. | request of 2026-11-28 |
| **New PROD project ref `pdeioligjeksgfnodgzs`**, region Southeast Asia (Singapore), Free plan, own organisation (not shared with DEV). | request of 2026-11-28 |
| **DEV `jfrpnffknjpgmkyquxql` stays in the old organisation**, which reopens on **07/12**. DEV and new PROD never share an organisation. Until 07/12 DEV is not usable (no `db:*` against DEV, no `test:postgres`, no `test:storage`, no `prod-content-load --export`). | request of 2026-11-28 |
| Old PROD user-uploaded files cannot be read until 07/12. | request |
| The app never uses the Supabase Data API or Supabase Auth: it connects as the restricted `hab_app` login (`DATABASE_APP_URL`) and uses Storage only through the backend secret key. | ADR 0001, quickstart |
| Migration history is the private ledger `hab_internal.migrations` (npm runner). Never `supabase db push`. | quickstart |
| `hab_app` is **created by the migrations** (`20261107041154_hab_server_access.sql`: `CREATE ROLE hab_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`). `db:provision-app` only gives it a password and appends `DATABASE_APP_URL`. | migration, `provision-app.mjs` |
| The `anon` and `authenticated` roles used by the migrations' `REVOKE` lines exist in every Supabase project. | **[UNVERIFIED]** on a brand-new project; the dry run in Step 2 shows it |

## 1. Where the PROD guards compare with the old ref (full list, grep of the repo at `e654784`)

Searched with `git grep euxclvszgiknjosbwjya`. Files that hold the old ref:

| File | Where | What breaks / what to change |
|---|---|---|
| `scripts/db/migrate-plan.mjs` | line 4 `PROD_PROJECT_REF`; `migrationTarget()` lines 40–43 | Used by `db:migrate`. **Hazard:** once the constant is the new ref, a leftover env still pointing at the *old* project would be classed "not PROD" and `db:migrate` would run on it with no flag. Needs the retired-ref refusal below. |
| `scripts/storage/refresh-catalog-copies.mjs` | lines 20–21 define `DEV_PROJECT_REF` and `PROD_PROJECT_REF`; `assertTargets()` lines 62–72 | Guard of `storage:catalog-copies`. Also imported by `backfill-media-variants.mjs` (`storage:media-variants`), `seed-image-import-plan.mjs` and through it `import-seed-images.mjs` (`storage:seed-images`). These four only import the constant: no edit, but they are all blocked until this file is changed. |
| `scripts/db/dev-load-content.mjs` | lines 22–23 define `DEV_PROJECT_REF` and `PROD_PROJECT_REF`; refusal at line 48 | Second, independent definition (so the ref is written in **two** modules today, three counting `migrate-plan.mjs`). Imported by `prod-content-load.mjs` (`db:content-load`). The DEV loader must refuse the new PROD ref (and the old one). |
| `scripts/db/dev-seed-pending-reviews.mjs` | line 13 comment, line 25 `DEV_PROJECT_REF` only | DEV-only pin; nothing to change except nothing: it already refuses any non-DEV ref. |
| `tests/unit/migrate-dry-run.test.ts` | lines 2, 26–28, 35 | Asserts the constant equals the old literal. Must change. |
| `tests/unit/refresh-catalog-copies.test.ts` | literal old ref | Must change. |
| `tests/unit/dev-seed-pending-reviews.test.ts` | line 32 uses the old ref as "some other project" | Still passes; optional: replace by the new ref. |
| `docs/build/prod-runbook-v3.md` | header + every command | Historical (release of 21/11). Add a banner pointing here; do not rewrite the history. |
| `docs/build/local-vs-internet.md` | one mention | Update wording in the same PR. |

Not found anywhere (checked): `src/`, `package.json`, `.github/workflows/ci.yml`, `tools/`, any `render.yaml` (none in the repo).
**There is no `prod-smoke` script on this branch**: the only smoke script is `scripts/smoke-auth.mjs`, which
`deploy-runbook.md` §4 says cannot be used against PROD. If a `prod-smoke` exists on another branch, it must be checked for the
old ref before it is used **[UNVERIFIED, ask]**. `scripts/db/lecturer-accounts.mjs` takes its target from the env variable
`HAB_EXPECT_PROJECT_REF`, so it needs only a new value (Step 6.4), not a code change.

### 1.1 Design of the change (one PR, test-first; the agent may draft it when asked, the human merges)

1. New module `scripts/db/project-refs.mjs`, the **only** place a ref is written:

   ```js
   export const DEV_PROJECT_REF = 'jfrpnffknjpgmkyquxql'
   export const PROD_PROJECT_REF = 'pdeioligjeksgfnodgzs'
   export const RETIRED_PROJECT_REFS = Object.freeze(['euxclvszgiknjosbwjya'])
   export function assertNotRetired(ref) { /* throws "project <ref> is retired (old PROD); nothing was changed" */ }
   ```

   Why a constant in a file and not an environment variable: the guard works because the typed `CONFIRM_PROJECT_REF` must equal a
   value the shell cannot change; a ref read from `.env` would make the guard compare a value with itself.
2. `migrate-plan.mjs`, `refresh-catalog-copies.mjs`, `dev-load-content.mjs` import the three names and delete their own
   definitions (they keep re-exporting them so the other scripts and tests need no edit).
3. `assertNotRetired()` is called first in `migrationTarget()`, `assertTargets()` and `assertDevTarget()` (DEV loader), **before**
   the PROD/DEV comparison. Result: during and after the move no script can write to the old project, with or without
   `--target-prod`, whatever `.env.local` holds.
4. Tests, red first for the right reason: (a) each guard refuses the old ref (dry run, apply, `--target-prod`, DEV mode);
   (b) `--target-prod` with the new ref plus `CONFIRM_PROJECT_REF=pdeioligjeksgfnodgzs` is accepted; (c) the new ref without the
   confirmation is refused; (d) `DATABASE_URL` and `SUPABASE_URL` naming different refs is refused (already covered by
   `assertTargets`); (e) the DEV loader refuses the new PROD ref. Existing literal-ref assertions are edited **only** to the new
   value, and the PR description lists each edited line (CLAUDE.md rule: no test edited to pass).
5. Open point **[decision for the human]**: `migrationTarget()` does not pin DEV (any non-PROD ref migrates with no flag).
   Leaving it as is keeps the scope small; pinning it to `DEV_PROJECT_REF` would also stop an unknown project from being migrated.
   Suggestion: pin it, as a separate commit in the same PR.
6. Docs in the same PR: banner in `prod-runbook-v3.md`, edit `local-vs-internet.md`, one paragraph addendum to ADR 0001 (new
   project, Free plan, organisations split), and a build-log entry.

**Transition behaviour until that PR is merged:** the old ref is still guarded as PROD (safe, writes need the old
confirmation), and the new ref is "not PROD": `db:migrate` would run on it without `--target-prod` and every storage script would
refuse it (expects DEV). **So do not run any command of Steps 2–4 on the new project before the PR is merged and pulled.**
Do not "work around" by editing the DEV constant.

### 1.1.1 What the PR contains (as built, 2026-11-28)

`scripts/db/project-refs.mjs` (new; `DEV_PROJECT_REF`, `PROD_PROJECT_REF = pdeioligjeksgfnodgzs`, `RETIRED_PROJECT_REFS = [euxclvszgiknjosbwjya]`,
`assertNoRetiredRef(label, value)`). Retired ref refused first in: `migrationTarget()` (`db:migrate`), `assertTargets()` (`storage:catalog-copies`,
`storage:seed-images`, `storage:media-variants`), `assertDevTarget()` (DEV loader), `assertTarget()` (`db:content-load`), `lecturerPreflight()`
(`db:set-test-passwords --lecturer`), and, as the single choke point for every other script and the app, in `databaseConfig()` (`scripts/db/config.mjs`: `db:check`,
`db:seed`, `db:provision-app`, `db:audit`, `db:set-test-passwords`, `storage:catalog`, the app's DB client) and `storageConfig()` (`scripts/storage/client.mjs`:
`storage:setup`, `storage:import-local`, the app's object store). Tests: new `tests/unit/project-refs.test.ts` (17 tests); the three literals in
`migrate-dry-run`, `refresh-catalog-copies` and `dev-seed-pending-reviews` tests changed to the new ref only.
`pg_dump`/`pg_restore`/`psql` are not repository scripts, so the guard does not apply to them: that is why the old project can still be read for the backup (§1.2).

## 1.2 Back up old PROD today (human, from `~/Desktop/dbiz3-prod`; read only on the old project)

Purpose: an archive of the old PROD data in case the old project stays blocked. It does not need the Step 0 PR (`pg_dump` is not a repository script) and writes
nothing to the old database. The old project's owner URI is read from `~/Desktop/dbiz3-prod/.env.local` by a small Node snippet and turned into `PG*` variables of
**that shell only**; nothing is printed or placed in an argument.

**B.1 Load the connection into the shell (prints only the ref):**

```bash
cd ~/Desktop/dbiz3-prod
eval "$(node -e '
require("@next/env").loadEnvConfig(process.cwd());
const u=new URL(process.env.DATABASE_URL);
const q=s=>"\x27"+String(s).replace(/\x27/g,"\x27\\\x27\x27")+"\x27";
console.log("export PGHOST="+q(u.hostname)+" PGPORT="+q(u.port||5432)+" PGUSER="+q(decodeURIComponent(u.username))+" PGPASSWORD="+q(decodeURIComponent(u.password))+" PGDATABASE="+q(decodeURIComponent(u.pathname.slice(1)))+" PGSSLMODE=verify-full PGSSLROOTCERT="+q(process.cwd()+"/supabase/certs/prod-ca-2021.crt"))
')"
echo "ref: ${PGUSER#*.}"
```

Expected: `ref: euxclvszgiknjosbwjya`. Anything else: stop and `unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSSLMODE PGSSLROOTCERT`.
(`~/Desktop/dbiz3-prod` is on an older `main`; this snippet needs only `@next/env`, which `npm ci` installed there. If `node_modules` is missing, run `npm ci` first.)

**B.2 Client version must be ≥ the server's major version:**

```bash
psql --version; pg_dump --version; pg_restore --version
psql -X -At -c "show server_version"
```

If `pg_dump` is older than the server (the quickstart says PostgreSQL 17 for DEV; the version of old PROD is **[UNVERIFIED]**, read it from the last command), `pg_dump` aborts with "server version mismatch". Install and use the matching client:

```bash
brew install postgresql@17          # use @18 if the server reports 18
export PATH="$(brew --prefix postgresql@17)/bin:$PATH"
pg_dump --version
```

(`psql -X -At -c …` talks to the old project; if it errors, go to B.5 before anything else.)

**B.3 Dump (custom format, data only):**

```bash
umask 077
mkdir -p .demo-data/prod-backup && chmod 700 .demo-data/prod-backup
ts=$(date -u +%Y%m%dT%H%M%SZ)
pg_dump --data-only --format=custom --no-owner --no-privileges \
  --schema=public --schema=hab_internal --schema=hab_runtime \
  --file ".demo-data/prod-backup/$ts.dump"
chmod 600 ".demo-data/prod-backup/$ts.dump"
```

Schemas, stated: `public` (the 49 business tables, all that the migration needs); `hab_internal` (migration ledger and `seed_runs`; archive only, **not** restored to the new project) and
`hab_runtime` (`auth_rate_limits`, `ai_quota_cooldowns` when that migration was applied; archive only). **Not dumped on purpose:** `auth`, `storage`, `extensions`, `graphql*`, `realtime`, `vault`
(Supabase-managed; the app does not use Supabase Auth, and file bytes are in the bucket, whose metadata lives in `public.stored_files`). `--data-only` has no schema: the schema comes from the migrations.
`.demo-data/` is git-ignored. The file contains session tokens (`public.sessions`) and password hashes: keep mode 600, keep it out of git, chat and cloud sync. No exclusions here (it is an archive);
the exclusions of §6.A.2 apply when restoring.

**B.4 Check the file and record counts (nothing printed but names and numbers):**

```bash
f=".demo-data/prod-backup/$ts.dump"
ls -l "$f"; shasum -a 256 "$f" | tee ".demo-data/prod-backup/$ts.sha256"
pg_restore --list "$f" | grep -c "TABLE DATA"
pg_restore --list "$f" | grep "TABLE DATA" | awk '{print $6"."$7}' | sort | head -60
psql -X -At -F $'\t' -c "SELECT table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text::int FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1" > ".demo-data/prod-backup/$ts.counts.tsv"
wc -l ".demo-data/prod-backup/$ts.counts.tsv"
```

Expected: file size > 0, a SHA-256 line, `TABLE DATA` count **52 or 53** (49 `public` + 2 `hab_internal` + 1 or 2 `hab_runtime`, the second only if `20261125100000_hab_ai_quota_cooldowns.sql` was applied to old PROD
**[UNVERIFIED]**), and a counts file of **49** lines (fewer = the old PROD lacks a migration: note it). If `pg_restore --list` errors, the dump is truncated: delete nothing, report, redo with a new `$ts`.
Then `unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSSLMODE PGSSLROOTCERT`.

**B.5 If the pooler refuses** (read the message; none of these cases is documented for a blocked-egress project, all **[UNVERIFIED]**):

| Message / symptom | Try |
|---|---|
| `Tenant or user not found`, `password authentication failed` | The URL or password in `.env.local` is stale; reset the database password in the old project's dashboard (the owner of the old organisation), update `.env.local`, redo B.1. |
| connection timeout, `server closed the connection`, SSL error | Same host, other port: Session pooler is `5432`; `6543` is the Transaction pooler and is unsuitable for `pg_dump`, use it only to test reachability (`PGPORT=6543 psql -X -At -c "select 1"`). |
| Pooler unreachable altogether | Direct connection: `PGHOST=db.euxclvszgiknjosbwjya.supabase.co PGPORT=5432 PGUSER=postgres` (same password). The direct host may be IPv6-only unless the project has the IPv4 add-on; the laptop must have IPv6 **[UNVERIFIED]**. |
| Message mentions restriction, quota, 402 or "project is paused/restricted" | Database access itself is restricted: no client-side route exists. Ask the old organisation's owner for the restriction to be lifted or for a download of a backup from the dashboard (Database → Backups; whether the Free plan offers one **[UNVERIFIED]**). Then use Path B for the new project (§6.B) and keep trying until 07/12. |

## 2. Folder and variable hygiene (applies to all steps)

- New clone for this operation: `~/Desktop/dbiz3-prod2` (`git clone … && git switch main && git pull && npm ci`). Its
  `.env.local` holds **only** new-PROD values. Never put the old project's values in it, never run `npm run dev` there.
  `~/Desktop/dbiz3-prod` (old PROD) is left untouched: its `.demo-data/*` undo files are tied to the old ref (the scripts refuse
  them on another project) and must not be deleted or edited.
- Connection values for `pg_dump`, `pg_restore` and `psql` are never typed or put in arguments: they are read from the folder's own `.env.local` by the Node snippet of §1.2 B.1 into `PG*`
  variables of the current shell (run it in `~/Desktop/dbiz3-prod` for the old project, in `~/Desktop/dbiz3-prod2` for the new one) and removed with `unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSSLMODE PGSSLROOTCERT`.
  Use one shell per project so the two sets of variables are never mixed. Credentials never appear in command-line arguments, chat or screenshots.
- Before every command that connects, print the ref without printing a secret (as in `prod-runbook-v3.md` §0.1):

  ```bash
  node -e "require('@next/env').loadEnvConfig(process.cwd());const u=new URL(process.env.DATABASE_URL);console.log('DB ref:',decodeURIComponent(u.username).split('.')[1]);console.log('Storage ref:',new URL(process.env.SUPABASE_URL).hostname.split('.')[0])"
  ```

  Expected: both lines `pdeioligjeksgfnodgzs`. Anything else: stop.
- Dry run first, apply, same dry run again (0 changes) before the next step. `CONFIRM_PROJECT_REF=pdeioligjeksgfnodgzs` typed in the shell
  in front of each guarded command; `--target-prod` on real runs.
- No test session, no merge, no Render deploy while this runs. Turn Render **Auto-Deploy off** first (Step 7.1).
- Install PostgreSQL client tools **17** (`pg_dump --version`, `pg_restore --version` must be ≥ the server's 17; the quickstart says the
  project is PostgreSQL 17 **[version of the new project: check in Step 1.6]**).

## 3. Step 0, code PR (see §1.1) — gate for everything below

| | |
|---|---|
| Who | agent drafts on a feature branch when asked; human reviews, merges |
| Check | `npm run lint`, `npx vitest run` green; CI green on windows-latest and macos-latest |
| Time | 1–2 h including CI and review |
| Back out | revert the PR; nothing else depends on it yet |

## 4. Step 1, prepare the new Supabase project (human, dashboard; est. 30–45 min)

`deploy-runbook.md` §1 and the quickstart define the setup; nothing more is invented here.

1. **Data API off.** Project Settings → API / Data API → disable the Data API (PostgREST), as DEV does ("Keep the Data API disabled").
   Dashboard wording and the exact toggle name **[UNVERIFIED]**. Check from a terminal (no key is sent):

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" https://pdeioligjeksgfnodgzs.supabase.co/rest/v1/
   ```

   Record the status code. It must not return the PostgREST schema (HTTP 200 with JSON). The expected code when disabled is **[UNVERIFIED]**
   (compare with the same call on DEV after 07/12 if in doubt). Later `npm run db:audit` also proves no `anon`/`authenticated` table access.
2. **Services not used.** The deploy runbook requires only: Data API disabled, private bucket, no anonymous Storage policies, no
   Supabase Auth use (the app has its own `hab_session`). So: create no Edge Function, no Realtime publication, no Auth provider, no
   Storage policy, no extra bucket. Optional hardening **not required by the docs** (decide, do not assume): Authentication →
   disable "Allow new users to sign up".
3. **Connection strings.** Connect → **Session pooler** (not Transaction pooler, not direct: the migration runner takes an advisory lock
   and `pg_dump`/`pg_restore` need session semantics). Copy the owner URI into `~/Desktop/dbiz3-prod2/.env.local` as `DATABASE_URL=`.
   The username has the form `postgres.pdeioligjeksgfnodgzs`; the pooler host for Singapore is shown on that screen
   (do not guess it).
4. **CA certificate.** Database Settings → download the CA certificate; compare with the committed one:

   ```bash
   shasum -a 256 supabase/certs/prod-ca-2021.crt ~/Downloads/<downloaded-cert-file>
   ```

   The committed file's SHA-256 is `700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7`. If the new project's differs,
   set `DATABASE_SSL_CA_FILE=` to the downloaded path for local runs; **Render then needs that file too, which means committing the public
   cert in a PR** (a new certificate on a new project is possible **[UNVERIFIED]**). Never disable TLS verification.
5. **API values.** Project Settings → API: Project URL and a backend **secret** key into `.env.local` as `SUPABASE_URL=https://pdeioligjeksgfnodgzs.supabase.co`,
   `SUPABASE_SECRET_KEY=`, `SUPABASE_STORAGE_BUCKET=hab-private`. (If the dashboard only offers the old "service_role" style key, say so;
   the code only reads `SUPABASE_SECRET_KEY` **[which key type the new project issues: UNVERIFIED]**.)
6. **Check** (read only):

   ```bash
   npm run db:check
   ```

   Expected JSON: `connected: true`, `tlsVerified: true`, `purpose: "migration"`, `public_tables: 0`, `postgres_version` (write it down).
7. **Bucket** (needs `SUPABASE_*` only; creates the private bucket `hab-private` with a 10 MiB per-file limit, refuses a public bucket):

   ```bash
   npm run storage:setup
   ```

   `storage:setup` checks the Storage project against `DATABASE_APP_URL`, which does not exist yet; it skips that check when the variable is empty. Re-run it
   after Step 2.4 as the final check. Dashboard → Storage: bucket **Private**, **zero policies**.
8. **Role `hab_app`:** nothing to create by hand. The migration creates it as NOLOGIN; `db:provision-app` (Step 2.4) sets its password. Do not create
   any other role.

Back out: delete the new project in the dashboard (nothing else points at it yet).

## 5. Step 2, schema (est. 10–15 min)

From `~/Desktop/dbiz3-prod2`, after Step 0 is merged and pulled:

| # | Command | Expected |
|---|---|---|
| 2.1 | `CONFIRM_PROJECT_REF=pdeioligjeksgfnodgzs npm run db:migrate -- --dry-run` | First line `[dry-run] project ref pdeioligjeksgfnodgzs (PROD)`, `0 applied in the ledger, 12 pending`, `OK` for each of the 12 files in `supabase/migrations/`, `rolled back; ledger unchanged`. An `ERROR` line stops the run (most likely cause: a missing `anon`/`authenticated` role, see §0). |
| 2.2 | `CONFIRM_PROJECT_REF=pdeioligjeksgfnodgzs npm run db:migrate -- --target-prod` | `[apply] project ref pdeioligjeksgfnodgzs (PROD)`, `Applied: <name>` ×12. |
| 2.3 | the dry run of 2.1 again | `12 applied in the ledger, 0 pending: none`. |
| 2.4 | `npm run db:provision-app` | Creates the login `hab_app.pdeioligjeksgfnodgzs`, appends `DATABASE_APP_URL` to `.env.local`. It refuses if the role is missing or privileged. |
| 2.5 | `npm run db:check:app` | `database_role` is `hab_app`, `tlsVerified: true`. |
| 2.6 | `npm run storage:setup` | "Private application bucket is ready." (now also checks the project match). |
| 2.7 | `npm run db:audit` | **Expect a failure** `DATABASE_SECURITY_AUDIT_FAILED`: `scripts/db/audit.mjs` requires exactly **47** public tables with RLS, and the migrations now create **49** (47 initial + `image_sources` + `experience_slots`). Inferred by counting `CREATE TABLE` in the migrations, **not run**. If it fails for that reason only, verify by hand instead (read only):<br>`psql -c "SELECT count(*) AS tables, count(*) FILTER (WHERE c.relrowsecurity) AS rls, count(*) FILTER (WHERE has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE')) AS data_api_access FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'"` (psql variables loaded from `~/dbiz3-newprod.pgenv`)<br>Expected `49 | 49 | 0`. **Decision 2026-11-28:** use this hand query; changing `audit.mjs` to 49 tables is a **later task** (not in the ref-change PR). |

Back out: migrations are forward only. On a project that holds no data yet the clean way back is "delete the project and recreate it" (Step 1), which is cheap now and not allowed once data is loaded.

## 6. Step 3, data

Choose the path **before** starting. Path A is the real migration; Path B is a degraded fallback (see §6.B for why).

### 6.A Path A: copy the data from old PROD (preferred)

Prerequisite: the old DB still accepts connections. The old project's egress block (402) is documented for the API/Storage; whether the pooler still
answers **[UNVERIFIED]**. Test with the read-only connection below; a refusal sends you to Path B.

**A.1 Read-only check of the old project and its table list** (psql, old env loaded in this shell only). **Already done by the §1.2 backup** (done 2026-11-28 02:23 UTC: server 17.11, 49 tables, 53 `TABLE DATA`); this block is only for a re-check, and the counts file to compare against is the backup's `<ts>.counts.tsv`:

```bash
# load the PG* variables of OLD PROD with the snippet of §1.2 B.1 (folder ~/Desktop/dbiz3-prod, expected ref euxclvszgiknjosbwjya)
psql -X -At -c "select current_database(), current_setting('server_version')"
psql -X -At -F $'\t' -c "SELECT table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text::int FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1" > ~/oldprod-counts.tsv
wc -l ~/oldprod-counts.tsv
```

Expected 49 lines. A re-check should equal the backup's counts file unless testers wrote since.

**A.2 Source file and restore list.** Use the archive of §1.2 (dump of `public`, `hab_internal`, `hab_runtime`; take a fresh one with B.3 if it is older than the day you restore).
Make a table-of-contents list that leaves out what must not be restored, then render the restore as SQL:

```bash
cd ~/Desktop/dbiz3-prod2
dump=~/Desktop/dbiz3-prod/.demo-data/prod-backup/<ts>.dump
pg_restore --list "$dump" \
  | grep -v -E ' TABLE DATA (hab_internal|hab_runtime) ' \
  | grep -v -E ' TABLE DATA public (sessions|registration_resubmission_tokens|password_reset_tokens|registration_otp_challenges) ' > .demo-data/restore.list
grep -c "TABLE DATA" .demo-data/restore.list
pg_restore --data-only --no-owner --no-privileges --use-list .demo-data/restore.list --file .demo-data/restore.sql "$dump"
chmod 600 .demo-data/restore.sql
```

Expected count: **45** `TABLE DATA` lines (49 `public` tables − 4 short-lived token tables). **Decision 2026-11-28: these four tables are not restored and stay empty on the new project:**
`sessions` (everyone logs in again; no live session token moves to the new system), `registration_resubmission_tokens`, `password_reset_tokens`, `registration_otp_challenges`
(email is not configured, so none of them can be valid). Also left out: the two non-public schemas (the new project has its own clean ledger, `db:seed` must **not** be run on a restored
database, rate-limit and AI-cooldown counters are ephemeral). **Foreign keys into these four tables: none** (checked 2026-11-28 by reading all 12 migrations: no `REFERENCES` names any of them;
the only look-alikes are `matching_sessions`, `explore_sessions` and `chat_sessions`, which are other tables). Their own foreign keys point outward (to `user_accounts` and
`agency_registration_requests`), so leaving them empty cannot orphan anything. Consequence to know: an Agency registration still pending on old PROD keeps its request row, but its OTP and
resubmission token are gone (none could have been delivered anyway). `restore.sql` holds password hashes: mode 600, delete after Step 3 is accepted.

**A.3 Trigger handling and the dry run.** Three triggers fire on insert and could reject old rows: `chat_message_not_closed_trg` (BEFORE INSERT on `chat_messages`), `chat_message_immutable_trg`
(BEFORE UPDATE OR DELETE on `chat_messages`; not hit by a plain restore) and `booking_group_within_capacity_trg` (BEFORE INSERT OR UPDATE on `bookings`). Only 5 foreign keys are `DEFERRABLE`, so
`SET CONSTRAINTS ALL DEFERRED` cannot be relied on. The restore therefore runs in one transaction with the triggers off. **Decision 2026-11-28: try Route 1 first**; use Route 2 only if the privilege test below is refused. Load the new project's owner connection into the shell with the B.1 snippet in
`~/Desktop/dbiz3-prod2` (expected ref `pdeioligjeksgfnodgzs`), then:

*Route 1, `session_replication_role = replica`* (turns off all non-`ALWAYS` triggers **and** foreign-key enforcement for the session). First test the privilege, read only:

```bash
psql -X -At -c "SET session_replication_role = replica; SHOW session_replication_role"
```

Expected `replica`. `permission denied to set parameter "session_replication_role"` means the login lacks the right (likely on Supabase's `postgres` role **[UNVERIFIED]**): use Route 2.
With Route 1 foreign keys are **not** checked during the load, so the orphan check of A.5 is mandatory. Dry run (rolled back):

```bash
{ echo 'BEGIN; SET session_replication_role = replica;'
  cat .demo-data/restore.sql
  cat .demo-data/restore-checks.sql   # the SQL of A.5 step 2, saved to this file first (Route 1 needs it)
  echo 'ROLLBACK;'; } | psql -X -v ON_ERROR_STOP=1 -q
```

*Route 2, disable the three triggers one by one, enable them again in the same transaction* (the owner login owns the tables, so `ALTER TABLE … DISABLE TRIGGER` is allowed; foreign keys stay enforced).
Put the trigger statements in a file so the real run and the dry run use the same text:

```bash
cat > .demo-data/triggers-off.sql <<'SQL'
ALTER TABLE public.chat_messages DISABLE TRIGGER chat_message_not_closed_trg;
ALTER TABLE public.chat_messages DISABLE TRIGGER chat_message_immutable_trg;
ALTER TABLE public.bookings DISABLE TRIGGER booking_group_within_capacity_trg;
SQL
cat > .demo-data/triggers-on.sql <<'SQL'
ALTER TABLE public.chat_messages ENABLE TRIGGER chat_message_not_closed_trg;
ALTER TABLE public.chat_messages ENABLE TRIGGER chat_message_immutable_trg;
ALTER TABLE public.bookings ENABLE TRIGGER booking_group_within_capacity_trg;
SQL
{ echo 'BEGIN; SET CONSTRAINTS ALL DEFERRED;'
  cat .demo-data/triggers-off.sql .demo-data/restore.sql .demo-data/triggers-on.sql
  echo "SELECT tgname, tgenabled FROM pg_trigger WHERE tgname IN ('chat_message_not_closed_trg','chat_message_immutable_trg','booking_group_within_capacity_trg') ORDER BY 1;"
  echo 'ROLLBACK;'; } | psql -X -v ON_ERROR_STOP=1
```

Expected: no error and three rows with `tgenabled = O` (enabled). Because everything is one transaction, a failure rolls the `DISABLE` back too: the triggers cannot be left off. The dry run (either route) must end with `ROLLBACK`
and leave the database empty: check with `psql -X -At -c "select count(*) from public.user_accounts"` → `0`.
If a **foreign-key** error remains on Route 2 (circular or non-deferrable FK), stop and report the error text: do not drop or alter a constraint or a trigger body. Never leave a trigger disabled outside the transaction.

**A.4 Real restore.** Same two pipes with `COMMIT;` in place of `ROLLBACK;`, only after a clean dry run of the same route (Route 1 shown; Route 2 is the same with its own file list):

```bash
{ echo 'BEGIN; SET session_replication_role = replica;'
  cat .demo-data/restore.sql
  echo 'COMMIT;'; } | psql -X -v ON_ERROR_STOP=1 -q
```

Run the A.5 checks **inside the same transaction** when you can (put the check SQL before `COMMIT;`, see below), otherwise run them right after and, if one fails, empty the restored tables and redo
(there are no testers on the new project yet): `TRUNCATE` is allowed only on the new project, with the ref printed first, and is a deletion: ask Khánh Linh before typing it.

**A.5 Checks after restore.**

1. *Row counts, table by table* (the same query as A.1):

   ```bash
   psql -X -At -F $'\t' -c "SELECT table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text::int FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1" > .demo-data/newprod-counts.tsv
   diff ~/Desktop/dbiz3-prod/.demo-data/prod-backup/<ts>.counts.tsv .demo-data/newprod-counts.tsv
   ```

   Expected: **exactly four** lines differ, `sessions`, `registration_resubmission_tokens`, `password_reset_tokens`, `registration_otp_challenges`, and each is **0** on the new project (old value > 0 or = 0 is allowed; new must be 0). Any other table differing, or any of the four above 0: stop.
   To list only the differences in a readable way: `diff <(grep -v -E '^(sessions|registration_resubmission_tokens|password_reset_tokens|registration_otp_challenges)\t' ~/Desktop/dbiz3-prod/.demo-data/prod-backup/<ts>.counts.tsv) <(grep -v -E '^(sessions|registration_resubmission_tokens|password_reset_tokens|registration_otp_challenges)\t' .demo-data/newprod-counts.tsv)` must print nothing, and `grep -E '^(sessions|registration_resubmission_tokens|password_reset_tokens|registration_otp_challenges)\t' .demo-data/newprod-counts.tsv` must show four rows ending in `0`.
   Re-check the claim that no foreign key points at these four (read only; **[UNVERIFIED]**, written without running): `psql -X -At -c "SELECT conname, conrelid::regclass, confrelid::regclass FROM pg_constraint WHERE contype='f' AND confrelid IN ('public.sessions'::regclass,'public.registration_resubmission_tokens'::regclass,'public.password_reset_tokens'::regclass,'public.registration_otp_challenges'::regclass)"` → no rows.
2. *Foreign keys* (needed after Route 1, cheap after Route 2). The generator below builds one `SELECT` per foreign key of `public` and counts child rows whose parent is missing (rows with any NULL key column are skipped, as `MATCH SIMPLE` does).
   Save it as `.demo-data/restore-checks.sql` in `dbiz3-prod2` (Route 1's pipes cat it before `ROLLBACK`/`COMMIT`), or paste it into `psql` after the restore. **[UNVERIFIED: written without running it; its first run is the dry run in A.3, which executes it on the loaded data inside the rolled-back transaction.]**

   ```sql
   SELECT format('SELECT %L AS fk, count(*) AS orphans FROM %s c WHERE %s AND NOT EXISTS (SELECT 1 FROM %s p WHERE %s)',
     con.conname, con.conrelid::regclass,
     (SELECT string_agg(format('c.%I IS NOT NULL', a.attname), ' AND ') FROM unnest(con.conkey) k JOIN pg_attribute a ON a.attrelid=con.conrelid AND a.attnum=k),
     con.confrelid::regclass,
     (SELECT string_agg(format('p.%I = c.%I', pa.attname, ca.attname), ' AND ')
        FROM unnest(con.conkey, con.confkey) AS u(ck, pk)
        JOIN pg_attribute ca ON ca.attrelid=con.conrelid AND ca.attnum=u.ck
        JOIN pg_attribute pa ON pa.attrelid=con.confrelid AND pa.attnum=u.pk))
   FROM pg_constraint con JOIN pg_namespace n ON n.oid=con.connamespace
   WHERE con.contype='f' AND n.nspname='public' ORDER BY con.conname \gexec
   ```

   Expected: every row `orphans = 0`. A non-zero row names the constraint: stop and report it.
3. *Constraints and triggers back on*: `psql -X -At -c "SELECT tgname, tgenabled FROM pg_trigger WHERE NOT tgisinternal AND tgrelid::regclass::text LIKE 'public.%' ORDER BY 1"` → every `tgenabled` is `O`
   (three of them are the triggers above; no `D`). `psql -X -At -c "SHOW session_replication_role"` in a **new** session → `origin`. `SELECT conname FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated` → no rows.
4. *Migrations and RLS*: `CONFIRM_PROJECT_REF=pdeioligjeksgfnodgzs npm run db:migrate -- --dry-run` (0 pending) and the hand audit of row 2.7 (`49 | 49 | 0`).
5. *Accounts*: the four tester accounts exist and their bcrypt hashes came across, so no `db:set-test-passwords` on Path A.

Then `unset PG*` as in B.4 and delete `.demo-data/restore.sql` once Step 3 is accepted.

Back out: the old project is read only throughout; to redo the new database delete and recreate the project (Step 1) while it holds no testers' data.

**Time:** dump 5–10 min, dry run 5–10 min, restore 5 min, checks 10 min, plus time to install client tools: **≈ 30–60 min**.

### 6.B Path B: rebuild from seed and the scripts of 22/11 (only if the old DB cannot be dumped)

**Limit you must accept:** the seed has 8 experiences, 8 villages and 8 provider profiles; the 21/11 snapshot holds 93 experiences, 22 villages, 49 provider
profiles, and old PROD held at least 59 experiences (`prod-runbook-v3.md` Appendix B). **Those extra rows are not in the seed and no script here recreates
them**; where they came from is not documented **[ask the owners, §10]**. Path B therefore gives a thin catalog and loses everything testers created on old
PROD since the seed (bookings, chats, registrations). Order and flags, as run on PROD on 21–22/11 (`deploy-runbook.md` §2, `prod-runbook-v3.md` steps 4–7), with the ref guard:

| # | Command (from `~/Desktop/dbiz3-prod2`) | Note |
|---|---|---|
| B1 | `npm run db:seed` | Schema must already be migrated (Step 2). Refuses non-empty tables; run once. Expect `PASS: 47 seed tables, … rows`. The seed manifest counts 47 tables because the two newer tables are not seed tables. |
| B2 | (Step 2.4–2.7 already done) | |
| B3 | `npm run storage:catalog` then `npm run storage:catalog -- --apply` | Uploads the 8 bundled photos to the seed file ids. Reads `assets/demo-media`, which already holds the replaced photos (PR #270), so **no** `--refresh-seed-images` and **no** `storage:catalog-copies` are needed on a fresh bucket. |
| B4 | set the `HAB_TEST_*` variables in `.env.local` (names in `.env.example`), then `npm run db:set-test-passwords` | Prints the PROD host first; no passwords printed; exit code 2 means something was skipped. |
| B5 | add `HAB_EXPECT_PROJECT_REF=pdeioligjeksgfnodgzs`, `HAB_LECTURER_VILLAGE=e482884e-7190-56cf-bc03-4e69614b1fe5`, `HAB_LECTURER_PROVIDER_EMAIL=thanhvien21@example.invalid` to `.env.local`; `npm run db:set-test-passwords -- --lecturer --dry-run`, then without `--dry-run` | Creates `agency-/hdt-/provider-/ubnd-tester@example.invalid`. Passwords are printed once to the terminal only; give them to the lecturer privately, then remove those four variables. |
| B6 | `CONFIRM_PROJECT_REF=pdeioligjeksgfnodgzs npm run db:content-load -- --list-missing --target-prod` | Needs the snapshot at `.demo-data/prod-content/snapshot.json` **in this folder**. DEV is unreachable until 07/12, so copy the existing file from `~/Desktop/dbiz3-prod/.demo-data/prod-content/snapshot.json` (made 21/11; check its recorded `sha256`). Many more rows will be "missing" than the 139 of 21/11. |
| B7 | `… db:content-load -- --target-prod --only-existing` (dry run), then add `--apply` | As prod-runbook-v3 Step 4. Keep the undo file. |
| B8 | Images: Step 4 below, **Path B order** | |
| B9 | `… npm run storage:media-variants -- --target-prod` then `--apply` | Step 4.4. |

**Time:** ≈ 1–1.5 h before images. Back out: delete and recreate the project while it holds no testers' data; after that use the undo files of each step.

## 7. Step 4, images

Old PROD Storage is blocked, so bytes come from the machine: `~/Documents/dbiz3-assets/photos-2011/` (set of 20/11, `approved-photos.json`, 86 entries) and
`~/Documents/dbiz3-assets/photos-2111/` (set of 21/11: `approved-photos-2111-final.json` 63, `go-anh-mat-nguoi-final.json` faces, `xuong-2111-final.json` 20 workshop photos),
plus the 8 bundled catalog photos in `assets/demo-media/`.

### 7.1 Path B (rebuilt database): the 22/11 order, unchanged except the ref

Each command: dry run first (default, rolls back, uploads nothing), then the same command with `--apply`, then the dry run again. Always
`CONFIRM_PROJECT_REF=pdeioligjeksgfnodgzs` in front and `--target-prod`.

1. **Set of 20/11** (add `--apply` for the real run):

   ```bash
   CONFIRM_PROJECT_REF=pdeioligjeksgfnodgzs npm run storage:seed-images -- --json ~/Documents/dbiz3-assets/photos-2011/approved-photos.json --photos-dir ~/Documents/dbiz3-assets/photos-2011 --target-prod --skip-missing-targets
   ```

2. **Set of 21/11** (only after step 1 is applied; dry run immediately after; the face-removal list matches only in that state; stop on `The face-removal list does not match this database`):

   ```bash
   CONFIRM_PROJECT_REF=pdeioligjeksgfnodgzs npm run storage:seed-images -- --json ~/Documents/dbiz3-assets/photos-2111/approved-photos-2111-final.json --photos-dir ~/Documents/dbiz3-assets/photos-2111 --faces ~/Documents/dbiz3-assets/photos-2111/go-anh-mat-nguoi-final.json --workshops ~/Documents/dbiz3-assets/photos-2111/xuong-2111-final.json --target-prod --skip-missing-targets
   ```

3. Face removal is part of step 2 (`--faces`): it unlinks the rows showing visible people by SHA-256 of the stored object. There is no separate script.
4. **WebP variants** (reads the originals, encodes, uploads `.w400/.w800/.w1600.webp`; `--apply` writes its undo file first):

   ```bash
   CONFIRM_PROJECT_REF=pdeioligjeksgfnodgzs npm run storage:media-variants -- --target-prod
   ```

   then add `--apply`; repeat the dry run: 0 missing variants. If it reports variants over the size cap, run once with `--only-oversize`.
5. Undo, newest first: media-variants, 21/11, 20/11 (`--undo <dir>/undo.json [--dry-run]`). Undo files are written under `.demo-data/` of **this** folder.

On Path B most photos in the lists will be reported under `skippedMissingTargets` (their experience or village is not in the seed). Write the counts down.

### 7.2 Path A (database restored from the dump): do **not** run the two import sets

The restored rows already contain every `stored_files`, `profile_media`, `provider_version_media`, `image_sources` row and the unlinked face rows of the 20/11 and
21/11 imports. `storage:seed-images` is not idempotent (`prod-runbook-v3.md` Appendix C): running it again would add each photo a second time under new random
UUIDs (`randomUUID()` in `import-seed-images.mjs`). What is missing is only the **object bytes** under the **same** file ids. Options:

| Option | What it restores | Status |
|---|---|---|
| P1. Seed catalog photos: `npm run storage:catalog -- --refresh-seed-images`, then `-- --apply --refresh-seed-images` | The bundled seed photos (their file ids are in `data/seed/stored_files.csv`). `--refresh-seed-images` is required because the restored keys are `prf-media/<id>`, not `seed/…`. Review the printed plan first (it blocks `--apply` on unmapped files). | existing script; run the dry run to confirm it maps the restored rows **[UNVERIFIED]** |
| P2. Then `npm run storage:media-variants` (dry run, `--target-prod`, `--apply`) | Variants for whatever originals now exist; it only creates missing variants. | existing script |
| P3 (branch b, before 07/12). Photos of the 20/11 and 21/11 sets and workshop photos under their **existing** ids | Script `storage:restore-from-sets`, usage in §7.4.2. **Built 2026-11-28; not yet run on PROD.** | script, dry run first |
| P4 (branch a, after 07/12). Copy the whole old bucket to the new bucket, same object keys | Also gives the user-uploaded files (below). Script `storage:copy-bucket`, specified in §7.4.1. **Not built.** | specification only |

Until P3 or P4 is done, Explore cards whose photo has no object return 404/unavailable (the code returns "unavailable", never a fabricated file). Check the damage with
`npm run storage:media-variants -- --target-prod` (dry run): it lists originals it cannot read **[UNVERIFIED output]**.

### 7.4 The two image-restore branches (Path A; branch (b) is built, branch (a) is **specification only**)

Decision 2026-11-28: record both branches; branch (b) was then built at the human's request, branch (a) stays a specification until the human says to build it. They never run together on the same rows (both skip objects that already exist and neither replaces one).

**7.4.1 Branch (a), after 07/12: `storage:copy-bucket` (copy the old bucket to the new bucket, keys unchanged)**

| Item | Specification |
|---|---|
| Purpose | Make `hab-private` of the new project hold every object of the old `hab-private` under the **same key**, so every restored `stored_files.storage_key` and every `.w400/.w800/.w1600.webp` variant resolves. Also brings the user-uploaded files (`chat-files/`, `registration-documents/`, `account-avatars/`, certificates under `prf-media/`). |
| Source and destination | Source: the **retired** project, read only. It is the one place a retired ref is allowed, so the script takes it from its own variables `HAB_COPY_SOURCE_URL` and `HAB_COPY_SOURCE_KEY` (never `SUPABASE_URL`), requires the ref to be **in** `RETIRED_PROJECT_REFS`, and issues only list and GET requests (a test asserts no other method is ever used on the source). Destination: the usual `SUPABASE_URL`/`SUPABASE_SECRET_KEY`/bucket through `storageClient()`, which must name `PROD_PROJECT_REF`; real runs need `--target-prod` and `CONFIRM_PROJECT_REF=pdeioligjeksgfnodgzs` typed in the shell. Both checks run before any request. |
| Keys | Only keys matching the existing allowlist of `scripts/storage/client.mjs` (`prf-media|chat-files|registration-documents|account-avatars` + 36-char id, and the three `.w*.webp` variants); any other key is listed as `skipped-unknown-key` and never copied. |
| Dry run (default) | Lists the source bucket (paginated), lists the destination, and prints **only counts and byte totals**: per prefix and total (source objects, bytes), `to-copy`, `already-present-same-size`, `present-different-size` (reported, never overwritten), `unknown-key`. Cross-checks the restored DB: `stored_files` rows with no source object (`db-row-without-object`), source objects with no row (`object-without-row`, expected only for variants). Downloads nothing but listings. Prints the estimated egress (total bytes of `to-copy`) so it can be compared with the Free plan's limit **[limit UNVERIFIED]**. Writes the lists of ids to `.demo-data/copy-bucket/<UTC>/plan.json`. |
| `--apply` | Streams each `to-copy` object source → destination with `x-upsert: false` (the client's default; an existing object is never replaced), retries 3 times, concurrency 4 (flag `--concurrency`). **Verification per object:** destination size equals source size (`size()` range request); `--verify-sha256` additionally reads both back and compares SHA-256 (costs the egress twice, so optional). Writes the list of keys created to `undo.json` **before** the first upload (appended per object). `--max-bytes <n>` stops cleanly when the budget is reached; a re-run resumes because present objects are skipped. |
| Final report | Counts: copied, skipped-present, failed (with key ids only), total bytes, and the **count reconciliation**: `source objects = copied + already-present + unknown-key + failed`. Exit code 0 only when `failed = 0` and the reconciliation holds; 2 when objects remain. Then the dry run again must say `to-copy = 0`. |
| Undo | `--undo <dir>/undo.json [--dry-run]` deletes only keys that file lists and that still have the size it recorded. |
| Output rules | No names, emails, URLs with secrets, or object bodies are printed; keys are printed only as file ids. |
| Tests first | Injectable fetch like `tests/unit/storage-client.test.ts`: refuses a non-retired source, refuses a retired destination, refuses a destination that is not PROD without the confirmation, never issues a write on the source, never upserts, dry run writes nothing, count reconciliation holds, size mismatch is reported not replaced, unknown key skipped, undo deletes only its own keys. |
| Needs before it can run | 07/12 reached; the old project's secret key available in the old organisation; destination restored (Step 3). A large first pass can be run in chunks with `--max-bytes`. |

**7.4.2 Branch (b), before 07/12: `storage:restore-from-sets` (built 2026-11-28, `scripts/storage/restore-from-sets.mjs`, tests `tests/unit/restore-from-sets.test.ts`)**

Puts the bytes of the 20/11 and 21/11 photo sets and the workshop photos back under the **existing** object keys `prf-media/<file_id>` of the restored database. It never writes to the database (one READ ONLY transaction of SELECTs, always rolled back) and never replaces an object (`replace:false`). Run it from `~/Desktop/dbiz3-prod`, with `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_SECRET_KEY` naming the new PROD project.

**Matching constraint (why it matches by size, not by checksum):** `public.stored_files` has **no checksum column** and the stored object is the importer's re-encoded JPEG (`processImage`), not the source file. The local file is proven by the manifest `sha256` (a mismatch stops the run); the row is matched by the importer's naming rule and confirmed by byte length, width and height of the re-encoding.

1. **Dry run** (default; reads, encodes, uploads nothing; writes `plan.json` with file ids only to `.demo-data/restore-from-sets/<UTC>/`):

   ```bash
   CONFIRM_PROJECT_REF=pdeioligjeksgfnodgzs npm run storage:restore-from-sets -- --target-prod --set ~/Documents/dbiz3-assets/photos-2011/approved-photos.json ~/Documents/dbiz3-assets/photos-2011 --set ~/Documents/dbiz3-assets/photos-2111/approved-photos-2111-final.json ~/Documents/dbiz3-assets/photos-2111 --set ~/Documents/dbiz3-assets/photos-2111/xuong-2111-final.json ~/Documents/dbiz3-assets/photos-2111
   ```

2. **Apply**: the same command with `--apply` added. It writes `undo.json` (keys it will create, with sizes) **before** the first upload, uploads, then checks each object's size. Exit code 2 when any row stays unresolved or an upload failed. Run the dry run again: `toUpload` must be 0.
3. **Undo** (deletes only keys listed in that file whose size is still the recorded one; add `--dry-run` to preview):

   ```bash
   CONFIRM_PROJECT_REF=pdeioligjeksgfnodgzs npm run storage:restore-from-sets -- --target-prod --undo .demo-data/restore-from-sets/<UTC>/undo.json
   ```

4. Then the variants with the existing `storage:media-variants -- --target-prod` (dry run, then `--apply`); it reads the originals just restored. Also run `storage:catalog -- --refresh-seed-images` for the seed catalog photos (not covered here).

**Report** (counts only, per group `experience`, `village`, `workshop`, and `totals`): `selected`, `alreadyPresent`, `unlinked`, `toUpload` (+ `bytes`), `sizeDrift`, `noSource`, `ambiguous`, and `unresolved` (= sizeDrift + noSource + ambiguous). The report never prints names, e-mails, URLs or keys.

| Outcome | Meaning | What to do |
|---|---|---|
| `unlinked` | The row has no link (`profile_media`, `provider_version_media`, `villages.cover_image_id`). These are the rows the 21/11 face-removal list unlinked: the photos show people with no consent. | **Deliberately not restored** (nothing to fix). |
| `ambiguous` | Two or more manifest entries share the importer name (same kind, id prefix and file number, e.g. the same photo number in the 20/11 and 21/11 sets) and re-encode to **different** bytes that both match the row's size and dimensions. Entries that re-encode to identical bytes are not ambiguous. | Not uploaded. Send the ids (`plan.json`); decide by hand. |
| `sizeDrift` | Candidates exist but none re-encodes to the stored size or dimensions (most likely a different `sharp` version from the 21–22/11 build; check `package-lock.json`). | Not uploaded. Report the count. |
| `noSource` | No manifest entry, or the local file is missing. | Not uploaded; falls to the placeholder/branch (a) after 07/12. |
| `alreadyPresent` | The object exists. | Untouched. |

**Open points:** the file-number segment of the importer name is `item.file.split('/')[2]` (`<n>.jpg`); it was taken from the code, not from a real PROD row (first dry run will show it: a high `noSource` means the rule differs). The 8-character id prefix can in theory collide between two ids; the size/dimension check is what separates them. **No dry run has been run against PROD yet [UNVERIFIED]**; the script is tested only on fixtures.

### 7.3 What will be missing and how to get it back after 07/12

| Missing | Why | Recovery |
|---|---|---|
| Files uploaded by users on old PROD: `chat-files/`, `registration-documents/`, `account-avatars/`, certificates under `prf-media/`, photos Providers uploaded themselves | Their bytes exist only in the old bucket; no local copy; not in any script's input | After 07/12: copy by key from the old bucket into `hab-private` of the new project (option P4). Rows in `stored_files` already exist on Path A, so keys match. On Path B these rows do not exist and the files are lost. |
| Variants `.w400/.w800/.w1600.webp` of those images | derived | `storage:media-variants` after the originals are back |
| Set photos on Path A | see 7.2 | P3 now or P4 later |

Before 07/12 also ask the old organisation owner whether the free allowance of the old project can be read once (a single bulk copy of all objects); the size of the old
bucket is not documented anywhere in the repo **[UNVERIFIED]**.

**Time:** Path B images ≈ 1.5–2.5 h (about 170 photos, each processed and uploaded with 3 variants; no timing was recorded for the 22/11 run, so this is a guess).
Path A with P1 + P2 ≈ 30 min; P3 needs a PR first (≈ 2–4 h to build and review).

## 8. Step 5, Render (human, dashboard)

Names only; values come from `~/Desktop/dbiz3-prod2/.env.local`, typed into Render, never into the repository.

1. Render → the web service → Settings → Build & Deploy → **Auto-Deploy: Off**. Check it shows Off.
2. Environment: **change** `DATABASE_APP_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`; **keep** `SUPABASE_STORAGE_BUCKET` (`hab-private`); **change or remove**
   `DATABASE_SSL_CA_FILE` (set only if Step 1.4 found a different certificate, and only if that file ships with the build); **do not** add `DATABASE_URL`, `HAB_EMAIL_MODE`,
   any `HAB_TEST_*`. Unchanged and unrelated to Supabase: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_AI_MODEL`, `CLOUDFLARE_AI_FALLBACK_MODEL`,
   `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_FALLBACK_MODELS`, `NEXT_PUBLIC_APP_URL`. Save all changes first, then do step 3 once.
3. Manual Deploy → **Deploy latest commit** (the `main` commit that contains Step 0). Keep the build log; it must show Node 22.
4. Region: the old project was in Mumbai (`local-vs-internet.md` #16, human report); the new one is Singapore. The Render service region is not recorded in the repo
   **[ask which region it runs in; latency only, not a blocker]**.
5. Check after the deploy (record in `docs/build/build-log.md`):
   - [ ] Render log: no startup error; Supabase new project logs: connections from `hab_app` only.
   - [ ] Log in with each of the four roles: Agency `/explore`, Provider dashboard, HDT `/admin`, UBND `/admin/providers` (on Path A the old passwords still work; on Path B use the ones just printed).
   - [ ] `/explore`: cards and photos; Network tab: images load as `…/api/prf/media/<id>?w=400|800` WebP (on Path A expect gaps until P3/P4).
   - [ ] A booking end to end: Agency → Experience → Chat with Provider → send a message → Provider creates a Booking → status change (use a `[T-<name>]` record).
   - [ ] AI Tour Matching (`/ai-matching`): one prompt returns results (or the expected 503 text when no key is set; the OpenRouter/Cloudflare keys are unchanged).
   - [ ] `/register` and `/forgot-password` show "Email chưa được cấu hình" and create nothing; `hab_session` cookie is `Secure; HttpOnly`.
   - [ ] Repeat: `db:migrate -- --dry-run` (0 pending); `psql` audit query (49/49/0).
6. Auto-Deploy back **On** only after the checks pass.

Back out of Render: restore the three old values from your password manager and Manual Deploy the previous commit. **This brings back a site that cannot work** (old project blocked,
HTTP 402) until 07/12, so there is no real rollback before then; take the old values out of Render only after the new site is accepted.

## 9. Step 6, after the move

1. **Old project, before 07/12:** do not write to it. The retired-ref guard (Step 0) makes every repository script refuse it. Do not delete it or its bucket: its files are the only
   copy of user uploads.
2. **Reduce its exposure (human, old organisation):** rotate or disable its secret key and the `hab_app` password once the new site is accepted; remove any Render variable that still
   names it. Whether the old organisation's owner can do this while the project is egress-blocked is **[UNVERIFIED]**.
3. **07/12:** organisation reopens. Do P4 (copy user-uploaded files and, on Path A, the set photos), run `storage:media-variants` against the new project, re-check
   `/explore` and chat attachments; only then pause or delete the old PROD. DEV is usable again from that day; it still belongs to the **old** organisation, and **the new PROD never
   shares an organisation with DEV** (ADR 0001 §3 stays true; add the sentence to the ADR addendum).
4. Repository: remove `HAB_EXPECT_PROJECT_REF`, `HAB_LECTURER_*` from `.env.local` after any lecturer run; keep the backup `~/Desktop/dbiz3-prod/.demo-data/prod-backup/<ts>.*` until the old project is gone, then delete it with the owner's agreement; delete `.demo-data/restore.*` of `dbiz3-prod2` once Step 3 is accepted.
5. Docs: build-log entry (date, commit deployed, which path A/B, row-count diff output, every undo file path), ADR 0001 addendum, banner in `prod-runbook-v3.md`.

## 10. Points that need Khánh Linh or Hoàng to confirm

1. **Path:** can the old DB be dumped through the pooler (A.1)? If not, are you accepting Path B's 8-experience catalog and loss of tester data? Where did the experiences beyond the seed come from?
2. **Images on Path A:** (b) `storage:restore-from-sets` is built (§7.4.2): run its dry run on PROD and check the `file_name` rule in "Open points" first; (a) `storage:copy-bucket` after 07/12 stays a specification and is the only way to get user uploads back.
3. **Step 0 PR (built, not pushed):** decided — `audit.mjs` stays at 47 for now (hand query used; fixing it to 49 is a **later task**). Still open: pin DEV in `migrationTarget()` (not done in this PR, any non-PROD, non-retired ref still migrates with no flag). Is there a `prod-smoke` script on another branch?
4. **CA certificate** of the new project (same file or a new one that must be committed for Render).
5. ~~Keep or drop `registration_resubmission_tokens`~~ **Decided 2026-11-28:** `sessions`, `registration_resubmission_tokens`, `password_reset_tokens`, `registration_otp_challenges` are not restored (empty on the new project); no foreign key points at them (§6.A.2).
6. **Triggers on restore (decided, §6.A.3):** Route 1 `session_replication_role = replica` if the login may set it, else Route 2 (disable the three triggers one by one, enable them again in the same transaction); orphan check and trigger-state check afterwards. If both routes fail, stop and report the error text.
7. **Free-plan limits** of the new project (database size, 1 week inactivity pausing, Storage size and per-file limit, egress) are not recorded in the repo (ADR 0001 says "to re-check"): confirm
   the Storage total of the old bucket fits, and that the app will not be paused during the 07/12 gap (any traffic, or a cron ping, keeps it active; unverified).
8. Which Render region the web service uses (Singapore project vs the previous Mumbai).
9. Whether the Supabase dashboard of the new project offers the old `service_role` key or a new "secret" key, and that `SUPABASE_SECRET_KEY` accepts it.

## 11. Time estimate (one person, no surprises)

| Step | Estimate |
|---|---|
| 0. Code PR (draft + CI + review) | 1–2 h |
| 1. New project setup | 30–45 min |
| 2. Schema + `hab_app` + bucket check | 10–15 min |
| 3A. Dump, dry run, restore, checks | 30–60 min (3B: 1–1.5 h) |
| 4. Images | Path A+P1/P2: 30 min; Path B: 1.5–2.5 h; P3: +2–4 h to build |
| 5. Render change, deploy, checks | 45–60 min |
| 6. Aftercare | 20 min now, ≈ 1 h on 07/12 |
| **Total** | **≈ 4–6 h** on one day (Path A) plus the Step 0 PR; add P3 if images are needed before 07/12 |

## 12. Must not be done (inherited from `deploy-runbook.md` §5, plus this move)

- No `demo:reset`, `demo:seed`, `import-legacy --apply`, `supabase db push`, no second `db:seed` on a restored database.
- No script run with the old project's values in `.env.local`; no old and new values in the same file.
- No public bucket, no anonymous Storage policy, no Data API, no `NEXT_PUBLIC_` secret, no `DATABASE_URL` on Render.
- No credentials in arguments, chat, screenshots, issues or the repository; the dump and restore files stay in git-ignored `.demo-data/` folders (mode 600).
- No agent run of any command in this file; no push of this draft by the agent.
