# Implementation Plan: US-3 Log Out

**Branch**: `001-aut-registration` | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `docs/spec/specs/spec-AUT.md` §3 (US-3), §5 (FR-009), §5.1 (FR-009 I/O contract), §5.2 (BR-012, BR-013) and `docs/spec/screens/screen-spec-AUT026.md`.

---

## Scope Table

| Item ID | Category | Description | Implementation Target |
|---|---|---|---|
| **US-3** | User Story | Log Out (UC-ACC-03): Authenticated member ends active session and returns to login. | Entire slice |
| **F-AUTH-09** / **FR-009** | Function / FR | Invalidates current user session and authentication token upon logout request (`revoked_at = now()`), displays confirmation message, clears browser session data (removes `session_token` cookie), returns redirect URL to `/login`. | `src/lib/auth.ts`, `src/app/api/auth/logout/route.ts` |
| **AUT026** | Screen | Logout Confirmation dialog with Heading "Logout Confirmation", "Confirm logout" button (invalidates server session and navigates to AUT009 `/login`), and "Cancel" button (stays / no session change). | `src/app/logout/page.tsx` |
| **AS-1** | Acceptance Scenario | Given an authenticated member confirms Logout, when logout completes, then the active session is terminated and the member is returned to Login. | `tests/business/fr009-logout.test.ts`, `src/app/logout/page.tsx` |
| **AS-2** | Acceptance Scenario | Given the terminated session is reused, then protected access is denied. | `tests/business/fr009-logout.test.ts` |
| **BR-012** / **BR-013** | Business Rule | Active access is invalidated; reusing revoked token results in denied access / forced logout. | `src/lib/auth.ts` (`verifySession`) |

---

## Summary

Implement **US-3 (P3): Log Out** (UC-ACC-03), covering F-AUTH-09 / FR-009, acceptance scenarios AS-1 and AS-2, and screen AUT026. Authenticated users (Tour Agency, Local Provider, HDT Admin, UBND Admin) can log out by confirming on AUT026 or calling the logout API.
- Upon logout confirmation, `POST /api/auth/logout` is called with the current `session_token` (from cookie or Bearer header).
- The server updates `sessions` table setting `revoked_at = CURRENT_TIMESTAMP` for the matching token hash.
- The `session_token` cookie is cleared (`max-age=0` / deleted).
- Response returns `{ session_terminated: true, confirmation_message: "Logged out successfully", redirect_url: "/login" }`.
- Any subsequent use of the terminated session token with `verifySession` (FR-017 / `GET /api/auth/session`) returns `validation_result = "Status Changed"` or `force_logout = true`, denying further protected access.
- Screen `AUT026` renders a confirmation dialog with heading "Logout Confirmation", "Confirm logout" button, and "Cancel" button.

All other user stories are out of scope.

---

## Technical Context

**Language/Version**: TypeScript `5.9.3` on Node.js `≥ 22.0.0`

**Primary Dependencies** (no new dependencies added):
- `next` 16.4.0 (App Router, src/ layout)
- `react` 19.3.0
- `react-dom` 19.3.0
- `pg` 8.23.1 (PostgreSQL client via `src/lib/db.ts`)
- `vitest` 5.0.4 (`npm test` = `vitest run`)

**Storage**: PostgreSQL table `sessions` (`session_id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`).

**Testing**: Vitest `5.0.4`; `npm test` runs `vitest run`. Disposable test database created using `createTestDb(TEST_DB_NAME)` in `tests/business/helpers/db.ts`.

**Target Platform**: Node.js on Windows / Linux / macOS.

**Project Type**: Next.js App Router web application.

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Spec is Source of Truth | ✅ PASS | Requirements strictly derived from `docs/spec/specs/spec-AUT.md` US-3, FR-009, and `screen-spec-AUT026.md`. |
| II. Business Rules are Test-First | ✅ PASS | `tests/business/fr009-logout.test.ts` will test session revocation, cookie clearance, and reuse rejection before code implementation. |
| III. Thin Vertical Slices | ✅ PASS | US-3 only. Builds directly onto `src/lib/auth.ts` created in US-2. |
| IV. Synthetic Data and No Secrets | ✅ PASS | Test runs inside disposable test DB; no hardcoded passwords or tokens committed. |
| V. Humans Approve Every Change | ✅ PASS | On branch `001-aut-registration`; no push/merge. |

---

## Complexity Tracking / Placeholders

| Item | Reason |
|---|---|
| No new placeholders required | All destination screens (`AUT009` `/login`) are already implemented. |
