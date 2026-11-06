# UI and flow implementation progress

Date: 2026-11-07. Branch: codex/product-login-flow. Local changes only.

## Implemented in this iteration

Latest P0/P1 pass:
- `/` now redirects through canonical server session to Login or role workspace; no fixed demo organization IDs.
- Experience edit duration/price/capacity now have change handlers.
- Provider profile/edit duplicate portal headers removed; provider layout and provider-ui.css establish green/cream cards, form and responsive foundations.
- Delete/archive screen uses actual project CSS instead of unsupported utility classes.
- Provider Chat handles network failures and explains unavailable Experience context instead of silently opening an unrelated inbox.
- Dashboard recent conversation links preserve chat_session_id.
- Agency edit denial returns to the session workspace rather than a fixed workshop.
- Root no longer nests every page in a second main landmark; route loading/error recovery added.
- Logout handles request failure/pending state, Escape and Tab cycling; full focus-return behavior still needs browser verification.
- Account validation failures no longer offer Login when the account is already loaded.

Verification for this pass: 155 files / 977 tests passed; TypeScript passed after the logout update. Provider layout visual QA and remaining backlog are still outstanding. Do not interpret style foundations as completion of every Provider screen redesign.

- Personal account page `/account` and GET/PATCH `/api/auth/account`.
- Account service selects the user from the authenticated session and only updates full_name, title and phone. Email, identity, role and scope remain read-only.
- Shared header links to My Account and selects the longest matching module route to avoid multiple active navigation items.
- Admin dashboard uses the shared header without the duplicate sidebar/logout control.
- Experience owner detail links to edit and delete/archive confirmation.
- `/admin/users` and `/api/auth/users`: scoped account list, client-side search/status/role filters, account information and enable/disable confirmation.
- Admin account service checks manage_users permission and UBND village ownership, revokes sessions on disable, restores a previously audited status on enable and records audit/in-app notification rows. Seed-disabled accounts without a recorded previous status cannot be enabled automatically.
- Provider dashboard displays stored profile verification status, future On hold/Booked bookings and participant-scoped recent conversations.
- Removed four footer links that pointed at nonexistent policy/support routes. Shared green/cream tokens, keyboard focus and reduced-motion styles added.

## Verification

Agency review / durable JSON pass:
- Added HDT-only Agency registration and legal-change review service/API/page, account view, submission fields, review history and in-app notification/audit writes. Email failure is explicit. Initial registrations without a linked account are blocked pending the deferred authentication setup. Supporting seed documents have metadata but no original binaries, so no fabricated download link is displayed.
- Legal-change approval applies proposed legal values; rejection preserves the approved profile and account status. Stale review writes are guarded by the expected pending status in the atomic batch.
- Durable repository operations now acquire a cross-process filesystem write lock, reload the latest file under lock, use unique temporary files and restore memory state if a write fails. Reads refresh from disk. A stranded lock causes an explicit timeout rather than silent overwrite; do not run multiple production instances on a shared network filesystem.
- Three child processes inserted 45 records alongside two existing records; both independent readers saw all 47 unique records. Test storage is an isolated OS temporary directory.
- Full suite: 158 files / 982 tests passed; one additional Agency Request More Information/rejection test added and passed in a targeted rerun. Production build passed.
- Browser verified HDT login, Agency review navigation, pending legal-change card, account information, proposed/current fields, history and decision form. No live review mutation was submitted to user runtime; mutations tested in volatile fixtures.
- Authenticated HTTP smoke check: 29 role/page combinations across Provider, Agency, HDT and UBND returned 200. This checks route availability, not all button behavior or visual/mobile correctness. It is not a claim that every screen has passed visual QA.

Latest Account/User Management pass:
- My Account shows linked organization and a business-profile link.
- Avatar upload/read/remove endpoint scopes every request to the current session, accepts JPG/PNG signatures up to 2 MB and stores bytes in private ignored runtime storage. Removal clears the account reference, retaining old bytes for recoverability.
- Guest avatar requests and invalid image bytes covered by contract tests (5 related tests including account service passed).
- User Management adds organization/date filters and pagination.
- Experience forms now associate labels and controls; technical heading/locked labels were translated.
- Existing Quote opens the Experience's chat through the handoff service instead of linking to a bare inbox.
- Remaining work still includes Agency review implementation, all-screen visual/mobile QA, complete shared components and persistence concurrency review. Do not claim backlog complete.

