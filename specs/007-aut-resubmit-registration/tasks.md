# Tasks: US-10 Revise and Resubmit Agency Registration

**Branch**: `001-aut-registration`
**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

---

## Phase 1: Setup & Foundational
Reuses PostgreSQL connection (`src/lib/db.ts`), registration validation schema (`src/lib/validation.ts`), and registration request tables.

---

## Phase 2: User Story 10 - Revise and Resubmit Agency Registration (Priority: P1)

**Goal**: Guest uses a single-use 24-hour edit link to review and update existing registration fields/documents and resubmit for HDT review, returning the request to Pending Approval and invalidating the token.

### Tests for User Story 10 (Test-First)
> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T001 [P] [US10] Unit & integration tests for revision and resubmission in `tests/business/fr026-resubmit-registration.test.ts` (covers F-AUTH-26, FR-026, BR-014, BR-016, AS-1, AS-2, AS-3)

### Implementation for User Story 10

- [ ] T002 [US10] Implement token validation and resubmission logic in `src/lib/resubmission.ts` (`validateResubmissionToken`, `getResubmissionData`, `resubmitRegistration`) (traces to F-AUTH-26, FR-026, BR-014, BR-016)
- [ ] T003 [US10] Implement API routes `GET` and `POST /api/register/resubmit` in `src/app/api/register/resubmit/route.ts` validating token, fetching current submission version, and handling resubmissions (traces to F-AUTH-26, FR-026)
- [ ] T004 [US10] Integrate secure edit mode into screen `REG003` in `src/app/register/page.tsx`, detecting `token` query parameter, prefilling company fields, hiding password fields, and submitting to `/api/register/resubmit` (traces to REG003, AS-1, AS-2)

---

## Phase 3: Verification & Review

- [ ] T005 Run all tests with `npm test` and verify full suite passes
- [ ] T006 Run `npm run build` and verify clean build
- [ ] T007 Confirm traceability table in `specs/007-aut-resubmit-registration/research.md` matches Scope table
