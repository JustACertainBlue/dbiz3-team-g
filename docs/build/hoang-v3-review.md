# Hoang v3 review — 2026-11-27

Review base: origin/main f9ef6d7. Scope: provider 29–33; account 15–20a and 28.

## Findings

| ID | Screen | Finding | Evidence / disposition |
|---|---|---|---|
| HG1 | 29 / 30 | PostgreSQL TIME values render seconds in opening hours, unlike HH:mm elsewhere. | Confirmed in PROD audit; regression with 08:00:00 and 17:30:00 fails before formatting fix. |
| D13 | 19 | Approved renders untranslated. | Separate D13 PR. |
| A9 | Forms | Missing POST / hydration lock. | Separate A9 PR with app-wide scan. |
| C2 | 20 / 20a | Verify menu regression sensitivity. | Separate C2 PR; wrong destination mutation fails account-link assertion; source restored. |
| QR | 29 | Received-then-cancelled booking remains counted. | Separate QR PR follows assignment defect; historical-receipts semantics differ from earlier decision, so business review is required. |
| A12 | Login guide | Stale fixture login and real-account handoff guidance. | Separate docs PR; no credential roster invented. |
| D21–D22 | 18b / 18c / 18d | Login popups lack working revision/contact actions. | Blocked: official contact absent; rejected requests cannot use existing RMI-token endpoint. Do not invent contact or bypass token checks. |

## Screen coverage and limits

| Screens | Automated evidence | Browser evidence / outstanding work |
|---|---|---|
| 29–31, 33 | v3-provider-mockup-blocks; v3-provider-page; provider calendar/list/gallery suites | Existing read-only PROD audit covers dashboard/profile/list/detail. No submission writes. |
| 32 | v3-provider-mockup-blocks checks experience form blocks, order and labels | PROD add form inspected; upload/create/edit submission still needs DEV credentials. |
| 15 | v3-account-mockup; login-registration-status | PROD Provider login confirmed on 25 November. |
| 16 | v3-account-mockup steps 1–4 | Real reset delivery and expired links not exercised on PROD. |
| 17 / 17a / 18 | v3-account-mockup register/revise/OTP; registration flow integration | Fixture verification only; real email/OTP unavailable without configured service. |
| 18a–18d | v3-account-mockup popup fixtures; v3-account-logic | Fixture contacts/links do not prove real login actions; D21–D22 remain blocked. |
| 19 / 19a | v3-account-mockup view/edit/password/pending; v3-account-panels | PROD Provider info inspected; Agency PROD account view and edit/cancel inspected at 1440 px on 27 November; no save. |
| 20 / 20a | v3-int-account-menu + wrong-link mutation | Menu and logout modal inspected and captured at 1440 px on 27 November; exact original mockup pixel comparison remains blocked by missing original assets. |
| 28 | v3-account-mockup company profile/edit | Fixture only; Agency PROD account view and edit/cancel inspected at 1440 px on 27 November; no save. |

The 105 targeted checks passed after merging current main; combined production build passed. These checks verify fixture content, order and behavior, not pixel equality with the original 1440 px mockup. The supplied bug-list-sau-v3.md contains a draft test in section D, not the 36-defect table referenced by the PDF, so that missing table cannot be marked reviewed.

PROD phase 2 remains blocked: feat/prod-phase2 is absent from the remote and local repository. The coordinator must provide the implementation and approved record list. PROD data writes remain assigned to the human operator with dry run and undo.

Browser evidence added 27 November (outside repo, local-provider-audit/images): account16-1440.png, account17-1440.png, account19-1440.png, account20-1440.png, account20a-1440.png, account28-1440.png. Registration visibly reports real email unavailable. No reset email requested or legal terms accepted.
