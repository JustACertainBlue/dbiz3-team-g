# Contract: Provider schedule (F-SCHED-01 / F-SCHED-09) and Agency bookings (F-SCHED-02)

Source: spec-BKG §5.1 FR-001, FR-002, FR-009; US-1, US-2; decisions #24, #28, #31–#33, #36, #50,
#57, #68–#82. Actor from the demo cookie `hab_demo_account`. Error body as in 011/012.
Order in every service (#80): authorize → validate → `expireDueHolds(now)` → read; any error writes nothing.

## Phase A — GET `/api/bkg/providers/{providerId}/schedule` (F-SCHED-01)

Query: `date_from`, `date_to` (`YYYY-MM-DD`, Asia/Ho_Chi_Minh). Defaults: today .. +29 days.
`date_from > date_to` or a span over 31 days → `400 VALIDATION_ERROR` (#71).

Access (#74): owning Local Provider → owner view; authenticated Tour Agency → public view of a
Verified Provider; unknown or non-Verified Provider (for an Agency) → `404 NOT_FOUND`; another Local
Provider, UBND, HDT, Guest → `403 FORBIDDEN`.

`200`:

```text
data:
  calendar_blocks: [ { start_at, end_at, status } ]        # public view: exactly these keys (#73)
                   [ { start_at, end_at, status, booking_id? } ]  # owner view: booking_id on On hold / Booked
  operating_hours: { "1": [ { local_start, local_end } ], ..., "7": [] }   # #78
```

Blocks (#72): per local day 00:00–24:00, half-open, merged; On hold / Booked occupy (also outside
hours, #32); Available = rest of the operating windows; Unavailable = everything else; Completed /
Cancelled ignored.

F-SCHED-09 (`calculateAvailability`, internal, #77): `availability_calendar` (= blocks above),
`available_slots [{start_at, end_at}]`, `occupied_slots [{booking_id, start_at, end_at, status}]`,
`calculated_at`; `date_to` defaults to `date_from`.

## Phase B — GET `/api/bkg/agency/bookings` (F-SCHED-02)

Query: `status`, `village_id`, `date_from`, `date_to` (optional, no defaults; date rules as #62).
Access: authenticated Tour Agency only, own Bookings (`agency_id` from the session); anyone else →
`403 FORBIDDEN` (BR-002, BR-008, #33).

`200`: `data.bookings` ascending `start_at`, tie `booking_id`, each with `booking_id`,
`village_name`, `provider_name`, `experience_name`, `start_at`, `end_at`, `group_size` (number),
`agreed_price` (number), `notice_period` (number), `cancellation_policy`, `status`, `last_updated_at`.

## Screens

| Screen | Route | Phase | Content |
|---|---|---|---|
| SCH139 Provider Schedule | `/provider/{providerId}/schedule` (#69) | A | owner calendar; select block → panel with BKG135 buttons (#76); Create → BKG134; Operating hours → PRF128 |
| SCH140 Provider Schedule – Agency View | `/explore/providers/{providerId}/schedule` (#82); "Xem lịch trống" link on the Explore Provider page for Agencies, next to Chat; owner → SCH139 | A | public calendar; Select day highlights; Request Quote → `/explore/providers/{providerId}` (#75) |
| SCH141 Agency Schedule | `/agency/{agencyId}/schedule` (#68) | B | own Bookings calendar, default today .. +29 (UI); View booking → BKG138; Chat → `/messages` |
| BKG137 Booking History | `/agency/{agencyId}/bookings` (#68) | B | own Bookings list with filters; Booking detail → BKG138; Schedule → SCH141 |

Navigation (#68, #69): Provider "Dashboard" → DSH018, "Schedule" → SCH139; Agency "Bookings" →
BKG137, "Schedule" → SCH141; BKG138 Back → BKG137.
