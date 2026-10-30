# Research: BKG List Bookings (US-6)

No `NEEDS CLARIFICATION` is left: every point the spec did not state was decided as spec #58–#67
before planning. Each decision below cites its source.

## R1. One list service for the API, BKG133 and DSH018

- **Decision**: `listProviderBookings(session, query, { now })` in `src/lib/booking/list-bookings.ts`
  returns exactly the §5.1 FR-010 output. The API route, the BKG133 page and DSH018 all call it.
  DSH018 uses `providerBookingSummary(session, { now })`, which calls the same service with no filter
  and `page_size` 100, walks every page, and returns `status_counts` plus the count of rows with
  `requires_action` (#65: "the number of Bookings with requires_action", over all Bookings).
- **Rationale**: one place for authorization, expiry, filters and `requires_action`, so the list,
  the summary and the detail never disagree.
- **Alternatives**: a separate counting function (duplicates the rules); a `page_size` above 100 for
  DSH018 (violates #63).

## R1b. Out-of-filter action count and row view (analyze H2, C1)

- **Decision**: `countActionsOutsideFilter(session, query, { now })` = number of the Provider's
  Bookings with `requires_action` minus those that also match `query`, both counted by walking the
  list service pages (`page_size` 100). `bookingListRowView(row, providerId)` is a pure helper that
  gives BKG133 its `detail_href`, `needs_action_label` and display strings, so AS-4 and SC-011 have
  unit tests instead of demo only.
- **Rationale**: the UI default `date_from` = today must not hide work the Provider has to do (AS-3);
  constitution II needs an automated test for AS-4.

## R2. `requires_action` reuses `bookingActions` (#59)

- **Decision**: `requires_action = a.confirm || a.mark_arrival` where
  `a = bookingActions(status, now, start_at, 'provider')`. `confirm` is true for On hold only while
  `now < hold_expires_at`, because expiry runs first (#64) and an expired hold is already Cancelled.
- **Rationale**: #59 states the rule is the same as the F-SCHED-07 buttons; BR-010, BR-017.
- **Alternatives**: a second implementation of the rule (could drift from BKG135).

## R3. Order of operations (#64, #67)

- **Decision**: (1) authorize: the session must be an authenticated Local Provider with a
  `providerId`; if the query names a `provider_id` it must equal the session's, otherwise
  `FORBIDDEN` (#67) → (2) validate the query (#62, #63) → (3) `expireDueHolds(now)` (the locking
  variant; the list is not inside the lock) → (4) read, filter, sort, count, page.
- **Rationale**: the human's mandated order for this slice (authorize → expire → read) and the
  lesson of build-log §4 (Entry 15): a denied request writes nothing. Validation sits between
  authorization and expiry, so an invalid query also writes nothing, and a non-owner always gets 403.
- **Alternatives**: expiry first (would let Agency/UBND/HDT/Guest requests cancel holds).

## R4. Dates in Asia/Ho_Chi_Minh (#31, #62)

- **Decision**: new helper `hanoiDate(timestamp)` in `src/lib/booking/clock.ts` returns `YYYY-MM-DD`
  of the instant at +07:00. A Booking matches when `date_from <= hanoiDate(start_at) <= date_to`
  (string compare of ISO dates). Query dates must match `^\d{4}-\d{2}-\d{2}$` and be a real date;
  otherwise `VALIDATION_ERROR`. `date_from > date_to` → `VALIDATION_ERROR`.
- **Rationale**: #62; stored `start_at` already carries `+07:00`, but the helper does not rely on it.
- **Alternatives**: comparing `start_at` strings directly (breaks for any non +07:00 value).

## R5. Paging, counts and types (#61, #63, #57)

- **Decision**: `page` and `page_size` parsed from strings, must be integers (`1 <= page`,
  `1 <= page_size <= 100`), defaults 1 and 20. `total_count` = rows after all filters;
  `status_counts` = rows after Provider + date filters, keys On hold, Booked, Completed, Cancelled
  always present. `group_size` = `Number(...)`; counts are numbers. A page beyond the last returns
  `bookings: []` with the real `total_count`.
- **Rationale**: §5.1 FR-010, #61, #63; #57 showed stored strings leak if not converted.

## R6. API on the existing route file

- **Decision**: add `GET` to `src/app/api/bkg/bookings/route.ts`; `POST` (F-SCHED-03) unchanged.
  Query parameters: `status`, `date_from`, `date_to`, `page`, `page_size`, optional `provider_id`.
  Errors use the existing `BookingError` → status mapping (400, 403).
- **Rationale**: REST shape of the existing BKG routes; no new dependency.

## R7. Screens

- **Decision**: BKG133 and DSH018 are server components with the same gate as BKG134
  (`canOpenCreateBooking(session, providerId)`: owning Local Provider on its own URL). They call the
  service directly; filters are page URL query parameters. The UI choices (default `date_from` =
  today, "Xoá bộ lọc", "Cần xử lý" label) are presentation only and listed in plan.md.
- **Rationale**: same pattern as BKG134/BKG135; #66 route; SC-011 highlight not by colour alone.

## R8. Field sources

- **Decision**: `experience_name` = `experiences.name`; `agency_name` = `agency_profiles.company_name`;
  `end_at`, `hold_expires_at`, `status`, `start_at` from `bookings`.
- **Rationale**: `data/02-crud-matrix.md` lists F-SCHED-10 reading BKG, AGY and EXP; these are the
  only name columns of those tables, and BKG135 (F-SCHED-07) already uses the same sources.

## Decisions recorded in the spec

#58–#67 (Clarifications 2026-10-30). No interpretation in this file is new to the spec; the UI
choices in plan.md are presentation only.
