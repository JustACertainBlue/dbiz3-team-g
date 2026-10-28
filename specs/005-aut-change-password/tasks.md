# Tasks: US-5 Change Password

**Branch**: `001-aut-registration`
**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

---

## Phase 1: Setup & Foundational
Reuses PostgreSQL connection (`src/lib/db.ts`), password hashing (`src/lib/password.ts`), and session authentication (`src/lib/auth.ts`).

---

## Phase 2: User Story 5 - Change Password (Priority: P2)

**Goal**: Authenticated member updates their password, verifying current credentials, ensuring new password complexity, writing an audit log entry, and clearing `must_change_password`.

### Tests for User Story 5 (Test-First)
> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T001 [P] [US5] Unit & integration tests for password change in `tests/business/fr014-change-password.test.ts` (covers F-AUTH-14, FR-014, FR-008, AS-1, AS-2, complexity, and audit trail)

### Implementation for User Story 5

- [ ] T002 [US5] Implement `changePassword` logic in `src/lib/password-change.ts` validating current password, new password complexity, updating `user_accounts`, clearing `must_change_password`, and inserting into `audit_logs` (traces to F-AUTH-14, FR-014, FR-008)
- [ ] T003 [US5] Implement API route `POST /api/auth/change-password` in `src/app/api/auth/change-password/route.ts` validating session token, parsing inputs, and calling `changePassword` (traces to F-AUTH-14, FR-014)
- [ ] T004 [US5] Implement screen `ACC129` Change Password panel in `src/app/account/page.tsx` with Current password, New password, Confirm new password, security reminder text, and Change Password button (traces to ACC129, F-AUTH-13, FR-013, FR-008)

---

## Phase 3: Verification & Review

- [ ] T005 Run all tests with `npm test` and verify full suite passes
- [ ] T006 Run `npm run build` and verify clean build
- [ ] T007 Confirm traceability table in `specs/005-aut-change-password/research.md` matches Scope table
