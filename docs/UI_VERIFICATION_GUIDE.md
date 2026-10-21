# Sổ tay Hướng dẫn Kiểm tra Giao diện (UI Verification Guide)
**Hanoi Artisan Bridge — Nhóm G (Course DBIZ3)**

Server phát triển đang chạy trực tiếp tại: **`http://localhost:3000`**

---

Viewed RoleSwitcher.tsx:1-100
Viewed RoleSwitcher.tsx:101-235
Viewed RoleNavbar.tsx:220-328
Created RoleSwitcher.tsx
Viewed RoleNavbar.tsx:1-100
Created RoleNavbar.tsx
Viewed page.tsx:1-100
Viewed page.tsx:95-250
Created page.tsx
Viewed page.tsx:70-130
Viewed page.tsx:270-340
Viewed page.tsx:1-60
Created page.tsx
Viewed page.tsx:85-140
Edited page.tsx
Viewed page.tsx:320-450
Edited page.tsx
Used tool: manage_task
Browser task: "Verify Role Flows and UI Separation"
Ran command: `git status -s`

Tôi đã tinh chỉnh lại toàn bộ hệ thống điều hướng và luồng hiển thị đúng theo các yêu cầu chi tiết của bạn:

---

### 1. Rút gọn thanh chuyển Role (Role Switcher trên cùng)
- **Bỏ hoàn toàn** các cụm link luồng thừa thãi bên tay phải (`LUỒNG XƯỞNG...`, `LUỒNG AGENCY...`, `GIÁM SÁT HÀNH CHÍNH ADM...`, `KHÁCH VÃNG LAI...`).
- **Chỉ giữ lại:** 
  - Huy hiệu hiển thị `TÀI KHOẢN ĐANG ĐĂNG NHẬP`
  - 4 nút chuyển role: `[🏺 Local Provider]` `[🏢 Tour Agency]` `[🏛️ UBND Admin]` `[👤 Guest]`
- **Bỏ màn chọn luồng ở trang chủ (`/`):** Khi truy cập `http://localhost:3000` hoặc khi nhấn vào bất kỳ nút role nào, hệ thống sẽ **lập tức chuyển thẳng vào màn hình chính mặc định của role đó**, không qua màn trung gian.

---

### 2. Tách biệt màn hình và Flow của từng Role

#### 🏺 Role: Local Provider
- **Màn hình mặc định:** Tự động vào thẳng **Hồ sơ Làng nghề Bát Tràng (`VIL030`)**.
- **Thanh Navigation Bar:**
  - Vì việc xem profile làng nghề xuất phát từ thông tin của tài khoản chứ không phải đang chọn các tab chức năng, nên thanh menu (`DASHBOARD`, `EXPERIENCE MANAGEMENT`, `BOOKING`, `SCHEDULE`, `MESSAGES`) **hoàn toàn không highlight trường nào**.
  - **Dropdown Avatar bên phải:** Nhấn vào avatar `NH` (`Nguyễn Văn Hưng ▾`) sẽ mở menu điều hướng cá nhân:
    - `🏺 Xem Hồ sơ Xưởng của tôi (PRF127)`
    - `👤 Thông tin Cá nhân Tài khoản (ACC129)`
    - `🚪 Đăng xuất (AUT026)`
- **Quy tắc hiển thị Làng nghề (BR-002):**
  - **Chỉ hiển thị thông tin xưởng của bạn** (`Xưởng Gốm Thủ Công Hưng Thịnh`) với 2 nút hành động: `Xem Hồ sơ Xưởng (PRF127)` và `✏ Sửa Xưởng (PRF128)`.
  - **Không hiển thị thông tin của các cơ sở khác** trong làng nghề. Hệ thống hiển thị bảng thông báo bảo mật cạnh tranh liên xưởng (BR-002) nhằm bảo vệ bí mật kinh doanh.
  - Nếu cố tình truy cập ID xưởng khác, màn hình 403 Forbidden sẽ chặn truy cập.

---

#### 🏢 Role: Tour Agency
- **Màn hình mặc định:** Tự động vào thẳng **Trang Khám phá (`/explore` - `EXP017`) đã đăng nhập**.
  - Thanh tìm kiếm có nút **`✦ AI TOUR MATCHING`** dẫn sang `/matching` (`AIT121`).
  - Hiển thị tỷ lệ chiết khấu và biểu giá B2B Net Rate cho các tour/masterclass.
- **Xem Profile Làng nghề Bát Tràng (`VIL030`):**
  - Xem được đầy đủ 3 cơ sở đã thẩm định trong làng.
  - Mỗi cơ sở có các nút nghiệp vụ B2B: `Xem Hồ sơ B2B` và `💬 Chat B2B` (`/messages`).
  - **Tuyệt đối không có nút Sửa** xưởng nào.
