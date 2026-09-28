# Screen Spec: REG115 OTP Verification Input

| Field | Value |
|---|---|
| Screen ID | `REG115` |
| Screen name | OTP Verification Input |
| Actor | Guest |
| Priority | Must |
| Belongs to module | `spec-AUT.md` |
| Mockup image | `img/REG115.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Agency enters the OTP sent to the email address provided during registration as part of the registration and verification process.

The controls and decisions below define the current screen specification.

## 2. Mockup

![REG115](img/REG115.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | OTP Verification Input | Heading | OTP Verification Input | No | Static screen title |
| 2 | Email | Input | `email` — F-AUTH-23 | Yes | email (Email; Required) |
| 3 | Otp code | Masked input | `otp_code` — F-AUTH-23 | Yes | otp_code (String, exactly 6 numeric digits; Required — valid for 10 minutes; maximum 5 verification attempts per OTP) |
| 4 | Registration request id | System context (not editable) | `registration_request_id` — created by F-AUTH-02 and consumed by F-AUTH-23 | Yes | registration_request_id (ID; Required; server-issued and tied to the existing registration request) |
| 5 | Verify email | Button / navigation | Verify server-issued OTP then F-AUTH-04 creates Pending Approval account | No | Enabled only when the linked permission/validation guard succeeds |
| 6 | Resend OTP | Button / navigation | Apply F-AUTH-23 resend/attempt limits | No | Enabled only when the linked permission/validation guard succeeds |
| 7 | Edit registration email | Button / navigation | Invalidate old OTP and restart validation | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Verify email | Select | Verify server-issued OTP then F-AUTH-04 creates Pending Approval account | REG116 |
| 2 | Resend OTP | Select | Apply F-AUTH-23 resend/attempt limits | REG115 |
| 3 | Edit registration email | Select | Invalidate old OTP and restart validation | REG003 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | Email OTP only. Changing registration email returns to REG003 and invalidates the prior challenge. Verification is server-derived; clients cannot assert email_verified. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| AUT | FR-023 | F-AUTH-23 | Verify Registration Email OTP |

## 8. Responsive and accessibility notes

- Smallest supported width: 768px (consistent with REG003's dense layout)
- What collapses or stacks on a narrow screen: the 6-digit boxes may shrink or wrap to two rows of 3; step tracker cards stack vertically
- Text that must remain readable (contrast, minimum size): countdown timer ≥14px and high-contrast so users notice urgency

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
