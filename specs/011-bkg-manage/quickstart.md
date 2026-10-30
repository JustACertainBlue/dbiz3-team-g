# Quickstart: BKG Manage Booking (US-5) and View Bookings (US-3)

Requires Node.js 22 or newer and Python 3 (or `uv`). Run from the repository root. Commands are the
same on macOS (Terminal) and Windows (PowerShell); differences are noted.

## 1. Fresh clone and install

```text
git clone https://github.com/JustACertainBlue/dbiz3-team-g.git
cd dbiz3-team-g
git switch 011-bkg-manage
npm ci
uv run tools/start_feature.py --use specs/011-bkg-manage
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

Run **only one** dev server (research R3). The first BKG request cancels the expired seed On hold
`54d7a276…` and posts one Booking Update message — expected.

## 4. US-5 demo path through the API

Run these from the repository root while `npm run dev` serves `http://localhost:3000`. Request bodies are
in `specs/011-bkg-manage/demo/*.json`, so the commands are the same on both systems. On Windows
PowerShell type `curl.exe` (in Windows PowerShell 5.1 `curl` is an alias of `Invoke-WebRequest`).
Each command prints the JSON body and then `HTTP <status>`.
Cookie values: `provider` = Xưởng thủ công Bát Tràng (Provider `50f2c8fc…`); `agency` = Công ty Du lịch Tràng An (`02e568d8…`).

1. Create a Booking (US-4; now also sends one Booking Update message). Expect `HTTP 201`; copy `booking_id`.

macOS / Linux:

```bash
curl -s -X POST "http://localhost:3000/api/bkg/bookings" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" --data-binary "@specs/011-bkg-manage/demo/create.json" -w "\nHTTP %{http_code}\n"
```

Windows PowerShell:

```powershell
curl.exe -s -X POST "http://localhost:3000/api/bkg/bookings" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" --data-binary "@specs/011-bkg-manage/demo/create.json" -w "\nHTTP %{http_code}\n"
```

2. Keep the id in a variable for the next commands.

macOS / Linux:

```bash
BOOKING_ID="paste-booking_id-from-step-1"
```

Windows PowerShell:

```powershell
$BOOKING_ID = "paste-booking_id-from-step-1"
```

3. Update the group size to 11 (F-SCHED-04). Expect `HTTP 200` with `audit_log_id` and `agency_notification_message_id`.

macOS / Linux:

```bash
curl -s -X PATCH "http://localhost:3000/api/bkg/bookings/$BOOKING_ID" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" --data-binary "@specs/011-bkg-manage/demo/update-group.json" -w "\nHTTP %{http_code}\n"
```

Windows PowerShell:

```powershell
curl.exe -s -X PATCH "http://localhost:3000/api/bkg/bookings/$BOOKING_ID" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" --data-binary "@specs/011-bkg-manage/demo/update-group.json" -w "\nHTTP %{http_code}\n"
```

