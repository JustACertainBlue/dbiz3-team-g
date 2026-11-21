# PROD runbook, UI v3 content and images (go-live day)

Written 2026-11-21 for the human who runs it (the agent never runs a PROD command). Run everything from
`~/Desktop/dbiz3-prod`, whose `.env.local` holds the **PROD** values. General Render and Supabase setup stays in
`docs/build/deploy-runbook.md`; this file is only the order of the v3 release.

PROD project ref: `euxclvszgiknjosbwjya`. DEV project ref: `jfrpnffknjpgmkyquxql`.

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
| `npm run db:content-load` | `-- --list-missing --target-prod` (survey, read only); `-- --target-prod` (default, writes then ROLLBACK) | `-- --target-prod --apply` | `-- --target-prod --undo <file>` |
| `npm run storage:seed-images` | `-- --json … --photos-dir … [--faces …] [--workshops …] --target-prod` (default, rolls back, uploads nothing) | add `--apply` | `-- --target-prod --undo <dir>/undo.json` |
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

> **If anything is missing: STOP.** The command prints `STOP: N snapshot row(s) are missing…`, exits with code 2 and writes
> the ids to `.demo-data/prod-content/content-missing-<UTC>.json` (ids only). Do not continue with any later step and do not
> run `--only-existing` or `--insert-missing` (they do not exist). Send the whole output and that file to the coordinating
> chat, which decides what to do with the missing rows (Appendix B lists the options).

**0.4 Seed-image dry runs, both sets (PROD, rolled back, nothing uploaded).** Set of 20/11:

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --json ~/Documents/dbiz3-assets/photos-2011/approved-photos.json --photos-dir ~/Documents/dbiz3-assets/photos-2011 --target-prod
```

Set of 21/11:

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --json ~/Documents/dbiz3-assets/photos-2111/approved-photos-2111-final.json --photos-dir ~/Documents/dbiz3-assets/photos-2111 --faces ~/Documents/dbiz3-assets/photos-2111/go-anh-mat-nguoi-final.json --workshops ~/Documents/dbiz3-assets/photos-2111/xuong-2111-final.json --target-prod
```

Expected for each: first line `"projectRef":"euxclvszgiknjosbwjya","isDev":false,"isProd":true,"mode":"dry-run (writes, then ROLLBACK; no upload)"`,
a report with the counts, and `Dry run: every write was rolled back; nothing was uploaded.` Compare the counts with the DEV run of
the same set. The two sets touch the same experiences, so the counts of the 21/11 run can change once the 20/11 set is applied
(inferred, not checked): here the point is that nothing refuses.

> **If a dry run stops because a target row is not found, or `--faces` reports a difference: STOP**, as in 0.3: send the output
> to the coordinating chat; do not retry with other options.
> If it stops with a missing table or column (`does not exist`) and 0.2 listed pending migrations, that is expected before
> Step 3: write the message down and repeat 0.4 after Step 3 (before Step 4); a second failure is a STOP.

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

### Step 4. Content (names, descriptions, editorial, slots, display names)

Dry run (default: runs every write inside one transaction, checks, ROLLBACK):

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run db:content-load -- --target-prod
```

Expected: first line `"projectRef":"euxclvszgiknjosbwjya","isProd":true,"mode":"load dry-run"`; `{"snapshot":{"rows":…,"snapshotSlots":190,
"changedRows":…}}`; a `rowCounts` line where only `experience_slots` and `audit_logs` differ; and
`Dry run: every write passed the database rules and the checks; rolled back, nothing kept.`
If it says `N target row(s) not found`, nothing was written: go to Appendix B.

Apply:

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run db:content-load -- --target-prod --apply
```

Expected: `Committed. Undo file: …/content-load-undo-<UTC>.json`. Note the path.
Check: run the dry run again. It must say `0 of N row(s) would change` and `Already up to date: 0 changes, nothing written.`
Undo (preview, then real; only restores rows that still hold the loaded values):

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run db:content-load -- --target-prod --undo <undo file> --dry-run
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run db:content-load -- --target-prod --undo <undo file>
```

### Step 5. Seed images, set of 20/11

Dry run (all writes, then ROLLBACK; uploads nothing):

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --json ~/Documents/dbiz3-assets/photos-2011/approved-photos.json --photos-dir ~/Documents/dbiz3-assets/photos-2011 --target-prod
```

Expected: first line `"projectRef":"euxclvszgiknjosbwjya","isDev":false,"isProd":true,"mode":"dry-run (writes, then ROLLBACK; no upload)"`,
a report with the photo counts, and `Dry run: every write was rolled back; nothing was uploaded.` Compare the counts with the
DEV run of the same set (DEV counts: in the build log entry of that run).

Apply:

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --json ~/Documents/dbiz3-assets/photos-2011/approved-photos.json --photos-dir ~/Documents/dbiz3-assets/photos-2011 --target-prod --apply
```

Expected: the report ends with the undo folder `.demo-data/seed-image-import/seed-image-import-<UTC>/undo.json`. Note it.
Undo (preview, then real; removes the uploaded objects and restores the rows):

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --target-prod --undo <dir>/undo.json --dry-run
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --target-prod --undo <dir>/undo.json
```

### Step 6. Seed images, set of 21/11

Run it only after step 5 is applied and its undo file is noted, because the second set reorders the display photos the first set
placed. Besides the photos it removes the face images listed in `go-anh-mat-nguoi-final.json` (by the SHA-256 of the stored
object; a difference between the list and the database stops the run before any write) and adds the workshop photos.

Dry run:

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --json ~/Documents/dbiz3-assets/photos-2111/approved-photos-2111-final.json --photos-dir ~/Documents/dbiz3-assets/photos-2111 --faces ~/Documents/dbiz3-assets/photos-2111/go-anh-mat-nguoi-final.json --workshops ~/Documents/dbiz3-assets/photos-2111/xuong-2111-final.json --target-prod
```

Apply:

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --json ~/Documents/dbiz3-assets/photos-2111/approved-photos-2111-final.json --photos-dir ~/Documents/dbiz3-assets/photos-2111 --faces ~/Documents/dbiz3-assets/photos-2111/go-anh-mat-nguoi-final.json --workshops ~/Documents/dbiz3-assets/photos-2111/xuong-2111-final.json --target-prod --apply
```

Expected: same first line as step 5 with `"mode":"apply"`, a report, and the undo folder
`.demo-data/seed-image-import/seed-image-import-<UTC>/undo.json`. Note it.
Undo (preview, then real; undo the sets in reverse order, 21/11 first):

```bash
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --target-prod --undo <dir>/undo.json --dry-run
CONFIRM_PROJECT_REF=euxclvszgiknjosbwjya npm run storage:seed-images -- --target-prod --undo <dir>/undo.json
```

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

Only `--list-missing` (option 1) is built. Options 2 to 5 are proposals; none of them is to be run before the coordinating chat decides.

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
2. **`--only-existing` (not built).** Load the content of the rows PROD has and skip the rest, printing the skipped counts per table
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
