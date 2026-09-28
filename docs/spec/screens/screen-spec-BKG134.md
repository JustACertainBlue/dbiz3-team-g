# Screen Spec: BKG134 Create Booking

| Field | Value |
|---|---|
| Screen ID | `BKG134` |
| Screen name | Create Booking |
| Actor | Local Provider |
| Priority | Must |
| Belongs to module | `spec-BKG.md` |
| Mockup image | `img/BKG134.png` |
| Status | Revised — pending human approval |

## 1. Purpose

After the Agency and Local Provider agree through Chat, the Local Provider creates a booking containing the Experience, date/time, group information, capacity, and agreed conditions.

The controls and decisions below define the current screen specification.

## 2. Mockup

![BKG134](img/BKG134.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Create Booking | Heading | Create Booking | No | Static screen title |
| 2 | Experience id | Input | `experience_id` — F-SCHED-03 | Yes | experience_id (ID; Required) |
| 3 | Agency id | Input | `agency_id` — F-SCHED-03 | Yes | agency_id (ID; Required) |
| 4 | Start at | Input | `start_at` — F-SCHED-03 | Yes | start_at (DateTime; Required) |
| 5 | Duration | Input | `duration` — F-SCHED-03 | Yes | duration (see F-PROFILE-06; Required) |
| 6 | Group size | Input | `group_size` — F-SCHED-03 | Yes | group_size (Integer > 0; Required — must be <= Experience max_participants) |
| 7 | Agreed price | Input | `agreed_price` — F-SCHED-03 | Yes | agreed_price (Decimal > 0, VND; Required — total agreed price for the Booking, not per-person price) |
| 8 | Booking conditions | Structured input | `booking_conditions` — F-SCHED-03 | Yes | booking_conditions (Object{notice_period, cancellation_policy}; Required — prefilled as a snapshot from the Experience and may be adjusted by the Local Provider before Booking creation) |
| 9 | Source chat session id | System context (not editable) | `source_chat_session_id` — F-SCHED-03 | No | source_chat_session_id (ID; Optional — for pre-fill) |
| 10 | Selected Experience and capacity | Read-only panel | F-SCHED-03 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 11 | Suggested rate × pax — agreed total remains editable | Read-only panel | F-SCHED-03 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 12 | Create On hold | Button / navigation | Atomic availability check and create; hold_expires_at=created_at+72h; sync Agency | No | Enabled only when the linked permission/validation guard succeeds |
| 13 | Cancel | Button / navigation | No mutation | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Create On hold | Select | Atomic availability check and create; hold_expires_at=created_at+72h; sync Agency | BKG135 |
| 2 | Cancel | Select | No mutation | BKG133 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | Agency selector resolves a registered Agency ID; contact email alone is not identity. Prefill from authorized chat context is allowed, then Provider confirms details. | Function List and shared consistency contract |
| SR-004 | agreed_price is editable total VND; rate×pax is a suggestion, not the mandatory negotiated total. Create always On hold with original 72h expiry; atomic conflict check before commit. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| BKG | FR-003 | F-SCHED-03 | Create Booking |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the two-column layout (form left, Financial Breakdown + Provider Contact right) stacks to a single column with the financial summary moving below the form sections
- Text that must remain readable (contrast, minimum size): the large Total Payable figure and struck-through discount value must remain legible and unambiguous at small sizes

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
