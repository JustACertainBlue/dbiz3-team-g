# Screen Spec: BKG135 Booking Detail

| Field | Value |
|---|---|
| Screen ID | `BKG135` |
| Screen name | Booking Detail |
| Actor | Local Provider |
| Priority | Must |
| Belongs to module | `spec-BKG.md` |
| Mockup image | `img/BKG135.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Displays booking details, status, Experience, arrival schedule, and relevant collaboration information.

The controls and decisions below define the current screen specification.

## 2. Mockup

![BKG135](img/BKG135.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Booking Detail | Heading | Booking Detail | No | Static screen title |
| 2 | Booking, Agency and Experience details | Read-only panel | F-SCHED-07 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 3 | Time, group size and agreed conditions | Read-only panel | F-SCHED-07 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 4 | Canonical status and latest update | Read-only panel | F-SCHED-07 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 5 | Edit | Button / navigation | Provider owner permission | No | Enabled only when the linked permission/validation guard succeeds |
| 6 | Mark Group Arrival | Button / navigation | Booked only, current time>=start_at | No | Enabled only when the linked permission/validation guard succeeds |
| 7 | Chat | Button / navigation | Provider chat | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Edit | Select | Provider owner permission | BKG144 |
| 2 | Mark Group Arrival | Select | Booked only, current time>=start_at | BKG136 |
| 3 | Chat | Select | Provider chat | COM065 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| BKG | FR-007 | F-SCHED-07 | View Booking Detail |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the two-column layout (main content left, status/financial/emergency panels right) stacks to a single column with the right-hand panels moving below the main sections
- Text that must remain readable (contrast, minimum size): status stepper and "Modified"/"Updated" tags must remain distinguishable at small size and for color-blind users (not color alone)

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
