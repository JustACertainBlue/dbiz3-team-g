# Mốc hiệu năng ảnh – trước khi tối ưu (20/11/2026)

Bước 1 – CHỈ ĐO, chưa sửa code. Góp ý của thầy: "ảnh > 300 KB, chỉ cần 30–50 KB; chưa tối ưu kích cỡ theo vị trí; thứ tự load chưa hợp lý".

## Cách đo (đọc trước khi dùng số)

- **Không phải điểm Lighthouse chính thức.** Máy không có Lighthouse. Bản Lighthouse 13.5 đóng gói trong `chrome-devtools-mcp` đã bị cắt
  các audit hiệu năng (LCP, network… đều là "Shim Audit"). Tải `lighthouse` từ npm là tải gói mới, nên mình chưa làm khi chưa hỏi.
- Thay vào đó: Chrome thật (headless) + CDP, **throttling theo preset Lighthouse** (kiểu DevTools):
  - mobile: 412×823, DPR 1,75, RTT 150 ms, 1,6 Mbps, CPU chậm 4×;
  - desktop: 1350×940, 10 Mbps, RTT 40 ms.
- Mỗi trang 3 lần, mỗi lần một context mới, tắt cache. LCP = `PerformanceObserver` (largest-contentful-paint). Byte = `encodedDataLength`.
  Không cuộn trang.
- **Web thật**: https://hanoi-artisan-bridge.onrender.com (Render, PROD). Chỉ GET như khách, không đăng nhập.
- **Giao diện mới**: `ui/v3-public` @ `b9c42ba`, `npm run build` + `next start` (cổng 3100) trên Mac.
  - `.env.local` của repo chính – **suy ra là DEV, chưa xác minh được ref**: lệnh in ref bị chặn, mình không đọc `.env*`.
- Số dao động rất lớn giữa các lần (LCP 4–18 s cùng một trang): thời gian chờ server của `/api/prf/media` thay đổi theo tải.
  **Dùng trung vị, đọc như bậc độ lớn, không như số tuyệt đối.**

## Bảng 1 – Tổng quan (trung vị 3 lần)

| Trang | Thiết bị | LCP (ms) | Phần tử LCP | Tổng tải | Ảnh tải khi chưa cuộn | Dung lượng ảnh |
|---|---|---|---|---|---|---|
| **Web thật** `/explore` | mobile | **7 400** (4 072–17 956) | ảnh `/api/prf/media` | 4 018 KB | **16** | **3 626 KB** |
| Web thật `/explore` | desktop | **18 544** (16 096–18 684) | ảnh | 4 024 KB | 16 | 3 626 KB |
| **Web thật** chi tiết trải nghiệm `07eff529…` | mobile | **10 452** (8 236–11 796) | ảnh | 1 046 KB | 4 | 675 KB |
| Web thật chi tiết | desktop | **11 992** (3 884–12 704) | ảnh | 1 044 KB | 4 | 675 KB |
| v3 **01** `/explore` | mobile | 5 972 | chữ H1 | 2 714 KB | 12 | 2 393 KB |
| v3 01 | desktop | 4 824 | chữ H1 | 2 941 KB | 12 | 2 595 KB |
| v3 **02** `/explore/search` | mobile | 2 596 | chữ H1 | 1 520 KB | 9 | 1 228 KB |
| v3 02 | desktop | 19 180 | ảnh thẻ kết quả | 1 546 KB | 9 | 1 228 KB |
| v3 **03** `/village/c0d0d95f…` | mobile | 19 624 | ảnh | 1 299 KB | 7 | 1 020 KB |
| v3 03 | desktop | 10 052 | ảnh | 1 324 KB | 7 | 1 020 KB |
| v3 **04** `/explore/experiences/07eff529…` | mobile | 3 932 | chữ H1 | 854 KB | 4 | 510 KB |
| v3 04 | desktop | 19 428 | ảnh gallery chính | 875 KB | 4 | 510 KB |
| v3 **24** `/explore/providers/4142a46a…` | mobile | 25 748 | ảnh | 1 958 KB | 5 | 1 618 KB |
| v3 24 | desktop | 26 012 | ảnh | 1 977 KB | 5 | 1 618 KB |

