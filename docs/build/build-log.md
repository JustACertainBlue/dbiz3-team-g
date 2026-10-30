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

### Entry 15: 30/10 Claude Code — BKG 011 Step 6 (code, US-5)

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5) |
| Command and argument | `/speckit-implement Only T005, T006, T018–T026, then T027. Do not change any test. If a test seems wrong, stop and tell me.` plus two mutation checks |
| Feature and tasks | `specs/011-bkg-manage`, T005, T006, T018–T027 |
| What the agent produced | `applyBatch` now takes inserts and single-row updates with one persist (`src/lib/demo/json-repository.ts`, `src/lib/demo/types.ts`; shared file, existing methods unchanged); `src/lib/booking/{booking-access,agency-sync,expire-holds,update-booking,change-status,mark-arrival}.ts`; `createBooking` runs `expireDueHoldsLocked` first and sends the create message (closes 004 limitation #7); `findConflict` gains `excludeBookingId`; `hanoiTimestamp` moved to `clock.ts`; routes `PATCH /api/bkg/bookings/[bookingId]`, `POST …/status`, `POST …/arrival` with `startExpiryTimer()` (no-op under tests). |
| Human review | Pending PR review; AIT/PRF/EXP owners to review `json-repository.ts`. |
| Tests | `npm test`: `Test Files 56 passed (56)`, `Tests 406 passed (406)`; `npm run lint` passed; no test file changed since `ca456ae`. **Mutation 1 (after T005)**: `applyBatch` changed to update memory before persist → T002 "keeps neither the insert nor the update when the persist fails" FAILS (`expected 'Cancelled' to be 'Booked'`); restored → passes. **Mutation 2 (T022)**: lock removed in `update-booking.ts` → race (b) FAILS ("length of 1 but got 2"); restored → passes. |
| Spec issues found | none |
| Commit | `61f2ce4`; not pushed. US-5 API demo (quickstart §4) not yet run. |

### Entry 16: 30/10 Claude Code + human — BKG 011 US-5 API demo (quickstart §4, macOS)

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5); the human ran `demo:reset` and one `npm run dev`, the agent ran the curl steps and read `/messages` in the built-in browser |
| Command and argument | `npm run demo:reset` (47 tables), `npm run dev` (one server, `localhost:3000`, started after the reset), then `specs/011-bkg-manage/quickstart.md` §4 steps 1–15 |
| Feature and tasks | `specs/011-bkg-manage`, US-5 demo path (part of T043/T044 evidence) |
| What the agent produced | No code change. Results: (1) create → `201`, `40da0dca…`, On hold, hold until 2026-11-02T12:46:43+07:00 (72 h); (3) group size 11 → `200`, `audit_log_id` and `agency_notification_message_id` set; (4) same update → `200`, both `null`, `updated_at` unchanged; (5) 16:30 → `409 SLOT_UNAVAILABLE` "outside the Provider operating hours"; (6) confirm → `200` On hold → Booked; (7) arrival before start → `200`, `transition_applied` `false`, `Tour Start Time Not Reached`; (8) arrival on seed `4bf17b30…` → `200`, `true`, Completed, `availability_released` `true`; (9) second create → `201`, `ea1d553c…`; (11) cancel without reason → `400 VALIDATION_ERROR`; (12) cancel with reason → `200` Cancelled, reason "Group postponed"; (13) update the cancelled Booking → `409 BOOKING_TERMINAL`; (14) cancel as Agency → `403 FORBIDDEN`; (15) `/messages` as Tràng An: exactly 5 Booking Update messages in the Chat with Bát Tràng (steps 1, 3, 6, 9, 12). `chat_messages` in `runtime.json` since the demo start: 7 Booking Update messages — 5 for Agency `02e568d8`, step 8 Completed in the Chat of Agency `ebf4fcfa`, seed expiry `54d7a276…` Cancelled in the Chat of Agency `14390b41`; steps 4, 5, 7, 11, 13, 14 wrote none. 15/15 match the quickstart. |
| Human review | The human started the server; results read back by the agent. |
| Tests | Not rerun (no code change since Entry 15; 406/406 before the demo). |
| Spec issues found | none. Finding: `updated_booking` in steps 3–4 returns numeric fields as strings (`"group_size":"11"`, `"duration_minutes":"60"`, `"agreed_price_total":"2000000.00"`), because the JSON runtime is loaded from CSV — checked against §5.1 in the next entry. |
| Commit | see `git log` ("docs(BKG): US-5 API demo on macOS"); not pushed. Windows run (G1) still pending. |

