# Research: BKG View Schedule (US-1) and Calculated Availability (US-2)

Every point below cites a spec decision, except **R9**, which the spec does not decide yet.

## R1. Calendar blocks (F-SCHED-09, #72, #32)

- **Decision**: pure `buildCalendarBlocks(hours, bookings, dateFrom, dateTo, view)`. For each local
  day: start with the whole day Unavailable; paint operating-hours windows of that ISO weekday (#28)
  Available; paint On hold / Booked Bookings over it (also outside the hours, #32); Completed and
  Cancelled are ignored (US-2 AS-3). Merge adjacent ranges with the same status (and, in the owner
  view, the same `booking_id`). Times are `+07:00` timestamps; ranges are half-open.
- **Rationale**: #72 states the split; FR-009; AC-BKG-HOURS (no hours → no Available).
- **Alternatives**: slot-by-slot fixed grid (loses exact block edges).

## R2. F-SCHED-09 output (#77)

- **Decision**: `calculateAvailability(providerId, { date_from, date_to? }, now)` → `{ availability_calendar
  (= calendar blocks), available_slots, occupied_slots (booking_id, start_at, end_at, status), calculated_at }`;
  `date_to` defaults to `date_from`. No HTTP route (System actor).

## R3. F-SCHED-01 views and access (#73, #74, #24)

- **Decision**: `getProviderSchedule(session, providerId, query, { now })`. Owner Local Provider →
  owner view (blocks may carry `booking_id`). Authenticated Tour Agency → public view only if the
  Provider exists and `verification_status = Verified`, otherwise `NOT_FOUND`. Another Local
  Provider, UBND, HDT, Guest → `FORBIDDEN`. Public blocks are built from an allow-list
  `{start_at, end_at, status}` (human note on #73).
- **Rationale**: #73, #74, BR-009, SC-010.

## R4. Ranges (#71, #31, #62)

- **Decision**: dates `YYYY-MM-DD`; F-SCHED-01 defaults `date_from` = `hanoiDate(now)`, `date_to` =
  `date_from` + 29 days; `date_from > date_to` or more than 31 days → `VALIDATION_ERROR`. New helper
  `addDays(date, n)` in `clock.ts`. F-SCHED-02 has no default dates; the same date checks apply.

## R5. `operating_hours` (#78)

- **Decision**: `{ "1": [...], …, "7": [...] }` of `{ local_start, local_end }` from
  `provider_operating_hours`, every key present.

## R6. Order of work (#80)

- **Decision**: authorize → validate → `expireDueHolds(now)` → read, in both services; tests compare
  a deep snapshot of bookings, history and chat tables for denied and invalid requests.

## R7. F-SCHED-02 (#68, #79, #36)

- **Decision**: `listAgencyBookings(session, query, { now })` for the session's `agencyId` only;
  filters `status`, `village_id`, `date_from`, `date_to` (local date of `start_at`, inclusive);
  ascending `start_at`, tie `booking_id`; no paging. Row: `booking_id`, `village_name`
  (`villages.name` of the Provider's `village_id`), `provider_name` (`business_name` of the Provider's
  `published_version_no` in `provider_profile_versions`, as `src/lib/prf/provider-service.ts` does for
  public views), `experience_name`, `start_at`, `end_at`, `group_size`, `agreed_price`,
  `notice_period`, `cancellation_policy` (numbers per #57/#79), `status`, `last_updated_at`.
- **Rationale**: §5.1 FR-002; #79; build-log §4 Entry 2 (use the versioned name).

## R8. Consistency with create (#81)

- **Decision**: a test creates Bookings exactly on slots that `calculateAvailability` reports
  Available (accepted) and on occupied / Unavailable slots (`SLOT_UNAVAILABLE`); no change to
  `create-booking.ts` or `update-booking.ts`.

## R9. SCH140 route and entry point (#82)

- **Decision**: SCH140 at `/explore/providers/{providerId}/schedule`, opened by URL and by a
  "Xem lịch trống" link on the Explore Provider page (`src/app/explore/providers/[id]/page.tsx`),
  shown only to Tour Agencies, next to the Chat button. The owning Local Provider opening the URL is
  redirected to SCH139 (#74).
- **Rationale**: #82 (raised by the first plan review, decided 2026-10-30). The link edits an
  EXP-owned page: one link only, flagged for the EXP owner in the PR description.

## Decisions recorded in the spec

#24, #25, #28–#33, #36, #50, #57, #68–#82. No interpretation in this file is new to the spec.
