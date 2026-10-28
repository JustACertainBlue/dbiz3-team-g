# Implementation Plan: US-2 Log In

**Branch**: `001-aut-registration` | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `docs/spec/specs/spec-AUT.md` §3 (US-2), §5 (FR-005 to FR-008, FR-015, FR-017), §5.1, §5.2 (BR-003, BR-004, BR-011, BR-012) and `docs/spec/screens/screen-spec-AUT009.md`.

---

## Scope Table

| Item ID | Category | Description | Implementation Target |
|---|---|---|---|
| **US-2** | User Story | Log In (UC-ACC-02): Member logs in to access permitted role functions and data. | Entire slice |
| **F-AUTH-05** / **FR-005** | Function / FR | Displays login interface with Email and Password inputs, Login button, Forgot password link, Register link. | `src/app/login/page.tsx` (AUT009) |
| **F-AUTH-06** / **FR-006** | Function / FR | Captures email and password, executes empty-field check before DB authentication. | `src/lib/auth.ts`, `src/app/api/auth/login/route.ts` |
| **F-AUTH-07** / **FR-007** | Function / FR | Compares password against DB using secure hashing (bcryptjs). Verifies account status: Agency = "Approved" only; ADMIN/Local_Provider = "Active" only. Denies "Pending Approval", "Rejected", "Disabled". Retrieves role, admin_type, permission set, creates opaque session token in `sessions` table. | `src/lib/auth.ts`, `src/app/api/auth/login/route.ts` |
| **F-AUTH-08** / **FR-008** | Function / FR | Returns role-specific landing screen ID: Tour_Agency -> `EXP017`, ADMIN -> `ADM079`, Local_Provider -> `DSH018`. If must_change_password=true returns `ACC129`. | `src/lib/auth.ts`, `src/app/api/auth/login/route.ts` |
| **F-AUTH-15** / **FR-015** | Function / FR | Initializes RBAC permission context from `role_permissions` and `permissions` tables based on user role and admin_type. | `src/lib/auth.ts` |
| **F-AUTH-17** / **FR-017** | Function / FR | Verifies active session token, account status and role consistency; forces logout if account is disabled or session revoked/expired. | `src/lib/auth.ts`, `src/app/api/auth/session/route.ts` |
| **BR-003** | Business Rule | Agency login is permitted only when account status is Approved. | `src/lib/auth.ts` |
| **BR-004** | Business Rule | HDT, UBND and Local Provider login requires Active status. | `src/lib/auth.ts` |
| **BR-011** | Business Rule | Permission checks require both role permission and resource/data scope. | `src/lib/auth.ts` |
| **BR-012** | Business Rule | Account status and role consistency are revalidated on critical actions and session check. | `src/lib/auth.ts` |
| **AUT009** | Screen | Login screen with Email, Password, Login button, Forgot Password link, Register link. | `src/app/login/page.tsx` |
| **ADM079** | Screen (Placeholder) | Admin Dashboard minimal placeholder showing screen ID and name. | `src/app/admin/dashboard/page.tsx` |
| **EXP017** | Screen (Placeholder) | Explore minimal placeholder showing screen ID and name. | `src/app/explore/page.tsx` |
| **DSH018** | Screen (Placeholder) | Local Provider Dashboard minimal placeholder showing screen ID and name. | `src/app/provider/dashboard/page.tsx` |

---

## Summary

Implement **US-2 (P2): Log In** (UC-ACC-02), covering F-AUTH-05, F-AUTH-06, F-AUTH-07, F-AUTH-08, F-AUTH-15, and F-AUTH-17, and screen AUT009. Registered members (Tour Agency, Local Provider, HDT Admin, UBND Admin) authenticate with email and password. Credentials and account status are verified against PostgreSQL:
- Tour Agency requires `account_status = 'Approved'` (BR-003).
- ADMIN (HDT/UBND) and Local Provider require `account_status = 'Active'` (BR-004).
- Ineligible statuses (`Pending Approval`, `Rejected`, `Disabled`) are rejected with spec-defined error messages.
- On success, an opaque session is recorded in `sessions`, permissions are loaded from `role_permissions`, and the user is redirected to their role landing screen (EXP017, ADM079, DSH018).

All other user stories (US-1 already done; US-3 to US-10) are out of scope.

---

## Technical Context

**Language/Version**: TypeScript `5.9.3` on Node.js `≥ 22.0.0`

**Primary Dependencies** (no new dependencies added):
- `next` 16.4.0 (App Router, src/ layout)
- `react` 19.3.0
- `react-dom` 19.3.0
- `pg` 8.23.1 (PostgreSQL client via `src/lib/db.ts`)
- `bcryptjs` 3.0.3 (Password verification via `src/lib/password.ts`)
- `zod` 4.6.7 (Input validation)
- `vitest` 5.0.4 (`npm test` = `vitest run`)

**Storage**: PostgreSQL tables `user_accounts`, `roles`, `permissions`, `role_permissions`, `sessions`, `ubnd_village_assignments`.

**Testing**: Vitest `5.0.4`; `npm test` runs `vitest run`. Disposable test database created using `createTestDb(TEST_DB_NAME)` in `tests/business/helpers/db.ts`.

**Target Platform**: Node.js on macOS / Windows (free tools, PostgreSQL).

**Project Type**: Next.js App Router web application.

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Spec is Source of Truth | ✅ PASS | All requirements traced to `docs/spec/specs/spec-AUT.md` US-2, FR-005..008, FR-015, FR-017, screen AUT009. |
| II. Business Rules are Test-First | ✅ PASS | Automated tests for empty fields, invalid credentials, BR-003, BR-004, session creation, permission loading, and role routing are written and run before code. |
| III. Thin Vertical Slices | ✅ PASS | US-2 only. Reuses existing `src/lib/db.ts` and `src/lib/password.ts`. |
| IV. Synthetic Data and No Secrets | ✅ PASS | Seed schema + disposable test DB. Seed hashes are placeholders; tests create test accounts with bcryptjs hashes. |
| V. Humans Approve Every Change | ✅ PASS | Working on branch `001-aut-registration`; no push or merge without team review. |

---

## Complexity Tracking / Placeholders

| Placeholder Screen | Module Owner | Minimal Content | Reason |
|---|---|---|---|
| `ADM079` | Admin Dashboard (ADM) | "Screen ID: ADM079 — Admin Dashboard" | Landing screen for ADMIN (HDT / UBND) |
| `EXP017` | Explore (EXP) | "Screen ID: EXP017 — Explore" | Landing screen for Tour Agency |
| `DSH018` | Provider Dashboard (DSH) | "Screen ID: DSH018 — Local Provider Dashboard" | Landing screen for Local Provider |
