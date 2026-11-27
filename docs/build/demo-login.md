# Demo login for quickstarts (`hab_session`)

Since PR #11 (AUT), the dev server authenticates only through the product session cookie `hab_session`
set by `/login` (`POST /api/auth/login`). The old cookie `hab_demo_account` and the Role Switcher work only
under `NODE_ENV=test` (automated tests); in `npm run dev` they give a Guest. Every quickstart therefore logs in
first and then sends the saved cookie.

## Tài khoản thật theo vai trên PROD (bàn giao v3)

Danh sách email theo vai do Trúc Linh cấp và Khánh Linh chia riêng cho nhóm. Khi danh sách được bàn giao, dùng tài khoản tương ứng
với Công ty lữ hành, Xưởng nghề, UBND xã hoặc Sở Du lịch; mật khẩu hỏi người phụ trách trong nhóm, không ghi vào repo.
Không yêu cầu mật khẩu database để đăng nhập ứng dụng. Tài khoản `*-tester@example.invalid` chỉ dùng tạm và sẽ bị khoá khi
nhóm chuyển sang bộ tài khoản thật; tài liệu này không khẳng định việc chuyển đổi đã hoàn tất. Không tạo dữ liệu thử mới bằng
tài khoản tester sau thông báo khoá. Local dùng database DEV và bộ tài khoản DEV riêng; tài khoản PROD không mặc nhiên có trên DEV.

Các hướng dẫn seed/CLI bên dưới là quickstart và cách cấp tài khoản cũ, không phải danh sách tài khoản thật đã bàn giao.

## Tài khoản thử nghiệm theo vai trên DEV

Trang `/login` không hiển thị danh sách tài khoản thử nghiệm. Các email seed dưới đây chỉ dùng khi database DEV đã có các bản ghi seed tương ứng.
`demo:seed` chỉ tạo JSON fixture, không cấp tài khoản vào PostgreSQL đang phục vụ ứng dụng.

| Name used in quickstarts | Email | Who |
|---|---|---|
| `agency` | `thanhvien13@example.invalid` | Tour Agency, Lý Gia Hân, Công ty Du lịch Tràng An (`02e568d8…`) |
| `provider` | `thanhvien19@example.invalid` | Local Provider, Kiều Anh Thư, Xưởng thủ công Bát Tràng (`50f2c8fc…`) |
| `ubnd` | `thanhvien8@example.invalid` | UBND Admin, village Hạ Thái (inactive village, see issue #65) |
| `hdt` | `thanhvien9@example.invalid` | HDT Admin |

**Mật khẩu trên DEV.** Chỉ bốn tài khoản seed còn mang `seedhash` mới chấp nhận mật khẩu bất kỳ khác rỗng qua
`authenticatePrototype`; các lệnh quickstart bên dưới dùng chuỗi `demo` cho trường hợp đó. Nếu tài khoản đã được
đặt mật khẩu thật, hãy dùng mật khẩu được cấp. Bản production luôn từ chối kiểu đăng nhập bằng mật khẩu bất kỳ.
Mật khẩu thử nghiệm thật cần hỏi trong nhóm hoặc người phụ trách tài khoản; không ghi mật khẩu vào repo. Có thể
tạo tài khoản qua đăng ký hoặc đặt lại mật khẩu qua HDT/UBND với `HAB_EMAIL_MODE=dev-outbox`; xem
`specs/AUT-INTEGRATION.md`.

## Tài khoản thử nghiệm trên bản hosted

On the production build (`NODE_ENV=production`) the "any non-empty password" rule is off. Test accounts get
real passwords from the manual one-off command `npm run db:set-test-passwords` (`scripts/db/set-test-passwords.mjs`,
ADR 0001), run by Linh from a laptop whose `DATABASE_APP_URL` points at the hosted database. It prints the
target database first; check it.

| Who | Account | Variables |
|---|---|---|
| Each team member (Agency) | `t-<name>-agency@example.invalid`, company `[T-<Name>] …`, Approved | `HAB_TEST_AGENCY_NAMES`, `HAB_TEST_PASSWORD_AGENCY_<NAME>` |
| Outside testers (Agency) | `t-khach-agency@example.invalid`, company `[T-Khach] …` (always created) | `HAB_TEST_PASSWORD_AGENCY_KHACH` |
| HDT (declared names only) | `t-<name>-hdt@example.invalid` | `HAB_TEST_HDT_NAMES`, `HAB_TEST_PASSWORD_HDT_<NAME>` |
| Provider (existing, no new workshop) | `thanhvien19@example.invalid`, Xưởng thủ công Bát Tràng | `HAB_TEST_PASSWORD_PROVIDER` |
| UBND (existing, no new UBND) | `thanhvien1@example.invalid`, Bát Tràng | `HAB_TEST_PASSWORD_UBND` |

Danh sách thực tế phụ thuộc các biến môi trường đã dùng khi cấp tài khoản. Hỏi người phụ trách tài khoản để lấy
email theo vai và mật khẩu tương ứng; không dùng `demo` hoặc mật khẩu bất kỳ trên hosted. Chạy lại script với cùng
biến thì không đổi dữ liệu; đổi mật khẩu sẽ thay hash và đăng xuất các phiên đang mở. Thiếu hoặc sai mật khẩu thì
tài khoản đó bị bỏ qua và có cảnh báo (không in mật khẩu). Chỉ chia sẻ mật khẩu riêng với người sử dụng.

## In the browser

Open `http://localhost:3000/login`, nhập email theo vai và mật khẩu phù hợp ở trên, rồi click **Đăng nhập**.
To change role, use **Đăng xuất** in the header (confirm) and log in again with another email.

## With curl

Run from the repository root after `npm run demo:seed` (or `demo:reset`) and `npm run dev`. Each command
saves the cookie in `.demo-data/<name>.jar`, which is git-ignored. Then quickstart commands send it with
`-b .demo-data/<name>.jar`.

macOS / Linux:

```bash
for r in agency:thanhvien13 provider:thanhvien19 ubnd:thanhvien8 hdt:thanhvien9; do
  curl -s -c ".demo-data/${r%%:*}.jar" -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${r#*:}@example.invalid\",\"password\":\"demo\"}" -o /dev/null -w "${r%%:*} HTTP %{http_code}\n"
done
```

Windows PowerShell (`curl.exe`, not the `curl` alias; the JSON is piped so quoting works in 5.1 and 7):

```powershell
foreach ($r in @('agency:thanhvien13','provider:thanhvien19','ubnd:thanhvien8','hdt:thanhvien9')) {
  $n, $u = $r.Split(':')
  "{""email"":""$u@example.invalid"",""password"":""demo""}" | curl.exe -s -c ".demo-data/$n.jar" -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" --data-binary "@-" -o NUL -w "$n HTTP %{http_code}`n"
}
```

Expected: `HTTP 200` four times. Check one: `curl -s -b .demo-data/agency.jar http://localhost:3000/api/auth/session`
shows `"authenticated":true`. As Guest, leave out `-b`.

The cookie stays valid until logout, an account status change, or the server-side session expiry. After
`npm run demo:reset` the sessions are gone, so log in again.

In zsh, write `-b .demo-data/agency.jar` directly in the command. Do not put `-b path` in a variable such as
`$A`, because zsh does not split it into two arguments, and curl then sends no cookie and you get a 401.
