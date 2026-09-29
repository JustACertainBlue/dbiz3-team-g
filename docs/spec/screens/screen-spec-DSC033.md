# Screen Spec: DSC033 Experience Detail

| Field | Value |
|---|---|
| Screen ID | `DSC033` |
| Screen name | Experience Detail |
| Actor | Tour Agency |
| Priority | Must |
| Belongs to module | `spec-EXP.md` |
| Mockup image | `img/DSC033.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Displays the permitted Experience information and provides actions such as View Provider, View Village, Chat, and Request Quote.

The controls and decisions below define the current screen specification.

## 2. Mockup

![DSC033](img/DSC033.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Experience Detail | Heading | Experience Detail | No | Static screen title |
| 2 | Experience description and image gallery | Read-only panel | F-EXPLORE-03, F-EXPLORE-11, F-EXPLORE-12 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 3 | Capacity, duration and availability | Read-only panel | F-EXPLORE-03, F-EXPLORE-11, F-EXPLORE-12 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 4 | Agency pricing and contact | Read-only panel | F-EXPLORE-03, F-EXPLORE-11, F-EXPLORE-12 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 5 | Related Experiences | Read-only panel | F-EXPLORE-03, F-EXPLORE-11, F-EXPLORE-12 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 6 | Request Quote | Button / navigation | Once per Agency–Experience; opens chat and sends initial message; optional dates/group | No | Enabled only when the linked permission/validation guard succeeds |
| 7 | Chat | Button / navigation | Direct chat allowed | No | Enabled only when the linked permission/validation guard succeeds |
| 8 | Provider | Button / navigation | View profile | No | Enabled only when the linked permission/validation guard succeeds |
| 9 | Provider schedule | Button / navigation | Authenticated masked calendar | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Request Quote | Select | Once per Agency–Experience; opens chat and sends initial message; optional dates/group | COM048 |
| 2 | Chat | Select | Direct chat allowed | COM048 |
| 3 | Provider | Select | View profile | DSC122 |
| 4 | Provider schedule | Select | Authenticated masked calendar | SCH140 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| EXP | FR-003 | F-EXPLORE-03 | Display Full Experience & Provider Profile |
| EXP | FR-011 | F-EXPLORE-11 | Request Quote from Experience Card/Detail |
| EXP | FR-012 | F-EXPLORE-12 | Open Chat with Local Provider from Experience |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the two-column layout (content + sidebar) stacks to a single column, with the sidebar (Pricing/Capacity/Location/Organization & Village Context) moving below the main content; the image gallery switches from a grid to a horizontal-swipe carousel / stacks vertically
- Text that must remain readable (contrast, minimum size): itinerary step time ranges, net/pax price, and the "Confidential Rate" badge must remain legible and not truncated at minimum 14px; accessibility tags (wheelchair, child friendly...) need the same high contrast

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
