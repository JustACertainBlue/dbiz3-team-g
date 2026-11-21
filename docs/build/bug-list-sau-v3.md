# Danh sách lỗi sau UI v3 (chia nhau sửa)

Ghi ngày 21/11/2026 trên `ui/v3-public`, lúc gộp 5 nhánh. Mức ưu tiên: **Cao** = lệch dữ liệu hoặc dễ gây lỗi khi demo; **TB** = lệch nội dung/hành vi nhỏ; **Thấp** = dọn code, không chặn trang.

## A. Mục Bước 2 được hoãn (chưa làm trong lượt gộp)

| # | Màn | Mô tả | File liên quan | Ưu tiên |
|---|---|---|---|---|
| 6 | 29 | Ô "Đã nhận qua QR tháng N" đang hiện "—". Cần = tổng `agreed_price_total` của đặt chỗ xưởng đã bấm "Đã nhận tiền" (On hold → Booked, theo `booking_status_history.changed_at`) trong tháng. Spec chưa nói có loại đặt chỗ bị huỷ sau đó hay không. | `src/app/provider/[providerId]/dashboard/page.tsx` | TB |
| 7 | 04, 24, 32, 35 | Hằng số giữ chỗ 72 giờ đang nằm ở 3 nơi (`create-booking.ts`, `v3-detail.ts`, `provider/hold-hours.ts`) và chữ "72 giờ" viết cứng ở `RequestButton`, `SlotTable`, `MonthCalendar` (24), `CreateBookingForm`. Cần một nguồn, bộ quét `expire-holds.ts` dùng chung. | `src/lib/booking/create-booking.ts`, `src/lib/booking/expire-holds.ts`, `src/lib/explore/v3-detail.ts`, `src/lib/provider/hold-hours.ts`, `src/app/explore/v3/RequestButton.tsx` | Thấp |
| 8 | 04, 23 | Hộp "Hoàn hảo cho tour nửa ngày!" viết cứng, hiện theo chip "Tour nửa ngày". Cần đọc `experiences.group_note` (cột chỉ có trong DB, không có trong seed CSV). | `src/lib/explore/v3-detail.ts` (`halfDay`), `src/app/explore/experiences/[id]/page.tsx`, `src/app/provider/[providerId]/experiences/[experienceId]/page.tsx` | TB |
| 9 | toàn app | Test form-safety mới chỉ phủ `src/app/provider` (không gồm `bookings`). Mở ra toàn app sẽ đỏ ở 8 file, danh sách ở mục B. Bản nháp test ở cuối file này. | `tests/unit/v3-provider-form-safety.test.ts` | Cao |
| 12 | — | `docs/build/demo-login.md`: tài khoản demo theo vai, ghi "mật khẩu test chung, hỏi trong nhóm", không ghi mật khẩu. | `docs/build/demo-login.md` (mới) | TB |

Ba mục 6–8 đã làm xong, có test và đã commit trước khi bạn rút gọn, rồi được revert. Muốn lấy lại: `git cherry-pick 921d6fc4 4e1fd0e0 a509167f` (mục 6, 7, 8; có thể xung đột nếu file đã đổi).

## B. Form chưa an toàn (kết quả test mục 9)

Form không có `method="post"`, hoặc nút submit chưa khoá tới khi hydrate (`useHydrated`):

| File | Vấn đề | Ưu tiên |
|---|---|---|
| `src/app/messages/page.tsx` (composer, màn chat) | form thiếu `method="post"`; nút Gửi không chờ hydrate | Cao |
| `src/app/provider/[providerId]/bookings/[bookingId]/BookingActionsBar.tsx` (form huỷ) | form thiếu `method="post"`; nút "Xác nhận huỷ" không chờ hydrate | Cao |
| `src/app/provider/[providerId]/bookings/new/CreateBookingForm.tsx` (35) | nút `disabled={saving}`, chưa chờ hydrate | Cao |
| `src/app/provider/[providerId]/bookings/[bookingId]/edit/EditBookingForm.tsx` (35 sửa) | như trên | Cao |
| `src/app/agency/[agencyId]/bookings/[bookingId]/BookerForm.tsx` (06) | nút `disabled={pending}` | Cao |
| `src/app/explore/v3/RequestButton.tsx` (form yêu cầu 04/24) | nút `disabled={busy || !chosen}` | Cao |
| `src/app/ai-matching/page.tsx` (2 form chat AI) | nút Gửi không chờ hydrate | TB |
| `src/app/admin/create-account/CreateAccountForm.tsx` | nút không có `type`, không chờ hydrate | TB |

