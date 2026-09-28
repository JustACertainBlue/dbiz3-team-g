# Screen Spec: EXP067 Experience Management

| Field | Value |
|---|---|
| Screen ID | `EXP067` |
| Screen name | Experience Management |
| Actor | Local Provider |
| Priority | Must |
| Belongs to module | `spec-PRF.md` |
| Mockup image | `img/EXP067.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Lists the Experiences belonging to the current Local Provider and supports viewing, creating, updating and deleting/archiving Experiences; no Draft/Publish/Listed lifecycle.

The controls and decisions below define the current screen specification.

## 2. Mockup

![EXP067](img/EXP067.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Experience Management | Heading | Experience Management | No | Static screen title |
| 2 | Own Experience list: Title, Category, Capacity, Duration, Price | Read-only panel | F-PROFILE-03, F-PROFILE-06 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 3 | Booking reference / archive indication | Read-only panel | F-PROFILE-03, F-PROFILE-06 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 4 | Add Experience | Button / navigation | Create | No | Enabled only when the linked permission/validation guard succeeds |
| 5 | View | Button / navigation | Own record | No | Enabled only when the linked permission/validation guard succeeds |
| 6 | Edit | Button / navigation | Own record | No | Enabled only when the linked permission/validation guard succeeds |
| 7 | Delete/archive | Button / navigation | Apply active/history reference guard | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Add Experience | Select | Create | EXP069 |
| 2 | View | Select | Own record | EXP068 |
| 3 | Edit | Select | Own record | EXP070 |
| 4 | Delete/archive | Select | Apply active/history reference guard | EXP132 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | Only Create/Update/Delete/archive as F-PROFILE-06; no persisted Draft/Published/Listed state or toggle. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| PRF | FR-003 | F-PROFILE-03 | Display Local Provider Profile |
| PRF | FR-006 | F-PROFILE-06 | Manage Experiences, Pricing, Images & Booking Conditions |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the 4 stat cards stack 2x2 then 1-per-row; the table becomes a stacked card list (one Experience per card) with the same action icons.
- Text that must remain readable (contrast, minimum size): Experience ownership and archive/status labels need a contrast-safe color pair and must not rely on color alone — label text is always present.

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
