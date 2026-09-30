---
artifact: CHANGELOG_SUMMARY.md
purpose: Easy-to-read summary of the database-package changes
updated: 2026-09-30
---

# Tóm tắt thay đổi gói Database

## Quyết định mới: ranking tự động (2026-09-30)

- Hệ thống tự tạo, kiểm tra và kích hoạt ranking version qua F-EXPLORE-17; HDT và UBND chỉ theo dõi, không sửa/kích hoạt. F-EXPLORE-18, UC-ADM-02, ADM147 và quyền `manage_rankings` đã bỏ khỏi bộ hiện hành.
- Một phiên Explore được theo dõi lưu `ranking_version_id` để biết kết quả/KPI thuộc phiên bản nào. Seed khởi tạo Active bằng System audit; kiểm tra số phiên, giới hạn thay đổi, replay và rollback nằm trong spec-EXP/consistency-contract. Bằng chứng PostgreSQL live cho cấu trúc mới còn chờ chạy lại.
- Các mục còn lại ghi thay đổi tại thời điểm thực hiện; khi nhắc ranking, quyết định ở mục này luôn là bản hiện hành.

## Đồng bộ sau review (2026-09-30)

- F-EXPLORE-17 tạo Draft, kiểm tra dữ liệu và kích hoạt/rollback ranking tự động; cả hai Admin subtype không có quyền chỉnh ranking; thao tác ghi System audit.
- Sửa seed Booking: chỉ dùng Provider Verified, ghi lịch sử từ On hold qua đúng các bước, đặt Completed sau giờ bắt đầu và giữ On hold còn hiệu lực tại thời điểm fixture. Điều kiện Booking lưu `notice_period_hours` và `cancellation_policy`.
- Bổ sung quyền Chat cho Local Provider và quyền sửa profile cho Tour Agency Owner; bỏ quyền Admin `manage_rankings`.
- Schema bổ sung ràng buộc thời gian `end_at`/duration và hình dạng snapshot; tin nhắn Chat không cho UPDATE/DELETE. Backend phải ghi status và history cùng transaction.
- `scripts/validate_seed.py` kiểm tra 47 CSV, lifecycle, eligibility, thời gian, snapshot và permission. Bản mới **chưa được chạy lại trên PostgreSQL**: máy có dịch vụ PostgreSQL 18 nhưng kết nối cần thông tin đăng nhập chưa được cung cấp. Bằng chứng PostgreSQL bên dưới chỉ thuộc lần kiểm tra trước các sửa đổi này.

### Danh sách file đã sửa trong lượt này

