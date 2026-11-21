# UI v3 booking: draft notes (not the build log)

## Part A (server), 21/11
- One guard `assertTransition` (`src/lib/booking/transitions.ts`): On hold -> Booked | Cancelled; Booked -> Completed | Cancelled. Provider takes every edge; Tour Agency only cancels On hold. A cancellation needs a reason. Used by `change-status.ts` and `mark-arrival.ts`.
- `createBooking`: only for an Agency that has a Chat (any status) with the Provider; slot capacity checked inside the write lock (`slotOccupancy`).
- Capacity (decision 7) with the schema's EXCLUDE gist kept (human choice): one booking per provider time slot, so the check is group_size <= max_participants in the transaction.
- Hold expiry reason is now "Hết hạn giữ chỗ". `docs/spec/specs/spec-BKG.md` lines 453 and 542 (#46) still say "Automatic expiry: 72-hour On hold elapsed": the spec owner must update them.
- Scanner moved to `src/instrumentation.ts` (needs `experimental.instrumentationHook` in Next 14). Reads still expire due holds. No scanner existed in Explore.
- Migration `20261121100000_hab_booking_contact_fields.sql`: contact_name, contact_phone, note (nullable). Applied to DEV by the human on 21/11.
- Test fixture shim `tests/setup/booking-pair-chat.ts`: the seed has no chat for the demo agency/provider pair. Proper fix: a seed row (data/ owner), then delete the shim.

## Part B progress, 21/11 (desktop only, 1440 px)
- Mockups read from `~/Desktop/hab-mockup-v3/source` (the path in the brief was a placeholder).
- quote_requests has only agency, experience, source, matching_session_id, created_at (UNIQUE agency+experience): no column for date, slot, guests, note. No row written. The request is a chat message of kind `Quote Request` whose text is JSON (`src/lib/booking/request-card.ts`); chat_messages has no payload column either.
- 04/24: the disabled "Gửi yêu cầu" buttons now open `RequestButton` (form: date, guests, note; slot from the chosen row) then `/messages?chat_session_id=`.
- 25: request shown as pill "Đã gửi yêu cầu đặt chỗ" plus a detail card; Booking Update messages as pills (title by status, original sentence as sub line, "Xem ›"). Pill titles other than "Xưởng đã giữ chỗ" are my wording (mockup shows only that one): Đã đặt = "Xưởng đã nhận tiền", Hoàn tất = "Tour đã hoàn thành", Đã huỷ = "Đặt chỗ đã huỷ". Screen 25 is still the v9 layout, not restyled.
- 35 (create only): restyled to mockup; added "Người liên hệ" and "Số điện thoại" (not on the mockup) so the three columns can be written; "Điều kiện đã thống nhất" is stored in `note`; conditions stay the Experience snapshot; price discount line not shown. Edit form (BKG144) not restyled.
- Test edits driven by the decisions: bkg134-cancel-target (label "Huỷ"), bkg-booking-actions and bkg-booking-detail-api (agency may cancel On hold), bkg-screens (button "Đã nhận tiền").
- 34: lib supports `tab=todo` (On hold, hold_expires_at ascending); the page UI is not restyled yet.
- Found by running `next dev -p 3205`: `instrumentation.ts` must use `=== 'nodejs'` or the edge bundle pulls in `pg`. Fixed; scanner logs once.

## Existing tests changed (assertion old -> new, decision of 20/11)
| Test | Old assertion | New assertion | Decision |
|---|---|---|---|
| `tests/unit/bkg134-cancel-target.test.ts` | Cancel link text `Cancel` (regex `>Cancel</a>`) | `Huỷ`; href still `/provider/p1/bookings` | 3 (mockup wording) |
| `tests/unit/bkg-booking-actions.test.ts` "Agency" | agency has no action in any status | agency has `cancel: true` only while On hold; nothing otherwise | 5 |
| `tests/integration/bkg-booking-detail-api.test.ts` agency GET | `actions` all false | `cancel: true` (fixture is On hold), others false | 5 |
| `tests/unit/bkg-screens.test.ts` | provider button `Xác nhận` (disabled when not On hold) | button `Đã nhận tiền`, same disabled rule | 2, 3 |
| `tests/unit/bkg-change-status.test.ts`, `tests/unit/bkg-expire-holds.test.ts` | expiry reason `Automatic expiry: 72-hour On hold elapsed` | `Hết hạn giữ chỗ` | 11 |

## Checks (Part B step 0)
- `next build` exits 0 and prints no scanner line: the scanner starts only from `register()` on the Node runtime at server start.
- Only `src/lib/iac/chat-service.ts` reads chat_messages for display (list preview, history). The preview shows a sentence for Quote Request. The history API still returns the stored JSON in `text` for the chat page, which renders the card; other API clients see JSON.
