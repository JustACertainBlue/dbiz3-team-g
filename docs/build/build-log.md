# Build Log

Course: DBIZ3 AI-native Product Development, Sessions 8 to 11
Team: `<team code>`    Product: `<product name>`

Save as `docs/build/build-log.md`. Add one entry for every agent run that created or changed a
file in `specs/`, `src/` (or your code folder) or `tests/`. Write it right after the run, not at
the end of the day. The build log is how the instructors, and your teammates, see what the agent
did and what the humans decided.

## 1. Features in progress

| Feature folder | Module | User stories in this slice | Owner | Branch | Status |
|---|---|---|---|---|---|
| `specs/001-aut-registration` | AUT | US-1 (P1): Register Tour Agency Account (UC-ACC-01; F-AUTH-01 to F-AUTH-04, F-AUTH-23; screens REG003, REG115, REG116) | Đào Trúc Linh | `001-aut-registration` | Done |
| `specs/002-aut-login` | AUT | US-2 (P2): Log In (UC-ACC-02; F-AUTH-05 to F-AUTH-08, F-AUTH-15, F-AUTH-17; screen AUT009) | linh-daotruc | `001-aut-registration` | Done |
| `specs/003-aut-forgot-password` | AUT | US-4 (P2): Forgot Password (UC-ACC-04; F-AUTH-10 to F-AUTH-12; screens PAS011, PAS014, PAS142, PAS143) | linh-daotruc | `001-aut-registration` | Done |
| `specs/004-aut-logout` | AUT | US-3 (P3): Log Out (UC-ACC-03; F-AUTH-09; screen AUT026) | linh-daotruc | `001-aut-registration` | Done |
| `specs/005-aut-change-password` | AUT | US-5 (P2): Change Password (UC-ACC-05; F-AUTH-13, F-AUTH-14, FR-008; screen ACC129 Change Password panel) | linh-daotruc | `001-aut-registration` | Done |
| `specs/006-aut-verify-agency` | AUT | US-6 (P1): Verify Agency (UC-ACC-06; F-AUTH-18; screens VER119, VER146) | linh-daotruc | `001-aut-registration` | Done |

## 2. Run entries

Copy this block for each run. Keep the newest entry at the bottom.

