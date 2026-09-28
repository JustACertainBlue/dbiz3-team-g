# Screen Spec: EXP068 Experience Detail – Owner View

| Field | Value |
|---|---|
| Screen ID | `EXP068` |
| Screen name | Experience Detail – Owner View |
| Actor | Local Provider |
| Priority | Must |
| Belongs to module | `spec-PRF.md` |
| Mockup image | `img/EXP068.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Displays the full Experience information belonging to the current Local Provider before editing or managing it.

The controls and decisions below define the current screen specification.

## 2. Mockup

![EXP068](img/EXP068.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Experience Detail – Owner View | Heading | Experience Detail – Owner View | No | Static screen title |
| 2 | Experience details and media | Read-only panel | F-PROFILE-06 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 3 | Pricing and booking conditions | Read-only panel | F-PROFILE-06 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 4 | Capacity, duration, notice period and location | Read-only panel | F-PROFILE-06 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 5 | Edit | Button / navigation | Own record | No | Enabled only when the linked permission/validation guard succeeds |
| 6 | Delete/archive | Button / navigation | Apply booking reference guard | No | Enabled only when the linked permission/validation guard succeeds |
| 7 | Back | Button / navigation | No mutation | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Edit | Select | Own record | EXP070 |
| 2 | Delete/archive | Select | Apply booking reference guard | EXP132 |
| 3 | Back | Select | No mutation | EXP067 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| PRF | FR-006 | F-PROFILE-06 | Manage Experiences, Pricing, Images & Booking Conditions |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the right-hand rate/capacity/location cards move below the main content column; the 3-image gallery stacks to a single column; the lightbox becomes full-screen with swipe-to-navigate.
- Text that must remain readable (contrast, minimum size): the strikethrough-free price ("450.000 VND / per person") must remain the dominant visual weight on the page; lightbox close/prev/next controls need a minimum 44×44px touch target.

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
