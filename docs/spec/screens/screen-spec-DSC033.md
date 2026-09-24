# Screen Spec: DSC033

> File này gộp 2 bản draft khác nhau của DSC033 (tham chiếu module spec khác nhau, một vài chi tiết khác nhau). Cả 2 bản được giữ nguyên bên dưới để đối chiếu.

---

# module-spec-EXP

# Screen Spec: DSC033 Experience Detail

| Field | Value |
|---|---|
| Screen ID | `DSC033` |
| Screen name | Experience Detail |
| Actor | Tour Agency |
| Priority | Must |
| Belongs to module | `module-spec-EXP` |
| Mockup image | `img/DSC033.png` |
| Status | Draft |

## 1. Purpose

**Shown when:** A Tour Agency clicks "View Details" on an Experience card from `EXP017`, `VIL030`, `DSC122`, or an AI Tour Matching result.

**The user leaves this screen when:** they request a quote (opens Chat), start a direct chat, navigate to the Provider or Village, or use the breadcrumb to go back.

## 2. Mockup

![DSC033](img/DSC033.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Header nav | Header | Logo, Explore/AI Tour Matching/Bookings/Schedule/Messages, user name + Portal ID, avatar | Yes | — |
| 2 | Breadcrumb | Text | "Home / Explore Experiences / [Village] / [Experience name]" | Yes | Non-clickable last crumb |
| 3 | Category tag + code | Tag | e.g. "[Traditional Craft & Heritage]", experience code (e.g. "VN-HND-VUN-042") | No | — |
| 4 | Title | Header | Experience name | Yes | — |
| 5 | Subtitle description | Text | 2–3 sentence summary | Yes | — |
| 6 | Image gallery | Image | Main plate (large, labeled dimensions/aspect ratio) + 2 supporting plates, source/audit caption | Yes | Falls back to placeholder set if no photos uploaded |
| 7 | Curatorial Overview section | Text | Eyebrow (est. year, org type) + heading + 2 paragraphs | Yes | — |
| 8 | Impact stat card (×3) | Card | numbered label, title, short description | No | e.g. Material Integrity / Social Impact / Finished Artifact |
| 9 | Itinerary section | List | heading + total duration; Step rows (step number, time range, title, description) | Yes | Steps must sum to the stated total duration |
| 10 | Participant Guidelines section | Tag/List | accessibility badges (e.g. Wheelchair Access, Child Friendly); bulleted rules (bold label + description) | Yes | — |
| 11 | B2B Wholesale Pricing card | Card | "Confidential Rate" badge, price per person, inclusions note | Yes | Rendered only to authenticated, verified Tour Agencies |
| 12 | Capacity & Logistics card | Card | Max capacity, note, program duration, languages supported | Yes | — |
| 13 | Location & Access card | Card | coordinates, map placeholder, studio name/address, coach access note | Yes | — |
| 14 | Organization & Village Context card | Card | Hosting Provider label + verified badge, provider name + contact, "View Provider Profile →" button; Affiliated Village label + region badge, village name/subtitle, "Explore Village →" button | Yes | — |
| 15 | Request Quote button | Button | "Request Quote >" (primary CTA) | Yes | Disabled/relabeled "Quote Requested" while a quote thread for this Experience is Pending/In Negotiation; re-enables to its default state if that thread is later Declined or Closed |
| 16 | Direct Chat button | Button | "Direct Chat with [Provider]" (secondary CTA) | Yes | — |
| 17 | Footer | Footer | Brand, terms, security audit link, portal version | Yes | — |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | Fully populated Experience page with pricing, itinerary, and CTAs, as shown | Experience data resolves for a verified/published listing |
| Empty (no data) | Not applicable — this screen only renders once a specific Experience record is loaded; if the record has optional fields missing (e.g. no impact stats), that block is omitted rather than shown empty | — |
| Loading | Skeleton blocks for gallery, pricing card, and itinerary rows; header/breadcrumb render immediately | Experience data is being fetched |
| Error | Full-page message: "This experience is no longer available." with a link back to Explore; or a retry banner "We couldn't load this experience." on a transient fetch failure | Experience is unpublished/deleted, or the fetch fails |
| Success / confirmation | After "Request Quote": a toast/banner "Quote request sent to [Provider]" appears, then the user is taken into the chat thread with the initial message already sent; the button becomes disabled and relabeled "Quote Requested" if the Agency returns to this page | User successfully submits a Request Quote |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | Breadcrumb village link | tap | — | `VIL030` |
| 2 | "View Provider Profile →" | tap | — | `DSC122` |
| 3 | "Explore [Village] →" | tap | — | `VIL030` |
| 4 | "Request Quote" | tap | Opens/creates a chat thread with the Experience's hosting Provider (the same thread targeted by "Direct Chat") and auto-sends the initial quote-request message; disabled on repeat use while the resulting thread is active, re-enabling if that thread is later Declined or Closed | `COM048` |
| 5 | "Direct Chat with [Provider]" | tap | Opens/continues the same chat thread with the hosting Provider, without an auto-message | `COM048` |
| 6 | Gallery image | tap | Opens an enlarged lightbox view | stays on `DSC033` |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | "Request Quote" can be triggered only once per Agency per Experience while a quote thread is active (Pending/In Negotiation); it re-enables and returns to its default label if that prior thread is later Declined or Closed, allowing a new quote request | Screen List, Request Quote — Action row: "can trigger the request only once"; clarified answer, open question #2 |
| SR-002 | B2B wholesale pricing is visible only to authenticated, verified Tour Agencies; Guests see the public equivalent (`DSC124`) with pricing locked | Screen List, DSC033 vs DSC124 overview |
| SR-003 | Provider and Village context cards always link to `DSC122` and `VIL030` respectively | Screen List, DSC033 overview |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| — | [NEEDS CLARIFICATION: module spec `module-spec-EXP` with FR IDs not yet available] |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the two-column layout (content + sidebar) stacks to a single column with the sidebar (pricing/logistics/CTA cards) moving below the main content; the 3-plate gallery stacks vertically
- Text that must remain readable: itinerary step time ranges and the wholesale price figure must remain legible and not be truncated on narrow widths

## 9. Open questions

| # | Question | Blocking? | Status |
|---|---|---|---|
| 1 | Does "Request Quote" always target the same provider chat as "Direct Chat", or can an Experience have a different negotiation contact than its hosting Provider? — **Answer:** "Request Quote" always targets the same provider chat as "Direct Chat". | No | Resolved |
| 2 | What happens to the "Request Quote" button state if the prior quote thread was declined or closed — does it re-enable? — **Answer:** Yes. "Request Quote" is re-enabled when the previous quote thread is Declined or Closed, allowing the Agency to submit a new quote request. | No | Resolved |

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


---

# MOD3

# Screen Spec: DSC033 Experience Detail

| Field | Value |
|---|---|
| Screen ID | `DSC033` |
| Screen name | Experience Detail |
| Actor | Tour Agency |
| Priority | Must |
| Belongs to module | `spec-MOD3.md` — Module 3: AI Tour Matching |
| Mockup image | `img/DSC033.png` |
| Status | Draft |

## 1. Purpose

**Shown when:** The Agency taps into an Experience from Explore (EXP017), Village Profile (VIL030), Provider Profile (DSC122), or "View Experience Detail" from AI Tour Matching (AIT121) to view full details and take action (Chat, Request Quote).

**The user leaves this screen when:** The Agency taps a breadcrumb link, or taps one of the actions (Request Quote, Direct Chat, View Provider Profile, Explore Village) to move to another screen.

## 2. Mockup

![DSC033](img/DSC033.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Top nav bar | Header | Explore (active) / AI Tour Matching / Bookings / Schedule / Messages | Yes | — |
| 2 | Account info (top right) | Text | Agency name, "Portal ID: #xxxx"; avatar opens Account Dropdown | Yes | — |
| 3 | Breadcrumb | Text/Button | "Home / Explore Experiences / <Village name> / <Experience name>" — each segment is a link | Yes | — |
| 4 | Category tag + Experience code | Text | Category label (e.g. "Traditional Craft & Heritage"), internal code (e.g. `VN-HND-VUN-042`) | Yes | — |
| 5 | Experience title | Text | Experience name from `spec-EXP.md` §5.1 | Yes | — |
| 6 | Short description | Text | Experience intro paragraph | Yes | — |
| 7 | Image gallery (Plate I/II/III) | Image | Workshop illustration photos; Plate I large (composition), Plate II/III smaller | Yes | Minimum 1 image, 3 images recommended per mockup |
| 8 | Image source caption | Text | Photo source attribution, field-audit verification date | No | — |
| 9 | B2B Wholesale Pricing block | Text | "Confidential Rate" badge; price per person; short inclusions description (what the price covers). Displayed per the pricing rule (SR-004): Provider only enters the Listed Price; an authorized Admin may apply a discount, and the system auto-calculates the final price. (a) Listed Price present, no discount → show the Listed Price (this mockup's state). (b) Listed Price present, discount applied → show the original Listed Price struck through plus the discounted final price. (c) No Listed Price → show "Contact for Quote" instead of a price. The Provider cannot directly enter or override the discounted/final price | Yes | Price fields never directly editable by the Provider beyond Listed Price |
| 10 | Capacity & Logistics block | Text | Max capacity + private-group note, program duration, supported languages | Yes | — |
| 11 | Location & Access block | Text/Image | Coordinates, map pin, studio name, address, coach-access instructions | Yes | — |
| 12 | Organization & Village Context card | Text/Button | Two sub-sections: Hosting Provider (name, "Verified Local Maker" badge, director/contact line, "View Provider Profile" button) and Affiliated Craft Village (name, region tag, founding note, "Explore Village" button) | Yes | — |
| 13 | "Request Quote" button | Button | Opens Chat with an auto-sent quote-request message | Yes | Sendable once per Experience (Request Quote – Action) |
| 14 | "Direct Chat with <Provider>" button | Button | Opens Chat with the Experience's owning provider | Yes | — |
| 15 | Section 01 – Curatorial Overview | Text | Founding year, entity type, heading, 2 cultural-context paragraphs | Yes | — |
| 16 | 3 stat cards (Material Integrity / Social Impact / Finished Artifact) | Text | Title + short description | No | — |
| 17 | Section 02 – Workshop Itinerary | List | Total duration; steps (Step 01, 02, 03...) each with a time window, title, detailed description | Yes | Sum of step durations must equal the declared program duration |
| 18 | Section 03 – Participant Guidelines & Accessibility | Text/Tag | Feature tags (wheelchair access, tool safety, child friendly, photography), guideline bullets (quiet demeanor, dietary, cancellation/adjustment policy) | Yes | — |
| 19 | Footer | Text | Network name, links to Terms of Service / Security Audit / Portal Dispatch version, copyright | No | — |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | Full Experience content: images, price, itinerary, accessibility, provider/village context, as in the mockup | Agency opens a published Experience with complete data |
| Empty (no data) | Secondary blocks (gallery, stat cards, provider/village context) are hidden or show a "No information provided" placeholder; required fields (name, price, capacity) still render | Provider has not fully filled in the Experience |
| Loading | Skeleton for image gallery, pricing block, itinerary, and the Organization & Village Context card while data loads | Agency just navigated in; data is being fetched |
| Error | "Could not load Experience information" message with a "Retry" button; action buttons (Request Quote, Chat) are disabled | Experience data fails to load |
| Success / confirmation | After tapping Request Quote: a toast/banner confirms "Quote request sent" before the screen navigates to Chat | Request Quote sent successfully |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | Breadcrumb — "Home" | tap | Returns to the Agency home/landing screen | `EXP017` |
| 2 | Breadcrumb — "Explore Experiences" | tap | Returns to the Explore list | `EXP017` |
| 3 | Breadcrumb — Village name | tap | Opens the Village profile | `VIL030` |
| 4 | Request Quote | tap | Opens Chat, auto-sends a quote-request message | `COM048` |
| 5 | Direct Chat with Provider | tap | Opens Chat with the provider | `COM048` |
| 6 | "View Provider Profile" button (Organization & Village Context card) | tap | Opens the owning Provider's profile | `DSC122` |
| 7 | "Explore Village" button (Organization & Village Context card) | tap | Opens the Village profile | `VIL030` |
| 8 | Location & Access map | tap | Expands the map / opens directions | stays (opens overlay) |
| 9 | Avatar dropdown | tap | Opens Account Dropdown | stays (opens overlay) |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | "Request Quote" can be sent only once per Experience/activity | Screen List (Request Quote – Action) |
| SR-002 | Displayed max capacity must stay consistent with data the Provider entered in EXP069/EXP070 | Business inference |
| SR-003 | Sum of Workshop Itinerary step durations must equal the declared Program Duration | Mockup |
| SR-004 | Pricing display rule: Provider enters only the Listed Price. An authorized Admin may apply a discount, with the system auto-calculating the final price. (a) Listed Price, no discount → show Listed Price with a "Confidential Rate" badge. (b) Listed Price + discount → show the original Listed Price struck through plus the discounted final price. (c) No Listed Price → show "Contact for Quote". Provider cannot directly enter or override the discounted/final price | Clarification |
| SR-005 | "View Provider Profile" and "Explore Village" are explicit buttons inside the Organization & Village Context card, not inline text links | Mockup (updated) |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| `EXP FR-003` | Displays the full Experience detail information permitted to an authenticated Tour Agency. |
| `EXP FR-006` | Provides the Experience-detail surface on which visit duration and defined section-engagement signals can be recorded. |
| `EXP FR-007` | Provides strong-intent Experience actions such as Request Quote and Chat for interaction logging. |
| `EXP FR-011` | Provides the Request Quote action from the selected Experience context. |
| `EXP FR-012` | Provides the Direct Chat action that opens the Local Provider conversation for the selected Experience. |
## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the sidebar (Pricing/Capacity/Location/Organization & Village Context) moves below the main content; image gallery switches from a grid to a horizontal-swipe carousel
- Text that must remain readable (contrast, minimum size): net/pax price, "Confidential Rate" badge, and accessibility tags (wheelchair, child friendly...) need high contrast, minimum 14px

## 9. Open questions

| # | Question | Blocking? | Status |
|---|---|---|---|

None — all open questions resolved.

---

## Completion checklist

- [x] The mockup is a separate cropped image file, named with the Screen ID.
- [x] Every visible element in the mockup appears in the element inventory.
- [x] Every input element has a validation rule or an explicit "none".
- [x] All five states are filled in, or marked "not applicable" with a reason.
- [x] Every navigation target is a Screen ID that exists in the Screen List.
- [ ] Every element that displays data names the field it displays, matching the module spec. *(pending `spec-MOD3.md`)*

---

Template source: DBIZ3, VJCBI College - FTU, Session 4. Built on the DBIZ2 Screen Design
structure (Screen List and Screen Layout), per DBIZ3 Syllabus v3.

