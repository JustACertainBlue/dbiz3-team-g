# Screen Spec: ADM118 Account Information & Access Actions

| Field | Value |
|---|---|
| Screen ID | `ADM118` |
| Screen name | Account Information & Access Actions |
| Actor | Admin (HDT / UBND) |
| Priority | Must |
| Belongs to module | `spec-AUT.md` |
| Mockup image | `img/ADM118.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Shows permitted disable/enable/reset-password actions plus system-level account information such as account ID, role, status, registration date, and last login.

The controls and decisions below define the current screen specification.

## 2. Mockup

![ADM118](img/ADM118.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Account Information & Access Actions | Heading | Account Information & Access Actions | No | Static screen title |
| 2 | User id | System context (not editable) | `user_id` — F-AUTH-22 | Yes | user_id (ID; Required) |
| 3 | Action type | Select | `action_type` — F-AUTH-22 | Yes | action_type (Enum[disable, enable, reset_password]; Required) |
| 4 | Reason | Input | `reason` — F-AUTH-22 | No | reason (Text; Optional — for disable) |
| 5 | Admin role | Select | `admin_role` — F-AUTH-22 | Yes | admin_role (Enum[ADMIN]; Required — from session) |
| 6 | Admin type | System context (not editable) | `admin_type` — F-AUTH-22 | Yes | admin_type (Enum[HDT, UBND]; Required — from session) |
| 7 | Selected account identity and current status | Read-only panel | F-AUTH-22 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 8 | Save account action | Button / navigation | Disable/enable/reset password only; no profile editing | No | Enabled only when the linked permission/validation guard succeeds |
| 9 | Cancel | Button / navigation | No mutation | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Save account action | Select | Disable/enable/reset password only; no profile editing | ADM095 |
| 2 | Cancel | Select | No mutation | ADM095 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | Only disable/enable/reset_password actions, restricted by subtype and resource scope. Disable immediately invalidates active sessions. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| AUT | FR-022 | F-AUTH-22 | Update account status (disable/enable/reset password) |

## 8. Responsive and accessibility notes

- Smallest supported width: 1024px (admin tool)
- What collapses or stacks on a narrow screen: modal becomes full-screen sheet; info rows remain single column
- Text that must remain readable (contrast, minimum size): label text ≥12px, value text ≥14px

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
