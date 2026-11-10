# Session 10 and 11 deliverables — checklist

Source of the list: `docs/build/claude-context/07-session10-11-requirements.md` (course summary), plus items the
team added (branch protection, cookie check, review drafts). Status as of **2026-11-10 (final pass), `main` = `c858ba9`**
(PR #260, code freeze). Every ✅ was re-checked against `main` and GitHub on 2026-11-10; open PRs: #257 (this file) and #242 (superseded by #252).

Legend: ✅ done on `main` · 🟡 done in an open PR (merge pending) · ❌ missing · ⏳ in progress / waiting for a person.
Repository: https://github.com/JustACertainBlue/dbiz3-team-g

## Session 10 — Module Integration and Testing

| # | Deliverable | Status | Where | What is missing / who |
|---|---|---|---|---|
| 1 | Integration contract (`docs/test/integration-contract.md`): sender, receiver, fields, errors, disagreements per interface | ✅ | `docs/test/integration-contract.md` (9 interfaces; PR #85, updated by #94, #98) | — |
| 2 | Integration and test plan (`docs/test/test-plan.md`) | ✅ | `docs/test/test-plan.md`, defect template `.github/ISSUE_TEMPLATE/defect.md` (PR #77) | — |
| 3 | Contract tests: ≥ 4 per interface (1 normal, 2 boundary, 1 failure), FR/BR in every name, shown to fail when the code is broken | ✅ | `tests/contract/*.test.ts`: AUT → modules, IAC ↔ BKG (#82); PRF → EXP, EXP → IAC, AIT → IAC/EXP (#98); BKG → ADM, PRF → ADM, AUT ↔ PRF (#94); BKG → IAC covered by `tests/unit/bkg-*`. Foreground mutation results in each PR and build log Entries 55, 59, 60 | — |
| 4 | Merged PRs reviewed by a non-author with at least one specific comment | ⏳ | GitHub API, 2026-11-10: **13 of 152 merged PRs** have a review by someone other than the author with a comment: #6 (linhkhanh-vu), #101, #122 (mizaki311; #122 style-only), #106, #107, #110, #111, #112, #123, #167, #172 (linh-daotruc), #127, #135 (nguyenthu-0505). Approval without a comment only: #108, #109, #118. Teammate reviews of #242 and #228 by linhkhanh-vu were kept as drafts outside the repo (not GitHub reviews) | 139 merged PRs have no qualifying review; most were merged by the human working alone (CLAUDE.md §5). Human: decide whether to ask non-authors for post-merge reviews |
| 5 | Defect reports as GitHub Issues (template), each closed by its fixing PR | ⏳ | 27 issues labelled `defect`: 19 closed, each by its fixing PR (e.g. #55 → #107, #56 → #123, #57 / #83 → #130, #58 → #124, #59 → #106, #60 → #111, #61 → #112, #62 → #110, #64 → #252, #84 → #127, #87 → #89, #88 → #90, #93 → #100, #96 → #97, #102 → #174). Close Chat on Render verified and #162 closed 2026-11-10 | 8 open, none `sev:high`: #63, #65, #136, #139, #179, #180 (labelled `after-tag`), #131, #132 (`question`, need a spec decision) |
| 6 | Release tag `v0.1-integration` on `main` (annotated, never moved) | ✅ | Annotated tag by linhkhanh-vu, 2026-11-07, on `9bc6f7c` ("Session 10: 7 modules integrated, contract tests for 9 interfaces"), in `main` history | — |
| 7 | AI Use Log (`docs/ai-use-log.md`): AI-generated parts and who checked them | ⏳ | 140 rows on `main`, 145 with #257 (+5); every PR since #95 added its row | "Checked by" filled on 16 rows, 4 of them only "_pending: linhkhanh-vu_" → 12 rows actually checked by a person. Human: fill "Checked by" for the rest, or state that the human who merged checked them |
| 8 | Branch protection on `main` | ⏳ | GitHub API 2026-11-10 (`gh api`): `branches/main` → `"protected": false`; `branches/main/protection` → 404 Not Found; `rules/branches/main` → `[]`; `rulesets` → `[]`. Our account has no admin right on the repository (`permissions.admin: false`). The agent push guard (`.claude/hooks/block-git-push.py`) is local only | Repository owner (@JustACertainBlue): require a PR, ≥ 1 approving review from someone else, required checks `check (windows-latest)` and `check (macos-latest)`, no force-push, no deletion |

## Session 11 — Product Completion and Deployment Ready

| # | Deliverable | Status | Where | What is missing / who |
|---|---|---|---|---|
| 9 | **Public link** (another team opens it on a phone over mobile data and runs one Must flow) | ✅ | https://hanoi-artisan-bridge.onrender.com. Outside test 2026-11-10 15:55: Thu Hà (team H), iPhone 11 / Safari, Viettel 4G, public link. Must flow Guest → Explore → Experience → Provider, then login (t-khach-agency) → AI Matching → Request Quote → Chat; 8/8 steps passed. First load 5–10 s (keep-alive on). | — |
| 10 | ADR on the hosting option | ✅ | `docs/adr/0001-hosting.md`; `docs/adr/0002-next14-advisories.md` ([#109](https://github.com/JustACertainBlue/dbiz3-team-g/pull/109), merged 2026-11-10, `c319518`) | — |
| 11 | Notes: local versus internet | ✅ | `docs/build/local-vs-internet.md` ([#101](https://github.com/JustACertainBlue/dbiz3-team-g/pull/101), `ee4526c`; Node 22.x [#118](https://github.com/JustACertainBlue/dbiz3-team-g/pull/118), `6f7f251`; both merged 2026-11-10) | — |
| 12 | **Spec with new EARS lines** (at least one on a failure found when testing from outside) | ✅ | `main`: `docs/spec/specs/spec-AUT.md:237` (email not configured) and the 4 lines of #175 (merged; #102 AUT, #87 BKG, #88 PRF, #93 ADM). #173 (merged) + #258: EARS draft H1–H7 for failures seen only on the hosted build; H1 (Explore within 10 s on mobile 4G) and H2 (chat controls not clipped at 390 px) verified by the outside test 2026-11-10. #259: the verified lines H1–H5 and H7 copied into spec-EXP (H1), spec-IAC (H2, H4), spec-BKG (H3, H5) and spec-AUT (H7), each with its evidence: `spec-EXP.md:191`, `spec-IAC.md:178`, `:180`, `spec-BKG.md:233`, `:235`, `spec-AUT.md:241` | — |
| 13 | Extension task (encouraged) | ✅ | Claimed 2026-11-10, approved by linhkhanh-vu; built before the claim: the existing **minimal sign-in blocking a page** (`/login` + `hab_session`), from AUT PR #11 (merged 2026-11-06). EARS line and evidence in "Extension task claim" below | — |
| 14 | Session cookie flags on a production build | ✅ | Hosted check 2026-11-09 by linhkhanh-vu, Safari Web Inspector on https://hanoi-artisan-bridge.onrender.com: hab_session and explore_session both Secure, HttpOnly, SameSite=Lax; hab_session expires 12 h after login (Max-Age 43200). Earlier local production build of `main` (`npm run build` + `next start`, DEV database) showed the same `hab_session` flags, and the seed demo account with "any password" was refused (401) | — |
| 15 | Security / dependencies | ✅ | [#105](https://github.com/JustACertainBlue/dbiz3-team-g/pull/105) (remove `openai`, non-breaking `npm audit fix`), [#108](https://github.com/JustACertainBlue/dbiz3-team-g/pull/108) (remove unused Google Maps client), [#109](https://github.com/JustACertainBlue/dbiz3-team-g/pull/109) (Image Optimizer off; ADR 0002 lists the 25 Next 14 advisories), [#118](https://github.com/JustACertainBlue/dbiz3-team-g/pull/118) (Node 22.x); all merged 2026-11-10 | Next 15.5.x upgrade planned after MVP RC (ADR 0002) |
| 16 | Design-system preparation (team decision) | ✅ | [#113](https://github.com/JustACertainBlue/dbiz3-team-g/pull/113) (`src/app/tokens.css`), #114–#117, #119, #120 (shared components and five main screens), all merged 2026-11-08 | — |
| 17 | Release tag (Session 11) | ⏳ | Release tag: v0.2-session11 on `c858ba9` (created by linhkhanh-vu) | Not on `origin` yet (`git ls-remote --tags`, 2026-11-10: only `mvp-alpha` and `v0.1-integration`). linhkhanh-vu creates and pushes the annotated tag; the agent never pushes tags |

### Extension task claim (approved 2026-11-10 by linhkhanh-vu)

**EARS:** When a request without a valid `hab_session` sign-in reaches a protected page or API, the system shall not return the protected content: a protected API shall answer **401** (no session) or **403** (signed in with the wrong role or organization), and a protected page shall show a sign-in prompt or redirect to `/login` instead of the data.

**Honesty note:** this behaviour was **built before the claim**. It came with AUT PR #11 (merged 2026-11-06, `06b1fae`) and the product session (`cf554d9`, 2026-11-07). Nothing new is implemented for the claim.

Evidence on `main` (`c858ba9`, line numbers re-checked 2026-11-10):
| What | Where |
|---|---|
| Session cookie and lookup | `src/lib/auth/product-session.ts:8` (`PRODUCT_SESSION_COOKIE = 'hab_session'`); `src/lib/auth/session.ts:80` (`sessionContextFromRequest`) |
| API → 401 without a session | `src/app/api/adm/dashboard/route.ts:13`; `src/app/api/auth/account/avatar/route.ts:10`, `:21`, `:44`; `src/app/api/ait/sessions/[id]/messages/route.ts:9` |
| API → 403 for the wrong role / owner | `src/app/api/ait/sessions/[id]/messages/route.ts:11` |
| Page → sign-in prompt / redirect | `src/app/ai-matching/page.tsx:125` (link `/login?next=/ai-matching`); `src/app/messages/page.tsx:188`; `src/app/agency/[agencyId]/bookings/[bookingId]/page.tsx:18` |
| Tests (401) | `tests/adm/contract/dashboard-api.test.ts:70`, `:107`; `tests/contract/account-avatar-api.test.ts:6-8`; `tests/contract/aut-lifecycle-api.test.ts:24`; `tests/contract/ait-iac-exp-handoff.test.ts:64`; `tests/integration/ait-matching-api.test.ts:146`, `:178` |
| Tests (403) | `tests/integration/iac-chats-api.test.ts:67` (Provider calling an Agency-only Chat start) |
| Tests (page) | `tests/unit/ai-matching-access.test.ts:7` ("Guest → redirect to Login") |

## Before MVP RC (from the same file)

| Item | Status | Note |
|---|---|---|
| Every Must flow works on the hosted version | ⏳ | Recorded on the hosted version: the outside test 2026-11-10 (Guest → Explore → Experience → Provider → login → AI Matching → Request Quote → Chat, 8/8, row 9) and Close Chat on Render (#162, 2026-11-10). A run of every Must flow on the hosted build after the final merges is not recorded |
| Open defects | ✅ none `sev:high` | 2026-11-10: no open issue labelled `sev:high` (#156, #157 closed). Open defects are `sev:low` / `sev:medium` or questions (row 5) |