4. Send the same update again (#52). Expect `HTTP 200`, nothing written, `audit_log_id` and `agency_notification_message_id` = `null`.

macOS / Linux:

```bash
curl -s -X PATCH "http://localhost:3000/api/bkg/bookings/$BOOKING_ID" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" --data-binary "@specs/011-bkg-manage/demo/update-group.json" -w "\nHTTP %{http_code}\n"
```

Windows PowerShell:

```powershell
curl.exe -s -X PATCH "http://localhost:3000/api/bkg/bookings/$BOOKING_ID" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" --data-binary "@specs/011-bkg-manage/demo/update-group.json" -w "\nHTTP %{http_code}\n"
```

5. Move the start to 16:30, ending after closing time (#47). Expect `HTTP 409` `SLOT_UNAVAILABLE`.

macOS / Linux:

```bash
curl -s -X PATCH "http://localhost:3000/api/bkg/bookings/$BOOKING_ID" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" --data-binary "@specs/011-bkg-manage/demo/update-time-outside-hours.json" -w "\nHTTP %{http_code}\n"
```

Windows PowerShell:

```powershell
curl.exe -s -X PATCH "http://localhost:3000/api/bkg/bookings/$BOOKING_ID" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" --data-binary "@specs/011-bkg-manage/demo/update-time-outside-hours.json" -w "\nHTTP %{http_code}\n"
```

6. Confirm (F-SCHED-05, On hold → Booked). Expect `HTTP 200`, `booking_status` = `Booked`.

macOS / Linux:

```bash
curl -s -X POST "http://localhost:3000/api/bkg/bookings/$BOOKING_ID/status" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" --data-binary "@specs/011-bkg-manage/demo/confirm.json" -w "\nHTTP %{http_code}\n"
```

Windows PowerShell:

```powershell
curl.exe -s -X POST "http://localhost:3000/api/bkg/bookings/$BOOKING_ID/status" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" --data-binary "@specs/011-bkg-manage/demo/confirm.json" -w "\nHTTP %{http_code}\n"
```

7. Mark arrival before the start (F-SCHED-06). Expect `HTTP 200`, `transition_applied` = `false`, `validation_error` = `Tour Start Time Not Reached`.

macOS / Linux:

```bash
curl -s -X POST "http://localhost:3000/api/bkg/bookings/$BOOKING_ID/arrival" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" -w "\nHTTP %{http_code}\n"
```

Windows PowerShell:

```powershell
curl.exe -s -X POST "http://localhost:3000/api/bkg/bookings/$BOOKING_ID/arrival" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" -w "\nHTTP %{http_code}\n"
```

8. Mark arrival on seed Booked `4bf17b30…` (started 2026-10-05). Expect `HTTP 200`, `transition_applied` = `true`, `booking_status` = `Completed`.

macOS / Linux:

```bash
curl -s -X POST "http://localhost:3000/api/bkg/bookings/4bf17b30-9819-5c47-b745-06be7171087b/arrival" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" -w "\nHTTP %{http_code}\n"
```

Windows PowerShell:

```powershell
curl.exe -s -X POST "http://localhost:3000/api/bkg/bookings/4bf17b30-9819-5c47-b745-06be7171087b/arrival" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" -w "\nHTTP %{http_code}\n"
```

9. Create a second Booking (11:00) and copy its `booking_id`. Expect `HTTP 201`.

macOS / Linux:

```bash
curl -s -X POST "http://localhost:3000/api/bkg/bookings" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" --data-binary "@specs/011-bkg-manage/demo/create-second.json" -w "\nHTTP %{http_code}\n"
```

Windows PowerShell:

```powershell
curl.exe -s -X POST "http://localhost:3000/api/bkg/bookings" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" --data-binary "@specs/011-bkg-manage/demo/create-second.json" -w "\nHTTP %{http_code}\n"
```

10. Keep the second id in a variable.

macOS / Linux:

```bash
SECOND_ID="paste-booking_id-from-step-9"
```

Windows PowerShell:

```powershell
$SECOND_ID = "paste-booking_id-from-step-9"
```

11. Cancel without a reason (#10). Expect `HTTP 400`.

macOS / Linux:

```bash
curl -s -X POST "http://localhost:3000/api/bkg/bookings/$SECOND_ID/status" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" --data-binary "@specs/011-bkg-manage/demo/cancel-without-reason.json" -w "\nHTTP %{http_code}\n"
```

Windows PowerShell:

```powershell
curl.exe -s -X POST "http://localhost:3000/api/bkg/bookings/$SECOND_ID/status" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" --data-binary "@specs/011-bkg-manage/demo/cancel-without-reason.json" -w "\nHTTP %{http_code}\n"
```

12. Cancel with a reason. Expect `HTTP 200`, `booking_status` = `Cancelled`.

macOS / Linux:

```bash
curl -s -X POST "http://localhost:3000/api/bkg/bookings/$SECOND_ID/status" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" --data-binary "@specs/011-bkg-manage/demo/cancel.json" -w "\nHTTP %{http_code}\n"
```

Windows PowerShell:

```powershell
curl.exe -s -X POST "http://localhost:3000/api/bkg/bookings/$SECOND_ID/status" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" --data-binary "@specs/011-bkg-manage/demo/cancel.json" -w "\nHTTP %{http_code}\n"
```

13. Update the cancelled Booking (BR-011). Expect `HTTP 409` `BOOKING_TERMINAL`.

macOS / Linux:

```bash
curl -s -X PATCH "http://localhost:3000/api/bkg/bookings/$SECOND_ID" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" --data-binary "@specs/011-bkg-manage/demo/update-group.json" -w "\nHTTP %{http_code}\n"
```

Windows PowerShell:

```powershell
curl.exe -s -X PATCH "http://localhost:3000/api/bkg/bookings/$SECOND_ID" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=provider" --data-binary "@specs/011-bkg-manage/demo/update-group.json" -w "\nHTTP %{http_code}\n"
```

14. Try to cancel as the Agency (BR-001). Expect `HTTP 403` `FORBIDDEN`.

macOS / Linux:

```bash
curl -s -X POST "http://localhost:3000/api/bkg/bookings/$BOOKING_ID/status" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=agency" --data-binary "@specs/011-bkg-manage/demo/cancel.json" -w "\nHTTP %{http_code}\n"
```

Windows PowerShell:

```powershell
curl.exe -s -X POST "http://localhost:3000/api/bkg/bookings/$BOOKING_ID/status" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=agency" --data-binary "@specs/011-bkg-manage/demo/cancel.json" -w "\nHTTP %{http_code}\n"
```

15. Open `/messages` as the Agency (Tràng An): one Booking Update message for each successful step 1, 3, 6, 9 and 12, all in one Chat with Bát Tràng. Rejected or unchanged steps (4, 5, 7, 11, 13, 14) send none. Step 8 goes to the Chat of Agency `ebf4fcfa…`; the first request after `demo:reset` also expires seed `54d7a276…` in the Chat of Agency `14390b41…`.

## 5. US-3 demo path through the screens

Start §5 from fresh demo data, because §4 already completed or cancelled some Bookings (analyze M4).
Stop the dev server, then:

```bash
npm run demo:reset
```
```bash
npm run dev
```

1. `/login` → Local Provider → create a Booking on BKG134 → it opens BKG135 (`/provider/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374/bookings/{id}`).
2. BKG135 On hold: Confirm/Book, Update, Cancel enabled; Mark Group Arrival hidden or disabled.
3. Update → BKG144: change group size, Save → back to BKG135 with the new value.
4. Confirm → status Booked; Mark Group Arrival disabled (start in the future).
5. Open seed Booked `4bf17b30…` on BKG135 → Mark Group Arrival enabled → BKG136 → Confirm → Completed; all buttons disabled.
6. `/login` → Tour Agency (Tràng An) → `/agency/02e568d8-d65e-54b1-a554-b411150d1dcb/bookings/{id}` (BKG138): details read-only, no action buttons.
7. Same Agency on a Booking of another Agency (e.g. `4bf17b30…`) → access denied. UBND/HDT/Guest on BKG135 → access denied.

8. API check of F-SCHED-07 (moved from §4 because `GET` belongs to US-3, analyze M3): create a Booking for Tràng An as in §4 steps 1–2, then read it as its Agency. Expect `HTTP 200`, all `actions` = `false`, `provider_profile_link` present.

macOS / Linux:

```bash
curl -s -X GET "http://localhost:3000/api/bkg/bookings/$BOOKING_ID" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=agency" -w "\nHTTP %{http_code}\n"
```

Windows PowerShell:

```powershell
curl.exe -s -X GET "http://localhost:3000/api/bkg/bookings/$BOOKING_ID" -H "Content-Type: application/json" -H "Cookie: hab_demo_account=agency" -w "\nHTTP %{http_code}\n"
```

Expected values: [contracts/manage-booking-api.md](contracts/manage-booking-api.md), [data-model.md](data-model.md).
