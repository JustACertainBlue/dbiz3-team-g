# Shared Consistency Contract

Revision: 28 September 2026. Status: revised for human review. This document records the choices needed to synchronize the existing course specification. It does not authorize implementation, add payment/staff-management features, or claim client approval.

## Source and course format

- Current requirements: Function List, module FR/IO, current Screen Specs and architecture Markdown must express the same contract.
- Use Case is a table as required by the lecturer. No graphical use-case diagram is required.
- The DBIZ2 workbook and PNG mockups are preserved without modification. Current Markdown requirements define the consistency corrections; image design remains outside this revision.
- Context Markdown is the current integration context. The original context.md.docx is the historical business-context source.
- Any future change updates UC/Function/FR/IO/Screen/AC and associated diagrams together. Approval fields remain pending until the human approves.
- Village is a seeded read-only reference catalog in this MVP. There is no Village verification lifecycle; discovery and matching use eligible Verified Provider profiles linked to a seeded Village.

## Actor and permission model

Admin is ONE actor. Its stored role is ADMIN and admin_type is HDT or UBND. HDT_Admin/UBND_Admin and “Admin HDT/UBND” in descriptive text denote subtypes of this actor, not additional top-level roles. Member is a collective actor for registered Admin, Tour Agency and Local Provider, including signed-out login/recovery; protected actions require authentication. System is supporting automation.

| Action | Admin subtype HDT | Admin subtype UBND | Tour Agency | Local Provider |
|---|---|---|---|---|
| Create UBND | Allowed; assign one village | No | No | No |
| Create Provider | No | Assigned village only | No | No |
| Review Agency registration/major legal change | Allowed | No | Submit own data/change | No |
| Review Provider profile | Monitoring only | Assigned village, read-only content; Approve/Request Revision | No | Submit own profile |
| Disable/enable/reset account password | Platform scope | Provider accounts in assigned village | No | No |
| Edit business profile | No | No | Own Agency Owner authorization | Own Provider |
| Create/update/cancel booking or mark arrival | No | No | Read own bookings only | Own Provider bookings |
| Dashboard analytics | Platform-wide | Fixed assigned village | No | No |
| Chat | No | No | With Provider; direct initiation allowed | With Agency; existing Quote/Booking context required |
| My Account/Change Password | Own account | Own account | Own account | Own account |

F-AUTH-16 checks both action and resource scope on every protected request. No free-form role checkboxes grant unspecified permissions. Screens do not introduce a Director-only or creator-only hierarchy. In MVP, `agency_profiles.user_id` identifies the single Agency Owner; F-PROFILE-02 requires both `manage_profile` and this exact ownership match. Staff onboarding and delegation are outside this revision. A NULL `role_permissions.admin_type` applies to all users of that role; a non-NULL subtype requires a matching Admin subtype. Ranking optimization is an internal System job, not an Admin permission or screen action.

## Authentication and navigation

Use opaque server-side sessions. JWT lifetime/refresh assumptions are removed. Session lifetime, cookie transport, realtime transport and retry backoff are technical Plan choices, not invented course requirements. Disable revokes sessions immediately; periodic five-minute checks are secondary.

Agency registration: REG003 validates all F-AUTH-02 fields and invokes F-AUTH-03 duplicate checking. After both succeed, F-AUTH-02 creates one server-side registration request and returns its opaque ID. REG115 uses that existing request for F-AUTH-23 OTP issue, resend and verification; only then F-AUTH-04 creates the Pending Approval account and shows REG116. OTP is not password recovery. A client boolean cannot authorize email verification.

When HDT selects Request More Information, the Agency account remains Pending Approval. A single-use edit link valid for 24 hours opens REG003 for F-AUTH-26; issuing a new link or completing a successful resubmission invalidates every older active link for that request. Each resubmission is versioned and returns the registration request to HDT review while preserving review history.

Password recovery uses a15-minute single-use token link. Rate limit:3/email and5/IP per15min. Known/unknown email has the same visible result; token and delivery diagnostics are internal. PAS014 has no demo shortcut to PAS142. Token link opens PAS142; success opens PAS143.

