# Screen Spec: ACC130 Edit My Account

| Field | Value |
|---|---|
| Screen ID | `ACC130` |
| Screen name | Edit My Account |
| Actor | All Authenticated Users |
| Priority | Must |
| Belongs to module | `spec-AUT.md` |
| Mockup image | `img/ACC130.png` |
| Status | Draft |

## 1. Purpose

**Shown when:** User clicks Edit My Account from ACC129.

**The user leaves this screen when:** User clicks Save Changes (success), Discard Changes, or navigates away via top nav / breadcrumb (with unsaved changes handled per SR-003).

## 2. Mockup

![ACC130](img/ACC130.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Top nav (Explore, AI Tour Matching, Bookings, Schedule, Messages) | Header / Button | static | No | |
| 2 | Avatar + dropdown | Button | opens Account Dropdown | No | |
| 3 | Breadcrumb (Home / My Account / Edit Personal Info) | Text | navigation trail | No | |
| 4 | Page title "Edit Account Profile" | Header | static | No | |
| 5 | Description paragraph | Text | static, notes Business info is managed elsewhere | No | |
| 6 | Section 01 — Personal Information & Identification, "EDIT MODE" tag | Header | static | No | |
| 7 | Avatar photo (or placeholder) | Image | current `User.avatar_url` or placeholder icon | No | |
| 8 | Upload New Photo button | Button | opens file picker | No | file type JPG/PNG only, max 2MB, 1:1 ratio recommended |
| 9 | Remove (photo) link | Button | clears the avatar back to placeholder | No | disabled when no custom photo is set |
| 10 | Photo constraint note | Text | static — "JPG, PNG. Max 2MB. Square 1:1 ratio recommended." | No | |
| 11 | Full Legal Name field (required, helper: "Official name for itineraries") | Input | `User.full_name` | Yes | non-empty; used verbatim on itineraries |
| 12 | Professional Title field (required, helper: "Displayed on B2B proposals") | Input | `User.title` | Yes | non-empty |
| 13 | Primary Business Email field (with link/lock icon, helper: "Account login identifier") | Input | `User.email` | Yes | valid email format; locked — see note below |
| 14 | Email-change note | Text | static — "Contact system administrator to change primary corporate domain email" | No | |
| 15 | Secure Telephony & WhatsApp field (required, country code selector + number, helper: "Used for urgent itinerary dispatch and automated security notifications") | Input | `User.phone_country`, `User.phone` | Yes | valid phone number format for selected country |
| 16 | Account & Clearance badge (read-only) | Text | verification status, "READ-ONLY" tag, helper: "Clearance issued via National Tourism Authority & Hanoi Artisan Guild" | No | not editable |
| 17 | Assigned System Role field (read-only) | Text | role name, "READ-ONLY" tag, scope note | No | not editable |
| 18 | Section 02 — Linked Enterprise & Commercial Unit, "LEGAL ACCREDITATION · READ-ONLY" tag | Header | static | No | |
| 19 | Commercial profile reference tag | Text | Business contract tier | No | |
| 20 | Business name, description, License/Registry/Capacity fields | Text | Business credential fields, read-only | No | not editable |
| 21 | Go to Business Profile button | Button | opens the linked Business Profile's own edit flow | No | |
| 22 | Business-edit redirect note | Text | static — "To update company legal name, license or tax information, please go to Edit Business Profile." | No | |
| 23 | Sync footnote | Text | static — "All updates are synchronized across verified B2B operations." | No | |
| 24 | Discard Changes button | Button | secondary action | No | |
| 25 | Save Changes button | Button | primary action | Yes | enabled only when all required fields are valid and at least one field has changed |
| 26 | Footer | Footer / Text | static legal/compliance links | No | |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | Form pre-filled with the user's current values; Save Changes disabled until a change is made | Screen opened from ACC129 |
| Empty (no data) | Not applicable — required identity fields are always pre-populated from the existing account; only the avatar can be genuinely empty, shown as the placeholder icon | New account with no avatar uploaded yet |
| Loading | Skeleton form fields while current values load; Save Changes button shows a spinner and disables while the save request is in flight | Screen mount; Save Changes tap |
| Error | Field-level red border + message under the offending input (e.g. "Enter a valid phone number"); a top-of-form banner "Some changes couldn't be saved — Retry" if the save request itself fails after passing validation | Client-side validation failure; server/save failure |
| Success / confirmation | Toast/banner "Account updated" and navigation back to ACC129 showing the new values | Save Changes succeeds |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | Upload New Photo | tap, select file | Validates type/size/ratio, shows preview in the avatar circle | stays |
| 2 | Remove | tap | Clears the avatar to the placeholder icon | stays |
| 3 | Full Legal Name / Professional Title / Secure Telephony fields | type | Live-validates; enables Save Changes once valid and changed | stays |
| 4 | Primary Business Email field | tap | Shows the lock/contact-admin note; field itself is not directly editable | stays |
| 5 | Go to Business Profile | tap | Opens the linked Business Profile's edit flow | `PRF021` (Agency) / `PRF128` (Local Provider) |
| 6 | Discard Changes | tap | Reverts all fields to last-saved values, returns to ACC129 | `ACC129` |
| 7 | Save Changes | tap | Validates, persists changes, shows success confirmation | `ACC129` |
| 8 | Breadcrumb / top nav (with unsaved changes) | tap | Shows an "unsaved changes" confirm dialog before leaving | stays until confirmed |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Primary Business Email cannot be self-edited — it is the login identifier; changing it is an off-platform process (contact system administrator outside this product), not an in-app ticket or screen | Confirmed |
| SR-002 | Account & Clearance, Assigned System Role, and all of Section 02 (Linked Enterprise) are read-only on this screen; edits to Business data route to the Business Profile's own edit screen | Mockup — "READ-ONLY" tags; Screen List ACC129 overview |
| SR-003 | Save Changes stays disabled until every required field (Full Legal Name, Professional Title, Secure Telephony) is valid and at least one field differs from the last-saved state | Standard edit-form pattern; mockup shows both actions always visible |
| SR-004 | Navigating away with unsaved changes prompts a confirmation before discarding; Discard Changes (and any confirmed navigate-away) always performs a full revert to last-saved values — there is no autosave or partial/draft save | Confirmed |
| SR-005 | The screen layout and field structure shown here (captured from [Actor X]'s view) is a shared template used by multiple actor roles. Role-specific differences (visible fields, permissions, labels) are not exhaustively illustrated by this single mockup and must be validated per actor before implementation. |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| FR-00n | Allows the user to edit permitted personal account information; Business information is managed separately through My Business |

## 8. Responsive and accessibility notes

- Smallest supported width: 1024px (desktop-first B2B portal)
- What collapses or stacks on a narrow screen: avatar/photo controls stack above the field list; Discard/Save Changes buttons stack full-width
- Text that must remain readable (contrast, minimum size): field validation messages, "READ-ONLY" tags, photo constraint note

## 9. Open questions

None — resolved: changing Primary Business Email is an off-platform process (no in-app ticket/ADM screen; SR-001 note is purely informational), and Discard Changes always performs a full revert with no partial/draft save (SR-004).

---

## Completion checklist

- [x] The mockup is a separate cropped image file, named with the Screen ID.
- [x] Every visible element in the mockup appears in the element inventory.
- [x] Every input element has a validation rule or an explicit "none".
- [x] All five states are filled in, or marked "not applicable" with a reason.
- [x] Every navigation target is a Screen ID that exists in the Screen List.
- [x] Every element that displays data names the field it displays, matching the module spec.

---

Template source: DBIZ3, VJCBI College - FTU, Session 4. Built on the DBIZ2 Screen Design
structure (Screen List and Screen Layout), per DBIZ3 Syllabus v3.