Mốc Google "tốt": LCP ≤ 2 500 ms. Ảnh chiếm **80–90 %** tổng dung lượng mọi trang.

## Bảng 2 – Ảnh nặng nhất (đều là JPEG, đều trả bản gốc)

| Ảnh (file_id) | KB | Kích thước gốc | Hiển thị (CSS px) | Trang | Ghi chú |
|---|---|---|---|---|---|
| `37dc83f7…` (demo84-illustration-embroidery) | **554** | 1280×1023 | 136×192 (mobile), 164×232 (desktop) | web thật /explore, v3 01, 24 | trong khung nhìn ở web thật |
| `e65402fd…` | **554** | 1280×1023 | 346×195 / 258×145 | web thật /explore, v3 01 | ngoài khung nhìn vẫn tải |
| `e3cf091f…` | **554** | 1280×1023 | 362×204 / 258×145 | v3 24 | lazy nhưng vẫn tải |
| `6b3930ae…` | 257 | 1280×960 | 136×192 / 364×162 | web thật, v3 01 | v3 01 tải **2 lần** (no-store) |
| `da03d290…` | 257 | 1280×960 | 346×195 | web thật /explore | |
| `e0a66ab5…` / `eb4843b4…` | 216 | 1280×960 | 136×192 / 364×162 | web thật, v3 01 | |
| `0852548f…` / `5588be7c…` | 194 | 1280×960 | 322×242 / 220×352 | v3 01, 02 | |
| `706a077a…` (silk) | 170 | 1280×960 | 362×135 (thật), 531×440 (v3 04 desktop) | mọi trang chi tiết | ảnh LCP của 04 và 24 |

- Ảnh hiển thị lớn nhất cũng chỉ 531×440 CSS px (≈ 930 px thực trên mobile DPR 1,75). Thẻ chỉ 136–364 px.
  - Tất cả đều nhận bản 1280 px → dư **~4–80 lần** số điểm ảnh.
- Thầy nói 30–50 KB: hiện **không ảnh nào dưới 76 KB**. Ảnh nhỏ nhất là ceramics mới, 76 KB, bản 1280×960.
- Ảnh trong catalog vừa thay chỉ 76–263 KB. Ba ảnh **554 KB** là ảnh minh hoạ seed khác (`demo84-illustration-*`, 1280×1023),
  không thuộc 6 ảnh đã thay.

## Bảng 3 – Thời gian phản hồi `/api/prf/media`

| Đo ở đâu | TTFB | Tổng |
|---|---|---|
| Web thật, curl không throttle, 3 ảnh × 3 lần | **2,08–3,66 s** (trung vị ~2,25 s) | 2,2–4,2 s |
| Web thật trong trang /explore (16 ảnh song song, mobile) | 1,3–10,4 s | 2,6–22,7 s |
| v3 local, trang 04 (3 ảnh) | 16,6–21,9 s | 16,8–24,3 s |
| v3 local, trang 24 (5 ảnh) | 20,7–22,4 s | 21–28,7 s |

→ Thời gian **chờ server** (trước byte đầu tiên) lớn hơn thời gian tải byte. Có nhiều ảnh cùng lúc thì càng chậm.
Trang HTML thì nhanh: TTFB của document 40–470 ms.

## Hiện trạng (đọc code `ui/v3-public` @ `b9c42ba` + header thật)

