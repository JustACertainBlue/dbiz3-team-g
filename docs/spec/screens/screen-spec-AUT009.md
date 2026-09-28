# Screen Spec: AUT009 Login

| Field | Value |
|---|---|
| Screen ID | `AUT009` |
| Screen name | Login |
| Actor | All Actors |
| Priority | Must |
| Belongs to module | `spec-AUT.md` |
| Mockup image | `img/AUT009.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Shared login screen for Tour Agency, Local Provider, UBND, and HDT. Guests are redirected here when attempting a restricted action.

The controls and decisions below define the current screen specification.

## 2. Mockup

![AUT009](img/AUT009.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Login | Heading | Login | No | Static screen title |
| 2 | Email | Input | `email` — F-AUTH-06 | Yes | email (Email; Required) |
| 3 | Password | Masked input | `password` — F-AUTH-06 | Yes | password (String, masked; Required) |
| 4 | Login | Button / navigation | Use F-AUTH-08 routing and must_change_password guard | No | Enabled only when the linked permission/validation guard succeeds |
| 5 | Forgot password | Button / navigation | Open token-link recovery | No | Enabled only when the linked permission/validation guard succeeds |
| 6 | Register | Button / navigation | Open Agency registration | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Login | Select | Use F-AUTH-08 routing and must_change_password guard | ACC129 / ADM079 / EXP017 / DSH018 |
| 2 | Forgot password | Select | Open token-link recovery | PAS011 |
| 3 | Register | Select | Open Agency registration | REG003 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | Wrong credentials, Pending Approval, Rejected or Disabled return a defined error and create no session. ADMIN carries admin_type=HDT/UBND. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| AUT | FR-005 | F-AUTH-05 | Display login interface |
| AUT | FR-006 | F-AUTH-06 | Capture and verify credentials |
| AUT | FR-007 | F-AUTH-07 | Authenticate, check account status & load role |
| AUT | FR-008 | F-AUTH-08 | Route to role-specific landing |
| AUT | FR-015 | F-AUTH-15 | Initialize user role & permissions on login |
| AUT | FR-017 | F-AUTH-17 | Verify account status & role consistency |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the dark left branding panel stacks above the form instead of sitting beside it
- Text that must remain readable (contrast, minimum size): form labels ≥12px uppercase, white-on-dark branding text maintains 4.5:1 contrast

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
