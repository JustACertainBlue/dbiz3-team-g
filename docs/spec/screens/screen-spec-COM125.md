# Screen Spec: COM125 Attach Document

| Field | Value |
|---|---|
| Screen ID | `COM125` |
| Screen name | Attach Document |
| Actor | Tour Agency |
| Priority | Should |
| Belongs to module | `spec-IAC.md` |
| Mockup image | `img/COM125.png` |
| Status | Revised — pending human approval |

## 1. Purpose

Allows Tour Agency to attach a document/file to a Chat message.

The controls and decisions below define the current screen specification.

## 2. Mockup

![COM125](img/COM125.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Attach Document | Heading | Attach Document | No | Static screen title |
| 2 | Files | File input | `files` — F-CHAT-05 | Yes | files (Array<File>, 1–5 files; Required — allowed formats PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG; maximum 10MB per file) |
| 3 | Selected files and upload validation | Read-only panel | F-CHAT-05 — permitted output fields only | No | Actor-specific field visibility; optional missing values omitted. Never expose tokens, password hashes, session values or internal delivery diagnostics. |
| 4 | Send attachments | Button / navigation | Validate all 1–5 files before sending | No | Enabled only when the linked permission/validation guard succeeds |
| 5 | Cancel | Button / navigation | No message sent | No | Enabled only when the linked permission/validation guard succeeds |

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
| 1 | Send attachments | Select | Validate all 1–5 files before sending | COM048 |
| 2 | Cancel | Select | No message sent | COM048 |

Shared avatar navigation for authenticated actors: My Account → ACC129; My Business → PRF019 (Agency) / PRF127 (Provider), omitted for Admin without a business; Logout → AUT026. Agency main navigation uses EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095. Guest has EXP120 and AUT009/REG003, with no AI navigation.

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Check action permission and resource scope on every protected request; hiding a button alone is insufficient. Read-only screens have no mutation controls. | AUT FR-016 |
| SR-002 | Validate the inputs and render outputs exactly as the linked module contracts; server/context fields are not freely editable form controls. | Linked FR table |
| SR-003 | 1–5 files, <=10MB/file, PDF/DOC/DOCX/XLS/XLSX/JPG/JPEG/PNG. All files must pass validation before message creation. | Function List and shared consistency contract |

## 7. Linked requirements

| Module | FR ID | Function ID | Screen responsibility |
|---|---|---|---|
| IAC | FR-005 | F-CHAT-05 | Send Document Attachment |

## 8. Responsive and accessibility notes

- Smallest supported width: 1024px (inherits the desktop-first constraint of its parent screen, `COM048`)
- What collapses or stacks on a narrow screen: the modal becomes full-screen instead of a centered dialog; attachment rows stack their file metadata below the filename instead of beside it
- Text that must remain readable (contrast, minimum size): filename text at minimum 14px; tag labels (e.g. "GUEST MANIFEST") must retain WCAG AA contrast against their pill background

## 9. Decisions and review

Use the approved Function List and [shared consistency contract](../docs/consistency-contract.md). No new feature is implied by decorative legacy mockup copy. Human approval of this revision is pending; technical Plan choices remain separately identified.

## Completion checklist

- [x] Linked functions have corresponding module FR and IO contracts.
- [x] Inputs name their validation and required/optional condition.
- [x] Default, empty, loading, error and success states are defined.
- [x] Navigation targets use existing Screen IDs.
- [ ] Human approval of the revised specification.