**`GET /api/prf/media/[fileId]`** (`src/app/api/prf/media/[fileId]/route.ts`, `src/lib/prf/media-store.ts:27`):
- Mỗi request:
  - đọc `stored_files`;
  - kiểm quyền bằng nhiều truy vấn: `repo.all('provider_version_documents')`, `repo.all('provider_version_media')`, `repo.all('profile_media')`
    – mỗi cái đọc cả bảng – rồi `provider_profiles` / `provider_profile_versions` / `user_accounts` / `villages` theo từng dòng;
  - **tải cả object từ Supabase Storage về server** (`readObject`), rồi trả nguyên bytes.
- Trả **đúng file gốc**: JPEG 1280×960 hoặc 1280×1023. Không resize, không WebP/AVIF, không có tham số kích thước.
- Header thật (web thật):
  - `cache-control: private, no-store` → trình duyệt và Cloudflare **không cache** (`cf-cache-status: DYNAMIC`);
  - không có `ETag`/`Last-Modified`.
  - Cùng một ảnh xuất hiện 2 lần trên trang thì tải 2 lần.
- `next.config.mjs`: `images: { unoptimized: true }` (ADR 0002, tắt Image Optimizer vì advisory Next 14). Không dùng `next/image`.

**Thẻ `<img>`** (đo trên DOM):

| | Web thật | v3 |
|---|---|---|
| `loading` | **không có lazy** (0/20 ảnh /explore, 0/6 chi tiết) | `CoverImage`: mọi ảnh `lazy`, trừ `Gallery` (04, 24, đầu trang 03) = `eager` |
| `width`/`height` | không có | không có (khung giữ bằng CSS `aspect-ratio`/kích thước, CLS thấp) |
| `srcset`/`sizes` | không | không |
| `fetchpriority` | không | không; mọi ảnh ưu tiên **Low**, kể cả ảnh LCP |
| Preload ảnh LCP | không | không |

**Ảnh LCP từng trang**:
- Web thật `/explore`: ảnh thẻ `0c22e70d…`.
- Web thật chi tiết: ảnh `706a077a…`.
- v3 01: chữ H1 hero (không có ảnh hero).
- v3 02: H1 (mobile), ảnh thẻ đầu `1dbb0294…` (desktop).
- v3 03: ảnh `d185dcab…` / `35fa9e03…`.
- v3 04: H1 (mobile), ảnh gallery chính `706a077a…` (desktop).
- v3 24: ảnh `706a077a…`.

**Thứ tự load**:
- Web thật: 16/20 ảnh /explore tải ngay, kể cả ngoài màn hình, tranh băng thông với ảnh LCP.
- v3: có lazy, nhưng Chrome tải trước các ảnh lazy trong khoảng ~1 250–2 500 px dưới màn hình. Vì vậy 01 vẫn tải 12 ảnh (2,4 MB)
  dù **0 ảnh trong khung nhìn**.
- Ảnh LCP không được ưu tiên.

## Số để báo thầy (tóm tắt)

- Web thật `/explore` (mobile, 4G chậm): **LCP ~7,4 s**, **16 ảnh / 3,6 MB** tải trước khi cuộn; ảnh nặng nhất **554 KB**, ảnh nhỏ nhất ~76 KB.
  Tất cả 1280 px, trong khi khung hiển thị 136–364 px.
- Trang chi tiết: LCP ~10,5 s (mobile), 4 ảnh / 675 KB.
- `/api/prf/media`: **~2,2 s TTFB mỗi ảnh** khi không có tải; `no-store` nên không cache được.
- Giao diện v3 đã giảm 01 xuống **12 ảnh / 2,4 MB** (có lazy), nhưng chưa đổi kích cỡ ảnh, chưa cache, ảnh LCP chưa ưu tiên.

Dữ liệu thô lưu ngoài repo.

## Lighthouse chính thức (20/11/2026)

`npx lighthouse@13.5.0` (không thêm vào package.json); Chrome headless; chỉ hạng mục Performance. Mobile = mặc định (giả lập
Moto G Power, 4G chậm, CPU 4×, throttling *simulated*); desktop = `--preset=desktop`. Mỗi trang mở một lần trước khi đo (Render
không ngủ), rồi 3 lần, lấy trung vị (điểm và từng chỉ số lấy trung vị riêng; audit ảnh lấy từ lần có LCP trung vị). Chỉ GET, không
đăng nhập. Dữ liệu thô lưu ngoài repo.