### Entry 1: 18/10/2026 Đào Trúc Linh

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model claude sonnet 4.5) |
| Command and argument | `/speckit-plan` + `Stack decided by the team: TypeScript 5.x on Node.js >= 22, Next.js (App Router), PostgreSQL, Vitest. Scope: US-1 only; US-2 to US-10 out of scope.` |
| Feature and tasks | `specs/001-aut-registration`, no tasks yet |
| What the agent produced | `specs/001-aut-registration/plan.md`, `research.md`, `contracts/api.md`, `data-model.md`, `quickstart.md` |
| Human review | Accepted `/speckit-plan` plan (no change) |
| Tests | n/a (no code yet) |
| Spec issues found | none at this step |
| Commit | 84537e9` |

### Entry 2: 21/10/2026 Đào Trúc Linh

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model claude sonnet 4.5) |
| Command and argument | `/speckit-analyze` (no argument) |
| Feature and tasks | `specs/001-aut-registration`, all tasks |
| What the agent produced | No file changed (read-only command). Report in chat: 0 CRITICAL, 1 HIGH, 3 MEDIUM, 5 LOW. HIGH C1: `confirmation_email_status` (Required output of FR-004, spec section 5.1) is missing from the `POST /api/register/verify-otp` 200 response in `contracts/api.md` and from all tasks. MEDIUM U2: `agency_profiles` row is created at Pending Approval time, spec silent on timing. MEDIUM U1: FR-023 "3 resends within 15 minutes" is not enforced by the schema (only `resend_sequence` 0 to 3). MEDIUM C3: no task writes an `audit_logs` row for registration completion (SC-008). LOW: C2 (outbox failure handling), U3 (missing note in api.md), A1 (.gitkeep will not work as described), I1 and I2 (task descriptions inconsistent with the contract). |
| Human review | Accepted all findings as triage input. Cross-checked against `docs/spec/specs/spec-AUT.md`, `data/schema.sql` and `data/04-data-model.md`. C1 confirmed (FR-004 output table lists the field as Required). U2 is not a defect: every NOT NULL column of `agency_profiles` can be filled from `registration_submission_versions`, and `04-data-model.md` cites F-AUTH-04 as the creator. But `agency_profiles_tax_uq` is a global unique index on `tax_id` and FR-003 only checks duplicate email, so a second registration with the same tax_id would fail at the database after the Guest has entered a valid OTP. U1 is a real ambiguity but not blocking. C3 is an interpretation: SC-008 literally covers approval decisions and admin actions, but the spec's Audit Log entity "records security/account actions", so one audit row is cheap and consistent. |
| Tests | n/a (no code yet) |
| Spec issues found | Open questions 22 (OTP resend window) and 23 (duplicate tax_id) added to `docs/spec/specs/spec-AUT.md`, Blocking = No |
| Commit | n/a (no file changed) |

### Entry 3: 21/10/2026 Đào Trúc Linh

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model claude sonnet 4.5) |
| Command and argument | Free-form fix prompt (no slash command): "Fix analyze finding C1 and record decisions for U1, U2 and C3. Edit only files under specs/001-aut-registration/ (plan.md, research.md, contracts/api.md, tasks.md). Do not touch docs/spec/, data/, src/ or tests/. ... Do not renumber existing tasks. Add new tasks with the next free IDs, placed before the code task they check. Fix also the LOW findings I1 and I2. Show me the diff when done." |
| Feature and tasks | `specs/001-aut-registration`, changed `T021` and `T023`, added new test tasks `T024` to `T027` |
| What the agent produced | `contracts/api.md`: added `confirmation_email_status` (Success or Fail) to the 200 response of `POST /api/register/verify-otp`; Fail does not roll back the account. `research.md`: recorded decisions for U1 (resend window counted from `registration_otp_challenges.issued_at` per email, independent of the 10-minute OTP validity, `resend_sequence` 0 to 3 stores the position of the OTP in the request), U2 (agency profile created in the same transaction as the user account, filled from the latest `registration_submission_versions` row; unique violation on `agency_profiles_tax_uq` rolls back the whole transaction and returns a validation error), C3 (one `audit_logs` row, action `AGENCY_REGISTRATION_COMPLETED`, target_type `UserAccount`, written in the same transaction). `tasks.md`: new test tasks for C1 (outbox fails after account creation), U2 (duplicate tax_id), U1 (3rd resend allowed, 4th rejected) and C3 (audit row); `T021` and `T023` descriptions updated; I1 and I2 corrected. |
| Human review | Accepted. Checked in Source Control that only files under `specs/001-aut-registration/` changed, that no file in `docs/spec/`, `data/`, `src/` or `tests/` was touched by the agent, and that the new test tasks come before `T021` and `T023`. Re-ran `/speckit-analyze`: no CRITICAL or HIGH left; remaining MEDIUM and LOW noted below. |
| Tests | n/a (no code yet) |
| Spec issues found | Open questions 22 and 23 added to `docs/spec/specs/spec-AUT.md`; snapshot refreshed with `uv run tools/start_feature.py --refresh`, `--check` printed `<OK>` |
| Commit | 795f5f5 `

### Entry 4: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | `/speckit-plan` + `Stack decided by the team: TypeScript 5.x, Node.js >= 22.0.0, Next.js (App Router, src/ layout), PostgreSQL, Vitest. Scope: US-2 only; US-1 already built; US-3 to US-10 out of scope.` |
| Feature and tasks | `specs/002-aut-login`, no tasks yet |
| What the agent produced | `specs/002-aut-login/plan.md`, `research.md`, `data-model.md`, `contracts/api.md`, `quickstart.md` |
| Human review | Pending human review |
| Tests | n/a (no code yet) |
| Spec issues found | Proposed open question for session token default expiration (24h) |
| Commit | b7ec7a5 |

### Entry 5: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | `/speckit-tasks` (no argument) |
| Feature and tasks | `specs/002-aut-login`, tasks `T001` to `T012` |
| What the agent produced | `specs/002-aut-login/tasks.md` with tests-first tasks T001–T005, backend tasks T006–T008, UI & placeholder tasks T009–T012 |
| Human review | Pending human review |
| Tests | n/a (no code yet) |
| Spec issues found | none |
| Commit | b7ec7a5 |

