# Screen Spec: ACC129 My Account

| Field | Value |
|---|---|
| Screen ID | `ACC129` |
| Screen name | My Account |
| Actor | All Authenticated Users |
| Priority | Must |
| Belongs to module | `spec-AUT.md` |
| Mockup image | `img/ACC129.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Displays the current user's personal account information, role, and associated business/Village. The avatar menu provides My Account, My Business where applicable, and Logout.

The controls and decisions below define the current screen specification.

## 2. Mockup

![ACC129](img/ACC129.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | My Account | Heading | My Account | No | Static screen title |
| 2 | Current password | Masked input | `current_password` — F-AUTH-14 | Yes | current_password (String, masked; Required) |
| 3 | New password | Masked input | `new_password` — F-AUTH-14 | Yes | new_password (String, masked, 8–64 characters; Required — must contain at least 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character; whitespace not allowed) |
| 4 | Confirm new password | Masked input | `confirm_new_password` — F-AUTH-14 | Yes | confirm_new_password (String, masked; Required — must exactly match new_password) |
| 5 | Personal information | Read-only panel | F-AUTH-24, F-AUTH-13, F-AUTH-14 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 6 | Assigned role and management scope | Read-only panel | F-AUTH-24, F-AUTH-13, F-AUTH-14 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 7 | Linked business — read-only | Read-only panel | F-AUTH-24, F-AUTH-13, F-AUTH-14 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 8 | Edit personal account | Button / navigation | Only own account | No | Enabled only when the linked permission/validation guard succeeds |
| 9 | Change Password | Button / navigation | Open authenticated F-AUTH-13/14 panel; mandatory when must_change_password | No | Enabled only when the linked permission/validation guard succeeds |
| 10 | My Business | Button / navigation | Agency/Provider only | No | Enabled only when the linked permission/validation guard succeeds |
| 11 | Log out | Button / navigation | Open confirmation | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Edit personal account | Select | Only own account | ACC130 |
| 2 | Change Password | Select | Open authenticated F-AUTH-13/14 panel; mandatory when must_change_password | stay |
| 3 | My Business | Select | Agency/Provider only | PRF019 / PRF127 |
| 4 | Log out | Select | Open confirmation | AUT026 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | Change Password panel collects current_password/new_password/confirm_new_password. It is required before normal navigation when must_change_password=true. Role/admin_type and business content are read-only. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| AUT | FR-024 | F-AUTH-24 | View My Account |
| AUT | FR-013 | F-AUTH-13 | Display change password form |
| AUT | FR-014 | F-AUTH-14 | Validate new password & update |

## 8. Responsive and accessibility notes

- Smallest supported width: 1024px (desktop-first B2B portal)
- What collapses or stacks on a narrow screen: Section 01's avatar column stacks above the field list instead of beside it
- Text that must remain readable (contrast, minimum size): verification badge text, role/scope note, license and registry numbers

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