| Trang | Thiết bị | Performance (3 lần) | LCP | TBT | CLS | Speed Index | FCP | Tổng tải |
|---|---|---|---|---|---|---|---|---|
| `/explore` | mobile | **67** (64, 67, 73) | **5,0 s** | 106 ms | 0,022 | **15,9 s** | 1,2 s | 4 020 KB |
| `/explore` | desktop | **86** (87, 86, 84) | 1,3 s | 0 ms | 0,050 | 6,8 s | 0,6 s | 4 027 KB |
| `/explore/experiences/07eff529…` | mobile | **78** (78, 87, 78) | **3,8 s** | 90 ms | 0,009 | 4,2 s | 1,1 s | 1 048 KB |
| `/explore/experiences/07eff529…` | desktop | **95** (95, 95, 94) | 1,0 s | 0 ms | 0,053 | 2,0 s | 0,5 s | 1 048 KB |

Lighthouse 13 đã gộp các audit cũ thành "insights"; tên trong yêu cầu không còn trong báo cáo 13.5.0 (`properly-size-images`,
`modern-image-formats`, `uses-long-cache-ttl`, `lcp-lazy-loaded`, `prioritize-lcp-image` đều không có). Tương ứng:

| Audit cũ → insight 13.5 | /explore mobile | /explore desktop | chi tiết mobile | chi tiết desktop |
|---|---|---|---|---|
| **Image delivery** (`image-delivery-insight`) – tổng tiết kiệm ước tính | **2 753 KB** / 3 285 KB ảnh (14 ảnh), LCP −200 ms | **3 220 KB** / 3 449 KB (15 ảnh) | 330 KB / 339 KB (2 ảnh) | **567 KB** / 673 KB (4 ảnh), LCP −100 ms |
| ↳ phần "ảnh lớn hơn khung hiển thị" (≈ `properly-size-images`) | 2 377 KB | 2 144 KB | 328 KB | 546 KB |
| ↳ phần "WebP/AVIF hoặc nén mạnh hơn" (≈ `modern-image-formats`) | 1 452 KB | 1 466 KB | 40 KB | 122 KB |
| **Cache** (`cache-insight`, ≈ `uses-long-cache-ttl`) | đạt (0 mục) | đạt | đạt | đạt |
| **LCP discovery** (`lcp-discovery-insight`, ≈ `prioritize-lcp-image` + `lcp-lazy-loaded`) | **không đạt**: thiếu `fetchpriority=high`; ảnh LCP không lazy (đạt); có trong HTML ban đầu (đạt) | không đạt (như trên) | không đạt (như trên) | không đạt (như trên) |

- Hai phần "↳" chồng nhau trên cùng một ảnh (Lighthouse tính tổng tiết kiệm mỗi ảnh = mức lớn hơn), nên cộng hai dòng sẽ lớn hơn tổng.
- Ảnh nặng nhất theo Lighthouse: `37dc83f7…` 553 KB, tiết kiệm được 530–543 KB (hiển thị 136×192 / 420×336 trên mobile).
- **Cache "đạt" không có nghĩa là tốt**: `/api/prf/media` trả `Cache-Control: private, no-store`; Lighthouse 13 bỏ qua tài nguyên
  `no-store` (cố ý không cache) nên không báo. Thực tế mỗi lần mở trang tải lại toàn bộ ảnh (xem Bảng 3).
- Ảnh LCP: mobile /explore là ảnh hero `0c22e70d…` (412×340); desktop /explore là thẻ đầu dải; chi tiết là ảnh chính `706a077a…`.
- Vì sao LCP ở đây thấp hơn bảng 1 (5,0 s so với 7,4 s): Lighthouse mobile mặc định dùng throttling *simulated* (ước tính từ một
  lần tải không throttle), còn bảng 1 throttle thật trên mạng. Báo thầy dùng bảng này (số chuẩn); bảng 1 cho thấy độ dao động thật.

