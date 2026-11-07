# Deploy readiness (Session 10–11) — 2026-11-07

Checked on `main` = `8e944fc` (after PR #53, #54, #68). Requirements come from
[`claude-context/07-session10-11-requirements.md`](claude-context/07-session10-11-requirements.md); the course
slides win if they differ. This note prepares a deployment; nothing has been deployed, and no account or
external service has been created or connected.

Evidence key: **verified** = command or file read on 2026-11-07; **to re-check** = depends on a hosting
provider's current documentation or prices, which Session 11 says change often.

## 1. Session 10 — Module Integration and Testing

| Deliverable | Status | Evidence | Work needed |
|---|---|---|---|
| Integration contract `docs/test/integration-contract.md` | **Missing** | `docs/test/` does not exist | List every interface (sender → receiver, fields with type and required flag, error behaviour) and mark spec disagreements. Candidates: EXP/AIT → IAC handoff (Quote Request, Chat), BKG → IAC Booking Update (#66), IAC ↔ BKG write lock, AUT session → every module (`SessionContext`), PRF → EXP catalog, BKG → ADM dashboard, AUT review ↔ PRF major change (#57) |
| Integration and test plan `docs/test/test-plan.md` | **Missing** | — | Integration order, what is tested where, completion criteria |
| Contract tests: ≥ 4 per interface (1 normal, 2 boundary, 1 failure), test names cite FR/BR, each shown red when the code is broken | **Partial** | `tests/contract/` has 7 files (AUT and sessions). BKG → IAC has 5 named tests with mutation proof (`tests/unit/bkg-iac-message-order.test.ts`, PR #68). Most existing tests do not cite an ID (AUT map: none cite spec-AUT IDs) | One contract test set per interface in the contract above, with mutation evidence |
| Merged PRs reviewed by a non-author with ≥ 1 specific comment; file owner merges | **Partial** | Gate G6 open. Most PRs since #33 merged without a GitHub review. PR #11 now has a post-merge non-author review (Comment, `aut-step7-verify.md`) | A non-author review on each new PR; post-merge reviews for BKG #17/#22/#25/#28 |
| Defect reports as GitHub Issues (template), closed by the fixing PR | **Started** | Issues #55–#66 use the template; #66 closed by PR #68 | Fix or triage #55–#65; each fix PR says `Closes #n` |
| Annotated tag `v0.1-integration` on `main` (never moved or deleted) | **Missing** | Tags: `midterm-s7`, `mvp-alpha` | The human creates it after the integration gate (agents never push tags) |
| AI Use Log `docs/ai-use-log.md` (part + human checker) | **Started** | Created in PR #68 with one row; "Checked by" pending | One row per AI-assisted PR; the human fills "Checked by" |
| `.gitignore` for `.env`; `.env.example` lists every required variable without values | **Partial** | `.env` and `.env.*` ignored, `.env.example` kept (verified with `git check-ignore`). `.env.example` lists `OPENAI_API_KEY`, `GOOGLE_MAPS_API_KEY` and `DATABASE_URL`, which no code reads, and omits `HAB_EMAIL_MODE`, which code reads | Align `.env.example` with the variables in §3 below |
| Branch protection on `main` (PR + approval + passing checks) | **Missing** | `gh api …/branches/main` → `"protected": false` | Repository owner (JustACertainBlue) enables it; this needs a human with admin rights |
| CI on every merge | **Done** | `.github/workflows` runs `npm ci`, `npm test`, `npm run lint` on windows-latest and macos-latest with Node 22; last `main` run green | — |

## 2. Session 11 — Product Completion and Deployment Ready

| Deliverable | Level | Status | Work needed |
|---|---|---|---|
| Public link: another team opens it on a phone over mobile data and runs one Must-have flow | Required | **Missing** (blocked by §4 B1) | Deploy (§3), then test from a phone outside the classroom Wi-Fi |
| Spec with ≥ 1 new EARS line for a failure found when testing from outside | Required | **Missing**: no EARS lines in `docs/spec/` yet | After the outside test, the spec owner (nguyenthu) adds `IF …, THEN THE SYSTEM SHALL …` lines (agents do not edit `docs/spec/`) |
| ADR on the hosting option | Recommended | **Missing** | `docs/adr/0001-hosting.md`: choice, reason, accepted trade-off (§3 and §4) |
| Notes "local versus internet" | Recommended | **Missing** | Errors met during deployment and their fixes |
| Extension task (server-side LLM / minimal sign-in / API for another team), with one EARS line first | Encouraged | **Partly there**: AUT sign-in already blocks pages, but must run on the hosted version (§4 B1) | Choose one after the deploy works |
| "Every connection answers four questions" (I/O, who, waiting, failure message) | Practice | Partly in specs §5.1; failure EARS lines missing | Use the integration contract to list them |

## 3. Running on Render (always-on web service)

Facts from the repository (verified):

| Item | Value |
|---|---|
| Runtime | Node.js ≥ 22 (`AGENTS.md`, CI uses 22). `package.json` has **no `engines` field** and the repo has no `.node-version` / `.nvmrc`; pin the version so the platform does not choose one (to re-check how Render reads it: `engines.node`, `.node-version` or a `NODE_VERSION` variable) |
| Build command | `npm ci && npm run build` (`next build`, output `.next/`; `next.config.mjs` uses `.next-dev` only in development) |
| Start command | `npm run start` (`next start`). It listens on the `PORT` variable the platform provides (to re-check on Render) and runs with `NODE_ENV=production` |
| Instances | **Exactly one.** The JSON runtime is a local file with a directory lock (`runtime.json.lock`); several instances would each have their own copy |
| Seed | `data/seed/*.csv` is read at runtime to create `.demo-data/runtime.json` when it is missing (`json-repository.ts` `loadOrSeed`), so `data/` must be deployed with the app (it is in the repo) |
| HTTPS | Required: the `hab_session` cookie is `secure` in production (`src/app/api/auth/login/route.ts:22`) |

Environment variables (names only):

| Name | Needed? | Why |
|---|---|---|
| `NODE_ENV` | Set by `next start` to `production` | Production switches off the prototype login and dev-outbox (§4) |
| `PORT` | Provided by the platform | `next start` port |
| `HAB_EMAIL_MODE` | **Do not set** on the hosted version | `dev-outbox` is refused in production anyway (`registration-delivery.ts:8`, `lifecycle.ts:18`) |
| `HAB_SMOKE_ORIGIN` | Optional, on a laptop only | Points `node scripts/smoke-auth.mjs` at the hosted URL |
| `OPENAI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `DATABASE_URL` | **Not used** by any code today | Listed in `.env.example` only. AI Tour Matching is rule-based (no LLM call in `src/`); the PostgreSQL client `src/lib/db/client.ts` is a stub |
| _future_ email adapter variables | Needed only if a real email service is added (decision B2) | Never in code, only in the platform's environment settings |

## 4. What depends on the local machine

| # | Where | Behaviour on a hosted `NODE_ENV=production` server | Effect |
|---|---|---|---|
| B1 | **Login.** `src/lib/auth/product-session.ts:56` and `:90`: the four demo identities accept "any non-empty password" only outside production. Seed `password_hash` values are placeholders (`$2b$12$seedh…`) | **Nobody can log in**: demo login is refused and seed accounts have no real password | **Blocker** for the public link and every Must-have flow after Explore |
| B2 | **Email.** dev-outbox writes to `.demo-data/otp-outbox/` and `auth-outbox/` and is refused in production | Registration OTP, forgot password, UBND/Provider account creation, admin password reset and the Request More Information edit link all report "Email chưa được cấu hình" | No way to create a working account on the hosted version (so B1 cannot be solved by registering either) |
| B3 | **Data file.** `.demo-data/runtime.json` under `process.cwd()` (`json-repository.ts:28`, `scripts/demo-seed.mjs`) | Created from the seed on first use. A web service's local disk is normally reset on every deploy and restart unless a persistent disk is attached (to re-check on Render, including the free plan) | All bookings, chats and accounts created by testers vanish on redeploy/restart; acceptable for a demo only if written in the ADR |
| B4 | **Uploaded files.** `.demo-data/chat-files/`, `registration-documents/`, `account-avatars/`, `prf-media/` | Same disk as B3 | Attachments, documents, avatars and media disappear with B3; the seed files are metadata only (404 already) |
| B5 | **Explore tracking.** `src/app/api/explore/events/route.ts:9`, `session/route.ts:10`, `ExploreTracker.tsx:17,28`, `src/lib/explore/demo-runtime.ts:10` | Switched off in production ("Persistent EXP tracking integration is not configured") | Explore works, but session analytics and Agency re-ranking from behaviour signals are off |
| B6 | **In-memory handoff maps.** `src/lib/matching/handoff-service.ts:39` keeps maps on `globalThis` only outside production | Lost per process in production | Check during the hosted test that Quote/Chat reuse still comes from the JSON runtime, not these maps |
| B7 | `src/lib/auth/server-session.ts:13` builds `new Request('http://localhost/internal/session')` | Path-only internal request; the host is not contacted | None expected; confirm in the hosted test |
| B8 | Demo texts mention "dev-outbox" (`/register`, `/forgot-password/sent`, `/admin/create-account`) | Shown to outside users | Wording only |

## 5. Decisions for the team before deploying

1. **B1 + B2, how testers log in on the hosted version** (pick one and record it in the ADR):
   - (a) Add a real email adapter (needs an email provider account and secrets in the platform's
     environment settings).
   - (b) A one-time, server-side way to give a few synthetic test accounts real bcrypt passwords, for
     example a seed script run with credentials from platform environment variables. Never commit
     passwords.
   - (c) An explicit "public demo" mode that keeps the prototype login on the hosted version. This is a
     security decision: anyone could log in as any demo role.

   The Session 11 extension task "minimal sign-in blocking a page" needs one of these.
2. **B3 + B4, data persistence**: accept data loss on restart (write it in the ADR), attach a persistent
   disk (to re-check cost), or implement the PostgreSQL client (`src/lib/db/client.ts`, larger work).
3. **Test UBND account**: use a UBND assigned to an active village, for example `thanhvien1`, Bát Tràng.
   The demo UBND `thanhvien8` belongs to inactive Hạ Thái (issues #64, #65).
4. **Platform plan**: re-check Render's current free/paid limits (sleep after inactivity, disk,
   build minutes) before choosing; Session 11 says these change often.

## 6. Suggested order

1. Decide §5.1 and §5.2 → ADR.
2. Add `engines.node` and align `.env.example` (small PR).
3. Implement the chosen login option (test first).
4. Deploy, then run `HAB_SMOKE_ORIGIN=<public URL> node scripts/smoke-auth.mjs` from a laptop and one
   Must-have flow from a phone on mobile data.
5. Write "local vs internet" notes; file defects; the spec owner adds EARS lines.
6. Session 10 documents: integration contract, test plan, contract tests per interface → tag
   `v0.1-integration` (human).
