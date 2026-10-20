# API Contracts: AUT — Register Tour Agency Account (US-1)

*Phase 1 output of `/speckit-plan`. Describes all server-facing interfaces for
the US-1 registration slice. Field definitions are authoritative in
`docs/spec/specs/spec-AUT.md §5.1` and `data/04-data-model.md`.*

---

## Overview

US-1 exposes two server interfaces:

| Interface | Type | Path | FR |
|---|---|---|---|
| Submit Registration | POST Route Handler | `POST /api/register` | F-AUTH-02, F-AUTH-03 |
| Verify OTP | Server Action (or POST route) | `POST /api/register/verify-otp` | F-AUTH-23 |

Screen REG116 (Registration Status) is a read-only confirmation page rendered
from state; it has no additional server call.

---

## `POST /api/register` — Submit Registration (FR-002, FR-003)

**Source**: `src/app/api/register/route.ts`  
**Content-Type**: `multipart/form-data` (file upload present)  
**Actor**: Guest (unauthenticated)

### Request fields

All fields are validated server-side by the Zod schema in `lib/validation.ts`
before the database is touched.

| Field | Type | Required | Validation (from FR-002) |
|---|---|---|---|
| `full_name` | String | Yes | max 100 chars |
| `email` | Email string | Yes | RFC 5321, max 254 chars |
| `password` | String | Yes | 8–64 chars; ≥1 upper, ≥1 lower, ≥1 digit, ≥1 special; no whitespace |
| `confirm_password` | String | Yes | must exactly match `password` |
| `company_name` | String | Yes | max 255 chars |
| `company_type` | Enum | Yes | one of `Travel Agency`, `Tour Operator`, `TMC` |
| `tax_id` | String | Yes | exactly 10 or 13 numeric digits |
| `location.street` | String | Yes | — |
| `location.ward` | String | Yes | — |
| `location.district` | String | Yes | — |
| `location.city_province` | String | Yes | — |
| `contact_information.contact_person_name` | String | Yes | — |
| `contact_information.phone_number` | String | Yes | 10–15 digits, optional leading `+` |
| `contact_information.business_email` | Email string | No | RFC 5321 |
| `team_size` | Integer | Yes | ≥ 1 |
| `tour_types` | Array of Enum | Yes | ≥ 1 of `Cultural/Heritage`, `Craft Village/Experiential`, `Culinary`, `Educational/Study Tour`, `Corporate/MICE`, `Family/Leisure`, `Other` |
| `registration_documents` | File[] | Yes | ≥ 1 file; each PDF/JPG/JPEG/PNG; ≤ 10 MB/file; ≤ 5 files total; Business Registration Certificate must be present |

### Success response — `201 Created`

```json
{
  "registration_request_id": "<uuid>",
  "is_valid": true
}
```

The `registration_request_id` is opaque. The client stores it in session state
to pass to the OTP verification step.

### Error response — `422 Unprocessable Entity`

```json
{
  "is_valid": false,
  "validation_errors": [
    { "field": "email", "message": "Email already exists" },
    { "field": "tax_id", "message": "Must be 10 or 13 numeric digits" }
  ]
}
```

### Server-side logic (not returned to client)

- Password is hashed with bcryptjs (cost 12) and stored in
  `agency_registration_requests.pending_password_hash`.
- Document files are written to `var/uploads/{registration_request_id}/`.
- File metadata is inserted into `stored_files` and
  `registration_documents` (linked to `registration_submission_versions.version_no = 1`).
- `agency_registration_requests.current_status` is set to `'Awaiting OTP'`.
- An OTP challenge is immediately issued (see [otp.md](otp.md)).

---

## `POST /api/register/verify-otp` — Verify OTP (FR-023)

**Source**: `src/app/api/register/verify-otp/route.ts` (or Server Action)  
**Content-Type**: `application/json`  
**Actor**: Guest (unauthenticated, holds `registration_request_id` from
previous step)

### Request body

```json
{
  "registration_request_id": "<uuid>",
  "otp_code": "123456"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `registration_request_id` | UUID string | Yes | must match an `Awaiting OTP` request |
| `otp_code` | String | Yes | exactly 6 numeric digits |

### Success response — `200 OK`

```json
{
  "otp_verified": true,
  "user_id": "<uuid>",
  "agency_account_id": "<uuid>",
  "account_status": "Pending Approval",
  "confirmation_email_status": "Success"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `otp_verified` | Boolean | Yes | Always `true` on this path; server-computed only |
| `user_id` | UUID | Yes | Newly created `user_accounts.user_id` |
| `agency_account_id` | UUID | Yes | Newly created `agency_profiles.agency_id` |
| `account_status` | `"Pending Approval"` | Yes | Fixed value for Tour Agency self-registration |
| `confirmation_email_status` | `"Success"` \| `"Fail"` | Yes | Reflects whether the confirmation stub was successfully written to `var/outbox/`. **`"Fail"` does NOT roll back the account** — the DB transaction commits before the outbox write is attempted. The client must display the REG116 status page regardless of this field value; a `"Fail"` result means the developer outbox file was not written but the registration is complete. |

On success the server performs the following steps **in order**:

1. Marks the `registration_otp_challenges` row as `used_at = now()`.
2. Inserts `user_accounts` (`account_status = 'Pending Approval'`, `role_code = 'Tour_Agency'`).
3. Inserts `agency_profiles` (populated from `registration_submission_versions.version_no = 1` for this request).
4. Writes one `audit_logs` row: `action = 'AGENCY_REGISTRATION_COMPLETED'`, `target_type = 'UserAccount'`, `target_id = <new user_id>`, `actor_user_id = <new user_id>`, `change_or_result = {"status":"Pending Approval"}`.
5. Updates `agency_registration_requests.current_status = 'Pending Approval'` and sets `agency_user_id`.
6. **Commits the transaction** (steps 1–5 are atomic; if any step fails the whole transaction rolls back).
7. Attempts to write a confirmation stub to `var/outbox/` — this happens **after** commit and is non-transactional; its success or failure is reported in `confirmation_email_status`.

### Error responses

| HTTP status | Condition | `error_message` value |
|---|---|---|
| `400` | OTP wrong but attempts remain | `"Invalid OTP"` |
| `400` | OTP expired (> 10 min) | `"Expired OTP"` |
| `429` | 5 attempts exhausted | `"Maximum Attempts Exceeded"` |
| `429` | Resend requested when limit reached | `"Resend Limit Exceeded"` |
| `422` | Any other verification failure | `"Verification Failed"` |

Error response body:

```json
{
  "otp_verified": false,
  "error_message": "Invalid OTP"
}
```

**Security note**: `otp_verified` is a server-computed result. The client must
not send a boolean to assert verification (FR-023 contract).

---

## `POST /api/register/resend-otp` — Resend OTP (FR-023)

**Content-Type**: `application/json`  
**Actor**: Guest

### Request body

```json
{
  "registration_request_id": "<uuid>"
}
```

### Success response — `200 OK`

```json
{ "resent": true }
```

The old active OTP is invalidated (`invalidated_at = now()`); a new challenge
is inserted with `resend_sequence` incremented. A new JSON stub is written to
`var/outbox/`. Returns `429` when `resend_sequence` would exceed 3.

---

## Navigation pages (no API contract — server-rendered)

| Screen | Path | Render type |
|---|---|---|
| REG003 — Agency Registration | `/register` | Server Component + Client form |
| REG115 — OTP Verification | `/register/otp` | Server Component + Client form |
| REG116 — Registration Status | `/register/status` | Server Component (read from session state) |
