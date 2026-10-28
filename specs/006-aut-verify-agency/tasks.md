# Tasks: US-6 Verify Agency

**Branch**: `001-aut-registration`
**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

---

## Phase 1: Setup & Foundational
Reuses PostgreSQL connection (`src/lib/db.ts`), authentication & session verification (`src/lib/auth.ts`), and registration schema.

---

## Phase 2: User Story 6 - Verify Agency (Priority: P1)

**Goal**: HDT Admin reviews pending Agency registrations, taking an `Approve`, `Request More Information`, or `Reject` decision with audit/review records and notifications.

### Tests for User Story 6 (Test-First)
> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T001 [P] [US6] Unit & integration tests for Agency verification decisions in `tests/business/fr018-verify-agency.test.ts` (covers F-AUTH-18, FR-018, BR-002, BR-003, BR-014, BR-016, AS-1, AS-2, AS-3)

### Implementation for User Story 6

- [ ] T002 [US6] Implement `reviewAgencyRegistration` and `getAgencyReviewDetails` in `src/lib/agency-review.ts` applying status changes, recording review history, issuing 24h resubmission tokens for More Info, and writing notification emails (traces to F-AUTH-18, FR-018, BR-014, BR-016)
- [ ] T003 [US6] Implement API route `GET` and `POST /api/admin/agency-reviews` in `src/app/api/admin/agency-reviews/route.ts` checking HDT admin role and executing review actions (traces to F-AUTH-18, FR-018)
- [ ] T004 [US6] Implement screen `VER119` Account Information in `src/app/admin/verify/account/page.tsx` displaying read-only account details and link to VER146 (traces to VER119)
- [ ] T005 [US6] Implement screen `VER146` View Pending Profile in `src/app/admin/verify/review/page.tsx` with submitted profile, documents, decision dropdown, comments, and submit button (traces to VER146, AS-1, AS-2, AS-3)
- [ ] T006 [US6] Implement placeholder screen `ADM095` in `src/app/admin/users/page.tsx` displaying screen ID and name (traces to ADM095)

---

## Phase 3: Verification & Review

- [ ] T007 Run all test suites with `npm test` and verify all tests pass
- [ ] T008 Run `npm run build` and verify clean build
- [ ] T009 Verify traceability table in `specs/006-aut-verify-agency/research.md` matches Scope table
