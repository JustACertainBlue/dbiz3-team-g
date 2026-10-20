# OTP Dev-Outbox Contract: AUT — Register Tour Agency Account (US-1)

*Phase 1 output of `/speckit-plan`. Defines the dev-outbox file format used
instead of real email delivery for OTP messages in this slice.*

> **Important**: Real email delivery is out of scope until Session 11.
> This contract describes the local-dev approximation only.
> See `research.md §4` for rationale and `plan.md` Complexity Tracking.

---

## Outbox location

All OTP email stubs are written to:

```
var/outbox/
```

This directory is git-ignored (`var/` in `.gitignore`). It is created
automatically by the application on first use.

---

## File naming

```
var/outbox/{registration_request_id}_{unix_ms}.json
```

Example:
```
var/outbox/a1b2c3d4-0000-0000-0000-000000000001_1728872400000.json
```

Using `registration_request_id` as prefix allows a developer to find the
correct OTP for a registration in progress. Using `unix_ms` suffix ensures
resend events create separate files rather than overwriting the previous one.

---

## File schema

```json
{
  "to": "applicant@example.com",
  "subject": "Your Artisan Bridge verification code",
  "registration_request_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "otp": "123456",
  "expires_at": "2026-10-14T04:00:00.000Z",
  "resend_sequence": 0,
  "created_at": "2026-10-14T03:50:00.000Z"
}
```

| Field | Type | Description |
|---|---|---|
| `to` | string (email) | Recipient address (from registration form) |
| `subject` | string | Fixed email subject line |
| `registration_request_id` | uuid string | Links to `agency_registration_requests` |
| `otp` | string (6 digits) | The plaintext OTP (for dev inspection only; the DB stores a hash) |
| `expires_at` | ISO 8601 datetime | 10 minutes after `created_at`; matches `registration_otp_challenges.expires_at` |
| `resend_sequence` | integer | Which resend this is (0 = first issue, 1 = first resend, max 3) |
| `created_at` | ISO 8601 datetime | When this stub was written |

---

## Security note

The `otp` field is present in the outbox file **only** because this is the dev
stub replacing real email delivery. In production, the OTP travels exclusively
via email to the applicant; the database stores only the verifier hash
(`registration_otp_challenges.otp_verifier`). The plaintext OTP must never
appear in any API response or server log.

---

## How to read the OTP during development

```bash
# macOS / Linux
cat var/outbox/<registration_request_id>_*.json | python3 -m json.tool

# Windows PowerShell
Get-Content var\outbox\<registration_request_id>_*.json | ConvertFrom-Json
```

Or simply open the file in any text editor — it is plain JSON.

---

## Reading OTP in tests

Business-rule tests that exercise OTP verification must **not** read
`var/outbox/`. Instead they should:

1. Query `registration_otp_challenges` directly in the test database to retrieve
   the `otp_verifier` hash.
2. Use `bcryptjs.compare(knownOtp, otp_verifier)` to locate the matching OTP,
   **or** generate the OTP via the same `lib/otp.ts` function called in the
   handler (passing the same random seed when needed).

The recommended approach is to expose a test helper that returns the plaintext
OTP as a return value from `lib/otp.ts` during test execution (controlled by
`NODE_ENV === 'test'`), avoiding any file I/O in tests.
