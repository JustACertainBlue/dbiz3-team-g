# UI v3 – deviations from `docs/spec/` (recorded, spec not edited)

Source: mockup v3 (`~/Desktop/hab-mockup-v3`, outside the repo) and the human's decisions of 18 Nov 2026
(Đợt 0 on `ui/v3-foundation`, Đợt 1 on `ui/v3-public`). `docs/spec/` is human-owned and is not changed by
these branches; each row below is a known gap between the built UI and the written spec, for the spec owner.

| # | Area | Spec says | UI v3 does | Decision |
|---|---|---|---|---|
| 1 | Main navigation | Shared screen-spec line: "Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065" | Tour Agency bar: Khám phá · Lịch sử đặt chỗ · Lịch (SCH141) · Ghép tour AI, with "Xem lịch" on BKG137 (mockup pack 19/11, png/05, png/27); messages are the header button, not a bar item. Provider bar has no "Lịch" (SCH139 reachable from in-page links) | Human, 18/11 (Đợt 0); 19/11 |
| 2 | Search | spec-EXP Q8 / Q11: no free-text search on Explore | Search bar on 01/21 and a results page `/explore/search` (keyword without diacritics, guest count ≤ `max_participants`, date via `lib/explore/availability.ts`, filters, sort, pagination as mockup 02); duration/capacity chips replace the activity-type chips | Human, 18/11 (Đợt 1 #1) |
| 3 | Guest AI | EXP120 SR-003, nav rule "Guest … with no AI navigation" | Guest sees the AI block on 01 and 23; it only links to `/login`, the guest never calls AI | Human, 18/11 (Đợt 1 #2) |
| 4 | Guest prices | F-EXPLORE-02: price hidden from Guests | Guest sees "Giá từ … /khách"; group price hidden behind a lock + "Đăng nhập để xem giá đoàn" (mockup README rule 4) | Human, mockup README (awaiting lecturer) |
| 5 | Booking request | BKG BR-002 (only the Provider creates a Booking); F-EXPLORE-11 Request Quote | "Gửi yêu cầu đặt chỗ" (04) and "Gửi yêu cầu đặt ngày này" (24) replace Request Quote; Agency self-booking flow approved by the lecturer on 15/11, built on `ui/v3-booking`; Đợt 1 only shows the button and block; quote backend code is not removed | Human, 18/11 (Đợt 1 #3) |
| 6 | Analytics consent | EXP120 #2 / SR-004: Guest analytics consent option | Consent box removed; Guests run with `tracking_scope = "No Non-essential Tracking"` and no non-essential events are sent, so nothing is recorded without consent. The Guest loses the option to opt in. Agency personalisation kept (F-EXPLORE-05) | Human, 18/11 (Đợt 1 #10.1) |
| 7 | Payments wording | Payment flow not in the current MVP slice | "Hình thức thanh toán" and QR / refund FAQ rows exist behind `PAYMENTS_ENABLED` (default false); the hold banner on 21 links "Thanh toán ngay" to the booking detail; "Không cần trả trước…" stays as fixed text | Human, 18/11 (Đợt 1 #4) |
| 8 | Content fields | No spec fields for highlights (4 items with sub-line), inclusions, guide languages, child policy, suitable-for tags, fixed time slots, workshop founding year, parking note, village distance / visit notes / tour suggestion detail / highlights (19/11) | Added by `supabase/migrations/20261118120000_hab_ui_v3_content.sql` (ADD only, not applied yet) and read with `src/lib/explore/vocabulary.ts` | Human, 18/11 (Đợt 1 #5) |
| 9 | Village images | No village media in the data model | Village image = `villages.cover_image_id`, else the first image of the village's live experiences. A village without any image is left out of 01/21 and 03a; its page 03 shows no gallery (no empty frame) | Human, 18/11 (Đợt 1 #7); 19/11 (pack 19/11: every village has a cover image) |
| 10 | Removed elements | Various screen-spec elements (breadcrumbs, verified badges, "Lịch của xưởng" link, separate detail-page footers, village catalogue box, inactive-provider text) | Removed because the approved mockup does not show them; `/explore/providers/[id]/schedule` stays until the embedded calendar on 24 works | Human, 18/11 (Đợt 1 #10) |
| 11 | Gallery order | Mockups 03/04/23/24 show the images in data order | The gallery puts landscape images (width > height) first, then the rest in their old order (stable), so the large tile gets a landscape image when the workshop has one; portrait images use `object-position: 50% 40%`. Only the order of the images changes, not the layout; an image without stored width/height counts as "not landscape". Applies to 03, 04/23 and 24 (shared `Gallery`). Also: the first image of each page (03 gallery, 04/24 large tile, 02 first card from 900 px, 03a first card) is the LCP image: eager, `fetchpriority=high`, preloaded | Human, 21/11 (step 2B image delivery; "ảnh ngang lên trước") |

## Integration of the five branches (21/11)

Added when `ui/v3-admin`, `ui/v3-account`, `ui/v3-provider`, `ui/v3-ai` and `ui/v3-booking` were merged into `ui/v3-public` (build-log Entry 118).
Screen 17 is not listed here: the new mockup shows Loại hình / Số nhân viên / Loại tour again and the form matches it.

| # | Area | Spec says | UI v3 does | Decision |
|---|---|---|---|---|
| 12 | DSH018 (screen 29) | Items 2 "Profile completion and review status" and 5 "Recent conversations" | Both panels are dropped (not in mockup 29). One line shows when UBND asked for changes; chats are reached through Tin nhắn | Human, 21/11 (accepted deviation) |
| 13 | Payments | Payment flow outside the current MVP slice | No gateway. The company reports "Công ty báo đã thanh toán" in chat and the workshop presses "Đã nhận tiền" (On hold → Booked). Wording on every screen: On hold = "Chờ thanh toán", Booked = "Đã thanh toán"; the chat pill keeps "Xưởng đã nhận tiền". The payment line of 32 and the payment block of 06/10c point to the workshop's instructions in chat. The card "Giao dịch" of 38 counts Booked only. Card "Đã nhận qua QR tháng N" of 29 = agreed price of the bookings marked "Đã nhận tiền" in the month | Human, 21/11 |
| 14 | Screens 08–14b (payment and refund set) | Described in the screen specs | Not built; left for the last wave | Human, 21/11 |
| 15 | BKG hold expiry (`spec-BKG.md` lines 453 and 542, #46) | "Automatic expiry: 72-hour On hold elapsed" | The history reason is "Hết hạn giữ chỗ" | Human, decision 11 of the booking brief; the spec owner must update the two lines |
| 16 | Request quote (BKG BR-002, F-EXPLORE-11) | `quote_requests` row | The request is a chat message of kind `Quote Request` (JSON text) because the table has no column for date, slot, guests or note; it needs a free slot of the chosen day | Booking brief, 21/11 |
| 17 | Admin review (ADM) | Workshop decision may include Reject | Workshop: Duyệt / Yêu cầu bổ sung only (the verify API has no Reject), HDT sees workshops view-only, UBND does not see Agency rows; Agency detail is HDT only | ui/v3-admin, mockup 41a |
| 18 | Experience images (decision 9 extended) | None | A card without its own photo shows the village image; an experience whose village has no image at all is hidden from lists, search, the village and workshop pages and AI results (its detail page still opens) | Human, 21/11 (integration item 11) |
| 19 | Guests field | "Số khách" as a choice list | A typed number in the search bars and the booking forms; the booking forms show the experience maximum | Human, 21/11 (integration item 5) |
| 20 | Registration refusals | AUT screens 18b–18d as pages | Popups on `/login` from `registration_status` of the 403; department contact is empty until the team gives it (button and popup hidden) | ui/v3-account |

## Điện thoại (dưới 768 px)

| # | Màn | Mockup / trước đây | Bây giờ | Quyết định |
|---|---|---|---|---|
| M1 | Thẻ kết quả 02, 03, 24 (`ResultCard`) | Ảnh trên cả chiều rộng, khung `min-height: 180px` chạy theo tỉ lệ ảnh (ảnh dọc làm khung cao 450 px); thẻ cao ~900 px khi cột chữ chỉ ~210 px | Lưới 2 cột: **hàng trên** ảnh trái 112 px (khung cố định `5 / 8` ≈ 112 × 179, `object-fit: cover`, ảnh dọc lấy nét `50% 40%`) và bên phải nhãn nghề, tên (20 px, tối đa 3 dòng rồi "…"), làng · xưởng, khoảng cách; **phần dưới** trải hết chiều ngang thẻ theo thứ tự desktop: chip (xếp ngang, `flex-wrap`, 13 px), các dòng ✓ (15 px), câu "Không cần trả trước…" (14 px), "Giá từ" + số tiền trên một dòng (22 px), nút (44 px). Chữ dài xuống dòng (`overflow-wrap: anywhere`). Desktop không đổi. Đo ở 390 px: 484 px/thẻ trên 02 và 03, 444 px trên 24 (không có dòng "không cần trả trước"); 320 px: 548–649 px; không tràn ngang ở 320, 360, 390, 600, 767 px | Khánh Linh, 21/11 (bước 2B; thay hai bố cục trước: ảnh trên 5/8, ảnh trái + cột chữ hẹp) |
| M2 | Ô nhỏ gallery 03, 04/23, 24 | Cùng ưu tiên tải với ô lớn | Ô nhỏ `loading=eager`, `fetchpriority=low`; chỉ ô lớn (ảnh LCP) là `high` | Human, 21/11 (bước 2B) |

## Màn 22 dùng giao diện v2 của Thư thay mockup v3 – Khánh Linh duyệt 25/11

Màn 22 (Ghép tour AI, AIT121) lấy giao diện v2 của Nguyễn Thị Minh Thư (PR #286, nhánh `feat/ait-on-v3`) thay cho
mockup v3 `22-GhepTourAI`, theo nhận xét của Thư trên PR #290. Chỉ phần giao diện (`src/app/ai-matching/page.tsx`,
`card-view.ts`, `ai-matching.css`) đổi; pipeline ghép, API, kiểm đầu vào/đầu ra, bảo mật của PR #290 giữ nguyên. Dữ liệu
thẻ (tên làng, giá, ảnh, điểm nổi bật) vẫn lấy từ `rec.card` do loader hiện có trên `main` dựng; thiếu dữ liệu nào thì
dòng đó ẩn.

| # | Phần | Mockup v3 (trước) | Giao diện v2 (bây giờ) |
|---|---|---|---|
| V2-1 | Khung và cuộn | Cả trang cuộn; ô soạn tin + ghi chú dính đáy với lớp mờ trắng; cột lịch sử dính, cao 100vh | Khung `.aim` cao `100dvh − var(--nav-h)`, `overflow: hidden`; cột lịch sử (`.aim__hist`) và luồng chat (`.aim__stream`) cuộn độc lập; ô soạn tin là chân khung (`flex: none`, viền trên) |
| V2-2 | Thanh điều hướng | Cuộn đi cùng trang | Đứng yên. **Khác v2 gốc:** v2 sửa `position: sticky` trong `shell.css` (file dùng chung); ở đây dùng `body:has(.aim) .hab-nav { position: sticky; top: 0 }` trong `ai-matching.css`, nên chỉ màn 22 bị ảnh hưởng và `shell.css` không đổi |
| V2-3 | Bố cục thẻ | Thẻ của màn 02 (`v3r__*`): ảnh trái, hai cột chữ / giá, chip có biểu tượng | Ảnh trên cả chiều rộng (tối đa 180 px), rồi tên, làng · xưởng, nghề, dòng thông tin (Tối đa…, Đặt trước…, thời lượng), "Vì sao hợp", "Điểm nổi bật", khối giá |
| V2-4 | Giá trên thẻ | Số khách, tổng, giá/khách, giá cũ, ghi chú xếp dọc ở cột phải | Một khối: tổng · giá/khách · số khách, rồi giá cũ / ghi chú giảm giá / "Đã gồm vật liệu…" / "Mang sản phẩm về" |
| V2-5 | "Vì sao hợp" | Toàn bộ câu giải thích | `conciseExplanation`: bỏ câu về sức chứa và ngân sách (thẻ đã có dòng thông tin và giá), không bao giờ để trống |
| V2-6 | Nút trên thẻ | Nút tròn "Nhắn tin cho xưởng" + "Xem lịch trống" | Ba nút: **Chat**, **Xem lịch trống**, **Xin báo giá** (lưới 3 cột; 2 cột dưới 768 px). Gọi đúng luồng cũ: `/api/ait/sessions/:id/chat` và `/quote`; "Xem lịch trống" mở trang trải nghiệm `#lich`, nơi gửi yêu cầu đặt chỗ theo luồng v3 có ca trống. Không có luồng đặt chỗ riêng |
| V2-7 | Gợi ý thêm | Hiện như thẻ đầy đủ dưới tiêu đề "Gợi ý thêm" | Dòng chữ bấm được; bấm một dòng gửi `additionalSuggestionPrompt(rec)` qua đường gửi của ô soạn tin (hiện câu của Agency, phân tích, ghi lịch sử), khoá khi đang xử lý |
| V2-8 | Không lấy từ v2 | – | `AiMatchingSkeleton`/`loading.tsx` (dùng class `ait-*` không còn trong CSS), sửa `shell.css`, route `/api/ait/quota` và `test-media`, pipeline ghép / router cũ, `localizeExplanation`, đổi nghĩa `messageOutcome` |

Điện thoại: quy tắc dưới 900/768 px của v2 được mang theo cùng CSS nhưng chưa kiểm ở màn hình điện thoại (dự án chỉ đo 1440 px từ 21/11).

## Follow-ups recorded with the deviations

- `experience_slots` (migration `20261118120000_hab_ui_v3_content.sql`) grants `hab_app` SELECT only. The Provider
  experience form (mockup 32, EXP069/EXP070) will need write access (INSERT/UPDATE/DELETE + RLS policies) when slot
  editing is built; not granted now (human decision 2026-11-18 #6).
- `founded_year` and `parking_note` live on `provider_profiles`, outside the verified profile version (human decision
  2026-11-18 #4, accepted for the MVP).
- Images: no CC BY / CC BY-SA photographs in new UI work and no "Nguồn ảnh" link anywhere; `/image-credits` stays
  unlinked until every licensed photograph is replaced, then it is removed in a cleanup PR (decision #3).
- Sample chat history: `chat_messages` rows of the seed/demo data still contain "[DEMO]" in their text. They are not
  edited and the `chat_message_immutable_trg` trigger is not disabled (chat history is immutable); left as is
  (human decision 2026-11-18).
- Image import (decision 2026-11-18): `villages.cover_image_id` and `image_sources` (provenance of imported images:
  source type, page URL, licence URL, photographer, date, visible faces and consent; SELECT only for `hab_app`, never
  shown in the UI) are added to `20261118120000_hab_ui_v3_content.sql`. The import script lives on `feat/seed-image-import`.
- Screens 03 and 03a (pack 19/11, human decisions 2026-11-19): "Vì sao nên đưa đoàn đến…" merges `suitable_for` of the
  village's live experiences in vocabulary order; "Hoạt động nổi bật" lists up to 3 experience names; "Điểm nổi bật của
  làng" reads `villages.highlights` with the computed counter card second (at most 4 cards); empty `distance_km` hides
  the distance line. 03a filters by the village's main `craft_type` (no spec field for village crafts). Tests
  `vil030-card-grid` and `vil030-experience-cards` (page-source checks of the old client page) were rewritten to the
  new page; the `/api/demo/villages/[id]` API and its tests are unchanged.