## Sau bước 2B (21/11/2026)

Giao diện `ui/v3-public` sau khi áp ảnh WebP 400/800/1600 (`?w=&v=`, `srcset`/`sizes`, ảnh LCP `fetchpriority=high` + preload, thứ tự tải,
gallery ảnh ngang lên trước). Bản build local (`npm run build` + `next start`, cổng 3100) trên dữ liệu DEV.
`npx lighthouse@13.5.0` (không thêm vào package.json), chỉ Performance, mobile = mặc định (throttling *simulated*), desktop = `--preset=desktop`.
Mỗi trang 1 lần mở trước, rồi 3 lần, trung vị (điểm và từng chỉ số lấy trung vị riêng; LCP/ảnh lấy từ lần có LCP trung vị). Chỉ GET, không đăng nhập.

**So sánh có giới hạn**: "trước" ở Bảng 1 đo bằng Chrome + CDP throttle thật, "sau" đo bằng Lighthouse (simulated), nên LCP không so thẳng
được. Số **số ảnh** và **KB ảnh** so được (cùng đo byte truyền). Chưa đo "trước" bằng Lighthouse cho v3 vì bản build cũ đã bị thay.

| Màn | Thiết bị | Điểm (3 lần) | LCP | Phần tử LCP | TBT | CLS | Tổng tải | Ảnh (số / KB) | Trước (Bảng 1: LCP, ảnh KB) |
|---|---|---|---|---|---|---|---|---|---|
| 01 `/explore` | mobile | **88** (87, 88, 88) | 2,9 s | chữ H1 | 20 ms | 0,083 | 1 280 KB | 15 / 952 | 5,97 s; 12 ảnh / 2 393 KB |
| 01 | desktop | **95** (95, 93, 95) | 0,7 s | chữ H1 | 0 | 0,048 | 697 KB | 15 / 345 | 4,82 s; 2 595 KB |
| 02 `/explore/search` | mobile | **94** (94, 94, 94) | 2,9 s | chữ H1 | 19 ms | 0,083 | 492 KB | 9 / 192 | 2,60 s; 1 228 KB |
| 02 | desktop | **99** | 0,7 s | ảnh thẻ đầu | 0 | 0,048 | 898 KB | 9 / 573 | 19,18 s; 1 228 KB |
| 03 `/village/c0d0…` | mobile | **89** (89, 87, 89) | 3,7 s | ảnh gallery ô lớn | 11 ms | 0,017 | 634 KB | 9 / 349 | 19,62 s; 1 020 KB |
| 03 | desktop | **99** | 0,8 s | ảnh gallery ô lớn | 0 | 0,009 | 659 KB | 9 / 349 | 10,05 s; 1 020 KB |
| 04 `/explore/experiences/07ef…` | mobile | **92** (90, 92, 93) | 3,0 s | chữ H1 | 17 ms | 0,083 | 479 KB | 5 / 128 | 3,93 s; 510 KB |
| 04 | desktop | **99** (99, 99, 98) | 0,8 s | ảnh gallery ô lớn | 0 | 0,048 | 526 KB | 5 / 155 | 19,43 s; 510 KB |
| 24 `/explore/providers/4142…` | mobile | **88** (87, 89, 88) | 3,4 s | ảnh gallery ô lớn | 13 ms | 0,083 | 699 KB | 8 / 353 | 25,75 s; 1 618 KB |
| 24 | desktop | **97** (97, 96, 97) | 0,7 s | ảnh gallery ô lớn | 0 | 0,048 | 644 KB | 8 / 278 | 26,01 s; 1 618 KB |

