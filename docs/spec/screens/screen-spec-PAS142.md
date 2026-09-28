# Screen Spec: PAS142 Set New Password

| Field | Value |
|---|---|
| Screen ID | `PAS142` |
| Screen name | Set New Password |
| Actor | All Actors |
| Priority | Must |
| Belongs to module | `spec-AUT.md` |
| Mockup image | `img/PAS142.png` |
| Status | Revised — pending human approval |

## 1. Purpose

User clicks reset link from email and lands here. Form includes: New Password field (with complexity requirements visible), Confirm Password field, "Update Password" button, "Back to Login" link. Validates: Password complexity, passwords match.

The controls and decisions below define the current screen specification.

## 2. Mockup

![PAS142](img/PAS142.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Set New Password | Heading | Set New Password | No | Static screen title |
| 2 | Recovery token | System context (not editable) | `recovery_token` — F-AUTH-12 | Yes | recovery_token (String; Required) |
| 3 | New password | Masked input | `new_password` — F-AUTH-12 | Yes | new_password (String, masked, 8–64 characters; Required — must contain at least 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character; whitespace not allowed) |
| 4 | Confirm password | Masked input | `confirm_password` — F-AUTH-12 | Yes | confirm_password (String, masked; Required — must exactly match new_password) |
| 5 | Reset password | Button / navigation | Validate unexpired unused token and password; invalid token causes no mutation | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Reset password | Select | Validate unexpired unused token and password; invalid token causes no mutation | PAS143 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | Expired, invalid or consumed token prevents update. Successful reset consumes the token. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| AUT | FR-012 | F-AUTH-12 | Verify token, validate new password & update |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: dark branding panel stacks above the form
- Text that must remain readable (contrast, minimum size): helper text ≥12px, input text ≥14px

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
