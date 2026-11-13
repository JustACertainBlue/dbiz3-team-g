# Hanoi Artisan Bridge — Complete Database Schema Specification

Tài liệu này tổng hợp toàn bộ các bảng, trường dữ liệu, kiểu dữ liệu, ràng buộc khóa chính (PK), khóa ngoại (FK), tính nullability và enum/CHECK constraint trong hệ thống cơ sở dữ liệu PostgreSQL của **Hanoi Artisan Bridge (HAB)**, bao gồm schema ban đầu và module mới được mở rộng.

---

## Danh mục nhóm bảng

| Nhóm chức năng | Tên bảng |
|---|---|
| **Phân quyền & Định danh** | `roles`, `permissions`, `role_permissions`, `villages`, `user_accounts`, `account_status_history`, `ubnd_village_assignments`, `sessions`, `password_reset_tokens` |
| **Đăng ký đại lý & Hồ sơ** | `agency_registration_requests`, `registration_otp_challenges`, `registration_resubmission_tokens`, `registration_submission_versions`, `registration_documents`, `agency_profiles`, `agency_major_change_requests`, `agency_review_records` |
| **Xưởng thủ công & Thẩm định**| `provider_profiles`, `provider_profile_versions`, `provider_verification_reviews`, `provider_version_documents`, `provider_version_media`, `provider_operating_hours` |
| **Trải nghiệm & Media** | `stored_files`, `experiences`, `experience_discount_rules`, `profile_media`, `ai_description_drafts` |
| **Rating, Review & AI Quality (MỚI)** | `provider_ratings`, `provider_reviews`, `review_sentiment_analyses`, `provider_quality_scores` |
| **Ghép Tour AI & Cá nhân hóa**| `matching_sessions`, `matching_messages`, `tour_preference_profiles`, `recommendation_results`, `agency_preference_profiles`, `preference_signals`, `quote_requests` |
| **Khám phá & Tương tác** | `explore_sessions`, `explore_interactions`, `ranking_parameter_versions`, `ranking_quality_assessments` |
| **Đặt chỗ & Giao tiếp B2B** | `bookings`, `booking_status_history`, `chat_sessions`, `chat_participants`, `chat_messages`, `chat_attachments`, `notifications`, `audit_logs` |
| **Runtime hệ thống** | `hab_runtime.auth_rate_limits` |

---

## Chi tiết các bảng liên quan đến Crawling & AI Tour Matching

### 1. Bảng `villages` (Làng nghề)
| Tên cột | Kiểu dữ liệu | Nullable | Ràng buộc / Ý nghĩa |
|---|---|---|---|
| `village_id` | uuid | NOT NULL | **PK** |
| `source_code`| varchar(80) | NOT NULL | **UNIQUE** Mã làng nghề định danh |
| `name` | varchar(255)| NOT NULL | Tên làng nghề (ví dụ: Bát Tràng, Vạn Phúc, Phú Vinh) |
| `district` | varchar(120)| NULL | Quận/Huyện (ví dụ: Gia Lâm, Hà Đông, Chương Mỹ) |
| `city_province`| varchar(120)| NOT NULL | Tỉnh/Thành phố (Hà Nội) |
| `is_active` | boolean | NOT NULL | DEFAULT true |

---

### 2. Bảng `provider_profiles` (Hồ sơ gốc Xưởng / Nghệ nhân)
| Tên cột | Kiểu dữ liệu | Nullable | Ràng buộc / Ý nghĩa |
|---|---|---|---|
| `provider_id` | uuid | NOT NULL | **PK** |
| `user_id` | uuid | NOT NULL | **FK** -> `user_accounts(user_id)` UNIQUE |
| `village_id` | uuid | NOT NULL | **FK** -> `villages(village_id)` |
| `current_version_no` | integer | NULL | **FK** -> `provider_profile_versions` phiên bản đang soạn thảo/chờ duyệt |
| `published_version_no`| integer | NULL | **FK** -> `provider_profile_versions` phiên bản đã được UBND phê duyệt Verified |
| `verification_status`| varchar(32) | NOT NULL | CHECK: `'Draft'`, `'Pending Verification'`, `'Verified'`, `'Revision Required'` |
| `created_at` | timestamptz | NOT NULL | Thời điểm khởi tạo |
| `updated_at` | timestamptz | NOT NULL | Thời điểm cập nhật cuối (>= created_at) |

---

