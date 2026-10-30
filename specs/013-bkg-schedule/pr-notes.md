# PR notes: BKG round 4 — US-1 View Schedule + US-2 Calculated Availability (`013-bkg-schedule`)

## Scope
- **US-2 F-SCHED-09** `calculateAvailability` / `buildCalendarBlocks`: per local day 00:00–24:00 (#72), Unavailable → operating windows Available → On hold / Booked (also outside hours, #32); internal, no route (#77).
- **US-1 F-SCHED-01** `GET /api/bkg/providers/{providerId}/schedule`: default today .. +29, max 31 days (#71); owner view with `booking_id` (#73); public view = exactly `{start_at, end_at, status}` (allow-list); access per #74.
- **US-1 F-SCHED-02** `GET /api/bkg/agency/bookings`: own Bookings only, filters status / village / dates, JSON numbers, names from village and published profile version (#79).
- Screens: SCH139 `/provider/{id}/schedule` (block → BKG135-style panel, #76), SCH140 `/explore/providers/{id}/schedule` (#82; owner → SCH139), BKG137 `/agency/{id}/bookings`, SCH141 `/agency/{id}/schedule`; shared CSS-grid `CalendarGrid` (#70, no dependency).
- Order everywhere: authorize → validate → expire → read; denied/invalid writes nothing (#80). Create/update unchanged; consistency test (#81).

## For the PRF owner — link edits only (#68, #69)
- `src/app/provider/[providerId]/page.tsx`, `src/app/provider/[providerId]/edit/page.tsx`: nav "Dashboard" → `/provider/{id}/dashboard` (DSH018), "Schedule" → `/provider/{id}/schedule` (SCH139).
- `src/app/agency/[agencyId]/page.tsx`: nav "Bookings" → `/agency/{id}/bookings` (BKG137), "Schedule" → `/agency/{id}/schedule` (SCH141).

## For the EXP owner — one link (#82)
- `src/app/explore/providers/[id]/page.tsx`: "Xem lịch trống" next to the Chat action, only for an authenticated Tour Agency (`showScheduleLink`, tested).

## Evidence
- `npm test` 76 files, 503/503; lint exit 0; `validate_seed` PASS; `--check` OK.
- Mutations (build-log Entries 28–29): `agency_name` in public blocks → allow-list tests fail; expiry before authorization → "denied requests write nothing" fails; Unavailable over an out-of-hours Booking → #32 test fails.
- Demo macOS (build-log Entry 30): Phase A API 5/5 + screens, Phase B API + screens; one demo finding fixed test-first (public blocks crossed midnight, Entry 29).

## Not done
- Windows run (G1). Post-merge non-author reviews for #17, #22, #25 still open.
