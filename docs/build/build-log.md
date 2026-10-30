# Build Log

Course: DBIZ3 AI-native Product Development, Sessions 8 to 11
Team: `G`    Product: `Hanoi Artisan Bridge`

Save as `docs/build/build-log.md`. Add one entry for every agent run that created or changed a
file in `specs/`, `src/` (or your code folder) or `tests/`. Write it right after the run, not at
the end of the day. The build log is how the instructors, and your teammates, see what the agent
did and what the humans decided.

## 1. Features in progress

| Feature folder | Module | User stories in this slice | Owner | Branch | Status |
|---|---|---|---|---|---|
| `specs/001-exp-core` | EXP | US-1–4; FR-001–017 attempted, with explicit remaining integrations | Group G, human reviewer pending | `001-exp-core` | Local prototype and tested domain logic; not fully complete |
| `specs/001-prf-core` | PRF | US-3 (P1), US-4 (P1), US-5 (P1), US-6 (P1), US-1 (P2), US-2 (P2) | Group G | `002-prf-core` | Complete (Ready for Review) |
| `specs/004-bkg-core` | BKG | US-4 (P1) Create Booking | Group G (linhkhanh-vu) | `004-bkg-core` | Step 6 done (350/350 tests green); Step 7 browser demo path pending |

## 2. Run entries

### Entry 1: 12/10 Group G

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, Gemini 3.8 Flash) |
| Command and argument | `/speckit-plan PRF`, `/speckit-tasks PRF`, `/speckit-analyze` |
| Feature and tasks | `specs/001-prf-core`, plan, data-model, contracts, tasks T001–T060 |
| What the agent produced | `specs/001-prf-core/plan.md`, `specs/001-prf-core/tasks.md`, `specs/001-prf-core/data-model.md`, `specs/001-prf-core/research.md`, `specs/001-prf-core/quickstart.md`, `specs/001-prf-core/contracts/*` |
| Human review | Accepted. Approved tech stack and task ordering ensuring test-first constraint (Principle II). |
| Tests | N/A (specification & planning phase) |
| Spec issues found | none |
| Commit | In progress |

