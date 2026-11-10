# From localhost to the hosted version — what went wrong and how it was handled

Session 11 deliverable. Each row is a problem the team actually met while moving Hanoi Artisan Bridge from a
developer laptop (`npm run dev`, JSON runtime, then a development Supabase project) to the hosted version on
Render (`https://hanoi-artisan-bridge.onrender.com`, production Supabase project). Sources: `docs/build/build-log.md`,
`docs/adr/0001-hosting.md`, `docs/build/deploy-runbook.md`, `docs/build/deploy-readiness.md`, the GitHub issues
named in each row, and the human's own report where marked. No secret, password, key or connection string is
written here; project references are the public project IDs only.

**Date / commit.** 2026-11-07, `main` = `9b9d88b`; public link updated to the new service the same day. Drafted by Claude Code (AI Use Log); human check pending.

## 1. Configuration and environments

| # | What happened (local → internet) | Why | How it was handled / rule now |
|---|---|---|---|
| 1 | **`.env.local` in the wrong folder.** The app and the `db:*` scripts did not see the variables. (Human report.) | Next.js and `scripts/db/*` load `.env.local` from the **repository root** only (`@next/env`, `loadEnvConfig(process.cwd())`). A file one level up or inside `src/` is ignored silently. | Put `.env.local` in the repository root, next to `package.json`; restart `npm run dev` after every change. Check with `npm run db:check:app`, which prints the target without credentials. `docs/env/supabase-quickstart.md`, `docs/env/supabase-storage.md`. |
| 2 | **Wrong value type in `DATABASE_APP_URL`.** Round 0 (agent session 2026-11-07) was blocked because the variable held the Supabase *project URL* (`https://<ref>.supabase.co`), not a `postgresql://` URI; `databaseConfig` rejected it. | Two Supabase values look alike: the Project URL (for Storage, `SUPABASE_URL`) and the Session-pooler connection string (for PostgreSQL). | `DATABASE_APP_URL` = the restricted `hab_app` `postgresql://` URI from `db:provision-app`; `SUPABASE_URL` = the `https://` Project URL. Before any run, print host + project ref only (never user/password) and let the human confirm it is the intended project. |
| 3 | **Dev and production projects can be confused.** DEV is `jfrpnffknjpgmkyquxql`, production is `euxclvszgiknjosbwjya`. No script tells them apart (ADR 0001: "nothing in the scripts tells them apart"), and `db:provision-app` *appends* to `.env.local`. | One `.env.local` per folder; every `db:*` script uses whatever it contains. | Runbook rule: a **separate clone/folder for production operations** whose `.env.local` holds only production values; never both in one file. Agents print the project ref and STOP for human confirmation before touching a database; nothing is run against production from the development folder. |
| 4 | **Comments on the same line as a value in `.env`.** While preparing `.env.example` for deployment, `KEY=value # comment` lines were changed because a value with a trailing comment is easy to mis-read or mis-paste into Render. (Agent session 2026-11-07; not in the build log.) | Hosting dashboards take the raw text after `=`; a comment pasted along becomes part of the value. | Comments go on their own line in `.env.example`; values are pasted into Render's environment settings without comments. |
| 5 | **Owner login on the web service.** `DATABASE_URL` (owner, migrations) must not be on Render. | Least privilege. | Render gets only `DATABASE_APP_URL` (`hab_app`), `SUPABASE_URL`, `SUPABASE_SECRET_KEY` and the optional bucket/CA variables (ADR 0001 table). Migrations run from the production-ops folder with `npm run db:migrate`, not from the web service. |
| 6 | **Development-only shortcuts stop working.** On the dev server the old curl quickstarts with `-H "Cookie: hab_demo_account=…"` returned 401/Guest. | Since PR #11 `hab_demo_account` works only under `NODE_ENV=test`; the product cookie `hab_session` comes from `/login`. In production (`next start` sets `NODE_ENV=production`) the "any non-empty password" prototype login is refused too (`product-session.ts:56`). | Quickstarts and `docs/build/demo-login.md` log in first and send `hab_session`. Hosted test accounts get real passwords from the manual one-off `npm run db:set-test-passwords` (ADR 0001). |
| 7 | **Login page still advertises the prototype on the hosted site.** Smoke check 2026-11-07: `https://hanoi-artisan-bridge.onrender.com/login` shows "Tài khoản thử nghiệm … nhập bất kỳ mật khẩu không rỗng" with the seed emails, although production refuses that login (row 6). | The panel in `src/app/login/page.tsx` has no environment condition. | Open finding (not fixed): testers must use the test accounts they were given; the panel should be shown in development only (`docs/build/demo-login.md` says "in development only"). |
| 8 | **Email does not exist on the hosted version.** Registration OTP, password reset and new-account credentials need email. | ADR 0001: no email provider; `HAB_EMAIL_MODE=dev-outbox` is refused in production. | One message "Email chưa được cấu hình…" and nothing created (EARS line in spec-AUT, PR #79). Outside testers use a "[T-Khach]" test Agency account. |

## 2. Data and runtime differences

| # | What happened | Why | How it was handled |
|---|---|---|---|
| 9 | **Times shown 7 hours early after a status change** (issue #87). Locally `09:00–10:30`, on the Supabase dev database `02:00–03:30` in Chat and Booking lists. | The JSON seed stores `+07:00` strings; PostgreSQL returns `timestamptz` as UTC. Display code cut the ISO string. | One formatter `src/lib/time/hanoi-time.ts` (Asia/Ho_Chi_Minh), PR #89; admin date filter tested in PR #91. |
| 10 | **Dashboard Custom period missed records near midnight** (issue #93). | `new Date('YYYY-MM-DD')` is midnight UTC = 07:00 Hanoi. | spec-ADM FR-004 clarified (whole Hanoi days, both included); fixed in PR #100. |
| 11 | **500 instead of a field error** for an Experience category outside the enum (issue #88). Passed locally. | The JSON fixture does not enforce `CHECK` constraints; PostgreSQL does (`experience_category_chk`). | Zod enum of the 5 spec values, 400 with a clear message, PR #90. Lesson: a green local suite does not prove the database rules; run `npm run test:postgres` and a regression on the dev database (issue #83 is the same class, still open). |
| 12 | **Private files need Storage on the hosted version.** Without `SUPABASE_URL`/`SUPABASE_SECRET_KEY`, uploads (attachments, avatars, certificates, registration documents) fail. | AGENTS.md: live file bytes use private Supabase Storage; no disk fallback. | Both variables are required on Render (ADR 0001). Round 0 checked uploads/downloads and access rules on the dev project. |
| 13 | **Hosted Storage tests failed on a phone hotspot** ("other side closed", connect timeout). | Slow/unstable upload link; direct uploads still succeeded but took up to 19 s for 64 KB. | Classified as environment, not a product defect; re-run on a stable network before concluding. |
| 14 | **Shared test data persists.** Everything testers create stays in the database. | One shared production database (ADR 0001). | Prefix everything with `[T-<name>]`; archive through the app, never edit the database by hand (e.g. the `[T-round0]` Experience was archived by the Provider API). |

## 3. Hosting platform

| # | What happened | Why | How it was handled |
|---|---|---|---|
| 15 | **First request after a pause is slow.** | Render free plan sleeps when idle (ADR 0001 "Idle sleep"). | The tester notice in ADR 0001 says the first page may take a while; warm the site before a demo. Current Render/Supabase free-plan limits are "to re-check", no numbers assumed. |
| 16 | **Region choice.** The human reported choosing the Mumbai region. (Human report; not recorded elsewhere in the repo.) The development database pooler is in `ap-southeast-1` (Singapore). | Every page makes database round trips from Render to Supabase, so the distance between the two regions adds latency to each request. | Runbook step 1: choose the Supabase production region close to the Render region and re-check both lists; keep the Data API disabled. |
| 17 | **One instance only.** | The 72-hour On hold expiry timer runs in the web process. | ADR 0001: one Render instance; no horizontal scaling until the timer moves out of the process. |
| 17a | **The `onrender.com` address could not be renamed.** The first service was published as `dbiz3-team-g.onrender.com`; the team wanted a product name in the public link. (Human report.) | On Render the `<name>.onrender.com` subdomain comes from the service name at creation and stays fixed; renaming the service does not change the address (re-check in Render's docs). | A new web service `hanoi-artisan-bridge` was created from the same repository (auto-deploy from `main`, same production database and environment variables); the old service was deleted. Every link in the repo and in tester messages points to `https://hanoi-artisan-bridge.onrender.com`. Choose the service name before the first deploy. |
| 17b | **Render chose Node 26.** `package.json` said `"engines": { "node": ">=22" }`, so Render installed the newest Node (26) for the hosted build, while CI and the team use Node 22. (Human report, 2026-11-08.) | An open-ended range lets the host pick any newer major. | `engines.node` pinned to `22.x` (PR #118), matching CI (`actions/setup-node`, `node-version: 22`); check the Node version in Render's build log after each deploy. |
| 18 | **Start-up code broke the production build.** PR #75 (hosted test accounts created at every start, via `instrumentation.ts`) failed `next build`. | Next.js also compiles `instrumentation.ts` for the edge runtime; Node-only imports (database, bcrypt) broke it. | First guarded with `if (process.env.NEXT_RUNTIME === 'nodejs')`; then the human chose a manual one-off script instead (ADR 0001, PR #80), and #75 was closed unmerged. `main` has no `instrumentation.ts`. |

## 4. Process and CI

| # | What happened | Why | How it was handled |
|---|---|---|---|
| 19 | **Merged PRs that never reached `main`.** #79, #80 and #82 were merged, but `main` had no `db:set-test-passwords`. | They were stacked PRs; each merged into its base branch, and GitHub retargets a stacked PR only when the base branch is deleted (this repo keeps branches). | Catch-up PR #86 brought them into `main`. Rule: open every PR straight into `main`; if a PR must stack, retarget it to `main` before merging. A conflicting PR is re-applied on a new branch from `main` (PR #98 replaced #92) instead of force-pushing. |
| 20 | **Windows-only CI failure** (issue #96). `json-durable-sync` failed intermittently on `windows-latest` with `EPERM … mkdir runtime.json.lock`; macOS was green. | Windows returns `EPERM` instead of `EEXIST` while another writer deletes the lock directory. | Retry `EPERM`/`EACCES` as contention when the lock exists or has just gone, same deadline; PR #97. CI runs on both `windows-latest` and `macos-latest`. |
| 21 | **Agent pushes and data safety.** | Hosted data and `main` are shared. | `.claude/hooks/block-git-push.py`: feature branches only, never `main`, force, delete or tags; the human merges. Agents never read `.env.local`, never print credentials and never run `db:*` against production. |

## 5. Smoke check of the hosted version (read-only, 2026-11-07)

Site: `https://hanoi-artisan-bridge.onrender.com` (the earlier `dbiz3-team-g.onrender.com` service has been
deleted; the same checks gave the same results there). No login, no writes, no `db:*` script: only `GET`
requests were sent (the browser pane's network log shows only `GET` API calls).

| Check | Result |
|---|---|
| `/`, `/explore`, `/login` | 200 (0.6–2.1 s; the site was awake) |
| `GET /api/explore` | 200, 5 Experience cards, no price for Guest, no `[T-…]` test data |
| Experience detail `/explore/experiences/c8281688…` | 200, "Dệt lụa truyền thống", Vạn Phúc |
| Provider page `/explore/providers/70efa801…` | 200, "Xưởng thủ công Vạn Phúc" |
| Provider schedule `/explore/providers/70efa801…/schedule` | 200 with "Chỉ Tour Agency mới xem được lịch trống…" + Đăng nhập |
| `/messages`, `/admin`, `/admin/users`, `/account` (client pages) | HTTP 200 shell; after load: login prompt, or "Không có quyền quản lý tài khoản." with 0 rows |
| `/agency/…/bookings`, `/agency/…/schedule`, `/provider/…/bookings`, `/provider/…/dashboard` | HTTP 200 with "Chỉ … mới xem được …" + Đăng nhập; no Booking data |
| `GET /api/iac/chats`, `/api/bkg/agency/bookings`, `/api/auth/users`, `/api/auth/agency-reviews` | 403 |
| `GET /api/adm/dashboard`, `/api/auth/account` | 401 |
| Protected pages redirect to `/login`? | No: they answer 200 with a login prompt and no data; the APIs refuse with 401/403 |
| Session cookie `Secure` + `HttpOnly` | **Not observable without logging in** (no `Set-Cookie` on any `GET`). Code: `hab_session` and `explore_session` are `httpOnly` always and `secure` when `NODE_ENV=production` (`src/app/api/auth/login/route.ts:21-22`, `src/app/api/explore/session/route.ts:23`). Needs one logged-in check by the human (DevTools → Application → Cookies). |
| `/login` content | Shows the prototype "any password" panel with seed emails (row 7) |