### 3. Bảng `provider_profile_versions` (Phiên bản nội dung hồ sơ xưởng)
| Tên cột | Kiểu dữ liệu | Nullable | Ràng buộc / Ý nghĩa |
|---|---|---|---|
| `provider_id` | uuid | NOT NULL | **PK, FK** -> `provider_profiles(provider_id)` |
| `version_no` | integer | NOT NULL | **PK** Số thứ tự phiên bản (1, 2, ...) |
| `version_status` | varchar(32) | NOT NULL | CHECK: `'Draft'`, `'Pending Verification'`, `'Verified'`, `'Revision Required'`, `'Superseded'` |
| `business_registration_number`| varchar(80)| NULL | Mã số đăng ký kinh doanh (UNIQUE khi Verified) |
| `business_name` | varchar(255)| NULL | Tên xưởng / cơ sở sản xuất |
| `craft_type` | varchar(120)| NULL | CHECK: `'Ceramics'`, `'Silk/Textile'`, `'Woodcarving'`, `'Food/Culinary'`, `'Metalwork'`, `'Paper/Painting'`, `'Other'` |
| `artisan_names` | jsonb | NULL | Danh sách nghệ nhân đại diện (`Array<string>`) |
| `location_address` | text | NULL | Địa chỉ chi tiết xưởng |
| `description` | text | NULL | Mô tả tổng quan về xưởng và tay nghề |
| `contact_information` | jsonb | NULL | Số điện thoại, email, kênh liên hệ |
| `booking_conditions` | jsonb | NULL | Điều kiện tiếp nhận đoàn, quy định hủy đặt |
| `submitted_at` | timestamptz | NULL | Thời điểm xưởng bấm gửi thẩm định |
| `published_at` | timestamptz | NULL | Thời điểm UBND phê duyệt công bố |

---

### 4. Bảng `experiences` (Trải nghiệm thủ công do xưởng cung cấp)
| Tên cột | Kiểu dữ liệu | Nullable | Ràng buộc / Ý nghĩa |
|---|---|---|---|
| `experience_id` | uuid | NOT NULL | **PK** |
| `provider_id` | uuid | NOT NULL | **FK** -> `provider_profiles(provider_id)` |
| `name` | varchar(255)| NOT NULL | Tên gói trải nghiệm |
| `description` | text | NOT NULL | Mô tả chi tiết trải nghiệm |
| `category` | varchar(80) | NOT NULL | CHECK: `'Workshop/Hands-on'`, `'Sightseeing'`, `'Culinary/Tasting'`, `'Cultural Show'`, `'Combo'` |
| `duration_minutes`| integer | NOT NULL | Thời lượng tính theo phút (> 0) |
| `price_per_person`| numeric(18,2)| NOT NULL| Giá niêm yết B2B tính trên mỗi khách (> 0) |
| `max_participants`| integer | NOT NULL | Số khách tối đa mà xưởng tiếp nhận được trong 1 khung giờ |
| `notice_period_hours`| integer | NOT NULL | Thời gian báo trước tối thiểu (tiếng) |
| `experience_location_address`| text | NOT NULL | Địa điểm diễn ra trải nghiệm |
| `cancellation_policy`| jsonb | NOT NULL | Chính sách hoàn hủy JSON |
| `archived_at` | timestamptz | NULL | Đánh dấu lưu trữ / ngừng hoạt động |
| `created_at` | timestamptz | NOT NULL | |
| `updated_at` | timestamptz | NOT NULL | |

---

### 5. Bảng `provider_ratings` (Điểm đánh giá theo nguồn crawl) — **[MỚI]**
| Tên cột | Kiểu dữ liệu | Nullable | Ràng buộc / Ý nghĩa |
|---|---|---|---|
| `rating_id` | uuid | NOT NULL | **PK** DEFAULT `gen_random_uuid()` |
| `provider_id` | uuid | NOT NULL | **FK** -> `provider_profiles(provider_id)` ON DELETE RESTRICT |
| `source_platform` | varchar(80) | NOT NULL | Nền tảng nguồn. CHECK: `'Google Maps'`, `'TripAdvisor'`, `'Klook'`, `'Traveloka'`, `'Agoda'`, `'Booking.com'`, `'Other'` |
| `rating_value` | numeric(3,2)| NOT NULL | Điểm đánh giá trung bình từ nguồn (ví dụ: 4.85) |
| `rating_scale` | numeric(3,1)| NOT NULL | Thang điểm nguồn. CHECK: `5.0` hoặc `10.0` (DEFAULT 5.0) |
| `normalized_score_100` | numeric(5,2)| NOT NULL | GENERATED ALWAYS AS `ROUND((rating_value / rating_scale) * 100, 2)` STORED |
| `total_reviews` | integer | NOT NULL | Tổng số lượng bài review trên nền tảng nguồn (>= 0) |
| `source_url` | text | NULL | URL trang đánh giá của cơ sở trên nền tảng |
| `crawled_at` | timestamptz | NOT NULL | Thời điểm công cụ crawl dữ liệu thực hiện lấy thông tin |
| `is_latest` | boolean | NOT NULL | DEFAULT `true`. Đánh dấu bản ghi crawl mới nhất |
| `created_at` | timestamptz | NOT NULL | DEFAULT `now()` |