## C. Lỗi nhỏ gặp lúc làm (không chặn trang, chưa sửa)

| Màn | Mô tả | File | Ưu tiên |
|---|---|---|---|
| 20 / 20a | Đã chỉnh CSS theo mockup (mục cao 48px, màu icon, bề rộng chữ 285px) nhưng chưa đối chiếu bằng ảnh chụp 1440. Vị trí menu `top: calc(100% + 14px)` so với mockup `top: 72px` có thể lệch vài pixel. | `src/app/shell.css`, `src/app/components/header/AppHeader.tsx` | Thấp |
| 01, 21, 02, 03, 04, 23 | Ô số khách ở thanh tìm kiếm không có giới hạn trên (max `null`), server cắt ở 500 (`v3-search.ts`). Không có thông báo khi nhập quá 500. | `src/app/explore/v3/SearchBar.tsx`, `src/lib/explore/v3-search.ts` | Thấp |
| 17 | Thanh đơn giản chỉ áp dụng cho `/register`; `/register/revise` và `/register/status` vẫn dùng thanh khách đầy đủ. Spec chưa nói. | `src/app/components/header/SimpleAuthBar.tsx` | Thấp |
| hooks | `.claude/hooks/block-git-push.py` chặn mọi lệnh merge nhánh khác ngoài `origin/main`, nên agent không gộp được nhánh `ui/v3-*`; người phải tự merge. | `.claude/hooks/block-git-push.py` | Thấp |

## D. Bản nháp test mục 9 (chưa chạy xanh)

```ts
/**
 * UI v3 integration Step 2 item 9: form safety for the whole app (the provider-only test v3-provider-form-safety stays as it was).
 * Every <form> under src/app is either a real search form (method="get" with an action, works without JS) or has method="post";
 * in a post/JS form every submit button stays disabled until the page has hydrated, so a native submit can never go out as a GET
 * with the fields (passwords included) in the URL.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : /\.tsx$/.test(name) ? [path] : []
  })
}
const formFiles = files('src/app').filter(path => /<form[\s>]/.test(readFileSync(path, 'utf8')))

describe('every form in the app is GET-with-action or POST, and POST forms wait for hydration', () => {
  it('finds the forms', () => { expect(formFiles.length).toBeGreaterThanOrEqual(20) })
  for (const path of formFiles) {
    it(path, () => {
      const source = readFileSync(path, 'utf8')
      const forms = source.match(/<form[\s>][^>]*>/g) ?? []
      let hasPost = false
      for (const tag of forms) {
        if (/method="get"/.test(tag)) expect(tag, 'GET form needs an action').toMatch(/action=/)
        else { expect(tag, 'form tag').toMatch(/method="post"/); hasPost = true }
      }
      if (!hasPost) return
      // A submit button is <button>/<Button> with type="submit" or with no type at all (the browser default).
      const submits = (source.match(/<(?:button|Button)\b(?:[^>]|=>)*>/g) ?? []).filter(tag => !/\btype="(?:button|reset)"/.test(tag))
      expect(submits.length, 'submit buttons').toBeGreaterThan(0)
      for (const button of submits) expect(button, button).toMatch(/disabled=\{[^}]*!(hydrated|ready)/)
      expect(source).toMatch(/useHydrated\(\)|setHydrated\(true\)|setReady\(true\)|hydrated: boolean/)
    })
  }
})
```
