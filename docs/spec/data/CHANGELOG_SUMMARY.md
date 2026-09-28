---
artifact: CHANGELOG_SUMMARY.md
purpose: Easy-to-read summary of the database-package changes
updated: 2026-09-28
---

# Tóm tắt thay đổi gói Database

File này giải thích ngắn gọn những gì đã được cập nhật so với phiên bản đang có trên GitHub.

## 1. Sắp xếp lại vị trí tài liệu

Toàn bộ tài liệu database hiện nằm chung trong `docs/spec/data/` để dễ tìm và đúng cấu trúc bàn giao:

- `01-entity-dictionary.md`: danh sách các đối tượng dữ liệu.
- `02-crud-matrix.md`: chức năng nào tạo, xem, sửa hoặc xóa dữ liệu.
- `03-erd.mmd`: sơ đồ quan hệ khái niệm.
- `04-data-model.md`: mô hình dữ liệu logic, gồm cột, khóa và quan hệ.
- `05-review.md`: kết quả kiểm tra chất lượng, coverage và các câu hỏi còn mở.
- `06-physical-data-model.md`: thiết kế vật lý PostgreSQL bổ sung.
- `07-data-dictionary.md`: kiểu dữ liệu, ràng buộc và chỉ mục vật lý.
- `08-physical-erd.mmd`: ERD ở mức vật lý.
- `schema.sql`: cấu trúc PostgreSQL có thể dùng làm cơ sở triển khai.

Các file cũ trong `data/model/` và `data/seed/generated/` được thay bằng vị trí mới. Đây là thay đổi tổ chức thư mục, không phải xóa nội dung cần dùng.

## 2. Hoàn thiện bộ mô hình dữ liệu

- Mô hình logic hiện thống nhất với schema PostgreSQL và có 46 entity/table.
- Các quan hệ, khóa chính, khóa ngoại và enum được ghi rõ hơn.
- Quyền quản trị vẫn dùng role `ADMIN`, phân biệt phạm vi bằng `admin_type` (`HDT` hoặc `UBND`).
- Vòng đời Booking dùng thống nhất: `On hold → Booked → Completed/Cancelled`.
- Những quyết định đã chốt được loại khỏi danh sách câu hỏi mở; chỉ giữ lại các vấn đề thật sự cần người phụ trách xác nhận.

## 3. Bổ sung và chuẩn hóa dữ liệu mẫu

Thư mục `docs/spec/data/seed/` hiện có đúng 46 CSV, tương ứng với 46 entity trong logical model. Dữ liệu mẫu:

- Có dữ liệu liên kết giữa Agency, Provider, Village, Experience, Booking và Chat.
- Có các trạng thái đặc biệt như Cancelled, Closed, Rejected, Revision Required, Disabled và token hết hạn.
- Có dữ liệu biên như OTP đạt giới hạn thử lại, file đạt giới hạn kích thước, điểm đánh giá bằng 0 và giá trị trọng số bằng 0.
- Có các trường hợp rỗng để kiểm tra màn hình không có dữ liệu.
- `manifest.json`, `scenario_manifest.json` và `seed_coverage.json` mô tả số lượng dòng, kịch bản và coverage.

Ngoại lệ duy nhất là `roles.csv`: schema chỉ cho phép đúng ba role hợp lệ, nên file có ba dòng thay vì tạo thêm role giả không hợp lệ.

## 4. Kiểm tra consistency đã thực hiện

- 46/46 logical entity có CSV tương ứng.
- 666 tham chiếu khóa ngoại không-null đã được kiểm tra, không có vi phạm.
- Các link nội bộ của tài liệu database không còn bị hỏng.
- Các câu hỏi trong `05-review.md` đều dùng tiền tố `[NEEDS CLARIFICATION: ...]`.
- Seed generator chạy lặp lại cho kết quả ổn định.

## 5. Những việc chưa tự động thực hiện

- Chưa import trực tiếp vào PostgreSQL trên máy này vì hiện chưa có lệnh `psql` khả dụng.
- Các câu hỏi trong phần Consolidated open questions vẫn cần nhóm/thầy xác nhận trước khi triển khai production, đặc biệt là uniqueness của mã số thuế, nguồn catalog Village, retention và quyền activate ranking.

## 6. Cách đọc nhanh

Nếu chỉ cần kiểm tra tổng quan, đọc theo thứ tự:

1. `README.md`
2. `04-data-model.md`
3. `05-review.md`
4. `seed/manifest.json`
5. `seed/seed_coverage.json`
6. `schema.sql`

