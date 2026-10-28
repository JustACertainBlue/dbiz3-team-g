# Tasks: US-3 Log Out

**Branch**: `001-aut-registration`
**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

---

## Phase 1: Setup & Foundational
Reuses existing PostgreSQL infrastructure and `src/lib/auth.ts` from US-2.

---

## Phase 2: User Story 3 - Log Out (Priority: P3)

**Goal**: Authenticated member initiates logout, invalidating the current server session, clearing client session cookie, and redirecting to `/login` (AUT009).

### Tests for User Story 3 (Test-First)
> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T001 [P] [US3] Unit & integration test for session revocation and cookie clearing in `tests/business/fr009-logout.test.ts` (verifies F-AUTH-09, FR-009, AS-1, AS-2, BR-012, BR-013)

### Implementation for User Story 3

- [ ] T002 [US3] Implement `logoutSession(sessionToken: string)` in `src/lib/auth.ts` to set `revoked_at = CURRENT_TIMESTAMP` for the session matching `token_hash` (traces to F-AUTH-09, FR-009)
- [ ] T003 [US3] Implement API route `POST /api/auth/logout` in `src/app/api/auth/logout/route.ts` accepting session token from cookie/header, revoking session, and clearing `session_token` cookie (traces to F-AUTH-09, FR-009)
- [ ] T004 [US3] Implement screen `AUT026` Logout Confirmation page in `src/app/logout/page.tsx` with heading "Logout Confirmation", "Confirm logout" button, and "Cancel" button (traces to AUT026, AS-1)

---

## Phase 3: Verification & Review

- [ ] T005 Run all test suites with `npm test` and verify all tests pass across all stories
- [ ] T006 Run `npm run build` and verify all routes compile cleanly
- [ ] T007 Verify traceability table in `specs/004-aut-logout/research.md` matches Scope table exactly