### Entry 17: 30/10 Claude Code — BKG numeric fields check (CSV strings)

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5) |
| Command and argument | Human prompt: read-only review of every comparison/calculation on `group_size`, `max_participants`, `duration_minutes`, `agreed_price_total`, `notice_period_hours`, `unread_count` in `src/lib/booking/`, then a test first |
| Feature and tasks | `specs/011-bkg-manage`, #7 / §5.1 FR-003 (no task id; guard test) |
| What the agent produced | Review: all reads are wrapped in `Number()` before comparing or computing (`create-booking.ts:90,163`, `update-booking.ts:69–72,81,85–87`, `agency-sync.ts:63`, also `operating-hours.ts:38` weekday); inputs pass `isPositiveInteger`; stored values stay strings by design (`data-model.md`). New test `tests/unit/bkg-numeric-fields.test.ts`: Experience `max_participants` = `"13"` (string, as from CSV) → create and update accept group size 9 and reject 14. No code change. |
| Human review | Pending PR review. |
| Tests | Checked, green: new file 2/2 pass. **Mutation**: string comparison at `create-booking.ts:163` and `update-booking.ts:81` → both cases FAIL (`promise rejected "group_size exceeds max_part…" instead of resolving`, because `"9" > "13"`); restored → pass. Full `npm test`: 57 files, 408/408; `npm run lint` passed. |
| Spec issues found | §5.1 FR-004 defines `updated_booking` only as "Object; Required" (no fields, no types); it currently returns the raw row with string values and DB names. Raised as spec-BKG #57; decided (ii) by the human: same shape as F-SCHED-07 output, one serializer with GET detail. FR-003 create output has no numeric fields, so nothing to test there. |
| Commit | see `git log` ("test(BKG): guard numeric comparisons against CSV strings"); not pushed. |