2026-11-07 latest browser/design pass:
- Restarted dev server and checked Provider login, Dashboard, Profile, Experience list and owner detail in the browser.
- Reworked Dashboard into a two-column desktop layout with single-column mobile treatment; corrected actual card selectors for Provider profile styling.
- Added owner-detail location and notice period from existing API fields.
- Translated additional Provider labels; kept pending full-screen translation/QA explicit.
- TypeScript and 23 relevant regression tests passed after these changes.
- Human decision: keep credential issuance/reset pending authentication/email configuration; continue other business screens. This does not authorize a manual temporary-password delivery workflow.

- TypeScript check passed.
- Production build passed, including `/account` and its API route.
- Account service tests cover unauthenticated access, validation and attempted identity/role changes.
- Full suite after account and admin additions: 155 files / 977 tests passed.
- Browser: HDT login, User Management navigation/search, account information, My Account/edit form/cancel and logout confirmation/navigation verified. Mutating admin account tests use volatile test storage, not user runtime data.

## Remaining work

- Account avatar upload/removal, linked organization presentation and password change.
- Remaining User Management scope: create account, date/organization filtering/pagination, full verification information and complete Agency review. Password reset requires an email provider.
- Registration, OTP and password reset with a real delivery provider.
- Remaining shared UI components and visual inspection of every screen against its mockup.
- Browser verification of all role journeys, including destructive and exception paths in isolated test data.

## External dependency

## Additional screen design backlog (reviewed 2026-11-07)

Existence of a route is not visual completion. These items require layout work and browser comparison with screen mockups.

| Priority | Screen | Required work |
|---|---|---|
| P1 | PRF127 Provider profile | Remove its duplicate header/nav; establish identity hero, media, verification/revision panel, contact, hours and Experience sections; readable structured booking conditions instead of raw objects. |
| P1 | PRF128 Edit profile | Remove duplicate portal header; align form with shared shell; group identity/contact/legal/hours/media; responsive columns; explain fields requiring review; retain data on failure. |
| P1 | DSH018 Dashboard | Design an operational overview rather than a collection of links; distinguish urgent tasks, status metrics, upcoming bookings and messages; complete profile/review context. |
| P1 | EXP067 Experience list | Designed cards/table with thumbnails, status and consistent view/edit/archive actions; search/filter if approved by spec; avoid sparse three-column stats with only one populated cell. |
| P1 | EXP068 Owner detail | Replace placeholder-only media when assets exist; full location/conditions/notice information; designed summary and action region; shared typography and responsive gallery. |
| P1 | EXP069/070 Add/edit | Responsive form layout, grouped required fields, accessible labels, consistent error placement, locked-field explanations and saving/discard behavior; shared buttons and sticky action area. |
| P1 | EXP132 Delete/archive | Replace unsupported utility-only styling with actual project CSS; show selected Experience identity and clear delete/archive/block consequences; preserve cancellation path. |
| P1 | BKG133/137 Booking lists | Improve density, readable status badges, filters, action emphasis and empty states; align dashboard counts with visible scope. |
| P1 | BKG134/144 Booking forms | Group partner/Experience, schedule/pax and agreed terms; summary before save; field-level errors and clear status/cancellation explanations. |
| P1 | BKG135/138 Booking detail | Strong summary hierarchy, partner links, schedule and conditions, state-dependent actions; avoid one long definition list. |
| P1 | BKG136 Arrival | Show selected booking, partner, date/time and group before confirmation; explain resulting state. |
| P1 | SCH139/140/141 Calendars | Consistent toolbar/legend, understandable occupancy/availability, selected block panel and responsive treatment; ensure anonymous view stays masked. |
| P1 | COM048/065 Chat | Real organization identity rather than role-demo labels; contextual Experience/Quote/Booking presentation; improve small-screen list/conversation switching and composer. |
| P2 | PRF019/021 Agency profile/edit | Remove duplicate navigation, unify layout/form grouping and clarify legal review status. |
| P2 | AIT121 Matching | Align shell, composer and result cards with discovery; readable clarification/no-match/retry states; verify mobile. |
| P2 | ADM079 and review | Align analytics tables/cards with shared palette; remove FR/BR copy; render legal/contact data as human-readable fields; include account and review context. |
| P2 | VIL030 Village | Improve image/identity presentation, linked Provider/Experience cards and breadcrumb continuity. |
| P1 | Shared states | Reusable loading/empty/error/success patterns, field hints, status labels, confirmation dialogs and keyboard focus; audit every role at desktop and mobile sizes. |

