# Tasks: US-2 Log In

**Feature**: US-2 Log In (`specs/002-aut-login`)  
**Scope**: UC-ACC-02 (F-AUTH-05, F-AUTH-06, F-AUTH-07, F-AUTH-08, F-AUTH-15, F-AUTH-17; screen AUT009; placeholders ADM079, EXP017, DSH018)

---

## Phase 1: Tests First (Non-Negotiable)

> **CRITICAL**: Write these tests first and ensure they fail before writing implementation code.

- [x] T001 [P] [US2] Write business rule test for empty field validation (FR-006) in `tests/business/fr006-empty-fields.test.ts`
- [x] T002 [P] [US2] Write business rule test for invalid credentials (FR-007) in `tests/business/fr007-invalid-credentials.test.ts`
- [x] T003 [P] [US2] Write business rule test for Tour Agency account status checks (BR-003, FR-007, AS-2: Approved succeeds, Pending Approval and Rejected return 'Account not approved', Disabled returns 'Account disabled') in `tests/business/fr007-agency-status.test.ts`
- [x] T004 [P] [US2] Write business rule test for ADMIN and Local Provider status checks (BR-004, FR-007, AS-3: Active succeeds, Disabled returns 'Account disabled') in `tests/business/fr007-admin-provider-status.test.ts`
- [x] T005 [P] [US2] Write integration test for session creation, RBAC permission initialization, and role routing (F-AUTH-07, F-AUTH-08, F-AUTH-15, F-AUTH-17, AS-1: session recorded in sessions table, permissions loaded from role_permissions, landing screen ID EXP017/ADM079/DSH018, session verification endpoint) in `tests/business/fr008-fr015-session-routing.test.ts`

---

## Phase 2: Implementation (Core & Backend Services)

- [x] T006 [US2] Implement authentication service functions (`authenticate`, `verifySession`, `loadRolePermissions`, `getLandingScreen`) in `src/lib/auth.ts` (F-AUTH-06, F-AUTH-07, F-AUTH-08, F-AUTH-15, F-AUTH-17, BR-003, BR-004, BR-011, BR-012)
- [x] T007 [US2] Implement login API endpoint `POST /api/auth/login` in `src/app/api/auth/login/route.ts` (FR-006, FR-007, FR-008)
- [x] T008 [US2] Implement session verification API endpoint `GET /api/auth/session` in `src/app/api/auth/session/route.ts` (FR-017)

---

## Phase 3: Implementation (UI & Placeholders)

- [x] T009 [P] [US2] Implement minimal placeholder page for ADM079 Admin Dashboard in `src/app/admin/dashboard/page.tsx` (ADM079)
- [x] T010 [P] [US2] Implement minimal placeholder page for EXP017 Explore in `src/app/explore/page.tsx` (EXP017)
- [x] T011 [P] [US2] Implement minimal placeholder page for DSH018 Local Provider Dashboard in `src/app/provider/dashboard/page.tsx` (DSH018)
- [x] T012 [US2] Implement AUT009 Login screen with Email, Password, Login button, Forgot password link, Register link in `src/app/login/page.tsx` (AUT009, FR-005, FR-006, FR-007, FR-008)

---

## Dependencies & Execution Order

- **Phase 1 (Tests First)**: T001–T005 written first. Run `npm test` and verify tests fail due to missing implementation.
- **Phase 2 (Core & Backend)**: T006, T007, T008 implemented to make T001–T005 pass.
- **Phase 3 (UI & Placeholders)**: T009–T011 placeholders built, then T012 login UI page built.
