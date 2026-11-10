# Deploy runbook — Render + Supabase production (Session 11)

Decision: [ADR 0001](../adr/0001-hosting.md) (PR #78). Database and Storage setup follow
[`docs/env/supabase-quickstart.md`](../env/supabase-quickstart.md) and [`docs/env/supabase-storage.md`](../env/supabase-storage.md);
test accounts need `npm run db:set-test-passwords` (PR #80). Every step that creates or connects a service is
done **by a human** (repository owner / Linh). Commands are run from the repository root; use `npm.cmd` in
restricted Windows PowerShell. Platform limits and prices are **to re-check** on the day.

## 0. Before you start

- [ ] PRs #78, #79, #80 are merged and CI on `main` is green; note the commit you deploy: `main @ <sha>`.
- [ ] The development project is separate from the one you are about to create (ADR 0001 §3).
- [ ] Use a **separate clone/folder for production operations** (e.g. `hab-prod-ops/`), so its `.env.local`
      holds only production values. `db:provision-app` appends `DATABASE_APP_URL` to `.env.local`, and every
      `db:*` script uses whatever `.env.local` contains: running them in your development folder would mix
      development and production credentials. Never run `npm run dev` in the production folder.
- [ ] Nobody runs a test session while you deploy (`docs/test/test-plan.md` §4: merge/deploy outside test hours).

## 1. Create the Supabase production project (human)

1. In Supabase, create a **new project** for production (organisation owner). Choose a region close to the
   Render region (to re-check both lists). Keep the **Data API disabled**, as in development.
2. From **Connect → Session pooler**, copy the owner URI into the production folder's `.env.local` as
   `DATABASE_URL=` (never into chat, screenshots or commands).
3. From **Database Settings**, download the CA certificate. If it differs from the committed
   `supabase/certs/prod-ca-2021.crt` (SHA-256 in the quickstart), save it outside the repo and set
   `DATABASE_SSL_CA_FILE=` to its path.
4. From **Project settings → API**, copy the Project URL and a backend **secret** key into `.env.local` as
   `SUPABASE_URL=` and `SUPABASE_SECRET_KEY=`; set `SUPABASE_STORAGE_BUCKET=hab-private`.

## 2. Initialise the production database and Storage

In the production folder, after `npm ci`:

| # | Command | Expected |
|---|---|---|
| 1 | `npm run db:check` | TLS verified, connects with the owner URI |
| 2 | `npm run db:migrate` | All `supabase/migrations/*` applied once, ledger in `hab_internal.migrations` |
| 3 | `npm run db:seed` | `PASS: 47 seed tables …` (refuses non-empty tables; run once only) |
| 4 | `npm run db:provision-app` | Restricted `hab_app` login created; `DATABASE_APP_URL` appended to this folder's `.env.local` |
| 5 | `npm run db:check:app` | Connects as `hab_app`, not as owner |
| 6 | `npm run db:audit` | RLS enabled on public tables; no anon/authenticated grants |
| 7 | `npm run storage:setup` | Private bucket `hab-private` exists; project matches `DATABASE_APP_URL` |
| 8 | `npm run storage:catalog` then `npm run storage:catalog -- --apply` | Seed catalog photos uploaded (plan first, then apply) |
| 9 | Set the test-account variables in this folder's `.env.local` (names in `.env.example`: `HAB_TEST_AGENCY_NAMES`, `HAB_TEST_PASSWORD_AGENCY_<NAME>`, `HAB_TEST_PASSWORD_AGENCY_KHACH`, `HAB_TEST_HDT_NAMES`, `HAB_TEST_PASSWORD_HDT_<NAME>`, `HAB_TEST_PASSWORD_PROVIDER`, `HAB_TEST_PASSWORD_UBND`) | — |
| 10 | `npm run db:set-test-passwords` | First line shows the **production** host/database; then `created`/`updated` per account, no password printed; exit code 0 (2 = something skipped, read the warnings) |

Skip `storage:import-local` (there are no local production files) and `import-legacy` (development history only).
Do not run `test:postgres` / `test:storage` against production; they run on the development project.

### 2.1 Lecturer tester accounts (`--lecturer`)

Four logins for the lecturer on one village (decision linhkhanh-vu, 2026-11-10: **Phú Vinh**; Provider `thanhvien21`,
UBND `thanhvien3`; the village has one Experience):

| Login | What the run does |
|---|---|
| `agency-tester@example.invalid` | Creates a Tour Agency, **Approved**, company "[Tester] Công ty du lịch" (approved by seed HDT `thanhvien9`, same records as a seed Agency) |
| `hdt-tester@example.invalid` | Creates an ADMIN / HDT account |
| `provider-tester@example.invalid` | **Changes the email** of the village's Verified Provider user (`thanhvien21@…`); user id, provider profile and Experiences unchanged |
| `ubnd-tester@example.invalid` | **Changes the email** of the village's UBND user (`thanhvien3@…`); user id and village assignment unchanged |

In the production folder (`.env.local` holds only production values), add for the run only:

```
HAB_EXPECT_PROJECT_REF=<production project ref>
HAB_LECTURER_VILLAGE=e482884e-7190-56cf-bc03-4e69614b1fe5   # Phú Vinh (village_id; the name "Phú Vinh" also works)
HAB_LECTURER_PROVIDER_EMAIL=thanhvien21@example.invalid      # only needed when the village has several Verified Providers
```

Production has **3 Verified Providers in Phú Vinh** (dry run 2026-11-10: "ambiguous (3 found)", nothing written), so
`HAB_LECTURER_PROVIDER_EMAIL` is needed there. That user must exist, be Active, be a Local Provider whose profile is
Verified and in `HAB_LECTURER_VILLAGE`; otherwise the run stops. Without the variable, an ambiguous village stops and
lists the candidates (`email — business name — N Experiences`). `HAB_LECTURER_UBND_EMAIL` does the same for the UBND
user (needed only if the village has several UBND assignments; the user must be assigned to that village). On a re-run
after the real run, the chosen user is found again by its tester email. The dry run prints `Provider selected: …` and
`UBND selected: …` with the reason (`HAB_LECTURER_PROVIDER_EMAIL`, `only Verified Provider in …`, `already provider-tester…`).

| # | Command | Expected |
|---|---|---|
| 1 | `npm run db:set-test-passwords -- --lecturer --dry-run` | Stops before connecting if `HAB_EXPECT_PROJECT_REF` is missing or differs from the ref in `DATABASE_APP_URL`. Otherwise prints the target, the village, which Provider/UBND user was selected and why, both user ids with old → new email, `create` for Agency/HDT, and `dry run: nothing was written` |
| 2 | `npm run db:set-test-passwords -- --lecturer` | Same plan, applied in **one transaction**; prints each generated password **once**, to the terminal only (refuses to run when the output is piped or redirected). Sessions of the changed users are revoked |
| 3 | Remove `HAB_EXPECT_PROJECT_REF`, `HAB_LECTURER_VILLAGE`, `HAB_LECTURER_PROVIDER_EMAIL` and `HAB_LECTURER_UBND_EMAIL` from `.env.local` | — |

- Passwords are generated (`crypto.randomBytes`, 20 characters, AUT rule) and never written to a file, log, issue or chat.
  Give them to the lecturer privately.
- Re-running prints `unchanged` and no password. `--reset-passwords` sets and prints new passwords for all four and
  revokes their sessions (e.g. if a password was lost).
- The run stops without writing if the village is unknown or inactive, has no or several Verified Providers or UBND
  users, if either user is not Active, or if a tester email already belongs to another user.
- **Production now differs from the seed by two emails**: `thanhvien21@example.invalid` → `provider-tester@example.invalid`
  and `thanhvien3@example.invalid` → `ubnd-tester@example.invalid`. The seed (`data/`) and the development database are
  unchanged; a production re-seed (forbidden, §5) would bring the old emails back.

## 3. Create the Render web service (human)

1. New **Web Service** from the GitHub repository, branch `main`, **one instance** (no autoscaling; ADR 0001).
2. Build command: `npm ci && npm run build` · Start command: `npm run start`.
3. Node: `package.json` has `engines.node` = `22.x`, so Render installs the latest Node 22 (with `>=22` it picked
   Node 26). Check the Node version in the build log; it must match CI (`node-version: 22`).
4. Environment variables (names only; values from the production folder's `.env.local`, entered in Render's
   settings, never in the repository):

   | Set | Do **not** set |
   |---|---|
   | `DATABASE_APP_URL` | `DATABASE_URL` (owner login, migrations only) |
   | `SUPABASE_URL` | `HAB_EMAIL_MODE` |
   | `SUPABASE_SECRET_KEY` | `HAB_TEST_*` (only needed where `db:set-test-passwords` runs) |
   | `SUPABASE_STORAGE_BUCKET` (`hab-private`) | anything with `NEXT_PUBLIC_` holding a secret |
   | `DATABASE_SSL_CA_FILE` only if step 1.3 needed it (and the file is available to the service) | `NODE_ENV` (set by `next start`) |

5. Deploy and keep the build log.

## 4. Checks after each deploy

On a phone over 4G/mobile data and on a laptop (record results in the test-plan sheet):

- [ ] `https://<public-url>/explore` opens; Experience cards with photos; open one Experience, then its Provider
      (shortest Must flow, no login).
- [ ] `/login` with `t-khach-agency@example.invalid` and its password → lands on `/explore`; "Chat với Provider"
      on an Experience → send `[T-Khach] test` → the message appears; log out.
- [ ] `/login` with a wrong password → refused; any seed email with any password → refused (the
      development-only demo login is off).
- [ ] Each role account from step 2.10 logs in to its workspace (Agency `/explore`, Provider dashboard,
      UBND `/admin/providers`, HDT `/admin`).
- [ ] `/register` submit → "Email chưa được cấu hình …" and nothing created; `/forgot-password` → same message.
- [ ] Browser dev tools: the `hab_session` cookie is `Secure; HttpOnly`; no secret in page source or network
      responses.
- [ ] Render logs: no startup error; Supabase logs: connections from `hab_app` only.
- [ ] Note the URL, commit and time in `docs/build/build-log.md`; write errors met in "local versus internet"
      notes (Session 11).

`scripts/smoke-auth.mjs` cannot be used against production as it is: it logs in the four seed identities with a
fixture password and uses `thanhvien8` (inactive village).

## 5. What must not be done

- No `npm run demo:reset`, `demo:seed`, `db:seed` (after the first run), `import-legacy --apply` or
  `supabase db push` against production; no database reset while testers' data is there.
- No second instance or autoscaling (On hold expiry timer runs per process).
- No `DATABASE_URL`, `HAB_EMAIL_MODE` or secret `NEXT_PUBLIC_*` variable on Render.
- No public bucket and no anonymous Storage policies; no Data API activation.
- No credentials in the repository, issues, chat, screenshots or command-line arguments; share test passwords
  privately with each owner.
- No development and production values in the same `.env.local`.
- No merge or redeploy during a test session; no deploy of a commit with red CI.

## 6. Rollback

Redeploy the previous good commit in Render. Migrations are forward-only (never edit an applied migration);
a schema problem needs a new migration, reviewed in a PR and applied with `db:migrate` outside test hours.
