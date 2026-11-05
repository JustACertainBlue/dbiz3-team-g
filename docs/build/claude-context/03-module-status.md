# 03 — Module status board

Keep this file current. Each row: what is verified, by whom, at which commit. Anything older than
the latest commit on that branch must be re-checked (`/team-status`).

| Module | Feature folder | Branch / PR | Owner (driver) | Status | Last verified |
|---|---|---|---|---|---|
| AIT | `specs/001-ait-core` | `001-ait-core` / PR #6 (nguyenthu-0505), merged as `3e0e047`; Round 3 fixes PR #33 merged as `5d0131a` (2026-11-04, no review yet; nguyenthu-0505 requested) | nguyenthu-0505 (Round 3 fixes: linhkhanh-vu) | On `main`. Round 3: D1–D11 fixed, spec-AIT #23–#37, build log Entry 32, limitations checklist §3 rows 15–24. No build-log entry for rounds 1–2 (checklist G8) 5 Nov: BR audit 16 covered, 5 N/A (Should); BR-015 code breaks — `/api/ait/preferences/[agencyId]` unauthenticated (checklist §3 #46). | 5 Nov 2026, `main` `71429cc`: 112 files, 745/745, lint OK, CI #12 green; demo path clicked (macOS); BR audit `docs/build/g3-br-audit.md` |
| BKG | `specs/004-bkg-core` (US-4); `specs/011-bkg-manage` (US-5 + US-3); `specs/012-bkg-list` (US-6); `specs/013-bkg-schedule` (US-1 + US-2) | PR #17 (`343e4ce`), #20 (`5cae545`), #22 (`7057d5c`), #25 (`c3f0c64`), #28 (`fa4d9d2`); spec PRs #18, #19, #21, #24, #26, #27 | linhkhanh-vu | **Code complete on `main`**: US-1..US-6, F-SCHED-01..10; T-lists of all four features done; demos on macOS (build-log Entries 12, 16, 20, 25, 30); checklist §3 BKG rows 5–13 current. **Missing**: Windows G1 for 004/011/012/013; post-merge non-author review of PR #17, #22, #25, #28 (no GitHub review on any; owners: AIT/PRF/EXP for `applyBatch`, PRF for nav links, EXP for the Explore link). Spec #26–#82 on `main` 5 Nov: BR audit 17 covered, 2 N/A; screens M7/M2/M3 now tested (`tests/unit/bkg-screens.test.ts`, `bkg-nav-links.test.ts`); snapshots of 004/011/012 refreshed (OK). Windows: CI green. | 5 Nov 2026, `main` `71429cc`: 112 files, 745/745, lint OK, CI #12 green; demo path clicked (macOS); BR audit `docs/build/g3-br-audit.md` |
| AUT | `specs/001-aut-registration` … `specs/010-aut-manage-accounts` (10 folders) | `001-aut-registration`, last `07d60b0` (linh-daotruc, 29 Oct) / PR #11 (open, no review) | linh-daotruc | **Not merged**: 22 ahead, 112 behind `main`; stack drift (Next 16 / React 19 / Vitest 5 / `pg` vs `main` Next 14 / React 18 / Vitest 2), 13 conflicts at the 30 Oct dry run; User Management (ADM095) now belongs here (spec-ADM:48). `main` uses the demo session instead | 4 Nov 2026, branch inspected, not run |
| PRF | `specs/002-prf-core` | `002-prf-core` / PR #8, squash-merged as `222216d` | nguyenthu-0505 | On `main`; US-1–6. Branch still has 14 commits not on `main` (last `e8e9e5c`, 21 Oct). Snapshot DRIFT vs spec-PRF; US-4 edit page partly hard-coded (checklist §3 #33–34) 5 Nov: slices A, A2, B merged (PR #38–#40; spec-PRF #31–#34): PRF128/PRF127 from data, versioning per #32/#33, Experience images BR-008/009/015, lightbox BR-016, pricing #34; snapshot OK. BR audit: 13 covered, 5 partial, BR-013 missing, BR-014 and BR-017 code break (§3 #44, #45). | 5 Nov 2026, `main` `71429cc`: 112 files, 745/745, lint OK, CI #12 green; demo path clicked (macOS); BR audit `docs/build/g3-br-audit.md` |
| EXP | `specs/001-exp-core` | `001-exp-core`, PR #9; tip `ada9e44` = `main` | JustACertainBlue (Codex) | On `main`; US-1–4 attempted, see `specs/001-exp-core/implementation-status.md` 5 Nov: slice C merged (PR #41; spec-EXP #29/#32/#33): FR-007 signal from the live handoff, FR-011 hiding, quickstart/status/plan "As built". BR audit: 10 covered, 4 N/A (Should loop), BR-014 missing by decision (§3 #41). | 5 Nov 2026, `main` `71429cc`: 112 files, 745/745, lint OK, CI #12 green; demo path clicked (macOS); BR audit `docs/build/g3-br-audit.md` |
| ADM | `specs/003-adm-core` | Ported onto `main` as PR #34 (`7c1fde6`, merged 2026-11-04 without review; thuvutp-prog requested); PR #12 closed as superseded | thuvutp-prog (port + fixes: linhkhanh-vu) | On `main`: A1–A14 fixed (runtime data, demo-cookie session, contract:110 time basis, spec-ADM #21–#22, User Management moved to AUT), role-sync loop fixed; build log Entry 33; limitations checklist §3 rows 25–29 5 Nov: BR audit 16 covered, 3 partial; many older tests ran on an empty date window (§3 #47); new tests on P1 seed rows. | 5 Nov 2026, `main` `71429cc`: 112 files, 745/745, lint OK, CI #12 green; demo path clicked (macOS); BR audit `docs/build/g3-br-audit.md` |
| IAC | `specs/003-iac-core` (on the branch) | `003-iac-core`, last `e85ce85` (mizaki311, 1 Nov) / PR #16 (open, no review) | mizaki311 | **Not merged**: 3 ahead, 23 behind `main`; plan + US-1 chat core (`src/lib/iac/*`, `/api/iac/sessions*`, `/messages`). Reads the runtime (`demoRepository`), but authenticates from client headers `x-mock-user-id` / `x-mock-role` (same spoofing class as the removed `x-mock-session`); folder number 003 clashes with ADM | 4 Nov 2026, branch inspected, not run |

