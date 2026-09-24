# Screen Spec: VER119 Account Information

| Field | Value |
|---|---|
| Screen ID | `VER119` |
| Screen name | Account Information |
| Actor | HDT Admin / UBND Admin |
| Priority | Must |
| Belongs to module | `spec-AUT.md` |
| Mockup image | `img/VER119.png` |
| Status | Approved |

## 1. Purpose

**Shown when:** Admin clicks "Verify" on a pending row in User Management (ADM095) and is on the "Account Info" tab of the verification modal.

**The user leaves this screen when:** They click "Reject", the (×) icon, switch to the "Submitted Profile" tab, or click "Verify" to finalize verification.

## 2. Mockup

![VER119](img/VER119.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Avatar initials | Image/Text | Initials from `user.full_name` | No | — |
| 2 | User name | Text | `user.full_name` | No | — |
| 3 | Role badge | Badge | `user.role` e.g. PROVIDER | No | — |
| 4 | Email | Text | `user.email` | No | — |
| 5 | Close (×) | Button | Dismisses modal | No | — |
| 6 | Tab: Submitted Profile | Tab | Switches to submitted profile view | No | — |
| 7 | Tab: Account Info (active) | Tab | Currently selected system-level info view | No | — |
| 8 | Full Name row | Text | `user.full_name` | No | — |
| 9 | Email row | Text | `user.email` | No | — |
| 10 | Organization row | Text | `user.organization` | No | — |
| 11 | Role row | Badge | `user.role` | No | — |
| 12 | Account ID row | Text | `user.account_id` | No | — |
| 13 | Registered row | Text (date) | `user.registered_date` | No | — |
| 14 | Approval disclaimer text | Text | "Approving this account grants full platform access. Confirm all documents and profile fields have been reviewed." | No | — |
| 15 | Reject | Button (secondary) | Rejects the account application | No | — |
| 16 | Verify | Button (primary) | Approves and verifies the account | No | Should be reviewed alongside the Submitted Profile tab before use |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | System-level info as shown, with both Reject and Verify enabled | Verification modal opens for a pending account |
| Empty (no data) | Organization shows "—" if not yet linked; this state is uncommon for a submitted account | Incomplete account record |
| Loading | Skeleton in place of the info rows while fetching; Reject and Verify disabled while loading | Modal just opened, before data returns |
| Error | Banner inside modal "Could not load account information. Retry."; Reject and Verify disabled until data loads | Account data fetch fails |
| Success / confirmation | On Verify: modal closes, toast "{name} verified and account activated", row moves from Pending Verification to All Accounts with status Active. On Reject: modal closes, toast "{name}'s application was rejected", account status becomes Rejected | Reject or Verify succeeds |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | Tab: Submitted Profile | tap | Switches modal content to the submitted business profile | `VER146` |
| 2 | Close (×) | tap | Closes modal without any change | `ADM095` |
| 3 | Reject | tap | Marks the account as Rejected; user is notified by email | `ADM095` (modal closes, table refreshes) |
| 4 | Verify | tap | Confirms and activates the account | `ADM095` (modal closes, table refreshes) |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Displays system-level account information for verification reference (account ID, role, registration date) | Screen List Screen Overview for VER119 |
| SR-002 | Verify grants full platform access — the Admin is warned before confirming | Mockup — disclaimer text above the action buttons |
| SR-003 | This is the same underlying modal as ADM118, but entered via the "Verify" action instead of "View", which replaces the plain Close action with Reject and Verify | Comparing ADM118 (Close only) with this mockup (Reject / Verify) |
| SR-004 | Both Reject and Verify are available from either tab (Account Info or Submitted Profile) of the verification modal | Updated mockup shows Reject/Verify on both VER119 and VER146 |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| F-AUTH-18 | Displays the submitted Agency company/legal information, registration documents, and account information that HDT reviews before recording an Approve / Request More Information / Reject decision. Applies to Agency accounts under review; see §9 for the open question on whether Local Provider accounts reach this same screen |

Note: F-AUTH-18 names three possible decisions (Approve, Request More Information, Reject), but this screen (and VER146) currently exposes only two actions, Reject and Verify — see §9.

## 8. Responsive and accessibility notes

- Smallest supported width: 1024px (admin tool)
- What collapses or stacks on a narrow screen: modal becomes full-screen sheet; action buttons remain side by side unless very narrow
- Text that must remain readable (contrast, minimum size): disclaimer text ≥13px with sufficient contrast to be noticed before approving

## 9. Open questions

| # | Question | Blocking? | Status |
|---|---|---|---|
| 1 | Is there a "Reject" action available from this screen, or only from the Submitted Profile tab (VER146)? | Yes | Resolved — Reject is available from both tabs, see updated mockup and SR-004 |
| 2 | [NEEDS CLARIFICATION: Does Reject require a reason/comment to be entered, or does it apply immediately with no additional input?] | No | Open — module spec Open Q12 confirms no review-comment is required for Reject/Request More Information, but does not resolve whether Reject needs a UI confirmation step here. |
| 3 | Module spec function F-AUTH-18 (formerly FR-018/US-6, UC-ACC-06) defines **three** HDT decisions on a pending Agency — Approve, Request More Information, and Reject — but this mockup and VER146 only offer two actions (Reject / Verify). No "Request More Information" control appears in either mockup. | Yes | Still open — needs a UI mockup for the Request More Information action (and, per module spec, this leaves the Agency's status unchanged at `Pending Approval` rather than moving to Verified/Rejected) before F-AUTH-18 can be fully implemented. |

---

## Completion checklist

- [x] The mockup is a separate cropped image file, named with the Screen ID.
- [x] Every visible element in the mockup appears in the element inventory.
- [x] Every input element has a validation rule or an explicit "none".
- [x] All five states are filled in, or marked "not applicable" with a reason.
- [x] Every navigation target is a Screen ID that exists in the Screen List.
- [x] Every element that displays data names the field it displays, matching the module spec.
