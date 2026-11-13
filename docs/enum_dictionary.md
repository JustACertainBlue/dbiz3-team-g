# Hanoi Artisan Bridge — Enum & Constraint Dictionary

Tài liệu này tổng hợp toàn bộ các bộ giá trị Enum (được hiện thực dưới dạng `VARCHAR` kết hợp `CHECK CONSTRAINT` chuẩn trong PostgreSQL của HAB). Mọi công cụ bên ngoài (bao gồm crawler, pipeline AI hoặc service backend) bắt buộc phải tuân thủ chính xác các chuỗi giá trị này, có phân biệt hoa/thường (case-sensitive).

---

## 1. Nguồn nền tảng Crawl (`source_platform`) — **[MỚI]**
Sử dụng trong: `provider_ratings.source_platform`, `provider_reviews.source_platform`.

| Giá trị Enum | Ý nghĩa / Nền tảng nguồn | Ghi chú quy chuẩn |
|---|---|---|
| `'Google Maps'` | Nền tảng Google Maps / Google Business Profile | Nguồn chính cho tọa độ, rating và review mở |
| `'TripAdvisor'` | Nền tảng du lịch TripAdvisor | Chuyên review của du khách quốc tế |
| `'Klook'` | Nền tảng OTA bán tour & vé hoạt động | Có review kèm vé đã xác nhận đặt |
| `'Traveloka'` | Nền tảng du lịch Đông Nam Á | Review khách du lịch khu vực |
| `'Agoda'` | Nền tảng OTA Agoda | Đánh giá lưu trú & hoạt động |
| `'Booking.com'` | Nền tảng OTA Booking.com | Đánh giá trải nghiệm & dịch vụ |
| `'Other'` | Các nguồn du lịch OTA, cổng thông tin du lịch chính thống khác | Phải kèm URL cụ thể (Facebook KHÔNG nằm trong phạm vi) |

---

## 2. Thang đo Sắc thái AI (`sentiment`) — **[MỚI]**
Sử dụng trong: `review_sentiment_analyses.sentiment`.

| Giá trị Enum | Ngưỡng điểm tương ứng (`sentiment_score`) | Định nghĩa sắc thái |
|---|---|---|
| `'Positive'` | `+0.200` đến `+1.000` | Khách hàng hài lòng, khen ngợi trải nghiệm hoặc xưởng |
| `'Neutral'` | `-0.200` đến `< +0.200` | Review mang tính mô tả thực tế, không biểu lộ rõ khen/chê |
| `'Negative'` | `-1.000` đến `< -0.200` | Khách hàng phàn nàn về dịch vụ, thời gian chờ hoặc giá cả |

---

## 3. Danh mục Khía cạnh Đánh giá AI (`sentiment_tags`) — **[MỚI - MỞ RỘNG]**
Sử dụng trong: `review_sentiment_analyses.sentiment_tags` (dạng `Array<string>` trong JSONB).

| Tag Khía cạnh | Định nghĩa | Ví dụ ngữ cảnh trong review |
|---|---|---|
| `'artisan_guidance'` | Mức độ hướng dẫn trực tiếp, tận tâm của nghệ nhân | *"Bác nghệ nhân chỉ bảo từng bước vuốt gốm rất ân cần"* |
| `'hands_on_quality'` | Chất lượng và tính thực hành thực tế của trải nghiệm | *"Được tự tay nhuộm lụa và mang sản phẩm về nhà"* |
| `'workshop_space'` | Không gian, độ thoáng mát, tính truyền thống của xưởng | *"Không gian xưởng rộng rãi, đậm chất cổ kính ven sông"* |
| `'product_quality'` | Độ tinh xảo, độ bền và tính nghệ thuật của thành phẩm | *"Sản phẩm gốm men lam rất tinh xảo và đều màu"* |
| `'family_friendly'` | Độ phù hợp cho gia đình, trẻ em hoặc đoàn người cao tuổi | *"Rất thích hợp cho trẻ em trải nghiệm nặn đất sét"* |
| `'waiting_time'` | Thời gian chờ đợi, chuẩn bị nguyên vật liệu | *"Phải chờ hơi lâu mới tới lượt ngồi bàn xoay"* |
| `'service_quality'` | Thái độ phục vụ, tiếp đón, đón tiếp của đội ngũ | *"Đội ngũ tiếp đón niềm nở, có trà sen mời khách"* |
| `'scenic_view'` | Cảnh quan làng nghề xung quanh xưởng | *"Đường vào làng lụa thanh bình, nhiều góc chụp ảnh đẹp"* |
| `'cultural_depth'` | Chiều sâu văn hóa, câu chuyện lịch sử của nghề | *"Được nghe thuyết minh về lịch sử 500 năm làng nghề"* |
| `'accessibility'` | Độ thuận tiện đường xe buýt/xe 45 chỗ, lối đi | *"Sân rộng đỗ được xe du lịch 29 chỗ thuận tiện"* |

