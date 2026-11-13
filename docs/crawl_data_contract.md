# Data Contract Dành Cho Công Cụ Crawl Dữ Liệu Bên Ngoài (Google AI Studio)

Tài liệu này là hợp đồng dữ liệu chuẩn (**Authoritative Data Contract**) dành riêng cho việc tích hợp công cụ crawl từ bên ngoài (như ứng dụng dựng trên **Google AI Studio** / Python Crawler). Công cụ crawl có nhiệm vụ trích xuất dữ liệu công khai từ Google Maps, OTA, mạng xã hội và chuẩn hóa thành định dạng JSON hợp lệ trước khi chuyển tiếp cho backend của **Hanoi Artisan Bridge**.

> [!IMPORTANT]
> **Quy tắc bất biến:**
> 1. Công cụ crawl **KHÔNG ĐƯỢC TỰ ĐỘNG INSERT** trực tiếp vào database qua bypass connection. Toàn bộ dữ liệu crawl phải được xuất dưới dạng payload JSON hoặc qua API endpoint kiểm duyệt.
> 2. Mọi tên bảng, tên trường, kiểu dữ liệu và bộ giá trị Enum phải trùng khớp 100% với định nghĩa dưới đây (case-sensitive).
> 3. Tuyệt đối **KHÔNG TỰ Ý SUY ĐOÁN** hoặc **BỊA ĐẶT DỮ LIỆU** (hallucination) cho các trường thiếu. Nếu không crawl được, bắt buộc để `null` hoặc theo quy tắc xử lý dữ liệu thiếu.

---

## 1. Bảng Đích 1: `provider_ratings` (Tổng hợp Điểm Đánh Giá Xưởng Theo Nền Tảng)

Bảng lưu trữ thông tin rating tổng quan của Local Provider tại từng nguồn công khai.

### 1.1. Bảng đặc tả trường dữ liệu

| Tên trường đích | Kiểu dữ liệu DB | Bắt buộc / Tùy chọn | Giá trị Enum / Ràng buộc cho phép | Định dạng dữ liệu (Format) | Quy tắc mapping từ dữ liệu crawl |
|---|---|---|---|---|---|
| `rating_id` | `uuid` | Tùy chọn (Hệ thống tự sinh) | Chuỗi UUID v4 | `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` | Nếu crawl tool không tạo, DB sẽ dùng `gen_random_uuid()` |
| `provider_id` | `uuid` | **BẮT BUỘC** | Phải tồn tại trong `provider_profiles.provider_id` | Chuỗi UUID hợp lệ | Map thông qua bảng ánh xạ danh tính xưởng (theo tên xưởng & địa chỉ) |
| `source_platform` | `varchar(80)` | **BẮT BUỘC** | `'Google Maps'`, `'TripAdvisor'`, `'Klook'`, `'Traveloka'`, `'Agoda'`, `'Booking.com'`, `'Other'` (CẤM CRAWL FACEBOOK) | Chuỗi ký tự chính xác | Map từ nền tảng đang crawl |
| `rating_value` | `numeric(3,2)` | **BẮT BUỘC** | $0.00 \le \text{value} \le \text{rating\_scale}$ | Số thực thập phân, tối đa 2 số sau dấu phẩy (vd: `4.85`) | Điểm rating trung bình đọc từ trang hồ sơ cơ sở |
| `rating_scale` | `numeric(3,1)` | Tùy chọn (Mặc định `5.0`) | `5.0` hoặc `10.0` | Số thực (vd: `5.0`, `10.0`) | Nếu nguồn dùng thang 10 (Agoda/Booking), ghi `10.0`; mặc định ghi `5.0` |
| `normalized_score_100` | `numeric(5,2)` | **CẤM NHẬP (DB tự tính)** | $0.00 \le \text{score} \le 100.00$ | Cột ảo `GENERATED ALWAYS` | Không gửi giá trị này trong payload crawl |
| `total_reviews` | `integer` | **BẮT BUỘC** | $\ge 0$ | Số nguyên không âm (vd: `152`) | Tổng số lượt đánh giá hiển thị trên trang |
| `source_url` | `text` | Tùy chọn | URL hợp lệ bắt đầu bằng `http://` hoặc `https://` | Chuỗi URL đầy đủ | URL trang web cơ sở trên nền tảng nguồn |
| `crawled_at` | `timestamptz` | **BẮT BUỘC** | Timestamp ISO 8601 có múi giờ | `YYYY-MM-DDTHH:mm:ssZ` hoặc `+07:00` | Thời điểm chính xác khi crawler thực thi request lấy trang |
| `is_latest` | `boolean` | Tùy chọn (Mặc định `true`) | `true`, `false` | Boolean | Luôn để `true` cho đợt crawl mới nhất |

