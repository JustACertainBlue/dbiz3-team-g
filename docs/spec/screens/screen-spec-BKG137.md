# Screen Spec: BKG137 Booking History

| Field | Value |
|---|---|
| Screen ID | `BKG137` |
| Screen name | Booking History |
| Actor | Tour Agency |
| Priority | Must |
| Belongs to module | `spec-BKG.md` |
| Mockup image | `img/BKG137.png` |
| Status | Draft |

## 1. Purpose

**Shown when:** The Tour Agency user selects "Bookings" from the main navigation of the B2B Travel Agency Portal.

**The user leaves this screen when:** They click "View" on a booking row (→ BKG138), use a filter tab/search/date range (stays), or navigate away via the top nav (Explore, AI Tour Matching, Schedule, Messages) or avatar menu.

## 2. Mockup

![BKG137](img/BKG137.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Top nav bar | Header | Logo "Hanoi Artisan Bridge" + "B2B Travel Agency Portal" subtitle; links Explore / AI Tour Matching (AI tag) / Bookings (active) / Schedule / Messages | Yes | Active tab reflects current route |
| 2 | User menu | Header | Agency name ("Indochina Heritage Voyages"), ID (VN-9042), notification bell, avatar initials "IH" | Yes | — |
| 3 | Breadcrumb | Text | "B2B Wholesale Portal / Allotment Records" | No | — |
| 4 | Page title | Header | "Booking History" | Yes | — |
| 5 | Page description | Text | Static subtitle | No | — |
| 6 | Status filter tabs | Toggle/List | All (12) / Confirmed (8) / On Hold (2) / Completed (1) / Cancelled (1) | Yes | Exactly one tab active; counts sum to All |
| 7 | Search input | Input | Placeholder "Search ID or delegation..." | No | Free text, live-filters table |
| 8 | Date range picker | Input | Displays selected range (Oct 01, 2024 – Nov 30, 2024) | No | Start date ≤ end date |
| 9 | Booking table header | Header | Columns: Booking ID, Experience/Atelier, Date & Slot, Group Size, Net Rate Total, Status, Actions | Yes | — |
| 10 | Table row (repeating) | List item | Booking ID (`#BKG-nnnn`) + internal ref; Experience/Atelier name + village/cluster; Date, time, slot label; Pax count + delegation name; Net Rate Total (currency); Status badge (Confirmed (72H Hold) / Confirmed (Paid) / On Hold) | Yes | Status badge color-coded; amounts right-aligned |
| 11 | Row action: View | Button | All rows | Yes | Navigates to BKG138 |
| 12 | Pagination | Component | "Showing 1–5 of 12 wholesale bookings", Previous / page numbers (1,2,3) / Next | Yes | Current page highlighted; Previous disabled on page 1 |
| 13 | Footer | Footer | Company info, Operator Compliance / Master Village Codex / B2B Dispatch Support links, copyright | No | — |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | Table populated with all of the Agency's bookings for the current filter/date range | Screen load with existing bookings |
| Empty (no data) | Table area shows an empty-state message (e.g. "You haven't booked any experiences yet") with a link to Explore; filter tabs show (0) | Agency has no bookings, or active filter/search/date range returns no matches |
| Loading | Table rows show skeleton placeholders; filter tabs and search remain visible but inert | Screen mount, or after changing filter/date range/search |
| Error | Table area replaced by an inline error message ("Couldn't load booking history") with a Retry action | API/network failure fetching bookings |
| Success / confirmation | Not applicable on this list view itself — confirmations happen on BKG138/Chat; this screen only reflects updated status on return | Booking status changed elsewhere and user returns to this list |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | Booking row / View button | tap | Loads full booking detail from the Agency's perspective | `BKG138` |
| 2 | Filter tab | tap | Table re-filters to the selected status | stays on `BKG137` |
| 3 | Search input | type | Table filters live by Booking ID / delegation match | stays on `BKG137` |
| 4 | Date range picker | tap → pick dates | Table recomputes for the new range | stays on `BKG137` |
| 5 | Pagination controls | tap | Loads the corresponding page of results | stays on `BKG137` |
| 6 | Top nav links | tap | Navigates to the selected module | Explore / AI Tour Matching / `SCH141` / Messages |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Status shown here must always match the Local Provider's status for the same booking (data is shared, not duplicated independently) | Cross-screen consistency with BKG133 |
| SR-002 | Filter tab counts and pagination total must always reconcile (sum of tab counts = All count) | Data integrity |
| SR-003 | This is a read/navigate-only list — no status-changing actions are available directly on this screen; the Agency cannot cancel a booking from here or from BKG138 — any change request goes through Chat with the Local Provider | Mockup shows only "View" as a row action; Clarification (Module 5) |
| SR-004 | The module spec's "Pending" status is reconciled to the "On Hold" label used in this screen's filter tabs and status badges (same underlying state, unified naming) | Clarification (Module 5) |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| FR-002 | Lists the Agency's own bookings, by status, drawn from the same "Agency's private schedule" data FR-002 defines (best-fit mapping — the module spec has no separate FR for a tabular booking-history view; see note to BA) |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the table becomes horizontally scrollable or collapses to stacked cards per booking; search and date range stack above the filter tabs
- Text that must remain readable (contrast, minimum size): status badges must retain sufficient contrast at small size

## 9. Open questions

| # | Question | Blocking? | Status |
|---|---|---|---|
| 1 | [NEEDS CLARIFICATION: Is "Pending" (per module spec wording) the same state as "On Hold" (as labeled in this mockup)? Naming should be reconciled.] **Resolved:** Yes, same state; reconciled as "On Hold" per this screen's labeling. | Yes | Resolved |
| 2 | [NEEDS CLARIFICATION: Can the Agency cancel a booking from this list, or only from BKG138/Chat?] **Resolved:** No — the Agency cannot cancel from this list or from BKG138; they can only reach out via Chat to ask the provider for changes. | No | Resolved |

---

## Completion checklist

- [x] The mockup is a separate cropped image file, named with the Screen ID.
- [x] Every visible element in the mockup appears in the element inventory.
- [x] Every input element has a validation rule or an explicit "none".
- [x] All five states are filled in, or marked "not applicable" with a reason.
- [x] Every navigation target is a Screen ID that exists in the Screen List.
- [x] Every element that displays data names the field it displays, matching the module spec.
