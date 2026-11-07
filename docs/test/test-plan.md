# Integration and test plan — Hanoi Artisan Bridge (Session 10)

Owner: linhkhanh-vu (triage: Linh). Requirements: [`docs/build/claude-context/07-session10-11-requirements.md`](../build/claude-context/07-session10-11-requirements.md).
Scope sources: `docs/prd.md` (MoSCoW) and `docs/spec/specs/spec-*.md` §3 (acceptance scenarios), §5.2 (BRs).
This plan covers manual testing on the **hosted** version plus the automated suite (`npm test`, CI on every PR).

## 1. Test groups by role

| Group | Roles | Owns the user stories |
|---|---|---|
| **A** | Guest + Tour Agency | AUT US-1, US-2, US-3, US-4, US-5, US-10 (Agency side); EXP US-1–US-4; AIT US-1; PRF US-1, US-2, US-3; BKG US-1, US-2, US-3 (Agency view); IAC US-1 (Agency side) |
| **B** | Local Provider | PRF US-4, US-5; BKG US-4, US-5, US-6, US-1 (Provider schedule); IAC US-1 (Provider side); AUT US-2/US-3/US-5 for Provider accounts |
| **C** | UBND Admin | AUT US-8, US-9 (village scope); PRF US-6; ADM US-1 (village locked) |
| **D** | HDT Admin | AUT US-6, US-7, US-9 (platform-wide); PRF US-2 (full Agency detail); ADM US-1 (all villages) |
| **A+B pair** | Agency + Provider together | Cross-role flows: Explore/AIT → Chat (IAC US-1); Booking created by the Provider → Agency sees it in Chat and Agency schedule (BKG US-3/US-4/US-5, F-SCHED-08); Chat close/attachments (IAC Should/Could) |

Pairs test at the same time on two devices and record the time of each action, because cross-role results
(Booking Update message, unread count, schedule) appear on the other side.

## 2. Cases for every user story

For each user story the owning group runs four kinds of cases and records them in the results sheet
(story, case, steps, expected, actual, pass/fail, issue link):

| Kind | What | Source |
|---|---|---|
| **Normal** | One case per acceptance scenario | spec §3 "Acceptance scenarios" (copy the AS text, do not paraphrase) |
| **Boundary** | Each numeric or time threshold of the story's BRs: just below, at, just above | spec §5.2 BR table, §5.1 field limits |
| **Error** | Invalid input, missing field, duplicate, terminal state, refused action | spec §3 edge cases, §5.1 error outputs |
| **Permission** | Open the story's URLs and APIs as every other role and as Guest (copy the URL from another role's browser) | RBAC rules in each spec; AUT BR-011 |

Thresholds already used by the automated suite (examples, check the spec before testing):

| Module | Threshold examples |
|---|---|
| AUT | OTP valid 10 min, 5 attempts, 3 resends in 15 min; reset link 15 min, single use (BR-005, BR-006); edit link 24 h, single use (BR-016); password 8–64 chars with upper/lower/digit/special, no space |
| BKG | On hold expires after 72 h; arrival not before the start time; Cancel needs a reason; Booking inside Provider operating hours; list `page_size` 1–100 |
| IAC | Message 1–4000 characters; at most 5 files, 10 MB each, PDF/DOC/DOCX/XLS/XLSX/JPG/JPEG/PNG; close reason ≤ 500 characters |
| AIT / EXP | Group size vs Experience capacity (e.g. 12 vs 13 for Bát Tràng); budget per person vs price; only Verified Providers are listed |

**Mobile:** at least one Must flow per group is run on a phone over **4G/mobile data** (not the classroom
Wi-Fi), as Session 11 requires for the public link. Record the phone model and browser.

**Must flows** (from `docs/prd.md` "Must have"; Request Quote, Chat close and attachments are Should/Could):

