# Quickstart: BKG Create Booking (US-4)

Requires Node.js 22 or newer and Python 3 (or `uv`). Run every command from the repository root.
The commands are the same on macOS (Terminal) and Windows (PowerShell); where Windows differs it
is noted.

## 1. Fresh clone and install

```text
git clone https://github.com/JustACertainBlue/dbiz3-team-g.git
cd dbiz3-team-g
git switch 004-bkg-core
npm ci
uv run tools/start_feature.py --use specs/004-bkg-core
uv run tools/start_feature.py --check
```

`--check` must print `OK`. No `.env` is needed for this slice.

## 2. Validate the seed and run the checks

```text
python data/scripts/validate_seed.py
npm test
npm run lint
```

On Windows, if `python` is not found, use `py data/scripts/validate_seed.py` or
`uv run data/scripts/validate_seed.py`. The seed validator must print `PASS`; `npm test` must
end with all tests passed. `npm run lint` rewrites the tracked `tsconfig.tsbuildinfo`: do not commit it.

## 3. Reset demo data and start the app

```text
npm run demo:reset
npm run dev
```

`demo:reset` overwrites `.demo-data/runtime.json` from `data/seed/*.csv`, so earlier demo
bookings are removed. Open `http://localhost:3000`.

## 4. Demo path (US-4)

The dev server uses the real clock; tests use the seed time (see [research.md](research.md) R7).

1. With the role switcher, choose the Provider account (Xưởng thủ công Bát Tràng, Provider
   `50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374`; operating hours Monday 08:00–17:00).
2. Open `/provider/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374/bookings/new` (BKG134).
3. Choose Experience "Nặn gốm thủ công" (max 12) and an Agency. Conditions are prefilled from the Experience.
4. Enter `2026-11-02 09:00` (a Monday), duration 60, group size 10, agreed price 2,000,000 VND →
   **Create On hold**. Expected: status On hold, `hold_expires_at` = created time + 72 h.
5. Submit the same values again. Expected: Slot Unavailable; no second Booking.
6. Change the start to `2026-11-02 16:30` (ends 17:30, after closing). Expected: Slot Unavailable.
7. Change the group size to 13. Expected: validation error (above `max_participants`).
8. Switch to the Agency account and open the same URL. Expected: access denied, no form action.

Expected results for every rule are in [contracts/create-booking-api.md](contracts/create-booking-api.md)
and [data-model.md](data-model.md).
