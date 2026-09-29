---
artifact: CHANGELOG_SUMMARY.md
purpose: Easy-to-read summary of the database-package changes
updated: 2026-09-29
---

# Tóm tắt thay đổi gói Database

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
- ERD `03` ↔ diagram nhúng `04` khớp byte-for-byte (67 quan hệ).

## Còn mở (cần nhóm/thầy quyết)

Uniqueness mã số thuế, nguồn catalog Village (DEMO-HN-*), retention/PII (Q-06), quyền activate ranking (Q-12),
và các sửa phía spec nêu trên.