Change Password is a panel on ACC129 under F-AUTH-13/14, not a new Screen ID. must_change_password blocks normal navigation until successful change. Then Admin→ADM079, Agency→EXP017, Provider→DSH018. The Provider dashboard links incomplete profiles to PRF128.

## Shared field and state dictionary

| Concept | Canonical contract |
|---|---|
| Roles | ADMIN / Tour_Agency / Local_Provider; admin_type HDT / UBND required only for ADMIN |
| Agency account | Pending Approval / Approved / Rejected / Disabled |
| Admin/Provider account | Active / Disabled |
| Provider editable/review version | Draft / Pending Verification / Verified / Revision Required |
| Published Provider version | None / Verified; retain last Verified version while revision is reviewed |
| Booking | On hold / Booked / Completed / Cancelled |
| Chat | Active / Closed; Closed terminal and immutable |
| IDs | Opaque persistent identifiers; do not substitute names/emails for Agency/Provider/Booking IDs |
| Date | ISO8601 calendar date |
| DateTime | ISO8601 timestamp with offset; stored instant, displayed/interpreted in Asia/Ho_Chi_Minh |
| TimeRange | Weekly local start/end times, start<end; no overlapping ranges within a day; missing/empty day has no operating window |
| Duration | Positive integer minutes; UI hours converted to minutes |
| Notice period | Nonnegative integer hours |
| Money | Decimal VND; agreed_price is total agreed booking price |
| Images | JPG/JPEG/PNG/WEBP,<=10MB,>=1280×720; portrait if used additionally height>=900 |
| Registration documents | PDF/JPG/JPEG/PNG,<=10MB/file,max5; Business Registration Certificate required; travel license when applicable |
| Chat text | <=4000 characters; plain text and basic bold/italic |
| Chat files |1–5 files; PDF/DOC/DOCX/XLS/XLSX/JPG/JPEG/PNG;<=10MB each |

Whitespace or letter-spacing variants in labels must not become new persisted enum values. Form fields name their exact contract fields. Required-for-submission differs from required-for-saving-Draft. Optional fields may be absent; no fabricated ratings or legal verification badges.

## Profile and Experience

PRF128 saves incomplete initial data as Draft; first complete save submits Pending Verification. Operating hours are optional, but absent hours mean no available periods. No autosave or additional six-gallery-photo submission requirement overrides F-PROFILE-04.

Experience operations remain Create/Update/Delete, with archive selected by history references. Draft/Published/Listed controls are removed rather than introducing a new lifecycle. Active On hold/Booked references lock price, capacity, duration, location and related pricing fields. Historical references preserve the archived Experience. No booking references permits hard delete. A single description field is saved; short preview is derived, not separately persisted.

Group discounts/special rates use the existing PRF Q23 array schema: pax_threshold and discount_percentage. Validate positive thresholds and percentages0–100. These optional rules are editable except while active bookings lock pricing. No new automatic price-selection/stacking rule is invented; agreed booking price is entered independently. If calculation/stacking is needed later, obtain a decision before implementation.

## Guest visibility and catalog ownership

Guest sees basic public profile/Experience data, participant capacity and a public availability summary. Price, contact and other Agencies' booking details remain restricted. Full interactive Provider schedule remains authenticated under F-SCHED-01; an availability summary does not grant access to private schedule records. AI interface/nav is hidden for Guest, and a direct URL requires Login.

Village catalog is read-only seeded/source-provided reference data in this MVP; no Village CRUD/review feature is introduced. Unknown rating/review values are omitted, not synthesized.

## Chat and Quote Request

At most one Active Chat per Agency–Provider pair; Experience/Quote/Booking identify context inside the conversation. Reuse Active; never reopen Closed. Navigation does not close a chat. F-CHAT-04 is an explicit authorized action. Historical Closed messages/files remain readable by participants. No Provider–Provider Chat.

Quote Request is once per Agency–Experience, not Experience–date or once per session. It opens Chat and sends the initial message; optional group/date context is not a separate required form. Conversation unread_count is visible. F-SCHED-08 recipient_read_status is internal tracking of the booking system message, not a visible message read receipt.

## Booking contract and exceptions

