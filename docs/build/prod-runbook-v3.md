# PROD runbook, UI v3 content and images (go-live day)

> **Historical (2026-11-28).** This is the record of the release of 21–22/11 on the former PROD project `euxclvszgiknjosbwjya`,
> which is **retired**: every guard in `scripts/` now refuses that ref. The PROD ref is `pdeioligjeksgfnodgzs` (new project).
> To repeat any command below, replace the ref in `CONFIRM_PROJECT_REF=` and in the expected output with the new one, and read
> [`prod-migrate-supabase.md`](prod-migrate-supabase.md) first. The text below is kept unchanged as the record.

Written 2026-11-21 for the human who runs it (the agent never runs a PROD command). Run everything from
`~/Desktop/dbiz3-prod`, whose `.env.local` holds the **PROD** values. General Render and Supabase setup stays in
`docs/build/deploy-runbook.md`; this file is only the order of the v3 release.

PROD project ref: `euxclvszgiknjosbwjya`. DEV project ref: `jfrpnffknjpgmkyquxql`.

## Release in two stages (decision of the coordinating chat, 2026-11-21)

PROD lacks part of the DEV rows (Step 0.3 on 2026-11-21: 139 rows and 68 slots, see Appendix B and Appendix C). **Stage 1** (this
runbook, Steps 0 to 10) loads content and images only for the rows PROD already has: `db:content-load --only-existing` and
`storage:seed-images --skip-missing-targets`. **Stage 2** (Appendix C, description only, nothing built) brings the missing rows
to PROD and loads their content and photos later.

## 0. Rules that apply to every step

1. **Check the ref first.** Every command below prints a first line with `projectRef`. It must be
   `euxclvszgiknjosbwjya`. If it shows `jfrpnffknjpgmkyquxql`, stop: the folder's env is DEV.
2. **Dry run first, then apply, then the same dry run again** (it must report 0 changes) before the next step.
3. `CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya` is typed in front of each command, in the shell. The scripts ignore a
   value that comes from a `.env` file. A wrong or missing value makes the script stop before it connects.
4. Real runs need `--target-prod`. Without it a script refuses PROD. Without `CONFIRM_PROJECT_REF` it refuses too.
5. Each `--apply` writes an undo file under `.demo-data/` of `dbiz3-prod` (git-ignored) and prints its path. Keep every
   undo file until the release is accepted. Never delete or edit one.
6. Do nothing in this runbook during a test session. No merge or redeploy while testers are working.

## 1. Which command has which guard (state after this branch)

| Command | PROD dry run | PROD real run | Undo |
|---|---|---|---|
| `npm run db:migrate` | `-- --dry-run` + `CONFIRM_PROJECT_REF` (transaction, then ROLLBACK) | `-- --target-prod` + `CONFIRM_PROJECT_REF` | none (migrations are forward only; new migration to fix) |
| `npm run db:content-load` | `-- --list-missing --target-prod` (survey, read only); `-- --target-prod --only-existing` (default, writes then ROLLBACK) | `-- --target-prod --only-existing --apply` | `-- --target-prod --undo <file>` |
| `npm run storage:seed-images` | `-- --json … --photos-dir … [--faces …] [--workshops …] --target-prod --skip-missing-targets` (default, rolls back, uploads nothing) | add `--apply` | `-- --target-prod --undo <dir>/undo.json` |
| `npm run storage:media-variants` | `-- --target-prod` (default, reads and encodes only) | add `--apply` | `-- --target-prod --undo <dir>/undo.json` |
| `npm run storage:catalog-copies` | `-- --target-prod` | add `--apply` | `-- --target-prod --undo <dir>/undo.json` |

