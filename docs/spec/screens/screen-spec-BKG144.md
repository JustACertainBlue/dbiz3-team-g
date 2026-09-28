# Screen Spec: BKG144 Edit Booking Detail

| Field | Value |
|---|---|
| Screen ID | `BKG144` |
| Screen name | Edit Booking Detail |
| Actor | Local Provider |
| Priority | Must |
| Belongs to module | `spec-BKG.md` |
| Mockup image | `img/BKG144.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Allows authorized users to update booking details and status. Status uses permitted On hold/Booked/Cancelled transitions; Completed is reached only through F-SCHED-06.

The controls and decisions below define the current screen specification.

## 2. Mockup

![BKG144](img/BKG144.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Edit Booking Detail | Heading | Edit Booking Detail | No | Static screen title |
| 2 | Booking id | System context (not editable) | `booking_id` — F-SCHED-04 | Yes | booking_id (ID; Required) |
| 3 | Start at | Input | `start_at` — F-SCHED-04 | No | start_at (DateTime; Optional — changing date/time does NOT reset hold_expires_at; an On hold Booking retains its original 72-hour expiry) |
| 4 | Duration | Input | `duration` — F-SCHED-04 | No | duration (see F-PROFILE-06; Optional) |
| 5 | Group size | Input | `group_size` — F-SCHED-04 | No | group_size (Integer > 0; Optional) |
| 6 | Agreed price | Input | `agreed_price` — F-SCHED-04 | No | agreed_price (Decimal; Optional) |
| 7 | Booking conditions | Structured input | `booking_conditions` — F-SCHED-04 | No | booking_conditions (Object; Optional) (at least one field must be provided) |
| 8 | Target status | Select | `target_status` — F-SCHED-05 | Yes | target_status (Enum[Booked, Cancelled]; Required) |
| 9 | Cancellation reason | Input | `cancellation_reason` — F-SCHED-05 | Conditional | cancellation_reason (Text; Required when target_status = Cancelled; otherwise omitted) |
| 10 | Current booking and original hold expiry | Read-only panel | F-SCHED-04, F-SCHED-05 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 11 | Save | Button / navigation | Update fields or transition to Booked/Cancelled; Completed is not a dropdown option | No | Enabled only when the linked permission/validation guard succeeds |
| 12 | Discard | Button / navigation | No mutation | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Save | Select | Update fields or transition to Booked/Cancelled; Completed is not a dropdown option | BKG135 |
| 2 | Discard | Select | No mutation | BKG135 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | Completed is not a target_status option; completion uses F-SCHED-06. Date/time edits do not reset hold_expires_at. Organization ownership governs permission; no undefined Director/creator-only hierarchy. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| BKG | FR-004 | F-SCHED-04 | Update Booking Details |
| BKG | FR-005 | F-SCHED-05 | Confirm/Manage Booking Status |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the two-column layout (form left, status/financial/emergency panels right) stacks to a single column; the assistant-artisan chip list wraps
- Text that must remain readable (contrast, minimum size): "Modified"/"Assigned" tags and the status stepper must remain distinguishable at small size and not rely on color alone

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
