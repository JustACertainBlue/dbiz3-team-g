# Screen Spec: SCH141 Agency Schedule

| Field | Value |
|---|---|
| Screen ID | `SCH141` |
| Screen name | Agency Schedule |
| Actor | Tour Agency |
| Priority | Must |
| Belongs to module | `spec-BKG.md` |
| Mockup image | `img/SCH141.png` |
| Status | Draft |

## 1. Purpose

**Shown when:** The Tour Agency user selects "Schedule" from the main navigation to view their own private calendar of confirmed bookings and collaboration details.

**The user leaves this screen when:** They navigate away via the top nav (Explore, AI Tour Matching, Bookings, Messages) or avatar menu. (No create/edit action exists on this screen per the mockup — it is populated only by provider-side booking actions.)

## 2. Mockup

![SCH141](img/SCH141.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Top nav bar | Header | Logo, nav links (Explore / AI Tour Matching / Bookings / Schedule active / Messages), Agency identity | Yes | — |
| 2 | Page title | Header | "Agency Operating Schedule & Delegation Calendar" | Yes | — |
| 3 | Page description | Text | Static subtitle | No | — |
| 4 | View toggle | Toggle | Week / Day / Timeline | Yes | Exactly one active |
| 5 | Month navigator | Control | "October 2024" with prev/next chevrons | Yes | Changes displayed month |
| 6 | Calendar grid | Calendar | 7-column month grid; each day cell shows the Agency's own delegation chips (e.g. "10 Pax Swiss Eco", "14 Pax French (Bat Trang)") | Yes | Shows only this Agency's own bookings across all providers |
| 7 | Day cell indicator dot | Icon | Small dot on days with multiple/active items (Oct 24, Oct 26) | No | — |
| 8 | Selected day highlight | State | Border/highlight on the currently selected cell (Oct 24) | Yes | Exactly one cell selected at a time |
| 9 | Panel: Selected Dispatch Date | Card | Date label, Agency ID chip ("ID: VN-9042") | Yes | Reflects the selected calendar cell |
| 10 | Active Delegation card | Card | Delegation name/pax, Status badge ("Confirmed"), Master Workshop Allotment description | Yes | Reflects the corresponding booking's status |
| 11 | Time slot entry (Morning) | List item | Time range, title, description, Coach/Guide info | Yes | Read-only |
| 12 | Time slot entry (Afternoon) | List item | Time range, title, description, Coach/Guide info | Yes | Read-only |
| 13 | Panel: Upcoming Delegations Roster | Card | Month label, subtitle, "Total Active Pax" summary | Yes | — |
| 14 | Roster table header | Header | Columns: Date, Delegation Name, Cluster/Workshop, Pax, Lead Guide, Status | Yes | — |
| 15 | Roster row (repeating) | List item | Date; Delegation Name; Cluster/Workshop; Pax; Lead Guide; Status badge (Confirmed / Active Today) | Yes | Status must match provider-side status for the same booking |
| 16 | Footer | Footer | Company info, links, copyright | No | — |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | Calendar populated with the Agency's own confirmed delegation chips for the month; a day pre-selected (today or nearest active day) with its detail panel and roster table shown | Screen load with existing confirmed bookings |
| Empty (no data) | Calendar shows no chips; selected-day panel shows "No delegation scheduled for this date"; roster table shows "No upcoming delegations" with a link to Explore/Bookings | Agency has no confirmed bookings in the displayed month |
| Loading | Calendar cells and the right-hand detail panel show skeleton placeholders; view toggle and month navigator remain interactive but data is stale until load completes | Screen mount, or after changing month/view |
| Error | Calendar and roster areas replaced by an inline error message ("Couldn't load your schedule") with a Retry action | API/network failure fetching schedule data |
| Success / confirmation | The calendar and roster update automatically (no manual action needed here) the moment a Local Provider creates or confirms a booking, per the sync rule | A Local Provider creates/confirms a booking involving this Agency, syncing to this screen |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | Day cell | tap | Selects that day; right panel updates to show that day's delegation and slots | stays on `SCH141` |
| 2 | View toggle (Week/Day/Timeline) | tap | Changes calendar layout granularity | stays on `SCH141` |
| 3 | Month navigator | tap | Moves the calendar to the previous/next month | stays on `SCH141` |
| 4 | Roster row | — | Informational only; the roster table is not clickable and does not navigate to a booking detail screen | N/A |
| 5 | Top nav links | tap | Navigates to the selected module | Explore / AI Tour Matching / `BKG137` / Messages |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | This screen is private to the Agency and shows only the Agency's own bookings and collaboration details, across all Local Providers | Explicit in Screen List description for SCH141 |
| SR-002 | This calendar is synchronized automatically after a Local Provider creates/confirms a booking; the Agency cannot directly create or edit entries here | Explicit in Screen List: "synchronized after a Local Provider creates/confirms a booking" |
| SR-003 | Status badges shown here must always match the corresponding provider-side booking status (no independent state) | Cross-screen consistency with BKG133/SCH139 |
| SR-004 | Only fully Confirmed delegations appear on this screen (in the calendar chips and the roster table); On Hold / Pending bookings are not shown here | Clarification (Module 5) |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| FR-002 | Shows the Agency's own bookings and collaboration details in calendar form |
| FR-008 | Keeps the Agency's schedule synchronized with Local Provider booking actions |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the month calendar grid and the right-hand detail panel stack vertically; the roster table becomes horizontally scrollable or collapses to stacked cards
- Text that must remain readable (contrast, minimum size): day-cell delegation chips must remain legible at small size; status badges must not rely on color alone

## 9. Open questions

| # | Question | Blocking? | Status |
|---|---|---|---|
| 1 | [NEEDS CLARIFICATION: Are roster rows clickable to open Booking Detail (BKG138), as assumed here, or is this table purely informational?] **Resolved:** Purely informational; roster rows are not clickable. | No | Resolved |
| 2 | [NEEDS CLARIFICATION: Does this screen include On Hold / Pending delegations, or only fully Confirmed ones, given the description says "confirmed bookings"?] **Resolved:** Only fully Confirmed delegations are shown. | Yes | Resolved |

---

## Completion checklist

- [x] The mockup is a separate cropped image file, named with the Screen ID.
- [x] Every visible element in the mockup appears in the element inventory.
- [x] Every input element has a validation rule or an explicit "none".
- [x] All five states are filled in, or marked "not applicable" with a reason.
- [x] Every navigation target is a Screen ID that exists in the Screen List.
- [x] Every element that displays data names the field it displays, matching the module spec.