### Entry 18: 30/10 Claude Code — BKG 011 #57 follow-up and Step 5 (tests first, US-3)

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5) |
| Command and argument | Human merged `origin/main` (PR #21, spec #57) into `011-bkg-manage`; `start_feature.py --refresh`, `--check` OK; then `/speckit-implement Only T028–T032 (US-3 tests). Write tests only; no code that makes them pass.` |
| Feature and tasks | `specs/011-bkg-manage`, T028–T032; #57 edits to T026, T029, T031, T034 |
| What the agent produced | Docs (commit `64b6cba`): spec snapshot refreshed with #57; `contracts/manage-booking-api.md` — GET fields typed as numbers, PATCH `updated_booking` = Provider view of the GET body from the same serializer, also for #52; `tasks.md` — #57 cases added to T029 and T031, T034 builds one serializer `toBookingDetail` used by `getBookingDetail` and `updateBooking`, note on T026. Tests: `tests/unit/bkg-booking-actions.test.ts` (T028, FR-007 matrix incl. `now == start_at`, Agency always none), `tests/unit/bkg-booking-detail.test.ts` (T029, Provider/Agency views, numbers, `hold_expires_at` only On hold, FORBIDDEN/NOT_FOUND, expiry first but a denied read writes nothing, #57 incl. #52), `tests/unit/bkg-detail-page-access.test.ts` (T030), `tests/integration/bkg-booking-detail-api.test.ts` (T031, GET 200/403/404, #57 PATCH body = next GET body). No code. |
| Human review | Pending. |
| Tests | T032 red run (4 files): `Test Files 4 failed (4)`, `Tests 8 failed (8)`. Reasons: `Cannot find module '@/lib/booking/booking-actions'` and `'@/lib/booking/booking-detail'` (T028, T029 suites); `canManageBooking is not a function` / `canViewAgencyBooking is not a function` (T030, 4 cases); `routes[method] is not a function` (T031, no `GET` export, 3 cases); #57 case: `AssertionError: expected 'string' to be 'number'` (PATCH `updated_booking.group_size` is still the stored string). Full `npm test`: `Test Files 4 failed \| 57 passed (61)`, `Tests 8 failed \| 408 passed (416)` — every existing test still green. `npm run lint` fails only in the 4 new files (TS2307 missing modules, TS2305 missing exports). |
| Spec issues found | none. Note: FR-007 has no `duration`, so after #57 `updated_booking` no longer carries the duration; `end_at` reflects it. |
| Commit | see `git log` ("test(BKG): failing tests for US-3 (T028-T032)"); not pushed. |

### Entry 19: 30/10 Claude Code — BKG 011 Step 6 (code, US-3)

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5) |
| Command and argument | `/speckit-implement Only T033–T042. Do not change any test. If a test seems wrong, stop and tell me.` Human note: BKG144 prefills duration from `end_at − start_at` (#57). |
| Feature and tasks | `specs/011-bkg-manage`, T033–T042 |
| What the agent produced | `src/lib/booking/booking-actions.ts` (T033, FR-007 matrix); `src/lib/booking/booking-detail.ts` (T034: `toBookingDetail(row, view, now)` = the one string→number conversion, `getBookingDetail` authorizes first, then `expireDueHolds`, then re-reads); `updateBooking` now returns `updated_booking` through `toBookingDetail(…, 'provider', now)` in both branches (#57, #52); `canManageBooking` / `canViewAgencyBooking` in `booking-access.ts` (T035); `GET` in `src/app/api/bkg/bookings/[bookingId]/route.ts` (T036); screens BKG135 `…/bookings/[bookingId]/page.tsx` + `BookingActionsBar.tsx` (disabled buttons stay visible, Cancel asks for a reason), BKG144 `edit/page.tsx` + `EditBookingForm.tsx` (sends only changed fields, duration from `end_at − start_at`, status select without Completed, "keep status" default), BKG136 `arrival/page.tsx` + `ConfirmArrival.tsx` (shows `validation_error`), BKG138 `src/app/agency/[agencyId]/bookings/[bookingId]/page.tsx` (read-only, Chat, Back → `/explore`), shared `BookingDetailView.tsx` and `load-provider-booking.ts` (T037–T040); BKG134 navigates to BKG135 after create (T041, #54). |
| Human review | Pending. |
| Tests | `npm test`: `Test Files 61 passed (61)`, `Tests 427 passed (427)` (408 + 19 US-3 cases); `npm run lint` passed; `git diff --stat 3c143fd -- tests/` empty. Smoke run on the running dev server (not the quickstart §5 demo): BKG135/144/136 as `provider` and BKG138 as `agency` → 200 with the right screen id; Guest on BKG135 and Tràng An on `4bf17b30…` → access-denied text; `GET /api/bkg/bookings/40da0dca…` → numbers (`group_size` 11, `agreed_price` 2000000). |
| Spec issues found | none. Choices to review: BKG144 `target_status` is optional ("keep status") although the screen spec marks it Required, because an update without a status change is a valid F-SCHED-04 call and Booked → Booked is `INVALID_TRANSITION`; BKG138 Back goes to `/explore` because BKG137 does not exist yet; the Provider page has no link to BKG135 yet (#54 allows URL and BKG134). |
| Human decisions (review) | Approved the 3 choices. BKG144 keeps two calls (PATCH, then `POST /status`, BR-007); a failing `/status` after a successful PATCH now says "Chi tiết đã lưu, trạng thái chưa đổi (vẫn {status})" + the error, never a general success — verified in the built-in browser on `40da0dca…` (group size 12 + Cancelled with a blank reason → that message; `GET` shows `group_size` 12, status Booked). Spec **#58** to add at the next spec-BKG edit: "BKG144 target_status is optional (default: keep current) so details can be edited without a status change; screen spec says Required" (Decided by Vũ Khánh Linh, 2026-10-30). |
| Draft for checklist §3 (T046, show before writing) | Known limitation: BKG138 Back goes to `/explore` (BKG137 Agency Booking list not built), spec BKG138 §5 row 2 → planned with BKG137 (story and session to be set by the human). Known limitation: no link from the Provider page to BKG135; reachable by URL, after create on BKG134, or from the Booking Update message (#54) → planned with BKG133 Provider Booking list (story and session to be set by the human). |
| Commit | see `git log` ("feat(BKG): US-3 View Bookings (T033-T042)"); not pushed. |

### Entry 20: 30/10 Claude Code — BKG 011 US-3 screen demo (quickstart §5, macOS)

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5); the human ran `npm run demo:reset` and one `npm run dev` (started 4 s after the reset); the agent clicked through in the built-in browser at the human's request |
| Command and argument | `specs/011-bkg-manage/quickstart.md` §5 steps 1–8 on `localhost:3000`, at `2ed1c1c` |
| Feature and tasks | `specs/011-bkg-manage`, US-3 demo path (T044 screens part) |
| What the agent produced | No code change. (1) BKG134 (Tràng An, 2026-11-09 09:00, 60 min, 10 pax, 2,000,000) → opens BKG135 `91fbe7ff…`: On hold, hold until 2026-11-02 13:22, agency contact shown; Confirm/Book, Update, Cancel enabled, Mark Group Arrival visible and **disabled**. (2) Update → BKG144 prefilled (duration 60 from `end_at − start_at`, status "Giữ nguyên (On hold)"); group size 11, keep status, Save → BKG135 shows 11, still On hold, hold expiry unchanged (`PATCH 200`, no `/status` call). (3) Confirm/Book → Booked, no hold line; Confirm/Book disabled, Update/Cancel enabled, **Mark Group Arrival visible but disabled** (start 2026-11-09 not reached). (4) Second Booking `3d48179a…` (11:00, 8 pax) → Cancel shows "Lý do hủy (bắt buộc)"; "Xác nhận hủy" disabled when empty and when only spaces; "Group postponed" → Cancelled, all four buttons disabled. (5) Seed `4bf17b30…` (Hồng Hà, 2026-10-05) → Mark Group Arrival enabled → BKG136 → Confirm Group Arrival → back on BKG135, Completed, all buttons disabled. (6) Tour Agency (Tràng An) on BKG138 `/agency/02e568d8…/bookings/91fbe7ff…`: read-only, 11 pax, Booked, "Xem hồ sơ Provider" link (route works), **no button in the page**, only links Chat and Back. (7) Same Agency on BKG135, BKG144 and BKG136 URLs of `91fbe7ff…` → access-denied text, no Booking data. (8) Tràng An on BKG138 of `4bf17b30…` → "Chỉ Tour Agency của Booking này mới xem được trang này."; UBND, HDT, Guest on BKG135 → denied, no price in the HTML. §5 step 8 API: `GET` as `agency` → `HTTP 200`, all actions false, `provider_profile_link`, numbers. Dev-server log: every request 200/201, no error. |
| Human review | Requested the agent to run it; results reported in chat. |
| Tests | Not rerun (no code change since `2ed1c1c`, 427/427). |
| Spec issues found | none. Observation: denied pages answer HTTP 200 with a denial message (like BKG134 in 004), not 403; the data is not rendered. Windows run (G1) still pending. |
| Commit | Not committed yet. |

### Entry 21: 30/10 Claude Code — BKG 011 polish (T043–T046)

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5) |
| Command and argument | Human prompt: T043–T046, commit each step |
| Feature and tasks | `specs/011-bkg-manage`, T043–T046 |
| What the agent produced | T043: `npm run lint` passed (`tsconfig.tsbuildinfo` reverted), `python data/scripts/validate_seed.py` → `PASS: 47 CSVs/load headers; …`, `start_feature.py --check` → OK. T044: quickstart §4 (Entry 16, 15/15) and §5 (Entry 20, 9/9) on macOS; Windows still open. T045: this entry, §3 rows 8–9, §4 lesson for Entries 16–17; mutation results stay in Entries 14–15 (T009 create race, T022 update race, `applyBatch` persist-first). T046: `docs/build/mvp-alpha-checklist.md` §3 — #6 updated (race test now proves the lock), #7 F-SCHED-08 part closed (pre-fill still open), #8 updated (lazy + 60 s timer, #50), new #10 (denied pages answer 200 + message), #11 (BKG138 Back → `/explore`), #12 (no Provider-page link to BKG135). |
| Human review | Checklist rows requested by the human in the prompt. |
| Tests | No code change; last full run 427/427 at `2ed1c1c`. |
| Spec issues found | none new. |
| Commit | checklist `dd0e093`; this entry with T043–T046 marks in the next commit; not pushed. |

### Entry 22: 30/10 Claude Code — BKG 012 plan, tasks and analyze (US-6)

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5) |
| Command and argument | `start_feature.py --spec docs/spec/specs/spec-BKG.md BKG --name list` (gave `012-bkg-list`, no rename), `--use`, `--check` OK; `/speckit-plan` (US-6 + minimal DSH018 argument approved by the human), `/speckit-tasks` (test before code for every trace row), `/speckit-analyze` |
| Feature and tasks | `specs/012-bkg-list`, T001–T029 |
| What the agent produced | `spec.md` snapshot (with #58–#67, PR #24), `plan.md`, `research.md`, `data-model.md`, `contracts/list-bookings-api.md`, `quickstart.md`, `tasks.md` |
| Human review | Plan review 8/8 Yes (one fix before commit: order authorize → validate → expire → read, so a non-owner always gets 403). Step 3 check 4/4. Analyze: **C1** AS-4 had only a demo check → pure helper `bookingListRowView` + test (also **M1**, SC-011 label); **H1** fixtures created at `SEED_NOW` would expire before a later `now` → every hold fixture uses the checking `now`, T013 uses 21 holds on 3 Mondays; **H2** the UI default `date_from` = today hides past Booked Bookings needing arrival → human chose (a): BKG133 always shows "N Booking cần xử lý nằm ngoài bộ lọc" + "Xem tất cả" from the tested `countActionsOutsideFilter`; **M3** Completed/Cancelled fixtures through `markArrival` / `changeStatus`; **L1** API create on Monday 2027-01-04. Recorded only: **M2** #66 links and the denied BKG133/DSH018 pages have no automated test, checked in the demo (T027); **M4** `providerBookingSummary` runs `expireDueHolds` once per page — idempotent (#46), accepted at seed size; **L2** BKG133/DSH018 reuse the gate named `canOpenCreateBooking` (owning Provider on its own URL), not renamed because 004 uses it; **L3** BKG133 imports `bookingDetailStyles` from the BKG135 folder, accepted until a third screen needs it. |
| Tests | n/a (planning) |
| Spec issues found | none (all gaps were closed as #58–#67 before planning) |
| Commit | `f63502f` (plan), `6769dd7` (tasks), analyze fixes in the next commit |

### Entry 23: 30/10 Claude Code — BKG 012 Step 5 (tests first, US-6)

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5) |
| Command and argument | `/speckit-implement Step 5 only: T001–T004 and T007–T017 (tests and their red runs). Code only for T005/T006 after their red run (T004). Do not write code that makes T007–T016 pass.` |
| Feature and tasks | `specs/012-bkg-list`, T001–T017 |
| What the agent produced | Tests: `tests/unit/bkg-hanoi-date.test.ts` (T002), `bkg-list-access.test.ts` (T003), `bkg-list-bookings.test.ts` (T007–T012, incl. "a denied list request writes nothing" with a deep snapshot of bookings, history and chat tables), `bkg-list-summary.test.ts` (T013–T014), `bkg-list-row-view.test.ts` (T015), `tests/integration/bkg-list-api.test.ts` (T016). Code (T005, T006 only, after T004): `hanoiDate` in `src/lib/booking/clock.ts`, `authorizeProviderList` in `src/lib/booking/booking-access.ts`. |
| Human review | Pending. |
| Tests | T001 baseline: `Tests 427 passed (427)`. T004: 4 failed — `hanoiDate is not a function`, `authorizeProviderList is not a function`; after T005/T006 → 4 passed. T017: `Test Files 4 failed (4)` — `Cannot find module '@/lib/booking/list-bookings'` (T007–T014 suites), `Cannot find module '@/lib/booking/list-row-view'` (T015), `routes.GET is not a function` (4 T016 cases); the T016 "POST create is unchanged (201)" case passes as intended. Full `npm test`: `Test Files 4 failed \| 63 passed (67)`, `Tests 4 failed \| 432 passed (436)` — 427 existing + 4 Foundational + 1 POST case. `npm run lint` fails only in the new test files (TS2307 missing modules; TS2339 that follow from the missing module types). One test-helper type (`rowOf`) was made generic before this commit so lint can pass once the module exists — not a behaviour change. Mutation check of the authorize/expire order is done in Step 6, when the service exists. |
| Spec issues found | none |
| Commit | see `git log` ("test(BKG): failing tests for US-6"); not pushed. |

### Entry 24: 30/10 Claude Code — BKG 012 Step 6 (code, US-6)

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5) |
| Command and argument | `/speckit-implement Step 6 only: T018–T025. Do not change any test. If a test seems wrong, stop and tell me.` plus one mutation check |
| Feature and tasks | `specs/012-bkg-list`, T018–T025 |
| What the agent produced | `src/lib/booking/list-bookings.ts` (`listProviderBookings`: authorize → validate → `expireDueHolds` → read; filters on `hanoiDate(start_at)`, sort #60, counts #61, paging #63, `requires_action` via `bookingActions` #59, `Number()` for `group_size`; `providerBookingSummary` and `countActionsOutsideFilter` walk pages of 100); `src/lib/booking/list-row-view.ts` (`bookingListRowView`); `GET` in `src/app/api/bkg/bookings/route.ts` (POST unchanged); BKG133 `src/app/provider/[providerId]/bookings/page.tsx` (filters as page query, default `date_from` = today, "Xoá bộ lọc", always "N Booking cần xử lý nằm ngoài bộ lọc" + "Xem tất cả", "⚑ Cần xử lý" text label, Detail, Create, Messages, empty state, paging); DSH018 `src/app/provider/[providerId]/dashboard/page.tsx` (summary only); Provider pages' Bookings links → BKG133 (Agency link unchanged). |
| Human review | Pending. |
| Tests | First run 22/23: `RangeError: Invalid time value` for `date_from = '2026-13-01'` — a code bug in date validation (now checks `NaN` first); test unchanged. Then `npm test`: `Test Files 67 passed (67)`, `Tests 459 passed (459)`; `npm run lint` passed; `git diff --stat c427c8d -- tests/` empty. **Mutation**: `expireDueHolds` moved before `authorizeProviderList` → "a denied list request writes nothing" and "an invalid query from the owner writes nothing" FAIL (`expected [ Array(5) ] to deeply equal [ Array(5) ]`); restored from a copy → both pass. |
| Spec issues found | none. Observation: the Provider nav "Dashboard" link still points to `/provider/{id}` (PRF127), not DSH018; #65/#66 did not ask to change it, so it is left as is. |
| Commit | see `git log` ("feat(BKG): US-6 List Bookings"); not pushed. |

### Entry 25: 30/10 Claude Code — BKG 012 demo (quickstart §4, §5, macOS) and polish (T026–T029)

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5), run by the agent at the human's request |
| Command and argument | Old dev server (PID 92096, started before the 012 code) stopped with `kill`; `npm run demo:reset`; one `npm run dev` in Terminal tab "dev server 012"; quickstart §4 by curl, §5 in the built-in browser; then T026 checks |
| Feature and tasks | `specs/012-bkg-list`, T026–T029 |
| What the agent produced | No code change. **§4 (curl)**: (1) `provider` → 200, `4bf17b30…` then `5782011c…`, both `requires_action` true, `group_size` 6 / 11 numbers, `status_counts` four keys, `total_count` 2; (2) `?status=Cancelled` → `[]`, counts still `Booked: 2`; (3) 2026-10-05 only → `4bf17b30…`, `Booked: 1`; (4) reversed range → 400 `VALIDATION_ERROR`; (5) `page_size=101` → 400, `page=5` → `[]`, `total_count` 2; (6) `provider_id=70efa801…` → 403; (7) agency, ubnd, hdt, guest → 403. **§5**: (1) *clicked*: BKG134 create (Tràng An, 2026-11-09 09:00, 10 pax) → BKG135 `1ce6931f…`; (2) *clicked* BKG133: `date_from` = 30/10/2026, one row On hold with "Giữ chỗ đến 2026-11-02 15:34" and "⚑ Cần xử lý", line "⚑ 2 Booking cần xử lý nằm ngoài bộ lọc · Xem tất cả"; (3) *clicked* "Xem tất cả": 3 rows ascending (10-05 Booked, 10-10 Booked, 11-09 On hold), all "Cần xử lý", out-of-filter line 0; (4) *clicked* status Cancelled + Lọc: empty-state text, out-of-filter line 3; (5) *clicked* Detail → BKG135 of `1ce6931f…` (On hold); (6) *clicked* Provider page "Bookings" → BKG133; (7) *clicked* DSH018: On hold 1, Booked 2, Completed 0, Cancelled 0, "⚑ 3 Booking cần xử lý", Bookings → BKG133; (8) Tour Agency *clicked* (role switch, BKG133 opened in the browser; DSH018 fetched in the page): access-denied text, no data; UBND, HDT, Guest *checked by curl* on BKG133 and DSH018: denied, no data. Dev-server log: every request 200/201, no error. **T026**: `npm run lint` exit 0, `validate_seed` PASS, `--check` OK. **T029**: checklist §3 #12 closed, #10 extended to BKG133/DSH018, new #13 (DSH018 summary only, nav "Dashboard" still PRF127). |
| Human review | Requested the agent to run the demo; results reported in chat. |
| Tests | Not rerun after Entry 24 (no code change); last run 459/459. |
| Spec issues found | none. Windows run (G1) still pending. |
| Commit | see `git log` ("docs(BKG): US-6 demo and polish (T026-T029)"); not pushed. |

### Entry 26: 30/10 Claude Code — BKG 013 plan, tasks and analyze (US-1, US-2)

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5) |
| Command and argument | `start_feature.py --spec docs/spec/specs/spec-BKG.md BKG --name schedule` (gave `013-bkg-schedule`), `--use`, `--check`; `/speckit-plan` (US-1 + US-2, Phase A = F-SCHED-09 + F-SCHED-01 + SCH139/SCH140, Phase B = F-SCHED-02 + SCH141/BKG137 + nav); `/speckit-tasks`; `/speckit-analyze` |
| Feature and tasks | `specs/013-bkg-schedule`, T001–T039 |
| What the agent produced | `spec.md` snapshot (with #32, #33, #68–#82), `plan.md`, `research.md`, `data-model.md`, `contracts/schedule-api.md`, `quickstart.md`, `tasks.md` |
| Human review | First plan review 6/8: the SCH140 route and entry point were not in the spec → human decided **#82** (PR #27); after `--refresh` the review was 8/8. Quickstart corrected before the tasks commit: Tràng An has a seed Booking (`0971a1b6…`, Completed, Phú Vinh). Analyze (0 CRITICAL): **H1** `CalendarGrid` moved to Foundational so Phase A and B share no task; **M1** SCH141 status filter added; **M2** calendar `status` is any string; **M3** helper `scheduleEntryFor` + `showScheduleLink` with test T039 for the SCH140 redirect and the Agency-only Explore link; **M4** T009 takes its slots from `calculateAvailability`. Recorded only: **L1** BKG137 village filter options come from the villages of the Agency's own Bookings; **L2** SCH139/SCH140 pages reuse the `canOpenCreateBooking` gate for the owner check (comment in code); **M3 (nav part)** the #68/#69 navigation links have no automated test, checked in the demo (T035); **L3** the human approved writing checklist §3 directly in T037. |
| Tests | n/a (planning) |
| Spec issues found | #82 (SCH140 route) — raised by the plan review, closed in the spec before tasks. |
| Commit | `4c863c6` (plan), `6083bdf` (tasks), analyze fixes in the next commit |

### Entry 27: 30/10 Claude Code — BKG 013 Step 5 (tests first, US-1/US-2)

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5) |
| Command and argument | `/speckit-implement Step 5 only: T001–T004, T007–T014, T039, T023–T027 (tests and red runs). Code only T005/T006/T018 after T004.` |
| Feature and tasks | `specs/013-bkg-schedule`, T001–T014, T018, T023–T027, T039 |
| What the agent produced | Tests: `tests/unit/bkg-schedule-dates.test.ts` (T002), `bkg-schedule-access.test.ts` (T003), `bkg-availability.test.ts` (T007–T008), `bkg-availability-consistency.test.ts` (T009, slots taken from `calculateAvailability`), `bkg-provider-schedule.test.ts` (T010–T012, incl. the #73 allow-list and "denied requests write nothing"), `bkg-schedule-entry.test.ts` (T039), `tests/integration/bkg-schedule-api.test.ts` (T013), `bkg-agency-bookings.test.ts` (T023–T025), `tests/integration/bkg-agency-bookings-api.test.ts` (T026). Code after the T004 red run: `addDays`, `isQueryDate` (`clock.ts`), `authorizeProviderSchedule`, `authorizeAgencyList` (`booking-access.ts`), shared `src/app/schedule-calendar/CalendarGrid.tsx` (T018, UI only). |
| Human review | Pending. |
| Tests | T001 baseline 459 passed. T004: 6 failed — `addDays/isQueryDate/authorizeProviderSchedule/authorizeAgencyList is not a function`; after T005/T006 → 6 passed. T014 (Phase A): `Test Files 5 failed (5)` — `Cannot find module '@/lib/booking/availability'` (T007–T009), `'@/lib/booking/provider-schedule'` (T010–T012, T039), `'@/app/api/bkg/providers/[providerId]/schedule/route'` (T013). T027 (Phase B): `Test Files 2 failed (2)` — `Cannot find module '@/lib/booking/agency-bookings'`, `'@/app/api/bkg/agency/bookings/route'`. Full `npm test`: `Test Files 7 failed \| 69 passed (76)`, `Tests 465 passed (465)` (459 existing + 6 Foundational). `npm run lint` fails only in the 7 new test files (TS2307 missing modules; TS7006 implicit any that follows from them). |
| Spec issues found | none |
| Commit | see `git log` ("test(BKG): failing tests for US-1/US-2"); not pushed. |

### Entry 28: 30/10 Claude Code — BKG 013 Step 6 (code, US-1/US-2)

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5) |
| Command and argument | `/speckit-implement` Step 6: T015–T017, T019–T022, T028–T033 ("Do not change any test") plus three mutation checks |
| Feature and tasks | `specs/013-bkg-schedule`, T015–T033 |
| What the agent produced | Phase A: `src/lib/booking/availability.ts` (`buildCalendarBlocks` paints Unavailable → operating windows Available → On hold/Booked, merges, public view drops `booking_id` before merging; `calculateAvailability`), `src/lib/booking/provider-schedule.ts` (`getProviderSchedule` authorize → validate (#71) → expire → read, public blocks from the allow-list; `scheduleEntryFor`, `showScheduleLink`), `GET /api/bkg/providers/[providerId]/schedule`, SCH139 `src/app/provider/[providerId]/schedule/page.tsx` (block → panel with `BookingActionsBar` + View → BKG135), SCH140 `src/app/explore/providers/[id]/schedule/page.tsx` (owner redirect, Select day, Request Quote → Explore), "Xem lịch trống" link in `src/app/explore/providers/[id]/page.tsx` (EXP file, one link). Phase B: `src/lib/booking/agency-bookings.ts`, `GET /api/bkg/agency/bookings`, BKG137 `src/app/agency/[agencyId]/bookings/page.tsx`, SCH141 `src/app/agency/[agencyId]/schedule/page.tsx` (status + date filters), `src/app/agency/[agencyId]/agency-booking-gate.ts` (gate + own villages, L1); nav links in `src/app/provider/[providerId]/page.tsx`, `edit/page.tsx`, `src/app/agency/[agencyId]/page.tsx` (PRF files, link edits only); BKG138 Back → BKG137. |
| Human review | Pending. |
| Tests | `npm test`: `Test Files 76 passed (76)`, `Tests 501 passed (501)`; `npm run lint` first failed in `availability.ts` and the T007 test file (TS2345: `hours` typed `OperatingHoursRow[]`, too narrow for stored rows) — fixed in code by a wider `HoursRow` type, test unchanged; then lint exit 0. `git diff --stat 9257631 -- tests/` empty. **Mutations** (restored, files identical): (a) `agency_name` added to public blocks → T011 and T013 FAIL `expected [ 'agency_name', 'end_at', …(2) ] to deeply equal [ 'end_at', 'start_at', 'status' ]`, restored → pass; (b) `expireDueHolds` before `authorizeProviderSchedule` → T012 "denied requests write nothing" FAIL `expected [ Array(5) ] to deeply equal [ Array(5) ]`, restored → pass; (c) Bookings outside an Available window skipped (Unavailable wins) → T007 #32 FAIL `expected [ [ '00:00', '00:00', 'Unavailable' ] ] to deeply equal …`, restored → pass. |
| Spec issues found | none |
| Commit | see `git log` ("feat(BKG): US-1 View Schedule and US-2 Availability"); not pushed. |

### Entry 29: 30/10 Claude Code — BKG 013 demo finding: public blocks crossed midnight (#72)

| Field | Value |
|---|---|
| Path and agent | A (Claude Code, Claude Opus 5.5) |
| Command and argument | Demo quickstart §2 step A2 stopped the run; human approved: new test first, then remove `mergePublic`, mutation (a) again, full test + lint |
| Feature and tasks | `specs/013-bkg-schedule`, T016 fix, T035 |
| What the agent produced | Finding (curl, `agency` on `50f2c8fc…`, October): one public block `2026-10-05T17:00 → 2026-10-10T09:00` Unavailable — `mergePublic` in `getProviderSchedule` merged across local midnight, against #72 ("per local day 00:00–24:00"). New tests in `tests/unit/bkg-provider-schedule.test.ts` (appended; no existing test changed): every public block ends on its own local day or at the next midnight; the public view equals `buildCalendarBlocks(…, 'public')`. Fix in `src/lib/booking/provider-schedule.ts`: public view = `buildCalendarBlocks(…, 'public')` + allow-list map; `mergePublic` removed. |
| Human review | Fix approach approved before coding. |
| Tests | Red: `AssertionError: expected false to be true` and `expected [ …(4) ] to deeply equal [ …(9) ]` (2 failed). After the fix: `Test Files 76 passed (76)`, `Tests 503 passed (503)`; lint exit 0; `git diff d7986c0 -- tests/` = 22 added lines, none removed. Mutation (a) again: `agency_name` in public blocks → T011 and T013 FAIL; restored (identical) → pass. |
| Spec issues found | none (code bug against #72) |
| Commit | see `git log` ("fix(BKG): public schedule blocks stay within one local day (#72)"); not pushed. |

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
| 8 | Verify / Entry 16–17 (BKG 011) | §5.1 FR-004 defined `updated_booking` only as "Object; Required"; the API returned the raw row with string numbers and DB names. | spec-BKG #57 (PR #21): same shape as F-SCHED-07, one serializer. | Closed; code in Entry 19 |
| 9 | Step 6 / Entry 19 (BKG 011) | screen-spec-BKG144 marks `target_status` Required, but details must be editable without a status change (Booked → Booked is an invalid transition). | spec-BKG #58 to be added at the next spec edit (decided 2026-10-30). | Decided; not yet in `docs/spec/` |

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
| 15 (BKG 011) | First version of `update-booking`, `change-status` and `mark-arrival` ran `expireDueHoldsLocked` before the ownership check, so a denied request (Agency/UBND/HDT/Guest) on 2026-10-05 still cancelled expired seed hold `54d7a276…` and wrote history + a message. | T015 `nothing is written` snapshot assertion failed. | Code fixed, test unchanged: authorize with `loadBookingForActor` first, then run expiry, then re-read the Booking. Any service that writes as a side effect must check permission before the first write. |
| 16–17 (BKG 011) | Unit and API tests for F-SCHED-04 checked only the top-level keys of the response, so `updated_booking` shipped with string numbers and DB field names; found only when reading the curl output of the US-5 demo. | Human read the demo JSON (Entry 16). | Spec #57 + tests that assert `typeof … === 'number'` and that PATCH equals the next GET (T029, T031). Read the demo response bodies, not only the status codes. |
| 22–23 (BKG 012) | Draft T013 would have created 25 holds at `SEED_NOW` and checked them at 2026-10-06: the list's own expiry (#64) would cancel them, so the test would fail for the wrong reason after the code was correct — and only 9 slots fit one Monday. | `/speckit-analyze` H1, before Step 5. | Rule in tasks.md: create hold fixtures with the same `now` as the call that checks them; count operating-hours slots before choosing fixture sizes. |
| 28–29 (BKG 013) | `getProviderSchedule` merged public blocks again after `buildCalendarBlocks`, across local midnight (one block 10-05 17:00 → 10-10 09:00); all tests passed because T011/T013 only checked the key set and the #72 tests called `buildCalendarBlocks` directly. | Agent's own curl demo (quickstart §2 A2), reading the response body. | A shape test must also check boundaries (here: each block inside one local day), and run through the public entry point, not only the helper. New tests added before the fix. |
