# Implementation Plan: US-4 Forgot Password

**Branch**: `001-aut-registration` | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `docs/spec/specs/spec-AUT.md` §3 (US-4), §5 (FR-010, FR-011, FR-012), §5.1, §5.2 (BR-005, BR-006) and screen specs `screen-spec-PAS011.md`, `screen-spec-PAS014.md`, `screen-spec-PAS142.md`, `screen-spec-PAS143.md`.

---

## Scope Table

| Item ID | Category | Description | Implementation Target |
|---|---|---|---|
| **US-4** | User Story | Forgot Password (UC-ACC-04): Member requests a secure reset link valid for 15 minutes to set a new password. | Entire slice |
| **F-AUTH-10** / **FR-010** | Function / FR | Displays the password reset initiation form (PAS011) with Email input field and Send reset link button. | `src/app/forgot-password/page.tsx` (PAS011) |
| **F-AUTH-11** / **FR-011** | Function / FR | Verifies if email exists in DB. Enforces rate limits (3/email and 5/IP per 15min). If known email: stores single-use token in `password_reset_tokens` with 15min expiry, issues recovery email with token link to dev outbox. Always returns the generic result message: "If an account exists for this email, a password reset link has been sent." | `src/lib/recovery.ts`, `src/app/api/auth/forgot-password/route.ts` |
| **F-AUTH-12** / **FR-012** | Function / FR | Validates recovery token exists, is unexpired and unused. Validates new password complexity (8-64 chars, uppercase, lowercase, number, special char, no whitespace) and confirmation match. Atomically updates password_hash (bcrypt) and invalidates token (`used_at = now()`). | `src/lib/recovery.ts`, `src/app/api/auth/reset-password/route.ts` |
| **BR-005** | Business Rule | Password recovery uses token link only, valid for 15 minutes; OTP is not used. | `src/lib/recovery.ts` |
| **BR-006** | Business Rule | A used password-reset token cannot be reused. | `src/lib/recovery.ts` |
| **PAS011** | Screen | Enter Registered Email screen. | `src/app/forgot-password/page.tsx` |
| **PAS014** | Screen | Check Your Email confirmation screen. | `src/app/forgot-password/sent/page.tsx` |
| **PAS142** | Screen | Set New Password screen (token link target). | `src/app/reset-password/page.tsx` |
| **PAS143** | Screen | Password Updated success confirmation screen. | `src/app/reset-password/success/page.tsx` |

---

## Summary

Implement **US-4 (P2): Forgot Password** (UC-ACC-04), covering F-AUTH-10, F-AUTH-11, F-AUTH-12, and screens PAS011, PAS014, PAS142, and PAS143.
A member enters their email on PAS011. If the email exists, the system creates a 15-minute token in `password_reset_tokens` and writes a reset link email to `var/outbox/`. Regardless of whether the email exists, the API and UI respond with the same generic message and navigate to PAS014. Opening the token link on PAS142 enables entering a new password with complexity validation. Upon submission, the password hash is updated and the token is consumed (`used_at = now()`). The user is redirected to PAS143 with a "Sign in" button leading back to AUT009.

---

## Technical Context

**Language/Version**: TypeScript `5.9.3` on Node.js `≥ 22.0.0`

**Primary Dependencies** (no new dependencies added):
- `next` 16.4.0 (App Router, src/ layout)
- `react` 19.3.0
- `react-dom` 19.3.0
- `pg` 8.23.1 (via `src/lib/db.ts`)
- `bcryptjs` 3.0.3 (via `src/lib/password.ts`)
- `vitest` 5.0.4

**Storage**: PostgreSQL tables `user_accounts`, `password_reset_tokens`. Local outbox directory `var/outbox/`.

**Testing**: Vitest `5.0.4`. Disposable test database via `createTestDb(TEST_DB_NAME)`.

**Target Platform**: Node.js on macOS / Windows.

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Spec is Source of Truth | ✅ PASS | Requirements traced to `docs/spec/specs/spec-AUT.md` US-4, FR-010..012, BR-005, BR-006, screens PAS011, PAS014, PAS142, PAS143. |
| II. Business Rules are Test-First | ✅ PASS | Automated tests for token generation, 15-minute expiry, single-use enforcement, password complexity, and generic enumeration prevention written first. |
| III. Thin Vertical Slices | ✅ PASS | US-4 only. Reuses `src/lib/db.ts` and `src/lib/password.ts`. |
| IV. Synthetic Data and No Secrets | ✅ PASS | Test accounts created in disposable DB; tokens in dev outbox. |
| V. Humans Approve Every Change | ✅ PASS | On branch `001-aut-registration`. |

---

## Complexity Tracking / Placeholders

No placeholder screens required for US-4 (PAS011, PAS014, PAS142, PAS143 are all owned by AUT module).
