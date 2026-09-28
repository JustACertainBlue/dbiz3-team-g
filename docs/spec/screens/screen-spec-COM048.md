# Screen Spec: COM048 Chat

| Field | Value |
|---|---|
| Screen ID | `COM048` |
| Screen name | Chat |
| Actor | Tour Agency |
| Priority | Must |
| Belongs to module | `spec-IAC.md` |
| Mockup image | `img/COM048.png` |
| Status | Revised — pending human approval |

## 1. Purpose

The main communication screen for real-time text-based negotiation and clarification with the Craft Village partner.

The controls and decisions below define the current screen specification.

## 2. Mockup

![COM048](img/COM048.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Chat | Heading | Chat | No | Static screen title |
| 2 | Message text | Input | `message_text` — F-CHAT-02 | Yes | message_text (Text, plain text + bold/italic markdown, max 4000 characters; Required) |
| 3 | Provider conversation list with unread count | Read-only panel | F-CHAT-01, F-CHAT-02, F-CHAT-03, F-CHAT-04 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 4 | Chronological messages and contextual references | Read-only panel | F-CHAT-01, F-CHAT-02, F-CHAT-03, F-CHAT-04 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 5 | Active / Closed status | Read-only panel | F-CHAT-01, F-CHAT-02, F-CHAT-03, F-CHAT-04 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 6 | Send | Button / navigation | Active participant, text<=4000 | No | Enabled only when the linked permission/validation guard succeeds |
| 7 | Attach | Button / navigation | Active participant | No | Enabled only when the linked permission/validation guard succeeds |
| 8 | Close Chat | Button / navigation | Explicit F-CHAT-04; Closed terminal | No | Enabled only when the linked permission/validation guard succeeds |
| 9 | Bookings | Button / navigation | Leaving does not close chat | No | Enabled only when the linked permission/validation guard succeeds |
| 10 | Schedule | Button / navigation | Leaving does not close chat | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Send | Select | Active participant, text<=4000 | stay |
| 2 | Attach | Select | Active participant | COM125 |
| 3 | Close Chat | Select | Explicit F-CHAT-04; Closed terminal | stay |
| 4 | Bookings | Select | Leaving does not close chat | BKG137 |
| 5 | Schedule | Select | Leaving does not close chat | SCH141 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | One Active Chat per Agency–Provider pair. Experience/Quote/Booking are context, not separate threads. Agency can initiate directly. | Function List and shared consistency contract |
| SR-004 | Closed is terminal; next interaction creates a new Active Chat. Switching screens/threads never closes the negotiation. Text<=4000; no visible message read receipts. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| IAC | FR-001 | F-CHAT-01 | Open Chat Session |
| IAC | FR-002 | F-CHAT-02 | Send Message |
| IAC | FR-003 | F-CHAT-03 | View Chat List & Message History |
| IAC | FR-004 | F-CHAT-04 | Close Chat Session |

## 8. Responsive and accessibility notes

- Smallest supported width: 1024px (desktop-first B2B portal; not optimized below tablet landscape)
- What collapses or stacks on a narrow screen: the left "Active Channels" panel collapses to an icon rail or a slide-over drawer; the Active Reference chip moves below the partner name
- Text that must remain readable (contrast, minimum size): message body text at minimum 14px with WCAG AA contrast against bubble background; timestamps and metadata may drop to 12px but must retain AA contrast (one draft additionally flagged the "Typical reply time" microcopy as currently low-contrast and needing a fix)

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
