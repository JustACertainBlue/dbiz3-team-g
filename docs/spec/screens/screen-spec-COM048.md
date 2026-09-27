# Screen Spec: COM048 Chat (Tour Agency)

| Field | Value |
|---|---|
| Screen ID | `COM048` |
| Screen name | Chat (Tour Agency) |
| Actor | Tour Agency |
| Priority | Should |
| Belongs to module | `spec-IAC.md` (In-app Chat — owns this screen's FRs: `IAC FR-001/002/003/004/005`) **and** `spec-AIT.md` / `spec-EXP.md` (AI Tour Matching and Explore — both reach this screen as a hand-off target, from `AIT121`'s "Chat"/"Request Quote" actions and `DSC033`'s "Direct Chat"/"Request Quote" actions respectively; neither defines FRs of its own for this screen). Three prior drafts of this file each cited one of these three modules alone; content is consolidated here rather than kept separate. |
| Mockup image | `img/COM048.png` |
| Status | Draft |

## 1. Purpose

**Shown when:** The Tour Agency user opens Messages from the top nav, taps a channel row, clicks "Chat with Provider" / "Direct Chat with Master" from a Village/Provider/Experience page, or triggers "Request Quote" on an Experience (`DSC033`) or from an AI Tour Matching result (`AIT121`) — to negotiate and clarify Experience/booking details in real time with a Local Provider / Craft Village partner.

**The user leaves this screen when:** They navigate away via the top nav (Explore, AI Tour Matching, Bookings, Schedule), open the Account Dropdown from the avatar, tap the Active Reference chip to jump to Booking Detail (`BKG138`), tap the thread header's provider name to open the linked Provider Profile (`DSC122`), or tap Attach File to open Attach Document (`COM125`).

## 2. Mockup

![COM048](img/COM048.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | App name "HANOI ARTISAN BRIDGE" | Header / Text | static text | No | — |
| 2 | Portal subtitle "B2B TRAVEL AGENCY PORTAL" | Text | static text | No | — |
| 3 | Nav item "EXPLORE" | Button | static label | No | — |
| 4 | Nav item "AI TOUR MATCHING" + AI badge | Button | static label + feature badge | No | — |
| 5 | Nav item "BOOKINGS" | Button | static label | No | — |
| 6 | Nav item "SCHEDULE" | Button | static label | No | — |
| 7 | Nav item "MESSAGES" (active/underlined) | Button | static label, current-screen state | No | — |
| 8 | Account name "Indochina Heritage Voyages" + chevron | Text / Button | `user.companyName` from `spec-ACC.md` §5.1 | No | — |
| 9 | Account ID "ID: VN-9042" | Text | `user.accountId` | No | — |
| 10 | Avatar "IH" | Image / Button | `user.avatarInitials` | No | — |
| 11 | Panel title "Active Channels" | Header | static text | No | — |
| 12 | Live count "4 Live" | Text | count of channels with an open conversation | No | — |
| 13 | Search input "Search workshops or booking ID..." | Input | search query string | No | — |
| 14 | Filter tab "Send Message" (active) | Toggle | filter state | No | — |
| 15 | Filter tab "Unread (1)" | Toggle | count of unread channels | No | — |
| 16 | Filter tab "Pending" | Toggle | filter state | No | — |
| 17 | Channel row — Vun Art Cooperative | List item | `channel.partnerName`, `channel.lastMessageTime`, `channel.previewText`, `channel.bookingRef` | No | — |
| 18 | Channel row — Chuong Village Conical Hats | List item | same fields as #17 | No | — |
| 19 | Channel row — Bat Trang Pottery Guild | List item | same fields as #17 | No | — |
| 20 | Channel row — Phu Vinh Bamboo & Rattan | List item | same fields as #17 | No | — |
| 21 | Chat header partner name "Vun Art Cooperative" | Text / Button | `channel.partnerName`; tapping opens the linked Provider Profile | No | — |
| 22 | Badge "Verified Local Maker" | Text (badge) | `partner.verificationStatus` | No | — |
| 23 | Partner location "Van Phuc Silk Village, Ha Dong, Hanoi" | Text | `partner.village` + `partner.address` (from `spec-VIL.md`) | No | — |
| 24 | Reply-time note "Typical reply time: < 2 hours" | Text | `partner.avgReplyTime` | No | — |
| 25 | Document icon beside partner header | Image | static icon | No | — |
| 26 | Active Reference box "#BKG-8409 (Silk Applique Workshop)" | Card / Text / Button | Icon + "ACTIVE REFERENCE" label + `channel.activeBookingRef`, `booking.experienceName` | No | Links the thread to a single booking/quote context |
| 27 | Overflow menu (⋮) | Button | Opens a dropdown to view attached/shared documents for the thread | No | — |
| 28 | Date divider "Today, October 18" | Text | `message.date` (grouped) | No | — |
| 29 | Incoming message bubble, Vun Art Cooperative 09:15 AM | Text | `message.content`, `message.sender`, `message.timestamp` | No | — |
| 30 | Sender avatar "VA" | Image | `partner.avatarInitials` | No | — |
| 31 | Outgoing message bubble, Indochina Heritage (You) 09:42 AM | Text | `message.content` | No | — |
| 32 | Own avatar "IH" | Image | `user.avatarInitials` | No | — |
| 33 | Attached file card "B2B_Guest_Manifest_BKG8409.pdf" (1.4 MB, "Attached to Inquiry") | List item / Button | `attachment.fileName`, `attachment.size`, `attachment.tag` | No | — |
| 34 | Incoming message bubble, Vun Art Cooperative 10:30 AM | Text | `message.content` | No | — |
| 35 | Attached certificate card "Vun_Art_Sustainability_Cert_2025.pdf" + "View" link | List item / Button | `attachment.fileName`, `attachment.type`, `attachment.status` | No | — |
| 36 | Footer note "Messages are securely logged to booking reference #BKG-8409" | Text | static + `channel.activeBookingRef` | No | — |
| 37 | Helper text "Shift + Enter for new line" | Text | static text | No | — |
| 38 | Message composer textarea (placeholder "Type message to Vun Art Cooperative regarding #BKG-8409...") | Input | draft message text | Yes, to send | Non-empty OR at least one attachment present; max 2,000 characters (`spec-IAC.md` §10 Q1) |
| 39 | "Attach File" control | Button | — | No | — |
| 40 | Reference tag "#BKG-8409" (composer toolbar) | Text (tag) | `channel.activeBookingRef` | No | — |
| 41 | "Send Message" button | Button | — | No | Disabled until #38 is non-empty or a file is attached |
| 42 | Footer copyright line | Text | static text | No | — |
| 43 | Footer links (Operator Compliance, Master Village Codex, B2B Dispatch Support) | Button / Text | static labels | No | — |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | Channel list populated; the most recently active channel is open in the right panel with its full thread and Active Reference chip | Normal load, existing conversations present |
| Empty (no data) | "Active Channels" list is empty (e.g. "No conversations yet — start one from an Experience or Booking"); right panel shows a placeholder instead of a thread | New Agency account, or all channels filtered out by search/tab with none matching |
| Loading | Skeleton rows in the channel list and a skeleton thread in the right panel | Initial screen load, or switching to a channel whose messages have not yet been fetched |
| Error | Inline banner in the thread panel ("Unable to load messages. Retry") replacing the message list; "Send Message" shows a failed/retry state if a send fails | Network or API failure on fetch or on send |
| Success / confirmation | Sent message appears instantly at the bottom of the thread with a delivered indicator; composer clears | Message successfully sent |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | Channel row (#17–20) | tap | Closes the currently open Chat session (per `IAC FR-004`) and loads the selected channel's thread into the right panel | stays (`COM048`) |
| 2 | Search input (#13) | type | Filters the channel list live by partner name or booking ID | stays |
| 3 | Filter tabs (#14–16) | tap | Filters channel list to that status | stays |
| 4 | Nav items (#3–6) | tap | Closes the currently open Chat session (per `IAC FR-004`) and navigates to the corresponding module | `EXP067` / `DSH018`-equivalent Agency home / `BKG137` / `SCH141` |
| 5 | Account name / avatar (#8, #10) | tap | Opens the Account Dropdown | Account Dropdown (shared component) |
| 6 | Active Reference box (#26) | tap | Opens the booking this thread is scoped to | `BKG138` |
| 7 | Thread header — provider name (#21) | tap | Opens the provider's profile | `DSC122` |
| 8 | Overflow menu (#27) | tap | Opens a dropdown to view the thread's attached/shared documents | stays (opens dropdown, no new screen) |
| 9 | Attached file card (#33, #35) | tap | Opens/downloads the file, or opens a preview | stays |
| 10 | "Attach File" (#39) | tap | Opens the Attach Document modal, scoped to the active booking reference | `COM125` |
| 11 | Composer textarea (#38) | type | Updates the draft; enables Send Message when non-empty | stays |
| 12 | "Send Message" button (#41) | tap | Sends the message, appends it to the thread, clears the composer | stays |
| 13 | Footer links (#43) | tap | Navigates to the respective support/compliance page | external, no Screen ID |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | "Send Message" stays disabled until the composer has text or at least one file is attached | Mockup, composer state |
| SR-002 | "Attach File" always opens `COM125` scoped to the channel's active booking reference | Mockup, Active Reference chip |
| SR-003 | Only one channel's thread can be open in the right panel at a time | Mockup layout |
| SR-004 | The Active Reference chip reflects the most recent booking/quote reference tied to the open channel | Mockup |
| SR-005 | Messages are grouped under date dividers | Mockup |
| SR-006 | The active Chat session is closed (`IAC FR-004`) whenever the Agency navigates away via the top nav or switches to a different channel row — there is no dedicated "End Chat" button; closing is a side effect of leaving the thread | Clarification |
| SR-007 | Each chat channel is tied 1:1 to a booking/quote reference; an Agency cannot message a provider without an existing quote or booking context | Screen List, COM048 overview |
| SR-008 | The "Request Quote" action (from `DSC033` or `AIT121`) opens this screen and auto-sends the initial quote-request message; it can fire only once per Experience per Agency | Screen List, Quote Request row |
| SR-009 | Attachment type/size limits are governed by `COM125` | Screen List, COM125 |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| `IAC FR-001` | Opens or reuses an authorized Chat session between the Tour Agency and Local Provider while retaining the relevant Experience/Booking context (channel list selection, or arriving via a Request Quote/Chat handoff from `AIT121` or `DSC033`). |
| `IAC FR-002` | Lets the Tour Agency send supported text messages via the composer; each is stored in conversation history. |
| `IAC FR-003` | Displays the Tour Agency's Chat list (Active Channels), authorized message history, latest-message preview/timestamp, unread state (filter tabs), and paginated history. |
| `IAC FR-005` | Provides the Attach File entry point (hands off to `COM125`) and displays documents attached to the active Chat conversation. |

`IAC FR-004` (close an active Chat session) is implemented implicitly, not as a dedicated "End Chat" button: navigating away via the top nav (#3–6) or switching to another channel row (#17–20) closes the current Chat session. The overflow menu (#27) is unrelated — it opens a dropdown to view the thread's attached/shared documents.

`spec-AIT.md` and `spec-EXP.md` both list this screen as a hand-off target from `AIT121` and `DSC033` respectively, but define no FRs of their own for it — the FRs above (all `IAC FR-*`) are what actually define this screen's behavior.

## 8. Responsive and accessibility notes

- Smallest supported width: 1024px (desktop-first B2B portal; not optimized below tablet landscape)
- What collapses or stacks on a narrow screen: the left "Active Channels" panel collapses to an icon rail or a slide-over drawer; the Active Reference chip moves below the partner name
- Text that must remain readable (contrast, minimum size): message body text at minimum 14px with WCAG AA contrast against bubble background; timestamps and metadata may drop to 12px but must retain AA contrast (one draft additionally flagged the "Typical reply time" microcopy as currently low-contrast and needing a fix)

## 9. Open questions

| # | Question | Blocking? | Status |
|---|---|---|---|
| 1 | Is there a per-message edit/delete or "message read" indicator not shown in this mockup? — **Answer:** No. The chat does not support per-message edit/delete or message read indicators. Messages can only be sent and viewed within the conversation. | No | Resolved |
| 2 | Confirm the exact FR IDs and owning module — placeholders/conflicting module names (`spec-COM.md`, `spec-M04-EXPLORE.md`, `spec-MOD3.md`) were used across drafts. — **Answer:** Resolved by `spec-IAC.md`: `IAC FR-001` (open/reuse session), `IAC FR-002` (send message), `IAC FR-003` (Chat list/history), `IAC FR-005` (attach document). `spec-AIT.md`/`spec-EXP.md` are valid *reach* sources (see header) but not FR owners. | No | Resolved |
| 3 | `spec-IAC.md` FR-004 requires that an authorized participant can close an active Chat session — how is that triggered on this screen? — **Answer:** Implicitly, not via a dedicated button: tapping a nav item (#3–6) or a different channel row (#17–20) closes the currently open Chat session (SR-006). Reopening the same channel later reuses the same session with its history intact, per `spec-IAC.md` §10 Q14/Q15 (participant can reopen; old history stays in the same thread). The overflow menu (#27) is unrelated to closing — it opens a dropdown to view the thread's attached/shared documents. | No | Resolved |
| 4 | Character limit, if any, on the composer textarea? — **Answer:** Yes — 2,000 characters, per `spec-IAC.md` §10 Q1. | No | Resolved |
| 5 | What options does the overflow (⋮) menu next to Active Reference expose? — **Answer:** Opens a dropdown to view the thread's attached/shared documents (not mute/archive/report). | No | Resolved |
| 6 | Is message delivery real-time (WebSocket) or polled — affects how "Loading"/"Sending" states should be designed? | No | Open |

---

## Completion checklist

- [x] The mockup is a separate cropped image file, named with the Screen ID.
- [x] Every visible element in the mockup appears in the element inventory.
- [x] Every input element has a validation rule or an explicit "none".
- [x] All five states are filled in, or marked "not applicable" with a reason.
- [x] Every navigation target is a Screen ID that exists in the Screen List. *(overflow menu resolved as an inline dropdown, not a screen — see Open Question 5)*
- [x] Every element that displays data names the field it displays, matching the module spec.

---

Template source: DBIZ3, VJCBI College - FTU, Session 4. Built on the DBIZ2 Screen Design
structure (Screen List and Screen Layout), per DBIZ3 Syllabus v3.