1. Guest/Agency: Explore → Experience detail → Provider detail (EXP F-EXPLORE-01 to 03).
2. Agency: log in → AI Tour Matching → results (AIT).
3. Agency + Provider: open a Chat and exchange messages; each sees only its own history (IAC F-CHAT-01 to 03).
4. Provider: create a Booking → confirm (Booked) → mark arrival (Completed) or cancel; Agency sees the
   Booking and the private schedule (BKG F-SCHED-01 to 10).
5. Provider: edit the profile and an Experience; UBND of the same village verifies the profile (PRF).
6. HDT: create an UBND account, manage accounts; UBND: create a Provider account (AUT US-7 to US-9).
7. HDT/UBND: dashboard with scoped metrics and village filter (ADM).
8. Agency registration with OTP and HDT approval, password recovery (AUT US-1, US-4, US-6). **On the
   hosted version without email these flows show "Email chưa được cấu hình"** (ADR 0001 decision 2b, PR #76):
   test that message there, and the full flow on a laptop with `HAB_EMAIL_MODE=dev-outbox`.

## 3. Test data rules

- **One test account per person**, never a shared account. Ask Linh for yours; do not change its email, role,
  password or organization, and do not change any other shared account.
- Every record you create starts with **`[T-<name>]`**, for example a Chat message `[T-Thu] hello`, a Booking
  note, an Experience name or a company name. This makes it easy to find and remove test data.
- Never run `npm run demo:reset`, `npm run demo:seed`, `npm run db:seed`, `db:migrate` or any import against
  the hosted/production database while a test session is running. The hosted data lives in Supabase PostgreSQL
  and **is not reset on restart**.
- Synthetic data only: no real names, phone numbers, emails, tax IDs or documents. Use `@example.invalid` emails.
- Do not paste passwords, session cookies or keys into issues, chats or screenshots.

## 4. Defect process

1. **Report** a GitHub Issue with the template `.github/ISSUE_TEMPLATE/defect.md` (Session 10 template):
   title `[SENDER→RECEIVER] short description`, exact steps, expected (with FR/BR), actual, environment
   (hosted URL or `main @ <commit>`), interface, owner/reviewer, severity.
2. **Triage** (Linh): confirm or close as not a defect, set severity High/Medium/Low, label the module, assign
   the owner.
3. **Fix**: one issue → one branch `fix/<issue number>-<short-description>` → a PR whose description says
   `Closes #<n>`. Write the test that reproduces the defect first and show it **red** before the fix; the full
   suite must pass; no existing test is weakened.
4. **Merge** only outside test sessions, so the hosted version does not change under a running test.
5. **Verify**: the person who reported the defect re-tests it on the hosted version, then closes the issue
   (with a comment "verified on hosted at <time>"). If it still fails, reopen it.

Severity guide: **High** = a Must flow is blocked, data is wrong or leaked, or a role can do what it must not;
**Medium** = a Must flow works with a workaround, or a Should flow is blocked; **Low** = cosmetic or wording.

## 5. Completion criteria

- Every Must flow in §2 runs on the hosted version, including at least one per group on a phone over 4G.
- No **High** defect is open. Medium and Low defects are either fixed or listed in
  `docs/build/mvp-alpha-checklist.md` §3 with a reason.
- CI is green on `main` and the full suite passes.
- Session 10: each interface in `docs/test/integration-contract.md` (to be written) has its contract tests.

## 6. Open points before testing starts

- **Per-person test accounts**: the hosted login needs a way to give each tester a synthetic account with a
  password from environment variables (PR #75 is being reworked for Supabase). The data model limits some
  roles: one UBND per village (AUT BR-008; all villages already have one, issues #64/#65) and one owner account
  per Agency/Provider organization in the seed. How many UBND/Agency/Provider tester accounts are possible is
  a decision for the team and the `data/` owner.
- ADR 0001 (PR #71) still describes the JSON runtime and names "Request Quote" as a Must flow; it needs an
  update for Supabase and the PRD priorities.
