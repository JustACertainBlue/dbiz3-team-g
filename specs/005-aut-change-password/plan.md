# Implementation Plan: US-5 Change Password

**Branch**: `001-aut-registration` | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `docs/spec/specs/spec-AUT.md` §3 (US-5), §5 (FR-013, FR-014, FR-008), §5.1 (FR-013, FR-014 I/O contract), §5.2 and `docs/spec/screens/screen-spec-ACC129.md`.

---

## Scope Table

| Item ID | Category | Description | Implementation Target |
|---|---|---|---|
| **US-5** | User Story | Change Password (UC-ACC-05): Authenticated member updates their password to maintain control of their account. | Entire slice |
| **F-AUTH-13** / **FR-013** | Function / FR | Provides the form interface within user settings for a logged-in member to update password. Collects current password, new password, and password confirmation. | `src/app/account/page.tsx` (ACC129 Change Password panel) |
| **F-AUTH-14** / **FR-014** | Function / FR | Validates new password complexity (8–64 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character, no whitespace), verifies current password against DB hash, hashes new password, updates user record with timestamp and clears `must_change_password`, logs change in `audit_logs`. | `src/lib/password-change.ts`, `src/app/api/auth/change-password/route.ts` |
| **FR-008** | Function / FR | A member with `must_change_password=true` first opens Change Password panel on ACC129. After successful change: Admin (HDT or UBND) opens ADM079; Tour Agency opens EXP017; Local Provider opens DSH018. | `src/lib/password-change.ts`, `src/app/account/page.tsx` |
| **AS-1** | Acceptance Scenario | Given correct current password and valid new password, when Change Password is submitted, then password is updated and action recorded in audit log. | `tests/business/fr014-change-password.test.ts` |
| **AS-2** | Acceptance Scenario | Given current password is incorrect, then no change is made and an error is shown ("Current password incorrect"). | `tests/business/fr014-change-password.test.ts` |
| **ACC129** | Screen | My Account — Change Password panel only: Current password, New password, Confirm new password, security reminder text, Change Password button. Displays mandatory notice if `must_change_password=true`. | `src/app/account/page.tsx` |

---

## Summary

Implement **US-5 (P2): Change Password** (UC-ACC-05), covering F-AUTH-13, F-AUTH-14, FR-008, acceptance scenarios AS-1 and AS-2, and the Change Password panel on screen ACC129.
- Authenticated users (identified by session token) can change their password by supplying `current_password`, `new_password`, and `confirm_new_password`.
- The current password is authenticated against `user_accounts.password_hash` using `bcryptjs`.
- The new password is validated against the complexity requirements (8–64 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character, no whitespace).
- `confirm_new_password` must match `new_password`.
- If valid:
  - Updates `user_accounts.password_hash = newHash`, `user_accounts.must_change_password = false`, `user_accounts.updated_at = now()`.
  - Records an entry in `audit_logs` (`action = 'PASSWORD_CHANGED'`, `target_type = 'UserAccount'`).
  - Returns `success_message`, `password_updated_at`, `audit_log_id`, and `redirect_url` based on role routing (ADM079 for Admin, EXP017 for Agency, DSH018 for Provider).
- If current password is wrong, returns 400 with `Current password incorrect` and no DB changes occur.
- Screen `ACC129` (`/account`) renders the Change Password panel adhering strictly to `screen-spec-ACC129.md`.

All other user stories are out of scope.

---

## Technical Context

**Language/Version**: TypeScript `5.9.3` on Node.js `≥ 22.0.0`
**Primary Dependencies**: Next.js 16.4.0, React 19, `pg`, `bcryptjs`, `vitest` (no new dependencies).
**Storage**: PostgreSQL tables `user_accounts`, `audit_logs`, `sessions`.
**Testing**: Vitest (`npm test` = `vitest run`). Disposable test database created via `createTestDb(TEST_DB_NAME)`.

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Spec is Source of Truth | ✅ PASS | Traced to `spec-AUT.md` US-5, FR-013, FR-014, FR-008 and `screen-spec-ACC129.md`. |
| II. Business Rules are Test-First | ✅ PASS | Automated tests covering password complexity, matching confirmation, correct/incorrect current password, audit logging, and `must_change_password` clearing written and run before code. |
| III. Thin Vertical Slices | ✅ PASS | US-5 only. Change Password panel on ACC129 per Anti-invention rule 3. |
| IV. Synthetic Data and No Secrets | ✅ PASS | Disposable test DB; no committed passwords. |
| V. Humans Approve Every Change | ✅ PASS | On branch `001-aut-registration`; no push/merge. |

---

## Complexity Tracking / Placeholders

| Item | Reason |
|---|---|
| `ACC129` Change Password panel | Per Anti-invention rule 3, only the Change Password panel (F-AUTH-13, F-AUTH-14, FR-008) is implemented. |
