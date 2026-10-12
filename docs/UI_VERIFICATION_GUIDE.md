# Sổ tay Hướng dẫn Kiểm tra Giao diện (UI Verification Guide)
**Hanoi Artisan Bridge — Nhóm G (Course DBIZ3)**

Server phát triển đang chạy trực tiếp tại: **`http://localhost:3000`**

---

## 🧭 1. Thanh Chuyển Đổi Vai Trò & Điều Hướng (Role Switcher)

Ở góc trên cùng của mọi trang đều có thanh công cụ cố định:
- Nút **🏺 Local Provider**: Kích hoạt vai trò Chủ xưởng Hưng Thịnh (Bát Tràng).
- Nút **🏢 Tour Agency**: Kích hoạt vai trò Công ty Lữ hành Indochina Heritage Voyages.
- Nút **🏛️ UBND Admin**: Kích hoạt vai trò Quản lý địa phương (chỉ xem profile làng nghề, không có màn quản lý/thẩm định).
- Nút **👤 Guest**: Kích hoạt vai trò khách vãng lai xem công khai.

---

## 🏢 LUỒNG 1: TOUR AGENCY (CÔNG TY LỮ HÀNH)

| Màn hình | Mã Spec | Đường dẫn kiểm tra (Click để mở) | Chức năng chính |
|---|---|---|---|
| **Trang Khám phá chung** | `EXP017` | [http://localhost:3000/explore](http://localhost:3000/explore) | Cổng Explore tra cứu làng nghề (Bát Tràng, Vạn Phúc, Phú Vinh, Chuông) và xưởng đã thẩm định dẫn vào VIL030 & PRF127 |
| **Hồ sơ Agency** | `PRF019` | [http://localhost:3000/agency/5fecc699-71e4-5bf0-ac1b-2090e05c2cd9](http://localhost:3000/agency/5fecc699-71e4-5bf0-ac1b-2090e05c2cd9) | Thể hiện tư cách pháp nhân đã duyệt, định vị thị trường, đầu mối B2B |
| **Sửa Hồ sơ Agency** | `PRF021` | [http://localhost:3000/agency/5fecc699-71e4-5bf0-ac1b-2090e05c2cd9/edit](http://localhost:3000/agency/5fecc699-71e4-5bf0-ac1b-2090e05c2cd9/edit) | **Đã áp dụng UI chuẩn wireframe tương tự PRF128** (Sections 01–04, thẻ pháp lý approved, thanh lưu ghim đáy). **Chỉ tài khoản Tour Agency mới truy cập được**; Đổi tên/MST kích hoạt tái thẩm định HDT (BR-017) |
| **Hồ sơ Làng nghề** | `VIL030` | [http://localhost:3000/village/20896522-6235-5699-aeaf-f48b8150d895](http://localhost:3000/village/20896522-6235-5699-aeaf-f48b8150d895) | Xem thông số di sản, kiểm tra xưởng đạt chuẩn và bấm Chat B2B |
| **Chat B2B với Xưởng** | `COM048` | [http://localhost:3000/messages](http://localhost:3000/messages) | **Từ góc nhìn Agency: Click nút "XEM HỒ SƠ XƯỞNG NGHỀ ↗" để mở xem Profile của Local Provider tương ứng (PRF127)** |

---

## 🏺 LUỒNG 2: LOCAL PROVIDER (XƯỞNG THỦ CÔNG)

| Màn hình | Mã Spec | Đường dẫn kiểm tra (Click để mở) | Chức năng chính |
|---|---|---|---|
| **Trang chủ** | — | [http://localhost:3000/](http://localhost:3000/) | Tổng quan nền tảng và các luồng thao tác |
| **Hồ sơ Xưởng** | `PRF127` | [http://localhost:3000/provider/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374](http://localhost:3000/provider/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374) | Giao diện chuẩn PRF127: Thông số kỹ thuật xưởng, bàn xoay, xe 45 chỗ, nghệ nhân, bảng chứng nhận UBND |
| **Sửa Hồ sơ Xưởng** | `PRF128` | [http://localhost:3000/provider/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374/edit](http://localhost:3000/provider/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374/edit) | 5 phần nhập liệu chuẩn PRF128, khóa chứng nhận làng nghề, AI Refine mô tả xưởng, thanh lưu ghim đáy |
| **Hồ sơ Làng nghề** | `VIL030` | [http://localhost:3000/village/20896522-6235-5699-aeaf-f48b8150d895](http://localhost:3000/village/20896522-6235-5699-aeaf-f48b8150d895) | Xem thông số di sản 700 năm, danh bạ xưởng trực thuộc, quy ước nguyên liệu |
| **Chat B2B với Agency** | `COM065` | [http://localhost:3000/messages](http://localhost:3000/messages) | **Từ góc nhìn Xưởng: Click nút "XEM HỒ SƠ CÔNG TY LỮ HÀNH ↗" để mở xem Profile của Agency tương ứng (PRF019)** |
| **Chặn truy cập sửa Agency** | `PRF021` | [http://localhost:3000/agency/5fecc699-71e4-5bf0-ac1b-2090e05c2cd9/edit](http://localhost:3000/agency/5fecc699-71e4-5bf0-ac1b-2090e05c2cd9/edit) | **Local Provider bị chặn truy cập hoàn toàn: Màn hình hiển thị 403 Forbidden Access Denied** |

---

## 🏛️ LUỒNG 3: UBND ADMIN (CHỈ XEM HỒ SƠ LÀNG NGHỀ)

| Màn hình | Mã Spec | Đường dẫn kiểm tra (Click để mở) | Chức năng chính |
|---|---|---|---|
| **Hồ sơ Làng nghề** | `VIL030` | [http://localhost:3000/village/20896522-6235-5699-aeaf-f48b8150d895](http://localhost:3000/village/20896522-6235-5699-aeaf-f48b8150d895) | **Chỉ xem hồ sơ làng nghề thuần túy (view-only), không có màn quản lý, không có sửa xưởng hay thẩm định** |

---

## 🧪 Các bước kiểm tra trọng tâm:

1. **Kiểm tra chặn Local Provider truy cập Sửa Agency**:
   - Chuyển sang vai trò **🏺 Local Provider** trên thanh RoleSwitcher.
   - Truy cập trực tiếp link: [http://localhost:3000/agency/5fecc699-71e4-5bf0-ac1b-2090e05c2cd9/edit](http://localhost:3000/agency/5fecc699-71e4-5bf0-ac1b-2090e05c2cd9/edit).
   - 👉 **Kết quả**: Màn hình lập tức hiển thị bảng chặn **403 FORBIDDEN · ACCESS DENIED (BR-001)**, thông báo Local Provider không có quyền truy cập, cùng nút quay về hồ sơ xưởng!
2. **Kiểm tra UI Màn Edit Agency (PRF021) khi ở vai trò Agency**:
   - Chuyển sang vai trò **🏢 Tour Agency** trên thanh RoleSwitcher.
   - Mở [Edit Agency (PRF021)](http://localhost:3000/agency/5fecc699-71e4-5bf0-ac1b-2090e05c2cd9/edit).
   - 👉 **Kết quả**: Giao diện hiển thị theo đúng UI wireframe của PRF128 (Section 01 Pháp nhân & HDT, Section 02 Định vị & Quy mô nhân sự, Section 03 Đầu mối B2B, Section 04 Tiêu chí kết nối, Thanh lưu ghim đáy). Bấm lưu thành công không bị lỗi 403!
3. **Kiểm tra liên kết 2 chiều từ Chat (Vice Versa)**:
   - Mở [Hộp thư B2B](http://localhost:3000/messages).
   - Khi ở góc nhìn **Tour Agency**: Nút **`🏺 XEM HỒ SƠ XƯỞNG NGHỀ (LOCAL PROVIDER) ↗`** mở ngay [PRF127 Xưởng Hưng Thịnh](http://localhost:3000/provider/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374).
   - Khi ở góc nhìn **Local Provider**: Nút **`🏢 XEM HỒ SƠ CÔNG TY LỮ HÀNH (TOUR AGENCY) ↗`** mở ngay [PRF019 Indochina Heritage](http://localhost:3000/agency/5fecc699-71e4-5bf0-ac1b-2090e05c2cd9).
4. **Kiểm tra Admin UBND chỉ xem Profile Làng nghề**:
   - Chọn vai trò **🏛️ UBND Admin** trên RoleSwitcher.
   - Chỉ hiển thị duy nhất liên kết **`🏛️ Xem Hồ sơ Làng nghề Bát Tràng (VIL030)`**; đã loại bỏ hoàn toàn màn thẩm định và tra cứu.