### Entry 2: 13/10 Group G

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, Gemini 3.8 Flash) |
| Command and argument | Step 5 (Tests First) & Step 6 (Code) for Phase 2 (Foundational) and Phase 3 (US-3) |
| Feature and tasks | `specs/001-prf-core`, tasks `T001` to `T018` |
| What the agent produced | `tests/prf/helpers/mockSession.ts`, `tests/prf/helpers/msw-handlers.ts`, `tests/prf/unit/visibility.test.ts`, `tests/prf/seed/prf-seed.test.ts`, `tests/prf/unit/provider-service.test.ts`, `tests/prf/integration/provider-routes.test.ts`, `src/lib/prf/seed-reader.ts`, `src/lib/prf/visibility.ts`, `src/lib/prf/validators.ts`, `src/lib/prf/agency-service.ts`, `src/lib/prf/provider-service.ts`, `src/lib/prf/experience-service.ts`, `src/lib/prf/ai-service.ts`, `src/app/api/prf/provider/[providerId]/route.ts`, `src/app/provider/[providerId]/page.tsx` |
| Human review | Accepted. Verified Step 5 tests failed first, then Step 6 code brought all 74 tests to green. |
| Tests | `74 passed (74)` across 4 test files (`visibility.test.ts`, `prf-seed.test.ts`, `provider-service.test.ts`, `provider-routes.test.ts`) |
| Spec issues found | none |
### Entry 3: 13/10 Group G

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, Gemini 3.8 Flash) |
| Command and argument | Steps 5 & 6 for Phase 4 (US-4: Manage Provider Profile) |
| Feature and tasks | `specs/001-prf-core`, tasks `T019` to `T023` |
| What the agent produced | Extended `tests/prf/unit/provider-service.test.ts`, extended `tests/prf/integration/provider-routes.test.ts`, implemented `updateProviderProfile` in `src/lib/prf/provider-service.ts`, added `PATCH` handler in `src/app/api/prf/provider/[providerId]/route.ts`, created `src/app/provider/[providerId]/edit/page.tsx` |
| Human review | Accepted. Verified T019 and T020 failed first, then T021–T023 passed all 84 tests. |
| Tests | `84 passed (84)` across 4 test files |
| Spec issues found | none |
### Entry 4: 13/10 Group G

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, Gemini 3.8 Flash) |
| Command and argument | Steps 5 & 6 for Phase 5 (US-5: Manage Experiences) |
| Feature and tasks | `specs/001-prf-core`, tasks `T024` to `T034` |
| What the agent produced | Created `tests/prf/unit/experience-service.test.ts`, created `tests/prf/integration/experience-routes.test.ts`, implemented `src/lib/prf/experience-service.ts`, created routes `src/app/api/prf/experience/route.ts` and `src/app/api/prf/experience/[experienceId]/route.ts`, created UI pages in `src/app/provider/[providerId]/experiences/` |
| Human review | Accepted. Verified T024 and T025 failed first, then implementation passed all 103 tests. |
| Tests | `103 passed (103)` across 6 test files |
| Spec issues found | none |
### Entry 5: 13/10 Group G

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, Gemini 3.8 Flash) |
| Command and argument | Steps 5 & 6 for Phase 6 (US-6: Verify Provider Profile) |
| Feature and tasks | `specs/001-prf-core`, tasks `T035` to `T039` |
| What the agent produced | Extended `tests/prf/unit/provider-service.test.ts`, extended `tests/prf/integration/provider-routes.test.ts`, implemented `reviewProvider` in `src/lib/prf/provider-service.ts`, created route `src/app/api/prf/provider/[providerId]/verify/route.ts`, added review panel to `src/app/provider/[providerId]/page.tsx` |
| Human review | Accepted. Verified T035 and T036 failed first, then implementation passed all 112 tests. |
| Tests | `112 passed (112)` across 6 test files |
| Spec issues found | none |
### Entry 6: 13/10 Group G

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, Gemini 3.8 Flash) |
| Command and argument | Steps 5 & 6 for Phase 7 (US-1: Manage Agency Profile) |
| Feature and tasks | `specs/001-prf-core`, tasks `T040` to `T047` |
| What the agent produced | Created `tests/prf/unit/agency-service.test.ts`, created `tests/prf/integration/agency-routes.test.ts`, implemented `src/lib/prf/agency-service.ts`, created routes in `src/app/api/prf/agency/[agencyId]/`, created UI pages in `src/app/agency/[agencyId]/` |
| Human review | Accepted. Verified T040 and T041 failed first, then implementation passed all 122 tests. |
| Tests | `122 passed (122)` across 8 test files |
| Spec issues found | none |
| Commit | In progress |

### Entry 7: 13/10 Group G

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, Gemini 3.8 Flash) |
| Command and argument | Steps 5 & 6 & 7 for Phase 8 (US-2), Phase 9 (AI Refinement), and Phase 10 (Polish & Cross-Cutting) |
| Feature and tasks | `specs/001-prf-core`, tasks `T048` to `T060` |
| What the agent produced | Extended visibility checks in `tests/prf/unit/agency-service.test.ts` & `tests/prf/integration/agency-routes.test.ts`; created AI test files `tests/prf/unit/ai-service.test.ts` & `tests/prf/integration/ai-routes.test.ts`; implemented AI refinement service in `src/lib/prf/ai-service.ts` and route `src/app/api/prf/ai/description/route.ts`; created `src/lib/prf/audit-logger.ts` and integrated audit logging into provider, agency, and experience mutations; added boundary test suite `tests/prf/unit/validators.test.ts`; validated seed integrity with `python data/scripts/validate_seed.py` (47 CSVs load cleanly); completed all quickstart checks. |
| Human review | Accepted. Verified AI tests failed first in Step 5 before implementation. Verified all 154 tests across 11 test files pass. Verified quickstart and seed validation. |
| Tests | `154 passed (154)` across 11 test files (`tests/prf/`) |
| Spec issues found | none |
| Commit | Complete (all 60 tasks implemented & green) |

### Entry 1: 13/10 Codex — prepare, plan, tasks and analyze

