# Schema Change Log: Bổ Sung Rating, Customer Reviews & AI Quality Scoring

Tài liệu này ghi nhận toàn bộ các thay đổi trong Database Schema và ERD của dự án **Hanoi Artisan Bridge (HAB)** phục vụ module Crawl dữ liệu và thuật toán AI Tour Matching.

---

## 1. Tóm tắt Thay đổi Tổng thể

| Hạng mục | Trước thay đổi (Old ERD / Initial Schema) | Sau thay đổi (New Schema) | Tác động hệ thống |
|---|---|---|---|
| **Tổng số thực thể nghiệp vụ** | 47 bảng logic + 1 bảng runtime auth limits | 51 bảng logic + 1 bảng runtime + 2 Views | Không ảnh hưởng đến các bảng cũ, giữ nguyên 100% tính tương thích |
| **Dữ liệu đánh giá của Provider** | Không có bảng lưu trữ riêng; chỉ có trường mock/hardcoded `provider_quality_rating` trong memory/seed | 2 bảng chuyên biệt: `provider_ratings` (multi-source aggregated) và `provider_reviews` (raw reviews) | Cho phép lưu trữ và cập nhật lịch sử crawl đa nền tảng (Google Maps, TripAdvisor, Klook...) |
| **Phân tích sắc thái review bằng AI** | Không có | 1 bảng chuyên biệt: `review_sentiment_analyses` | Tách biệt nội dung gốc và kết quả AI phân tích; hỗ trợ tìm kiếm khía cạnh qua GIN index |
| **Điểm chất lượng xưởng (Quality Score)** | Tạm tính bằng hardcode trong `scoring-engine.ts` | 1 bảng chuyên biệt: `provider_quality_scores` và View `v_provider_quality_summary` | Tách riêng Provider Quality Score khỏi Experience Matching Score; hỗ trợ Bayesian Rating |
| **Tính toàn vẹn & Phân quyền RLS** | Cấu hình cho 47 bảng | Mở rộng RLS và cấp quyền hạn chuẩn cho role `hab_app` trên 4 bảng mới | Đảm bảo bảo mật truy cập từ backend Server Action |

---

## 2. Chi tiết các Thay đổi Cụ thể

### 2.1. Thêm mới 4 bảng dữ liệu

#### 1. `provider_ratings`
- **Mục đích**: Lưu điểm đánh giá trung bình, tổng số lượng review và thang điểm theo từng nền tảng công khai qua các mốc thời gian crawl.
- **Khóa ngoại**: `provider_id REFERENCES provider_profiles(provider_id) ON DELETE RESTRICT`.
- **Trường nổi bật**:
  - `normalized_score_100`: Cột sinh tự động chuẩn hóa điểm về thang 100 (`rating_value / rating_scale * 100`).
  - `is_latest`: Cờ boolean đánh dấu bản ghi mới nhất, giúp query tức thì O(1).
- **Ràng buộc**: CHECK `source_platform IN ('Google Maps', 'TripAdvisor', 'Klook', 'Traveloka', 'Agoda', 'Booking.com', 'Other')` (Facebook bị cấm để đảm bảo phạm vi OTA du lịch).

#### 2. `provider_reviews`
- **Mục đích**: Lưu trữ từng bài review công khai độc lập của du khách về xưởng.
- **Khóa ngoại**: `provider_id REFERENCES provider_profiles(provider_id) ON DELETE RESTRICT`.
- **Ràng buộc duy nhất (Deduplication)**:
  `CREATE UNIQUE INDEX provider_reviews_dedup_idx ON provider_reviews (provider_id, source_platform, external_review_id) WHERE external_review_id IS NOT NULL;`
- **Bảo mật PII**: Trường `author_display_name` chỉ lưu tên công khai đã làm sạch, không lưu số điện thoại hay email cá nhân.
- **Tính bất biến**: Nội dung bài review (`cleaned_content`) được bảo toàn vĩnh viễn, không bao giờ bị ghi đè.

#### 3. `review_sentiment_analyses`
- **Mục đích**: Lưu kết quả phân tích sắc thái cảm xúc và khía cạnh trải nghiệm do mô hình AI (Google AI / Gemini) thực hiện.
- **Quan hệ**: `1-1` với `provider_reviews` thông qua `review_id UNIQUE REFERENCES provider_reviews(review_id) ON DELETE CASCADE`.
- **Trường nổi bật**:
  - `sentiment`: CHECK `('Positive', 'Neutral', 'Negative')`.
  - `sentiment_score`: Giá trị liên tục từ `-1.000` đến `+1.000`.
  - `sentiment_tags`: Mảng JSONB chứa các khía cạnh dịch vụ (`artisan_guidance`, `workshop_space`, v.v.), được đánh chỉ mục `GIN` để lọc cực nhanh.
  - `ai_model_version`: Lưu tên phiên bản mô hình AI (ví dụ: `gemini-1.5-pro`) đảm bảo truy xuất nguồn gốc.

#### 4. `provider_quality_scores`
- **Mục đích**: Lưu trữ điểm số chất lượng xưởng được tính toán định kỳ cho thuật toán AI Tour Matching.
- **Công thức tính toán**:
  - **Bayesian Adjusted Rating** (Hiệu chỉnh theo số lượng review và trọng số tiên nghiệm toàn cục).
  - **Review Volume Score** (Chuẩn hóa số lượng review theo hàm log).
  - **Review Sentiment Score** (Điểm sắc thái trung bình).
  - **Review Recency Score** (Độ mới của review có áp dụng hệ số suy giảm thời gian).
- **Trọng số cấu hình động**: Lưu trong `weight_configuration` dạng JSON (mặc định: `rating: 50%`, `volume: 20%`, `sentiment: 20%`, `recency: 10%`), không hardcode.

---

### 2.2. Thêm mới 2 Database Views

1. `v_provider_latest_ratings`:
   - View gom toàn bộ điểm rating mới nhất (`is_latest = true`) của các xưởng từ các nền tảng nguồn, phục vụ hiển thị nhanh trên UI Khám phá (`/explore`) và trang chi tiết Xưởng (`/providers/[id]`).

2. `v_provider_quality_summary`:
   - View cung cấp điểm chất lượng xưởng hiện hành (`is_current = true`), kết nối trực tiếp với `provider_profiles`, phục vụ truy vấn của Engine ghép tour AI (`/ai-matching`).

---

### 2.3. Migration Mới
- Đã tạo migration mới: `supabase/migrations/20261112224000_hab_provider_reviews_and_ratings.sql`.
- Migration không chỉnh sửa bất kỳ migration cũ nào, không làm thay đổi hay xóa dữ liệu hiện có, hoàn toàn an toàn và có thể áp dụng trực tiếp lên cơ sở dữ liệu Supabase đang chạy.

