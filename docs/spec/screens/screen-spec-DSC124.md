# Screen Spec: DSC124 Public Experience Detail

| Field | Value |
|---|---|
| Screen ID | `DSC124` |
| Screen name | Public Experience Detail |
| Actor | Guest |
| Priority | Must |
| Belongs to module | `spec-EXP.md` |
| Mockup image | `img/DSC124.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Guest views basic public Experience information. Restricted information and actions require Login.

The controls and decisions below define the current screen specification.

## 2. Mockup

![DSC124](img/DSC124.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Public Experience Detail | Heading | Public Experience Detail | No | Static screen title |
| 2 | Public Experience description and gallery | Read-only panel | F-EXPLORE-03 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 3 | Public capacity and availability summary | Read-only panel | F-EXPLORE-03 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 4 | Related Experiences | Read-only panel | F-EXPLORE-03 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 5 | Provider | Button / navigation | Public profile | No | Enabled only when the linked permission/validation guard succeeds |
| 6 | Login | Button / navigation | Restricted actions require login | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Provider | Select | Public profile | DSC123 |
| 2 | Login | Select | Restricted actions require login | AUT009 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | Guest may see public participant capacity and public availability summary; no quote/chat action without authentication. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| EXP | FR-003 | F-EXPLORE-03 | Display Full Experience & Provider Profile |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the two-column layout (content + sidebar) stacks to a single column, sidebar cards moving below the Curatorial Overview; the 4-card Highlights grid stacks to 1 column
- Text that must remain readable: the "Locked — Agency contract tier" microcopy inside the Pricing & Access card must remain legible against its light background

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
