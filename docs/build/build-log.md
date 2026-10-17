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