| Field | Value |
|---|---|
| Path and agent | Local Codex agent using Session 8 Spec Kit workflow |
| Command and argument | `start_feature.py --spec docs/spec/specs/spec-EXP.md EXP --name core`; plan US-1 P1 only; tasks require tests before code; read-only analyze |
| Feature and tasks | `specs/001-exp-core`, T001–T018 |
| What the agent produced | `spec.md` snapshot, `plan.md`, `research.md`, `data-model.md`, `contracts/explore-api.md`, `quickstart.md`, `tasks.md` |
| Human review | Pending. Plan follows existing TypeScript/Next/Vitest stack and uses the canonical seed read-only. |
| Tests | `start_feature.py --check`: OK; environment check: 0 FAIL, 0 WARN |
| Spec issues found | See section 3: media files missing; later EXP analytics fields need data-model clarification. |
| Commit | Local commit on `001-exp-core`; not pushed |

### Entry 2: 13/10 Codex — US-1 tests first, code and verify

| Field | Value |
|---|---|
| Path and agent | Local Codex agent |
| Command and argument | Setup, US-1 tests first, then catalog/API/UI code; no spec or data edits |
| Feature and tasks | `specs/001-exp-core`, T001–T018 |
| What the agent produced | Next.js scaffold; seeded catalog service and API; Guest/Agency browse UI; minimal detail and Login destinations; unit/integration tests; `.gitignore` build-output rules |
| Human review | Pending. Agency Quote/Chat handoff and full detail remain separate stories. |
| Tests | Red: 2 suites could not import missing code. Green: 7 tests passed, 0 failed; `npm run lint` passed; `npm run build` passed; seed validator passed (47 CSVs); Guest/API/development Agency demo checked in browser. |
| Spec issues found | No P1 entity attribute missing. The seed records image keys but not image binary objects; cards use placeholders. Full §5.1 check identifies later-story persistence gaps below. |
| Commit | Local commit on `001-exp-core`; not pushed |

### Entry 3: 13/10 Codex — extend EXP P1 screens and P2 domain logic

| Field | Value |
|---|---|
| Path and agent | Local Codex agent |
| Command and argument | User requested US-1–4 and FR-001–017; chose automatic System ranking promotion and Auth/Chat integration ports; declined edits to `data/` |
| Feature and tasks | `specs/001-exp-core`; Provider/Experience pages, availability, consented tracking, session ranking, KPI/optimization rules and handoff contracts |
| What the agent produced | `src/app/explore/` and `src/app/api/explore/` flows; `src/lib/explore/` domain services; unit tests; revised quickstart and implementation-status report |
| Human review | Pending. The user decided to keep `data/` unchanged, so FR-006 remains incomplete. |
| Tests | 32 passed, 0 failed; `npm run lint` passed; `npm run build` passed; seed validator passed (47 CSVs). |
| Spec issues found | SC-011 conflicts with BR-015/closed Q23; Nearby has no coordinates; full detail visits and source context lack explicit storage; Auth/Chat and PostgreSQL are not integrated. |
| Commit | Uncommitted local work; not pushed |

### Entry 4: 14/10 Codex — align EXP author-review documents

| Field | Value |
|---|---|
| Path and agent | Local Codex agent |
| Command and argument | User requested document corrections so the author checklist can be assessed against the expanded EXP prototype |
| Feature and tasks | `specs/001-exp-core`, T024–T026; no application or data-model code edited in this run |
| What the agent produced | Aligned plan, research, data mapping, API contract and tasks with US-1–4; corrected spec SC-011; added open questions 28–31; refreshed the generated spec snapshot; updated implementation status and this log |
| Human review | Pending. The original US-1 red-to-green run is in Entry 2. No historical red run was captured for the later extension; documentation cannot create that evidence retroactively. |
| Tests | `start_feature.py --check`: OK; seed validator: PASS 47 CSVs; `npm test`: 7 files and 32 tests passed; `npm run lint`: passed; `npm run build`: passed; `git diff --check`: clean. These are green checks after implementation, not a historical red run for T019–T023. |
| Spec issues found | EXP §10 questions 28–31 now carry the unresolved mappings; `data/` remains unchanged. |
| Commit | Uncommitted local documentation changes; not pushed |

### Entry 5: 14/10 Codex — validate the Active EXP ranking version

