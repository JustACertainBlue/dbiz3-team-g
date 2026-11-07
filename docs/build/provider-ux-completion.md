# Hoàn thiện Provider, Explore và các lỗi UX còn valid

Ngày: 07/11/2026. Branch: `codex/provider-ux-completion`. Phạm vi: sửa local, kiểm thử CLI/API; chưa commit/push trong đợt này.

## Context: các phần nối với nhau như thế nào?

- `src/app/.../page.tsx`: màn hình và thao tác của người dùng; lấy/lưu thông tin qua API.
- `src/app/api/prf/`: điểm nhận yêu cầu quản lý Provider/Experience; kiểm tra session và chuyển cho service.
- `src/lib/prf/`: kiểm tra nghiệp vụ, quyền sở hữu và cập nhật cùng JSON repository mà Explore, Chat, Booking sử dụng.
- `src/lib/explore/`: chọn dữ liệu đã được công bố và đủ điều kiện hiển thị; Agency được xem thông tin hợp tác theo quyền.
- `provider_version_documents` và `provider_version_media`: gắn tài liệu/ảnh vào từng phiên bản hồ sơ. `stored_files` giữ metadata.
- `.demo-data/prf-media/`: bytes của file tải mới, chỉ lưu local và được bỏ qua bởi Git; `.demo-data/runtime.json` giữ các liên kết. Không thay đổi CSV seed khi người dùng chỉnh trên ứng dụng.

## Những lỗi đã xử lý

| Mức | Vấn đề | Thay đổi và tác động |
|---|---|---|
| P0 | Sửa mô tả Experience làm ghi đè chính sách hủy | Bỏ chính sách hardcode khỏi edit payload. Chính sách không đổi thì không gửi patch; giữ cả khóa cũ/khóa mở rộng. |
| P1 | Giấy đăng ký chưa gắn theo phiên bản trong UI | Dùng bảng `provider_version_documents` đã có. Thay giấy đăng ký tạo/sửa bản đang thẩm định và giữ tài liệu của bản công khai. |
| P1 | Ảnh upload chỉ có metadata | Upload bytes thật, kiểm tra MIME/kích thước, lưu riêng tư và phục vụ qua API có phân quyền. Cùng URL xuất hiện trong Provider và Explore. |
| P1 | Thiếu phần xem trước AI rõ ràng ở hồ sơ xưởng | Bản nháp riêng, có chỉnh sửa, chấp nhận, tạo lại, bỏ. Chấp nhận chỉ đổi form; phải lưu hồ sơ mới cập nhật dữ liệu. |
| P1 | Thiếu điều kiện đặt đoàn, hủy và thông tin vận hành | Bổ sung editor và hiển thị chính sách/giờ báo trước/địa điểm; giữ các điều kiện hiện có khi chỉnh. |
| P1 | Màn xác nhận xóa không cho biết rõ đối tượng và hậu quả | Hiển thị tên, giá, thời lượng, sức chứa và ba kết quả: chặn, lưu trữ, xóa. Backend kiểm tra lại lịch sử khi thực hiện. |
| P1 | Dashboard thiếu thông tin cần bổ sung và nhận xét | Hiển thị tỷ lệ hoàn thiện, trường thiếu, nhận xét theo phiên bản và phân biệt bản đang sửa/bản đã công khai. |
| P1 | CTA đăng ký dẫn về Login | Chuyển CTA đăng ký Agency/tài khoản ở Explore về `/register`. |
| P1 | Chat từ hồ sơ Provider tự lấy trải nghiệm đầu tiên | Danh mục nhiều trải nghiệm phải chọn; một trải nghiệm được ghi rõ; không có trải nghiệm thì không mở handoff sai. |
| P1 | Lỗi tải trang sửa có thể để lại form rỗng | Chặn màn sửa khi tải thất bại hoặc Experience không thuộc đường dẫn xưởng; chặn lưu khi đang upload. |
| P1 | API quản lý/giấy đăng ký có nguy cơ lộ ngoài scope | Owner detail chỉ cho đúng chủ; tài liệu riêng chỉ cho người tải/chủ/HDT/UBND đúng làng. Public media theo trạng thái công bố, tài khoản và làng hoạt động. |
| P2 | Thiếu editor chiết khấu/giá đặc biệt | Lưu riêng từng loại vào `experience_discount_rules`, kiểm tra giá trị và ngưỡng lặp, đọc lại ở owner detail. |
| P2 | Khó nhận biết trải nghiệm đã lưu trữ | Danh sách có số lượng và tùy chọn xem bản lưu trữ, nhãn rõ ràng và trạng thái danh sách rỗng. |
| P2 | Village thiếu đường dẫn tới trải nghiệm | Có danh sách nổi bật từ Provider đủ điều kiện, không lộ giá cho khách công khai. |
| P2 | Ảnh trang trí và mã tài liệu gây hiểu nhầm trên màn đã sửa | Dùng media thật/empty state, bỏ thumbnail trang trí trùng; dọn nhãn Provider, Chat, navigation và một số nhãn Agency. |