---

## 2. Bảng Đích 2: `provider_reviews` (Bài Review Chi Tiết Của Khách Hàng)

Bảng lưu trữ từng bài review công khai độc lập.

### 2.1. Bảng đặc tả trường dữ liệu

| Tên trường đích | Kiểu dữ liệu DB | Bắt buộc / Tùy chọn | Giá trị Enum / Ràng buộc cho phép | Định dạng dữ liệu (Format) | Quy tắc mapping từ dữ liệu crawl |
|---|---|---|---|---|---|
| `review_id` | `uuid` | Tùy chọn (Hệ thống tự sinh) | Chuỗi UUID v4 | Chuỗi UUID hợp lệ | Crawler có thể bỏ trống để DB tự gán `gen_random_uuid()` |
| `provider_id` | `uuid` | **BẮT BUỘC** | Phải tồn tại trong `provider_profiles.provider_id` | Chuỗi UUID hợp lệ | Trỏ tới xưởng thủ công được đánh giá |
| `source_platform` | `varchar(80)` | **BẮT BUỘC** | Tương tự bảng `provider_ratings` | Chuỗi ký tự chính xác | Tên nền tảng nguồn chứa review |
| `external_review_id` | `varchar(255)` | Khuyến nghị (Dùng chống trùng) | Tối đa 255 ký tự | Chuỗi ID gốc từ nền tảng | ID của review từ Google Maps/TripAdvisor (vd: `ChZDSUhNMG9nS0VJQ0FnSUN...`) |
| `rating_value` | `numeric(3,2)` | Tùy chọn | $0.00 \le \text{value} \le \text{rating\_scale}$ | Số thực thập phân (vd: `5.0`, `4.0`) | Điểm số tác giả review chấm cho cơ sở (nếu có) |
| `rating_scale` | `numeric(3,1)` | Tùy chọn (Mặc định `5.0`) | `5.0` hoặc `10.0` | Số thực | Thang điểm của bài review |
| `author_display_name` | `varchar(120)` | Tùy chọn | Tối đa 120 ký tự, **KHÔNG CHỨA PII** | Chuỗi text (vd: `"Minh T."`, `"Du khách Pháp"`) | Tên hiển thị công khai của reviewer (loại bỏ sđt, email nếu có) |
| `original_language` | `varchar(10)` | **BẮT BUỘC** | Mã ISO 639-1 (vd: `'vi'`, `'en'`, `'fr'`, `'ja'`, `'ko'`) | Chuỗi 2-5 ký tự chữ thường | Ngôn ngữ gốc bài review (mặc định `'vi'`) |
| `cleaned_content` | `text` | **BẮT BUỘC** | Không rỗng, loại bỏ script/html/emoji lỗi | Chuỗi văn bản Unicode UTF-8 | Nội dung review đã được tiền xử lý làm sạch |
| `published_at` | `timestamptz` | Tùy chọn | ISO 8601 Timestamp | `YYYY-MM-DDTHH:mm:ssZ` | Ngày giờ bài review được đăng lên nền tảng |
| `crawled_at` | `timestamptz` | **BẮT BUỘC** | ISO 8601 Timestamp | `YYYY-MM-DDTHH:mm:ssZ` | Thời điểm crawler thực hiện bóc tách bài review này |
| `review_url` | `text` | Tùy chọn | URL hợp lệ | Chuỗi URL đầy đủ | Link trực tiếp đến bài review (deep link) |