| Field | Value |
|---|---|
| Path and agent | Local Codex agent |
| Command and argument | Continue EXP implementation using the Session 8 test-first loop; correct the Active-version invariant and update stale agent instructions. |
| Feature and tasks | `specs/001-exp-core`, T028; `AGENTS.md` describes the stack and commands already in use. |
| What the agent produced | A test rejecting two Active ranking versions; `ExploreRuntime` now requires exactly one Active version; updated `AGENTS.md` and `tasks.md`. No `data/` or source spec change. |
| Human review | Pending. The fix prevents ambiguous baseline ranking; independent review is still required before merge. |
| Tests | Red: 1 failing test because two Active versions were accepted. Green: `npm test` 7 files, 33 tests passed; `npm run lint` passed; `start_feature.py --check` OK; `git diff --check` clean. |
| Spec issues found | None. The error message already claimed exactly one Active version; code now enforces that invariant. |
| Commit | Uncommitted local work on `001-exp-core`; not pushed. |

### Entry 6: 14/10 Codex — capture local EXP detail-visit duration

| Field | Value |
|---|---|
| Path and agent | Local Codex agent |
| Command and argument | Continue EXP implementation with a test-first fix for FR-006/FR-008 page-exit timing; keep `data/` unchanged. |
| Feature and tasks | `specs/001-exp-core`, T029. |
| What the agent produced | `tests/unit/explore-detail-visit.test.ts`, `src/lib/explore/detail-visit.ts`, `src/app/explore/ExploreTracker.tsx`; updated tasks and implementation status. |
| Human review | Pending. Browser navigation/exit delivery still needs independent manual verification. |
| Tests | Red: suite failed because `detail-visit.ts` did not exist. Green: `npm test` 8 files, 35 tests passed; `npm run lint` and `npm run build` passed; `git diff --check` clean. Browser exit delivery still needs manual verification. |
| Spec issues found | Existing EXP §10 question 28 still blocks durable FR-006 mapping; no data or source spec change. |
| Commit | Uncommitted local work on `001-exp-core`; not pushed. |

### Entry 7: 17/10 Codex — integrate EXP with updated main locally

| Field | Value |
|---|---|
| Path and agent | Local Codex agent |
| Command and argument | Merge `origin/main` into `001-exp-core` locally and resolve shared-file conflicts before updating PR #9. |
| Feature and tasks | `specs/001-exp-core`; integration with AIT and PRF. |
| What the agent produced | Kept seed-driven EXP routes, retained the main app frame and AIT/PRF modules, combined dependencies and scoped EXP styles. No `docs/spec/` or `data/` edits. |
| Human review | Pending independent PR review; this local merge does not merge PR #9 into `main`. |
| Tests | `npm test`: 34 files and 276 tests passed; `npm run lint` passed; `npm run build` passed; seed validator passed for 47 CSVs; `python tools/start_feature.py --check` reported OK for EXP. |
| Spec issues found | None newly identified by conflict resolution. Existing EXP integration limits remain in `specs/001-exp-core/implementation-status.md`. |
| Commit | Local merge commit on `001-exp-core`; see PR #9 for the pushed revision. |

### Entry 8: 28/10 Codex — unify the functional prototype on one JSON runtime

| Field | Value |
|---|---|
| Path and agent | Local Codex agent |
| Command and argument | Continue the approved JSON-demo foundation; use one cookie session, API/service layer and repository so modules can later switch to PostgreSQL. |
| Feature and tasks | Cross-module prototype integration for EXP, AIT and PRF; no `docs/spec/` or `data/` edits. |
| What the agent produced | CSV-to-JSON seed/reset commands; shared demo identities and role permissions; persistent Matching sessions; unified Explore → Quote/Chat → Messages; Provider Experience CRUD; Agency/Provider profile persistence and versioning; Admin Provider review; dynamic Village pages; repository-backed audit logs. |
| Human review | Pending independent PR review. Browser verification covered Agency Explore, AIT recommendation, Quote handoff, shared Messages and Agency refresh persistence. |
| Tests | `npm run lint`: passed; `npm test`: 35 files and 280 tests passed; `npm run build`: passed; `uv run tools/start_feature.py --check`: OK; `git diff --check`: clean. |
| Spec issues found | Existing durable FR-006/007 tracking and real external Auth/Chat/PostgreSQL integrations remain future work; no new source-spec change was made silently. |
| Commit | Uncommitted local work on `001-exp-core`; not pushed. |

