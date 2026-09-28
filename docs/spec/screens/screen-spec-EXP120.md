# Screen Spec: EXP120 Public Explore

| Field | Value |
|---|---|
| Screen ID | `EXP120` |
| Screen name | Public Explore |
| Actor | Guest |
| Priority | Must |
| Belongs to module | `spec-EXP.md` |
| Mockup image | `img/EXP120.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Public discovery screen for Guests. Shows only basic publicly available Village/Experience information. Price and contact details are hidden; public capacity and availability summary remain visible. Search and restricted actions redirect to Login.

The controls and decisions below define the current screen specification.

## 2. Mockup

![EXP120](img/EXP120.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Public Explore | Heading | Public Explore | No | Static screen title |
| 2 | Analytics consent | Input | `analytics_consent` — F-EXPLORE-05 | No — optional consent | analytics_consent (Boolean; Required for Guest non-essential analytics) |
| 3 | Public Experience cards and pagination | Read-only panel | F-EXPLORE-01, F-EXPLORE-02, F-EXPLORE-03, F-EXPLORE-04, F-EXPLORE-05 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 4 | Restricted price/contact notice | Read-only panel | F-EXPLORE-01, F-EXPLORE-02, F-EXPLORE-03, F-EXPLORE-04, F-EXPLORE-05 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 5 | Provider detail | Button / navigation | Public fields only | No | Enabled only when the linked permission/validation guard succeeds |
| 6 | Experience detail | Button / navigation | Public fields only | No | Enabled only when the linked permission/validation guard succeeds |
| 7 | Login | Button / navigation | Restricted actions require login; AI navigation is hidden | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Provider detail | Select | Public fields only | DSC123 |
| 2 | Experience detail | Select | Public fields only | DSC124 |
| 3 | Login | Select | Restricted actions require login; AI navigation is hidden | AUT009 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | No AI feature/navigation for Guest. Guest sees public capacity and public availability summary; pricing/contact/other Agency booking data remain restricted. | Function List and shared consistency contract |
| SR-004 | Analytics consent is optional and starts false. Accept/refuse does not block browsing; only consented anonymous non-essential analytics may be recorded; no Guest personalization. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| EXP | FR-001 | F-EXPLORE-01 | Load Initial Experience/Activity Listing |
| EXP | FR-002 | F-EXPLORE-02 | Display Experience/Activity Card |
| EXP | FR-003 | F-EXPLORE-03 | Display Full Experience & Provider Profile |
| EXP | FR-004 | F-EXPLORE-04 | Display Related Activities & Provider Suggestions |
| EXP | FR-005 | F-EXPLORE-05 | Record Click & View Events on Experience Cards |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: primary nav collapses to a menu icon; the 4-column Featured Village grid stacks to 1 column; Masterclass rows stack image above text; Excursion/Heritage cards stack to 1 column
- Text that must remain readable: lock-icon CTA labels and "Details →" links need sufficient contrast against the light-grey card background (currently placeholder greyscale)

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