Before this branch `db:migrate` had **no ref check on a real run at all** (only `--dry-run` refused PROD), and
`storage:media-variants` was DEV only (`storage:seed-images` got its `--target-prod` in #279 on `main`, merged into this branch). `storage:catalog-copies` was already done on PROD on
2026-11-19 (build log Entry 114); it is listed for completeness and needs no run unless its dry run reports a count.

## 2. Before the day (no PROD write)

1. The PR of `feat/prod-content-load` is merged into `main` (human).
2. Make the snapshot from DEV. Run in a folder whose env is DEV (for example `dbiz3-prodprep`), after `git pull`:

   ```bash
   node scripts/db/prod-content-load.mjs --export
   ```

   Expect a line with `"projectRef":"jfrpnffknjpgmkyquxql"`, row counts per table, `"experience_slots":190` (or the
   current number) and a `sha256`. The file is `.demo-data/prod-content/snapshot.json`. It holds content only: names,
   descriptions, editorial text, slots, and the two display names `user_accounts.full_name` and
   `agency_profiles.company_name` of synthetic (`@example.invalid`) accounts. No e-mail, password or other login column.
3. Copy the snapshot into the PROD folder (the folder is git-ignored; create it if it does not exist):

   ```bash
   mkdir -p ~/Desktop/dbiz3-prod/.demo-data/prod-content
   cp ~/Desktop/dbiz3-prodprep/.demo-data/prod-content/snapshot.json ~/Desktop/dbiz3-prod/.demo-data/prod-content/snapshot.json
   ```

   If `dbiz3-prod/.demo-data/prod-content/snapshot.json` already exists, do not overwrite it: move the old one aside first.
4. The photo sets are on disk (checked 2026-11-21):
   - set of 20/11: `~/Documents/dbiz3-assets/photos-2011/`, with `approved-photos.json` in it (86 entries);
   - set of 21/11: `~/Documents/dbiz3-assets/photos-2111/`, with `approved-photos-2111-final.json` (63 entries), `go-anh-mat-nguoi-final.json`
     (`--faces`) and `xuong-2111-final.json` (`--workshops`, 20 entries). The folder also holds `can-tu-chup-final.json`, which
     no command in this runbook uses.

## 3. Go-live sequence

### Step 0. Survey PROD (read only, before every write)

Nothing in this step changes PROD data: the migration dry run and the seed-image dry runs end in ROLLBACK and upload nothing,
and `--list-missing` is a READ ONLY transaction. Do 0.1 first.

**0.1 Prepare the folder (local only).** In `~/Desktop/dbiz3-prod`:

```bash
cd ~/Desktop/dbiz3-prod
git branch --show-current
git pull origin main
git --no-pager log --oneline -3
npm ci
```

Expected: branch `main`, the log shows the merge of `feat/prod-content-load` (if it does not, the script is not there: stop).
Check the env points at PROD, without printing any secret:

```bash
node -e "require('@next/env').loadEnvConfig(process.cwd());const u=new URL(process.env.DATABASE_URL);console.log('DB ref:',decodeURIComponent(u.username).split('.')[1]);console.log('Storage ref:',new URL(process.env.SUPABASE_URL).hostname.split('.')[0])"
```

Expected: both lines `euxclvszgiknjosbwjya`. Any other value: stop. Then copy the snapshot (section 2, item 3).

**0.2 Which migrations are pending (dry run, ROLLBACK):**

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run db:migrate -- --dry-run
```

Expected: `[dry-run] project ref euxclvszgiknjosbwjya (PROD)`, the pending list, `OK` for each, `rolled back; ledger unchanged`.
Write the pending list down. It decides whether 0.4 can pass (see there).

**0.3 Which snapshot rows PROD lacks (read only):**

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run db:content-load -- --list-missing --target-prod
```

Expected: first line `"projectRef":"euxclvszgiknjosbwjya","isProd":true,"mode":"list-missing (read only)"`, a `survey` line with, per
table, `inSnapshot`, `present`, `missing`, and `Nothing missing: every snapshot row exists on this database.` (exit code 0).
It works before the migrations are applied. A `Note: N target user_accounts row(s) have an e-mail that is not @example.invalid`
line means the load would refuse those users: report it too.

> **Missing rows are expected in stage 1.** On 2026-11-21 the survey reported 139 missing rows (experiences 34, provider_profiles 25,
> provider_profile_versions 24, villages 14, user_accounts 35, agency_profiles 7) and `slotsOfMissingExperiences` 68, with
> `nonSyntheticUsers` 0; the command prints `STOP: …` and exits with code 2 whenever something is missing, which is the normal
> result now. Keep the output and the `content-missing-<UTC>.json` file. Go on to Step 0.4 and the later steps **only if** every
> number is the same or lower than those above and `nonSyntheticUsers` is 0. **STOP** and send the output and the file to the
> coordinating chat if any number is higher, if `nonSyntheticUsers` is not 0, or if a table that was complete is now missing rows.

**0.4 Seed-image dry run, set of 20/11 only (PROD, rolled back, nothing uploaded):**

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --json ~/Documents/dbiz3-assets/photos-2011/approved-photos.json --photos-dir ~/Documents/dbiz3-assets/photos-2011 --target-prod --skip-missing-targets
```

Expected: first line `"projectRef":"euxclvszgiknjosbwjya","isDev":false,"isProd":true,"mode":"dry-run (writes, then ROLLBACK; no upload)"`,
a report with `imported` (the photos whose village or experience PROD has), a `skippedMissingTargets` block listing the photos left
out (`counts.photos`), and `Dry run: every write was rolled back; nothing was uploaded.` Write down `imported` and
`skippedMissingTargets.counts`: `imported` + `counts.photos` must equal the number of photos of the set that are not excluded.

The set of 21/11 is **not** dry-run here. Its face-removal list was made on DEV after the 20/11 set was applied, so on PROD it
only matches once 20/11 is applied: its dry run is Step 6, right after Step 5.

> If it stops with an error other than a missing table or column, **STOP** and send the output to the coordinating chat.
> If it stops with a missing table or column (`does not exist`) and 0.2 listed pending migrations, that is expected before
> Step 3: write the message down and repeat 0.4 after Step 3 (before Step 4); a second failure is a STOP.

**0.5 Login check (baseline, before any write).** The login code of this release (`src/lib/auth/product-session.ts`) is
`bcrypt.compare(password, password_hash)`; the prototype "any password" login is off in a production build (`NODE_ENV=production`).
The seed fixtures hash (`$2b$12$seedhash…`) never matches, so a seed account that still has it cannot log in on PROD; an account
whose hash was set by `db:set-test-passwords` or `scripts/db/lecturer-accounts.mjs` is a real bcrypt hash (cost 12) and can.
Checked on PROD on 2026-11-21 (read only; hashes were classified, never printed): 30 accounts have a valid bcrypt hash, 20 active seed
accounts have the fixture hash and cannot log in. Accounts to use for the demo, one per role (all `@example.invalid`, Active or
Approved, with their organization or village assignment present; the passwords are the ones you set, kept in the PROD folder's
`.env.local` or your password manager, not in this repository):

| Role | Email |
|---|---|
| Tour agency | `agency-tester@example.invalid` |
| Local provider (workshop) | `provider-tester@example.invalid` |
| HDT | `hdt-tester@example.invalid` |
| UBND | `ubnd-tester@example.invalid` |

Check by logging in on the live PROD site with each of the four. Expected: each lands on its own workspace (Agency `/explore`,
Provider dashboard, HDT `/admin`, UBND `/admin/providers`). If an account does not log in, **STOP**: do not reset a password by
hand; send the account and the symptom to the coordinating chat (a reset script with a dry run and an undo file, reading the
password from an environment variable, is proposed in Appendix C, not built).

### Step 1. Turn off Render auto-deploy

Render dashboard → the web service → Settings → Build & Deploy → Auto-Deploy → **Off**. Check: the setting shows Off.
Why: step 4 changes the schema and the later steps change content; a push or merge must not deploy half-way.
Undo: switch it back on (step 9 does it anyway).

### Step 2. Confirm main did not move

```bash
cd ~/Desktop/dbiz3-prod
git branch --show-current
git pull origin main
```

Expected: branch `main` and `Already up to date.` (the pull of step 0.1 was the real one). If the pull brings new commits, repeat
Step 0 before going on, because the surveys were made on older code.

### Step 3. Migrations

Dry run (every pending migration in one transaction, then ROLLBACK; ledger unchanged):

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run db:migrate -- --dry-run
```

Expected: first line `[dry-run] project ref euxclvszgiknjosbwjya (PROD)`, then `N applied in the ledger, M pending: …`,
then `OK` for each pending name and `rolled back; ledger unchanged`. Any `ERROR` line: stop and read it. The pending list
should include the four content migrations (`20261117120000`, `20261118101709`, `20261118120000`, `20261119100000`) unless
PROD already has them, and `20261120100000_hab_media_file_indexes.sql`.

Apply:

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run db:migrate -- --target-prod
```

Expected: `[apply] project ref euxclvszgiknjosbwjya (PROD)`, then `Applied: <name>` for each pending migration.
Check: repeat the dry run; it must say `0 pending: none`.
Undo: none. Migrations are forward only; a problem needs a new migration in a PR.

### Step 4. Content (names, descriptions, editorial, slots, display names), stage 1: existing rows only

Dry run (default: runs every write inside one transaction, checks, ROLLBACK):

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run db:content-load -- --target-prod --only-existing
```

Expected: first line `"projectRef":"euxclvszgiknjosbwjya","isProd":true,"mode":"load dry-run"`; a `snapshot` line with `rows` 304,
`skippedRows` (139 on 2026-11-21) and `changedRows`; a line `Skipped (not on this database): 139 row(s) {…}; slots of 34
experience(s) = 68 slot(s) not loaded.` (the numbers must match the Step 0.3 survey); a `rowCounts` line where only `experience_slots`
and `audit_logs` differ; and `Dry run: every write passed the database rules and the checks; rolled back, nothing kept.`
**STOP** if the skipped numbers differ from Step 0.3, or if any check fails.

Apply:

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run db:content-load -- --target-prod --only-existing --apply
```

Expected: `Committed. Undo file: …/content-load-undo-<UTC>.json`. Note the path; the file also lists the skipped ids and slot counts
(`skipped`), which stage 2 uses.
Check: run the dry run again. It must say `0 of N row(s) would change` and `Already up to date: 0 changes, nothing written.`
Undo (preview, then real; only restores rows that still hold the loaded values):

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run db:content-load -- --target-prod --undo <undo file> --dry-run
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run db:content-load -- --target-prod --undo <undo file>
```

### Step 5. Seed images, set of 20/11, stage 1: targets PROD has

Dry run (all writes, then ROLLBACK; uploads nothing):

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --json ~/Documents/dbiz3-assets/photos-2011/approved-photos.json --photos-dir ~/Documents/dbiz3-assets/photos-2011 --target-prod --skip-missing-targets
```

Expected: first line `"projectRef":"euxclvszgiknjosbwjya","isDev":false,"isProd":true,"mode":"dry-run (writes, then ROLLBACK; no upload)"`,
a report with `imported`, `skippedMissingTargets` (the photos left out, with `counts`), and
`Dry run: every write was rolled back; nothing was uploaded.` The numbers must be the ones of Step 0.4.

Apply:

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --json ~/Documents/dbiz3-assets/photos-2011/approved-photos.json --photos-dir ~/Documents/dbiz3-assets/photos-2011 --target-prod --skip-missing-targets --apply
```

Expected: the report ends with the undo folder `.demo-data/seed-image-import/seed-image-import-<UTC>/undo.json` (it also holds
`skippedMissingTargets`). Note it.
Undo (preview, then real; removes the uploaded objects and restores the rows; no `--skip-missing-targets` here):

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --target-prod --undo <dir>/undo.json --dry-run
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --target-prod --undo <dir>/undo.json
```

**Next: the dry run of Step 6, immediately after this step is applied.**

### Step 6. Seed images, set of 21/11, stage 1: targets PROD has

Run it only after step 5 is applied (and its undo file noted), and **dry-run first, right after step 5**: the list of face images
to remove (`go-anh-mat-nguoi-final.json`) was made on DEV after the 20/11 set was applied, so it only matches PROD in that state.
The set adds the photos of 21/11, removes the face images of the list (by the SHA-256 of the stored object) and adds the workshop
photos. With `--skip-missing-targets` the photos, workshop photos and face-list rows whose village, experience or provider PROD
does not have are left out and reported, and the face list is cut to the rows PROD can have (and the hashes only they use); what
is left is compared exactly as before.

Dry run (PROD, rolled back, nothing uploaded):

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --json ~/Documents/dbiz3-assets/photos-2111/approved-photos-2111-final.json --photos-dir ~/Documents/dbiz3-assets/photos-2111 --faces ~/Documents/dbiz3-assets/photos-2111/go-anh-mat-nguoi-final.json --workshops ~/Documents/dbiz3-assets/photos-2111/xuong-2111-final.json --target-prod --skip-missing-targets
```

Expected: same first line as step 5, a report with `imported`, `importedWorkshopPhotos`, `faces` (listRows, found, removedNow) and
`skippedMissingTargets` (`counts.photos`, `counts.workshopPhotos`, `counts.faceRows`), and
`Dry run: every write was rolled back; nothing was uploaded.` Check: `faces.found` equals `faces.listRows.profile_media` +
`faces.listRows.provider_version_media` + `faces.listRows.kept` (the list rows whose target PROD has).

> **If the dry run reports `The face-removal list does not match this database` (a hash not found, a row missing or an
> unexpected row), or a count that is not explained by `skippedMissingTargets`: STOP.** Do not apply and do not retry with other
> options; send the whole output to the coordinating chat. Only the rows of targets PROD lacks may differ.

Apply (only after a clean dry run):

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --json ~/Documents/dbiz3-assets/photos-2111/approved-photos-2111-final.json --photos-dir ~/Documents/dbiz3-assets/photos-2111 --faces ~/Documents/dbiz3-assets/photos-2111/go-anh-mat-nguoi-final.json --workshops ~/Documents/dbiz3-assets/photos-2111/xuong-2111-final.json --target-prod --skip-missing-targets --apply
```

Expected: same first line as step 5 with `"mode":"apply"`, a report, and the undo folder
`.demo-data/seed-image-import/seed-image-import-<UTC>/undo.json`. Note it.
Undo (preview, then real; undo the sets in reverse order, 21/11 first):

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --target-prod --undo <dir>/undo.json --dry-run
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --target-prod --undo <dir>/undo.json
```

> **Do not use DEV to try this set again.** DEV already has the 21/11 set applied (its undo is in
> `dbiz3-devload/.demo-data/seed-image-import-2111`), so a dry run there always stops at the face-removal check. That is by design,
> not a defect of the script.

### Step 7. WebP variants backfill

Dry run (reads and encodes only; reports sizes; nothing uploaded):

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:media-variants -- --target-prod
```

Expected: `"projectRef":"euxclvszgiknjosbwjya","isProd":true,"mode":"dry-run (read and encode only; no upload)"`, then the
count of showcase images that lack variants and the size summary. `Dry run: nothing was uploaded.`
Apply (writes the list of keys it will create to an undo file first, then uploads without replacing):

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:media-variants -- --target-prod --apply
```

Check: run the dry run again; it must report 0 missing variants.
If the dry run reports stored variants over their size cap, run once with `--only-oversize` (dry run, then `--apply`; it saves
the current bytes next to its undo file before replacing).
Undo: `… npm run storage:media-variants -- --target-prod --undo <dir>/undo.json [--dry-run]`.

### Step 8. Manual Deploy

Render dashboard → the web service → Manual Deploy → **Deploy latest commit** (the commit that is `main`'s head from step 2).
Keep the build log. Expected: build passes, the service goes Live, the log shows Node 22.

### Step 9. Turn auto-deploy back on

Settings → Build & Deploy → Auto-Deploy → **On**. Check: the setting shows On.

### Step 10. Check the result

Use the checklist of `docs/build/deploy-runbook.md` §4 (explore, login, Provider and Admin workspaces, cookie flags,
Render and Supabase logs), plus the v3 items:

- [ ] `/explore`: cards show the new photos and no "[DEMO]" text anywhere (cards, Experience page, Provider page, Village page).
- [ ] One Experience page shows its slots (ca) and the highlights; one Village page shows its highlights and visit notes.
- [ ] The Agency and Provider demo accounts show their new display names in the account menu.
- [ ] Network tab on `/explore`: images are `…/api/prf/media/<id>?w=400` or `?w=800` and WebP, each under its cap
      (400 ≤ 50 KB, 800 ≤ 120 KB, 1600 ≤ 250 KB).
- [ ] Repeat the dry runs of steps 3, 4 and 7: `0 pending`, `0 changes`, `0 missing variants`.
- [ ] Write the URL, commit, time and every undo file path in `docs/build/build-log.md`.

## 4. Rollback order

Content and images are undone from the undo files, newest first: step 7 (variants), step 6 (21/11 images), step 5 (20/11
images), step 4 (content). Migrations are not undone. If the new release itself is bad, redeploy the previous good commit in
Render (the new columns and tables are additive; the old code ignores them).

## Appendix A. Display names (checked on DEV, read only, 2026-11-21)

The 2026-11-19 content load (journal in `~/.hab-content-load/`) changed `user_accounts.full_name` on 43 rows and
`agency_profiles.company_name` on 3 rows (plus 51 experience names and 22 provider business names). DEV now has no
"[DEMO]" in `user_accounts.full_name` (0 of 79), `agency_profiles.company_name` (0 of 16), `experiences.name` or
`provider_profile_versions.business_name`; the old values in the journal did not contain "[DEMO]" either. Because the load
did rename those two columns, `db:content-load` carries exactly them: `user_accounts.full_name` and
`agency_profiles.company_name`. Safeguards: any other `user_accounts` column in a snapshot is refused; only accounts whose
e-mail ends in `@example.invalid` are exported (all 79 on DEV); the load refuses if a target user has any other e-mail; a
snapshot with "[DEMO]" in any name is refused; the row counts of both tables are checked unchanged after the write.

## Appendix B. If PROD lacks experiences, villages, providers, users or agencies of the snapshot

Built: `--list-missing` (option 1) and, as stage 1 of the release, `--only-existing` (option 2) for the content and `--skip-missing-targets` for the photos. Options 3 to 5 are proposals (stage 2, Appendix C); none of them is to be run before the coordinating chat decides.

What is known (DEV, read only): the snapshot holds 93 experiences, 22 villages, 49 provider profiles, 79 users, 16 agencies.
The seed has only 8, 8, 8, 26 and 8 of them. The other rows came from the older runtime data (experiences created
2026-07-11: 51; providers 2026-07-06: 16) and from DEV work on 2026-11-07 to 2026-11-20 (experiences 34, providers 25). PROD's own
content is not known to the agent (no PROD connection). The build log (Entry 114) shows PROD has non-seed catalog copies
(45), so it does hold at least part of the older rows. The load never writes a row that does not exist: a missing target stops
the load before any write and prints the count and the first five table/id pairs.

Options, in the order the agent would try them:

1. **Find out exactly what is missing (read only). Built.** `db:content-load -- --list-missing --target-prod` (Step 0.3) opens
   the connection in a READ ONLY transaction, prints for each table the number of snapshot ids PROD has and lacks, and writes the
   lacking ids to `.demo-data/prod-content/content-missing-<UTC>.json`. No write.
2. **`--only-existing`. Built (stage 1).** Load the content of the rows PROD has and skip the rest, printing the skipped counts per table
   and writing them into the undo file and the audit row. Good if the missing rows are DEV-only test data (the 2026-11-15 to
   2026-11-20 rows are very likely that). Cost: a small flag plus tests; the human reads the skipped list before `--apply`.
3. **Leave the missing rows out of the snapshot.** `--export` takes only ids that appear in a list the human approves
   (for example the ids of PROD's own experiences, listed by a read-only query run by the human). No change to the load itself.
4. **Copy the missing rows from DEV to PROD** with a new `--insert-missing` mode (not built): inserts the parent rows first (users,
   villages, provider profiles and versions) and then experiences, in one transaction with an undo file that deletes them. Only if
   the human decides those rows must exist on PROD. It touches accounts and foreign keys, so it needs its own plan and review, and
   `import-legacy --apply` stays forbidden on PROD (`deploy-runbook.md` §5).
5. **Create them through the app.** Providers and Agencies register on PROD as real users; content is then written in the
   product. Slowest, no script risk.

Decision for the human before step 4: which of options 2 to 5 applies to each table.

## Appendix C. Stage 2 (description only; nothing in this appendix is built or to be run)

Goal: the rows that stage 1 skipped exist on PROD, with their content, slots and photos. Input: the `content-missing-<UTC>.json` file of
Step 0.3, the `skipped` block in the undo file of Step 4 (ids and the 68 slots), and the `skippedMissingTargets` blocks in the undo
files of Steps 5 and 6 (photos, workshop photos and face rows left out).

1. **Decide how the rows get to PROD** (Appendix B, options 3 to 5; the coordinating chat decides, per table). Likely order if they are
   copied: users, agencies and villages first, then provider profiles and their published versions, then experiences, in one
   transaction with an undo file; nothing here is built.
2. **Content:** run Step 0.3 again; it must report 0 missing. Then `db:content-load -- --target-prod` (without `--only-existing`) loads
   the whole snapshot; rows already loaded in stage 1 are unchanged (it only writes rows that differ), so it adds the content and the 68
   slots of the new rows.
3. **Photos:** do **not** run the two sets again as they are: `storage:seed-images` is not idempotent, a second run would add the photos
   of the rows PROD already has a second time. Stage 2 needs a smaller `approved-photos.json` (and `xuong` and face lists) that
   contains only the items listed in `skippedMissingTargets`, made from those lists; the 21/11 face list must be re-made for the
   new rows in the state they will be in. A `--only-items-from <report>` option would do it without hand-made files (not built).
4. **WebP variants:** `storage:media-variants` again (dry run, apply); it only creates variants that are missing.
5. **Login:** if the demo needs more accounts than the four of Step 0.5, a reset script is proposed (not built):
   `db:demo-passwords`, `--target-prod` + `CONFIRM_PROJECT_REF`, dry run by default, undo file with the old hashes, the new password read
   from an environment variable (never an argument, never printed), limited to listed `@example.invalid` accounts that are Active or Approved.
   The 20 active seed accounts with the fixture hash need it to log in at all.
