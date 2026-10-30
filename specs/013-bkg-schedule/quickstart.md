# Quickstart: BKG View Schedule (US-1) and Calculated Availability (US-2)

Requires Node.js 22 or newer and Python 3 (or `uv`). Run from the repository root; commands are the
same on macOS and Windows (PowerShell: type `curl.exe`).

## 1. Fresh clone, checks, one dev server

```text
git clone https://github.com/JustACertainBlue/dbiz3-team-g.git
cd dbiz3-team-g
git switch 013-bkg-schedule
npm ci
uv run tools/start_feature.py --use specs/013-bkg-schedule
uv run tools/start_feature.py --check
python data/scripts/validate_seed.py
npm test
npm run lint
npm run demo:reset
npm run dev
```

Run **only one** dev server. Demo Provider `50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374` (cookie `provider`)
is open Mondays 08:00–17:00 and has two Booked Bookings (2026-10-05, 2026-10-10 — the latter on a
Saturday, outside its hours, #32). Demo Agency `02e568d8-d65e-54b1-a554-b411150d1dcb` (cookie `agency`,
Tràng An) has one seed Booking: `0971a1b6…`, Completed, at Phú Vinh on 2026-09-26.

## 2. Phase A — API

1. Owner schedule over October 2026. Expect `HTTP 200`; Mondays show Unavailable 00:00–08:00, Available
   08:00–17:00, Unavailable 17:00–24:00; 2026-10-05 has a Booked block 09:00–10:00 with `booking_id`;
   2026-10-10 (Saturday) has a Booked block 09:00–10:00 inside an Unavailable day (#32); `operating_hours`
   has keys 1–7 with `"1"` = 08:00–17:00.

```bash
curl -s "http://localhost:3000/api/bkg/providers/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374/schedule?date_from=2026-10-01&date_to=2026-10-31" -H "Cookie: hab_demo_account=provider" -w "\nHTTP %{http_code}\n"
```

2. Same as Agency. Expect `HTTP 200`; every block has exactly `start_at`, `end_at`, `status` (no `booking_id`).

```bash
curl -s "http://localhost:3000/api/bkg/providers/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374/schedule?date_from=2026-10-01&date_to=2026-10-31" -H "Cookie: hab_demo_account=agency" -w "\nHTTP %{http_code}\n"
```

3. No dates. Expect `HTTP 200`, 30 days from today.
4. `date_from=2026-10-01&date_to=2026-11-15` (46 days). Expect `HTTP 400 VALIDATION_ERROR`.
5. Cookie `ubnd`, `hdt`, `guest`. Expect `HTTP 403`. Unknown provider id as `agency`. Expect `HTTP 404`.

## 3. Phase A — screens

1. Local Provider → SCH139 `/provider/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374/schedule`: 30 day rows from
   today, Monday rows with an Available window, others Unavailable; move back to October: Booked blocks
   on 10-05 and 10-10.
2. Select the 10-05 Booked block: panel with Update / Cancel / Mark Group Arrival as on BKG135
   (Mark Group Arrival enabled, start passed); View → BKG135.
3. Create a Booking on BKG134 for the next Monday 09:00 → back on SCH139 the block is On hold.
4. Tour Agency → Explore Provider page `/explore/providers/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374` → "Xem lịch trống"
   (next to Chat) → SCH140 `/explore/providers/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374/schedule`: same days,
   blocks without any Agency or price; Select day highlights; Request Quote opens the Explore Provider page.
   As Local Provider, the same SCH140 URL redirects to SCH139; as Guest the Explore page has no "Xem lịch trống" link (#82).
5. UBND / HDT / Guest on SCH139 and SCH140: access denied.

## 4. Phase B — API

1. As `agency` after step 3.3 (the new Booking is for Tràng An). Expect `HTTP 200`, two rows ascending:
   `0971a1b6…` (Completed, Phú Vinh, "Xưởng thủ công Phú Vinh") then the new On hold at Bát Tràng; numbers
   for `group_size`, `agreed_price`, `notice_period`.

```bash
curl -s "http://localhost:3000/api/bkg/agency/bookings" -H "Cookie: hab_demo_account=agency" -w "\nHTTP %{http_code}\n"
```

2. `?status=Cancelled` → `[]`. Cookie `provider`, `ubnd`, `hdt`, `guest` → `HTTP 403`.

## 5. Phase B — screens

1. Tour Agency → nav "Bookings" opens BKG137 with its own Booking; Booking detail → BKG138; BKG138
   Back → BKG137.
2. Nav "Schedule" opens SCH141 (today .. +29) with the On hold block; View booking → BKG138.
3. Local Provider → nav "Dashboard" opens DSH018; nav "Schedule" opens SCH139.

Expected values: [contracts/schedule-api.md](contracts/schedule-api.md), [data-model.md](data-model.md).
