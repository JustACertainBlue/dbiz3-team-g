# Implementation Plan: US-6 Verify Agency

**Branch**: `001-aut-registration` | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `docs/spec/specs/spec-AUT.md` §3 (US-6), §5 (FR-018), §5.1 (FR-018 I/O contract), §5.2 (BR-002, BR-003, BR-014, BR-016), `docs/spec/screens/screen-spec-VER119.md` and `docs/spec/screens/screen-spec-VER146.md`.

---

## Scope Table

| Item ID | Category | Description | Implementation Target |
|---|---|---|---|
| **US-6** | User Story | Verify Agency (UC-ACC-06): HDT Admin reviews a pending Agency registration so that only reviewed Agencies receive platform access. | Entire slice |
| **F-AUTH-18** / **FR-018** | Function / FR | HDT reviews initial Tour Agency registrations (or major changes). HDT may select `Approve`, `Request More Information`, or `Reject`. When Approve: account status becomes `Approved`. When Request More Information: account remains `Pending Approval`, comments recorded, single-use 24h edit token issued. When Reject: account status becomes `Rejected` and rejection reason is recorded. Notifications sent via email & in-app. | `src/lib/agency-review.ts`, `src/app/api/admin/agency-reviews/route.ts` |
| **BR-002** | Business Rule | Every self-registered Agency starts in Pending Approval. HDT review is mandatory before login access. | `src/lib/agency-review.ts` |
| **BR-003** | Business Rule | Agency login is permitted only when account status is Approved. | Handled in US-2; unblocked by US-6 Approve |
| **BR-014** | Business Rule | Request More Information does not create a new Agency account status; the account remains Pending Approval. | `src/lib/agency-review.ts` |
| **BR-016** | Business Rule | A resubmission token is single-use and expires in 24 hours. | `src/lib/agency-review.ts` |
| **AS-1** | Acceptance Scenario | Given a Pending Approval Agency, when HDT selects Approve, then status becomes Approved and the Agency becomes eligible to log in. | `tests/business/fr018-verify-agency.test.ts` |
| **AS-2** | Acceptance Scenario | When HDT selects Request More Information, the account remains Pending Approval, requested changes recorded, and Agency receives secure edit link. | `tests/business/fr018-verify-agency.test.ts` |
| **AS-3** | Acceptance Scenario | When HDT selects Reject, status becomes Rejected and rejection reason is recorded. | `tests/business/fr018-verify-agency.test.ts` |
| **VER119** | Screen | Account Information — Read-only account overview (`user_id`, `role`, `status`, `organization`, `created_date`, `last_login`, Submitted profile tab to VER146, Close to ADM095). | `src/app/admin/verify/account/page.tsx` |
| **VER146** | Screen | View Submitted Profile — Read-only submission profile, documents, review history; decision dropdown (Approve, Request More Information, Reject), review comment, Submit review button, Account info tab to VER119, Close to ADM095. | `src/app/admin/verify/review/page.tsx` |
| **ADM095** | Screen (Placeholder) | User Management minimal placeholder showing screen ID and name. | `src/app/admin/users/page.tsx` |

---

## Summary

Implement **US-6 (P1): Verify Agency** (UC-ACC-06), covering F-AUTH-18 / FR-018, acceptance scenarios AS-1, AS-2, and AS-3, and screens VER119 and VER146.
- HDT Admins review Agency registrations in `agency_registration_requests` / `agency_profiles`.
- Review Decisions:
  1. **Approve**: Updates `user_accounts.account_status = 'Approved'`, `agency_registration_requests.current_status = 'Approved'`, records review decision in `agency_review_records`, and writes email notification to `var/outbox/`.
  2. **Request More Information**: Requires review comments. Sets `agency_registration_requests.current_status = 'Request More Information'` while keeping `user_accounts.account_status = 'Pending Approval'` (per BR-014). Generates a 24-hour single-use token in `registration_resubmission_tokens`. Records review in `agency_review_records` and writes notification to `var/outbox/`.
  3. **Reject**: Requires review comments. Sets `user_accounts.account_status = 'Rejected'`, `agency_registration_requests.current_status = 'Rejected'`, records review in `agency_review_records`, and writes notification to `var/outbox/`.
- Screen `VER119` renders read-only account metadata with navigation to `VER146`.
- Screen `VER146` renders the submitted profile, supporting documents, review history, and decision form.
- Screen `ADM095` placeholder created per Anti-invention rule 4.

---

## Technical Context

**Language/Version**: TypeScript `5.9.3` on Node.js `≥ 22.0.0`
**Primary Dependencies**: Next.js 16.4.0, React 19, `pg`, `vitest` (no new dependencies).
**Storage**: PostgreSQL tables `agency_registration_requests`, `registration_submission_versions`, `agency_profiles`, `user_accounts`, `agency_review_records`, `registration_resubmission_tokens`, `stored_files`, `registration_documents`.
**Testing**: Vitest (`npm test` = `vitest run`). Disposable test database created via `createTestDb(TEST_DB_NAME)`.

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Spec is Source of Truth | ✅ PASS | Traced to `spec-AUT.md` US-6, FR-018, BR-002, BR-003, BR-014, BR-016 and screens VER119, VER146. |
| II. Business Rules are Test-First | ✅ PASS | Automated tests covering all three decisions (Approve, Request More Information, Reject), token generation, comment requirements, and status enforcement written and run before code. |
| III. Thin Vertical Slices | ✅ PASS | US-6 only. |
| IV. Synthetic Data and No Secrets | ✅ PASS | Disposable test DB; outbox emails written to `var/outbox/`. |
| V. Humans Approve Every Change | ✅ PASS | On branch `001-aut-registration`; no push/merge. |

---

## Complexity Tracking / Placeholders

| Placeholder Screen | Module Owner | Minimal Content | Reason |
|---|---|---|---|
| `ADM095` | Admin (ADM) | "Screen ID: ADM095 — User Management" | Target for Close / Back buttons from VER119 and VER146. |
