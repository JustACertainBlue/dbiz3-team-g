# Session 10 and 11 deliverables — checklist

Source of the list: `docs/build/claude-context/07-session10-11-requirements.md` (course summary), plus items the
team added (branch protection, cookie check, review drafts). Status as of **2026-11-08, `main` = `9b9d88b`**; open
PRs are not merged yet (team test session on the evening of 2026-11-08, merges the next morning).

Legend: ✅ done on `main` · 🟡 done in an open PR (merge pending) · ❌ missing · ⏳ in progress / waiting for a person.
Repository: https://github.com/JustACertainBlue/dbiz3-team-g

## Session 10 — Module Integration and Testing

| # | Deliverable | Status | Where | What is missing / who |
|---|---|---|---|---|
| 1 | Integration contract (`docs/test/integration-contract.md`): sender, receiver, fields, errors, disagreements per interface | ✅ | `docs/test/integration-contract.md` (9 interfaces; PR #85, updated by #94, #98) | — |
| 2 | Integration and test plan (`docs/test/test-plan.md`) | ✅ | `docs/test/test-plan.md`, defect template `.github/ISSUE_TEMPLATE/defect.md` (PR #77) | — |
| 3 | Contract tests: ≥ 4 per interface (1 normal, 2 boundary, 1 failure), FR/BR in every name, shown to fail when the code is broken | ✅ | `tests/contract/*.test.ts`: AUT → modules, IAC ↔ BKG (#82); PRF → EXP, EXP → IAC, AIT → IAC/EXP (#98); BKG → ADM, PRF → ADM, AUT ↔ PRF (#94); BKG → IAC covered by `tests/unit/bkg-*`. Foreground mutation results in each PR and build log Entries 55, 59, 60 | — |
| 4 | Merged PRs reviewed by a non-author with at least one specific comment | 🟡 | Count on 2026-11-09 (GitHub reviews by someone other than the PR author, with at least one specific comment): **merged** — 2 (#6 linhkhanh-vu, changes requested; #167 linh-daotruc). **Open, waiting to merge** — 10 (#101 mizaki311; #106, #107, #110, #111, #112, #123, #172 linh-daotruc; #127, #135 nguyenthu-0505); notes on #101, #110, #123 were fixed on those branches. Approval without a comment only: #108, #109 (JustACertainBlue). Style-only comment about `build-log.md`, which the PR no longer changes: #122 (mizaki311) | No qualifying review yet: #105, #108, #109, #118, #122, #124, #130, #173, #174, #175, #176, #177, #178 and merged #164, #165, #166, #168, #169, #171. Human: ask a non-author to review them |
| 5 | Defect reports as GitHub Issues (template), each closed by its fixing PR | 🟡 | Issues #55–#65, #83, #84, #87, #88, #93, #96, #102. Closed by merged PRs: #87 (#89), #88 (#90), #93 (#100), #96 (#97). Fix PRs open: #55 (#107), #59 (#106), #60 (#111), #61 (#112), #62 (#110), #83 (#121), #102 (#103) | Merge the open fix PRs. Still open without a PR: #56, #57 (options sent to the human), #58, #63, #64, #65 (@JustACertainBlue, data), #84 (needs a decision: real endpoint or remove the route) |
| 6 | Release tag `v0.1-integration` on `main` (annotated, never moved) | ✅ | Annotated tag by linhkhanh-vu, 2026-11-07, on `9bc6f7c` ("Session 10: 7 modules integrated, contract tests for 9 interfaces"), in `main` history | — |
| 7 | AI Use Log (`docs/ai-use-log.md`): AI-generated parts and who checked them | 🟡 | 66 rows on `main` (backfill PR #95); every new PR adds its row | "Checked by" is empty except #6: to fill from the reviewers' comments (planned 2026-11-09 after 12:00) |
| 8 | Branch protection on `main` | ❌ | GitHub API: `main` has no protection rule and no ruleset (404). The agent push guard (`.claude/hooks/block-git-push.py`) is local only | Repository admin (@JustACertainBlue, repo owner): require a PR, ≥ 1 approving review from someone else, passing CI (`check (windows-latest)`, `check (macos-latest)`), no force-push, no deletion |

## Session 11 — Product Completion and Deployment Ready

| # | Deliverable | Status | Where | What is missing / who |
|---|---|---|---|---|
| 9 | **Public link** (another team opens it on a phone over mobile data and runs one Must flow) | ✅ | https://hanoi-artisan-bridge.onrender.com. Outside test 2026-11-10 15:55: Thu Hà (team H), iPhone 11 / Safari, Viettel 4G, public link. Must flow Guest → Explore → Experience → Provider, then login (t-khach-agency) → AI Matching → Request Quote → Chat; 8/8 steps passed. First load 5–10 s (keep-alive on). | — |
| 10 | ADR on the hosting option | ✅ / 🟡 | `docs/adr/0001-hosting.md` ✅; `docs/adr/0002-next14-advisories.md` 🟡 (PR #109) | Merge #109 |
| 11 | Notes: local versus internet | 🟡 | `docs/build/local-vs-internet.md` (PR #101; 22 problems + smoke check, incl. Node 26 → 22.x, #118) | Merge #101 and #118 |
| 12 | **Spec with new EARS lines** (at least one on a failure found when testing from outside) | ✅ | `main`: spec-AUT line 231 (email not configured) and the 4 lines of #175 (merged; #102 AUT, #87 BKG, #88 PRF, #93 ADM). #173 (merged) + #258: EARS draft H1–H7 for failures seen only on the hosted build; H1 (Explore within 10 s on mobile 4G) and H2 (chat controls not clipped at 390 px) verified by the outside test 2026-11-10. #259: the verified lines H1–H5 and H7 copied into spec-EXP (H1), spec-IAC (H2, H4), spec-BKG (H3, H5) and spec-AUT (H7), each with its evidence | — |
| 13 | Extension task (encouraged) | ✅ | Claimed 2026-11-10, approved by linhkhanh-vu; built before the claim: the existing **minimal sign-in blocking a page** (`/login` + `hab_session`), from AUT PR #11 (merged 2026-11-06). EARS line and evidence in "Extension task claim" below | — |
| 14 | Session cookie flags on a production build | ✅ | Hosted check 2026-11-09 by linhkhanh-vu, Safari Web Inspector on https://hanoi-artisan-bridge.onrender.com: hab_session and explore_session both Secure, HttpOnly, SameSite=Lax; hab_session expires 12 h after login (Max-Age 43200). Earlier local production build of `main` (`npm run build` + `next start`, DEV database) showed the same `hab_session` flags, and the seed demo account with "any password" was refused (401) | — |
| 15 | Security / dependencies | 🟡 | PR #105 (remove `openai`, non-breaking `npm audit fix`), #108 (remove unused Google Maps client), #109 (Image Optimizer off; ADR 0002 lists the 25 Next 14 advisories), #118 (Node 22.x) | Merge in this order: #105, then #108 (lockfile may need regenerating), #109, #118. Next 15.5.x upgrade planned after MVP RC (ADR 0002) |
| 16 | Design-system preparation (team decision) | 🟡 | PR #113 (`tokens.css`), #114–#117, #119, #120 (shared components and five main screens; no visual change, Playwright + computed-style proof) | Merge #113 first, then the others |

### Extension task claim (approved 2026-11-10 by linhkhanh-vu)

**EARS:** When a request without a valid `hab_session` sign-in reaches a protected page or API, the system shall not return the protected content: a protected API shall answer **401** (no session) or **403** (signed in with the wrong role or organization), and a protected page shall show a sign-in prompt or redirect to `/login` instead of the data.

**Honesty note:** this behaviour was **built before the claim**. It came with AUT PR #11 (merged 2026-11-06, `06b1fae`) and the product session (`cf554d9`, 2026-11-07). Nothing new is implemented for the claim.

Evidence on `main` (`ec859af`):
| What | Where |
|---|---|
| Session cookie and lookup | `src/lib/auth/product-session.ts:7` (`PRODUCT_SESSION_COOKIE = 'hab_session'`); `src/lib/auth/session.ts:80` (`sessionContextFromRequest`) |
| API → 401 without a session | `src/app/api/adm/dashboard/route.ts:13`; `src/app/api/auth/account/avatar/route.ts:10`, `:21`, `:44`; `src/app/api/ait/sessions/[id]/messages/route.ts:9` |
| API → 403 for the wrong role / owner | `src/app/api/ait/sessions/[id]/messages/route.ts:11` |
| Page → sign-in prompt / redirect | `src/app/ai-matching/page.tsx:124` (link `/login?next=/ai-matching`); `src/app/messages/page.tsx:188`; `src/app/agency/[agencyId]/bookings/[bookingId]/page.tsx:18` |
| Tests (401) | `tests/adm/contract/dashboard-api.test.ts:70`, `:107`; `tests/contract/account-avatar-api.test.ts:6-8`; `tests/contract/aut-lifecycle-api.test.ts:24`; `tests/contract/ait-iac-exp-handoff.test.ts:64`; `tests/integration/ait-matching-api.test.ts:146`, `:178` |
| Tests (403) | `tests/integration/iac-chats-api.test.ts:67` (Provider calling an Agency-only Chat start) |
| Tests (page) | `tests/unit/ai-matching-access.test.ts:7` ("Guest → redirect to Login") |

## Before MVP RC (from the same file)

| Item | Status | Note |
|---|---|---|
| Every Must flow works on the hosted version | ⏳ | Round 0 on the DEV database passed for all 7 modules (two defects fixed: #87, #88); needs a run on the hosted version after the morning merges |
| Defects found tonight | ⏳ | No new issue had been opened by the time of writing; add any from the evening test session here |