Every create starts On hold and expires72h after original creation. No direct Booked creation. Edits do not reset expiry. Input includes registered agency_id and editable agreed_price total VND. Experience, operating hours, notice period, capacity and overlap are checked before a single atomic commit. Failed validation/conflict/authorization creates no booking or occupancy.

Confirmation and expiry conditionally transition the current state in one transaction. At the expiry boundary confirm is rejected; expiry cancels once. Worker retry does not duplicate events/messages. Each accepted booking event updates both schedule views and the related Active Chat, with delivery retry separate from the committed business state. Agency is read-only. No operating hours means no available periods, even with zero bookings. No manual blackout/availability editor is added.

This consistency revision preserves the current arrival→Completed requirement and its occupancy consequences. Separating arrival from service completion, changing hold duration near service time and adding new no-show rules are deferred business decisions, not silently changed here.

## Explore and AI

Build the current Tour Preference Profile before retrieving/ranking candidates. Incomplete requirements loop through clarification or cancel. AI unavailable returns Temporary AI Failure with Retry; no unapproved rule-based extraction fallback. No-match is a defined result. Required external-distance failure never produces fabricated distance.

Implicit preference thresholds follow F-EXPLORE-08. Retention30d and quality formula50% relevance/30% click/20% strong action are shared definitions. Daily aggregation differs from weekly/monthly tuning evaluation. Book/Schedule are not preference signals. AIT/EXP share preference and decay rather than double-counting separate copies.

Ranking parameter versions use Draft / Active / Retired. F-EXPLORE-17 is the sole tuning and activation path: the System records a candidate Draft, checks at least 30 eligible consented/authorized Explore sessions in the preceding seven days, limits each parameter-weight change to 10 percentage points, and replays those sessions using the same eligibility rules: rescore the historical displayed catalog under the candidate, find the historically clicked/acted-on Experience at its candidate rank, and recompute the F-EXPLORE-14 rank-relevance component while holding the observed click/strong-action facts fixed. Sessions with no action still count. It promotes the candidate only when the offline ranking-quality proxy improves by at least 5 points on the 0–100 scale; replay is a proxy, not evidence of improved live conversion. Promotion retires the previous Active version atomically and records a System audit event with reason and both version IDs. If the next eligible seven-day cohort has at least 30 sessions and live mean ranking quality falls by at least 5 points versus the preceding baseline, the System creates a rollback version from the previous parameter map and promotes it atomically. Otherwise the current Active version remains. An insufficient cohort, invalid candidate or transaction failure never changes Active. A tracked Explore session pins the Active version at its start; F-EXPLORE-10 keeps that version throughout the session and stores each displayed ranking snapshot for replay. HDT/UBND have read-only monitoring; neither manually edits ranking versions. This changes ranking weights, not the AI model. The 30-session, 10-point weight and 5-point quality gates are MVP working defaults to calibrate against real traffic before production. The exact tie-break and missing-factor scoring rules remain a separate design question.

## Dashboard

ADM079 contains time/village filters, Agency/Provider result-list filters, four cards, booking status chart, trend, booking table and top10 collaboration pairs. UBND village is fixed. Distinct Active Collaboration pairs have On hold/Booked bookings. Frequency ranking counts Booked/Completed only. These are separate from total bookings. Account status, profile verification and activity are separate dimensions. No additional drill-down is implied.

Dashboard KPI time basis is fixed: Agency and Provider totals are snapshots at the selected end date; Booking totals, status breakdowns and trends use Booking created_at within the selected period; Active Collaborations are unique Agency–Provider pairs with at least one On hold or Booked Booking at the selected end date; activity metrics use events occurring within the selected period; top collaboration frequency counts Booked and Completed Bookings created within the selected period.

Approval/review outcomes and booking changes create in-app notification records as well as the specified email delivery result. Notifications are stored as recipient-scoped records with read state; no separate notification screen is required for MVP.

## Unresolved versus deferred

Human approval of revised docs remains pending. Outstanding field/KPI/scoring questions above are not marked approved. Technical stack/session transport/realtime/backoff choices belong to Plan. Business lifecycle improvements are explicitly deferred. Historical workbook/PNG values do not override this baseline.
