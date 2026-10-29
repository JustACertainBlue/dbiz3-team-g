# Research: BKG Create Booking (US-4)

No `NEEDS CLARIFICATION` remains in plan.md. Decisions below come from the team (2026-10-29),
from Closed open questions of `docs/spec/specs/spec-BKG.md` §10, or from reading the code on `main`.

## R1. Storage: shared JSON runtime (team decision B1)

- **Decision**: use `demoRepository()` from `src/lib/demo/json-repository.ts`; tests run it volatile.
- **Rationale**: AIT, PRF and EXP already share it, so the Explore → Quote → Chat → Booking demo
  stays on one data set; no new dependency; runs on macOS and Windows.
- **Alternatives considered**: PGlite (real GiST EXCLUDE and transactions, but a new dependency
  and `btree_gist` support unverified); PostgreSQL local/Docker (harder fresh-clone setup, G1).
- **Consequence**: the repository stores every value as a string (`DemoRow = Record<string, string>`)
  and has no transaction API; each `insert`/`update` persists on its own. Each rule PostgreSQL
  would enforce gets application code and a test (plan.md trace table).

## R2. AS-4 "synchronized to the Agency Private Schedule" (spec #36)

- **Decision**: the Agency schedule is derived from `bookings` filtered by `agency_id`; there is
  no separate copy to write. A Booking is visible to its Agency as soon as the create persists.
  `private_schedule_synced` in the FR-003 output is `true` after a successful create.
- **Rationale**: `data/` has no table for a private schedule; one source avoids divergence.
- **Alternatives considered**: a separate Agency schedule table (not in `data/`).
- **Status**: Closed as spec §10 #36 (2026-10-29).

## R3. Operating-hours fit (Clarifications #28, #29, #31; AC-BKG-HOURS)

- **Decision**: weekday is ISO 8601 (1 = Monday … 7 = Sunday), derived with local time in
  Asia/Ho_Chi_Minh; the whole `[start_at, end_at)` must fit inside one window
  (`local_start ≤ start` and `end ≤ local_end`) of that weekday. A Provider with no rows in
  `provider_operating_hours` has no available period, so every create is Slot Unavailable.
- **Rationale**: Clarifications #28/#29/#31. Same weekday formula as `src/lib/explore/availability.ts`.
- **Note**: an interval that crosses midnight cannot fit in one window (windows are within one day).

## R4. Conflict check and race (BR-005, AC-BKG-RACE)

- **Decision**: overlap test on half-open intervals `[start_at, end_at)` against Bookings of the
  same `provider_id` with status `On hold` or `Booked` (mirrors the schema's EXCLUDE). Touching
  intervals (one ends when the next starts) do not overlap (spec #41). Check and write run inside an
  in-process mutex; the loser receives Slot Unavailable and writes nothing.
- **Alternatives considered**: no lock (safe only while no `await` sits between check and write —
  fragile); file lock (cross-process, more code, not needed for one dev server).

## R5. Atomic create (BR-019)

- **Decision**: add one repository method that applies several table inserts and persists once;
  the in-memory tables change only after the file write succeeds. Create writes the `bookings`
  row and the `booking_status_history` row (`from_status` empty, `to_status = On hold`,
  `changed_by` = Provider user, `changed_at = created_at`) in that one call.
- **Test**: inject a failing persist; afterwards neither row exists.

## R6. Seed On hold past its expiry, and seed bookings outside hours

- Seed On hold `54d7a276…` expired at 2026-10-01 08:00, and no expiry worker exists in this
  slice (US-5). **Decision** (spec #40): the stored status is authoritative; an On hold row
  blocks its slot until the worker cancels it. This matches the schema's EXCLUDE, which filters
  on `status`.
- Seed bookings `54d7a276…` (On hold, Sun 2026-10-11) and `5782011c…` (Booked, Sat 2026-10-10)
  fall outside their Provider's operating hours (spec OQ #32, Open). **Decision**: they still
  count as occupied for the conflict check; the operating-hours fit applies only to the new request.

## R7. Clock

- **Decision**: `now` is injected into the create service. Tests use `2026-09-30T00:00:00+07:00`
  (`data/seed/manifest.json` `generated_at`); the dev server uses the wall clock.
  Timestamps are written as ISO 8601 with `+07:00`, like the seed.

## R8. Actor and demo session

- **Decision**: actor comes from `demoSessionFromRequest()`; only `role = LocalProvider` with a
  `providerId` may create, and only for its own Experiences. Demo Provider: `50f2c8fc…`
  (Bát Tràng, Verified, account Active, weekday 1 08:00–17:00, Experience `c9f9faf7…`
  "Nặn gốm thủ công", 60 min, max 12).

## R9. Account status of both parties (spec #37, #39)

- **Decision**: the Provider's user must have `account_status = 'Active'` (#37) and the selected
  Agency's user must have `account_status = 'Approved'` (#39), both read from `user_accounts`
  through `provider_profiles.user_id` / `agency_profiles.user_id`. Either failure rejects the
  create and writes nothing.
- **Rationale**: Closed open questions #37 and #39 (2026-10-30).

## Decisions recorded in the spec

Every point the spec did not state when this plan was drafted is now a Closed open question in
`docs/spec/specs/spec-BKG.md` §10 (with a line under `## Clarifications`). No interpretation
remains open.

| Spec §10 | Decision used in this plan | Where |
|---|---|---|
| #36 | AS-4: Agency schedule derived from `bookings`, no separate copy | R2 |
| #37 | "Active" Provider (BR-018) = `user_accounts.account_status = 'Active'` of the Provider's user | R9, data-model.md |
| #38 | `duration` is entered freely (> 0); it need not equal the Experience's `duration_minutes` | data-model.md |
| #39 | The selected Agency's `user_accounts.account_status` must be `Approved`; otherwise creation is rejected and nothing is written | R9, data-model.md |
| #40 | An On hold Booking past `hold_expires_at` keeps blocking its slot until the US-5 worker cancels it | R6 |
| #41 | Touching intervals do not conflict (half-open `[start_at, end_at)`, as in the schema EXCLUDE) | R4 |
| #42 | Adjusted `booking_conditions` are validated with the schema shape: `notice_period_hours` integer ≥ 0, `cancellation_policy` non-empty object | data-model.md |
| #43 | After success BKG134 shows the created Booking in place until BKG135 exists | plan.md Complexity Tracking |