### Entry 6: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | `/speckit-analyze` (no argument) |
| Feature and tasks | `specs/002-aut-login`, all tasks |
| What the agent produced | Read-only analysis: 0 CRITICAL, 0 HIGH. Requirements FR-005 to FR-008, FR-015, FR-017, BR-003, BR-004, BR-011, BR-012, and placeholders ADM079, EXP017, DSH018 are fully covered by T001–T012. |
| Human review | Pending human review |
| Tests | n/a (no code yet) |
| Spec issues found | none |
| Commit | b7ec7a5 |

### Entry 7: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | Tests-first: write test files for T001–T005, run `npm test` |
| Feature and tasks | `specs/002-aut-login`, tasks `T001` to `T005` |
| What the agent produced | `tests/business/fr006-empty-fields.test.ts`, `tests/business/fr007-invalid-credentials.test.ts`, `tests/business/fr007-agency-status.test.ts`, `tests/business/fr007-admin-provider-status.test.ts`, `tests/business/fr008-fr015-session-routing.test.ts` |
| Human review | Pending human review |
| Tests | `Test Files  5 failed | 9 passed (14); Tests 26 passed (26)` (5 new suites failed due to missing `@/lib/auth`) |
| Spec issues found | none |
| Commit | b7ec7a5 |

### Entry 8: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | Implementation (core & backend): implement T006–T008, run `npm test` |
| Feature and tasks | `specs/002-aut-login`, tasks `T006` to `T008` |
| What the agent produced | `src/lib/auth.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/session/route.ts` |
| Human review | Pending human review |
| Tests | `Test Files  14 passed (14); Tests 42 passed (42)` |
| Spec issues found | none |
| Commit | b7ec7a5 |

### Entry 9: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | Implementation (UI & placeholders): implement T009–T012, run `npm test` and `npm run build` |
| Feature and tasks | `specs/002-aut-login`, tasks `T009` to `T012` |
| What the agent produced | `src/app/login/page.tsx`, `src/app/admin/dashboard/page.tsx`, `src/app/explore/page.tsx`, `src/app/provider/dashboard/page.tsx`, traceability check in `specs/002-aut-login/research.md` |
| Human review | Pending human review |
| Tests | `Test Files  14 passed (14); Tests 42 passed (42)` |
| Spec issues found | none |
| Commit | b7ec7a5 |

### Entry 10: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | `/speckit-plan` + `Scope: US-4 only; US-1 and US-2 already built; US-3, US-5 to US-10 out of scope.` |
| Feature and tasks | `specs/003-aut-forgot-password`, no tasks yet |
| What the agent produced | `specs/003-aut-forgot-password/plan.md`, `research.md`, `data-model.md`, `contracts/api.md`, `quickstart.md` |
| Human review | Pending human review |
| Tests | n/a (no code yet) |
| Spec issues found | none |
| Commit | 16ee145 |

### Entry 11: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | `/speckit-tasks` (no argument) |
| Feature and tasks | `specs/003-aut-forgot-password`, tasks `T001` to `T012` |
| What the agent produced | `specs/003-aut-forgot-password/tasks.md` with tests-first tasks T001–T005, backend tasks T006–T008, UI tasks T009–T012 |
| Human review | Pending human review |
| Tests | n/a (no code yet) |
| Spec issues found | none |
| Commit | 16ee145 |

### Entry 12: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | `/speckit-analyze` (no argument) |
| Feature and tasks | `specs/003-aut-forgot-password`, all tasks |
| What the agent produced | Read-only analysis: 0 CRITICAL, 0 HIGH. Requirements FR-010 to FR-012, BR-005, BR-006, screens PAS011, PAS014, PAS142, PAS143 are fully covered by T001–T012. |
| Human review | Pending human review |
| Tests | n/a (no code yet) |
| Spec issues found | none |
| Commit | 16ee145 |

### Entry 13: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | Tests-first: write test files for T001–T005, run `npm test` |
| Feature and tasks | `specs/003-aut-forgot-password`, tasks `T001` to `T005` |
| What the agent produced | `tests/business/fr011-request-reset.test.ts`, `tests/business/fr011-enumeration-protection.test.ts`, `tests/business/fr012-reset-password.test.ts`, `tests/business/fr012-token-rejection.test.ts`, `tests/business/fr012-password-complexity.test.ts` |
| Human review | Pending human review |
| Tests | `Test Files  5 failed | 14 passed (19); Tests 42 passed (42)` (all 5 new suites failed due to missing `@/lib/recovery`) |
| Spec issues found | none |
| Commit | 16ee145 |

