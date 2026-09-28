# Screen Spec: PAS014 Check Your Email

| Field | Value |
|---|---|
| Screen ID | `PAS014` |
| Screen name | Check Your Email |
| Actor | All Actors |
| Priority | Must |
| Belongs to module | `spec-AUT.md` |
| Mockup image | `img/PAS014.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Confirmation screen after email submission. Message: "We've sent a password reset link to your email. Please check your inbox and follow the link within 15 minutes. Didn't receive it? Check spam or request a new link." Includes: "Resend Link" button, "Back to Login" link.

The controls and decisions below define the current screen specification.

## 2. Mockup

![PAS014](img/PAS014.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Check Your Email | Heading | Check Your Email | No | Static screen title |
| 2 | If an account exists, a reset link has been sent | Read-only panel | F-AUTH-11 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 3 | Back to login | Button / navigation | No demo Continue-to-reset action | No | Enabled only when the linked permission/validation guard succeeds |
| 4 | Resend | Button / navigation | Apply same rate limit; reset page is reached only from valid email token link | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Back to login | Select | No demo Continue-to-reset action | AUT009 |
| 2 | Resend | Select | Apply same rate limit; reset page is reached only from valid email token link | PAS011 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | This confirmation is not authorization to reset. PAS142 is reachable from the email token link, not a demo button. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| AUT | FR-011 | F-AUTH-11 | Validate email, generate token & send recovery email |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: dark branding panel stacks above the content
- Text that must remain readable (contrast, minimum size): info box text ≥13px, sufficient contrast on light gray background

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