---

## 3. Bảng Đích 3: `review_sentiment_analyses` (Phân Tích Sắc Thái & Khía Cạnh Của Google AI)

Sau khi crawl được bài review, Google AI Studio hoặc pipeline AI sẽ chạy phân tích sắc thái và xuất ra kết quả tương ứng với bảng này.

### 3.1. Bảng đặc tả trường dữ liệu

| Tên trường đích | Kiểu dữ liệu DB | Bắt buộc / Tùy chọn | Giá trị Enum / Ràng buộc cho phép | Định dạng dữ liệu (Format) | Quy tắc trích xuất từ Google AI Studio |
|---|---|---|---|---|---|
| `analysis_id` | `uuid` | Tùy chọn (Hệ thống tự sinh) | Chuỗi UUID v4 | Chuỗi UUID hợp lệ | DB tự sinh `gen_random_uuid()` |
| `review_id` | `uuid` | **BẮT BUỘC** | Phải tham chiếu đúng `provider_reviews.review_id` | Chuỗi UUID hợp lệ | Khóa ngoại 1-1 liên kết với bài review đã crawl |
| `sentiment` | `varchar(16)` | **BẮT BUỘC** | `'Positive'`, `'Neutral'`, `'Negative'` | Chuỗi ký tự chính xác | Phân loại cảm xúc tổng quát của toàn bộ nội dung review |
| `sentiment_score` | `numeric(4,3)` | **BẮT BUỘC** | $-1.000 \le \text{score} \le +1.000$ | Số thực 3 chữ số thập phân (vd: `0.850`, `-0.420`) | Điểm số mức độ tích cực/tiêu cực do mô hình tính toán |
| `sentiment_tags` | `jsonb` | **BẮT BUỘC** | Mảng các thẻ khía cạnh (Extensible aspect tags) | Mảng JSON các chuỗi (vd: `["artisan_guidance", "workshop_space"]`) | Các khía cạnh trải nghiệm được phát hiện trong bài review |
| `aspect_sentiments` | `jsonb` | Tùy chọn | Object map khía cạnh -> sắc thái | Object JSON (vd: `{"artisan_guidance": "Positive"}`) | Chi tiết phân cực cho từng khía cạnh cụ thể |
| `confidence_score` | `numeric(4,3)` | **BẮT BUỘC** | $0.000 \le \text{conf} \le 1.000$ | Số thực thập phân (vd: `0.950`) | Độ tin cậy của mô hình AI đối với phân loại này |
| `ai_model_version` | `varchar(80)` | **BẮT BUỘC** | Tối đa 80 ký tự | Chuỗi định danh mô hình (vd: `"gemini-1.5-pro-v1"`) | Định danh phiên bản mô hình Google AI thực hiện phân tích |
| `analyzed_at` | `timestamptz` | Tùy chọn (Mặc định `now()`) | ISO 8601 Timestamp | `YYYY-MM-DDTHH:mm:ssZ` | Thời điểm hoàn tất phân tích AI |

### Danh mục Tag Khía cạnh chuẩn (`sentiment_tags`):
- `artisan_guidance`: Đánh giá về sự hướng dẫn, chỉ bảo, tay nghề của nghệ nhân.
- `hands_on_quality`: Đánh giá về độ thực tế, thời lượng và chất lượng lúc khách tự tay làm sản phẩm.
- `workshop_space`: Không gian nhà xưởng, độ thông thoáng, cảnh quan lò nung/khung dệt.
- `product_quality`: Chất lượng thành phẩm thủ công, men gốm, sợi lụa, độ bền.
- `family_friendly`: Phù hợp cho trẻ nhỏ, trường học, gia đình hoặc người lớn tuổi.
- `waiting_time`: Thời gian chờ phục vụ, thời gian nung gốm/sấy sản phẩm.
- `service_quality`: Thái độ tiếp đón, nước trà, hướng dẫn viên phụ trợ.
- `scenic_view`: Vị trí, quang cảnh quanh làng nghề.
- `cultural_depth`: Chiều sâu văn hóa, lịch sử nghề được truyền tải.
- `accessibility`: Đường xe ô tô 16-45 chỗ vào xưởng, bãi đỗ, lối đi người khuyết tật.

