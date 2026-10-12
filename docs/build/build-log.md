# Build Log

Course: DBIZ3 AI-native Product Development, Sessions 8 to 11
Team: `Group G`    Product: `Hanoi Artisan Bridge`

Save as `docs/build/build-log.md`. Add one entry for every agent run that created or changed a
file in `specs/`, `src/` (or your code folder) or `tests/`. Write it right after the run, not at
the end of the day. The build log is how the instructors, and your teammates, see what the agent
did and what the humans decided.

## 1. Features in progress

| Feature folder | Module | User stories in this slice | Owner | Branch | Status |
|---|---|---|---|---|---|
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

## 3. Spec issues found while building

Every gap the build uncovers goes back to `docs/spec/` as an open question or a spec change. It
is never fixed silently in code.

| # | Found at (step, entry) | Issue | Where it went in the spec | Status |
|---|---|---|---|---|
| | | | | |

## 4. Agent mistakes worth remembering

Short notes for the team and for Session 10 (debugging and code review): what the agent got
wrong, how you noticed, and what you changed in the prompt, `AGENTS.md` or the constitution so it
does not happen again.

| Entry | What went wrong | How it was caught | Prevention |
|---|---|---|---|
| 2 | Relative import in unit tests used `../../helpers` instead of `../helpers` | Vitest reported module resolution error on run | Always check relative folder depth when importing local test helpers |
| 2 | Direct read of `provider.business_name` from `provider_profiles.csv` instead of versioned `provider_profile_versions.csv` | Provider name assertion failed in `provider-service.test.ts` | Always join `provider_profile_versions` per Session 5 data model |
