# Screen Spec: DSH018 Local Provider Dashboard

| Field | Value |
|---|---|
| Screen ID | `DSH018` |
| Screen name | Local Provider Dashboard |
| Actor | Local Provider |
| Priority | Must |
| Belongs to module | `spec-PRF.md` / `spec-BKG.md` / `spec-IAC.md` |
| Mockup image | `img/DSH018.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Main entry point after Local Provider login, providing an overview of Experiences, bookings, schedule, conversations, and pending actions.

The controls and decisions below define the current screen specification.

## 2. Mockup

![DSH018](img/DSH018.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Local Provider Dashboard | Heading | Local Provider Dashboard | No | Static screen title |
| 2 | Profile completion and review status | Read-only panel | F-PROFILE-03, F-SCHED-01, F-SCHED-10, F-CHAT-03 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 3 | Own booking action summary | Read-only panel | F-PROFILE-03, F-SCHED-01, F-SCHED-10, F-CHAT-03 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 4 | Own schedule summary | Read-only panel | F-PROFILE-03, F-SCHED-01, F-SCHED-10, F-CHAT-03 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 5 | Recent conversations | Read-only panel | F-PROFILE-03, F-SCHED-01, F-SCHED-10, F-CHAT-03 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 6 | Complete/edit profile | Button / navigation | Incomplete-profile action | No | Enabled only when the linked permission/validation guard succeeds |
| 7 | Experiences | Button / navigation | Own | No | Enabled only when the linked permission/validation guard succeeds |
| 8 | Bookings | Button / navigation | Own | No | Enabled only when the linked permission/validation guard succeeds |
| 9 | Schedule | Button / navigation | Own | No | Enabled only when the linked permission/validation guard succeeds |
| 10 | Messages | Button / navigation | Provider chat | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Complete/edit profile | Select | Incomplete-profile action | PRF128 |
| 2 | Experiences | Select | Own | EXP067 |
| 3 | Bookings | Select | Own | BKG133 |
| 4 | Schedule | Select | Own | SCH139 |
| 5 | Messages | Select | Provider chat | COM065 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| PRF | FR-003 | F-PROFILE-03 | Display Local Provider Profile |
| BKG | FR-001 | F-SCHED-01 | Display Public Schedule |
| BKG | FR-010 | F-SCHED-10 | List Provider Bookings |
| IAC | FR-003 | F-CHAT-03 | View Chat List & Message History |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the 3 stat cards stack to a single column; the "Today's Schedule" / "Platform Capacity & SLA" two-column layout stacks; the quote table becomes horizontally scrollable within its own container.
- Text that must remain readable (contrast, minimum size): status badges ("Completed," "Waiting for Arrival," "Needs Quote," "Booked") must be distinguishable by more than color alone (icon + label, as shown).

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
