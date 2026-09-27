# Screen Spec: REG116 Registration Status

| Field | Value |
|---|---|
| Screen ID | `REG116` |
| Screen name | Registration Status |
| Actor | Tour Agency |
| Priority | Must |
| Belongs to module | `spec-AUT.md` |
| Mockup image | `img/REG116.png` |
| Status | Draft |

## 1. Purpose

**Shown when:** The Agency successfully completes OTP verification (REG115) and submits the full registration application.

**The user leaves this screen when:** They click "Return to Explore" or "Download Submission Summary (PDF)", or click one of the curated workshop cards.

## 2. Mockup

![REG116](img/REG116.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Header | Header | "← Explore Villages" link, logo + "B2B Travel Agency Portal", "Support Desk" link, avatar icon | No | — |
| 2 | Breadcrumb | Text | "Onboarding Workflow • Phase 03 of 03" | No | — |
| 3 | Security protocol badge | Badge | "Security Protocol: ED25519-TLS Certified" | No | — |
| 4 | Step tracker (3 steps) | Stepper | Step 01 Completed, Step 02 Verified, Step 03 In Progress | No | — |
| 5 | Application filing dossier card header | Card | Clock icon, "Application Filing Dossier", dossier code `application.dossier_code` (e.g. REG-2025-HAN-8409) | No | — |
| 6 | Official registration status badge | Badge | `application.status` e.g. "● Pending Heritage Audit" | No | — |
| 7 | "Submission Confirmed" label | Text | Static | No | — |
| 8 | Heading | Text | "Application Submitted Successfully." | No | — |
| 9 | Body copy | Text | Thank-you / explanation message | No | — |
| 10 | Verification Timeline & Checklist panel | Card | "Estimated SLA: ≤ 24 working hours" | No | — |
| 11 | Step 1: Receipt of Dossier & Contact OTP Verification | Checklist item | Status "Completed" | No | — |
| 12 | Step 2: Tour Operator License & Tax ID Verification | Checklist item | Status "Under Review (24H)" | No | — |
| 13 | Step 3: B2B Portal Activation, Net Rates & Master Artisan Dispatch | Checklist item | Status "Pending Audit" | No | — |
| 14 | Return to Explore | Button (primary) | Navigates to public discovery | No | — |
| 15 | Download Submission Summary (PDF) | Link | Downloads a PDF summary of the submission | No | — |
| 16 | Dossier Metadata panel | Card | Tax ID, Agency Name, License Tier, Contact Person, Submission Time, Primary Region — all from `application.*` | No | — |
| 17 | Expedited Audit / Urgent Verification panel | Card | B2B Partner Hotline, Priority Verification Desk email, instructions to reference the dossier code | No | — |
| 18 | "While waiting for review, your agency may explore:" section | Text | Static | No | — |
| 19 | "View Full 48 Heritage Destinations" | Link | Navigates to full village list | No | — |
| 20 | Curated workshop cards (×3) | Card | Village name, region tag, description, max capacity, "B2B Net Avail. After Audit" note | No | — |
| 21 | Footer | Text/Links | Copyright, Operator Compliance, Fair Trade & Preservation Terms, Agency Support | No | — |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | Full confirmation screen as shown, with Step 1 complete and Steps 2–3 pending/in review | Screen load right after successful application submission |
| Empty (no data) | Not applicable — dossier metadata is always populated once an application exists; if curated workshops cannot be loaded, that section is hidden or shows "No preview workshops available right now" | Curated workshops recommendation service returns nothing |
| Loading | Skeleton in place of Dossier Metadata and curated workshop cards while they load; core confirmation message renders immediately | Screen mounts, secondary data still loading |
| Error | Banner "Could not load your dossier details, please refresh" if metadata fails to load; PDF download shows an inline error if generation fails | Metadata fetch or PDF generation fails |
| Success / confirmation | This screen is itself the success/confirmation state of the registration flow | Application submitted |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | Return to Explore | tap | Navigates to discovery | `EXP120` (public, since the Agency account is not yet approved) |
| 2 | Download Submission Summary (PDF) | tap | Downloads a PDF | stays |
| 3 | View Full 48 Heritage Destinations | tap | Navigates to full village browse | `VIL030` (list context) |
| 4 | Curated workshop card | tap | Opens that Village's profile | `VIL030` |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Displays the Agency registration status: submitted, pending verification, approved, or rejected | Screen List Screen Overview for REG116 |
| SR-002 | Verification is expected within a stated SLA (24 working hours per the mockup) | Mockup — "Estimated SLA: ≤ 24 working hours" |
| SR-003 | Until approval, the Agency cannot access B2B pricing/booking features; only public browsing is available | Mockup — curated cards labeled "B2B Net Avail. After Audit" |
| SR-004 | Both approval and rejection outcomes are communicated to the Agency by email, not by an in-app screen state. On approval, the Agency logs in normally afterward | Clarification |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| F-AUTH-04 | Displays the outcome of account creation: this screen loads once F-AUTH-04 has created the Agency account (status `Pending Approval`) after OTP verification (F-AUTH-23) has succeeded, and shows the resulting dossier/confirmation |

## 8. Responsive and accessibility notes

- Smallest supported width: 768px
- What collapses or stacks on a narrow screen: the two-column layout (main dossier panel / sidebar metadata) stacks to a single column; the 3 workshop cards stack vertically
- Text that must remain readable (contrast, minimum size): status badges ≥12px with sufficient contrast, heading ≥28px

## 9. Open questions

| # | Question | Blocking? | Status |
|---|---|---|---|
| 1 | What does this screen show for a Rejected application? | Yes | Resolved — nothing is shown in-app for rejection; the Agency is notified by email instead. This screen does not have a distinct "Rejected" state. |
| 2 | What happens once the application is fully Approved — does the Agency see an updated version of this screen, or are they redirected elsewhere? | Yes | Resolved — the Agency is notified by email once approved. There is no in-app "Approved" state of this screen; the Agency simply logs in as usual afterward via `AUT009`. |
| 3 | Module spec `spec-AUT.md` lists "OTP-based Agency registration" as explicitly out of scope, and its flow/sequence diagrams and FR-001–004 show submission going straight to `Pending Approval` with no OTP step, conflicting with this screen's "Shown when" (arrival via REG115 OTP verification). | Yes | Resolved — F-AUTH-04 has been revised to explicitly require successful OTP verification via F-AUTH-23 before account creation, confirming this screen's "Shown when" (arrival via REG115) matches the documented flow. See §7 and matching updates in `screen-spec-REG003.md` §9 and `screen-spec-REG115.md` §9. |

---

## Completion checklist

- [x] The mockup is a separate cropped image file, named with the Screen ID.
- [x] Every visible element in the mockup appears in the element inventory.
- [x] Every input element has a validation rule or an explicit "none".
- [x] All five states are filled in, or marked "not applicable" with a reason.
- [x] Every navigation target is a Screen ID that exists in the Screen List.
- [x] Every element that displays data names the field it displays, matching the module spec.