Đọc kỹ:
- **Ảnh LCP đúng ý**: LCP discovery "đạt" ở mọi màn có ảnh LCP (02 desktop, 03, 04 desktop, 24); `fetchpriority=high`, `loading=eager`, có preload.
  01, 02 mobile, 04 mobile: LCP là chữ H1 (ảnh gallery 04 nằm dưới màn đầu ở 390 px), nên không có ảnh LCP để ưu tiên.
- **LCP mobile 03 (4,3 s) và 24 (3,6 s) vẫn chậm** và do **chờ server**, không do byte: ảnh LCP 84 KB mất ~6 s từ lúc gửi request đến lúc xong
  trong lần quan sát (server local gọi Supabase Storage, 5 ảnh gallery tải cùng lúc). Giảm byte không sửa được phần này.
- **CLS 0,083 (mobile) / 0,048 (desktop)** đến từ `div#page-content` dịch chuyển, giống nhau ở mọi màn, nên không phải ảnh (ảnh có `width`/`height`).
  Chưa kiểm xem nó có từ trước hay không: baseline v3 không đo CLS bằng Lighthouse.
- Insight "image delivery" còn báo tiết kiệm 63–413 KB mỗi màn: do chỉ có 3 cỡ (400/800/1600) nên ảnh cần 525 px phải lấy 800w, và nén chưa
  hết ở vài ảnh ~83 KB. Không thể xuống nữa nếu không thêm cỡ ảnh.
- Ảnh vẫn nhiều ở 01 (15 ảnh / 952 KB mobile): Chrome tải trước ảnh `lazy` trong ~1 250–2 500 px dưới màn hình; 01 không có ảnh nào trong khung nhìn.
- React của Next tự thêm `<link rel=preload as=image>` cho mọi ảnh `eager` (kể cả ô nhỏ gallery), nên các ô nhỏ cùng ưu tiên "High" với ảnh LCP.
  Nếu muốn LCP nhanh hơn: đặt `fetchpriority=low` cho ô nhỏ (lệch yêu cầu "ưu tiên bình thường", chưa làm).

**Đo lại 21/11 (cùng ngày, sau khi đổi thẻ kết quả mobile sang khung 5/8 và đặt `fetchpriority=low` cho ô nhỏ gallery)**: chỉ mobile 03, 04, 24,
3 lần, trung vị. 03: 85 → **89**, LCP 4,3 → 3,7 s; 04: 92 → **92** (LCP là chữ, không đổi); 24: 86 → **89**, LCP 3,6 → 3,3 s. Các hàng mobile 03, 04, 24 ở bảng trên
là số mới; desktop và 01, 02 giữ số lần đo trước. Ảnh 24 tăng 337 → 419 KB vì khung thẻ cố định làm danh sách thẻ khác đi nên Chrome tải trước thêm vài ảnh lazy;
không phải ảnh LCP. Điểm lên một phần nhờ ô nhỏ không còn tranh băng thông với ảnh LCP; phần chờ server (xem trên) vẫn là giới hạn chính.

**Đo lại lần 3 (21/11, thẻ kết quả mobile: ảnh trái 112 px, `sizes` 112px)**: mobile 02, 03, 24, 3 lần, trung vị. 02: **94** (LCP 2,9 s, ảnh 9 / 192 KB, trước 573 KB);
03: **90** (LCP 3,5 s, ảnh 7 / 179 KB, trước 349 KB); 24: **88** (LCP 3,4 s, **ảnh 353 KB**, so với 419 KB ở lần đo trước và 337 KB ở lần đo đầu). Điểm 24 dao động 86–89 giữa các lần đo
(chờ server), nên chênh 1 điểm không phải do thẻ. Các hàng mobile 02, 03, 24 ở bảng trên là số mới nhất.

Ảnh chụp (chỉ ở máy, không commit): `docs/build/ui-v3-2b-screens/` (1440 và 390; `-before-center-crop` = cùng trang nhưng ảnh dọc cắt giữa 50 % 50 %, để so với `-after`).