### Quyết định certificate đã được kiểm tra lại

Bạn đã cho phép bổ sung cột/FK nếu cần. Sau khi đối chiếu data, liên kết cần thiết **đã có** trong `provider_version_documents(provider_id, version_no, file_id, document_type)`. Vì vậy không thêm `business_registration_certificate_file_id` trùng nghĩa và không sửa schema/data model. Khi một bản sửa được duyệt, các liên kết theo phiên bản đã đúng sẵn.

## Kiểm thử và phạm vi bằng chứng

| Kiểm tra | Kết quả |
|---|---|
| `npm test` | **1.030 test / 167 file: PASS** (baseline trước đợt sửa: 1.011 test / 164 file). |
| `npm run build` | **PASS**, bao gồm TypeScript và tạo build production. |
| `npm run lint` | **PASS**; build cuối cũng kiểm tra lại types. |
| `python data/scripts/validate_seed.py` | **PASS: 47 CSV**, không sửa seed. |
| `node scripts/smoke-auth.mjs` | **PASS: 34 response trang / 58 kiểm tra HTTP**, bốn role và login/logout. |
| Kiểm tra localhost bổ sung | **PASS: 14 kiểm tra** cho edit/new/detail/delete, API owner, Explore, Village và màn thẩm định UBND; tổng hai lượt là **72 kiểm tra HTTP**. |
| `git diff --check` | **PASS**. |

Log thô được giữ local tại `.demo-data/provider-ux-tests.log`, `provider-ux-build.log`, `provider-ux-smoke.log` và `provider-ux-extra-smoke.log` (Git bỏ qua). Không chứa cấu hình dịch vụ hay credentials thật.

Các test mới kiểm tra: giữ nguyên chính sách hủy; lưu/đọc/xóa ưu đãi; từ chối dữ liệu sai trước khi ghi; dự báo xóa/lưu trữ; certificate revision không làm đổi bản công khai; file ngoài owner; quyền Guest/UBND; MIME và kích thước; upload PNG thật → Experience → gallery Explore; Village và owner API.

Các test hồi quy có sẵn tiếp tục kiểm tra Quote không tạo Booking, handoff dùng đúng Chat, tạo Booking gửi cập nhật vào cùng Chat, lịch và quyền truy cập.

**Giới hạn bằng chứng:** theo yêu cầu, đợt này không dùng Computer Use. CLI kiểm tra logic, response và render server; không thay cho kiểm tra hình ảnh từng pixel, thao tác chuột và layout trực quan trên mọi màn.

## Phần còn phụ thuộc cấu hình/dữ liệu ngoài đợt sửa

- Email/OTP/cấp hoặc reset mật khẩu qua email thật vẫn chờ dịch vụ và cấu hình đã chốt trước đó.
- Ảnh/tài liệu seed hiện chỉ có metadata, không có file gốc: UI ghi rõ thiếu file. Upload mới có file thật; không tạo ảnh giả và không chỉnh các mockup của tài liệu.
- Backend vẫn dùng JSON prototype. PostgreSQL, vận hành nhiều máy và triển khai production là giai đoạn tiếp theo.
- Đây là kiểm thử local của tác giả; chưa thay thế việc thành viên khác review và chạy trên máy riêng. Không đánh dấu các điều kiện đó là hoàn tất.

## Cách xem lại nhanh

1. Mở `http://localhost:3000/login`, đăng nhập Provider bằng tài khoản seed phát triển hiện có.
2. Tổng quan → Cập nhật hồ sơ: xem thông tin thiếu/nhận xét, tải giấy đăng ký hoặc ảnh, lưu. Với thay đổi trọng yếu, đối chiếu bản đang duyệt và bản công khai.
3. Trải nghiệm → Chi tiết → Chỉnh sửa: thay mô tả, chính sách, ưu đãi và ảnh; lưu rồi mở lại. Trang xóa cho biết có thể xóa hay chỉ lưu trữ/bị chặn.
4. Đăng nhập Agency → Explore → Experience/Provider: xem cùng dữ liệu được công bố, chọn Experience trước khi mở Chat. Quote vẫn là yêu cầu báo giá, không phải Booking.
5. Đăng nhập UBND đúng làng → thẩm định xưởng: xem tài liệu đúng phiên bản rồi xử lý hồ sơ đang chờ duyệt.

