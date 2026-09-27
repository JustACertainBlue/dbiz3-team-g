# Screen Spec: DSH018 Local Provider Dashboard

| Field | Value |
|---|---|
| Screen ID | `DSH018` |
| Screen name | Local Provider Dashboard |
| Actor | Local Provider |
| Priority | Must |
| Belongs to module | `spec-PRF.md` |
| Mockup image | `img/DSH018.png` |
| Status | Draft |

## 1. Purpose

**Shown when:** A Local Provider logs in; this is the main entry point of the Local Provider Portal, giving an overview of Experiences, bookings, schedule, conversations, and pending actions.

**The user leaves this screen when:** The Provider taps a nav item, a "View Booking Details" link, a quote row's Chat action, or "Mark Group Arrival."

## 2. Mockup

![DSH018](img/DSH018.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Global nav (Dashboard, Experience Management, Booking, Schedule, Messages) | Header | Static links | Yes | — |
| 2 | User identity block | Header | Logged-in Provider user name, title, avatar | Yes | — |
| 3 | Scope breadcrumb (Village / Heritage Zone / Cooperative) | Navigation | `Village` + Heritage Zone + Provider org name | Yes | — |
| 4 | Page subtitle "Atelier Operations Control" | Text | Static | No | — |
| 4a | "+ New Experience Slot" button | Button | Shortcut to create a new Experience/slot | No | — |
| 5 | Stat card [01]: Active Experiences | Card | Label "Master Atelier Programs"; count of Published `Experience` records belonging to this Provider (FR-006 data); "N verified slots published" sub-line; capacity % | Yes | — |
| 6 | Stat card [02]: Gross Booking Volume | Card | Label "B2B Agency Inbound & Contracts"; aggregated booking value for the current quarter with period-over-period % change; "received this month" sub-line (Booking module, out of PRF scope) | Yes | — |
| 7 | Stat card [03]: Confirmed Pax & Delegations | Card | Label "Upcoming Operating Capacity"; total confirmed pax; delegation count scheduled; "+N New Today" sub-line (Booking module, out of PRF scope) | Yes | — |
| 8 | "Today's Schedule" date selector | Input | Date, defaults to current day | Yes | Valid calendar date |
| 9 | Schedule entry card (Morning, Completed) | Card | Time range, Experience title, lead artisan + partner agency, pax count, delegation name, status badge | Yes | — |
| 9a | "Tour wrapped at [time]" note | Text | Completion timestamp, shown only on Completed entries | No | — |
| 10 | Schedule entry card (Afternoon, Waiting for Arrival) | Card | Time range, Experience title, lead artisan + partner agency, pax count, delegation/partner name, status badge; visually highlighted (bordered) while action is pending | Yes | — |
| 11 | "Mark Group Arrival" button | Button | Triggers arrival confirmation | Yes | Only enabled while status = Waiting for Arrival |
| 12 | "View Booking Details" link | Link | Navigates to booking detail for that schedule entry | Yes | — |
| 13 | "Platform Capacity & SLA" panel header | Text | "Operational Capacity & Health" + "Platform Capacity & SLA" | No | — |
| 13a | Avg. Quote Response Time metric | Text | Value + SLA target reference (e.g. "45 Mins (Fast)" vs "B2B Agency SLA Target: < 2h") | No | — |
| 13b | Daily Workshop Slots Open metric | Text | Live count of remaining slots for the day | No | — |
| 14 | Verified guild badge box | Card | `Local Provider Profile.verification_status` = Verified, cooperative name, registry ID, guild tier | Yes | — |
| 15 | "Active Hold Allotments Countdown (<24H)" section header + count badge | Header/Badge | Static title; badge = live count of `Booking.status == On Hold` for this Provider; helper note "Auto-releases back to public atelier inventory upon expiration" | Yes | Count is a non-negative integer, equals row count below |
| 16 | Hold Allotments row | List row | Booking ID, Experience title, Agency/partner name + pax | Yes | One row per On Hold booking belonging to this Provider |
| 16a | Hold countdown timer (per row) | Component | Time remaining until the 72h hold auto-expires (e.g. "04h : 18m : 42s"); urgency tag "URGENT" when <6h remaining, "<24H" otherwise (see BKG135 SR-007 for the same countdown behavior) | Yes | Counts down live; row is removed from this list once the hold expires or the booking is confirmed |
| 17 | "Inbound Queue & Quote Requests" section with status filter tabs | Tabs | "All (N)" / "Pending Quote (N)" / "Quote Sent (N)" / "Confirmed (N)" counts | Yes | — |
| 18 | Quote requests table | List | Agency/partner name + request ID + rep name, Experience & itinerary + note, date & slot, pax, quote status (+ sub-text e.g. "Received Nh ago" / amount pending confirmation / "Paid & Roster Locked"), est. value | Yes | — |
| 19 | Row action button (Chat / Chat with [Name]) | Button | Opens Chat thread with that row's agency | Yes | — |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | Populated stat cards, today's schedule with 2 sessions, an Active Hold Allotments Countdown list with 2 rows, and a 4-row quote request table, as in the mockup | Provider has active data for today |
| Empty (no data) | Stat cards show 0 with neutral styling; "Today's Schedule" shows "No sessions scheduled today"; Active Hold Allotments Countdown section shows count badge "0" and "No active holds right now"; quote table shows "No inbound requests yet" | New Provider, or a day with no bookings/holds/quotes |
| Loading | Skeleton placeholders for the 3 stat cards, the 2 schedule cards, the Hold Allotments rows, and the quote table rows | Dashboard just opened |
| Error | Inline error banner per widget that failed to load (e.g. "Couldn't load today's schedule — Retry") rather than a full-page error, so unaffected widgets still render | One or more data sources (Booking, Schedule, Messages) fail to respond |
| Pending Verification | A banner is shown on the dashboard (in addition to PRF127) indicating the profile is under review; editing remains available via PRF128, but the profile cannot be listed until approved | `Local Provider Profile.verification_status = Pending Verification` |
| Revision Required | A banner is shown on the dashboard (in addition to PRF127) with the revision feedback and an "Edit Profile" action to address the required changes and resubmit | `Local Provider Profile.verification_status = Revision Required` |
| Success / confirmation | Toast "Group arrival confirmed" and the Afternoon card's status badge updates from "Waiting for Arrival" to the next stage | After "Mark Group Arrival" is confirmed |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | Nav: Experience Management | tap | Opens Experience list | `EXP067` |
| 2 | Nav: Booking | tap | Opens Booking Management | `BKG133` |
| 3 | Nav: Schedule | tap | Opens Provider Schedule | `SCH139` |
| 4 | Nav: Messages | tap | Opens Chat | `COM065` |
| 5 | "View Booking Details" | tap | Opens that booking | `BKG135` |
| 6 | "Mark Group Arrival" | tap | Confirms arrival and advances booking status | `BKG136` (action, stays / returns here) |
| 7 | Quote table "Chat" / "Chat with [Name]" | tap | Opens the Chat thread for that quote request's agency | `COM065` |
| 7a | Hold Allotments row (anywhere on the row, e.g. #BKG-8409) | tap | Opens the Chat thread scoped to that booking's Agency, per the (Agency, Local Provider) chat-thread scoping rule (see `screen-spec-COM065.md` / F-EXPLORE-11) — not a new booking-specific thread | `COM065` |
| 8 | Filter tabs (All/Pending/Sent/Confirmed) | tap | Filters the quote table | stays |
| 9 | Date selector | change | Reloads the Today's Schedule cards for the selected date | stays |
| 10 | Avatar | tap | Opens account dropdown | Account Dropdown (—) |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Only data belonging to the logged-in Provider (and its scope: Village/Cooperative) is shown. | BR-002 |
| SR-002 | The verified guild badge reflects the Provider's own `verification_status`; if the status is Pending Verification or Revision Required, the dashboard surfaces that state prominently via a banner (shown here, in addition to PRF127) rather than the Verified badge. | BR-006, BR-007 |
| SR-003 | The Active Hold Allotments Countdown section lists only this Provider's own On Hold bookings; a row disappears from the list as soon as its hold expires (auto-released back to public inventory) or the booking moves to Confirmed. This is the Dashboard-level surface of the same 72h Hold mechanism countdown as `BKG135` SR-007. | F-SCHED-03/08; resolves the "no screen shows the 72h Hold expiry warning" gap |
| SR-004 | Tapping anywhere on a Hold Allotments row opens the Chat thread for that booking's Agency (via `COM065`); it opens the existing (Agency, Local Provider) thread, not a booking-specific one, consistent with the chat-thread scoping rule established for quote requests (F-EXPLORE-11) | Clarification |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| FR-006 | Surfaces a count of the Provider's own Active/Published Experiences as an at-a-glance widget; deep management happens on EXP067. |

No FR in the Profile Management module governs booking volume, schedule, or the quote-request queue directly — Booking Management and Schedule are explicitly out of scope for this module (see module spec §1 "Out of scope"). Those widgets are cross-module and should be traced against the Booking/Schedule module specs, not `spec-PRF.md`.

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the 3 stat cards stack to a single column; the "Today's Schedule" / "Platform Capacity & SLA" two-column layout stacks; the quote table becomes horizontally scrollable within its own container.
- Text that must remain readable (contrast, minimum size): status badges ("Completed," "Waiting for Arrival," "Needs Quote," "Confirmed") must be distinguishable by more than color alone (icon + label, as shown).

## 9. Open questions

| # | Question | Blocking? | Status |
|---|---|---|---|
| 1 | `[NEEDS CLARIFICATION: which FR/module owns the Dashboard's booking-volume, quote-queue, and Hold Allotments widgets — is DSH018 formally in scope of a Booking/Schedule module spec, and should this file's FR table instead point there?]` | Yes | Open |
| 2 | A banner is shown here on the dashboard (not only on PRF127) when `verification_status` is Pending Verification or Revision Required. | No | Closed |
| 3 | Added per mockup update: the Active Hold Allotments Countdown section and its tap-to-chat interaction (SR-003, SR-004) | No | Closed — matches new mockup |

---

## Completion checklist

- [x] The mockup is a separate cropped image file, named with the Screen ID.
- [x] Every visible element in the mockup appears in the element inventory.
- [x] Every input element has a validation rule or an explicit "none."
- [x] All five states are filled in, or marked "not applicable" with a reason.
- [x] Every navigation target is a Screen ID that exists in the Screen List.
- [x] Every element that displays data names the field it displays, matching the module spec.
