# Draft: branch ui/v3-account (screens 15–20a, 28)

Not a build-log entry. The human copies what is needed into `docs/build/build-log.md` and `ui-v3-spec-deviations.md`.

## Done

Only the look changed. Sign-in, registration, OTP, reset-password requests, validation and redirects are the same.

| Screen | Route | Files |
|---|---|---|
| 15 Đăng nhập | `/login` | `src/app/login/page.tsx`, `src/app/auth-v3/AuthSplit.tsx`, `public/auth/login-hero.webp` (copy of the mockup photo) |
| 16 Quên mật khẩu (4 steps) | `/forgot-password`, `/forgot-password/sent`, `/reset-password`, `/reset-password/success` | the four `page.tsx` files |
| 17 Đăng ký công ty lữ hành | `/register` | `src/app/register/page.tsx`, `register/layout.tsx` |
| 17a Bổ sung hồ sơ | `/register/revise` | `src/app/register/revise/page.tsx` |
| 18 OTP | `/register/otp` | `src/app/register/otp/page.tsx` |
| 18a popup | `/register/status` | `src/app/register/status/page.tsx`, `auth-v3/RegistrationPopups.tsx` |
| 18b, 18c, 18d popups | none (components only) | `auth-v3/RegistrationPopups.tsx` |
| 19 / 19a Tài khoản của tôi | `/account`, `/account/change-password` | `src/app/account/page.tsx`, `account/change-password/page.tsx`, `auth-v3/AccountSidebar.tsx` |
| 28 Hồ sơ công ty | `/agency/[agencyId]` | `src/app/agency/[agencyId]/page.tsx` |

Shared helpers of this branch: `src/app/auth-v3/{auth-v3.css,rules.ts,labels.ts}`. Test: `tests/unit/v3-account-logic.test.ts`.

One read-only addition in logic: `ownAccount()` (`src/lib/auth/account-service.ts`) now also returns `account_status` and `created_at`, so screen 19 can show "Trạng thái" and "Ngày tạo". No migration, no write.

## Differs from the mockup or the old behaviour

