# Screen Spec: AIT121 AI Tour Matching

| Field | Value |
|---|---|
| Screen ID | `AIT121` |
| Screen name | AI Tour Matching |
| Actor | Tour Agency |
| Priority | Must |
| Belongs to module | `spec-MOD3.md` — Module 3: AI Tour Matching |
| Mockup image | `img/AIT121.png` |
| Status | Draft |

## 1. Purpose

**Shown when:** The Agency selects "AI Tour Matching" in the main nav after login, to describe tour needs in natural language and receive matching Village/Experience results directly in the conversation.

**The user leaves this screen when:** The Agency navigates to another nav item (Explore, Bookings, Schedule, Messages), or taps an action on a result card (View Experience Detail → DSC033, Chat → COM048, Request Quote → opens COM048 with the quote message pre-sent, Check Availability Now → SCH140).

## 2. Mockup

![AIT121](img/AIT121.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Top nav bar | Header | Explore / AI Tour Matching (active, "AI" badge) / Bookings / Messages / Schedule — global nav | Yes | — |
| 2 | Account info (top right) | Text | Agency name, verified badge, "Tier X Operator • ID: <account ID>" from `spec-PRF019.md` §5.1 | Yes | — |
| 3 | Notification bell | Toggle/Button | Unread notification count | No | — |
| 4 | Avatar dropdown | Button | Opens Account Dropdown (ACC129, ACC130, Logout) | Yes | — |
| 5 | "New Tour Inquiry" button | Button | Starts a new chat session | Yes | — |
| 6 | Sidebar collapse icon | Toggle | Collapses/expands the inquiry-history sidebar | No | — |
| 7 | Search inquiry history | Input | Searches by session name / inquiry ID | No | No minimum character requirement |
| 8 | Inquiry history list (grouped by Today / Previous 7 Days / Previous 30 Days) | List | Each item: group name, material tag, timestamp, Session ID (`#AIM-xxxx`) | Yes | — |
| 9 | Session header | Text | Active session name, "Session #AIM-xxxx" tag, "Craft Intent Engine v4.2" tag, sync status line | Yes | — |
| 10 | AI message bubble | Text | AI response content, timestamp, "HANOI ARTISAN ASSISTANT" label | Yes | — |
| 11 | User message bubble | Text | Agency's input content, timestamp, sender label (dispatch) | Yes | — |
| 12 | Match result card | List item | Match % badge, classification label (Best Fit / High Cultural Affinity / Alternative Option), "B2B NET RATE" price (₫/pax), Experience name, location + distance + travel time, "Match Rationale" block, preview image placeholder, 4 action buttons | Yes | Only rendered for matches ≥ 70% (see SR-003) |
| 13 | "Check Availability Now" button | Button | Opens the provider's open availability slots for this Experience | Yes | Only enabled once match results have returned |
| 14 | "View Experience Detail" button | Button | Navigates to DSC033 | Yes | — |
| 15 | "Request Custom Quote" button | Button | Opens COM048 with an auto-sent quote-request message (per Request Quote – Action); sendable once per Experience | Yes | Disabled if already requested for that Experience |
| 16 | "Chat" button | Button | Opens COM048 with the corresponding provider | Yes | — |
| 17 | Quick Actions row | Button group | "Select Option 1", "Select Option 2", "Adjust Transit Limit" — contextual shortcut actions | No | See SR-001, SR-002 |
| 18 | Chat input box | Input | Enter additional requirements (dietary, mobility, VIP...) | No | Length capped per system config |
| 19 | Attach icon | Button | Attaches a file to the message | No | — |
| 20 | Mic icon | Button | Voice input | No | — |
| 21 | "Send" button | Button | Sends the message to the AI | Yes | Disabled when input is empty |
| 22 | Footer status line | Text | "AI Assistant synchronized with Hanoi Craft Federation Quotas", Session ID | No | — |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | Sidebar shows inquiry history; main panel shows the most recent session, or is empty if none exists | Agency opens the screen |
| Empty (no data) | Sidebar has no inquiry history; main panel shows only the AI's greeting inviting the Agency to describe its needs | Agency's first time using the feature, no Session yet |
| Loading | AI message bubble shows an "analyzing..." state in place of result cards; action buttons are disabled | Agency just sent a request; AI is processing matching |
| Error / No strong matches | System error: AI message bubble shows an error with a "Retry" button. No-match case: bubble shows "No strong matches found" and suggests refining the search criteria — triggered when no Experience reaches the 70% minimum match threshold (SR-003) | AI matching fails, or no Experience clears the 70% threshold |
| Success / confirmation | 1–3 match result cards render in full with % badge, price, rationale, and action buttons, all ≥ 70% match | AI returns at least one match ≥ 70% |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | New Tour Inquiry | tap | Creates a new Session, clears prior context, focuses the input | stays (AIT121) |
| 2 | Inquiry history item | tap | Loads that Session's conversation | stays (AIT121) |
| 3 | Search inquiry history | type | Filters the list by keyword | stays (AIT121) |
| 4 | Chat input + Send | type, tap | Sends the request; AI analyzes and returns new match results | stays (AIT121) |
| 5 | Check Availability Now | tap | Opens the provider's availability for the Experience | `SCH140` |
| 6 | View Experience Detail | tap | Opens the Experience detail page | `DSC033` |
| 7 | Request Custom Quote | tap | Opens Chat and auto-sends a quote-request message | `COM048` |
| 8 | Chat | tap | Opens Chat with the corresponding provider | `COM048` |
| 9 | Quick Action — Adjust Transit Limit | tap | Sends the corresponding command as a message to the AI Matching Session immediately; no confirmation modal or extra input step | stays (AIT121) |
| 10 | Quick Action — Select Option 1 / Select Option 2 | tap | Auto-sends the selected match to the AI Matching Session. AI then: (1) shows full detail of the selected Experience, (2) returns closely related/similar Experiences based on it, (3) keeps it as the reference point for further refinement. No confirmation modal or extra input step | stays (AIT121) |
| 11 | Avatar dropdown | tap | Opens Account Dropdown | stays (opens overlay) |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Any Quick Action click auto-sends the corresponding command as a message to the AI Matching Session and is processed immediately — no confirmation modal or extra input step | Clarification |
| SR-002 | "Select Option 1/2" is a direct-select Quick Action: on click, the system auto-sends the selected match to the AI Matching Session, which then (a) displays the selected Experience's full detail, (b) returns closely related/similar Experiences based on it, and (c) retains it as the reference point for subsequent refinement/follow-up actions | Clarification |
| SR-003 | Minimum match threshold is 70%. Results below 70% are never presented as recommended matches. If no Experience reaches 70%, the screen shows the "No strong matches found" state and suggests refining the search criteria | Clarification |
| SR-004 | At most 3 match result cards are shown per AI response turn | Mockup |
| SR-005 | Agency interaction behavior within a session is recorded to update preferences and re-rank future recommendations | Screen List (EXP017) |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| `AIT FR-001` | Provides the authenticated AI Tour Matching interface for Tour Agencies. |
| `AIT FR-002` | Captures the Agency's natural-language tour requirements through the matching conversation input. |
| `AIT FR-003` | Displays AI clarification questions and allows the Agency to provide missing or refined requirements. |
| `AIT FR-005` | Presents verified Provider/Experience candidates returned by the matching process. |
| `AIT FR-006` | Surfaces route, distance, availability, capacity and other hard-constraint information used to determine eligible matches. |
| `AIT FR-007` | Displays ranked match results with match percentages and ordering produced by the matching engine. |
| `AIT FR-008` | Renders top recommendations and additional suitable options with concise match explanations. |
| `AIT FR-009` | Allows the Agency to refine requirements and regenerate recommendations within the same matching conversation. |
| `AIT FR-011` | Provides Request Quote and Chat actions from a matching recommendation without creating a Booking directly. |
| `AIT FR-012` | Displays the no-strong-match state and prompts the Agency to refine or relax its criteria when no acceptable match is returned. |
## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the inquiry-history sidebar collapses into an icon/drawer; result cards switch from a horizontal (image + text) layout to a stacked layout
- Text that must remain readable (contrast, minimum size): the match % badge and B2B net rate price need high contrast, minimum 14px

## 9. Open questions

| # | Question | Blocking? | Status |
|---|---|---|---|

None — all open questions resolved.

---

## Completion checklist

- [x] The mockup is a separate cropped image file, named with the Screen ID.
- [x] Every visible element in the mockup appears in the element inventory.
- [x] Every input element has a validation rule or an explicit "none".
- [x] All five states are filled in, or marked "not applicable" with a reason.
- [x] Every navigation target is a Screen ID that exists in the Screen List.
- [ ] Every element that displays data names the field it displays, matching the module spec. *(pending `spec-MOD3.md` for exact field mapping)*

---

Template source: DBIZ3, VJCBI College - FTU, Session 4. Built on the DBIZ2 Screen Design
structure (Screen List and Screen Layout), per DBIZ3 Syllabus v3.
