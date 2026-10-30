# Quickstart: BKG List Bookings (US-6)

Requires Node.js 22 or newer and Python 3 (or `uv`). Run from the repository root. Commands are the
same on macOS (Terminal) and Windows (PowerShell); differences are noted.

## 1. Fresh clone and install

```text
git clone https://github.com/JustACertainBlue/dbiz3-team-g.git
cd dbiz3-team-g
git switch 012-bkg-list
npm ci
uv run tools/start_feature.py --use specs/012-bkg-list
uv run tools/start_feature.py --check
```

## 2. Validate the seed and run the checks

```text
python data/scripts/validate_seed.py
npm test
npm run lint
```

On Windows, if `python` is not found, use `py` or `uv run`. `npm run lint` rewrites the tracked
`tsconfig.tsbuildinfo`: do not commit it.

## 3. Reset demo data and start one dev server

```text
npm run demo:reset
npm run dev
```

Run **only one** dev server. The first BKG request cancels the expired seed On hold `54d7a276…`
(another Provider) — expected. Demo Provider `50f2c8fc…` (cookie `provider`) starts with two Booked
Bookings in the past (2026-10-05 `4bf17b30…`, 2026-10-10 `5782011c…`), both needing arrival.

## 4. API path

Each command prints the JSON body and then `HTTP <status>`. On Windows PowerShell type `curl.exe`.

1. Own list, no filter. Expect `HTTP 200`; `4bf17b30…` before `5782011c…` (ascending `start_at`);
   both `requires_action` = `true`; `group_size` a number; `status_counts` with four keys; `total_count` 2.

```bash
curl -s "http://localhost:3000/api/bkg/bookings" -H "Cookie: hab_demo_account=provider" -w "\nHTTP %{http_code}\n"
```

2. Status filter. Expect `HTTP 200`, `bookings` = `[]`, `total_count` 0, `status_counts` still shows `"Booked": 2`.

```bash
curl -s "http://localhost:3000/api/bkg/bookings?status=Cancelled" -H "Cookie: hab_demo_account=provider" -w "\nHTTP %{http_code}\n"
```

3. Date range covering only 2026-10-05. Expect one row `4bf17b30…`, `status_counts` `"Booked": 1`.

```bash
curl -s "http://localhost:3000/api/bkg/bookings?date_from=2026-10-05&date_to=2026-10-05" -H "Cookie: hab_demo_account=provider" -w "\nHTTP %{http_code}\n"
```

4. Reversed range. Expect `HTTP 400` `VALIDATION_ERROR`.

```bash
curl -s "http://localhost:3000/api/bkg/bookings?date_from=2026-10-06&date_to=2026-10-05" -H "Cookie: hab_demo_account=provider" -w "\nHTTP %{http_code}\n"
```

5. Page size 101. Expect `HTTP 400`. Page 5. Expect `HTTP 200`, `bookings` = `[]`, `total_count` 2.

```bash
curl -s "http://localhost:3000/api/bkg/bookings?page_size=101" -H "Cookie: hab_demo_account=provider" -w "\nHTTP %{http_code}\n"
```
```bash
curl -s "http://localhost:3000/api/bkg/bookings?page=5" -H "Cookie: hab_demo_account=provider" -w "\nHTTP %{http_code}\n"
```

6. Another Provider's id. Expect `HTTP 403 FORBIDDEN`.

```bash
curl -s "http://localhost:3000/api/bkg/bookings?provider_id=70efa801-a908-5e16-8510-fd094fbdc020" -H "Cookie: hab_demo_account=provider" -w "\nHTTP %{http_code}\n"
```

7. Agency, UBND, HDT, Guest. Expect `HTTP 403` each.

```bash
curl -s "http://localhost:3000/api/bkg/bookings" -H "Cookie: hab_demo_account=agency" -w "\nHTTP %{http_code}\n"
```
(repeat with `ubnd`, `hdt`, `guest`)

## 5. Screen path

1. Switch Role → Local Provider. Create an On hold Booking on BKG134
   (`/provider/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374/bookings/new`, Tràng An, a future Monday 09:00,
   60 min, 10 pax, 2,000,000).
2. Open BKG133 `/provider/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374/bookings`: `date_from` is today, so only the
   new On hold Booking shows, labelled "Cần xử lý", with its hold expiry.
3. "Xoá bộ lọc": the two past Booked Bookings appear first (ascending), both "Cần xử lý".
4. Status filter Cancelled → explicit empty state (AS-6).
5. Detail on a row → BKG135 of that Booking (AS-4).
6. Back on the Provider page, "Bookings" opens BKG133 (#66).
7. DSH018 `/provider/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374/dashboard`: counts On hold 1, Booked 2,
   Completed 0, Cancelled 0; "3 Booking cần xử lý"; Bookings → BKG133.
8. Switch Role → Tour Agency, UBND, HDT, Guest: BKG133 and DSH018 URLs show the access-denied message.

Expected values: [contracts/list-bookings-api.md](contracts/list-bookings-api.md), [data-model.md](data-model.md).
