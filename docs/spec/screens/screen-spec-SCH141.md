# Screen Spec: SCH141 Agency Schedule

| Field | Value |
|---|---|
| Screen ID | `SCH141` |
| Screen name | Agency Schedule |
| Actor | Tour Agency |
| Priority | Must |
| Belongs to module | `spec-BKG.md` |
| Mockup image | `img/SCH141.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Private Agency schedule showing the Agency's own bookings and collaboration details. It is synchronized after every booking event, including new On hold creation.

The controls and decisions below define the current screen specification.

## 2. Mockup

![SCH141](img/SCH141.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Agency Schedule | Heading | Agency Schedule | No | Static screen title |
| 2 | Own booking calendar with all canonical statuses | Read-only panel | F-SCHED-02, F-SCHED-07 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 3 | Date/status filters and latest update | Read-only panel | F-SCHED-02, F-SCHED-07 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 4 | View booking | Button / navigation | Own booking, read-only | No | Enabled only when the linked permission/validation guard succeeds |
| 5 | Chat | Button / navigation | Agency chat | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | View booking | Select | Own booking, read-only | BKG138 |
| 2 | Chat | Select | Agency chat | COM048 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | Show own On hold, Booked, Completed and Cancelled bookings with filters. A new On hold booking synchronizes immediately. Agency is read-only. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| BKG | FR-002 | F-SCHED-02 | Display Private Schedule |
| BKG | FR-007 | F-SCHED-07 | View Booking Detail |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the month calendar grid and the right-hand detail panel stack vertically; the roster table becomes horizontally scrollable or collapses to stacked cards
- Text that must remain readable (contrast, minimum size): day-cell delegation chips must remain legible at small size; status badges must not rely on color alone

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
