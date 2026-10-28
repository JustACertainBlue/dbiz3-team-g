# Research & Technical Decisions: US-4 Forgot Password

## Decisions & Rationale

### 1. Token Generation and Format (F-AUTH-11)
- **Decision**: Generate cryptographically secure random token (32-byte hex string via `crypto.randomBytes(32).toString('hex')`).
- **Storage**: Store in `password_reset_tokens` (`token_id = gen_random_uuid()`, `user_id`, `token_verifier = token`, `issued_at = now()`, `expires_at = now() + interval '15 minutes'`). Notice schema constraint: `CONSTRAINT reset_token_expiry_chk CHECK (expires_at = issued_at + interval '15 minutes')`.
- **Rationale**: Strict compliance with schema.sql and FR-011.

### 2. User Enumeration Protection (F-AUTH-11 / FR-011)
- **Decision**: Always return the generic result message: `"If an account exists for this email, a password reset link has been sent."` whether the email exists in `user_accounts` or not. Never return the token or token link in API response.
- **Rationale**: Required by FR-011 and security best practices.

### 3. Dev Outbox Link Delivery
- **Decision**: In development / local testing, write reset emails to `var/outbox/reset-<token_id>.txt` containing:
  - Recipient email
  - Token
  - Reset link: `http://localhost:3000/reset-password?token=<token>`
- **Rationale**: Reuses the dev outbox pattern from US-1 registration without needing an external mail server.

### 4. Rate Limiting (FR-011)
- **Decision**: Limit requests to max 3 per email and max 5 per IP in a 15-minute window.
- **Rationale**: Explicitly specified in FR-011 input/output contract.

### 5. Password Complexity Validation & Token Invalidation (F-AUTH-12 / FR-012 / BR-006)
- **Decision**: Validate new password has 8–64 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character, with no whitespace. On success, in a single SQL transaction:
  1. Verify token exists, `used_at IS NULL`, and `now() <= expires_at`.
  2. Hash new password with `bcryptjs`.
  3. Update `user_accounts.password_hash`, `password_changed_at = now()`, `updated_at = now()`.
  4. Update `password_reset_tokens.used_at = now()`.
- **Rationale**: Atomic execution guarantees token cannot be reused (BR-006) even under concurrent requests.

---

## Traceability Check

| Route / File / Exported Symbol | Type | Scope Table ID | Function / Requirement Description |
|---|---|---|---|
| `src/lib/recovery.ts`: `requestPasswordReset` | Exported function | `F-AUTH-11`, `FR-011`, `BR-005` | Generates 15-minute token, writes outbox email, returns generic result |
| `src/lib/recovery.ts`: `validateResetToken` | Exported function | `F-AUTH-12`, `FR-012`, `BR-005`, `BR-006` | Verifies token exists, is unexpired and unconsumed |
| `src/lib/recovery.ts`: `resetPasswordWithToken` | Exported function | `F-AUTH-12`, `FR-012`, `BR-006` | Validates complexity, hashes password, updates account, consumes token |
| `src/lib/recovery.ts`: `validatePasswordComplexity` | Exported function | `FR-012` | Enforces 8–64 chars, upper, lower, digit, special, no whitespace |
| `src/app/api/auth/forgot-password/route.ts`: `POST` | Route handler | `FR-011` | HTTP API for requesting password recovery |
| `src/app/api/auth/reset-password/route.ts`: `GET`, `POST` | Route handler | `FR-012` | HTTP API for validating token and setting new password |
| `src/app/forgot-password/page.tsx`: `ForgotPasswordPage` | Page component | `PAS011`, `FR-010` | Enter Registered Email UI screen |
| `src/app/forgot-password/sent/page.tsx`: `ForgotPasswordSentPage` | Page component | `PAS014`, `FR-011` | Check Your Email confirmation UI screen |
| `src/app/reset-password/page.tsx`: `ResetPasswordPage` | Page component | `PAS142`, `FR-012` | Set New Password UI screen |
| `src/app/reset-password/success/page.tsx`: `ResetPasswordSuccessPage` | Page component | `PAS143`, `FR-012` | Password Updated success UI screen |