1. **Reg. test guard vs. mockup copy.** `tests/unit/aut-self-registration-agency-only.test.ts` rejects the word "xưởng" anywhere on `/register` and requires the `<option>` text to be the raw enum. The mockup uses "xưởng" twice and Vietnamese company-type labels. Test not edited. Copy changed to "nghệ nhân" in those two places, and the `<option>` keeps the enum as its text with the Vietnamese name in `label=`. Suggest the human relaxes the test if "xưởng" is wanted back.
2. **Screen 17 fields.** The form keeps every field of the registration schema: confirm password, "Họ và tên" (account holder) and "Người liên hệ" (contact person) both stay, and so does "Quận/Huyện". "Số nhân viên" stays required (schema), the mockup says optional.
3. **Screen 17 items in the mockup with no field or rule behind them, not added:** "Loại tour khác" free text, "Giới thiệu ngắn", the confirm-and-terms checkbox, links to terms and privacy pages (none exist), the legacy "Khác" free text. "Khác" maps to the existing `Other` type.
4. **Screen 17a.** Mockup shows name and tax id only. The other editable fields moved under "Thông tin khác" (details). Added the required checkbox "Tôi xác nhận thông tin sửa đổi là đúng." (UI only, not sent). No "Mã hồ sơ HS-…" and no back link to "Tài khoản của tôi" (the applicant is signed out); link goes to `/login`. The existing-file row "bản đã gửi" has no data, so it is not shown.
5. **Screen 15.** "Bạn là" only switches the line under the button (register link for agency, "do UBND xã cấp" text for workshop). "Ghi nhớ đăng nhập" is drawn but does nothing: no remember-me in the session code. Mockup preselects "Xưởng nghề" in the PNG; this branch preselects "Công ty lữ hành".
6. **Screen 16 step 2.** The email shown is kept in `sessionStorage` by step 1 (display only). "Gửi lại đường dẫn" is a link back to step 1, as before. A line states that local test mode sends no real email.
7. **Screen 18.** Mockup shows a 60 s resend cooldown and the state "Đang chờ Sở Du lịch duyệt" before the code is entered. Not done: the old code comment says the timer is not in the spec (step 0 #10), and before the OTP the application is not yet pending, so the right card says "Chờ bạn xác minh email". The expiry countdown (10 min from the send time kept in `sessionStorage`) is display only. Company name and send time also come from `sessionStorage`, written by `/register`.
8. **Screen 18a.** Row "Mã hồ sơ" has no source (no short code in the data), so the row is hidden. The "Gửi lúc" time is the time the form was submitted, not the time the code was verified (not stored). `/register/status` also shows the summary behind the popup.
9. **Screens 18b, 18c, 18d.** Built and tested as components, but no page opens them: no API gives a signed-out applicant the reviewer's request, reason or time, and nothing says whether a rejected application may be resubmitted. Contact data in 18d (email, phone, hours) is a prop, no real value in the repo.
10. **Screen 19a.** The banner shows when `account_status` is "Pending Approval". Such an account cannot sign in today, so it is not reachable in the running app.
11. **Screen 28.** The old page showed invented content (licence number, "13+ years", "100% Fair Remuneration", client demographics, group sizes, a trust badge) and its own header. All removed; only data the API returns is shown. The edit icon is always drawn, as the old "EDIT PROFILE" button was; the edit page does its own access check.
12. **Registration layout note** ("Chỉ công ty lữ hành được tự đăng ký … dev-outbox …") kept as a thin banner on top of `/register*`. Not in the mockup.
13. **Left unused, not deleted** (ask first): `src/app/components/AuthShell.tsx`, `src/app/auth-v9.css`, `src/app/register/registration.css`.

## Mockup missing

- No 390 px mockup for any of these screens. Mobile follows the desktop layout: sign-in photo becomes a top banner with the role cards hidden, two-column forms become one column, the account menu becomes a horizontal strip.
- Screen 16 PNG shows four cards with "BƯỚC n" tags; those tags are notes for the reader and are not on the pages.
- Screen 20 / 20a: nothing to do in page content (see "Cần sửa chung").

## Cần sửa chung (shared files, not touched)

- `SessionHeader.tsx` hides the header only on `/login` and `/register/otp`. Mockup 17 shows its own simple bar ("Đã có tài khoản? Đăng nhập") on `/register`; the page now shows the standard guest header there.
- Screens 20 and 20a (account menu, logout popup) live in `components/header/AppHeader.tsx`. Not compared in this branch (needs a signed-in session, see below).
- `ui.css` / `Modal.tsx`: the 18a–18d popups use the shared Modal as is.

## Not verified

- `.env.local` could not be copied into the worktree (the `cp` command was refused by the permission system), so there was no database and no sign-in. Pages were checked with the dev server on port 3201; `/api/auth/session` failed, so the shared header showed the signed-out variant. `/account` and `/agency/[id]` were checked with a browser-side fetch stub, not real data.
- Not checked in a browser: 18b, 18c, 18d, 17a with real data, 16 step 4, the error and success states of the forms, 20 and 20a.

## Round 2

### Done
- **18a/18b/18c/18d on `/login`.** `POST /api/auth/login`: when the password matched but the Agency is "Pending Approval" or "Rejected", the 403 body also carries `registration_status: { status: 'pending' | 'revise' | 'rejected', reason, reviewed_at }` (`src/lib/auth/registration-status.ts`). No session, no cookie. `revise` = Pending Approval whose last review is "Request More Information". `reason` and `reviewed_at` come from the latest `agency_review_records` row of the current version. Wrong password or unknown email: same 401 "Invalid credentials", nothing else (own tests). Disabled and other roles: unchanged. Tests: `tests/unit/v3-login-registration-status.test.ts`.
- **15 "Ghi nhớ đăng nhập (30 ngày)".** Ticked: cookie `Max-Age` 30 days and the server session also 30 days. Not ticked: session cookie (no Max-Age), server session 12 h as before. Files: `login/route.ts`, `product-session.ts` (about 12 lines), `login/page.tsx`. Tests: `tests/unit/v3-login-remember.test.ts` (written in the same step as the code, not seen failing first).
- `registration.css` removed (own commit).

### Not done / limits
- **Real-data review of 19, 28, `/account`, `/agency/[id]` not done.** DEV refuses the fixture login (password `demo` gives 401, DEV has real passwords) and the shared test password was not given. Those screens were only checked with a browser fetch stub (round 1).
- **18a–c checked on the browser with a fetch stub only** (rejected popup, then the 18d contact popup; both match png/18c, png/18d at 1440). Not looked at: pending and revise popups, 390 px.
- **DEV seed has no Agency account in Pending Approval, Rejected or Request More Information.** The seed requests of `doanhnghiep9` (Rejected) and `doanhnghiep10` (Request More Information) have no `agency_user_id`, so there is nothing to log in with. No DEV data written.
- **AuthShell.tsx and auth-v9.css kept:** `tests/unit/guest-landing.test.ts` still imports AuthShell (the test is not edited). Delete them together with that test case if wanted.
- **19a still has no way in:** a Pending Approval account still cannot sign in, and the login now answers with the popup instead of a session. Not created.

### New deviations
1. 18b and 18c have no action button to resubmit: no token is returned at login (only the three fields) and a rejected registration has no resubmit flow. 18b tells the user to open the link the Department emailed. 18c keeps only "Liên hệ Sở Du lịch" and drops the sentence about resubmitting. 18a, 18b, 18c lose the company name (not returned).
2. Contact values in 18d (email, phone, hours) are the mockup's example values in `login/page.tsx`; no real support contact exists in the repo.
3. Pending popup (18a) on login shows email only: no company, no "Mã hồ sơ", no send time.

### Cần sửa chung (new)
- None. Before the page hydrates, the sign-in form is a plain GET form, so a very early click would put the fields in the URL (it did once in my test, `?who=on`). It existed before this branch; fixing it means `method="post"` plus a handler, left alone.

## Round 3

### Done
- **Forms safe before hydration.** Forms 15, 16 (forgot and reset), 17, 17a, 18 and the change-password form are `method="post"`, and their submit buttons are disabled in the server HTML until the page has hydrated (`src/app/auth-v3/useHydrated.ts`). Test: `tests/unit/v3-form-no-get.test.ts` (it was red for 11 cases first, then green). Browser check: a script-free copy of the server HTML of `/login` (simulating JS off, served on another port): typed an email and a dummy password and pressed Enter; the button stayed disabled, the URL kept no parameter. The real page, before hydration, showed the button disabled. Real JS-off was not possible in the in-app browser, hence the copy. Change-password was added (not in the list): it also carries passwords.
- **Red proofs** (code taken out for a moment, restored from a copy, tests green again):
  - Remember-me: with the cookie part of `login/route.ts` removed (`remember` ignored, no 30-day Max-Age) the test "ticked: a 30 day cookie and a 30 day server session" fails (1 failed, 3 passed). The `product-session.ts` TTL part was not removed in this proof.
  - Wrong password does not leak the status: with the lookup made on every failure, "wrong password on a Pending Approval account" and "... on a Rejected account" fail (2 failed, 11 passed).
- **Disabled and other cases** (tests added, code already correct, no change): a disabled Local Provider with the right password gets only "Account disabled"; a non-Agency account marked Pending Approval, an Approved Agency without a profile, and a Disabled Agency with a leftover Rejected request all get no `registration_status` and no cookie.
- **Department contact:** one constant, `src/app/auth-v3/department-contact.ts`, `null` for now. While it is null the "Liên hệ Sở Du lịch" button, the contact popup (18d) and the sentence "liên hệ Sở Du lịch" are hidden. **Waiting for the team to give the real email, phone and hours.** The mockup's example values were removed.
- **Popups on `/login` with a fetch stub** (not real data): pending at 1440 and 390, revise at 1440 and 390, rejected at 1440 and 390, 18d at 390 (with a temporary contact, removed after). They match png/18a–18d apart from the known gaps (no company, no "Mã hồ sơ", no field line in 18b, no action buttons). Found and fixed: in 18a and 18d rows at 390 the labels wrapped badly; rows now stack on phones.
- **Script for real sign-in screenshots:** `scripts/local/account-screens.ts` (details below). Not run with a real password.

### Command for Khánh Linh
One time, no change to package.json:
```
npm i --no-save playwright && npx playwright install chromium
```
Dev server on port 3201 running (`npx next dev -p 3201`), then, with the real DEV login of an Agency (typed in the shell, not saved in any file):
```
E2E_EMAIL='<email>' E2E_PASSWORD='<password>' npx -y tsx scripts/local/account-screens.ts
```
Pictures go to `.local-shots/account/` (git-ignored): `account-{1440,390}.png`, `agency-{1440,390}.png`, `header-menu-{1440,390}.png` (png/20), `header-logout-{1440,390}.png` (png/20a, opened, not confirmed). Without the two variables it stops at once with a message. Credentials are never printed.

### Screen 19a
**"Màn không dùng trong MVP."** A waiting account cannot sign in, and login now shows the registration popup instead. The pending banner in `/account` stays in code but has no way in; no entry was created.
