# Tasks: US-4 Forgot Password

**Feature**: US-4 Forgot Password (`specs/003-aut-forgot-password`)  
**Scope**: UC-ACC-04 (F-AUTH-10, F-AUTH-11, F-AUTH-12; screens PAS011, PAS014, PAS142, PAS143)

---

## Phase 1: Tests First (Non-Negotiable)

> **CRITICAL**: Write these tests first and ensure they fail before writing implementation code.

- [x] T001 [P] [US4] Write test for password reset request and 15-minute token generation (F-AUTH-11, FR-011, BR-005, AS-1) in `tests/business/fr011-request-reset.test.ts`
- [x] T002 [P] [US4] Write test for user enumeration protection and generic response (FR-011, SR-003) in `tests/business/fr011-enumeration-protection.test.ts`
- [x] T003 [P] [US4] Write test for password reset execution and single-use token consumption (F-AUTH-12, FR-012, BR-006, AS-2) in `tests/business/fr012-reset-password.test.ts`
- [x] T004 [P] [US4] Write test for expired and already-used token rejection (F-AUTH-12, FR-012, BR-006, AS-3) in `tests/business/fr012-token-rejection.test.ts`
- [x] T005 [P] [US4] Write test for new password complexity validation and confirmation matching (FR-012) in `tests/business/fr012-password-complexity.test.ts`

---

## Phase 2: Implementation (Core & Backend Services)

- [x] T006 [US4] Implement password reset service functions (`requestPasswordReset`, `resetPasswordWithToken`, `validateResetToken`) in `src/lib/recovery.ts` (F-AUTH-11, F-AUTH-12, FR-011, FR-012, BR-005, BR-006)
- [x] T007 [US4] Implement forgot-password request API route `POST /api/auth/forgot-password` in `src/app/api/auth/forgot-password/route.ts` (FR-011)
- [x] T008 [US4] Implement reset-password submission API route `POST /api/auth/reset-password` in `src/app/api/auth/reset-password/route.ts` (FR-012)

---

## Phase 3: Implementation (UI Screens)

- [x] T009 [P] [US4] Implement PAS011 Enter Registered Email screen in `src/app/forgot-password/page.tsx` (PAS011, FR-010)
- [x] T010 [P] [US4] Implement PAS014 Check Your Email confirmation screen in `src/app/forgot-password/sent/page.tsx` (PAS014)
- [x] T011 [P] [US4] Implement PAS142 Set New Password screen in `src/app/reset-password/page.tsx` (PAS142, FR-012)
- [x] T012 [P] [US4] Implement PAS143 Password Updated success screen in `src/app/reset-password/success/page.tsx` (PAS143)

---

## Dependencies & Execution Order

- **Phase 1 (Tests First)**: T001–T005 written first. Run `npm test` and verify tests fail due to missing implementation.
- **Phase 2 (Core & Backend)**: T006, T007, T008 implemented to make T001–T005 pass.
- **Phase 3 (UI Screens)**: T009–T012 implemented following screen specifications.
