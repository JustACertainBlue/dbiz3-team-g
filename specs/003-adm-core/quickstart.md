# Quickstart: Admin Dashboard (ADM079) — Core Slice

Requires Node.js 22 or newer, Git 2.40 or newer and Python 3.11 (or `uv`). Run from the repository
root; commands are the same on macOS and Windows (PowerShell: type `curl.exe`). ADM is ported onto
`main` (`tasks.md` Phase 5); the old `003-adm-core` branch is not used. No `.env` is needed.

> The expected results below are the behaviour after `tasks.md` Phase 5. Until T066 is checked, parts
> of this path (runtime data, period on the table/top 10, `created_at` basis, pending panel) differ.

## 1. Fresh clone, checks, one dev server

```text
git clone https://github.com/JustACertainBlue/dbiz3-team-g.git
cd dbiz3-team-g
git switch main
npm ci
uv run tools/start_feature.py --use specs/003-adm-core
uv run tools/start_feature.py --check
python data/scripts/validate_seed.py
npm test
npm run lint
npm run demo:reset
npm run dev
```

Expected: `--check` prints `OK`; `validate_seed.py` prints `PASS: 47 CSVs/load headers; …`; all tests
pass; lint prints no error. Run **only one** dev server; stop it before any `npm run demo:reset`.

ADM test subsets:

```text
npx vitest run tests/adm/
npx vitest run tests/adm/integration/adm-runtime-api.test.ts
```

## 2. Data and identities

- Demo identities (cookie `hab_demo_account`, switched with the Role Switcher): **HDT Admin**
  (`hdt`, platform-wide) and **UBND Admin · Hạ Thái** (`ubnd`, assigned village from
  `ubnd_village_assignments.csv`). Hạ Thái has no Bookings and one Provider in Pending Verification.
- The dashboard reads the shared JSON runtime (`.demo-data/runtime.json`), so Bookings created or
  changed in BKG appear here.
- Time basis (consistency contract): Booking totals, status, trend, table and top 10 use the Booking
  `created_at`. Seed Bookings were created on 2026-09-23 and 2026-09-28, so use **Last 90 days** (or
  Custom) to see them; a Booking created today through BKG appears in **Last 7 days**.

## 3. Demo path (ADM079, `http://localhost:3000/admin`)

| # | Action | Expected |
|---|---|---|
| 1 | Role Switcher → **HDT Admin**, period **Last 90 days** | Cards: 8 Agencies, 8 Providers, 8 Bookings; status On hold 1, Booked 3, Completed 2, Cancelled 2; table 8 rows; top 10 counts Booked + Completed only |
| 2 | Village → **Bát Tràng** | Cards, status, table and top 10 for Bát Tràng only |
| 3 | Agency **Công ty Du lịch Thăng Long** + Provider **Xưởng thủ công Vạn Phúc** | Table, top 10, status and trend show that pair only (AND, BR-014); the four cards do not change (#21) |
| 4 | Period **Last 7 days** | Cards, status, trend, table and top 10 all empty (no seed Booking created in the last 7 days) |
| 5 | As Local Provider, create a Booking in BKG (BKG134), then back to HDT, **Last 7 days** | Total Bookings 1, On hold 1, the new Booking in the table |
| 6 | Role Switcher → **UBND Admin** | Village locked 🔒 Hạ Thái; no Bookings; Pending Verification lists Xưởng thủ công Hạ Thái; no View/Verify buttons |
| 7 | Role Switcher → HDT again | Village back to All Villages |

API checks (curl): `GET /api/adm/dashboard?preset=Last+90+days` with `Cookie: hab_demo_account=hdt`
returns 200; with `ubnd` the scope is Hạ Thái even if `villageId` or a forged `x-mock-session` header is
sent; without the cookie → 401; with `agency` → 403.

Afterwards: stop the dev server; `npm run demo:reset` restores the seed.
