# Screen Spec: REG116 Registration Status

| Field | Value |
|---|---|
| Screen ID | `REG116` |
| Screen name | Registration Status |
| Actor | Guest |
| Priority | Must |
| Belongs to module | `spec-AUT.md` |
| Mockup image | `img/REG116.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Displays the Agency registration status, Pending Approval after verified registration; subsequent review uses Approved/Rejected, without conflating Provider verification.

The controls and decisions below define the current screen specification.

## 2. Mockup

![REG116](img/REG116.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Registration Status | Heading | Registration Status | No | Static screen title |
| 2 | Registration submitted — Pending Approval | Read-only panel | F-AUTH-04 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 3 | Requested changes and review comment | Read-only panel | F-AUTH-18 — when HDT selected Request More Information | Conditional | Shows the latest requested changes without exposing internal review data. |
| 4 | Edit and resubmit registration | Button / secure-link action | F-AUTH-26 | Conditional | Visible only when the latest review decision is Request More Information and the single-use edit link is valid. |
| 5 | Sign in | Button / navigation | Account remains Pending Approval until HDT approves | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Edit and resubmit registration | Select | Open the existing registration form with a single-use edit token valid for 24 hours | REG003 |
| 2 | Sign in | Select | Account remains Pending Approval until HDT approves | AUT009 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | The account is created only after validated registration and successful F-AUTH-23, with Pending Approval. | Function List and shared consistency contract |
| SR-004 | Request More Information keeps the account Pending Approval. The Guest may edit and resubmit through F-AUTH-26 using a single-use token valid for 24 hours; a replacement token or successful resubmission invalidates older active tokens. Each submission version and review decision is retained. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| AUT | FR-004 | F-AUTH-04 | Create Agency Account and Save to System |
| AUT | FR-026 | F-AUTH-26 | Revise and Resubmit Agency Registration |

## 8. Responsive and accessibility notes

- Smallest supported width: 768px
- What collapses or stacks on a narrow screen: the two-column layout (main status panel / sidebar metadata) stacks to a single column; the related information cards stack vertically
- Text that must remain readable (contrast, minimum size): status badges ≥12px with sufficient contrast, heading ≥28px

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
