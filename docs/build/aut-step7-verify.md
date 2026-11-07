# AUT Step 7 verify — non-author review of PR #11 (2026-11-07)

Reviewer: linhkhanh-vu (not an author of PR #11), with Claude Code (Claude Opus 5.5) driving the browser
and curl. Commit checked: `main` = `83027e5` (PR #11 merged as `06b1fae`, PR #50, PR #52 on top).
Machine: macOS, Node 22, built-in browser of the Claude desktop app. AUT code was not changed.

Companion file: [`aut-br-test-map.md`](aut-br-test-map.md) — every BR / acceptance scenario / edge case of
spec-AUT mapped to tests (path:line), 57 rows. It was produced by a subagent from reading the code and tests;
three of its MISSING rows were re-checked by grep in the main session (BR-004, US-5 AS-2, US-6 AS-3: confirmed).

## 1. Setup (playbook §A)

| Check | Result |
|---|---|
| `start_feature.py --use` + `--check` for all 10 `specs/0*-aut-*` folders | OK ×10 |
| `python data/scripts/validate_seed.py` | PASS (47 CSVs) |
| `npm test` on `83027e5` | 168 files / 1034 tests passed |
| Clean state | dev server stopped, `npm run demo:reset`, one `npm run dev` |
| Email | `HAB_EMAIL_MODE=dev-outbox` in a git-ignored `.env.local` (the quickstart says to set it in the shell; `.env.local` is the macOS equivalent for the launcher used) |

## 2. Demo results

"Clicked" = done by clicking/typing in the browser. "Curl" = API call with the session cookie of a real login.
Only synthetic `*@example.invalid` accounts were used; generated passwords are not recorded here.

| # | Step | Spec | How | Result |
|---|---|---|---|---|
| 1 | Register Agency (all fields, 1 PDF), wrong OTP `000000`, then OTP from `.demo-data/otp-outbox/` | US-1 AS-1, AC-AUT-OTP | Clicked (PDF put into the file input by script: the agent cannot use the OS picker) | ✅ "Invalid OTP (4 attempts remaining)", then Pending Approval page; 1 account row |
| 2 | Same OTP again; same email again; same Tax ID again | US-1 AS-1/AS-2, EC-1 | Curl | ✅ 422 "Verification Failed"; "Email already exists"; "Tax ID already registered"; still 1 account |
| 3 | Login while Pending Approval | US-2 AS-2, BR-003 | Curl | ✅ `ACCOUNT_INACTIVE` (see finding C1 on the contract) |
| 4 | Two more Agencies registered + OTP verified | — | Curl | ✅ (setup for 5–8) |
| 5 | HDT Approve | US-6 AS-1 | Clicked | ✅ account Approved; review record written |
| 6 | HDT Request More Information with a comment | US-6 AS-2, BR-014 | Clicked | ✅ status stays Pending Approval; edit link in `.demo-data/auth-outbox/`; ⚠️ UI says "Email chưa được gửi" (finding C3) |
| 7 | Open edit link, change company name, resubmit; open the same link again | US-10 AS-1/2/3, BR-016 | Clicked | ✅ request v2, Pending Approval, renamed in HDT list; second open: "Invalid or expired edit link" |
| 8 | HDT Reject with empty reason, then with a reason | US-6 AS-3 | Clicked | ✅ empty reason blocked ("Nhận xét (bắt buộc)"); with reason → Rejected, reason stored |
| 9 | HDT review of an Agency legal change (seed: Sen Việt, proposed Tax ID 0108000003) → Approve | checklist §3 #49, PRF BR-017 | Clicked | ✅ **#49 is built**: change Approved, profile Tax ID now 0108000003 |
| 10 | Logout as HDT (in-page confirm), then open `/admin/agencies` | US-3 AS-1 | Clicked | ✅ back on `/login`; page shell renders for Guest but data refused ("Chỉ HDT được xem hồ sơ Agency.") |
| 11 | Login as the approved Agency | US-2 AS-1 | Clicked | ✅ lands on `/explore` with Agency access |
| 12 | Forgot password → link from auth-outbox → new password | US-4 AS-1/2, BR-005 | Clicked | ✅ token `expires_at` = issue + 15 min; "Password Updated" |
| 13 | Same reset link again | US-4 AS-3, BR-006 | Clicked | ✅ refused on submit ("Invalid or expired recovery link"); ⚠️ form still shown on open (finding C5) |
| 14 | Session opened before the reset; old / new / third password | BR-006, US-4 | Curl | ✅ old session unauthenticated; old password 401, new 200, unused 401 |
| 15 | Logout then reuse the old cookie | US-3 AS-2 | Curl | ✅ session unauthenticated |
| 16 | Change password with a wrong current password | US-5 AS-2 | Curl | ✅ "Current password incorrect" |
| 17 | Expired reset / resubmission token (15 min / 24 h) | US-4 AS-3, US-10 AS-3 | Not run | ⏭ needs a clock change; covered by `aut-lifecycle.test.ts:64` (reset only) |
| 18 | **HDT creates UBND** | US-7 AS-1 | Clicked | ❌ **cannot run on the seed**: all 8 villages already have an UBND (Hạ Thái is also inactive), village list empty. Refusals checked by curl: assigned village → 409 "Village already has an assigned UBND"; UBND creating UBND → 403 |
| 19 | UBND demo identity `thanhvien8` creates a Provider | US-8 | Curl | ❌ **cannot run with the demo identity**: it is assigned to Hạ Thái (`is_active=false`), village list empty. Other seed accounts have placeholder hashes and cannot log in |
| 20 | Workaround for 18–19: HDT resets UBND Bát Tràng (`thanhvien1`) password | US-9 AS-3 | Curl (the button uses `window.confirm`, which the browser pane dismisses) | ✅ temporary password in auth-outbox |
| 21 | First login with the temporary password; business API before change; change password | US-7 AS-2, AC-AUT-ROUTING | Clicked (API check by curl) | ✅ routed to `/account/change-password`; `/api/auth/users` 403 meanwhile; after change → `/login?password_changed=1` |
| 22 | UBND Bát Tràng creates a Provider in Bát Tràng; other village | US-8 AS-1/2/3, BR-015 | Clicked; other village by curl | ✅ Active account, `must_change_password`, profile Draft, nothing published; Vạn Phúc → 403 |
| 23 | New Provider first login → change password → login | AC-AUT-ROUTING | Clicked | ✅ change page first, then dashboard (Draft, 43 %); "Cập nhật hồ sơ" → `/provider/<id>/edit` |
| 24 | UBND account list | US-9 AS-1 | Clicked | ✅ only the 2 Providers of Bát Tràng |
| 25 | UBND locks the Provider while its curl session is open; login again | US-9 AS-2, BR-013, AC-AUT-SESSION | Clicked; session by curl | ✅ status Disabled; open session immediately unauthenticated; login 403 `ACCOUNT_INACTIVE` |

Not exercised: Enable (restore previous status), document download by HDT, resend-OTP limits, rate limit on
reset requests (all have service tests per the map).

## 3. Findings

### A. Test gaps (playbook §D: a Must BR without a test is blocking)

| ID | Gap | Map row |
|---|---|---|
| A1 | No test that a Disabled HDT/UBND/Provider cannot log in | BR-004, US-2 AS-3 (MISSING) |
| A2 | No test that Rejecting a **registration** sets Rejected and stores the reason (only a major change is rejected in tests) | US-6 AS-3 (MISSING) |
| A3 | No test for a wrong current password on Change Password | US-5 AS-2 (MISSING) |
| A4 | No test that Local Provider self-registration is not offered (enforced only by the hard-coded role) | BR-001, US-1 AS-3 (MISSING) |
| A5 | No test for resubmission while another HDT has the record open | EC-7 (MISSING) |
| A6 | Rejected / Disabled Agency login never tried; 24-hour resubmission expiry never tested | BR-003, BR-016 (PARTIAL) |
| A7 | Four routes are never called by any test: `POST /api/auth/agency-reviews`, `GET/PATCH /api/auth/users`, `POST /api/auth/reset-password`, `POST /api/register/verify-otp`. 9 rows are covered only by calling `src/lib/auth/*` directly | map §3 |

The demo shows the behaviour of A1–A3 is correct today; the gap is regression protection.

### B. Demo blocked by seed data (data/ is human-owned — not changed)

| ID | Issue |
|---|---|
| B1 | Every village already has an UBND, so US-7 AS-1 (HDT creates UBND) cannot be demonstrated |
| B2 | The UBND demo identity `thanhvien8` is assigned to Hạ Thái, which is inactive, so it cannot create a Provider (US-8) |

**Deploy note (Session 11):** a test UBND account used on the hosted version must be assigned to an
active village (for example `thanhvien1`, Bát Tràng, after an HDT password reset), not the demo identity
`thanhvien8` (Hạ Thái, inactive).

### C. Behaviour / contract findings

| ID | Finding | Spec | Class |
|---|---|---|---|
| C1 | Login failure returns `{"error":{"code":"ACCOUNT_INACTIVE","message":"Tài khoản hiện không hoạt động."}}` for Pending, Rejected and Disabled alike. §5.1 FR-007 defines `error_message` as Enum[Invalid credentials, Account not approved, Account disabled]; FR-007 asks to "deny with message" per status | spec-AUT §5.1 FR-007 | Non-blocking (contract drift) |
| C2 | `last_login` is never written on login (only seed values exist); the account list therefore shows "Chưa đăng nhập" for users who did log in | §5.1 FR-021 `last_login`; data model `user_accounts.last_login` | Non-blocking |
| C3 | `/admin/agencies` always shows "Email chưa được gửi vì chưa cấu hình dịch vụ" (`src/app/admin/agencies/page.tsx:26`), although the API returns `email_delivery_status: 'Dev outbox'` and the edit link was written; `notifications.email_delivery_status` is hard-coded `'Fail'` (`src/lib/auth/agency-review.ts`) | US-6 AS-2 | Non-blocking |
| C4 | Request More Information on a **major change** stores the status but issues no edit link, and the Agency has no way to answer (inferred from `agency-review.ts:43` and the map, not demoed) | checklist §3 #49 remainder | Limitation |
| C5 | A used or expired reset link still shows the password form; it is refused only on submit (the edit link is checked on open) | US-4 AS-3 (met) | Non-blocking UX |
| C6 | Admin "Đặt lại mật khẩu" uses `window.confirm` and says it "cần dịch vụ email được cấu hình" even when dev-outbox is on; lock/unlock use an in-page confirm | — | Cosmetic |
| C7 | BR-012 says revalidate "every five minutes and on critical actions"; the code revalidates status and role on every request (`product-session.ts:104-105`). Stricter, matches AC-AUT-SESSION "no 5-minute grace" | BR-012 vs AC-AUT-SESSION | Note (spec tension) |

### D. Review criteria from `claude-context/07-session10-11-requirements.md`

| # | Criterion | Result |
|---|---|---|
| 1 | Matches the requirement and BR | Yes for every demoed path (§2), except the contract details in C1–C2 |
| 2 | Field names, types, error behaviour match §5.1 | No for FR-007 error output (C1) and FR-021 `last_login` (C2) |
| 3 | Tests for new behaviour, boundaries, failures | Partly: A1–A7 |
| 4 | No test weakened / edited to pass | PR #11 modified 20 existing test files. Almost all only swap `DEMO_IDENTITIES` for a session context with the same expected values. One changes the scenario: `tests/adm/unit/admin-role-sync.test.ts` no longer mocks a refresh that re-dispatches `hab_role_changed`, so the recursion it was written to catch is no longer exercised, and the expected call count went from 1 to 2. Needs the authors' confirmation |
| 5 | No secret, `.env`, real data or hand-edited seed | None found (`git diff 06b1fae^1 06b1fae` touches neither `data/` nor `docs/spec/`, adds no env/key file) |
| 6 | AI-generated parts recorded in the AI Use Log | No `docs/ai-use-log.md` in the repo; the PR's build-log entry names Codex but no human checker |

## 4. Draft review comment for PR #11 (English, to paste on GitHub)

```markdown
## Step 7 Verify – post-merge non-author review (main 83027e5) – Request changes (follow-up PR)

Reviewed by linhkhanh-vu (not an author). Full table: `docs/build/aut-step7-verify.md`,
BR → test map: `docs/build/aut-br-test-map.md`.

### ✅ Verified
- `start_feature.py --check` OK for all 10 AUT folders, `validate_seed` PASS, 168 files / 1034 tests pass.
- Clicked in the browser from a clean `demo:reset`: Agency registration with wrong then correct OTP
  (dev-outbox), HDT Approve / Request More Information / Reject (empty reason blocked), edit link →
  resubmit → link single-use, logout, Agency login, forgot password (15-minute token, single use, old
  session revoked), first-login password change for UBND and Provider, UBND creates a Provider (Active
  account, Draft profile), UBND sees only its village, lock revokes an open session immediately.
- HDT review of an Agency Tax ID change works end to end (Approve applied 0108000003), so checklist §3 #49
  can be closed except for Request More Information on a change (no edit link / no reply path).

### ❌ Blocking (test gaps for Must rules; behaviour is correct in the demo)
1. **BR-004 / US-2 AS-3**: no test that a Disabled HDT, UBND or Provider cannot log in.
2. **US-6 AS-3**: no test that rejecting a *registration* sets Rejected and records the reason
   (`agency-review.test.ts:33` rejects a major change only).
3. **US-5 AS-2**: no test for a wrong current password (`lifecycle.ts:85`).
4. **BR-001 / US-1 AS-3**: Agency-only self-registration is enforced only by the hard-coded role
   (`registration-service.ts:62`); no test.

### 🧪 Test gap (non-blocking)
- `POST /api/auth/agency-reviews`, `GET/PATCH /api/auth/users`, `POST /api/auth/reset-password` and
  `POST /api/register/verify-otp` are never called by a test; 9 rules are tested only through
  `src/lib/auth/*`. Please add at least one success-path route test for each.
- Rejected/Disabled Agency login (BR-003), 24-hour resubmission expiry (BR-016), EC-7.

### ⚠️ Specific comments
- **Contract (§5.1 FR-007)**: `/api/auth/login` returns `error.code = ACCOUNT_INACTIVE` with one message for
  Pending, Rejected and Disabled. FR-007 expects `error_message` ∈ {Invalid credentials, Account not
  approved, Account disabled}, so an Agency waiting for review and a disabled user see the same text.
  Either map the statuses to the spec values or propose a spec change.
- **§5.1 FR-021 `last_login`**: never written on login, so `/admin/users` shows "Chưa đăng nhập" for
  accounts that did log in.
- `src/app/admin/agencies/page.tsx:26` always says the email was not sent, although the API returned
  `email_delivery_status: 'Dev outbox'` and the edit link was delivered; `notifications.email_delivery_status`
  is hard-coded `'Fail'` in `agency-review.ts`.
- `tests/adm/unit/admin-role-sync.test.ts` was rewritten: the mock no longer re-dispatches `hab_role_changed`,
  so the loop it guarded against is not exercised any more and the expected count changed 1 → 2. Please
  confirm the loop cannot recur with `readSessionContext`, or keep a variant that dispatches the event.
- Used reset link: the form is still shown and fails only on submit (the edit link is checked on open).
- No AI Use Log entry naming the human who checked the Codex-generated integration (review criterion 6).

### Seed / demo data (for the data owner, not this PR)
- All 8 villages already have an UBND, so "HDT creates UBND" (US-7 AS-1) cannot be demonstrated.
- The UBND demo identity `thanhvien8` is assigned to Hạ Thái (`is_active=false`) and cannot create a
  Provider; only the four demo identities can log in.

### Re-verify checklist
- Tests for items 1–4 fail when the guard is removed (mutation), then pass.
- `/api/auth/login` error output for Pending, Rejected, Disabled matches §5.1.
- Log in, then `/admin/users` shows the new `last_login`.
```