---

## 4. Danh mục Ngành nghề Thủ công (`craft_type`)
Sử dụng trong: `provider_profile_versions.craft_type`.

| Giá trị Enum | Tên tiếng Việt | Làng nghề tiêu biểu |
|---|---|---|
| `'Ceramics'` | Gốm sứ mỹ nghệ | Bát Tràng, Kim Lan |
| `'Silk/Textile'` | Lụa & Dệt may truyền thống | Vạn Phúc, Phùng Xá |
| `'Woodcarving'` | Điêu khắc & Mộc mỹ nghệ | Chàng Sơn, Sơn Đồng |
| `'Food/Culinary'` | Ẩm thực truyền thống | Cự Đà, Ước Lễ, Phú Đô |
| `'Metalwork'` | Đúc đồng & Kim hoàn bạc | Định Công, Ngũ Xã |
| `'Paper/Painting'`| Tranh dân gian & Giấy thủ công | Hàng Trống, Đông Hồ, Giấy Dó |
| `'Other'` | Mây tre đan, nón lá, sơn mài | Phú Vinh, Chuông, Hạ Thái |

---

## 5. Loại hình Gói Trải nghiệm (`category`)
Sử dụng trong: `experiences.category`.

| Giá trị Enum | Tên tiếng Việt | Đặc điểm chính |
|---|---|---|
| `'Workshop/Hands-on'` | Thực hành tay nghề | Du khách trực tiếp tham gia chế tác sản phẩm |
| `'Sightseeing'` | Tham quan & Thưởng lãm | Tham quan quy trình sản xuất, gian trưng bày |
| `'Culinary/Tasting'` | Thưởng thức ẩm thực | Nếm thử trà truyền thống, đặc sản làng nghề |
| `'Cultural Show'` | Biểu diễn văn hóa nghệ thuật | Trình diễn kỹ thuật bậc thầy, nghi thức nghề |
| `'Combo'` | Gói kết hợp đa hoạt động | Vừa tham quan, vừa thực hành làm sản phẩm |

---

## 6. Phân loại Hình ảnh Media (`category`)
Sử dụng trong: `profile_media.category`, `provider_version_media.category`.

| Giá trị Enum | Định nghĩa | Quy tắc kiểm duyệt |
|---|---|---|
| `'Activity'` | Hoạt động thực hành, trải nghiệm của khách | Bắt buộc tối thiểu 1 ảnh cho mỗi Experience |
| `'Space'` | Không gian lò, xưởng sản xuất, sân đỗ xe | Bắt buộc tối thiểu 1 ảnh cho mỗi Experience |
| `'Product'` | Sản phẩm thủ công mỹ nghệ hoàn thiện | Bắt buộc tối thiểu 1 ảnh cho mỗi Experience |

---

## 7. Trạng thái Thẩm định Hồ sơ Xưởng (`verification_status`)
Sử dụng trong: `provider_profiles.verification_status`.

| Giá trị Enum | Ý nghĩa nghiệp vụ |
|---|---|
| `'Draft'` | Hồ sơ xưởng đang tạo, chưa nộp thẩm định |
| `'Pending Verification'` | Đã nộp lên UBND xã/huyện, đang chờ xét duyệt |
| `'Verified'` | Đã được phê duyệt xác minh chính thức |
| `'Revision Required'` | UBND yêu cầu bổ sung/chỉnh sửa thông tin hồ sơ |

---

## 8. Quyết định Thẩm định của UBND (`decision`)
Sử dụng trong: `provider_verification_reviews.decision`.

| Giá trị Enum | Ý nghĩa |
|---|---|
| `'Approve'` | Phê duyệt hồ sơ xưởng lên trạng thái Verified |
| `'Request Revision'` | Yêu cầu sửa đổi, bắt buộc kèm `revision_comments` |

---

## 9. Vai trò Người dùng (`role_code` & `admin_type`)
Sử dụng trong: `roles.role_code`, `user_accounts.admin_type`.

| `role_code` | `admin_type` | Phạm vi người dùng |
|---|---|---|
| `'ADMIN'` | `'HDT'` | Quản trị viên cấp Sở / Hội Di Sản Hà Nội |
| `'ADMIN'` | `'UBND'` | Cán bộ xã/huyện phụ trách làng nghề cụ thể |
| `'Tour_Agency'` | `NULL` | Điều phối viên công ty lữ hành B2B |
| `'Local_Provider'`| `NULL` | Chủ xưởng thủ công / Nghệ nhân làng nghề |

