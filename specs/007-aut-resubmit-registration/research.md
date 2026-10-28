# Research & Design Decisions: US-10 Revise and Resubmit Agency Registration

## Decisions & Alternatives

### 1. Secure Edit Mode Integration on REG003
- **Decision**: In `src/app/register/page.tsx`, check for `searchParams.get("token")`. If present, fetch `/api/register/resubmit?token=<token>`. When valid:
  - Populate form state from `latest_submission_data`.
  - Hide or disable password and confirm_password fields.
  - Display "Resubmit registration" button instead of "Continue to email verification".
- **Why chosen**: Directly specified by `docs/spec/screens/screen-spec-REG003.md` (§1 & §3 element 16).

### 2. Multi-Version Storage
- **Decision**: When resubmitting, `version_no` increments by 1. A new row is inserted into `registration_submission_versions`. The request `current_version_no` is updated, preserving all previous versions and review history.
- **Why chosen**: Matches `data/schema.sql` primary key `(registration_request_id, version_no)` on `registration_submission_versions`.

---

## Interpretations & Proposed Open Questions

### Interpretations
1. **Notifications on Resubmission**: FR-026 output field `notification_status` includes `in_app` and `email`. In the absence of an in-app notification module, an outbox entry is recorded in `var/outbox/` to notify HDT of the resubmission.

---

## Traceability Table

| Scope ID | Component / Route / Export | File | Notes |
|---|---|---|---|
| **F-AUTH-26** / **FR-026** | `validateResubmissionToken` | `src/lib/resubmission.ts` | Validates token expiry and usage |
| **F-AUTH-26** / **FR-026** | `getResubmissionData` | `src/lib/resubmission.ts` | Loads latest version data for edit mode |
| **F-AUTH-26** / **FR-026** | `resubmitRegistration` | `src/lib/resubmission.ts` | Stores new version, resets status, invalidates tokens |
| **F-AUTH-26** / **FR-026** | `GET /api/register/resubmit` | `src/app/api/register/resubmit/route.ts` | Token verification & prefill endpoint |
| **F-AUTH-26** / **FR-026** | `POST /api/register/resubmit` | `src/app/api/register/resubmit/route.ts` | Resubmission mutation endpoint |
| **REG003** | Agency Registration Screen | `src/app/register/page.tsx` | Secure edit mode when token parameter is present |
| **REG116** | Registration Status Screen | `src/app/register/status/page.tsx` | Landing screen after successful resubmission |
| **AS-1** | Acceptance Scenario 1 | `tests/business/fr026-resubmit-registration.test.ts` | Tests token load & Pending Approval preservation |
| **AS-2** | Acceptance Scenario 2 | `tests/business/fr026-resubmit-registration.test.ts` | Tests new version creation & return to HDT review |
| **AS-3** | Acceptance Scenario 3 | `tests/business/fr026-resubmit-registration.test.ts` | Tests expired/used token rejection |