| File | Lý do |
|---|---|
| `01-entity-dictionary.md` | Cập nhật số Function ID và liên hệ ranking. |
| `02-crud-matrix.md` | Truy vết F-EXPLORE-17 tới ranking, assessment và audit. |
| `04-data-model.md` | Làm rõ Agency Owner, ranking, snapshot và quyền theo subtype. |
| `05-review.md` | Sửa số liệu 47, ghi kết quả kiểm tra thật và các bài test còn chờ. |
| `06-physical-data-model.md` | Ghi hợp đồng thời gian, snapshot và transaction Booking. |
| `07-data-dictionary.md` | Bổ sung subtype trong role_permissions, cập nhật trạng thái kiểm thử. |
| `CHANGELOG_SUMMARY.md` | Tóm tắt quyết định và danh sách file sửa. |
| `README.md` | Ghi cách tạo, kiểm tra seed và nạp PostgreSQL khi có quyền truy cập. |
| `schema.sql` | Ràng buộc subtype, thời gian/snapshot Booking và tin nhắn bất biến. |
| `scripts/generate_seed.py` | Tạo lại dữ liệu nhất quán từ nguồn. |
| `scripts/validate_seed.py` | Kiểm tra chéo CSV, lịch sử Booking, phạm vi quyền và audit. |
| `seed/audit_logs.csv` | Ghi khởi tạo ranking bởi System và sửa thời gian audit Booking. |
| `seed/booking_status_history.csv` | Bổ sung lịch sử On hold → Booked → Completed/Cancelled. |
| `seed/bookings.csv` | Sửa Provider, thời gian, duration và điều kiện đặt chỗ. |
| `seed/chat_messages.csv` | Đồng bộ ngữ cảnh Experience/Booking với seed mới. |
| `seed/chat_participants.csv` | Đồng bộ participant với Provider Verified. |
| `seed/chat_sessions.csv` | Đồng bộ Provider/Experience của Chat. |
| `seed/explore_interactions.csv` | Chỉ trỏ tới trải nghiệm có thể khám phá. |
| `seed/load_seed.sql` | Nạp thêm cột admin_type của role_permissions. |
| `seed/manifest.json` | Cập nhật số dòng các CSV đã tạo lại. |
| `seed/notifications.csv` | Đặt thông báo sau sự kiện Booking tương ứng. |
| `seed/preference_signals.csv` | Đồng bộ tín hiệu với Experience đã Verified. |
| `seed/quote_requests.csv` | Đồng bộ Quote với Experience có thể đặt. |
| `seed/recommendation_results.csv` | Đồng bộ kết quả gợi ý với Experience hợp lệ. |
| `seed/role_permissions.csv` | Bổ sung Chat/Profile và bỏ quyền sửa ranking của Admin. |
| `seed/scenario_manifest.json` | Mô tả fixture mới, khởi tạo ranking bởi System và trường hợp không đủ dữ liệu. |
| `seed/seed_coverage.json` | Cập nhật bằng chứng coverage theo số dòng mới. |
| `../docs/spec/docs/architecture/sequence-diagram.md` | Ghi rõ bước System tự đánh giá và kích hoạt ranking. |
| `../docs/spec/docs/architecture/use-case-diagram.md` | Bỏ use case quản trị ranking thủ công. |
| `../docs/spec/docs/consistency-contract.md` | Chốt quyền Admin, chủ sở hữu Agency và quy tắc ranking tự động. |
| `../docs/spec/docs/function-list.md` | Đưa kích hoạt vào F-EXPLORE-17 và bỏ chức năng quản trị ranking thủ công. |
| `../docs/spec/docs/screen-list.md` | Bỏ màn hình chỉnh ranking thủ công. |
| `../docs/spec/docs/traceability-matrix.md` | Đồng bộ F-EXPLORE-17 với spec và luồng System. |
| `../docs/spec/specs/spec-AUT.md` | Làm rõ quyền Admin và ranking do System phụ trách. |
| `../docs/spec/specs/spec-BKG.md` | Chốt eligibility, transaction và snapshot Booking. |
| `../docs/spec/specs/spec-EXP.md` | Mô tả ranking activation tự động, lỗi và tiêu chí nghiệm thu. |

## Áp lỗi lần 2 (2026-09-29) — punch-list sau review

Đã áp trực tiếp các lỗi thật sự cần sửa vào schema, generator và seed, rồi **nạp thử trên PostgreSQL 16
thật**: schema tạo sạch 47 bảng và toàn bộ seed nạp trong 1 transaction, mọi FK/CHECK/UNIQUE/EXCLUDE/
trigger đều pass (0 vi phạm). Danh sách thay đổi:

**Enum & nhãn (B1)**
- Chuẩn hoá nhãn seed về đúng enum English của spec: `experiences.category`, `provider_profile_versions.craft_type`,
  `preference_signals.signal_type`, `registration_documents.document_type`, `ranking_quality_assessments.assessment`
  (Good/Poor), `notifications.event_type`, `agency…tour_types`.
- Thêm CHECK enforce các enum trên (trước đây để trống, nhận nhãn tự do).

**Ảnh Experience (B2 / BR-009)**
- Mỗi Experience nay có đủ **3 category ảnh** (Activity / Space / Product) trong seed.
- `stored_files` thêm `width_px`, `height_px` + CHECK ảnh ≥ 1280×720; `profile_media.category` bắt buộc cho ảnh Experience.