## Danh sách file thay đổi và lý do

| File | Lý do |
|---|---|
| `docs/build/build-log.md` | Ghi lại lần chạy, quyết định về certificate và kết quả kiểm thử. |
| `docs/build/provider-ux-completion.md` | Bàn giao thay đổi, giới hạn và bằng chứng kiểm thử của đợt sửa này. |
| `package-lock.json` | Thêm image-size để kiểm tra định dạng và kích thước ảnh từ bytes phía server. |
| `package.json` | Thêm image-size để kiểm tra định dạng và kích thước ảnh từ bytes phía server. |
| `src/app/admin/providers/[id]/page.tsx` | Hiển thị giấy đăng ký/ảnh đúng phiên bản đang duyệt và bản công khai; chỉ cho thao tác khi đang chờ duyệt. |
| `src/app/agency/[agencyId]/edit/page.tsx` | Dọn nhãn giao diện và mã tài liệu còn hiển thị cho người dùng; giữ nguyên logic/URL. |
| `src/app/api/demo/villages/[id]/route.ts` | Trả trải nghiệm nổi bật từ cùng danh mục đủ điều kiện; không lộ giá công khai. |
| `src/app/api/prf/experience/[experienceId]/route.ts` | Bảo vệ API quản lý bằng quyền owner và hỗ trợ danh sách gồm cả trải nghiệm lưu trữ. |
| `src/app/api/prf/experience/route.ts` | Bảo vệ API quản lý bằng quyền owner và hỗ trợ danh sách gồm cả trải nghiệm lưu trữ. |
| `src/app/api/prf/media/[fileId]/route.ts` | Lưu/đọc file thật qua API; kiểm tra owner, MIME, kích thước và phạm vi xem tài liệu. |
| `src/app/api/prf/media/route.ts` | Lưu/đọc file thật qua API; kiểm tra owner, MIME, kích thước và phạm vi xem tài liệu. |
| `src/app/components/MediaImage.tsx` | Hiển thị URL media thực, hỗ trợ ảnh lớn và trạng thái thiếu file gốc. |
| `src/app/components/SessionHeader.tsx` | Thống nhất nhãn navigation tiếng Việt, giữ nguyên URL và quyền theo role. |
| `src/app/explore/ProviderChatAction.tsx` | Yêu cầu chọn đúng trải nghiệm để mở Chat; xử lý danh mục trống. |
| `src/app/explore/experiences/[id]/page.tsx` | Hoàn thiện flow danh sách → chi tiết → sửa/xóa, media và các điều kiện đặt/hủy. |
| `src/app/explore/explore.css` | Đồng bộ gallery, form và trạng thái thông tin với giao diện xanh–kem. |
| `src/app/explore/page.tsx` | Hiển thị ảnh/điều kiện đúng dữ liệu và nối CTA đăng ký, hồ sơ, Chat đúng ngữ cảnh. |
| `src/app/explore/providers/[id]/page.tsx` | Hiển thị ảnh/điều kiện đúng dữ liệu và nối CTA đăng ký, hồ sơ, Chat đúng ngữ cảnh. |
| `src/app/messages/page.tsx` | Dọn nhãn giao diện và mã tài liệu còn hiển thị cho người dùng; giữ nguyên logic/URL. |
| `src/app/provider/[providerId]/dashboard/page.tsx` | Bổ sung mức hoàn thiện, trường thiếu và nhận xét thẩm định trên dashboard xưởng. |
| `src/app/provider/[providerId]/edit/page.tsx` | Hoàn thiện hồ sơ, upload riêng tư, xem trước AI và gallery từ dữ liệu thực. |
| `src/app/provider/[providerId]/experiences/ExperienceImagesField.tsx` | Tải file thật và preview URL bền vững; chặn lưu trong lúc upload. |
| `src/app/provider/[providerId]/experiences/ExperienceTermsField.tsx` | Đọc/biên tập chính sách hủy và ưu đãi; gửi patch chỉ khi chính sách thay đổi. |
| `src/app/provider/[providerId]/experiences/[experienceId]/delete/page.tsx` | Hoàn thiện flow danh sách → chi tiết → sửa/xóa, media và các điều kiện đặt/hủy. |
| `src/app/provider/[providerId]/experiences/[experienceId]/edit/page.tsx` | Hoàn thiện flow danh sách → chi tiết → sửa/xóa, media và các điều kiện đặt/hủy. |
| `src/app/provider/[providerId]/experiences/[experienceId]/page.tsx` | Hoàn thiện flow danh sách → chi tiết → sửa/xóa, media và các điều kiện đặt/hủy. |
| `src/app/provider/[providerId]/experiences/new/page.tsx` | Hoàn thiện flow danh sách → chi tiết → sửa/xóa, media và các điều kiện đặt/hủy. |
| `src/app/provider/[providerId]/experiences/page.tsx` | Hoàn thiện flow danh sách → chi tiết → sửa/xóa, media và các điều kiện đặt/hủy. |
| `src/app/provider/[providerId]/page.tsx` | Hoàn thiện hồ sơ, upload riêng tư, xem trước AI và gallery từ dữ liệu thực. |
| `src/app/provider/provider-ui.css` | Đồng bộ gallery, form và trạng thái thông tin với giao diện xanh–kem. |
| `src/app/village/[villageId]/page.tsx` | Bổ sung danh sách trải nghiệm nổi bật và nối về chi tiết. |
| `src/lib/explore/catalog.ts` | Dùng cùng gallery/media với Provider; hỗ trợ hồ sơ đã công bố nhưng chưa có trải nghiệm. |
| `src/lib/explore/details.ts` | Dùng cùng gallery/media với Provider; hỗ trợ hồ sơ đã công bố nhưng chưa có trải nghiệm. |
| `src/lib/prf/experience-service.ts` | Lưu chính sách/ưu đãi, đọc media thật và xác định kết quả xóa/lưu trữ từ booking. |
| `src/lib/prf/experience-terms.ts` | Đọc/biên tập chính sách hủy và ưu đãi; gửi patch chỉ khi chính sách thay đổi. |
| `src/lib/prf/media-store.ts` | Lưu/đọc file thật qua API; kiểm tra owner, MIME, kích thước và phạm vi xem tài liệu. |
| `src/lib/prf/media-urls.ts` | Hiển thị URL media thực, hỗ trợ ảnh lớn và trạng thái thiếu file gốc. |
| `src/lib/prf/provider-completion.ts` | Tính độ đầy đủ từ trường bắt buộc và giấy đăng ký đã gắn. |
| `src/lib/prf/provider-page-view.ts` | Đổi nhãn điều kiện đặt đoàn sang tiếng Việt. |
| `src/lib/prf/provider-service.ts` | Gắn giấy đăng ký/ảnh theo phiên bản, giữ bản công khai, kiểm tra file và điều kiện nộp hồ sơ. |
| `src/lib/prf/validators.ts` | Kiểm tra dữ liệu giấy đăng ký, ảnh, ưu đãi và chính sách hủy; giữ các khóa booking conditions chưa sửa. |
| `src/lib/prf/visibility.ts` | Giới hạn thông tin thẩm định của UBND theo làng được phân công. |
| `tests/prf/integration/provider-ux-api.test.ts` | Kiểm tra hồi quy chính sách hủy, giá theo đoàn, phiên bản giấy đăng ký, media và quyền xem; cập nhật kỳ vọng hiển thị tiếng Việt. |
| `tests/prf/unit/profile-media.test.ts` | Kiểm tra hồi quy chính sách hủy, giá theo đoàn, phiên bản giấy đăng ký, media và quyền xem; cập nhật kỳ vọng hiển thị tiếng Việt. |
| `tests/prf/unit/provider-page-view.test.ts` | Kiểm tra hồi quy chính sách hủy, giá theo đoàn, phiên bản giấy đăng ký, media và quyền xem; cập nhật kỳ vọng hiển thị tiếng Việt. |
| `tests/prf/unit/provider-service.test.ts` | Kiểm tra hồi quy chính sách hủy, giá theo đoàn, phiên bản giấy đăng ký, media và quyền xem; cập nhật kỳ vọng hiển thị tiếng Việt. |
| `tests/prf/unit/provider-ux-regression.test.ts` | Kiểm tra hồi quy chính sách hủy, giá theo đoàn, phiên bản giấy đăng ký, media và quyền xem; cập nhật kỳ vọng hiển thị tiếng Việt. |
