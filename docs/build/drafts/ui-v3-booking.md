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
| `tests/unit/bkg133-stat-cards.test.ts` | four stat cards (Tạm giữ/Đã đặt/Hoàn tất/Đã huỷ) in `nav.bkg-stat-cards`, `Create` before `.bkg-filters` | six tabs in `nav.v3l-tabs` with counts (Tất cả … Đã huỷ, `tab=todo`), `Tạo đặt chỗ` before the tabs | #10, 3 (screen 34 mockup) |
| `tests/unit/bkg-screens.test.ts` access tests | denied text `Chỉ Local Provider sở hữu hồ sơ này mới xem được danh sách Booking.` | `Chỉ xưởng sở hữu hồ sơ này mới xem được danh sách đặt chỗ.` | 3 |
| `tests/unit/bkg-create-validation.test.ts` required-field list | `agreed_price` missing is rejected | `agreed_price` removed from the list; missing price is priced by the server (list price, Group Discount); a given price still wins; invalid price still rejected | Part B step 1 (35 shows the price, not editable) |
| `tests/unit/bkg-change-status.test.ts`, `tests/unit/bkg-expire-holds.test.ts` | expiry reason `Automatic expiry: 72-hour On hold elapsed` | `Hết hạn giữ chỗ` | 11 |

## Checks (Part B step 0)
- `next build` exits 0 and prints no scanner line: the scanner starts only from `register()` on the Node runtime at server start.
- Only `src/lib/iac/chat-service.ts` reads chat_messages for display (list preview, history). The preview shows a sentence for Quote Request. The history API still returns the stored JSON in `text` for the chat page, which renders the card; other API clients see JSON.

## Part B step 1-3 progress (21/11, desktop)
- Browser flow of step 2 was run by API with curl (cookie jars), not in the browser: the dev login needs the DEV password, which only lives in `.env.local`, and typing it into the pane was not done. Verified in order: 04 request (POST /api/bkg/requests) → chat history shows the Quote Request → 35 create with `request_message_id` and `agreed_conditions` (note copied, price 1.425.000 from list price and 5% group discount) → 06 page 200 with the booker block → booker-info saved + "Công ty báo đã thanh toán" → 10c page shows the contact and the paid hint → "Đã nhận tiền" → Booked → 07 page 200 "Đặt chỗ của đoàn đã được xác nhận!" → arrival before the start time is correctly refused. 10d (arrival after the start) was not run: the test booking is in the future (30/11) and no past Booked booking was changed.
- Left in DEV: booking `735d8056-5521-4448-9d59-04abc7cfb5a5` (Booked, 30/11 09:00, agency Tràng An, provider demo) and its chat messages. Delete or cancel it as you prefer.
- Not built on 06 (no column): "Ai dẫn đoàn", "Hoá đơn công ty", "Giờ xe đoàn đến" are hidden. QR / bank / payment content replaced by "Thanh toán theo hướng dẫn của xưởng trong tin nhắn".
- 06 "Hoàn tất đặt chỗ" saves the contact and posts one system message "Công ty báo đã thanh toán"; pressing it twice posts two messages (not guarded).
- 34 restyled (tabs with counts, table, "Hiển thị x–y / N đặt chỗ"); 5 per page as in the mockup.
- Not done yet: 05 restyle, 10d popup, 27 calendar, 25 full restyle, edit form of 35, screenshots at 1440.
