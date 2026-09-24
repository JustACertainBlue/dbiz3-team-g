# Screen Spec: EXP069 Add Experience

| Field | Value |
|---|---|
| Screen ID | `EXP069` |
| Screen name | Add Experience |
| Actor | Local Provider |
| Priority | Must |
| Belongs to module | `spec-PRF.md` |
| Mockup image | `img/EXP069.png` |
| Status | Draft |

## 1. Purpose

**Shown when:** A Local Provider taps "+ New Experience" on EXP067 to create a new Experience with required description, images, price, capacity, availability and booking conditions.

**The user leaves this screen when:** The Provider discards the draft, saves it as a draft, or publishes/creates it.

## 2. Mockup

![EXP069](img/EXP069.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | "Back to Experience Management / New Listing" breadcrumb | Navigation | Static | Yes | — |
| 2 | "Live Creation Mode" status text | Text | Static | No | — |
| 3 | "Discard Draft" button | Button | — | Yes | Confirms before discarding if any field has content |
| 4 | "Save as Draft" button | Button | — | Yes | Saves with status = Draft; no field minimums enforced except what the platform always requires |
| 5 | "Publish / Create Experience" button | Button | — | Yes | Enforces BR-009 (≥3 image categories) and BR-010 (price>0, capacity>0, notice_period≥0) before publish succeeds |
| 6 | Experience Title field | Input | `name` | Yes | Non-empty; recommended 40–70 chars |
| 7 | "Short Lead Introduction" textarea + char counter | Input | `description` (lead/hook) | Yes | Max 240 characters (per counter shown) |
| 8 | "AI Refine" button (lead intro) | Button | Triggers FR-007 draft | No | Draft must be explicitly Accepted/Edited before it replaces the field (BR-012, BR-013) |
| 9 | "Workshop Media Gallery" — Primary cover upload slot | Image upload | `Experience Image` (category: cover) | Yes | JPG/JPEG/PNG/WEBP, max 10MB, min 1280×720 (BR-008) |
| 10 | Gallery slot 2 ("Craft Process") with remove (×) | Image upload | `Experience Image` | Yes (part of min. 3 required categories) | Same as above |
| 11 | "+ Add Photo" slot (up to 8 gallery items) | Image upload | `Experience Image` | Yes (at least 3 categories total: Activity/Experience, Space/Location, Product/Result) | Same as above; BR-009 |
| 12 | "Curatorial Overview & Cultural Significance" textarea + B/I toolbar | Input | `description` (long form) | Yes | — |
| 13 | "AI Refine Narrative Tone" button | Button | Triggers FR-007 draft | No | Same BR-012/BR-013 rule |
| 14 | "Session Structure & Schedule" — step cards + "+ Add Step" | List/Input | Structured run-of-show | Yes | At least one step recommended; each step needs a time range and title |
| 15 | "Participant Guidelines & Accessibility" — policy cards + "+ Add Policy/Guideline" | List/Input | `booking_conditions` / accessibility entries | No | — |
| 16 | Quick-add preset chips (Child Friendly / Photography Rules / Dietary-Allergens) | Button | Inserts a pre-filled policy card | No | — |
| 17 | "Experience Rate Card" — price input | Input | `price_per_person` | Yes | Decimal > 0 (BR-010); currency VND |
| 18 | Rate inclusions helper text | Text | Free text | No | — |
| 19 | "Capacity & Logistics" — Max Capacity input | Input | `max_participants` | Yes | Integer > 0 (BR-010) |
| 20 | Duration input | Input | `duration` | Yes | Number > 0. Stored in minutes; displayed in hours on the UI — the system converts the stored value to hours for display and converts the entered hours back to minutes when saving |
| 21 | Languages Supported chips + "+ Add Language" | Tag list | Languages | No | — |
| 22 | "Location" card | Card/Text | Defaults to Provider's main location per module spec Q28 | Yes | — |
| 23 | "Organization & Village Context" card (provider + village links) | Card | Read-only Provider/Village reference | No | — |
| 24 | Cancellation Policy selector | Input | `cancellation_policy`, captured as structured predefined rules (not free text) | Yes | Must select one of the predefined cancellation policy rules |

Note: Group discounts / special rates are out of scope for MVP and are not entered or managed on this screen.

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default / Empty | A blank form with guidance placeholder text in every field, as in the mockup — for a creation screen the default state *is* the empty state | Screen just opened for a new Experience |
| Loading | "Publish"/"Save as Draft" buttons show a spinner and disable while the request is in flight; image slots show upload progress bars while photos upload | User submits, or an image is uploading |
| Error | Inline field-level errors (e.g. "Price must be greater than 0," "At least 3 photo categories are required," "Capacity must be a positive number") plus a top-of-form summary banner; image slot shows a rejection message if format/size/resolution fails BR-008 | Validation fails on Publish, or an image upload is rejected |
| Success / confirmation | Toast "Experience published" (or "Draft saved") and redirect | Publish succeeds → redirect to `EXP068`; Save as Draft succeeds → redirect to `EXP067` with the new Draft row visible |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | "Discard Draft" | tap | Confirms, then discards all entered content | `EXP067` |
| 2 | "Save as Draft" | tap | Saves with status = Draft | `EXP067` |
| 3 | "Publish / Create Experience" | tap | Validates BR-009/BR-010; on success creates the Experience as Published | `EXP068` |
| 4 | "AI Refine" (lead intro or narrative tone) | tap | Sends `original_description` + `profile_context` to the AI engine and returns a draft for Accept/Edit/Regenerate/Discard | stays (inline) |
| 5 | "+ Add Photo" / "Change Photo" / "Crop / Reframe" | tap | Opens the Cloudinary upload/crop widget | stays |
| 6 | "+ Add Step" | tap | Adds a blank step card to the run-of-show | stays |
| 7 | "+ Add Policy / Guideline" / quick-add chips | tap | Adds a policy card, pre-filled for quick-add chips | stays |
| 8 | "+ Add Language" | tap | Opens a language picker and adds the selected chip | stays |
| 9 | "View Provider Profile →" | tap | Opens this Provider's own profile | `PRF127` |
| 10 | "Explore Van Phuc Village →" | tap | Opens the affiliated Village profile | `VIL030` |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Publish is blocked until at least 3 required image categories (Activity/Experience, Space/Location, Product/Result) are present. | BR-009 |
| SR-002 | Publish is blocked unless price > 0, capacity > 0 and notice period ≥ 0. | BR-010 |
| SR-003 | An AI-refined draft can never silently overwrite the original text; the Provider must Accept, Edit, Regenerate or Discard it. | BR-011, BR-012, BR-013 |
| SR-004 | The new Experience is owned by, and only editable by, the creating Provider. | BR-002 |
| SR-005 | Save as Draft does not enforce the full publish-time validation set, letting the Provider return later to complete it. | Inferred from "Save as Draft" vs "Publish" distinction in mockup |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| FR-006 | Creates a new Experience owned by this Provider, with pricing, capacity, images and booking conditions. |
| FR-007 | Provides inline AI-refined description drafting for the lead introduction and the long-form curatorial overview. |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the right-hand sidebar (Rate Card, Capacity & Logistics, Location, Organization & Village Context) moves below the main form on narrow screens; the media gallery grid drops to a single column.
- Text that must remain readable (contrast, minimum size): character counters and the "[MIN. 3 PHOTOS REQUIRED]" helper must stay visible near their field even after the form stacks.

## 9. Open questions

| # | Question | Blocking? | Status |
|---|---|---|---|
| 1 | Group discounts / special rates are out of scope for MVP. They are not entered or managed on this screen. | No | Closed |
| 2 | Yes. `cancellation_policy` is captured on this screen as structured predefined rules, not free text. | Yes | Closed |
| 3 | `duration` is stored in minutes but displayed in hours on the UI. The system converts the stored value to hours for display and converts the entered hours back to minutes when saving. | Yes | Closed |

---

## Completion checklist

- [x] The mockup is a separate cropped image file, named with the Screen ID.
- [x] Every visible element in the mockup appears in the element inventory.
- [x] Every input element has a validation rule or an explicit "none."
- [x] All five states are filled in, or marked "not applicable" with a reason.
- [x] Every navigation target is a Screen ID that exists in the Screen List.
- [x] Every element that displays data names the field it displays, matching the module spec.