---

## 4. Các Quy Tắc Nghiệp Vụ Cốt Lõi Khi Crawl Dữ Liệu

### 4.1. Quy tắc xác định Nguồn gốc (Data Provenance & Origin)
- Mọi bản ghi rating hoặc review đều phải gắn chính xác với `source_platform` và `source_url`.
- Cấm gộp chung rating của Google Maps và TripAdvisor thành 1 con số rồi ghi `source_platform = 'Google Maps'`. Mỗi nền tảng phải là 1 bản ghi độc lập trong `provider_ratings`.
- `crawled_at` phải ghi nhận thời điểm crawler thực hiện request, không được lấy ngày hiện tại của máy người dùng nếu chạy batch trễ.

### 4.2. Quy tắc xử lý Dữ liệu Thiếu (Missing Data Rules)
1. **Thiếu `external_review_id`**: Nếu nền tảng không cung cấp ID bài viết, để `null`. Hệ thống sẽ dựa vào hash `(provider_id, source_platform, cleaned_content, published_at)` để phát hiện trùng.
2. **Thiếu ngày đăng `published_at`**: Nếu nền tảng chỉ ghi chung chung ("3 tháng trước"), crawler phải ước tính ngày tương đối dựa trên `crawled_at` hoặc ghi `null` nếu không thể xác định, **tuyệt đối không bịa ngày cụ thể**.
3. **Thiếu điểm đánh giá `rating_value` của review**: Nhiều nền tảng cho phép viết nhận xét không kèm số sao. Trường này cho phép `null`. Sắc thái lúc này sẽ được xác định hoàn toàn qua mô hình AI (`review_sentiment_analyses`).
4. **Thiếu tên tác giả `author_display_name`**: Ghi giá trị `"Du khách ẩn danh"` hoặc để `null`.

### 4.3. Quy tắc xử lý Dữ liệu Trùng Lặp (Deduplication Rules)
- **Cấp độ Rating xưởng**: Khi crawl lại định kỳ cho cùng 1 provider và cùng 1 `source_platform`:
  - Bản ghi mới được INSERT với `is_latest = true`.
  - Trigger/backend cập nhật bản ghi cũ của cặp `(provider_id, source_platform)` thành `is_latest = false`.
- **Cấp độ Review chi tiết**:
  - Dựa trên chỉ mục duy nhất `UNIQUE(provider_id, source_platform, external_review_id)`: Nếu gặp trùng `external_review_id`, crawler thực hiện thao tác **UPSERT** (bỏ qua nếu nội dung không đổi, hoặc cập nhật nếu có sửa đổi).

### 4.4. Quy tắc Bảo Vệ Quyền Riêng Tư (PII Protection)
- **Tuyệt đối không lưu trữ**: Số điện thoại cá nhân, địa chỉ email cá nhân, số chứng minh nhân dân/CCCD, biển số xe hoặc tài khoản ngân hàng của người viết review.
- Trường `author_display_name` phải được làm sạch (chỉ giữ lại tên công khai dạng rút gọn, ví dụ "Thuan Nguyen" hoặc "H. Thu").

### 4.5. Các trường TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP TỰ SINH hoặc SUY ĐOÁN
- `rating_value` và `total_reviews` trong `provider_ratings`: Phải là con số thật hiển thị trên nền tảng nguồn, không được làm tròn sai lệch hoặc tự ước đoán.
- `cleaned_content`: Phải giữ nguyên ngữ nghĩa gốc của khách hàng, chỉ được xóa bỏ mã HTML/rác kỹ thuật, không được tự ý sửa nội dung chê thành khen.
- `provider_id`: Phải map chính xác với xưởng trong danh mục đã phê duyệt, không tự ý tạo mới Provider ID nếu chưa có trong DB.

