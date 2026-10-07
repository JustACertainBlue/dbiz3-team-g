# Build Log

Course: DBIZ3 AI-native Product Development, Sessions 8 to 11  
Team: G    Product: Hanoi Artisan Bridge

Save as `docs/build/build-log.md`. Add one entry for every agent run that created or changed a
file in `specs/`, `src/` (or your code folder) or `tests/`. Write it right after the run, not at
the end of the day. The build log is how the instructors, and your teammates, see what the agent
did and what the humans decided.

## 1. Features in progress

| Feature folder | Module | User stories in this slice | Owner | Branch | Status |
|---|---|---|---|---|---|
| `specs/001-ait-core` | AIT | US-1 (P1) | Group G | `001-ait-core` | In review |

## 2. Run entries

### Entry 1: 07/10 Group G

| Field | Value |
|---|---|
| Path and agent | Path B (Antigravity agent) |
| Command and argument | `/speckit-implement` |
| Feature and tasks | `specs/001-ait-core`, tasks `T001` to `T033` |
| What the agent produced | • `src/lib/db/seed-loader.ts`: Seed data catalog parser for Hanoi craft villages & experiences (T005)<br>• `src/lib/matching/types.ts`: Zod validation schemas and TypeScript domain types (T007)<br>• `src/lib/auth/session.ts`: Authentication & access control guard (T009)<br>• `src/lib/matching/session-service.ts`: Session state and message history store (T010)<br>• `src/lib/ai/extractor.ts`: Intent extraction & clarification follow-up question generator (T012)<br>• `src/app/api/ait/sessions/route.ts`: Session creation API endpoint (T013)<br>• `src/app/api/ait/sessions/[id]/messages/route.ts`: Message analysis & history API endpoint (T014)<br>• `src/lib/matching/candidate-repo.ts`: Verified Local Provider candidate retrieval (T017)<br>• `src/lib/matching/constraint-engine.ts`: Capacity, budget, and travel distance hard-constraint filter (T018)<br>• `src/lib/matching/scoring-engine.ts`: Multi-factor scoring algorithm (0-100) (T021)<br>• `src/lib/matching/recommendation-service.ts`: Recommendation formatting & relaxation suggestions (T022)<br>• `src/lib/matching/handoff-service.ts`: Request Quote & Chat handoff without creating bookings (T023)<br>• `src/app/api/ait/sessions/[id]/quote/route.ts`: Request Quote API endpoint (T026)<br>• `src/app/api/ait/sessions/[id]/chat/route.ts`: Chat handoff API endpoint (T027)<br>• `src/lib/decay/time-decay.ts`: Exponential 30-day half-life decay calculation service (T028)<br>• `src/lib/preferences/preference-service.ts`: Agency preference profile & Explore re-ranking (T029)<br>• `src/app/api/ait/preferences/[agencyId]/route.ts`: Agency preference profile API endpoint (T029)<br>• `src/app/ai-matching/page.tsx`: Interactive conversational matching UI Screen AIT121 (T031)<br>• `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/login/page.tsx`: UI layout and guest guard redirect<br>• 13 test suites in `tests/unit/`, `tests/contract/`, `tests/integration/` (T004, T006, T008, T010, T011, T015, T016, T019, T020, T023, T024, T025, T030) |
| Human review | Accepted. Implemented test-first with 100% tests passing and TypeScript strict check passing. |
| Tests | `Test Files 13 passed (13), Tests 70 passed (70)` |
| Spec issues found | none |
| Commit | `3f63c9e` |

## 3. Spec issues found while building

Every gap the build uncovers goes back to `docs/spec/` as an open question or a spec change. It
is never fixed silently in code.

| # | Found at (step, entry) | Issue | Where it went in the spec | Status |
|---|---|---|---|---|
| - | Entry 1 | None | N/A | Closed |

## 4. Agent mistakes worth remembering

Short notes for the team and for Session 10 (debugging and code review): what the agent got
wrong, how you noticed, and what you changed in the prompt, `AGENTS.md` or the constitution so it
does not happen again.

| Entry | What went wrong | How it was caught | Prevention |
|---|---|---|---|
| Entry 1 | Type narrowing in TypeScript caused TS2367 when checking role in JSX after early return | Caught by `tsc --noEmit` check | Cast `(role as string)` or use conditional rendering pattern |
| Entry 1 | Property name mismatch between test (`tour_preference_profile`) and interface (`tourPreferenceProfile`) | Caught by Vitest unit test failure | Support both snake_case and camelCase aliases for interoperability |
