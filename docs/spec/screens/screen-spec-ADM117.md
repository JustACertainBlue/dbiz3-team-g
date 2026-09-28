# Screen Spec: ADM117 Create Account

| Field | Value |
|---|---|
| Screen ID | `ADM117` |
| Screen name | Create Account |
| Actor | Admin (HDT / UBND) |
| Priority | Must |
| Belongs to module | `spec-AUT.md` |
| Mockup image | `img/ADM117.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Admins can create accounts within their permission scope. HDT creates Admin subtype UBND; only UBND creates Local Provider accounts, within its one assigned village. Responsibilities and data access follow the associated actor and administrative scope.

The controls and decisions below define the current screen specification.

## 2. Mockup

![ADM117](img/ADM117.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Create Account | Heading | Create Account | No | Static screen title |
| 2 | Name | Input | `name` — F-AUTH-19 | Yes | name (String; Required) |
| 3 | Email | Input | `email` — F-AUTH-19 | Yes | email (Email; Required) |
| 4 | Phone | Input | `phone` — F-AUTH-19 | Yes | phone (String; Required — 10–15 digits with optional leading +) |
| 5 | Assigned village id | Input | `assigned_village_id` — F-AUTH-19 | Yes | assigned_village_id (ID; Required) |
| 6 | Role | System context (not editable) | `role` — F-AUTH-19 | Yes | role (Enum[ADMIN]; Required — system-assigned) |
| 7 | Admin type | System context (not editable) | `admin_type` — F-AUTH-19 | Yes | admin_type (Enum[UBND]; Required — system-assigned) |
| 8 | Provider name | Input | `provider_name` — F-AUTH-20 | Yes | provider_name (String; Required) |
| 9 | Address | Input | `address` — F-AUTH-20 | Yes | address (String; Required) |
| 10 | Contact | Structured input | `contact` — F-AUTH-20 | Yes | contact (Object{ contact_person_name: String, phone_number: String }; Required) |
| 11 | Village id | Input | `village_id` — F-AUTH-20 | Yes | village_id (ID; Required — taken from the UBND assignment, not entered manually) |
| 12 | Create | Button / navigation | Create Active account; send temporary credentials email; failure shown separately from account result | No | Enabled only when the linked permission/validation guard succeeds |
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
| 1 | Create | Select | Create Active account; send temporary credentials email; failure shown separately from account result | ADM095 |
| 2 | Cancel | Select | No mutation | ADM095 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | HDT creates UBND with assigned village; UBND creates Provider in its assigned village. Role permissions are fixed by the shared matrix, not free-form checkboxes. Temporary credentials are emailed. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| AUT | FR-019 | F-AUTH-19 | HDT create UBND account |
| AUT | FR-020 | F-AUTH-20 | UBND create account for Local Provider |

## 8. Responsive and accessibility notes

- Smallest supported width: 1024px (admin tool, modal assumes desktop viewport)
- What collapses or stacks on a narrow screen: two-column permission rows stack to single column; modal becomes full-screen sheet
- Text that must remain readable (contrast, minimum size): form labels ≥12px uppercase, input text ≥14px

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