### Entry 14: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | Implementation (core & backend): implement T006–T008, run `npm test` |
| Feature and tasks | `specs/003-aut-forgot-password`, tasks `T006` to `T008` |
| What the agent produced | `src/lib/recovery.ts`, `src/app/api/auth/forgot-password/route.ts`, `src/app/api/auth/reset-password/route.ts` |
| Human review | Pending human review |
| Tests | `Test Files  19 passed (19); Tests 54 passed (54)` |
| Spec issues found | none |
| Commit | 16ee145 |

### Entry 15: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | Implementation (UI): implement T009–T012, run `npm test` and `npm run build` |
| Feature and tasks | `specs/003-aut-forgot-password`, tasks `T009` to `T012` |
| What the agent produced | `src/app/forgot-password/page.tsx`, `src/app/forgot-password/sent/page.tsx`, `src/app/reset-password/page.tsx`, `src/app/reset-password/success/page.tsx`, traceability check in `specs/003-aut-forgot-password/research.md` |
| Human review | Pending human review |
| Tests | `Test Files  19 passed (19); Tests 54 passed (54)` |
| Spec issues found | none |
| Commit | 16ee145 |

### Entry 16: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | `uv run tools/start_feature.py --spec docs/spec/specs/spec-AUT.md AUT --name logout` + `uv run python .specify/scripts/python/setup_plan.py --json` |
| Feature and tasks | `specs/004-aut-logout`, no tasks yet |
| What the agent produced | `specs/004-aut-logout/plan.md`, `research.md`, `data-model.md`, `contracts/api.md`, `quickstart.md` |
| Human review | Pending human review |
| Tests | n/a (no code yet) |
| Spec issues found | none |
| Commit | a7c0bf5 |

### Entry 17: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | `uv run python .specify/scripts/python/setup_tasks.py --json` |
| Feature and tasks | `specs/004-aut-logout`, tasks `T001` to `T007` |
| What the agent produced | `specs/004-aut-logout/tasks.md` |
| Human review | Pending human review |
| Tests | n/a (no code yet) |
| Spec issues found | none |
| Commit | a7c0bf5 |

### Entry 18: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | `uv run python .specify/scripts/python/check_prerequisites.py --json --require-tasks --include-tasks` |
| Feature and tasks | `specs/004-aut-logout`, all tasks |
| What the agent produced | Read-only check passed with 0 findings |
| Human review | Pending human review |
| Tests | n/a (no code yet) |
| Spec issues found | none |
| Commit | a7c0bf5 |

### Entry 19: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | Tests first: implement T001, run `npm test` (`npx vitest run tests/business/fr009-logout.test.ts`) |
| Feature and tasks | `specs/004-aut-logout`, task `T001` |
| What the agent produced | `tests/business/fr009-logout.test.ts` |
| Human review | Pending human review |
| Tests | `Tests  3 failed (3)` (missing implementation) |
| Spec issues found | none |
| Commit | a7c0bf5 |

### Entry 20: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | Implementation (core & backend): implement T002–T003, run `npx vitest run tests/business/fr009-logout.test.ts` |
| Feature and tasks | `specs/004-aut-logout`, tasks `T002` and `T003` |
| What the agent produced | `src/lib/auth.ts` (`logoutSession`), `src/app/api/auth/logout/route.ts` |
| Human review | Pending human review |
| Tests | `Test Files  1 passed (1); Tests  3 passed (3)` |
| Spec issues found | none |
| Commit | a7c0bf5 |

### Entry 21: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | Implementation (UI): implement T004, run `npx vitest run` and `npm run build` |
| Feature and tasks | `specs/004-aut-logout`, tasks `T004` to `T007` |
| What the agent produced | `src/app/logout/page.tsx` (AUT026 Logout Confirmation dialog) |
| Human review | Pending human review |
| Tests | `Test Files  20 passed (20); Tests  57 passed (57)` |
| Spec issues found | none |
| Commit | a7c0bf5 |

### Entry 22: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | `uv run tools/start_feature.py --spec docs/spec/specs/spec-AUT.md AUT --name change-password` + `uv run python .specify/scripts/python/setup_plan.py --json` |
| Feature and tasks | `specs/005-aut-change-password`, no tasks yet |
| What the agent produced | `specs/005-aut-change-password/plan.md`, `research.md`, `data-model.md`, `contracts/api.md`, `quickstart.md` |
| Human review | Pending human review |
| Tests | n/a (no code yet) |
| Spec issues found | none |
| Commit | 73b3f22 |

