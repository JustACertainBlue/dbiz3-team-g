# Screen Spec: BKG136 Confirm Group Arrival

| Field | Value |
|---|---|
| Screen ID | `BKG136` |
| Screen name | Confirm Group Arrival |
| Actor | Local Provider |
| Priority | Must |
| Belongs to module | `spec-SCH.md` |
| Mockup image | `img/BKG136.png` |
| Status | Draft |

## 1. Purpose

**Shown when:** The Local Provider clicks "Mark Group Arrival" from BKG133 (Booking Management row action) or BKG135 (Booking Detail header action). Renders as a modal overlaying the underlying screen.

**The user leaves this screen when:** They click "Mark as Arrived" (confirms and closes), "Cancel" (closes without change), or the "×" close icon (closes without change).

## 2. Mockup

![BKG136](img/BKG136.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Dimmed background overlay | Overlay | The underlying Booking Management screen (BKG133), dimmed and inert | Yes | Background is non-interactive while modal is open |
| 2 | Modal container | Panel | White card centered on screen | Yes | Traps focus while open |
| 3 | Tag: CHECK-IN | Badge | Static label indicating modal purpose | No | — |
| 4 | Ref label | Text | "REF // #BKG-8409" | Yes | Matches the booking this modal was opened from |
| 5 | Close icon | Icon button | "×" top-right | Yes | Closes modal without saving, same as Cancel |
| 6 | Modal title | Header | "Confirm Group Arrival" | Yes | — |
| 7 | Confirmation question | Text | "Are you sure you want to mark this group as arrived?" | Yes | — |
| 8 | Info card: Experience | Text (label + value) | "Experience: Traditional Jacquard Silk Loom Weaving" | Yes | Read-only, derived from the booking |
| 9 | Info card: Group | Text (label + value) | "Group: Swiss Eco Collectors Club (08 Pax)" | Yes | Read-only, derived from the booking |
| 10 | Cancel button | Button | Secondary style | Yes | Closes modal, no state change |
| 11 | Mark as Arrived button | Button | Primary (dark) style, with checkmark icon | Yes | Enabled by default; triggers the confirm action, which increments the booking's arrival progress (e.g. 1/2, 2/2 slots); action cannot be undone once submitted |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | Modal open with Experience and Group pre-filled from the selected booking, both buttons enabled | Modal opened from BKG133 or BKG135 |
| Empty (no data) | Not applicable — the modal only opens for a specific, already-loaded booking, so Experience/Group are always populated | N/A |
| Loading | "Mark as Arrived" button shows a spinner/disabled state while the update request is in flight; Cancel remains disabled during submission | User has just clicked "Mark as Arrived" |
| Error | Inline error text below the info card (e.g. "Couldn't update this booking, please try again") with "Mark as Arrived" re-enabled for retry | The confirm-arrival API call fails |
| Success / confirmation | Modal closes automatically; the underlying screen shows the booking's status/action updated (row no longer shows "Mark Group Arrival"; a success toast appears) | Confirm-arrival API call succeeds |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | Mark as Arrived | tap | Submits the arrival confirmation; updates booking progress/status | closes modal, stays on `BKG133` or `BKG135` (whichever it was opened from) |
| 2 | Cancel | tap | Closes the modal, discards nothing (no state was changed) | closes modal, stays on `BKG133` or `BKG135` |
| 3 | Close icon (×) | tap | Same as Cancel | closes modal, stays on `BKG133` or `BKG135` |
| 4 | Click outside modal / overlay | tap | Same as Cancel (standard modal dismiss pattern) | closes modal, stays on `BKG133` or `BKG135` |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | This modal is only reachable for bookings currently in Confirmed status; it is not offered for On Hold, Completed, or Cancelled bookings | Cross-reference with BKG133/BKG135 |
| SR-002 | Confirming arrival is a one-way action — once marked, the "Mark Group Arrival" trigger is no longer available for that booking | Booking status forward-only rule |
| SR-003 | The modal must always echo the correct booking's Experience and Group so the provider cannot mistakenly confirm the wrong group | Mockup: Ref label ties content to the specific booking |
| SR-004 | Marking Group Arrival updates the booking's completion progress. If a booking has multiple operating slots, each marked slot counts toward the total (e.g. 1/2, 2/2). The booking's overall Status changes to "Completed" only once all booked slots have been marked as arrived | Clarification (Module 5) |
| SR-005 | There is no undo window after marking a slot as arrived; the action is permanent, consistent with the forward-only status lifecycle | Clarification (Module 5) |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| FR-006 | Lets the Local Provider mark Group Arrival on/after tour start, changing a Confirmed booking's progress toward Completed (F-SCHED-06) |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: modal becomes full-width/near-full-height with the same vertical stacking of elements; Cancel and Mark as Arrived buttons may stack full-width instead of side by side
- Text that must remain readable (contrast, minimum size): the confirmation question and info card values must remain legible; the dimmed overlay must retain enough contrast against the modal so the modal edges are clear

## 9. Open questions

| # | Question | Blocking? | Status |
|---|---|---|---|
| 1 | [NEEDS CLARIFICATION: Does confirming arrival here also change the booking's overall Status badge (e.g. to "In Progress"), or only an internal "progress" field distinct from Status?] **Resolved:** It updates the booking's completion progress (e.g. 1/2, 2/2 slots marked). The overall Status only changes to "Completed" once all booked slots have been marked as arrived. | Yes | Resolved |
| 2 | [NEEDS CLARIFICATION: Is there an "undo" window after marking arrived in case of provider error, given status changes cannot revert?] **Resolved:** No, there is no undo. | No | Resolved |

---

## Completion checklist

- [x] The mockup is a separate cropped image file, named with the Screen ID.
- [x] Every visible element in the mockup appears in the element inventory.
- [x] Every input element has a validation rule or an explicit "none".
- [x] All five states are filled in, or marked "not applicable" with a reason.
- [x] Every navigation target is a Screen ID that exists in the Screen List.
- [x] Every element that displays data names the field it displays, matching the module spec.