- **Hồ sơ Công ty Agency:**
  - Nhấn vào avatar `IH` (`Indochina Heritage Voyages ▾`) bên phải navbar để mở dropdown:
    - `🏢 Xem Hồ sơ Doanh nghiệp (PRF019)`
    - `👤 Thông tin Cá nhân (ACC129)`
    - `🚪 Đăng xuất (AUT026)`
  - Tại `PRF019`, Agency Owner có nút `✏ EDIT PROFILE` sang `PRF021` (chỉ 1 nút Discard và 1 nút Save ở bottom bar).

---

#### 👤 Role: Guest (Khách xem công khai)
- **Màn hình mặc định:** Tự động vào thẳng **Trang Khám phá công khai (`/explore` - `EXP120`)**.
- **Thanh Navigation Bar:**
  - Đã khắc phục lỗi hiển thị navbar đăng nhập: Navbar chuyển sang chế độ **`PUBLIC HERITAGE DIRECTORY`**.
  - **Không có** tên xưởng, **không có** avatar người dùng `NH` / `IH`, **không có** tab Dashboard/Messages.
  - Chỉ có 2 liên kết công khai: `Khám Phá (Explore)` và `Làng Nghề Bát Tràng (VIL030)`.
  - Bên phải có nút `Đăng nhập B2B →`.
- **Giới hạn hiển thị:**
  - Trên trang Explore: **Không có** nút `AI TOUR MATCHING`, **không hiển thị** biểu giá B2B buôn/đoàn hay nút đặt chỗ tức thì. Chỉ xem giá vé tham quan công khai và nút `Xem Chi Tiết`.
  - Trên Profile Làng nghề: Xem thông tin di sản công khai, **không có** nút Chat B2B, **không có** nút Sửa.

---

#### 🏛️ Role: UBND Admin
- **Màn hình mặc định:** Tự động vào thẳng **Profile Làng nghề Bát Tràng (`VIL030`)** với tư cách quản lý địa bàn.
- **Giao diện:**
  - Thanh tiêu đề quyền lực hành chính theo chuẩn `ADM079` (`HANOI HERITAGE & TOURISM ADMINISTRATION · HỘI ĐỒNG THẨM ĐỊNH`), không dùng thanh ngang người dùng tiêu dùng.
  - Trên Profile Làng nghề, các xưởng hiển thị nút **`📋 Thẩm định Hồ sơ Di sản`** dẫn sang `PRF127`.
  - Tại `PRF127`, Admin có bảng điều khiển thẩm định di sản (với các nút `Yêu cầu sửa đổi` và `✔ Phê duyệt (Approve)`).
  - Avatar `UB` mở dropdown xem các tác vụ thẩm định và đăng xuất.

---

### Danh sách các tệp tin đã chỉnh sửa:

1. [`src/app/components/RoleSwitcher.tsx`](file:///c:/Users/Admin/dbiz3-team-g/src/app/components/RoleSwitcher.tsx): Bỏ toàn bộ link luồng thừa bên phải; nhấn nút role sẽ chuyển trạng thái và `router.push` ngay vào màn chính của role.
2. [`src/app/components/RoleNavbar.tsx`](file:///c:/Users/Admin/dbiz3-team-g/src/app/components/RoleNavbar.tsx): Tách riêng 4 thanh navbar cho 4 role; Local Provider không highlight tab nào khi xem profile; bổ sung dropdown menu avatar ở góc phải và modal xem thông tin cá nhân `ACC129`.
3. [`src/app/page.tsx`](file:///c:/Users/Admin/dbiz3-team-g/src/app/page.tsx): Bỏ trang chọn luồng; tự động redirect về màn chính mặc định theo vai trò đang chọn.
4. [`src/app/explore/page.tsx`](file:///c:/Users/Admin/dbiz3-team-g/src/app/explore/page.tsx): Tách biệt chế độ Tour Agency (có `AI TOUR MATCHING`, B2B rate) và Guest (chỉ xem thông tin công khai, ẩn tính năng AI).
5. [`src/app/village/[villageId]/page.tsx`](file:///c:/Users/Admin/dbiz3-team-g/src/app/village/%5BvillageId%5D/page.tsx): Tách biệt quyền hiển thị theo 4 role: Local Provider (ẩn xưởng đối thủ theo BR-002), Tour Agency (xem 3 xưởng, không có nút sửa, có chat B2B), Guest (xem công khai, không có nút sửa/chat), UBND (thẩm định di sản).
6. [`src/app/components/RoleNavbar.tsx`](file:///c:/Users/Admin/dbiz3-team-g/src/app/components/RoleNavbar.tsx): Rút gọn dropdown avatar cho cả Local Provider và Tour Agency, chỉ giữ lại đúng 3 chức năng cốt lõi theo spec (PRF127/PRF019, ACC129, AUT026).

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
