# Draft: ui/v3-admin (screens 38, 39, 40, 41, 41a)

Not merged into build-log.md or ui-v3-spec-deviations.md (rule 5). Port from here.

## Done

| Screen | Route | Files |
|---|---|---|
| 38 Tổng quan | `/admin` (Server Component, `?from=&to=`) | `src/app/admin/page.tsx`, `_v3/DateRange.tsx`, `lib/adm/v3-overview.ts`, `lib/adm/v3-loaders.ts` |
| 39 Quản lý tài khoản | `/admin/users` | `users/page.tsx`, `lib/adm/v3-accounts.ts` |
| 40 Thông tin tài khoản | `/admin/users/[userId]` (new) | `users/[userId]/page.tsx` |
| 41 Duyệt hồ sơ (list) | `/admin/agencies` and `/admin/providers` (same list) | `_v3/ReviewList.tsx`, `_v3/QueueFilters.tsx`, `lib/adm/v3-review-queue.ts` |
| 41a Chi tiết hồ sơ | `/admin/agencies/[id]` (new, Agency), `/admin/providers/[id]` (workshop) | `_v3/DecisionForm.tsx`, `_v3/profile-format.ts` |

Scope: HDT = whole city, UBND = assigned village. The scope is taken from the signed-in session only (`adminScope`),
never from the URL. UBND does not see Agency rows (`agencyReviews` is HDT only). Agency detail is HDT only.
HDT sees workshops as view only ("Sở chỉ xem, UBND xã quyết định"); only UBND gets the decision form for a workshop.

## Differences from the old screens (decided by the mockup)

- Account list: no action column, no "Tạo tài khoản mới" link, no "Duyệt Agency / Hồ sơ chờ thẩm định" links, no reset-password button
  (the reset-password API still exists, only the button is gone). `/admin/create-account` still opens by URL.
- Account info and profile review are pages, not modal dialogs (old #242 modals).
- Disable keeps the optional reason (FR-022) inside the confirmation popup of the switch.
- "Đóng → /admin/users" on the workshop page (#187) became "‹ Danh sách hồ sơ" (png/41a).
- Old dashboard filter panel (village, preset, Apply, agency/provider pickers, booking table, top-10 pairs, donut) is not on screen 38.
  Old components in `components/admin/*` and `dashboard-v9.css` are untouched and now unused by `/admin`.
- Tests rewritten because they grep the old page source: `adm095-review-entry-last-login`, `adm118-identity-role`, `adm145-close-target`,
  `ver119-account-fields`, `tests/adm/unit/adm-242-ui`. Assertions were moved to the new pages, not weakened; `adm118-disable-reason` passes unchanged.

## Mockup gaps / data gaps

1. **Giao dịch T11/2026 card (png/38) not built.** No payment data exists (payment/refund is the last wave, README rule 8). Needs a decision.
2. Chart labels follow the mockup (Hoàn thành / Đã thanh toán / Chờ thanh toán / Đã huỷ) and map to the stored booking status
   `Completed / Booked / On hold / Cancelled`. "Booked" = "Đã thanh toán" is an assumption until payments exist.
3. Funnel: "Cuộc trò chuyện mới" = chat_sessions started in the range; "Có đặt chỗ" = those chats that have a booking
   (`bookings.source_chat_session_id`); "Đã thanh toán" = Booked or Completed; "Hoàn thành tour" = Completed. Counts are distinct chats.
4. Top five: bookings created in the range, cancelled excluded, ranked by bookings then guests (`group_size`).
5. Cards: "đang hoạt động" = account Active and not pending verification; pending = workshop version in Pending Verification; Agency pending = Pending Approval.
   "Đặt chỗ tháng N" counts bookings created in the current month (all statuses, in scope).
6. Provider decision has two options (Duyệt, Yêu cầu bổ sung): `/api/prf/provider/[id]/verify` has no Reject. Agency has three.
7. Company type labels in 41a are my wording (Travel Agency = Công ty lữ hành, Tour Operator = Nhà điều hành tour, TMC); the mockup shows "Công ty lữ hành nội địa".
8. Mockup 41a shows "Đã xác minh email"; there is no such flag in the data, so the subtitle shows kind, submit time and status instead.
9. UBND version of 38, 41 and 41a is not in the mockup: same layout, UBND wording on the list lead ("Hồ sơ xác minh xưởng của làng bạn quản lý…").
10. Agency "Xem hồ sơ" from a pending row on screen 39 opens `/admin/agencies?q=<company>` (the list has no registration id in the account API).
11. Page size of the account list stays 20 (existing); the mockup shows 6 of 20.
12. File sizes in 41a come from `stored_files.file_size_bytes`; "Mở" is shown only when the original file exists in storage.

## Not verified

- No screenshots at 1440 and 390 and no side-by-side with png: the DEV password hashes replaced the fixture login (401 for thanhvien8/9 with any
  password) and the user chose to skip screenshots. Layout was written from the mockup CSS only, never seen in a browser.
- Not tested against live data: the DEV DB was only read by the unit-test fixtures, not by these pages.

## Cần sửa chung

- `components/nav/nav-model.ts`: HDT "Duyệt hồ sơ" still points to `/admin/agencies` and UBND to `/admin/providers`. Both now render the same merged list,
  so this works; a single target (e.g. `/admin/review`) and a shared `alsoActive` for `/admin/agencies/*` and `/admin/providers/*` is cleaner.
- The admin bar title in the mockup is "HAB · Quản trị" with the unit name chip; check the header shows "UBND xã <tên làng>" for UBND.
- `.sr-only` utility is not in shared CSS (the review list uses an inline style for the hidden "Thao tác" header).