- **Indexes & Ràng buộc**:
  - `CREATE INDEX provider_ratings_provider_idx ON provider_ratings (provider_id);`
  - `CREATE UNIQUE INDEX provider_ratings_one_latest_uq ON provider_ratings (provider_id, source_platform) WHERE is_latest = true;`
  - `CREATE INDEX provider_ratings_crawled_idx ON provider_ratings (provider_id, source_platform, crawled_at DESC);`
  - `CONSTRAINT provider_ratings_snapshot_uq UNIQUE (provider_id, source_platform, crawled_at)`

---

### 6. Bảng `provider_reviews` (Bài review của khách hàng) — **[MỚI]**
| Tên cột | Kiểu dữ liệu | Nullable | Ràng buộc / Ý nghĩa |
|---|---|---|---|
| `review_id` | uuid | NOT NULL | **PK** DEFAULT `gen_random_uuid()` |
| `provider_id` | uuid | NOT NULL | **FK** -> `provider_profiles(provider_id)` ON DELETE RESTRICT |
| `source_platform` | varchar(80) | NOT NULL | Nền tảng nguồn. CHECK tương tự `provider_ratings` |
| `external_review_id`| varchar(255)| NULL | Mã định danh review từ nền tảng gốc |
| `rating_value` | numeric(3,2)| NULL | Điểm số của từng bài review (0.0 đến thang điểm) |
| `rating_scale` | numeric(3,1)| NULL | Thang điểm review (DEFAULT 5.0) |
| `author_display_name`| varchar(120)| NULL | Tên hiển thị công khai đã ẩn PII (ví dụ "Minh T.", "Alex K.") |
| `original_language` | varchar(10) | NOT NULL | Mã ngôn ngữ ISO 639-1 (DEFAULT `'vi'`, hỗ trợ `'en'`, `'fr'`, v.v.) |
| `cleaned_content` | text | NOT NULL | Nội dung review đã làm sạch khoảng trắng, ký tự rác |
| `published_at` | timestamptz | NULL | Thời điểm bài review được đăng trên nền tảng nguồn |
| `crawled_at` | timestamptz | NOT NULL | Thời điểm thực hiện crawl bài review này |
| `review_url` | text | NULL | Đường dẫn trực tiếp đến bài review |
| `created_at` | timestamptz | NOT NULL | DEFAULT `now()` |
| `updated_at` | timestamptz | NOT NULL | DEFAULT `now()` |

- **Indexes & Unique**:
  - `CREATE UNIQUE INDEX provider_reviews_dedup_idx ON provider_reviews (provider_id, source_platform, external_review_id) WHERE external_review_id IS NOT NULL;`
  - `CREATE INDEX provider_reviews_provider_published_idx ON provider_reviews (provider_id, published_at DESC);`
  - `CREATE INDEX provider_reviews_crawled_idx ON provider_reviews (crawled_at DESC);`

---

