# Contract: Create Booking (F-SCHED-03)

`POST /api/bkg/bookings` — used by screen BKG134. Source: spec-BKG §5.1 FR-003.

## Actor

From the demo session cookie `hab_demo_account` (`demoSessionFromRequest`). Only a session with
`role = LocalProvider` and a `providerId` may call it (BR-001). Every other role → `403`, nothing written.

## Request body (JSON)

| Field | Type | Required | Validation |
|---|---|---|---|
| `experience_id` | uuid | Yes | exists, not archived, owned by the session Provider (BR-018) |
| `agency_id` | uuid | Yes | exists in `agency_profiles`, and that Agency's `user_accounts.account_status` is `Approved` (spec #39) |
| `start_at` | ISO 8601 date-time with offset | Yes | whole interval inside one operating-hours window (Clarifications #28/#29/#31) |
| `duration` | integer minutes | Yes | > 0, need not equal the Experience's duration (spec #38); stored as `duration_minutes` |
| `group_size` | integer | Yes | 1 ≤ value ≤ Experience `max_participants` (OQ #7) |
| `agreed_price` | decimal VND | Yes | > 0, total for the group (OQ #8); stored as `agreed_price_total` |
| `booking_conditions` | `{ notice_period, cancellation_policy }` | Yes | `notice_period` integer ≥ 0; `cancellation_policy` non-empty object; BKG134 prefills both from the Experience |
| `source_chat_session_id` | uuid | No | stored as given |

## Success `201`

```json
{
  "data": {
    "booking_id": "uuid",
    "status": "On hold",
    "created_at": "2026-09-30T00:00:00+07:00",
    "hold_expires_at": "2026-10-03T00:00:00+07:00",
    "public_schedule_block": { "start_at": "...", "end_at": "...", "status": "On hold" },
    "private_schedule_synced": true
  }
}
```

Output fields are exactly those of FR-003. `public_schedule_block` exposes only start, end and
status (BR-009).

## Errors

Body: `{ "error": { "code": "...", "message": "..." } }`. Nothing is written for any error.

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | a required field is missing or out of range |
| 403 | `FORBIDDEN` | actor is not a Local Provider, or the Experience belongs to another Provider |
| 404 | `NOT_FOUND` | Experience or Agency does not exist |
| 409 | `PROVIDER_NOT_ELIGIBLE` | Provider not Verified, Provider account not Active (spec #37), or Experience archived (BR-018) |
| 409 | `AGENCY_NOT_ELIGIBLE` | the selected Agency's account is not `Approved` (spec #39) |
| 409 | `SLOT_UNAVAILABLE` | outside operating hours, no operating hours (AC-BKG-HOURS), or overlaps an On hold/Booked Booking (FR-003 "Slot Unavailable", AC-BKG-RACE) |

Only "Slot Unavailable" is named by the spec; the other codes are implementation labels.
