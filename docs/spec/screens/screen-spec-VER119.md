# Screen Spec: VER119 Account Information

| Field | Value |
|---|---|
| Screen ID | `VER119` |
| Screen name | Account Information |
| Actor | Admin (HDT / UBND) |
| Priority | Must |
| Belongs to module | `spec-AUT.md` / `spec-PRF.md` |
| Mockup image | `img/VER119.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Displays system-level account information such as account ID, role, status, registration date, and last login for verification reference.

The controls and decisions below define the current screen specification.

## 2. Mockup

![VER119](img/VER119.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Account Information | Heading | Account Information | No | Static screen title |
| 2 | Agency id | System context (not editable) | `agency_id` — F-AUTH-18 | Yes | agency_id (ID; Required) |
| 3 | Review type | System context (not editable) | `review_type` — F-AUTH-18 | Yes | review_type (Enum[Initial Registration, Major Profile Change]; Required) |
| 4 | Decision | Select | `decision` — F-AUTH-18 | Yes | decision (Enum[Approve, Request More Information, Reject]; Required) |
| 5 | Review comment | Input | `review_comment` — F-AUTH-18 | Conditional | review_comment (Text; Required when decision = Request More Information or Reject; Optional when Approve) |
| 6 | Provider id | System context (not editable) | `provider_id` — F-PROFILE-05 | Yes | provider_id (ID; Required) |
| 7 | Revision comments | Input | `revision_comments` — F-PROFILE-05 | Conditional | revision_comments (Text; Required when decision = Request Revision, otherwise Optional) |
| 8 | Account identity and current account status | Read-only panel | F-AUTH-18, F-PROFILE-05 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 9 | Applicable review type | Read-only panel | F-AUTH-18, F-PROFILE-05 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 10 | Submitted profile tab | Button / navigation | Read-only legal/profile data | No | Enabled only when the linked permission/validation guard succeeds |
| 11 | Submit review | Button / navigation | Apply the same target-specific decision contract | No | Enabled only when the linked permission/validation guard succeeds |
| 12 | Close | Button / navigation | No mutation | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Submitted profile tab | Select | Read-only legal/profile data | VER146 |
| 2 | Submit review | Select | Apply the same target-specific decision contract | ADM095 |
| 3 | Close | Select | No mutation | ADM095 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | Agency variant: Admin(HDT), initial registration or major legal change. Provider variant: Admin(UBND), assigned village and submitted profile revision. Account status and verification status are distinct. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| AUT | FR-018 | F-AUTH-18 | HDT verify and approve Agency registration |
| PRF | FR-005 | F-PROFILE-05 | Review & Verify Local Provider Profile |

## 8. Responsive and accessibility notes

- Smallest supported width: 1024px (admin tool)
- What collapses or stacks on a narrow screen: modal becomes full-screen sheet; action buttons remain side by side unless very narrow
- Text that must remain readable (contrast, minimum size): disclaimer text ≥13px with sufficient contrast to be noticed before approving

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
