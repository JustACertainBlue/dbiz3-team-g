# Screen Spec: SCH139 Provider Schedule

| Field | Value |
|---|---|
| Screen ID | `SCH139` |
| Screen name | Provider Schedule |
| Actor | Local Provider |
| Priority | Must |
| Belongs to module | `spec-BKG.md` |
| Mockup image | `img/SCH139.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Local Provider's schedule showing booked/on-hold time slots for availability management. Other Agencies' identities and booking details are not exposed.

The controls and decisions below define the current screen specification.

## 2. Mockup

![SCH139](img/SCH139.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Provider Schedule | Heading | Provider Schedule | No | Static screen title |
| 2 | Operating-window calendar with own On hold / Booked blocks | Read-only panel | F-SCHED-01, F-SCHED-05, F-SCHED-06, F-SCHED-07, F-SCHED-09 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 3 | Selected booking and permitted quick actions | Read-only panel | F-SCHED-01, F-SCHED-05, F-SCHED-06, F-SCHED-07, F-SCHED-09 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 4 | Create booking | Button / navigation | Always On hold | No | Enabled only when the linked permission/validation guard succeeds |
| 5 | View block | Button / navigation | Own booking detail | No | Enabled only when the linked permission/validation guard succeeds |
| 6 | Mark arrival | Button / navigation | F-SCHED-06 guard | No | Enabled only when the linked permission/validation guard succeeds |
| 7 | Confirm / Cancel | Button / navigation | F-SCHED-05 guard; same permissions as detail | No | Enabled only when the linked permission/validation guard succeeds |
| 8 | Operating hours | Button / navigation | No manual availability editor | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Create booking | Select | Always On hold | BKG134 |
| 2 | View block | Select | Own booking detail | BKG135 |
| 3 | Mark arrival | Select | F-SCHED-06 guard | BKG136 |
| 4 | Confirm / Cancel | Select | F-SCHED-05 guard; same permissions as detail | stay |
| 5 | Operating hours | Select | No manual availability editor | PRF128 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | No manual availability/blackout editor. Confirm/Cancel shortcuts use F-SCHED-05; arrival uses F-SCHED-06. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| BKG | FR-001 | F-SCHED-01 | Display Public Schedule |
| BKG | FR-005 | F-SCHED-05 | Confirm/Manage Booking Status |
| BKG | FR-006 | F-SCHED-06 | Mark Group Arrival |
| BKG | FR-007 | F-SCHED-07 | View Booking Detail |
| BKG | FR-009 | F-SCHED-09 | Calculate Provider Availability |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the month calendar grid and the right-hand detail panel stack vertically; the roster table becomes horizontally scrollable or collapses to stacked cards
- Text that must remain readable (contrast, minimum size): day-cell booking chips must remain legible at small size; status badges (Booked, On hold, Completed, Cancelled) must not rely on color alone

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
