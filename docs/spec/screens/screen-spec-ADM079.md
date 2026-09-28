# Screen Spec: ADM079 Admin Dashboard

| Field | Value |
|---|---|
| Screen ID | `ADM079` |
| Screen name | Admin Dashboard |
| Actor | Admin (HDT / UBND) |
| Priority | Must |
| Belongs to module | `spec-ADM.md` |
| Mockup image | `img/ADM079.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Provides an operational overview of Agencies, Local Providers, bookings, collaborations, account activity, and key platform metrics within the Admin's data scope.

The controls and decisions below define the current screen specification.

## 2. Mockup

![ADM079](img/ADM079.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Admin Dashboard | Heading | Admin Dashboard | No | Static screen title |
| 2 | Period preset | Select | `period_preset` — F-ADMIN-04 | Yes | period_preset (Enum[Last 7 days, Last 30 days, Last 90 days, Last year, Custom]; Required — default Last 30 days) |
| 3 | Start date | Input | `start_date` — F-ADMIN-04 | No | start_date (Date; Optional — Custom only) |
| 4 | End date | Input | `end_date` — F-ADMIN-04 | No | end_date (Date; Optional — Custom only) |
| 5 | Village id | Input | `village_id` — F-ADMIN-05 | No | village_id (ID; Optional — null means All Villages for HDT; fixed to the assigned village for UBND) |
| 6 | Time filter | Structured input | `time_filter` — F-ADMIN-05 | Yes | time_filter (Object; Required) |
| 7 | Agency id | Input | `agency_id` — F-ADMIN-06 | No | agency_id (ID; Optional) |
| 8 | Provider id | Input | `provider_id` — F-ADMIN-06 | No | provider_id (ID; Optional) |
| 9 | Search query | Input | `search_query` — F-ADMIN-06 | No | search_query (String; Optional — autocomplete) |
| 10 | Total Agencies | Read-only panel | F-ADMIN-01, F-ADMIN-02, F-ADMIN-03, F-ADMIN-04, F-ADMIN-05, F-ADMIN-06, F-ADMIN-07, F-ADMIN-08, F-ADMIN-09, F-ADMIN-10 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 11 | Total Providers | Read-only panel | F-ADMIN-01, F-ADMIN-02, F-ADMIN-03, F-ADMIN-04, F-ADMIN-05, F-ADMIN-06, F-ADMIN-07, F-ADMIN-08, F-ADMIN-09, F-ADMIN-10 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 12 | Total Bookings | Read-only panel | F-ADMIN-01, F-ADMIN-02, F-ADMIN-03, F-ADMIN-04, F-ADMIN-05, F-ADMIN-06, F-ADMIN-07, F-ADMIN-08, F-ADMIN-09, F-ADMIN-10 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 13 | Active Collaborations — distinct pairs | Read-only panel | F-ADMIN-01, F-ADMIN-02, F-ADMIN-03, F-ADMIN-04, F-ADMIN-05, F-ADMIN-06, F-ADMIN-07, F-ADMIN-08, F-ADMIN-09, F-ADMIN-10 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 14 | Agency account status and activity | Read-only panel | F-ADMIN-01, F-ADMIN-02, F-ADMIN-03, F-ADMIN-04, F-ADMIN-05, F-ADMIN-06, F-ADMIN-07, F-ADMIN-08, F-ADMIN-09, F-ADMIN-10 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 15 | Provider account/profile status and activity | Read-only panel | F-ADMIN-01, F-ADMIN-02, F-ADMIN-03, F-ADMIN-04, F-ADMIN-05, F-ADMIN-06, F-ADMIN-07, F-ADMIN-08, F-ADMIN-09, F-ADMIN-10 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 16 | Booking status breakdown | Read-only panel | F-ADMIN-01, F-ADMIN-02, F-ADMIN-03, F-ADMIN-04, F-ADMIN-05, F-ADMIN-06, F-ADMIN-07, F-ADMIN-08, F-ADMIN-09, F-ADMIN-10 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 17 | Apply filters | Button / navigation | Refresh permitted metric cards, charts and lists | No | Enabled only when the linked permission/validation guard succeeds |
| 18 | Manage accounts | Button / navigation | Separate operational account management | No | Enabled only when the linked permission/validation guard succeeds |
| 19 | Booking trend | Chart / table | F-ADMIN-09 time_series | No | Read-only; reflects current filter scope |
| 20 | Booking table | Chart / table | F-ADMIN-09 booking_records: Date, Agency, Provider, Experience, Status, Price | No | Read-only; reflects current filter scope |
| 21 | Top 10 collaboration pairs | Chart / table | F-ADMIN-10 top_pairs, sort Frequency/Recency | No | Read-only; reflects current filter scope |
| 22 | Metric cards | Chart / table | F-ADMIN-03: four distinct cards | No | Read-only; reflects current filter scope |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | Permitted data or a prefilled form; role-specific actions only | Authorized screen load |
| Empty | No records/optional values shown with explanatory text; never infer availability from absent bookings | Successful response with no data |
| Loading | Skeleton/progress; mutation actions disabled while their request is pending | Fetch/upload/save in progress |
| Error | Defined field errors or fetch failure with Retry; no successful transition or partial mutation is shown | Validation, permission or service failure |
| Success / confirmation | Refreshed read-only data or saved result; navigate only after successful linked action | Successful read/mutation |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | Apply filters | Select | Refresh permitted metric cards, charts and lists | stay |
| 2 | Manage accounts | Select | Separate operational account management | ADM095 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | HDT platform-wide; UBND fixed assigned village. Time/village filters refresh permitted metrics; Agency/Provider filters combine with AND in result lists. | Function List and shared consistency contract |
| SR-004 | Four cards: Total Agencies, Total Providers, Total Bookings, Active Collaborations. Active collaborations are distinct pairs with On hold/Booked; frequency top10 counts Booked/Completed only. | Function List and shared consistency contract |
| SR-005 | Include booking status chart, trend chart, booking table and top10 partner pairs. Account status, profile verification and activity are separate metrics. Metric rows are read-only, no unsupported drill-down. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| ADM | FR-001 | F-ADMIN-01 | Display Dashboard Interface |
| ADM | FR-002 | F-ADMIN-02 | Load Dashboard Metrics |
| ADM | FR-003 | F-ADMIN-03 | Display Metric Cards Summary |
| ADM | FR-004 | F-ADMIN-04 | Filter by Time Period |
| ADM | FR-005 | F-ADMIN-05 | Filter by Village |
| ADM | FR-006 | F-ADMIN-06 | Filter by Agency/Provider in Lists |
| ADM | FR-007 | F-ADMIN-07 | View Agency Metrics |
| ADM | FR-008 | F-ADMIN-08 | View Provider Metrics |
| ADM | FR-009 | F-ADMIN-09 | View Booking Metrics |
| ADM | FR-010 | F-ADMIN-10 | View Collaboration Metrics |

## 8. Responsive and accessibility notes

- Scope: **desktop only**. The screen supports desktop viewport sizes across different desktop resolutions; narrow/tablet and mobile layouts are explicitly out of scope.
- Layout behavior: the sidebar, 4 KPI cards, and 2-panel row (Pending Verification / Booking Status) use a single desktop layout that remains usable across supported desktop resolutions, without requiring a separate mobile or narrow-screen layout.
- Text that must remain readable (contrast, minimum size): KPI numbers and donut legend values are the primary at-a-glance data and should meet standard body/heading contrast and minimum size guidance for desktop — *specific values TBD*

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
