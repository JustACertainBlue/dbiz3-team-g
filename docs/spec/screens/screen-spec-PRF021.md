# Screen Spec: PRF021 Edit Agency Profile

| Field | Value |
|---|---|
| Screen ID | `PRF021` |
| Screen name | Edit Agency Profile |
| Actor | Tour Agency |
| Priority | Must |
| Belongs to module | `spec-PRF.md` |
| Mockup image | `img/PRF021.png` |
| Status | Draft |

## 1. Purpose

**Shown when:** The authorized highest-level Agency user taps "Edit Profile" on PRF019 to update company information, tour preferences/characteristics and contact information.

**The user leaves this screen when:** The user discards changes or saves the profile.

## 2. Mockup

![PRF021](img/PRF021.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Breadcrumb (Home / Travel Agencies / Agency / Edit Profile) | Navigation | Static + Agency name | Yes | — |
| 2 | Locked license badge | Text | Inbound operator license (locked) | Yes | — |
| 3 | Page title "Edit Agency Profile" + subtitle | Header | Static | Yes | — |
| 4 | Section "01. Core Legal Identity & Enterprise Details" | Header | Static | Yes | — |
| 5 | Company Legal Name (English) input | Input | `company_name` | Yes | ≤255 chars |
| 6 | Company Legal Name (Vietnamese) input | Input | `company_name` (VN) | Yes | ≤255 chars |
| 7 | Corporate Tax ID (MST) input — locked | Input | Tax ID | Yes | Read-only; editing triggers a major-change re-review if ever changed (module spec Q6) |
| 8 | Inbound Operator License No. input — locked | Input | License no. | Yes | Read-only, VNAT-audited |
| 9 | Registered Business Address / HQ input | Input | `location` | Yes | Structured address (street, ward, district, city/province) per module spec Q2 |
| 10 | Established Year input | Input | Established year | No | — |
| 11 | Operating Status field | Input | Status text | No | — |
| 12 | Verified statutory document row + "View Document" | File/Button | Uploaded registration certificate | No | — |
| 13 | "Platform Performance & Trust Accreditation" info box (read-only) | Text | Years Active, Fair Pay SLA, Hubs — computed | No | Read-only, audited quarterly |
| 14 | Section "02. Curatorial Statement & Markets" + "AI Refine Text" | Header/Button | — | Yes | AI Refine triggers FR-007, BR-012/013 |
| 15 | Curatorial Statement textarea | Input | `description` | No | ≤1000 chars |
| 16 | Core Client Demographics selectable cards (3, checkbox) | Toggle | `tour_types`-adjacent classification | No | — |
| 17 | Primary Sourcing Geographic Markets chips + "+ Add Market" | Tag list | Market list | No | — |
| 18 | Section "04. Tour Preferences & Matchmaking Criteria" | Header | Static | Yes | — |
| 19 | Frequently Sourced Group Sizes selectable cards (3, checkbox) | Toggle | `tour_types` attribute | No | — |
| 20 | Preferred Experience & Service Types selectable cards (4, checkbox) | Toggle | `tour_types` attribute | No | — |
| 21 | Target Craft Disciplines chips + "+ Add Discipline" | Tag list | `tour_types` attribute | No | — |
| 22 | Specialized Mobility & Accessibility Request Protocol textarea | Input | Free text | No | — |
| 23 | Section "03. Contact & Field Liaison" | Header | Static | Yes | — |
| 24 | Lead Tour Director fields (Name*, Title, Hanoi Hotline*, Secondary Hotline, Dispatch Email*) | Input | `contact_info` | Yes for starred fields | Hotline format; email format |
| 25 | Secondary Field Liaison fields (Name, Role, Email) | Input | `contact_info` | No | Email format |
| 26 | Average Response Velocity SLA input | Input | SLA text | No | — |
| 27 | "Verified Operator Badge Active" box (read-only) | Text | Compliance badge | No | — |
| 28 | Autosave status line | Text | "Last autosaved Xm ago" | Yes | — |
| 29 | "Discard Changes" button | Button | — | Yes | Confirms if dirty |
| 30 | "Save Agency Profile" button | Button | — | Yes | Validates required fields; triggers HDT re-review if Company Name or Tax ID changed (BR — module spec Q6) |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | Fully pre-filled form matching the saved Agency profile, as in the mockup | Editing an existing profile |
| Empty (no data) | Optional fields (Curatorial Statement, preference chips, Secondary Liaison) render blank with placeholder guidance; required Legal Identity fields must already be filled from Registration (F-AUTH-02) so this section is never blank | First edit after registration, before any optional fields have been set |
| Loading | Skeleton form while the profile loads; autosave indicator shows "Saving…" during background autosave; "Save Agency Profile" shows a spinner while saving | Screen opens; autosave fires; explicit save submitted |
| Error | Inline field-level errors (required field empty, invalid email/phone format); a top banner if the save conflicts with a concurrent edit | Validation fails; save request fails |
| Success / confirmation | Toast "Profile saved," autosave timestamp updates; if Company Name or Tax ID changed, an additional notice explains the change was submitted for HDT re-review | Save succeeds |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | "Discard Changes" | tap | Confirms, reverts unsaved edits | `PRF019` |
| 2 | "Save Agency Profile" | tap | Validates and saves. If the change is a major change (Company Name or Tax ID), a blocking confirmation modal informs the user the changes will trigger re-review; the user must confirm before the changes are submitted for re-review | `PRF019` |
| 3 | "AI Refine Text" | tap | Sends the curatorial statement for AI drafting (FR-007) | stays (inline) |
| 4 | Selectable demographic/preference cards | tap | Toggles selection | stays |
| 5 | "+ Add Market" / "+ Add Discipline" | tap | Opens a picker and adds the chip | stays |
| 6 | Chip remove (×) | tap | Removes that market/discipline | stays |
| 7 | "View Document" | tap | Opens the registration PDF | stays (opens file) |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Only the authorized highest-level Agency user can reach and submit this form. Non-highest-level Agency staff cannot access this screen at all — it is fully inaccessible rather than read-only. | Screen List overview, module spec Q7 |
| SR-002 | An Agency can save only its own profile. | BR-001 |
| SR-003 | Corporate Tax ID and Inbound Operator License No. are locked/read-only in this form. | Mockup (locked badges) |
| SR-004 | Changing Company Name or Tax ID is a major change and triggers HDT re-review. | Module spec Q6 (Closed) |
| SR-005 | AI-refined text never auto-replaces the saved Curatorial Statement without explicit Provider/Agency acceptance. | BR-011, BR-012, BR-013 |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| FR-002 | Allows the authorized Agency user to update its own permitted Agency profile information. |
| FR-007 | Provides inline AI-refined drafting for the Curatorial Statement. |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the two-column section layout (01/02/04 main column vs. 03 sidebar) stacks to a single column; selectable-card grids drop to one card per row.
- Text that must remain readable (contrast, minimum size): "Locked"/"VNAT Audited" tags and the read-only Platform Performance box must be visually distinguishable from editable fields (e.g., muted background) at all widths.

## 9. Open questions

| # | Question | Blocking? | Status |
|---|---|---|---|
| 1 | After saving a major change, a blocking confirmation modal informs the user that the changes will trigger re-review. The user must confirm before the changes are submitted for re-review. | Yes | Closed |
| 2 | Non-highest-level Agency staff cannot access this screen. It is fully inaccessible rather than read-only. | No | Closed |

---

## Completion checklist

- [x] The mockup is a separate cropped image file, named with the Screen ID.
- [x] Every visible element in the mockup appears in the element inventory.
- [x] Every input element has a validation rule or an explicit "none."
- [x] All five states are filled in, or marked "not applicable" with a reason.
- [x] Every navigation target is a Screen ID that exists in the Screen List.
- [x] Every element that displays data names the field it displays, matching the module spec.
