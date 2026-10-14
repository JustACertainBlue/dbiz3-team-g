# MVP Alpha Checklist

Course: DBIZ3 AI-native Product Development, Session 8 output (input to Session 9)
Team: `Group G`    Product: `Hanoi Artisan Bridge`    Date: `14/10/2026`
Commit checked: `cb3e2ad`    Tag: `mvp-alpha`

Save as `docs/build/mvp-alpha-checklist.md`. "MVP Alpha" in DBIZ3 means: the core modules of
the product run end to end on the Session 5 seed data, for their highest-priority user story,
from a clean clone, with the business rules covered by passing tests. It is a course definition.
It is not a market release, and it does not need login, deployment or a polished interface.

## 1. Core modules in this Alpha

The core modules are the ones on the main path of your MVP Scope v3 (Session 1): without them the
product cannot be demonstrated at all. Usually one or two modules.

| Module | P1 user story (from the spec) | Feature folder | Owner | Demo path (URLs or screens, in order) |
|---|---|---|---|---|
| AIT | US-1 (P1): AI Tour Matching (UC-DIS-05) | `specs/001-ait-core` | Group G | `http://localhost:3000/ai-matching` (Screen AIT121) → conversational prompt → clarification questions → ranked recommendations from seed catalog → Request Quote / Chat handoff |
| PRF | US-3 (P1), US-4 (P1), US-5 (P1), US-6 (P1) | `specs/002-prf-core` | Group G | `http://localhost:3000/provider/<id>` → `http://localhost:3000/provider/<id>/edit` → `http://localhost:3000/provider/<id>/experiences` |

## 2. Gates

Tick only after checking it at the commit above. Every line must be ticked for `mvp-alpha`.

- [ ] G1. A fresh clone runs with the commands in each `quickstart.md`, on the laptops of at least two members (one macOS and one Windows, if the team has both). Names: `<macOS member>, <Windows member>`.
- [x] G2. The P1 user story of every core module works end to end on the seed data, following the demo path in section 1.
- [x] G3. Every business rule (BR) of the core modules, and every acceptance scenario of their P1 stories, has an automated test. All tests pass. Last line of the test run: `Test Files 15 passed (15), Tests 87 passed (87)`.
- [x] G4. `uv run tools/start_feature.py --check` prints OK for every feature folder (the spec snapshot matches `docs/spec/`).
- [x] G5. `/speckit-analyze` was run after `/speckit-tasks`, and every CRITICAL and HIGH finding is resolved or recorded in section 3.
- [ ] G6. Every change reached `main` through a pull request reviewed by a member who did not write it (PR #6 and PR #8 currently in review).
- [x] G7. No real personal data and no secret (key, password, token) in any committed file.
- [x] G8. `docs/build/build-log.md` has an entry for every agent run that changed code or tests.

## 3. Known limitations

List what the Alpha does not do yet, honestly. A limitation written here is not a penalty; a
limitation discovered by the instructor that is not written here is.

| # | Limitation | Spec reference | Planned for |
|---|---|---|---|
| 1 | Chat button records context and returns persistent chat session ID but does not open the full in-app chat UI (COM048) | F-MATCH-11, Screen COM048 | Session 9 (CHAT module integration) |
| 2 | SQLite local storage (`DATABASE_URL=file:./dev.db`) used for zero-config testing instead of PostgreSQL production deployment | Plan Architecture | Session 11 |
| 3 | Tour Agency authentication is simulated via session header / test mock (`agency-hanoi-tours-001`) rather than production auth provider | F-AUTH-01 | Session 11 |
| 4 | `specs/002-prf-core` is on branch `002-prf-core` (PR #8) and pending peer review before merging to `main` alongside PR #6 | G6 governance | Session 8 final merge |

## 4. Sign-off

| Member | Role in this Alpha | Agrees the gates are met (yes / no, and why) |
|---|---|---|
| Ng Thu | Author (`001-ait-core`) / Spec Owner | Yes, all 87 tests green, G2–G5, G7–G8 pass; G1 & G6 pending peer verification |
| Linh Khanh Vu | Reviewer (PR #6) / AGENTS.md Owner | In review (Round 3 verify) |
| Viet Hoang | Data / Seed Owner | Yes, seed integrity validated against Session 5 package |
| Dao Truc Linh | Team Member | In review |
