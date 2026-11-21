# Draft: branch ui/v3-provider (screens 29–33)

Not merged into build-log.md / ui-v3-spec-deviations.md (human merges the drafts). Desktop (1440 px) only, decision 21/11.

## Done
- 31 `/provider/[pid]/experiences`: server page; row = cover image (CoverImage), "₫/khách · phút · tối đa khách/ca · huỷ trước … hoàn …%", "N đặt chỗ sắp tới / Chưa có đặt chỗ sắp tới · cập nhật dd/mm/yyyy" or "Chưa có đặt chỗ nào"; pager 5 per page; edit and delete icons; delete popup (EXP132: delete / archive / blocked, same rule as `deleteExperience`).
- 29 `/provider/[pid]/dashboard`: greeting, 4 stat cells, month calendar (previous / current / next month, selected-day panel with agency · guests and experience · time · status), "Giờ mở cửa", "+ Tạo đặt chỗ" (existing route `bookings/new`), link "Xem lịch đầy đủ ›" to the existing `/schedule` page.
- 30 `/provider/[pid]`: owner view of mockup 24 data + edit pencil, links to own experiences and village, compact calendar. Old page kept as `LegacyProviderProfile.tsx` for the UBND review panel and for an unpublished profile.
- 33 `/provider/[pid]/experiences/[eid]`: public detail view as owner. Old page kept as `LegacyExperienceDetail.tsx` when the experience is not in the public catalog.
- 32 forms (add and edit share `ExperienceFormBody.tsx`): sections in mockup order — Thông tin chung · Ảnh trải nghiệm · Điểm nổi bật · Về trải nghiệm này (+ Rất hợp cho đoàn, hộp "Hoàn hảo cho…") · Giá & ca · Bao gồm & tiện ích · Chính sách của xưởng.
- 32 part A: `createExperience` / `updateExperience` now write the content columns (`src/lib/prf/experience-content.ts`, validation = the DB CHECK rules).
- Tests: `v3-provider-mockup-blocks.test.ts` (blocks, order, words; strings in `tests/fixtures/mockup-v3/provider-screens.json`, each verified in order against the mockup html).

## Columns of screen 32 (content block → column → type → written before → written now)
| Block | Column | Type | Before | Now |
|---|---|---|---|---|
| Điểm nổi bật (4 ô) | experiences.highlights | jsonb, NULL or 1–4 items (string or {title, sub}) | no | yes, stored as [{title, sub}] |
| Rất hợp cho đoàn | experiences.suitable_for | text[], ⊆ 10-term vocabulary | no | yes (JS array, pg serialises) |
| Hộp "Hoàn hảo cho…" | experiences.group_note | text, not blank | no | yes (public page still hard-codes the box title: needs `detailView`) |
| Bao gồm & tiện ích | experiences.inclusions | jsonb object {per_guest[], included[], take_home, notes{trong_buoi, chup_anh, an_toan, luu_y}} | no | yes |
| Ngôn ngữ hướng dẫn | experiences.guide_languages | text[] | no | yes |
| Trẻ em | experiences.child_policy | text | no | yes, one free-text line |
| Các ca trong ngày | experience_slots (slot_id, experience_id, label, start_time, end_time, weekdays smallint[]) | table | no | read only (app role has SELECT only) |
| Câu hỏi thường gặp | none | — | — | hidden (FAQ is computed in code) |
| "Rất được đoàn khách ưa thích" chips, "Người hướng dẫn" | none | — | — | hidden |
| Trẻ em từ / cần người lớn dưới (tuổi) | none (child_policy is text) | — | — | hidden; one text line instead |
| Nghề và làng nghề, Giữ chỗ 72 giờ, Hình thức thanh toán | not columns of experiences | — | — | shown read only: craft = villages.editorial_craft else craft_type label + "Làng <tên>" (GET /api/prf/provider/:id/craft-line), 72 = constant, payment sentence of 06/10c (see Differs) |

## Differs from the spec / mockup
- 29 "Đã nhận qua QR tháng N": no payment data yet; shows "—".
- 29 greeting: "Chào <full name>" (no gender field, not guessed). Dropped from the old page (not in the mockup): profile completion bar, recent chats, booking status counts, module tile grid. Kept: one UBND revision line when a revision comment exists. "Xem lịch đầy đủ ›" is not in the mockup; added so the full schedule page stays reachable.
- 30 PRF128 (AI Refine) form not redesigned: the mockup has no edit screen.
- 31 "show archived" checkbox removed (not in the mockup).
- 33 "Hiển thị công khai" switch is a read-only pill: no visibility field. Default view: nearest day from tomorrow with a free slot, 10 guests (capped at the maximum), as the mockup example; `?date=&guests=` overrides.
- 32 Hình thức thanh toán: dùng câu của 06/10c thay cho 'Thanh toán QR · tài khoản của xưởng' (Khánh Linh chốt 21/11).
- 32 category select keeps the 5 DB values ("Tự tay làm" = Workshop/Hands-on, "Xem biểu diễn" = Cultural Show); the mockup has 2 radio cards.

- Chip Rất hợp cho đoàn: sửa mockup theo bộ 10 từ DB (Khánh Linh chốt 21/11).

## Old tests changed (requirement changed: the approved v3 mockup replaced the screen; asserts are as strict as before)
- `tests/unit/dsh018-module-links.test.ts`: the tile grid is gone. Now: the dashboard links to Experiences, Bookings, the full Schedule, Create booking (existing route), profile and edit; the header gives Tổng quan / Trải nghiệm / Lịch sử đặt chỗ and the Messages button.
- `tests/prf/unit/prf127-links.test.ts`: the owner page links to `/provider/{id}/experiences` and to the village; the previous page (other viewers) still renders both links from the view.
- `tests/unit/exp070-location-field.test.ts`: label "Địa điểm tổ chức" (mockup), and the field now lives in `ExperienceFormBody`.

## Needs a shared / other-owner change (Cần sửa chung)
- Screen 29 panel: "Đã thanh toán" for a Booked day is mapped in the screen only (MonthCalendar). The shared Booking status label (`statusLabel('booking','Booked')`) is unchanged; it is not payment data, so the booking screens may want the same decision.
- `src/app/provider/provider-ui.css`: heading and link rules wrapped in `:where()` so v3 classes win (legacy pages unchanged).
- "Các ca trong ngày" editable: needs INSERT/UPDATE/DELETE grant on `experience_slots` for the app role and a write path (migration/grant not done, by instruction).
- Public detail page: the "Hoàn hảo cho…" box title is hard-coded; to show `group_note` the explore `detailView` must read it.
- Screens 29–33 not captured: they need a login (batch capture later).
