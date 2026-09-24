# Screen Spec: PRF128 Edit Provider Profile

| Field | Value |
|---|---|
| Screen ID | `PRF128` |
| Screen name | Edit Provider Profile |
| Actor | Local Provider |
| Priority | Must |
| Belongs to module | `spec-PRF.md` |
| Mockup image | `img/PRF128.png` |
| Status | Draft |

## 1. Purpose

**Shown when:** A Local Provider taps "Edit Provider Profile" on PRF127 to edit its own business information, using the same field structure as Provider Profile, with inline AI Refine for the description.

**The user leaves this screen when:** The Provider discards changes or saves the profile.

## 2. Mockup

![PRF128](img/PRF128.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Breadcrumb (Home / Provider Portal / Edit Workshop Profile) + "Mode: Interactive Edit Profile" | Navigation | Static | Yes | — |
| 2 | Verified guild badge + registry ID | Text | `verification_status`, Village registry ID | Yes | — |
| 3 | Page title "Edit Provider Profile" + subtitle | Header | Static | Yes | — |
| 4 | "Cancel / Discard" button | Button | — | Yes | Confirms if dirty |
| 5 | "Save Changes" button (top) | Button | — | Yes | Validates required fields |
| 6 | Section "01 Core Workshop Identity & Master Artisan" | Header | Static | Yes | — |
| 7 | Workshop / Enterprise Legal Name input | Input | `business_name` | Yes | ≤255 chars; a change here counts as a major change (module spec Q16) |
| 8 | Master Artisan Name input | Input | `artisan_names` | No | — |
| 9 | Generation & Guild Title input | Input | Free text | No | — |
| 9a | "AI Refine" action on long-form Description field | Button | Triggers FR-007 draft, inline within the Description field | No | AI Refinement is available directly within the field via this action; no separate screen is required (module spec Q, Closed). Draft must be explicitly Accepted/Edited before it replaces the field (BR-012, BR-013) |
| 10 | Affiliated Craft Village Guild field — locked | Input | `Village` reference | Yes | Read-only, Locked/Certified |
| 11 | Establishment Year input | Input | Establishment year | No | — |
| 12 | Private Group Capacity (B2B) input | Input | B2B capacity | No | — |
| 13 | Craft Specialties & Search Tags chips + "+ Add Specialty" | Tag list | `craft_type` / specialty tags | No | Enum per module spec Q9 for `craft_type`; free specialty tags TBD |
| 14 | Master Artisan Archival Photo upload | Image upload | `Profile Image` (portrait) | Yes | Min 1200×900px; JPG/JPEG/PNG/WEBP, max 10MB (BR-008) |
| 15 | "Replace" / "Remove" buttons (photo) | Button | — | Yes | — |
| 16 | Guild Status dropdown | Input | Enum (e.g. Founding Member) | No | — |
| 17 | Dispatch Coordination field | Input | Dispatch access text | No | — |
| 18 | Section "02 Workshop Facilities & Capacity Specifications" — 3 cards (Station Apparatus, Studio & Gallery Area, Kiln Specification), each with title/detail/metric fields | Input | Facility attributes | No | — |
| 19 | Section "03 Architectural Grounds & Facility Gallery" — drag & drop dropzone + "Browse Files from Computer" | Image upload | `Profile Image` array (min 6, up to 12) | Yes (at least 6 photos) | PNG/JPG/WebP, up to 15MB each, recommended 21:9 or 16:9 |
| 20 | Gallery thumbnail tiles (6) with Edit/Remove links and a "Cover" tag on one tile | Image upload | `Profile Image` array | Yes | The Architectural Grounds & Facility Gallery requires a minimum of 6 photos and allows up to 12 photos (module spec, Closed) |
| 21 | Section "04 Offered Workshop Experiences (Quick Status)" + "Open Experience Management Portal →" link | Header/Link | — | No | — |
| 22 | Mini Experience cards (3) with status tag, title, B2B price, "Edit Details" link, "Listed" checkbox | Card/Toggle | `Experience` summary + publish toggle | No | Toggling "Listed" applies the same validation rules as editing the Experience directly on EXP070, including the minimum 3 required images (BR-009); an Experience that does not meet the required conditions cannot be marked Listed from here |
| 23 | Section "05 Logistics, Transit & On-Site Dispatch" | Header | Static | Yes | — |
| 24 | Direct Dispatch Hotline input | Input | Phone | No | Phone format |
| 25 | Workshop Lead Coordinator input | Input | Coordinator name + languages | No | — |
| 26 | Coach Parking & Pier Turnaround Logistics textarea | Input | Free text | No | — |
| 27 | Verified Accessibility & On-Site Amenities checklist (4 items) | Toggle | Amenity flags | No | — |
| 28 | Autosave status line | Text | "Last autosaved Xm ago · All changes synced to B2B verified registry" | Yes | — |
| 29 | "Discard Changes" button (bottom) | Button | — | Yes | — |
| 30 | "Save Provider Profile" button (bottom) | Button | — | Yes | Same validation as top Save Changes |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | Fully pre-filled form matching the saved Provider profile, as in the mockup | Editing an existing, previously completed profile |
| Empty (no data) | All fields render blank with placeholder guidance and no gallery photos; the Save action is the same "Save Changes" button but on first submission it both saves the profile and moves `verification_status` to `Pending Verification` | First login after account creation, before the Provider has ever completed its profile (module spec assumption: Provider account creation precedes profile completion) |
| Loading | Skeleton form while the existing profile loads; photo upload tiles show progress bars; Save buttons show a spinner and disable while saving | Screen opens; photo uploads; save submitted |
| Error | Inline field-level errors (required field empty, unsupported image format/size/resolution per BR-008); a top banner on save conflict | Validation fails; image rejected; save request fails |
| Success / confirmation | Toast "Changes saved" (subsequent edits) or "Profile submitted for verification" (first-ever save, per module spec Q29); autosave timestamp updates | Save succeeds |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | "Cancel / Discard" / "Discard Changes" | tap | Confirms, reverts unsaved edits | `PRF127` |
| 2 | "Save Changes" / "Save Provider Profile" | tap | Validates and saves; on first-ever save, submits for UBND verification | `PRF127` |
| 3 | "Replace" / "Remove" (archival photo) | tap | Opens upload widget / removes the photo | stays |
| 4 | Gallery dropzone / "Browse Files from Computer" | tap or drag | Opens Cloudinary upload widget for additional photos | stays |
| 5 | Gallery tile "Edit" / "Remove" | tap | Edits caption or removes that photo | stays |
| 6 | "+ Add Specialty" | tap | Adds a specialty tag | stays |
| 7 | "Open Experience Management Portal →" | tap | Opens the full Experience list | `EXP067` |
| 8 | Mini card "Edit Details" | tap | Opens that Experience in edit mode | `EXP070` |
| 9 | Mini card "Listed" checkbox | tap | Toggles that Experience's publish status | stays |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | A Local Provider can save only its own Provider profile. | BR-002 |
| SR-002 | The first "Save Changes" after account creation submits the completed profile for UBND verification, setting `verification_status = Pending Verification`. | Module spec Q29 (Closed), BR-006 |
| SR-003 | Changing Business Name, Craft Type, or Business Registration details is a major change requiring UBND re-verification. | Module spec Q16 (Closed) |
| SR-004 | Uploaded images must meet BR-008 (JPG/JPEG/PNG/WEBP, ≤10MB, ≥1280×720; the archival portrait additionally requires ≥1200×900). | BR-008 |
| SR-005 | The Affiliated Craft Village Guild field is locked/read-only in this form. | Mockup (Locked/Certified tag) |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| FR-004 | Allows the Local Provider to update its own business profile, description and profile media. |
| FR-006 | Provides a quick publish/unpublish toggle for the Provider's own Experiences from the "Offered Workshop Experiences (Quick Status)" section. |
| FR-007 | Provides inline AI-refined drafting for the Provider's long-form Description field via the "AI Refine" action associated with that field; no separate screen is required. |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the two-column layout within Section 01 (fields + archival photo) stacks; the 3 facility cards in Section 02 stack to one column; the gallery thumbnail grid in Section 03 drops from a 6-wide to a 2-wide grid.
- Text that must remain readable (contrast, minimum size): the "Locked/Certified" tag on the Village field and the "Cover" tag on the gallery must remain visible against thumbnail backgrounds at reduced widths.

## 9. Open questions

| # | Question | Blocking? | Status |
|---|---|---|---|
| 1 | AI Refinement is available directly within the Provider's long-form Description field via the "AI Refine" action associated with the field; no separate screen is required. | Yes | Closed |
| 2 | The Architectural Grounds & Facility Gallery requires at least 6 photos and allows up to 12 photos. | No | Closed |
| 3 | Yes. Toggling "Listed" from the mini Experience card applies the same validation rules as editing the Experience directly. An Experience cannot be marked "Listed" unless it meets the required conditions, including the minimum 3 required images. | Yes | Closed |

---

## Completion checklist

- [x] The mockup is a separate cropped image file, named with the Screen ID.
- [x] Every visible element in the mockup appears in the element inventory.
- [x] Every input element has a validation rule or an explicit "none."
- [x] All five states are filled in, or marked "not applicable" with a reason.
- [x] Every navigation target is a Screen ID that exists in the Screen List.
- [x] Every element that displays data names the field it displays, matching the module spec.