### Entry 23: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | `uv run python .specify/scripts/python/setup_tasks.py --json` |
| Feature and tasks | `specs/005-aut-change-password`, tasks `T001` to `T007` |
| What the agent produced | `specs/005-aut-change-password/tasks.md` |
| Human review | Pending human review |
| Tests | n/a (no code yet) |
| Spec issues found | none |
| Commit | 73b3f22 |

### Entry 24: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | `uv run python .specify/scripts/python/check_prerequisites.py --json --require-tasks --include-tasks` |
| Feature and tasks | `specs/005-aut-change-password`, all tasks |
| What the agent produced | Read-only check passed with 0 findings |
| Human review | Pending human review |
| Tests | n/a (no code yet) |
| Spec issues found | none |
| Commit | 73b3f22 |

### Entry 25: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | Tests first: implement T001, run `npm test` (`npx vitest run tests/business/fr014-change-password.test.ts`) |
| Feature and tasks | `specs/005-aut-change-password`, task `T001` |
| What the agent produced | `tests/business/fr014-change-password.test.ts` |
| Human review | Pending human review |
| Tests | `Failed Suites 1` (missing module `@/lib/password-change`) |
| Spec issues found | none |
| Commit | 73b3f22 |

### Entry 26: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | Implementation (core & backend): implement T002–T003, run `npx vitest run tests/business/fr014-change-password.test.ts` |
| Feature and tasks | `specs/005-aut-change-password`, tasks `T002` and `T003` |
| What the agent produced | `src/lib/password-change.ts`, `src/app/api/auth/change-password/route.ts` |
| Human review | Pending human review |
| Tests | `Test Files  1 passed (1); Tests  4 passed (4)` |
| Spec issues found | none |
| Commit | 73b3f22 |

### Entry 27: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | Implementation (UI): implement T004, run `npx vitest run` and `npm run build` |
| Feature and tasks | `specs/005-aut-change-password`, tasks `T004` to `T007` |
| What the agent produced | `src/app/account/page.tsx` (ACC129 Change Password panel) |
| Human review | Pending human review |
| Tests | `Test Files  21 passed (21); Tests  61 passed (61)` |
| Spec issues found | none |
| Commit | 73b3f22 |

### Entry 28: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | `uv run tools/start_feature.py --spec docs/spec/specs/spec-AUT.md AUT --name verify-agency` + `uv run python .specify/scripts/python/setup_plan.py --json` |
| Feature and tasks | `specs/006-aut-verify-agency`, no tasks yet |
| What the agent produced | `specs/006-aut-verify-agency/plan.md`, `research.md`, `data-model.md`, `contracts/api.md`, `quickstart.md` |
| Human review | Pending human review |
| Tests | n/a (no code yet) |
| Spec issues found | none |
| Commit | 2b3b0ac |

### Entry 29: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | `uv run python .specify/scripts/python/setup_tasks.py --json` |
| Feature and tasks | `specs/006-aut-verify-agency`, tasks `T001` to `T009` |
| What the agent produced | `specs/006-aut-verify-agency/tasks.md` |
| Human review | Pending human review |
| Tests | n/a (no code yet) |
| Spec issues found | none |
| Commit | 2b3b0ac |

### Entry 30: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | `uv run python .specify/scripts/python/check_prerequisites.py --json --require-tasks --include-tasks` |
| Feature and tasks | `specs/006-aut-verify-agency`, all tasks |
| What the agent produced | Read-only check passed with 0 findings |
| Human review | Pending human review |
| Tests | n/a (no code yet) |
| Spec issues found | none |
| Commit | 2b3b0ac |

### Entry 31: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | Tests first: implement T001, run `npm test` (`npx vitest run tests/business/fr018-verify-agency.test.ts`) |
| Feature and tasks | `specs/006-aut-verify-agency`, task `T001` |
| What the agent produced | `tests/business/fr018-verify-agency.test.ts` |
| Human review | Pending human review |
| Tests | `Failed Suites 1` (missing module `@/lib/agency-review`) |
| Spec issues found | none |
| Commit | 2b3b0ac |