No visual completion claim is made for screens not yet inspected in the browser. Existing automated test success does not validate appearance.

## Additional code audit findings (2026-11-07)

These are backlog items, not fixes in this audit. Source inspection does not establish how every screen looks at runtime.

| ID | Priority | Evidence / problem | Required outcome |
|---|---|---|---|
| AUD-01 | P0 | `src/app/page.tsx` still reads legacy `getCurrentRole()` and fixed DEMO_IDENTITIES rather than the canonical authenticated session; starts with LocalProvider state. | Define `/` entry behavior using the actual session and role workspace; remove hardcoded organization navigation. |
| AUD-02 | P1 | Experience edit duration, price and capacity inputs have controlled `value` but no `onChange`. | Editable when allowed; locked only when required by the business rule; verify saves through API and reload. |
| AUD-03 | P1 | Agency edit access-denied page points every user to the fixed Bat Trang Provider profile as "my workshop". | Return to the current user's real workspace; separate unauthenticated vs wrong-role vs wrong-organization cases. |
| AUD-04 | P1 | ProviderChatAction has no try/catch/finally around fetch/JSON; a network exception leaves busy true. | Show recoverable network error and allow retry without a reload. |
| AUD-05 | P1 | Provider Chat with no Experience merely navigates to the inbox; no Provider conversation is selected. | Resolve the supported Provider-only chat contract, or explain why an Experience must first be selected; no silent context loss. |
| AUD-06 | P1 | Quote-already-sent link and recent conversation links on Dashboard point to bare `/messages`. | Open the corresponding authorized conversation by chat_session_id. |
| AUD-07 | P1 | Account page links to Login for every error, including validation or save failures. | Link Login only for 401; retain entered values and show field/network errors with appropriate retry. |
| AUD-08 | P1 | Logout ignores HTTP failure and has no pending state. Dialog has no Escape handling, focus trap or focus return. | Prevent repeat submit, handle failure and provide accessible keyboard/focus lifecycle. |
| AUD-09 | P1 | Root layout wraps children in main while many pages also render main. | One primary main landmark per page, predictable page heading/breadcrumb structure. |
| AUD-10 | P1 | Several Experience labels have neither htmlFor/id nor wrapped input. | Programmatic label association, meaningful field errors and keyboard order. |
| AUD-11 | P1 | No route-level loading.tsx/error.tsx found in src/app. | Define loading/error recovery for server-rendered journeys, not only individual local spinners. |
| AUD-12 | P1 | JsonDemoRepository caches the full runtime in a process singleton and persists whole-file snapshots. | Verify cross-route visibility and concurrent writes in the Next runtime; define one authoritative write process/transaction strategy before treating demo storage as reliable for shared deployment. This is a risk requiring a concurrency test, not an observed loss claim. |
| AUD-13 | P1 | Edit forms and destructive actions lack a consistently verified dirty-form cancellation policy and success destination. | Audit unsaved edits, double submit, browser back, refresh and mutation failures for every form. |
| AUD-14 | P2 | Legacy RoleSwitcher, ExploreHeader and AdminSidebar remain in the tree; presence alone does not prove they render. | Inventory imports and isolate retired demo UI so future module edits do not reintroduce duplicate navigation. |

Review gates: test direct URL access for Guest/wrong role/wrong organization; confirm no partial writes on failed mutation; run cross-role refresh checks; compare every screen at desktop and narrow viewport with the approved spec rather than legacy decorative mockup copy.

The human confirmed that no authentication/email service is configured. Real delivery and credential recovery cannot be validated until the provider, sender and environment configuration exist. Never display a successful email delivery without a successful provider response. Current prototype login still accepts a seeded email and non-empty password; it must not be presented as production authentication.

`docs/spec/` and `data/` were not edited. No Git push was performed.
