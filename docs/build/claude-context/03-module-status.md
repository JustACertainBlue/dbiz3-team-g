# 03 — Module status board

Keep this file current. Each row: what is verified, by whom, at which commit. Anything older than
the latest commit on that branch must be re-checked (`/team-status`).

| Module | Feature folder | Branch / PR | Owner (driver) | Status | Last verified |
|---|---|---|---|---|---|
| AIT | `specs/001-ait-core` | `001-ait-core` / PR #6 (opened by nguyenthu-0505), merged as `3e0e047` | nguyenthu-0505 | On `main`; runs on the JSON runtime since `ada9e44`. Round 2 defects B1–B4: see below | 29 Oct 2026, `main` `ada9e44` (tests only) |
| BKG | `specs/004-bkg-core` (US-4); `specs/011-bkg-manage` (US-5 + US-3); `specs/012-bkg-list` (US-6); `specs/013-bkg-schedule` (US-1 + US-2) | PR #17 (`343e4ce`), #20 (`5cae545`), #22 (`7057d5c`), #25 (`c3f0c64`), #28 (`fa4d9d2`); spec PRs #18, #19, #21, #24, #26, #27 | linhkhanh-vu | **Code complete on `main`**: US-1..US-6, F-SCHED-01..10; T-lists of all four features done; demos on macOS (build-log Entries 12, 16, 20, 25, 30); checklist §3 BKG rows 5–13 current. **Missing**: Windows G1 for 004/011/012/013; post-merge non-author review of PR #17, #22, #25, #28 (no GitHub review on any; owners: AIT/PRF/EXP for `applyBatch`, PRF for nav links, EXP for the Explore link). Spec #26–#82 on `main` | 30 Oct 2026, `main` `fa4d9d2`: 76 files, 503/503 tests, lint OK |
| AUT | `specs/001-aut-registration` … `specs/010-aut-manage-accounts` (10 folders) | `001-aut-registration`, last `07d60b0` (linh-daotruc, 29 Oct) | linh-daotruc | **Not merged**: 14 commits ahead, 22 behind `main`. `main` uses the demo session instead | 29 Oct 2026, branch inspected, not run |
| PRF | `specs/002-prf-core` | `002-prf-core` / PR #8, squash-merged as `222216d` | nguyenthu-0505 | On `main`; US-1–6. Branch still has 14 commits not on `main` (last `e8e9e5c`, 21 Oct) | 29 Oct 2026, `main` `ada9e44` (tests only) |
| EXP | `specs/001-exp-core` | `001-exp-core`, PR #9; tip `ada9e44` = `main` | JustACertainBlue (Codex) | On `main`; US-1–4 attempted, see `specs/001-exp-core/implementation-status.md` | 29 Oct 2026, `main` `ada9e44` (tests only) |
| ADM | `specs/003-adm-core` | `003-adm-core`, last `cbbb8dd` (thuvutp-prog, 20 Oct) | thuvutp-prog | **Not merged**: 5 ahead, 2 behind. `main` has only a demo Provider review page `/admin/providers` | 29 Oct 2026, branch inspected, not run |
| IAC | none | — | ? | No module; `main` has `src/lib/demo/commercial-handoff-service.ts` + `/messages` only | 29 Oct 2026, `main` `ada9e44` |

Also not merged: `member/spec-consistency` (45 ahead, 4 behind; ERD/spec sync, touches `data/`)
and `ngthu/update-specs` (43 ahead, 1 behind; database specification).

Test run on `main` `ada9e44` after `npm ci`: `Tests  280 passed (280)` (35 files); `npm run lint`
passes. `npm audit`: 15 vulnerabilities (7 moderate, 4 high, 4 critical).

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

Re-verify checklist for round 3 (one session, sequential): Silk → 10 pax → 15 pax (2 cards) →
13 pax (no Bát Tràng) → 200 pax (no-match) → 20,000 VND (no-match); Silk → Vạn Phúc #1; scores
differ; Quote ×2 and Chat ×2 keep their IDs.

Non-blocking: Đường Lâm still in `specs/001-ait-core/quickstart.md:88`, `research.md:35`,
`tests/unit/hard-constraints.test.ts:37`; test comment "seed max ≤ 20" (actual 18 Đào Thục, 16 among
Verified); SQLite in quickstart vs PostgreSQL schema; mock login; card lacks Provider name and View
Details; PR description empty; `npm install` → 11 vulnerabilities (5 moderate, 2 high, 4 critical).

### Draft for `mvp-alpha-checklist.md` §3 (AIT rows)

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
| 9 | AIT: Request Quote / Chat are stubs: not persisted, new ID per click, Chat opens no screen. | AIT FR-011 (Should), BR-018, BR-019, AS-10, AS-11 | Session 10 |
| 10 | AIT: Card has no "View Details" and no Provider name. | AIT FR-008 | Session 10 |
| 11 | AIT: Should-have F-MATCH-10, 13–16 not implemented. | AIT BR-012–015, BR-021, BR-022 | Session 11 |
| 12 | AIT: Docs/test drift (Đường Lâm, "seed max ≤ 20"). | Constitution P1 | Session 9 |
| 13 | AIT: 11 npm vulnerabilities not triaged. | — | Session 9 |

Review report round 2 was posted (or is to be posted) on PR #6. Correction to that report: the
Tight Budget case is **BR-005** (budget is a hard constraint), not BR-011.
