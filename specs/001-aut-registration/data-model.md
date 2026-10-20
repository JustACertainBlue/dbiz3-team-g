# Data Model: AUT — Register Tour Agency Account (US-1)

*Phase 1 output of `/speckit-plan`. Read-only reference for this slice.*

> **Canonical data model**: [`data/04-data-model.md`](../../data/04-data-model.md)
> **Canonical schema**: [`data/schema.sql`](../../data/schema.sql)
> **Canonical data dictionary**: [`data/07-data-dictionary.md`](../../data/07-data-dictionary.md)
>
> This file **does not redefine any field**. It lists which tables this slice
> reads or writes, and traces every access to the FR or BR that requires it.
> All column names, types, constraints and relationships are authoritative in
> `data/` only.

---

## Tables touched by US-1 (F-AUTH-01 to F-AUTH-04, F-AUTH-23)

| Table | Access | Function / Rule | Purpose in this slice |
|---|---|---|---|
| `user_accounts` | READ | F-AUTH-03 | Duplicate email check |
| `user_accounts` | WRITE (INSERT) | F-AUTH-04 | Create Tour Agency account with `account_status = 'Pending Approval'` |
| `agency_registration_requests` | WRITE (INSERT) | F-AUTH-02 | Create server-side registration request after validation |
| `agency_registration_requests` | READ | F-AUTH-23 | Look up request for OTP challenge |
| `agency_registration_requests` | WRITE (UPDATE) | F-AUTH-04, F-AUTH-23 | Update `current_status` (Awaiting OTP → Pending Approval) and `agency_user_id` after account creation |
| `registration_submission_versions` | WRITE (INSERT) | F-AUTH-02, F-AUTH-04 | Store one immutable snapshot of the validated registration data |
| `registration_otp_challenges` | WRITE (INSERT) | F-AUTH-23 | Issue a new OTP challenge for the registration request |
| `registration_otp_challenges` | READ | F-AUTH-23 | Look up active challenge to verify the OTP |
| `registration_otp_challenges` | WRITE (UPDATE) | F-AUTH-23 | Mark challenge as used (`used_at`) or increment `attempt_count`; set `invalidated_at` on resend |
| `stored_files` | WRITE (INSERT) | F-AUTH-02 | Record metadata for each uploaded registration document |
| `registration_documents` | WRITE (INSERT) | F-AUTH-02, F-AUTH-04 | Link stored files to the registration submission version |

### Tables read by F-AUTH-01 (display only — no DB access)

F-AUTH-01 renders the registration form (REG003). It is a display-only function
with no database interaction.

### Tables NOT touched by this slice

All other tables in `data/schema.sql` — including `sessions`, `agency_profiles`,
`password_reset_tokens`, and all non-registration tables — are **not read or
written** by US-1. They are present in the seeded test database and must not be
altered by tests.

---

## Business rules enforced through DB constraints (automatic)

The following BR from `docs/spec/specs/spec-AUT.md §5.2` are enforced by
constraints in `data/schema.sql` and are verified by the business-rule tests:

| Rule | Constraint in schema | Test that verifies |
|---|---|---|
| BR-001 — Agency only can self-register | `user_accounts.role_code` CHECK — only `'Tour_Agency'` can be in `'Pending Approval'` status | `fr004-create-account.test.ts` |
| BR-002 — New Agency starts Pending Approval | `user_accounts.user_status_by_role_chk` + INSERT sets `account_status = 'Pending Approval'` | `fr004-create-account.test.ts` |
| Duplicate email | `user_accounts_email_uq` unique index on `lower(email)` | `fr003-duplicate-email.test.ts` |
| OTP attempt limit (5) | `registration_otp_challenges.otp_attempt_chk` CHECK `(attempt_count BETWEEN 0 AND 5)` | `fr023-otp.test.ts` |
| OTP resend limit (3) | `registration_otp_challenges.otp_resend_chk` CHECK `(resend_sequence BETWEEN 0 AND 3)` | `fr023-otp.test.ts` |
| One active OTP per request | `registration_one_active_otp_uq` unique partial index | `fr023-otp.test.ts` |
| OTP expires 10 min | `registration_otp_challenges.otp_expiry_chk` CHECK `(expires_at = issued_at + interval '10 minutes')` | `fr023-otp.test.ts` |
| Tax ID format | `agency_registration_requests` (via `registration_submission_versions.tax_id`) + Zod schema | `fr002-validation.test.ts` |
| Password complexity | Zod validation in `lib/validation.ts` (not a DB constraint — enforced at API layer) | `fr002-validation.test.ts` |
| File size/type | Zod + multipart handler in `lib/files.ts` | `fr002-validation.test.ts` |

---

## Key status transitions for this slice

```
agency_registration_requests.current_status:
  (row created) → 'Awaiting OTP'   [F-AUTH-02: after validation succeeds]
  'Awaiting OTP' → 'Pending Approval' [F-AUTH-04: after OTP verified]

user_accounts.account_status (Tour_Agency):
  (row created) → 'Pending Approval'  [F-AUTH-04]
```

No other status transitions occur in this slice. HDT review transitions
(`Approved`, `Rejected`, `Request More Information`) belong to US-6 / F-AUTH-18.
