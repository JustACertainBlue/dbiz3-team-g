# AIT Learning Loop & Dynamic Explore Layout Specification
**Feature Ref**: `F-MATCH-10`, `F-MATCH-14`, `F-MATCH-16`, `BR-013`, `BR-014`, `BR-021`, `BR-022`  
**Target Module**: AI Tour Matching (`/ai-matching`) $\leftrightarrow$ Heritage Explore (`/explore`)

---

## 1. Mục tiêu
Thiết lập vòng lặp học hỏi liên tục (Learning Loop) từ các phiên tư vấn AI Tour Matching để tự động điều chỉnh bố cục (Layout) và mức độ ưu tiên hiển thị (Priority) trên màn hình Khám phá (`/explore`) theo gu và nhu cầu sát sườn của từng công ty lữ hành.

---

## 2. Các Quy tắc Cốt lõi (Learning Loop Rules)

### LL-01: Cửa sổ Tươi mới 24 Giờ (24-Hour Freshness Window)
- Nhu cầu tour trong 24 giờ phản ánh trực tiếp đoàn khách mà công ty lữ hành đang chuẩn bị báo giá.
- Hệ số tăng điểm (Recency Boost) được kích hoạt ngay khi phiên AI Matching phát hiện các từ khóa nghề, làng hoặc trải nghiệm thủ công.
- Trọng số cộng thêm trong 24h:
  - Cùng nghề thủ công (Craft Affinity): $+30$ điểm
  - Cùng làng nghề (Village Affinity): $+40$ điểm
  - Phù hợp sức chứa / ngân sách: $+15$ điểm

### LL-02: Tự động Tối ưu Bố cục Explore (Dynamic Explore Layout)
1. **Hero Section Banner**:
   - Tự động hiển thị hình ảnh đại diện lớn nhất và tiêu đề của làng nghề có điểm quan tâm cao nhất trong 24 giờ qua.
2. **Village Strip (Dải làng nghề nổi bật)**:
   - Đưa làng nghề được tìm kiếm gần nhất lên vị trí đầu tiên của dải thẻ.
3. **Experience Catalog (Danh sách trải nghiệm)**:
   - Các trải nghiệm thuộc làng nghề và loại hình nghề quan tâm được sắp xếp lên đầu danh sách (`personalizedRankOrder`).

### LL-03: Suy giảm theo Thời gian (Time Decay)
- Sau 24 giờ, hệ số tăng điểm giảm dần về mức cơ sở.
- Áp dụng hàm suy giảm thời gian bán rã 30 ngày (BR-021):
  $$W(t) = W_0 \times 2^{-\frac{\Delta t}{30}}$$
- Giúp hệ thống không bị "kẹt" trong một sở thích cũ khi công ty lữ hành chuyển sang phục vụ tệp khách hàng khác.

### LL-04: Bảo toàn Dữ liệu & Quản lý Session Sạch
- Chỉ các phiên AI Matching có tin nhắn thực tế của đại lý mới được đưa vào tính toán hồ sơ sở thích.
- Các phiên rỗng bị loại bỏ hoàn toàn, không gây nhiễu dữ liệu.

### LL-05: Phạm vi Cách ly (BR-014, BR-022)
- Toàn bộ kết quả cá nhân hóa chỉ áp dụng cho riêng đại lý lữ hành đó.
- Khách vãng lai và các đại lý khác vẫn nhìn thấy thứ tự hiển thị toàn cục tiêu chuẩn.

### LL-06: Giới hạn Xưởng đã Xác minh (BR-003 Verified-Only Constraint)
- Chỉ các xưởng nghề và trải nghiệm đã được thẩm định `Verified` mới được phép đưa vào danh sách ứng viên đề xuất và vòng lặp học hỏi để lên tour/báo giá.
- Các xưởng chưa xác minh (`Draft`, `Pending Verification`, `Revision Required`) bị loại trừ khỏi luồng thương mại trực tiếp và không được gợi ý cho đại lý.

### LL-07: Ràng buộc Trần Ngân sách & Đơn giá Tối thiểu (BR-005, BR-011)
- Lọc triệt để theo trần ngân sách (`maxPrice`): Tuyệt đối không đề xuất hay hiển thị thẻ hoạt động vượt quá mức chi phí tối đa mà lữ hành yêu cầu.
- Sàn đơn giá nền tảng là 150.000 VNĐ/khách (Bát Tràng). Khi yêu cầu ngân sách dưới 150.000 VNĐ, hệ thống thông tin rõ mức sàn thực tế và gợi ý hoạt động Bát Tràng thay vì đưa ra các hoạt động có giá cao hơn.