### 7. Bảng `review_sentiment_analyses` (Phân tích AI cho từng bài review) — **[MỚI]**
| Tên cột | Kiểu dữ liệu | Nullable | Ràng buộc / Ý nghĩa |
|---|---|---|---|
| `analysis_id` | uuid | NOT NULL | **PK** DEFAULT `gen_random_uuid()` |
| `review_id` | uuid | NOT NULL | **FK** -> `provider_reviews(review_id)` ON DELETE CASCADE, **UNIQUE** |
| `sentiment` | varchar(16) | NOT NULL | Phân loại tổng quát. CHECK: `'Positive'`, `'Neutral'`, `'Negative'` |
| `sentiment_score`| numeric(4,3)| NOT NULL | Điểm số sắc thái chuẩn hóa từ `-1.000` (rất tiêu cực) đến `+1.000` (rất tích cực) |
| `sentiment_tags` | jsonb | NOT NULL | Mảng JSON các khía cạnh dịch vụ: `["artisan_guidance", "hands_on_quality", "workshop_space", "product_quality", "family_friendly", "waiting_time", "service_quality"]` |
| `aspect_sentiments`| jsonb | NULL | Chi tiết sắc thái từng khía cạnh: `{"artisan_guidance": "Positive", "waiting_time": "Negative"}` |
| `confidence_score` | numeric(4,3)| NOT NULL | Độ tin cậy của mô hình AI (`0.000` đến `1.000`) |
| `ai_model_version` | varchar(80) | NOT NULL | Tên và phiên bản mô hình AI (ví dụ: `gemini-1.5-pro`, `hab-sentiment-v1`) |
| `analyzed_at` | timestamptz | NOT NULL | DEFAULT `now()` |

- **Index**:
  - `CREATE INDEX review_sentiment_tags_gin_idx ON review_sentiment_analyses USING gin (sentiment_tags);`

---

### 8. Bảng `provider_quality_scores` (Điểm chất lượng xưởng phục vụ AI Matching) — **[MỚI]**
| Tên cột | Kiểu dữ liệu | Nullable | Ràng buộc / Ý nghĩa |
|---|---|---|---|
| `score_id` | uuid | NOT NULL | **PK** DEFAULT `gen_random_uuid()` |
| `provider_id` | uuid | NOT NULL | **FK** -> `provider_profiles(provider_id)` ON DELETE RESTRICT |
| `bayesian_rating`| numeric(5,2)| NOT NULL | Điểm rating đã hiệu chỉnh Bayesian theo số lượng review (thang 0-100) |
| `raw_average_rating`| numeric(3,2)| NOT NULL| Điểm rating trung bình cộng thô từ các nguồn (thang 0-5.0) |
| `total_reviews_count`| integer | NOT NULL | Tổng số lượng review gộp từ các nền tảng |
| `volume_score` | numeric(5,2)| NOT NULL | Điểm chuẩn hóa số lượng review theo hàm logarit (0-100) |
| `sentiment_score`| numeric(5,2)| NOT NULL | Điểm trung bình sắc thái từ các review phân tích (0-100) |
| `recency_score` | numeric(5,2)| NOT NULL | Điểm độ mới của review (áp dụng hệ số suy giảm thời gian time-decay, 0-100) |
| `final_quality_score`| numeric(5,2)| NOT NULL| Điểm chất lượng xưởng tổng hợp cuối cùng (0-100) |
| `weight_configuration`| jsonb | NOT NULL | Cấu hình trọng số JSON động. Mặc định: `{"rating": 0.50, "volume": 0.20, "sentiment": 0.20, "recency": 0.10}` |
| `calculated_at` | timestamptz | NOT NULL | Thời điểm thực hiện tính toán |
| `is_current` | boolean | NOT NULL | DEFAULT `true`. Đánh dấu điểm số hiện hành |

- **Index**:
  - `CREATE UNIQUE INDEX provider_quality_scores_current_uq ON provider_quality_scores (provider_id) WHERE is_current = true;`

---

### 9. Bảng `matching_sessions`, `recommendation_results` & `tour_preference_profiles` (AI Tour Matching)
| Bảng | Cột chính | Kiểu & Ràng buộc | Mục đích trong AI Matching |
|---|---|---|---|
| `matching_sessions` | `matching_session_id` (PK), `agency_id` (FK), `status` | uuid, varchar(10) CHECK: `'active'`, `'closed'` | Quản lý phiên hội thoại điều phối tour B2B |
| `tour_preference_profiles` | `matching_session_id` (PK, FK), `hard_constraints` (jsonb), `matching_attributes` (jsonb), `preference_weights` (jsonb) | jsonb | Lưu các ràng buộc cứng (group_size, budget, date) và trọng số ưu tiên của Agency |
| `recommendation_results` | `result_id` (PK), `matching_session_id` (FK), `experience_id` (FK), `rank` (int), `match_score` (numeric 5,2), `experience_fit_score` (numeric 5,2), `explanation` (text) | rank > 0, match_score 0-100 | Lưu danh sách Top 5 đề xuất kèm lý do phù hợp của AI |

