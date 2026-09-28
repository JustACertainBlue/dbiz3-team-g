# Screen Spec: ADM095 User Management

| Field | Value |
|---|---|
| Screen ID | `ADM095` |
| Screen name | User Management |
| Actor | Admin (HDT / UBND) |
| Priority | Must |
| Belongs to module | `spec-AUT.md` |
| Mockup image | `img/ADM095.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Manages user accounts, including account creation, enable/disable, viewing, and credential reset within the Admin's data scope.

The controls and decisions below define the current screen specification.

## 2. Mockup

![ADM095](img/ADM095.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | User Management | Heading | User Management | No | Static screen title |
| 2 | Account list: Name, Email, Organization, Role, Status, Last login | Read-only panel | F-AUTH-21, F-AUTH-22 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 3 | Organization / role / status / date filters | Read-only panel | F-AUTH-21, F-AUTH-22 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 4 | Available account actions | Read-only panel | F-AUTH-21, F-AUTH-22 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 5 | Create account | Button / navigation | HDT creates UBND; UBND creates Provider | No | Enabled only when the linked permission/validation guard succeeds |
| 6 | View account | Button / navigation | Read-only | No | Enabled only when the linked permission/validation guard succeeds |
| 7 | Review submission | Button / navigation | Subtype and village checks | No | Enabled only when the linked permission/validation guard succeeds |
| 8 | Manage access | Button / navigation | Disable/enable/reset password within scope | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Create account | Select | HDT creates UBND; UBND creates Provider | ADM117 |
| 2 | View account | Select | Read-only | ADM145 |
| 3 | Review submission | Select | Subtype and village checks | VER146 |
| 4 | Manage access | Select | Disable/enable/reset password within scope | ADM118 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| AUT | FR-021 | F-AUTH-21 | View & manage user accounts (list, filter, actions) |
| AUT | FR-022 | F-AUTH-22 | Update account status (disable/enable/reset password) |

## 8. Responsive and accessibility notes

- Smallest supported width: 1024px (desktop-first admin tool; mobile is not the primary use case)
- What collapses or stacks on a narrow screen: the sidebar collapses to an icon-only rail; the two data tables scroll horizontally *(a stacked/card layout as an alternative is not yet confirmed)*
- Text that must remain readable (contrast, minimum size): table text ≥13px; status/role badges and the Enabled toggle state must remain distinguishable at minimum size and meet standard contrast guidance, not by color alone — *specific contrast values TBD*

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
