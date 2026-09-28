# Screen Spec: VIL030 Village Profile

| Field | Value |
|---|---|
| Screen ID | `VIL030` |
| Screen name | Village Profile |
| Actor | Tour Agency / Local Provider / Admin |
| Priority | Must |
| Belongs to module | `spec-PRF.md` / `spec-EXP.md` |
| Mockup image | `img/VIL030.png` |
| Status | Revised — pending human approval |

## 1. Purpose

View-only Village profile containing Village information, Local Provider cards belonging to the Village, and featured Experiences. Provider cards link to Provider Profile; Experience cards link to Experience Detail.

The controls and decisions below define the current screen specification.

## 2. Mockup

![VIL030](img/VIL030.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Village Profile | Heading | Village Profile | No | Static screen title |
| 2 | Village information | Read-only panel | F-PROFILE-03, F-EXPLORE-02 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 3 | Provider cards | Read-only panel | F-PROFILE-03, F-EXPLORE-02 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 4 | Featured Experience cards | Read-only panel | F-PROFILE-03, F-EXPLORE-02 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 5 | Provider card | Button / navigation | Agency/Guest/own Provider view; Admin read-only PRF view | No | Enabled only when the linked permission/validation guard succeeds |
| 6 | Experience card | Button / navigation | Actor-appropriate permitted view | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Provider card | Select | Agency/Guest/own Provider view; Admin read-only PRF view | DSC122 / DSC123 / PRF127 |
| 2 | Experience card | Select | Actor-appropriate permitted view | DSC033 / DSC124 / EXP068 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | Read-only seeded Village catalog. Provider cannot chat with another Provider. Capacity masking does not override public fields. A missing optional rating is omitted; no fabricated rating/review source. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| PRF | FR-003 | F-PROFILE-03 | Display Local Provider Profile |
| EXP | FR-002 | F-EXPLORE-02 | Display Experience/Activity Card |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the 4-column stat grid becomes 2 columns then 1; the 3-column provider directory stacks to 1 column; two-column Governance/Logistics footer sections stack vertically
- Text that must remain readable: metric-box values (Heritage Integrity Metrics) use small monospace-style text and need a minimum readable size on mobile

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
