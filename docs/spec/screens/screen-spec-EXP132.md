# Screen Spec: EXP132 Delete Experience Confirmation

| Field | Value |
|---|---|
| Screen ID | `EXP132` |
| Screen name | Delete Experience Confirmation |
| Actor | Local Provider |
| Priority | Must |
| Belongs to module | `spec-PRF.md` |
| Mockup image | `img/EXP132.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Confirms delete/archive: active references block; historical references archive; no references permits hard delete.

The controls and decisions below define the current screen specification.

## 2. Mockup

![EXP132](img/EXP132.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Delete Experience Confirmation | Heading | Delete Experience Confirmation | No | Static screen title |
| 2 | Operation | System context (not editable) | `operation` — F-PROFILE-06 | Yes | operation (Enum[Create, Update, Delete]; Required) |
| 3 | Experience id | System context (not editable) | `experience_id` — F-PROFILE-06 | Conditional | experience_id ( ID; Required for Update/Delete; omitted for Create ) |
| 4 | Selected Experience | Read-only panel | F-PROFILE-06 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 5 | Delete blocked / Archive / Delete explanation | Read-only panel | F-PROFILE-06 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 6 | Confirm delete/archive | Button / navigation | Block if On hold/Booked; archive if Completed/Cancelled references; hard delete only with no booking references | No | Enabled only when the linked permission/validation guard succeeds |
| 7 | Cancel | Button / navigation | No mutation | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Confirm delete/archive | Select | Block if On hold/Booked; archive if Completed/Cancelled references; hard delete only with no booking references | EXP067 |
| 2 | Cancel | Select | No mutation | EXP068 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | Active booking blocks deletion. Historical booking references require archive. No references permits hard delete. The dialog label and result must match the applicable operation. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| PRF | FR-006 | F-PROFILE-06 | Manage Experiences, Pricing, Images & Booking Conditions |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the modal becomes full-screen (or near-full-width) rather than a centered dialog; footer buttons stack full-width.
- Text that must remain readable (contrast, minimum size): the warning text's left accent bar must remain visually distinct at all widths; "Confirm Delete" disabled state must be clearly distinguishable from its enabled state, not by color alone.

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