**Xóa Experience (D1)**
- Bảng con sở hữu (`experience_discount_rules`, `profile_media`, `ai_description_drafts`) đổi sang `ON DELETE CASCADE`;
  các tham chiếu lịch sử/analytics/booking giữ `RESTRICT` → Experience có lịch sử thì archive, không hard delete.

**Provider hồ sơ (A1 / A4 / A3)**
- `business_registration_number` chuyển từ `provider_profiles` sang `provider_profile_versions` (là major field, versioned),
  unique trên bản Verified/Superseded.
- Các trường bắt buộc-khi-nộp của version cho phép NULL khi `Draft`, CHECK bắt buộc khi ≠ Draft → tạo được "Draft rỗng" (F-AUTH-20).
- Thêm bảng **`provider_version_documents`** để lưu chứng chỉ ĐKKD của Provider (trước đây không có chỗ).

**Chat & Matching (C1 / A8 / C3)**
- `chat_sessions.source` đồng bộ enum spec (AI Matching / Explore / Provider Profile / Quote Request / Booking).
- Thêm `matching_session_id` (FK) vào `chat_sessions` và `quote_requests` + CHECK khi nguồn là Matching.
- `chat_messages` thêm ngữ cảnh theo từng tin (`experience_id`, `quote_request_id`, `booking_id`) → hội thoại tham chiếu được nhiều ngữ cảnh.
- ERD (`03`/`04`/`08`) bổ sung các cạnh Chat↔ngữ cảnh và Matching→Chat/Quote cho khớp schema.

**Guard cứng ở DB (B5 / B6)**
- CHECK: `booking_status_history.reason` bắt buộc khi `to_status='Cancelled'`.
- Trigger: chặn tin nhắn gửi **sau** khi chat đã Closed; chặn `group_size > experiences.max_participants`.
- UNIQUE: 1 review / (registration, version) và / (provider, version).

**Khác**
- `user_accounts`: avatar chuyển sang `avatar_file_id` (FK `stored_files`), thêm `password_changed_at`; `sessions` thêm `token_hash` (A11/B11).
- Sửa 2 **lỗi có sẵn khiến schema gốc không chạy trên Postgres**: EXCLUDE của `bookings` dùng `start_at + interval`
  (chỉ STABLE) → thay bằng cột `end_at`; vòng FK booking↔chat đặt `DEFERRABLE INITIALLY DEFERRED`.
- Sửa lệch số tiêu đề: `06-physical-data-model.md` (# 06), `07-data-dictionary.md` (# 07).

**Chưa áp theo yêu cầu**: các sửa phía **spec** (group_size trong spec-PRF, DSH018 badge, VER119) được giữ lại
theo yêu cầu "tạm để lại spec". Data đã xử lý đúng phía nó; chỉ còn phần văn bản spec cần đồng bộ sau.

## Cấu trúc gói (giữ nguyên chuẩn prompt.md)

`01-entity-dictionary.md` · `02-crud-matrix.md` · `03-erd.mmd` · `04-data-model.md` · `05-review.md`
(+ physical: `06-physical-data-model.md` · `07-data-dictionary.md` · `08-physical-erd.mmd` · `schema.sql`)
· `seed/*.csv` (47 bảng) · `scripts/generate_seed.py`.

## Kiểm tra đã thực hiện

- 47/47 logical entity có CSV tương ứng.
- **Nạp thật trên PostgreSQL 16**: schema OK (47 bảng); seed load OK, 0 vi phạm ràng buộc.
- Negative test: EXCLUDE chặn booking trùng slot; trigger chặn group_size vượt max và tin nhắn sau khi đóng chat.
- ERD `03` ↔ diagram nhúng `04` khớp byte-for-byte (68 quan hệ sau bổ sung liên kết phiên Explore với bản ranking).

## Còn mở (cần nhóm/thầy quyết)

Uniqueness mã số thuế, nguồn catalog Village (DEMO-HN-*), retention/PII (Q-06),
và các sửa phía spec nêu trên.