Also not merged: `member/spec-consistency` (4 ahead, 143 behind; leftover after PR #2; would
overwrite spec-BKG and `data/`) and `ngthu/update-specs` (1 ahead, 141 behind; leftover after PR #3;
would overwrite the seed). No open PR for either; owners asked to delete or cherry-pick `bf29e15`.

Test run on `main` `71429cc` (PR #41, 5 Nov 2026): `Test Files 112 passed (112)`, `Tests 745 passed (745)`;
`npm run lint` passes; seed PASS; CI run #12 green on windows-latest and macos-latest. Branch `linh/g3-audit`
(not pushed): 118 files, 782 tests. `start_feature.py --check` OK for all 8 folders. `npm audit`: checklist §3 #14.

MVP Alpha checklist on `main`: G1, G2, G4, G5, G7, G8 ticked; G3 open (exceptions in checklist §2 and
`docs/build/g3-br-audit.md`); G6 open by decision. All five §1 demo paths re-clicked on 5 Nov (build-log Entry 42).

Keep updating from `git branch -r`, `ls specs/` on each branch, open PRs, and the team's work
allocation. Do not guess.

---

## AIT — details (state at review round 2, commit `b88c8b9`, 11 Oct 2026)

> PR #6 is merged (`3e0e047`); still to verify whether B1–B4 are fixed on `main`.

Stack (from the AIT branch): Next.js, Node ≥ 22, Vitest. `.env`:
`OPENAI_API_KEY=mock-key-for-test`, `DATABASE_URL=file:./dev.db` (SQLite — unused; seed read from CSV).
Commits: `3938f47` → `3a107c1` → `b88c8b9`. `main` was `62b91c0` (PR #5 constitution + build kit merged).

### Integration reality

| Layer | State |
|---|---|
| UI → `POST /api/ait/matching` (Next.js route) | real, returns 200 |
| Server-side filter/rank | real; results change with input |
| Seed | read from `data/seed/villages.csv` etc. via `fs` (no DB) |
| LLM | **mocked**: regex extractor (pax, date, budget only) |
| Google Maps | not integrated |
| Request Quote / Chat | stubs: `quote-<timestamp>-<random>` IDs, not persisted |

### Verified OK in round 2
`--check` OK; `validate_seed` PASS; 14 files / 83 tests pass; cards show seed names/caps/prices;
no Đường Lâm / hard-coded 96.5 in `src`; clarification loop (Silk → asks pax + date → results);
fresh session "15 tourists…" → only Chuông (15) + Quất Động (16); Guest blocked; quote says
"No booking created".

### Open defects (blocking)

| # | Defect | Spec |
|---|---|---|
| B1 | Tour Preference Profile not updated on later turns of the same session (values from first matched turn stick): 15/13/200 pax and 20,000 VND budget all return the same 5 providers; correct only in a fresh session. | AIT FR-009, BR-008, AS-8 (also BR-005, BR-011, BR-020) |
| B2 | Every card scores 87.3 with a template reason; experience preference ignored (Silk → Vạn Phúc ranked #3). Also in a fresh session. | AIT FR-007, BR-006, BR-007, AS-7 |
| B3 | Request Quote creates a new quote ID on every click for the same Agency–Experience. | AIT BR-018, AS-10 (FR-011 is Should) |
| B4 | Chat creates a new chat ID on every click for the same Agency–Provider; does not open a chat screen. | AIT BR-019, AS-11 |

Test gap: integration tests call service functions directly; nothing exercises
`POST /api/ait/matching` over multiple turns of one `session_id`. Needed tests: turn 1 = 10 pax →
turn 2 = 15 pax excludes caps < 15; 200 pax and 20,000 VND → no-match + `relaxation_suggestions`;
Request Quote ×2 → same ID; Chat ×2 → same ID.

Re-verify checklist for round 3 (one session, sequential; every message states origin + craft, spec #29):
"Silk weaving" (follow-ups) → "10 pax on 2026-11-20 from Hoàn Kiếm" (5 cards, Vạn Phúc #1) → "Change
to 15 pax" (2 cards) → "Change to 13 pax" (no Bát Tràng) → "Change to 200 pax" (no-match, capacity
named, #24) → "Change to 10 pax, budget 20,000 VND per person" (no-match, Budget suggestion 150,000,
#23); scores differ; Quote ×2 and Chat ×2 keep their IDs and open Messages (#31). Full path:
`specs/001-ait-core/quickstart.md` §2.

Round 3 result on `main` `fc29cbc` (30 Oct 2026): B1, B3 fixed; B2 partly (scores differ, Silk → Vạn
Phúc #1, but template explanation and name-based craft match); B4 partly (Chat keeps its ID, opens no
screen). Further defects D1–D10 and their fix tasks: `specs/001-ait-core/tasks.md` Phase 5.

Non-blocking: Đường Lâm still in `specs/001-ait-core/quickstart.md:88`, `research.md:35`,
`tests/unit/hard-constraints.test.ts:37`; test comment "seed max ≤ 20" (actual 18 Đào Thục, 16 among
Verified); SQLite in quickstart vs PostgreSQL schema; mock login; card lacks Provider name and View
Details; PR description empty; `npm install` → 11 vulnerabilities (5 moderate, 2 high, 4 critical).

### Draft for `mvp-alpha-checklist.md` §3 (AIT rows)

> **2026-11-04 (Round 3, `linh/ait-fixes`):** the rows below that are still true were moved to
> `docs/build/mvp-alpha-checklist.md` §3 rows 15–24 (with new rows for #23 dates, #32 Other and provider quality).
> Row 9 (Quote/Chat stubs) was removed: fixed by D10/#31. Rows 3 (template explanation) and 7 (session in
> memory) are fixed; row 13 is covered by checklist row 14; row 11 (Should-have F-MATCH-10, 13–16) was not
> re-verified in Round 3. This draft is kept for history.

B1 and B2 are Must → fix before tagging; they are not limitations. B3/B4 may stay as row 9 because
FR-011 is Should.

| # | Limitation | Spec reference | Planned for |
|---|---|---|---|
| 1 | AIT: AI extraction is mocked, no LLM is called. A regex extractor reads only group size, date and budget; craft preference, route and special requirements are not understood. Development stub only (spec forbids rule-based fallback). | AIT FR-003, FR-004, BR-017 | Session 9 |
| 2 | AIT: "Temporary AI Failure + Retry" path cannot be exercised because no real AI call exists. | AIT FR-003, AC-AIT-FAIL, BR-017 | Session 9 |
| 3 | AIT: Match explanation is a fixed template. | AIT FR-008, BR-007 | Session 9 |
| 4 | AIT: Route/distance not evaluated (no Google Maps Distance Matrix). | AIT FR-006, BR-005 | Session 10 |
| 5 | AIT: Date availability not checked against operating hours or On hold/Booked blocks. *(driver to confirm)* | AIT FR-006 | Session 10 |
| 6 | AIT: No database; seed read from CSV; `schema.sql` unused; `DATABASE_URL` unused. | AIT FR-005 | Session 9–10 |
| 7 | AIT: Matching Session / Tour Preference Profile in server memory only. *(driver to confirm)* | AIT BR-016, FR-004 | Session 10 |
| 8 | AIT: Mock login (Agency Account ID only); access check covers Guest vs Tour Agency only. | AIT BR-001, BR-002; AUT F-AUTH-16 | Session 9–10 |
| 10 | AIT: Card has no "View Details" and no Provider name. | AIT FR-008 | Session 10 |
| 11 | AIT: Should-have F-MATCH-10, 13–16 not implemented. | AIT BR-012–015, BR-021, BR-022 | Session 11 |
| 12 | AIT: Docs/test drift (Đường Lâm, "seed max ≤ 20"). | Constitution P1 | Session 9 |
| 13 | AIT: 11 npm vulnerabilities not triaged. | — | Session 9 |

Review report round 2 was posted (or is to be posted) on PR #6. Correction to that report: the
Tight Budget case is **BR-005** (budget is a hard constraint), not BR-011.
