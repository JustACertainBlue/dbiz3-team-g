# Contract: List Bookings (F-SCHED-10) and the DSH018 summary

Source: spec-BKG §5.1 FR-010, AS-1..AS-6, SC-011, decisions #59–#67. Actor from the demo session
cookie `hab_demo_account`. Error body: `{ "error": { "code": "...", "message": "..." } }`.

## GET `/api/bkg/bookings` — F-SCHED-10 (US-6)

Order of work (#64, #67): authorize → validate query → `expireDueHolds(now)` → read. Any error
writes nothing; a non-owner always gets 403, even with an invalid query.

Query parameters (all optional):

| Name | Rule | Error |
|---|---|---|
| `provider_id` | if given, must equal the session's Provider (#67) | `403 FORBIDDEN` |
| `status` | one of `On hold`, `Booked`, `Completed`, `Cancelled` | `400 VALIDATION_ERROR` |
| `date_from`, `date_to` | `YYYY-MM-DD`, real dates; filter the local date (Asia/Ho_Chi_Minh) of `start_at`, inclusive (#62) | `400` if malformed or `date_from > date_to` |
| `page` | integer >= 1, default 1 (#63) | `400` |
| `page_size` | integer 1–100, default 20 (#63) | `400` |

Access: only an authenticated Local Provider, for its own Bookings. Tour Agency, UBND, HDT, Guest →
`403 FORBIDDEN` (AS-5, #67, BR-001, BR-002, BR-014).

`200`:

```text
data:
  bookings: [ { booking_id, experience_name, agency_name, start_at, end_at,
                group_size (number), status, hold_expires_at (On hold only),
                requires_action (boolean) } ]      # ascending start_at, tie booking_id (#60)
  status_counts: { "On hold": n, "Booked": n, "Completed": n, "Cancelled": n }
                                                   # Provider + date range, ignores status (#61)
  total_count: n                                   # all filters (#61)
```

- `requires_action` = On hold and `now < hold_expires_at`, or Booked and `now >= start_at` (#59);
  computed with `bookingActions` (same as BKG135 buttons).
- A page beyond the last → `bookings: []` with the real `total_count` (#63, AS-6).
- A hold that is due is expired first and listed as Cancelled, `requires_action` false (#64).

## Screens

| Screen | Route | Gate | Content |
|---|---|---|---|
| BKG133 Booking Management | `/provider/{providerId}/bookings` (#66) | owning Local Provider on its own URL; others see an access-denied message, no data | list from the service; filters status, date_from (default today, UI choice), date_to; "Xoá bộ lọc"; "Cần xử lý" label; Detail → BKG135; Create → BKG134; Messages → `/messages`; empty state (AS-6); previous/next page |
| DSH018 (booking action summary only) | `/provider/{providerId}/dashboard` (#65) | same | `status_counts`, number of Bookings with `requires_action` (all of the Provider's Bookings), Bookings → BKG133 |

Provider pages' "Bookings" links (`/provider/{id}` and `/provider/{id}/edit`) point to BKG133; the
Agency `/bookings` link is unchanged (#66).