### Entry 9: 30/10 Claude Code — BKG US-4 Step 5 (tests first)

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5) |
| Command and argument | `/speckit-implement Only the Setup and Foundational phases and the test tasks of the US-4 phase (T001–T017). Do not write any code that makes those tests pass. Run the tests at the end and show me the output.` |
| Feature and tasks | `specs/004-bkg-core`, tasks T001–T006 and T010–T017. T007–T009 (clock, `applyBatch`, write lock) were skipped because they are the code that makes T003–T005 pass. |
| What the agent produced | `tests/integration/bkg-seed.test.ts` (T003), `tests/unit/bkg-repository-batch.test.ts` (T004), `tests/unit/bkg-write-lock.test.ts` (T005), `tests/unit/bkg-operating-hours.test.ts` (T010), `tests/unit/bkg-conflicts.test.ts` (T011), `tests/unit/bkg-create-booking.test.ts` (T012), `tests/unit/bkg-create-eligibility.test.ts` (T013), `tests/unit/bkg-create-validation.test.ts` (T014), `tests/unit/bkg-create-race.test.ts` (T015), `tests/integration/bkg-create-api.test.ts` (T016); empty folder `src/lib/booking/` (T002); tasks marked in `specs/004-bkg-core/tasks.md` |
| Human review | Pending. Test reviewer to check that each test can fail for the right reason. T013 archives Experience `c9f9faf7…` in the fixture instead of using archived `800b5192…`, because that Experience's Provider is not Verified and would be rejected first. |
| Tests | Baseline (T001): `Tests 280 passed (280)`, `--check` OK. T006 red run: 3 files failed — `Cannot find module '@/lib/booking/clock'`, `Cannot find module '@/lib/booking/write-lock'`, `repository.applyBatch is not a function` (2 tests). T017 red run: 7 files failed, all `Cannot find module` (`@/lib/booking/operating-hours`, `conflicts`, `clock`, `@/app/api/bkg/bookings/route`). Full `npm test`: `Test Files 10 failed \| 35 passed (45)`, `Tests 2 failed \| 280 passed (282)`; the 280 existing tests still pass. |
| Spec issues found | none new. `/speckit-analyze` findings (0 CRITICAL; H1 single persist vs "database transaction" in BR-019, H2 Chat pre-fill of FR-003 not covered; M1–M4, L1–L4) are open for the human decision. |
| Commit | `b7d5015` on `004-bkg-core`; not pushed. |

### Entry 10: 30/10 Claude Code — BKG analyze decisions and added tests

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5) |
| Command and argument | Human decisions on `/speckit-analyze` findings H1, H2, M1–M4; tests only, no `src/lib/booking` code |
| Feature and tasks | `specs/004-bkg-core`, tasks T014, T016 (extended), T029, T030 (new); T031 added as the code task for T029 |
| What the agent produced | H1: keep one-persist design, recorded in `plan.md` Complexity Tracking (Clarification #44 to be added at the next spec change). H2: test case for `source_chat_session_id` in `tests/unit/bkg-create-validation.test.ts`; Chat pre-fill deferred to US-5/IAC in `plan.md`. M1: new `tests/unit/bkg-page-access.test.ts` for `canOpenCreateBooking`. M2: two cases in `tests/integration/bkg-create-api.test.ts` (Provider Disabled → 409, unknown Agency → 404). M3: BR-009 named in `plan.md` trace and T012. M4: T008 and T024 require the 280 existing tests to stay green. `tasks.md` updated (T029–T031, dependencies). |
| Human review | Decisions taken by Vũ Khánh Linh (linhkhanh-vu), 2026-10-30. Existing assertions unchanged; only new cases and one new file. |
| Tests | T030 red run (`npm test`): `Test Files 11 failed \| 35 passed (46)`, `Tests 2 failed \| 280 passed (282)`. New failures: `Cannot find module '@/lib/booking/create-booking'` (bkg-page-access), and the extended files still fail on `Cannot find module` (`@/lib/booking/clock`, `@/app/api/bkg/bookings/route`); `applyBatch is not a function` unchanged. The 280 existing tests pass. |
| Spec issues found | H1 → Clarification #44 "BR-019 is met by a single atomic persist on the JSON runtime until PostgreSQL" to be added to `docs/spec/specs/spec-BKG.md` at the next spec change. MEDIUM/LOW L1–L4 recorded here: L1 empty folder from T002; L2 BR-006/015/016 trivially met; L3 SC-003 checked indirectly until US-1; L4 `notice_period` vs `notice_period_hours` naming. |
| Commit | See `git log` (message "test(BKG): add tests from analyze findings (H2, M1, M2); record H1, M3, M4"); not pushed. |

### Entry 11: 30/10 Claude Code — BKG US-4 Step 6 (code) and T025

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5) |
| Command and argument | `/speckit-implement Only the code tasks T007–T009, T018–T023 and T031, then T024. Do not change any test. If a test seems wrong, stop and tell me which and why. Run the full npm test at the end and show me the last lines. Mark finished tasks [X] in tasks.md. Do not commit.`; then T025 |
| Feature and tasks | `specs/004-bkg-core`, tasks T007–T009, T018–T025, T031 |
| What the agent produced | `src/lib/booking/{clock,write-lock,operating-hours,conflicts,create-booking}.ts`; `applyBatch` added to `src/lib/demo/json-repository.ts` and `BatchInsert` to `src/lib/demo/types.ts` (existing methods unchanged); `src/app/api/bkg/bookings/route.ts`; BKG134 at `src/app/provider/[providerId]/bookings/new/{page,CreateBookingForm}.tsx`; "+ CREATE BOOKING" link in `src/app/provider/[providerId]/page.tsx`; lock comment and race-test follow-up (commit `6dc3999`) |
| Human review | Pending PR review. Agreed deviations: the Provider page link is visible to every viewer like the existing Edit button (access is enforced on BKG134 by `canOpenCreateBooking`); T015 does not prove the lock (§4 row "10 (BKG)"). |
| Tests | `npm test`: `Test Files 46 passed (46)`, `Tests 350 passed (350)` (280 existing + 70 BKG); no test file changed since `4b715f9`. One `npm run lint` error (`DemoRow` not assignable to `OperatingHoursRow`) fixed in code on the first retry. T025: `npm run lint` passed; `validate_seed.py` PASS (47 CSVs); `start_feature.py --check` OK; `tsconfig.tsbuildinfo` restored, not committed. |
| Spec issues found | none new |
| Commit | `6cd4665` (code), `6dc3999` (race-test note); not pushed. Browser demo path (T026) not yet verified. |

