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
| `specs/001-aut-registration` | AUT | US-1 (P1): Register Tour Agency Account (UC-ACC-01; F-AUTH-01 to F-AUTH-04, F-AUTH-23; screens REG003, REG115, REG116) | Đào Trúc Linh | `001-aut-registration` | Tasks |

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

## 3. Spec issues found while building

Every gap the build uncovers goes back to `docs/spec/` as an open question or a spec change. It
is never fixed silently in code.

| # | Found at (step, entry) | Issue | Where it went in the spec | Status |
|---|---|---|---|---|
| 1 | Step 4 Analyze, entry 2 | OTP resend limit: FR-023 says "3 resends within 15 minutes", but the schema only caps `resend_sequence` at 3 (CHECK 0 to 3) and has no time window. After the cap is reached the Guest cannot resend again on the same request. | Open question 22 in `docs/spec/specs/spec-AUT.md` (Blocking = No). Interim: window counted from `issued_at` per email; after 3 resends the Guest restarts registration. | Open |
| 2 | Step 4 Analyze, entry 2 | Duplicate tax_id: `agency_profiles_tax_uq` is a global unique index, FR-003 only checks duplicate email, and the agency profile is created at Pending Approval. A second registration with the same tax_id would fail at the database after OTP verification. Related to the data review Q1 (uniqueness scope of tax_id) and open question 17 (re-registration after Rejected). | Open question 23 in `docs/spec/specs/spec-AUT.md` (Blocking = No). Interim: unique violation is rolled back and returned as a validation error. | Open |
| 3 | Step 4 Analyze, entry 2 | SC-008 (traceability) names approval decisions and Admin account actions, not Guest registration completion. | Not escalated. Decision recorded in `research.md`: write one `audit_logs` row for registration completion, because the spec's Audit Log entity records security and account actions. No spec change needed. | Decided |

## 4. Agent mistakes worth remembering

Short notes for the team and for Session 10 (debugging and code review): what the agent got
wrong, how you noticed, and what you changed in the prompt, `AGENTS.md` or the constitution so it
does not happen again.

| Entry | What went wrong | How it was caught | Prevention |
|---|---|---|---|
| 1 and 2 | The plan and the tasks left out `confirmation_email_status`, a Required output of FR-004, and did not include an audit row for registration completion or any handling of the global unique tax_id. | `/speckit-analyze` (entry 2), then confirmed against spec section 5.1, `data/schema.sql` and `data/04-data-model.md`. | Add to the plan prompt: "Every Required output field in section 5.1 of the FRs in scope must appear in contracts/api.md, and every unique index touched by the slice needs a failure-handling task." Always run `/speckit-analyze` before writing tests. |
