# Implementation Plan: US-10 Revise and Resubmit Agency Registration

**Branch**: `001-aut-registration` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `docs/spec/specs/spec-AUT.md` §3 (US-10), §5 (FR-026), §5.1 (FR-026 I/O contract), §5.2 (BR-014, BR-016), `docs/spec/screens/screen-spec-REG003.md` and `docs/spec/screens/screen-spec-REG116.md`.

---

## Scope Table

| Item ID | Category | Description | Implementation Target |
|---|---|---|---|
| **US-10** | User Story | Revise and Resubmit Agency Registration (UC-ACC-06): Guest whose Agency registration was marked Request More Information updates requested fields/documents and resubmits for HDT review. | Entire slice |
| **F-AUTH-26** / **FR-026** | Function / FR | Allows a Guest whose Agency registration was marked Request More Information to open a secure single-use edit link valid for 24 hours, update requested registration fields/documents, and resubmit the same registration request for HDT review. Validates token, creates a new submission version (`version_no = current_version_no + 1`), sets request status back to `Pending Approval` (preserving account status as `Pending Approval` per BR-014), invalidates active tokens for the request (BR-016), and sends notification. | `src/lib/resubmission.ts`, `src/app/api/register/resubmit/route.ts` |
| **BR-014** | Business Rule | Request More Information does not create a new Agency account status; the account remains Pending Approval. Resubmission keeps the account in Pending Approval. | `src/lib/resubmission.ts` |
| **BR-016** | Business Rule | A resubmission token is single-use and expires 24 hours after issue. Issuing a replacement or completing resubmission invalidates older active tokens for the same request. | `src/lib/resubmission.ts` |
| **AS-1** | Acceptance Scenario | Given HDT requested more information, when Guest opens valid single-use edit link, current request data is loaded and account remains Pending Approval. | `tests/business/fr026-resubmit-registration.test.ts` |
| **AS-2** | Acceptance Scenario | Given Guest submits corrected fields/documents, when validation succeeds, a new submission version is stored and request returns to Pending Approval for HDT review. | `tests/business/fr026-resubmit-registration.test.ts` |
| **AS-3** | Acceptance Scenario | Given an expired or already-used resubmission token, access is denied and no data is changed. | `tests/business/fr026-resubmit-registration.test.ts` |
| **REG003** | Screen | Agency Registration in secure edit mode (`/register?token=...`): Prefills existing company fields, disables password fields, renders "Resubmit registration" button. | `src/app/register/page.tsx` |
| **REG116** | Screen | Registration Status: Displays confirmation that resubmission was received and is under review. | `src/app/register/status/page.tsx` |

---

## Summary

Implement **US-10 (P1): Revise and Resubmit Agency Registration** (UC-ACC-06), covering F-AUTH-26 / FR-026, acceptance scenarios AS-1, AS-2, AS-3, and secure edit mode on screen REG003.
- When an applicant opens `/register?token=<resubmission_token>`, the page verifies the token:
  - Must exist in `registration_resubmission_tokens`, `used_at IS NULL`, `invalidated_at IS NULL`, and `expires_at > now()`.
  - Loads the latest `registration_submission_versions` row to prefill the registration form.
  - Hides/disables password and email creation fields (since account credentials already exist).
- The user edits fields/documents and clicks "Resubmit registration".
- `POST /api/register/resubmit` processes the update:
  - Increments `current_version_no` in `agency_registration_requests`.
  - Inserts a new row in `registration_submission_versions` with the new version number and updated fields.
  - Updates `agency_profiles` with the new company information.
  - Sets `agency_registration_requests.current_status = 'Pending Approval'` (preserving `user_accounts.account_status = 'Pending Approval'`).
  - Sets `used_at = now()` on the token and invalidates any other active tokens for that request (BR-016).
  - Navigates to REG116 (`/register/status?requestId=...`).
- An expired, invalid, or already-used token is rejected with an appropriate error message and prevents data edits.

---

## Technical Context

**Language/Version**: TypeScript `5.9.3` on Node.js `≥ 22.0.0`
**Primary Dependencies**: Next.js 16.4.0, React 19, `pg`, `zod`, `vitest` (no new dependencies).
**Storage**: PostgreSQL tables `agency_registration_requests`, `registration_resubmission_tokens`, `registration_submission_versions`, `agency_profiles`, `user_accounts`.
**Testing**: Vitest (`npm test` = `vitest run`). Disposable test database created via `createTestDb(TEST_DB_NAME)`.

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Spec is Source of Truth | ✅ PASS | Traced to `spec-AUT.md` US-10, FR-026, BR-014, BR-016 and screens REG003, REG116. |
| II. Business Rules are Test-First | ✅ PASS | Tests for token validation, prefill data fetching, version incrementation, status reset to Pending Approval, and token consumption written and run before code. |
| III. Thin Vertical Slices | ✅ PASS | US-10 only. Extends existing REG003 registration screen into secure edit mode. |
| IV. Synthetic Data and No Secrets | ✅ PASS | Disposable test DB; token generated cryptographically in memory/DB. |
| V. Humans Approve Every Change | ✅ PASS | On branch `001-aut-registration`; no push/merge. |

---

## Complexity Tracking / Placeholders

| Item | Reason |
|---|---|
| No new placeholder screens | REG003 and REG116 were created in US-1 and are reused. |