### Entry 12: 30/10 Claude Code + human — BKG US-4 demo path (T026, macOS)

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5) with the human clicking; Claude Code's built-in browser for step 8 |
| Command and argument | `npm run demo:reset`, `npm run dev` (served on `localhost:3001`), then `specs/004-bkg-core/quickstart.md` §4 |
| Feature and tasks | `specs/004-bkg-core`, T026 |
| What the agent produced | No code change. Results: (3) BKG134 shows Experience "Nặn gốm thủ công", capacity 12, conditions prefilled `24` / `{"before_hours":24,"refund_percent":80}`; (4) Mon 2026-11-02 09:00, 60 min, 10 pax → On hold, created 2026-10-30T10:47:08+07:00, hold until 2026-11-02T10:47:08+07:00 (72 h), `POST /api/bkg/bookings 201`; (5) same values again → `SLOT_UNAVAILABLE` overlap, `409`; (6) 16:30 + 60 min → `SLOT_UNAVAILABLE` outside operating hours, `409`; (7) group size 13 → blocked by the browser (`max=12`), no request sent; (8) Tour Agency on `/provider/50f2c8fc…/bookings/new` → "Chỉ Local Provider sở hữu hồ sơ này mới tạo được Booking.", and `POST /api/bkg/bookings` as Agency → `403 FORBIDDEN`; (9) HTTP codes read from the dev-server log. |
| Human review | Steps 3–7 screenshots from the human; step 8 and the Agency API call run by the agent in the built-in browser. |
| Tests | Not rerun (no code change since Entry 11). |
| Spec issues found | none. Non-blocking UI finding: at step 7 the red error from step 6 stays on screen while the browser shows its own `max=12` tooltip, so the visible message is stale; the server-side 400 for group size is covered by T016 only. Two dev servers ran at once (3000 and 3001) on one `runtime.json` — the multi-process limitation; demo used 3001 only. |
| Commit | Not committed. Windows run of the same path still pending (G1). Follow-up fixes in `src/app/provider/[providerId]/bookings/new/CreateBookingForm.tsx`, verified in the built-in browser: (1) any field change clears the previous error; (2) agreed-price input used `step={1000}` with `min={1}`, so the browser accepted only 1, 1001, …, 2000001 and rejected round prices such as 2,000,000 VND — now `step="any"`. After the fixes: 2,000,000 at 16:30 → `SLOT_UNAVAILABLE`, then changing group size removes the message. `npm test` 350/350, `npm run lint` passed. |

