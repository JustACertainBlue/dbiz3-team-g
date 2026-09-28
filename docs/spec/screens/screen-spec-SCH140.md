# Screen Spec: SCH140 Provider Schedule – Agency View

| Field | Value |
|---|---|
| Screen ID | `SCH140` |
| Screen name | Provider Schedule – Agency View |
| Actor | Tour Agency |
| Priority | Must |
| Belongs to module | `spec-BKG.md` / `spec-EXP.md` |
| Mockup image | `img/SCH140.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Logged-in Agency views a Local Provider's public schedule. Calculated operating windows and anonymous Booked/On hold occupancy are shown; other Agencies and their booking details remain hidden.

The controls and decisions below define the current screen specification.

## 2. Mockup

![SCH140](img/SCH140.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Provider Schedule – Agency View | Heading | Provider Schedule – Agency View | No | Static screen title |
| 2 | Calculated available windows | Read-only panel | F-SCHED-01, F-SCHED-09, F-EXPLORE-11 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 3 | Anonymous On hold / Booked occupancy | Read-only panel | F-SCHED-01, F-SCHED-09, F-EXPLORE-11 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 4 | Optional quote context: Experience, date and group | Read-only panel | F-SCHED-01, F-SCHED-09, F-EXPLORE-11 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 5 | Select day | Button / navigation | Read calculated availability, mask other Agency identities | No | Enabled only when the linked permission/validation guard succeeds |
| 6 | Request Quote | Button / navigation | Optional dates/pax; once per Agency–Experience; no separate mandatory form | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Select day | Select | Read calculated availability, mask other Agency identities | stay |
| 2 | Request Quote | Select | Optional dates/pax; once per Agency–Experience; no separate mandatory form | COM048 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | Available periods require configured operating hours; zero bookings does not mean fully available. Only anonymous On hold/Booked occupancy is public in this authenticated schedule. | Function List and shared consistency contract |
| SR-004 | Quote group/date/window are optional context, not an extra mandatory form. Duplicate request guard uses Agency–Experience, not target date. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| BKG | FR-001 | F-SCHED-01 | Display Public Schedule |
| BKG | FR-009 | F-SCHED-09 | Calculate Provider Availability |
| EXP | FR-011 | F-EXPLORE-11 | Request Quote from Experience Card/Detail |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the calendar grid and the right-hand panels (selected date, request quote, cooperative profile) stack vertically; the Preferred Operating Window button group wraps or becomes a dropdown
- Text that must remain readable (contrast, minimum size): Booked vs. On Hold chip styling must remain distinguishable at small size and not rely on color alone (dashed vs. filled, per the legend)

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
