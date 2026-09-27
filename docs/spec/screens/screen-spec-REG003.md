# Screen Spec: REG003 Agency Registration

| Field | Value |
|---|---|
| Screen ID | `REG003` |
| Screen name | Agency Registration |
| Actor | Tour Agency |
| Priority | Must |
| Belongs to module | `spec-AUT.md` |
| Mockup image | `img/REG003.png` |
| Status | Draft |

## 1. Purpose

**Shown when:** A prospective Tour Agency clicks a "Register" entry point (e.g. from Public Explore or Login), starting Step 1 of 3 of the registration flow.

**The user leaves this screen when:** They complete all required fields, check the compliance commitment box, and click "Continue to Verification".

## 2. Mockup

![REG003](img/REG003.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Header | Header | "← Explore Villages" link, logo + "B2B Travel Agency Portal", "Support Desk" link, avatar icon | No | — |
| 2 | Breadcrumb | Text | "[B2B Onboarding] / Expedited Entry" | No | — |
| 3 | Page title | Header | "Travel Agency Registration" | No | — |
| 4 | Page subtitle | Text | Static description of benefits | No | — |
| 5 | Completion time badge | Badge | "Avg. Completion: 2 mins" | No | — |
| 6 | Step tracker (3 steps) | Stepper | Step 01 Company & Legal Info (in progress), Step 02 Security OTP Verification (pending), Step 03 Application Review & Approval (pending) | No | — |
| 7 | Section 1 header | Text | "Corporate Legal Information" + "Mandatory" tag | No | — |
| 8 | Enterprise / Travel Agency Legal Name | Input | `agency.legal_name` | Yes | Non-empty |
| 9 | Operator License No. | Input | `agency.license_no` | Yes | Non-empty, valid license format |
| 10 | Corporate Tax ID (TIN/MST) | Input | `agency.tax_id` | Yes | Exactly 10 digits, numeric only (module spec Open Q2) |
| 11 | International/Domestic Tour Operator License upload | File upload (drag/drop) | `agency.license_document` | Yes | File type PDF/JPG/PNG, max 10MB |
| 12 | Upload helper note | Text | "Data submitted is cryptographically validated directly against the Vietnam National Administration of Tourism (VNAT) license database." | No | — |
| 13 | Section 2 header | Text | "Authorized Delegate & Route Scope" + "Contact Liaison" tag | No | — |
| 14 | Authorized Agency Representative (Full Name) | Input | `agency.rep_full_name` | Yes | Non-empty |
| 15 | Work Email (For OTP) | Input | `agency.rep_email` | Yes | Valid email format |
| 16 | Direct Mobile / WhatsApp | Input | `agency.rep_phone` | Yes | Valid phone format |
| 16a | Company Address | Input | `agency.contact_information.address` | Yes | Non-empty (module spec Open Q4 — `contact_information` requires name, phone, email, and address) |
| 16b | Team Size | Input (number) | `agency.team_size` | Yes | Integer, ≥ 1 (module spec Open Q5) |
| 16c | Tour Types multi-select | Checkbox group | `agency.tour_types` — enum: Cultural / Craft Village / Experiential / Educational / Other | Yes | At least one type selected (module spec Open Q6) |
| 16d | Account Password | Input (masked) | `agency.password` | Yes | Minimum 8 characters, must include uppercase, lowercase, a number, and a special character (module spec Open Q1) |
| 16e | Confirm Account Password | Input (masked) | `agency.confirm_password` | Yes | Must exactly match Account Password |
| 17 | Primary Guest Segmentation multi-select | Tag input + dropdown | `agency.guest_segments` | Yes | At least one segment selected |
| 18 | Quick Add segment buttons | Buttons | Adds a preset segment tag (MICE & Corporate, Educational & Study, Diplomatic & Official Visits, Culinary & Craft Sourcing) | No | — |
| 19 | Initial Tour Preferences & Focus panel | Card | "Operational Scope" tag, helper text | No | — |
| 20 | Primary Craft Focus / Village Clusters multi-select | Tag input + dropdown | `agency.village_clusters`, shows "48 Villages Active" | Yes | At least one cluster selected |
| 21 | Cluster preset buttons | Buttons | Adds preset clusters (Ceramics & Kilns, Textiles & Silk, Folk Art & Do Paper, Metalwork & Woodcarving, Custom Itinerary Route) | No | — |
| 22 | "Select All 48 Traditional Villages" checkbox | Checkbox | `agency.select_all_villages` | No | — |
| 23 | Average Group Size | Dropdown | `agency.avg_group_size` | No | — |
| 24 | Tour Frequency | Dropdown | `agency.tour_frequency` | No | — |
| 25 | Preferred Tour Formats checkboxes | Checkbox group | Hands-on Master Workshop, Direct Artisan Dialogue & Tea Briefing, Exclusive Guild Sourcing/Wholesale | No | — |
| 26 | Compliance commitment checkbox | Checkbox | Agreement to Fair Trade & Heritage Preservation Protocols, references Statute VN-HAN-8409 | Yes | Must be checked to proceed |
| 27 | "Already an accredited partner? Sign in" | Link | Redirects to login | No | — |
| 28 | Continue to Verification | Button (primary) | Submits Step 1 | No | Disabled until all required fields + checkbox are complete |
| 29 | Footer | Text/Links | Copyright, Operator Compliance, Fair Trade & Preservation Terms, Agency Support | No | — |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | Empty form with placeholder text and no tags selected, as shown | Screen load, first visit to registration |
| Empty (no data) | Same as default; upload area shows the "Click to browse or drop certificate copy" empty state | No file uploaded yet |
| Loading | Continue to Verification shows spinner and is disabled while Step 1 data is validated/saved server-side | User taps Continue to Verification |
| Error | Inline error text under invalid/missing required fields; upload area shows error state (e.g. "File too large" or "Unsupported file type") in red; banner if license/tax ID fails VNAT cross-reference | Client validation fails, or server-side license verification fails |
| Success / confirmation | Navigates to Step 2 (Security OTP Verification) with Step 01 marked "Completed" | Step 1 data validated and saved |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | Upload area | tap / drag-drop | Opens file picker or accepts dropped file, shows filename/thumbnail preview | stays |
| 2 | Quick Add / Cluster preset buttons | tap | Adds the preset tag to the relevant multi-select | stays |
| 3 | Select All 48 Traditional Villages | tap | Selects all village clusters, may disable individual cluster selection | stays |
| 4 | Already an accredited partner? Sign in | tap | Navigates to login | `AUT009` |
| 5 | Continue to Verification | tap | Validates Step 1 and advances | `REG115` (Security OTP Verification, per this mockup set) |
| 6 | ← Explore Villages | tap | Navigates to public discovery | `EXP120` |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Registration is available only to Tour Agencies | Screen List Screen Overview |
| SR-002 | Continue to Verification stays disabled until all mandatory fields, the license upload, and the compliance checkbox are complete | Mockup — required-field markers (*) and mandatory tag |
| SR-003 | Uploaded license file is limited to PDF/JPG/PNG under 10MB | Mockup helper text next to upload field label |
| SR-004 | The Agency sets its own account password at registration (Account Password / Confirm Account Password); it is not system-generated | Module spec FR-002 (`password`, `confirm_password` are core required registration fields) |
| SR-005 | Corporate Tax ID must be exactly 10 numeric digits | Module spec Open Q2 |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| FR-001 | Displays the Agency-only self-registration form to Guests |
| FR-002 | Captures and validates required Agency registration data and documents |
| FR-003 | Rejects registration when the submitted email already belongs to an account |
| F-AUTH-23 | Successful submission of this screen (Continue to Verification) is the trigger that starts F-AUTH-23: once Step 1 data passes validation and duplicate-email checking, the system sends the OTP that the Agency enters on REG115 |

## 8. Responsive and accessibility notes

- Smallest supported width: 768px (dense two-column form; a narrower breakpoint should be defined for full mobile support)
- What collapses or stacks on a narrow screen: the two-column layout (Corporate Legal Information / Authorized Delegate & Route Scope) stacks to a single column
- Text that must remain readable (contrast, minimum size): field labels ≥12px, input text ≥14px, required-field asterisks in a distinguishable color

## 9. Open questions

| # | Question | Blocking? | Status |
|---|---|---|---|
| 1 | In the official Screen List, document upload is described as a separate screen (REG115 "Attach Registration Document"). This mockup embeds the upload directly in REG003. | Yes | Resolved — the original Screen List entry for REG115 was incorrect. The license/document upload lives on this screen (REG003, Step 1). REG115 is confirmed to be the OTP verification screen (Step 2 of the registration flow) — see `screen-spec-REG115.md`. |
| 2 | Module spec `spec-AUT.md` lists "OTP-based Agency registration" as explicitly **out of scope**, and its Guest registration flow/sequence diagrams (UC-ACC-01) and FR-001–004 go straight from form submission to `Pending Approval` with no OTP step — conflicting with this screen's "Continue to Verification" → REG115 step. | Yes | Resolved — a new function, F-AUTH-23 (Verify Registration Email OTP), has been added to the module's function list, formally bringing OTP verification into scope as the required step between this screen's submission and account creation (F-AUTH-04). This screen's Continue to Verification is now the documented trigger for F-AUTH-23; see §7. Matching updates made in `screen-spec-REG115.md` and `screen-spec-REG116.md`. |

---

## Completion checklist

- [x] The mockup is a separate cropped image file, named with the Screen ID.
- [x] Every visible element in the mockup appears in the element inventory.
- [x] Every input element has a validation rule or an explicit "none".
- [x] All five states are filled in, or marked "not applicable" with a reason.
- [x] Every navigation target is a Screen ID that exists in the Screen List.
- [x] Every element that displays data names the field it displays, matching the module spec.