### Entry 32: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | Implementation (core & backend): implement T002–T003, run `npx vitest run tests/business/fr018-verify-agency.test.ts` |
| Feature and tasks | `specs/006-aut-verify-agency`, tasks `T002` and `T003` |
| What the agent produced | `src/lib/agency-review.ts`, `src/app/api/admin/agency-reviews/route.ts` |
| Human review | Pending human review |
| Tests | `Test Files  1 passed (1); Tests  3 passed (3)` |
| Spec issues found | none |
| Commit | 2b3b0ac |

### Entry 33: 28/10/2026 linh-daotruc

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent, model Gemini 3.8 Flash) |
| Command and argument | Implementation (UI): implement T004–T006, run `npx vitest run` and `npm run build` |
| Feature and tasks | `specs/006-aut-verify-agency`, tasks `T004` to `T009` |
| What the agent produced | `src/app/admin/verify/account/page.tsx` (VER119), `src/app/admin/verify/review/page.tsx` (VER146), `src/app/admin/users/page.tsx` (ADM095) |
| Human review | Pending human review |
| Tests | `Test Files  22 passed (22); Tests  64 passed (64)` |
| Spec issues found | none |
| Commit | 2b3b0ac |



## 3. Spec issues found while building

Every gap the build uncovers goes back to `docs/spec/` as an open question or a spec change. It
is never fixed silently in code.

| # | Found at (step, entry) | Issue | Where it went in the spec | Status |
|---|---|---|---|---|
| 1 | Step 4 Analyze, entry 2 | OTP resend limit: FR-023 says "3 resends within 15 minutes", but the schema only caps `resend_sequence` at 3 (CHECK 0 to 3) and has no time window. After the cap is reached the Guest cannot resend again on the same request. | Open question 22 in `docs/spec/specs/spec-AUT.md` (Blocking = No). Interim: window counted from `issued_at` per email; after 3 resends the Guest restarts registration. | Open |
| 2 | Step 4 Analyze, entry 2 | Duplicate tax_id: `agency_profiles_tax_uq` is a global unique index, FR-003 only checks duplicate email, and the agency profile is created at Pending Approval. A second registration with the same tax_id would fail at the database after OTP verification. Related to the data review Q1 (uniqueness scope of tax_id) and open question 17 (re-registration after Rejected). | Open question 23 in `docs/spec/specs/spec-AUT.md` (Blocking = No). Interim: unique violation is rolled back and returned as a validation error. | Open |
| 3 | Step 4 Analyze, entry 2 | SC-008 (traceability) names approval decisions and Admin account actions, not Guest registration completion. | Not escalated. Decision recorded in `research.md`: write one `audit_logs` row for registration completion, because the spec's Audit Log entity records security and account actions. No spec change needed. | Decided |
| 4 | Step 3 Plan, entry 4 | Session duration: The spec states sessions are invalidated on logout or disable, and revalidated periodically, but specifies no default session expiry. Default session expiry is set to 24 hours. | `docs/spec/specs/spec-AUT.md` | Proposed, not yet in spec |

## 4. Agent mistakes worth remembering

Short notes for the team and for Session 10 (debugging and code review): what the agent got
wrong, how you noticed, and what you changed in the prompt, `AGENTS.md` or the constitution so it
does not happen again.

| Entry | What went wrong | How it was caught | Prevention |
|---|---|---|---|
| 1 and 2 | The plan and the tasks left out `confirmation_email_status`, a Required output of FR-004, and did not include an audit row for registration completion or any handling of the global unique tax_id. | `/speckit-analyze` (entry 2), then confirmed against spec section 5.1, `data/schema.sql` and `data/04-data-model.md`. | Add to the plan prompt: "Every Required output field in section 5.1 of the FRs in scope must appear in contracts/api.md, and every unique index touched by the slice needs a failure-handling task." Always run `/speckit-analyze` before writing tests. |
| 13 and 14 | In `tests/business/fr011-enumeration-protection.test.ts`, the test asserted total count of `password_reset_tokens` is 0, overlooking that `data/seed/password_reset_tokens.csv` seeds 8 rows on test DB setup. | Caught during test run (classified as TEST_BUG). | Fixed by comparing token count before and after the operation instead of asserting table is completely empty. When testing tables with pre-seeded rows, always measure relative delta or filter by target user. |