### Entry 13: 30/10 Claude Code — BKG 011 plan, tasks and analyze

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5) |
| Command and argument | `/speckit-plan` (US-5 + US-3 argument approved by the human), `/speckit-tasks` (two independent phases, race test first), `/speckit-analyze` |
| Feature and tasks | `specs/011-bkg-manage`, T001–T046 |
| What the agent produced | `spec.md` snapshot, `plan.md`, `research.md`, `data-model.md`, `contracts/manage-booking-api.md`, `quickstart.md`, `demo/*.json`, `tasks.md`; spec decisions #26, #27, #44–#56 merged via PR #18 and #19 |
| Human review | 8-point plan review 8/8 Yes after `--refresh`; Step 3 check 4/4 Yes. Analyze: 0 CRITICAL; H1 (non-re-entrant lock: expiry inside the lock must use `expireDueHoldsLocked`) and M1–M6 applied to tasks/research/contract/quickstart on 2026-10-30 (M2 adds a create-over-expired-hold test). Recorded only: **M7** screens T037–T041 have no automated test, SC-007 "button itself disabled" checked in the demo (T044), gate and button logic tested by T028/T030; **L1** "sync succeeds for Provider but fails for Agency" cannot happen with one persist per event; **L2** a Booking that expires while BKG135 is open is caught by expiry-first, the screen only shows the error; **L3** FR-007 says "LP/Agency contact" for both, §5.1 splits it into `agency_contact` (LP) and `provider_profile_link` (Agency) — plan follows §5.1; **L4** BR-016 (arrival completes the whole Booking) covered implicitly by T012; **L5** T008 is code inside Step 5 because it is the race-test seam. |
| Tests | n/a (planning) |
| Spec issues found | `src/lib/demo/commercial-handoff-service.ts` writes `message_kind` values not allowed by `data/schema.sql` — recorded in research R8, owner AIT/IAC |
| Commit | `4f02e70` (plan), `6a60d5b` (tasks), analyze fixes in the next commit |

### Entry 14: 30/10 Claude Code — BKG 011 Step 5 (tests first, US-5)

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5) |
| Command and argument | `/speckit-implement Only T001–T004, T007–T009, T010–T017. Code allowed only for T008 (afterConflictCheck hook). Do not write code that makes T010–T016 pass.` |
| Feature and tasks | `specs/011-bkg-manage`, T001–T004, T007–T017 (T005/T006 Foundational code not run) |
| What the agent produced | Tests: `tests/unit/bkg-repository-batch-update.test.ts` (T002), `bkg-booking-access.test.ts` (T003), `bkg-race-pause.test.ts` (T007), `bkg-update-booking.test.ts` (T010), `bkg-change-status.test.ts` (T011), `bkg-mark-arrival.test.ts` (T012), `bkg-expire-holds.test.ts` (T013, incl. H1 no-deadlock and M2 create-over-expired-hold), `bkg-agency-sync.test.ts` (T014, incl. M6), `bkg-manage-access.test.ts` (T015), `tests/integration/bkg-manage-api.test.ts` (T016). Code (T008 only): test-only `afterConflictCheck` option in `src/lib/booking/create-booking.ts`; the lock callback is now `async` and awaits it between `findConflict` and `applyBatch`. |
| Human review | Pending. |
| Tests | Baseline (T001): `Tests 350 passed (350)`, lint passed, `--check` OK. T004: `booking-access` module missing; `applyBatch` ignores updates (2 of 3 T002 cases fail). **T009 mutation**: lock removed → `createBooking: two creates on one interval commit exactly one` FAILS ("expected … to have a length of 1 but got 2"); lock restored → passes. T017: all 8 US-5 files fail on `Cannot find module` (`update-booking`, `change-status`, `mark-arrival`, `[bookingId]/route`); race case (b) fails on missing `update-booking`. Full `npm test`: `Test Files 10 failed \| 46 passed (56)`, `Tests 3 failed \| 352 passed (355)` in 11.3 s, no hang — 350 existing + the race (a) case + the T002 "persist fails" case (passes trivially because updates are not applied yet). `npm run lint` fails only in the new test files (missing modules, `applyBatch` update shape); `src/` compiles. |
| Spec issues found | none |
| Commit | see `git log` ("test(BKG): failing tests for US-5 (+ race seam T008)"); not pushed. |

