# Demo login for quickstarts (`hab_session`)

Since PR #11 (AUT), the dev server authenticates only through the product session cookie `hab_session`
set by `/login` (`POST /api/auth/login`). The old cookie `hab_demo_account` and the Role Switcher work only
under `NODE_ENV=test` (automated tests); in `npm run dev` they give a Guest. Every quickstart therefore logs in
first and then sends the saved cookie.

## Demo accounts

Synthetic seed identities, listed on `http://localhost:3000/login` under "Tài khoản thử nghiệm":

| Name used in quickstarts | Email | Who |
|---|---|---|
| `agency` | `thanhvien13@example.invalid` | Tour Agency, Lý Gia Hân, Công ty Du lịch Tràng An (`02e568d8…`) |
| `provider` | `thanhvien19@example.invalid` | Local Provider, Kiều Anh Thư, Xưởng thủ công Bát Tràng (`50f2c8fc…`) |
| `ubnd` | `thanhvien8@example.invalid` | UBND Admin, village Hạ Thái (inactive village, see issue #65) |
| `hdt` | `thanhvien9@example.invalid` | HDT Admin |

**Password.** In development only, these four identities accept any non-empty password (prototype adapter
`authenticatePrototype` in `src/lib/auth/product-session.ts`; production rejects it). The commands below type
`demo`. This is not a secret and no real password is stored anywhere. Every other account needs its real
password. Create it through registration, or through an HDT/UBND password reset with
`HAB_EMAIL_MODE=dev-outbox`; see `specs/AUT-INTEGRATION.md`.

## In the browser

Open `http://localhost:3000/login`, click one of the demo emails, type any password, click **Đăng nhập**.
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
