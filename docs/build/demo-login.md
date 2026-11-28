# Demo login for quickstarts (`hab_session`)

Since PR #11 (AUT), the dev server authenticates only through the product session cookie `hab_session`
set by `/login` (`POST /api/auth/login`). The old cookie `hab_demo_account` and the Role Switcher work only
under `NODE_ENV=test` (automated tests); in `npm run dev` they give a Guest. Every quickstart therefore logs in
first and then sends the saved cookie.

## Real role accounts on PROD (v3 handoff)

The list of role accounts (Tour Agency, workshop, commune UBND, Department of Tourism) was issued by Trúc Linh and is held
by Khánh Linh, who shares it with the team separately. It is not in this repository: no emails and no passwords are written
here. When the list has been handed over, log in with the account that matches the role you need and ask the account owner
for its password. The application never asks for a database password to sign in. The `*-tester@example.invalid` accounts are
temporary and will be locked when the team moves to the real set; this document does not claim that the move is done. Do not
create new test data with a tester account after the lock announcement. Local development uses the DEV database and its own
DEV accounts; a PROD account is not assumed to exist on DEV.

The seed/CLI instructions below are the quickstart and the older way of issuing accounts. They are not the list of real accounts.

## Test accounts by role on DEV

The `/login` page does not list test accounts. The seed emails below work only when the DEV database already has the
matching seed records. `demo:seed` only creates the JSON fixture; it does not create accounts in the PostgreSQL database that
serves the app.

| Name used in quickstarts | Email | Who |
|---|---|---|
| `agency` | `thanhvien13@example.invalid` | Tour Agency, Lý Gia Hân, Công ty Du lịch Tràng An (`02e568d8…`) |
| `provider` | `thanhvien19@example.invalid` | Local Provider, Kiều Anh Thư, Xưởng thủ công Bát Tràng (`50f2c8fc…`) |
| `ubnd` | `thanhvien8@example.invalid` | UBND Admin, village Hạ Thái (inactive village, see issue #65) |
| `hdt` | `thanhvien9@example.invalid` | HDT Admin |

**Password on DEV.** Only the four seed accounts that still carry `seedhash` accept any non-empty password through
`authenticatePrototype`; the quickstart commands below type `demo` for that case. If an account already has a real password,
use the password it was given. Production always rejects the any-password login. Real test passwords come from the team or
from whoever owns the account; never write a password into the repository. Accounts can also be created through
registration, or through an HDT/UBND password reset with `HAB_EMAIL_MODE=dev-outbox`; see `specs/AUT-INTEGRATION.md`.

## Hosted version: personal test accounts

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

The actual list depends on the environment variables used when the accounts were issued. Ask the account owner for the
email of each role and its password; do not use `demo` or any-password login on the hosted version. Re-running the script with
the same variables changes nothing; a changed password replaces the old hash and logs out that account's open sessions. A
missing or invalid password skips that account with a warning (the password is never printed). Share each password only
with its owner.

## In the browser

Open `http://localhost:3000/login`, type the email for the role and the matching password from above, then click **Đăng nhập**.
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
