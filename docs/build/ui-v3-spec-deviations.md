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

## Điện thoại (dưới 768 px)

| # | Màn | Mockup / trước đây | Bây giờ | Quyết định |
|---|---|---|---|---|
| M1 | Thẻ kết quả 02, 03, 24 (`ResultCard`) | Khung ảnh `min-height: 180px`, chiều cao chạy theo tỉ lệ ảnh (ảnh dọc làm khung cao 450 px) | Khung tỉ lệ cố định `aspect-ratio: 5 / 8` (bằng khung 220 × 352 ở desktop), ảnh `object-fit: cover` phủ khung, điểm lấy nét `50% 40%` cho ảnh dọc. Khung không còn chạy theo ảnh. Ở desktop, khung 220 px cao 260–384 px tuỳ nội dung thẻ; 5/8 là mức điển hình | Human, 21/11 (bước 2B) |
| M2 | Ô nhỏ gallery 03, 04/23, 24 | Cùng ưu tiên tải với ô lớn | Ô nhỏ `loading=eager`, `fetchpriority=low`; chỉ ô lớn (ảnh LCP) là `high` | Human, 21/11 (bước 2B) |

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
