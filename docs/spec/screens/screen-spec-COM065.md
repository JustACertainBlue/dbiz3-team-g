# Screen Spec: COM065 Chat (Local Provider)

| Field | Value |
|---|---|
| Screen ID | `COM065` |
| Screen name | Chat (Local Provider) |
| Actor | Local Provider |
| Priority | Should |
| Belongs to module | ⚠️ Conflicting across drafts — see Open Question 1 (`spec-COM.md`, `spec-M04-EXPLORE.md`, or `spec-MOD3.md`) |
| Mockup image | `img/COM065.png` |
| Status | Draft |

## 1. Purpose

**Shown when:** The Local Provider selects "Messages" in the top nav, taps a channel row, or opens an incoming "Request Quote" notification/conversation from a Tour Agency, to communicate, negotiate, and send quotations/invoices in real time.

**The user leaves this screen when:** They navigate away via the top nav (Dashboard, Experience Management, Booking, Schedule), open the Account Dropdown from the avatar, tap "Create Booking" to hand off into booking creation, or tap "Attach Quote / Invoice" to open Attach Document.

## 2. Mockup

![COM065](img/COM065.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | App name / logo (e.g. "VUN ART COOPERATIVE") | Header / Text | `partner.businessName` | No | — |
| 2 | Portal subtitle "LOCAL ARTISAN PORTAL" | Text | static text | No | — |
| 3 | Nav item "DASHBOARD" | Button | static label | No | — |
| 4 | Nav item "EXPERIENCE MANAGEMENT" | Button | static label | No | — |
| 5 | Nav item "BOOKING" | Button | static label | No | — |
| 6 | Nav item "SCHEDULE" | Button | static label | No | — |
| 7 | Nav item "MESSAGES" (active/underlined) | Button | static label, current-screen state | No | — |
| 8 | User name + chevron | Text / Button | `user.fullName` | No | — |
| 9 | Role/business line (e.g. "Director, [Provider name]") | Text | `user.role`, `user.businessName` | No | — |
| 10 | Avatar (initials) | Image / Button | `user.avatarInitials` | No | — |
| 11 | Panel title "Active Inquiries & Agency Chats" | Header | static text | No | Count of channels with recent activity |
| 12 | Live count (e.g. "4 Live") | Text | count of channels with an open conversation | No | — |
| 13 | Search input ("Search agency chats or ref...") | Input | search query string | No | Searches by agency name or reference ID; no minimum character requirement |
| 14 | Filter tab "All Chats" (active) | Toggle | filter state | No | Only one filter active at a time |
| 15 | Filter tab "Quote Pending" | Toggle | filter state | No | — |
| 16 | Channel list item (×N) | List item | `channel.partnerName` (Agency), `channel.lastMessageTime`, `channel.previewText`, `channel.quoteRef` ("Ref: #Q-XXXX-XX") | Yes (per item) | Selected item shows active/highlighted state |
| 17 | Chat header — agency name | Text | `channel.partnerName` | Yes | — |
| 18 | Contact badge (name + role, e.g. "Claire Dupont, Senior Ops") | Text (badge) | `partner.contactName`, `partner.contactRole` | No | — |
| 19 | Active reference (e.g. "Active Ref: #Q-2024-91") | Text / Card | `channel.activeQuoteRef` | Yes | — |
| 20 | Partner avatar (thread header) | Image | `partner.avatarInitials` | No | — |
| 21 | Date divider (e.g. "Today, October 18") | Text | `message.date` (grouped) | No | Auto-generated per day boundary |
| 22 | Incoming message bubble (Agency) | Text | avatar initials, sender name + role, `message.timestamp`, `message.content` | Yes (per message) | Left-aligned |
| 23 | Outgoing message bubble (Provider, "You") | Text | avatar initials, `message.timestamp`, `message.content` | Yes (per message) | Right-aligned |
| 24 | Attached quotation/invoice card (in a message) | List item / Button / Card | `attachment.fileName`, `attachment.size`, `attachment.amount` (VND), file-type/verified icon | No | Shown only when a message includes an attachment; accepted formats PDF, DOC, DOCX, XLS, XLSX; max 10 MB per file; multiple files allowed subject to system total attachment limit; opens/downloads on tap |
| 25 | Reply status / footer note (e.g. "Responding as [Provider] regarding reference #Q-XXXX") | Text | static + `channel.activeQuoteRef` | Yes | — |
| 26 | Helper text "Shift + Enter for new line" | Text | static text | Yes | — |
| 27 | Message composer textarea (placeholder "Type reply to [Agency] regarding #Q-XXXX...") | Input | draft message text | Yes, to send | Non-empty OR at least one attachment present; cannot send empty/whitespace-only |
| 28 | "Attach Quote / Invoice" control | Button | Paperclip icon + "Attach Quote / Invoice" | No | Opens the document-attach flow, scoped to the active reference; same format/size limits as row 24 |
| 29 | "Create Booking" control | Button | Calendar icon + "Create Booking" | Yes | Always enabled — not gated on the Agency having confirmed the quote (see SR-003) |
| 30 | "Send Message" button | Button | "Send Message →" | Yes | Disabled until the composer has text or a file is attached |
| 31 | Footer | Footer | Brand/copyright line, ministry note, links (Operator Compliance, Master Village Codex, B2B Dispatch Support) | Yes | — |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | Inquiry/chat list populated; the most recently active channel is open in the right panel with its full thread | Provider has at least one existing conversation |
| Empty (no data) | "Active Inquiries & Agency Chats" list is empty (e.g. "No inquiries yet — Agencies will reach out after viewing your Experiences"); right panel shows a blank "Select a conversation" placeholder | New Local Provider account, Provider has received no Chat/Request Quote yet, or all channels filtered out with none matching |
| Loading | Skeleton rows in the channel list and skeleton bubbles/thread in the right panel; input temporarily disabled while sending | Channel list or thread history is being fetched, or a message is being sent |
| Error | Channel list: banner "Unable to load conversations. Retry."; thread panel: inline banner "Unable to load messages" / "This conversation failed to load."; on send failure the affected message bubble shows a red "Message failed to send — Retry" state | Network/API failure on list fetch, thread fetch, or message send |
| Success / confirmation | New message (or attached quote/invoice) appears instantly with a "Sending…" indicator, then a delivered indicator; composer clears; a successful "Create Booking" action shows a confirmation toast before navigating to Create Booking | Message, attachment, or booking action completed successfully |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | Channel list item | tap | Loads that channel's thread into the right panel | stays (`COM065`) |
| 2 | Search input | type | Filters the channel list live by agency name or reference | stays |
| 3 | Filter tabs | tap | Filters channel list to that status (All Chats / Quote Pending) | stays |
| 4 | Nav items (Dashboard / Experience Management / Booking / Schedule) | tap | Navigates to the corresponding module | Provider Dashboard / Experience Management / Booking / Schedule |
| 5 | User name / avatar | tap | Opens the Account Dropdown | Account Dropdown (shared component) |
| 6 | Active reference | tap | Opens the related booking/quote | `BKG138`-equivalent Provider booking detail |
| 7 | Attached quotation/document card | tap | Opens/downloads the file, or opens a preview (new tab) | stays |
| 8 | "Attach Quote / Invoice" | tap | Opens the Attach Document modal, scoped to the active reference | `COM126` |
| 9 | Composer textarea | type | Updates the draft; enables Send Message when non-empty | stays |
| 10 | "Send Message" button | tap | Sends the message, appends it to the thread, clears the composer | stays |
| 11 | "Create Booking" | tap | Opens the booking-creation form, pre-filled with context from the chat (Agency, Experience, reference ID); available at any time, not gated on prior Agency quote confirmation | `BKG134` |
| 12 | Footer links | tap | Navigates to the respective support/compliance page | external, no Screen ID |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | "Send Message" stays disabled until the composer has text or at least one file is attached | Mockup, composer state |
| SR-002 | "Attach Quote / Invoice" always opens `COM126` scoped to the channel's active reference; attachments must be PDF, DOC, DOCX, XLS, or XLSX, max 10 MB per file, multiple files allowed subject to the system's total attachment limit | Mockup, Clarification |
| SR-003 | "Create Booking" is always enabled/actionable from the Chat composer, regardless of negotiation status — it is not gated by an explicit agreement signal from the Agency | Clarified answer |
| SR-004 | Only one channel's thread can be open in the right panel at a time | Mockup layout |
| SR-005 | Messages are grouped under date dividers | Mockup |
| SR-006 | Each chat channel is tied 1:1 to a booking/quote reference; a Provider only sees threads initiated by an Agency against a specific inquiry | Screen List, COM065 overview |
| SR-007 | This screen has no decline/close action for an inquiry — only messaging. If a Provider declines informally within the chat, the channel and thread continue as normal with no state change | Clarified answer |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| `IAC FR-001` | Opens or reuses an authorized Chat session between the Local Provider and Tour Agency while retaining the relevant Experience/Booking/Quote context. |
| `IAC FR-002` | Lets the Local Provider send supported text messages and displays messages stored in the conversation history. |
| `IAC FR-003` | Displays the Provider's Chat list, authorized message history, latest-message information, unread state and paginated history. |
| `IAC FR-005` | Provides the Attach Quote / Invoice entry point and displays documents attached to the active Chat conversation. |
| `BKG FR-003` | Provides the entry point from an agreed Agency–Provider conversation into Local Provider Booking creation. |

## 8. Responsive and accessibility notes

⚠️ **Draft conflict — not resolved, see Open Question 2.** One draft describes this as a desktop-first B2B portal not optimized below tablet; two other drafts describe it as responsive down to mobile, matching `COM048`'s mobile behavior.

- Smallest supported width: **conflicting** — either 1024px (desktop-first B2B portal, not optimized below tablet landscape) or 360px (fully responsive to mobile)
- What collapses or stacks on a narrow screen: the left "Active Inquiries & Agency Chats" panel collapses to an icon rail / slide-over drawer, with "Attach Quote / Invoice" and "Create Booking" controls stacking vertically under the composer; or (in the mobile-first version) the two-pane layout collapses to a single pane, with the channel list becoming a separate drawer view returned to via a back button
- Text that must remain readable (contrast, minimum size): message body text at minimum 14px with WCAG AA contrast against bubble background; the reference ID and quotation amount (VND) must stay legible/high-contrast at small sizes (minimum 12px) since they carry commercial significance; timestamps and other metadata may drop to 12px but must retain AA contrast

## 9. Open questions

| # | Question | Blocking? | Status |
|---|---|---|---|
| 1 | The three source drafts disagree on "Belongs to module": `spec-COM.md`, `spec-M04-EXPLORE.md`, and `spec-MOD3.md` (Module 3: AI Tour Matching) were each given independently. Which module spec is authoritative for this screen? | Yes | Open |
| 2 | Is this screen desktop-first (min width 1024px, not optimized for mobile) or fully responsive down to 360px? Drafts directly conflict on this. | Yes | Open |
| 3 | What system signal, if any, marks a thread as "agreed" so that Create Booking becomes enabled — manual (Provider decides) or rule-based (e.g. explicit approval message)? — **Answer (from two drafts):** "Create Booking" is always enabled; no agreement signal gates it. | No | Resolved (per two of three drafts) |
| 4 | Can a Provider decline/close an inquiry from this screen, and if so what happens to the channel? — **Answer (from one draft):** No decline/close action exists on this screen — only chat. If the Provider declines informally within the conversation, the chat continues normally with no change to the channel state. | No | Resolved (per one draft; confirm against final module spec) |
| 5 | Exact FR IDs confirmed for this screen: `IAC FR-001`, `IAC FR-002`, `IAC FR-003`, `IAC FR-005`, `BKG FR-003` (per two drafts that specify these). | No | Resolved (per two of three drafts) |

---

## Completion checklist

- [x] The mockup is a separate cropped image file, named with the Screen ID.
- [x] Every visible element in the mockup appears in the element inventory.
- [x] Every input element has a validation rule or an explicit "none".
- [x] All five states are filled in, or marked "not applicable" with a reason.
- [x] Every navigation target is a Screen ID that exists in the Screen List.
- [ ] Every element that displays data names the field it displays, matching the module spec. *(pending resolution of Open Question 1 — which module spec is authoritative)*

---

Template source: DBIZ3, VJCBI College - FTU, Session 4. Built on the DBIZ2 Screen Design
structure (Screen List and Screen Layout), per DBIZ3 Syllabus v3.

> **Merge note:** This file consolidates three independently drafted versions of the COM065 spec (`screen-spec-COM065.md`, `screen-spec-COM065(1).md`, `screen-spec-COM065(2).md`) found in the uploaded archive. Content was combined where drafts agreed or were complementary; genuine disagreements between drafts were preserved and flagged above as Open Questions rather than silently resolved.