## 3. Spec issues found while building

Every gap the build uncovers goes back to `docs/spec/` as an open question or a spec change. It
is never fixed silently in code.

| # | Found at (step, entry) | Issue | Where it went in the spec | Status |
|---|---|---|---|---|
| | | | | |
| 1 | Prepare / Entry 1 | FR-006 detail visit fields (`entered_at`, `exited_at`, `scroll_depth_pct`, `sections_viewed`, `next_action`, `time_to_next_action`, `detail_visit_log_id`) have no explicit logical entity/columns in `data/`; FR-007 `source_context` is also not explicit. | Source EXP spec §10 questions 28–29; data owner must decide durable mapping. | Open; blocks full FR-006/007 |
| 2 | Prepare / Entry 1 | FR-003 optional `included_items`/`excluded_items` have no explicit Experience columns, and stored image binaries are absent though media metadata exists. | Source EXP spec §10 question 31 covers the content source; binary media remains a documented implementation dependency. | Open; optional content and media unavailable |
| 3 | Analyze / Entry 2 | US-1 AC2 says Agency actions are available, but the Quote/Chat handoff belongs to F-EXPLORE-11/12 and is not built in this slice. | Documented in `specs/001-exp-core/plan.md`; UI says unavailable and does not present a broken Agency button. | Open; blocks claiming complete US-1 acceptance |
| 4 | Install / Entry 2 | The package versions match the existing AIT stack but `npm audit` reports 9 dependency advisories, including 3 critical. | No source spec change; upgrade the shared stack with the other module branches before external deployment. | Open; prototype only |
| 5 | Entry 3 | SC-011 described HDT_Admin activation, contradicting BR-015 and closed question 23, which specify automatic System promotion. | Source EXP spec SC-011 corrected in Entry 4 and snapshot refreshed. | Closed document inconsistency; runtime worker still open |
| 6 | Entry 3 | Nearby relation requires 20 km but `data/` has no village coordinates. | Source EXP spec §10 question 30; same-Provider and same-type relations run locally. | Open data decision |
| 7 | Entry 3 | A complete EXP delivery needs durable PostgreSQL storage, Auth/Chat adapters and a weekly worker, absent from this branch. | Tracked in `specs/001-exp-core/implementation-status.md`. | Open integration work |

## 4. Agent mistakes worth remembering

Short notes for the team and for Session 10 (debugging and code review): what the agent got
wrong, how you noticed, and what you changed in the prompt, `AGENTS.md` or the constitution so it
does not happen again.

| Entry | What went wrong | How it was caught | Prevention |
|---|---|---|---|
| 2 | EXP / local preview | Running `npm run build` while `npm run dev` used the same `.next` directory invalidated a development server chunk and made `/explore` return HTTP 500. | `next.config.mjs` now separates development output (`.next-dev`) from production output (`.next`); verified a production build while dev served `/explore` successfully. |
| 2 | Relative import in unit tests used `../../helpers` instead of `../helpers` | Vitest reported module resolution error on run | Always check relative folder depth when importing local test helpers |
| 2 | Direct read of `provider.business_name` from `provider_profiles.csv` instead of versioned `provider_profile_versions.csv` | Provider name assertion failed in `provider-service.test.ts` | Always join `provider_profile_versions` per Session 5 data model |
| 10 (BKG) | The AC-BKG-RACE test (T015, `tests/unit/bkg-create-race.test.ts`) passes even with `withBookingWriteLock` removed: check (`findConflict`) and write (`applyBatch` → synchronous `persist`) run in one synchronous block, so no request can interleave in one Node process. AC-BKG-RACE currently holds because of that synchronous critical section; the lock itself is tested on its own by T005 (`tests/unit/bkg-write-lock.test.ts`). | Mutation check on 2026-10-30: lock removed temporarily, T015 still passed, file restored. | Comment above the lock in `src/lib/booking/create-booking.ts`. Before adding any `await` between check and write, add a test-only `afterConflictCheck` async pause option to `createBooking` and a new T015 case that fires two creates with the pause: it must fail without the lock and pass with it (plan.md Complexity Tracking, US-5). |
