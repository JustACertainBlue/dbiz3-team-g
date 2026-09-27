# Screen Spec: EXP017 Explore

| Field | Value |
|---|---|
| Screen ID | `EXP017` |
| Screen name | Explore |
| Actor | Tour Agency |
| Priority | Must |
| Belongs to module | `Module 4 — Explore` |
| Mockup image | `img/EXP017.png` |
| Status | Draft |

## 1. Purpose

**Shown when:** The Tour Agency is logged in and opens the main Explore/discovery area. The screen displays verified Village/Experience cards through browsing sections; the search bar opens AI Tour Matching directly, and user behavior within the session is recorded to update preferences and re-rank recommendations.

**The user leaves this screen when:** The user opens AI Tour Matching, a Village/Profile or Experience Detail, another global navigation area, or a booking/experience action whose destination is defined by the product flow.

## 2. Mockup

![EXP017](img/EXP017.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Global header / portal brand | Header / Text | `HANOI ARTISAN BRIDGE`; subtitle `B2B TRAVEL AGENCY PORTAL` | Yes | Static |
| 2 | Explore navigation item | Navigation / Tab | `EXPLORE`; active state shown | Yes | Static; active route must match EXP017 |
| 3 | AI Tour Matching navigation item | Navigation / Tab / Button | `AI TOUR MATCHING` with `AI` badge | Yes | Always routes directly to `AIT121` |
| 4 | Bookings navigation item | Navigation / Tab | `BOOKINGS` | Yes | Static label; destination is not defined in the supplied Screen List |
| 5 | Messages navigation item | Navigation / Tab | `MESSAGES` | Yes | Static label; destination is not defined in the supplied Screen List |
| 6 | Schedule navigation item | Navigation / Tab | `SCHEDULE` | Yes | Static label; destination is not defined in the supplied Screen List |
| 7 | Current agency identity | Header / Text | `Indochina Heritage Voyages`; secondary `ID: VN-9042` | Yes | Read-only; value comes from authenticated Agency account |
| 8 | Notification bell | Icon / Status | Bell notification icon | No | Display-only / unclickable on this screen; no validation |
| 9 | Account avatar | Button / Icon | `IH` avatar initials | Yes | Read-only display derived from current user/account |
| 10 | Account dropdown chevron | Button / Icon | Down-chevron beside avatar | Yes | Opens shared Account Dropdown component |
| 11 | Page context badge | Badge / Text | `B2B DISCOVERY & WHOLESALE BOOKING` | Yes | Display-only tag; no interaction or validation |
| 12 | Registry codex reference | Badge / Text | `REGISTRY CODEX VN-2025` | Yes | Display-only tag; no interaction or validation |
| 13 | Page title | Heading | `Explore Craft Villages & Artisan Experiences` | Yes | Static |
| 14 | Page description | Text | `Discover traditional Vietnamese craft heritage, verified village clusters, and direct allotment master workshops for inbound itineraries.` | Yes | Static |
| 15 | Discovery search field | Input | Placeholder: `Search craft type, village, or keyword (or describe your group)...` | Yes | Text input. No length/format rule is specified in the supplied requirements. Input may contain natural-language tour needs. Submission opens AI Tour Matching rather than performing a local results filter. |
| 16 | AI Tour Matching CTA | Button | `AI TOUR MATCHING` with lightning icon | Yes | Enabled when the user can enter/submit a query; no additional validation rule specified. |
| 17 | Featured Craft Village Experiences heading | Heading | `Featured Craft Village Experiences` | Yes | Static |
| 18 | Featured village card: Bat Trang | Card / Image / Text | Village `Bat Trang Pottery Village`; `EST. 14TH CENTURY`; `HIGH POTTERY`; `Gia Lam - Hanoi`; description; `VERIFIED CLUSTER`; `Slots: Available` | Yes | Card must display verified village data supplied by discovery service. Tags such as `VERIFIED CLUSTER`, era, craft type, and location are display-only. Availability must reflect current slot data if shown. |
| 19 | Bat Trang image placeholder | Image | `[IMAGE PLACEHOLDER]` for Bat Trang Pottery Village | Yes | Image asset should resolve or fall back to placeholder |
| 20 | Bat Trang View Details | Button / Link | `VIEW DETAILS →` | Yes | No input validation; destination is Village Profile `VIL030` |
| 21 | Featured village card: Van Phuc | Card / Image / Text | Village `Van Phuc Silk Village`; `EST. 10TH CENTURY`; `SILK DAMASK`; `Ha Dong - Hanoi`; description; `VERIFIED CLUSTER`; `Slots: Available` | Yes | Card data must come from verified village/experience discovery data. Visible tags are display-only and are not interactive. |
| 22 | Van Phuc image placeholder | Image | `[IMAGE PLACEHOLDER]` for Van Phuc Silk Village | Yes | Image asset should resolve or fall back to placeholder |
| 23 | Van Phuc View Details | Button / Link | `VIEW DETAILS →` | Yes | No input validation; destination is Village Profile `VIL030` |
| 24 | Featured village card: Chuong Conical Hat | Card / Image / Text | Village `Chuong Conical Hat Village`; `EST. 17TH CENTURY`; `PALM & BAMBOO`; `Thanh Oai - Hanoi`; description; `VERIFIED CLUSTER`; `Slots: Available` | Yes | Card data must come from verified village/experience discovery data. Visible tags are display-only and are not interactive. |
| 25 | Chuong image placeholder | Image | `[IMAGE PLACEHOLDER]` for Chuong Conical Hat Village | Yes | Image asset should resolve or fall back to placeholder |
| 26 | Chuong View Details | Button / Link | `VIEW DETAILS →` | Yes | No input validation; destination is Village Profile `VIL030` |
| 27 | Featured village card: Ngu Xa | Card / Image / Text | Village `Ngu Xa Bronze Casting`; `EST. 17TH CENTURY`; `LOST-WAX BRONZE`; `Ba Dinh - Hanoi`; description; `VERIFIED CLUSTER`; `Slots: Available` | Yes | Card data must come from verified village/experience discovery data. Visible tags are display-only and are not interactive. |
| 28 | Ngu Xa image placeholder | Image | `[IMAGE PLACEHOLDER]` for Ngu Xa Bronze Casting | Yes | Image asset should resolve or fall back to placeholder |
| 29 | Ngu Xa View Details | Button / Link | `VIEW DETAILS →` | Yes | No input validation; destination is Village Profile `VIL030` |
| 30 | Immersive Masterclasses section heading | Heading | `Immersive Masterclasses (Group & Academic Focus)` | Yes | Static |
| 31 | Currency display | Text | `Currency Display: VND (₫) Net Rate` | Yes | Display-only; not clickable and has no input validation. |
| 32 | Masterclass item: Wheel-Throwing & Celadon Glaze Masterclass | List item / Card | `Bat Trang`; `3.0 Hours`; `Centering & Glaze`; `Capacity: 4–16 Pax`; title, description, `₫320,000 / pax`, `B2B Net Rate ₫450,000 (Save 28.8%)` | Yes | Price, duration, capacity and availability must come from Experience data. Capacity/range must be valid numeric values. |
| 33 | Wheel-Throwing image placeholder | Image | `[Image Placeholder] BAT TRANG CERAMIC` | Yes | Image asset should resolve or fall back to placeholder |
| 34 | Wheel-Throwing View Details | Button / Link | `View Details` | Yes | Destination is Experience Detail `DSC033` |
| 35 | Wheel-Throwing Instant Book Allotment | Button | `INSTANT BOOK ALLOTMENT` | Yes | The action is not a direct booking. It opens Chat with the Local Provider for clarification/negotiation; no form validation is performed on this screen. |
| 36 | Masterclass item: Silk Jacquard Weaving & Organic Indigo Dye | List item / Card | `Van Phuc`; `3.5 Hours`; `Treadle Loom & Indigo`; `Capacity: 4–10 Pax`; title, description, `₫380,000 / pax`, `B2B Net Rate ₫520,000 (Save 26.9%)` | Yes | Price, duration, capacity and availability must come from Experience data. Capacity/range must be valid numeric values. |
| 37 | Silk Jacquard image placeholder | Image | `[Image Placeholder] VAN PHUC SILK` | Yes | Image asset should resolve or fall back to placeholder |
| 38 | Silk Jacquard View Details | Button / Link | `View Details` | Yes | Destination is Experience Detail `DSC033` |
| 39 | Silk Jacquard Instant Book Allotment | Button | `INSTANT BOOK ALLOTMENT` | Yes | The action is not a direct booking. It opens Chat with the Local Provider for clarification/negotiation; no form validation is performed on this screen. |
| 40 | Half-Day & Cultural Excursions section heading | Heading | `Half-Day & Cultural Excursions` | Yes | Static |
| 41 | Excursion card: Leaf Conical Hat Stitching | Card / Image / Text | `Thanh Oai`; `1.5 Hours`; title; description; `Capacity: ≤ 25 pax`; `₫180,000 / pax`; public reference price shown below | Yes | Price, duration, capacity and availability must come from Experience data |
| 42 | Leaf Conical Hat image placeholder | Image | `[Image Placeholder] CHUONG VILLAGE` | Yes | Image asset should resolve or fall back to placeholder |
| 43 | Leaf Conical Hat Book Experience | Button | `Book Experience` | Yes | Opens Chat with the Local Provider for clarification/negotiation; no form validation is performed on this screen |
| 44 | Excursion card: Eggshell Inlay & Lacquer Polishing | Card / Image / Text | `Thuong Tin`; `2.0 Hours`; title; description; `Capacity: ≤ 18 pax`; `₫390,000 / pax`; public reference price shown below | Yes | Price, duration, capacity and availability must come from Experience data |
| 45 | Eggshell Inlay image placeholder | Image | `[Image Placeholder] HA THAI LACQUER` | Yes | Image asset should resolve or fall back to placeholder |
| 46 | Eggshell Inlay Book Experience | Button | `Book Experience` | Yes | Opens Chat with the Local Provider for clarification/negotiation; no form validation is performed on this screen |
| 47 | Excursion card: Bamboo Paper Fan Calligraphy | Card / Image / Text | `Thach That`; `1.5 Hours`; title; description; `Capacity: ≤ 30 pax`; `₫160,000 / pax`; public reference price shown below | Yes | Price, duration, capacity and availability must come from Experience data |
| 48 | Bamboo Paper Fan image placeholder | Image | `[Image Placeholder] CHANG SON FANS` | Yes | Image asset should resolve or fall back to placeholder |
| 49 | Bamboo Paper Fan Book Experience | Button | `Book Experience` | Yes | Opens Chat with the Local Provider for clarification/negotiation; no form validation is performed on this screen |
| 50 | Endangered & Living Heritage section heading | Heading | `Endangered & Living Heritage (Specialist Guilds)` | Yes | Static |
| 51 | Specialist item 01: Beeswax Core Modeling & Precision Copper Chasing | List item / Card | `01`; `Ngu Xa Peninsula`; `Wax-Clay Mold Casting`; `Max 8 Pax`; title; description; `₫420,000 / pax`; public reference price shown below | Yes | Price, capacity and availability must come from Experience data |
| 52 | Specialist 01 Book Experience | Button | `Book Experience` | Yes | Opens Chat with the Local Provider for clarification/negotiation; no form validation is performed on this screen |
| 53 | Specialist item 02: Abalone Shell Sawing & Rosewood Marquetry | List item / Card | `02`; `Chuyen My Village`; `Abalone Shell Inlay`; `Max 10 Pax`; title; description; `₫350,000 / pax`; public reference price shown below | Yes | Price, capacity and availability must come from Experience data |
| 54 | Specialist 02 Book Experience | Button | `Book Experience` | Yes | Opens Chat with the Local Provider for clarification/negotiation; no form validation is performed on this screen |
| 55 | Footer copyright / network text | Footer / Text | `© 2025 Hanoi Artisan Bridge. Official B2B Gateway. | Ministry of Culture & Tourism Certified Network` | Yes | Static |
| 56 | Footer Operator Compliance link | Footer / Link | `OPERATOR COMPLIANCE` | No | Destination not specified in supplied Screen List |
| 57 | Footer Master Village Codex link | Footer / Link | `MASTER VILLAGE CODEX` | No | Destination not specified in supplied Screen List |
| 58 | Footer B2B Dispatch Support link | Footer / Link | `B2B DISPATCH SUPPORT` | No | Destination not specified in supplied Screen List |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | Full Explore page with verified village cards, experience sections, prices, capacity information, and navigation/header/footer as shown in the mockup. | Initial successful load for an authenticated Tour Agency |
| Empty (no data) | Page shell, header, search/AI matching entry point and footer remain visible. Each content section displays an explicit empty message such as `No verified villages or experiences are available right now.` Do not show fabricated cards, prices, availability, or recommendations. | Discovery API returns no eligible Village/Experience records |
| Loading | Page shell remains visible while discovery content is loading. Featured cards and experience rows use loading placeholders/skeletons; interactive content that depends on loaded records is disabled until data is available. | Initial page load or re-ranking refresh is in progress |
| Error | Page shell and search/AI matching entry point remain visible. Discovery sections show an inline error message such as `We couldn't load Explore right now. Please try again.` with a `Retry` action. Previously loaded data may remain visible if available; do not replace it with fabricated data. | Discovery data request or recommendation/ranking request fails |
| Success / confirmation | After a successful navigation or AI handoff, the destination screen opens. Experience action buttons successfully open the Local Provider chat with the selected Experience context. | AI handoff, navigation, or Local Provider chat opening succeeds |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | Explore navigation item | Click | Keeps the user on the Explore screen and marks Explore active | `EXP017` |
| 2 | AI Tour Matching navigation item | Click | Opens the chat-based AI matching flow | `AIT121` |
| 3 | Discovery search field | Click / type / submit | Accepts a natural-language search or tour description; submission always routes directly to AI Tour Matching | `AIT121` |
| 4 | AI Tour Matching CTA | Click | Routes directly to AI Tour Matching and passes the entered search text/current tour need when available | `AIT121` |
| 5 | Featured village card | Click card / view details | Opens the selected Village profile | `VIL030` |
| 6 | Featured village `VIEW DETAILS` | Click | Opens the selected Village profile | `VIL030` |
| 7 | Masterclass `View Details` | Click | Opens the selected Experience detail | `DSC033` |
| 8 | Masterclass `INSTANT BOOK ALLOTMENT` | Click | Opens Chat with the Local Provider for the selected Experience | `COM048` |
| 9 | Excursion `Book Experience` | Click | Opens Chat with the Local Provider for the selected Experience | `COM048` |
| 10 | Specialist `Book Experience` | Click | Opens Chat with the Local Provider for the selected Experience | `COM048` |
| 12 | Avatar / chevron | Click | Opens shared Account Dropdown | Account Dropdown (shared component; not a separate screen) |
| 13 | Bookings navigation item | Click | Opens booking management/history area | `[NEEDS CLARIFICATION: Screen ID not present in supplied Screen List for Tour Agency Bookings navigation]` |
| 14 | Messages navigation item | Click | Opens agency communication area | `COM048` |
| 15 | Schedule navigation item | Click | Opens agency schedule | `SCH141` |
| 16 | Footer Operator Compliance | Click | Opens compliance information | `[NEEDS CLARIFICATION: destination Screen ID]` |
| 17 | Footer Master Village Codex | Click | Opens village registry/codex information | `[NEEDS CLARIFICATION: destination Screen ID]` |
| 18 | Footer B2B Dispatch Support | Click | Opens support/help channel | `[NEEDS CLARIFICATION: destination Screen ID]` |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | This screen is for the authenticated Tour Agency actor. | Screen List: `EXP017` |
| SR-002 | Explore displays verified Village/Experience discovery content through browsing sections. | Screen List: `EXP017` |
| SR-003 | The search bar opens AI Tour Matching directly rather than acting as a standalone local filter. | Screen List: `EXP017` |
| SR-004 | User behavior within the session is recorded to update preferences and re-rank recommendations. | Screen List: `EXP017` |
| SR-005 | Data is sourced from the Local Provider’s latest submitted profile, experience, availability, capacity, and pricing information. Availability, capacity, and booking eligibility reflect the latest provider updates and are refreshed in real time when a booking or schedule change occurs. B2B net rate and public/reference price use the latest verified pricing data provided by the Local Provider. | User clarification |
| SR-006 | `Currency Display: VND (₫) Net Rate` is display-only and cannot be changed from this screen. | User clarification |
| SR-007 | `View Details` for Village cards routes to `VIL030`; `View Details` for Experiences routes to `DSC033`. | Screen List + mockup |
| SR-008 | Experience action buttons such as `INSTANT BOOK ALLOTMENT` and `Book Experience` route to Chat with the Local Provider; they do not complete a booking directly from Explore. | User clarification |
| SR-009 | If discovery data fails, the screen must provide an explicit retry/error state and must not fabricate Village/Experience data. | Product state requirement |
| SR-010 | The Explore page should preserve the global authenticated navigation and account controls shown in the mockup. | Mockup |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| `[NEEDS CLARIFICATION: Module 4 Explore FR IDs not provided]` | The supplied Screen List identifies `EXP017` as the main authenticated Explore/discovery screen, but no Module 4 functional-requirement IDs were provided in the supplied source. |

## 8. Responsive and accessibility notes

- Smallest supported width: Desktop only. No mobile or narrow-screen layout is in scope for this screen.
- What collapses or stacks on a narrow screen: Not applicable; narrow/mobile behavior is out of scope. Desktop layouts should preserve the hierarchy shown in the mockup across supported desktop viewport sizes.
- Text that must remain readable (contrast, minimum size): Body text, prices, availability, navigation labels, card titles and CTA labels must remain legible at normal desktop zoom. Interactive controls require a visible hover/focus state and sufficient contrast against the white/light-gray background.
- Keyboard accessibility: Search field, navigation items, card links/buttons, notification control, account dropdown, booking actions and footer links must be keyboard reachable in logical top-to-bottom order.
- Screen-reader/accessibility labels: Icon-only controls such as notification bell and account/avatar controls require accessible names; image placeholders require meaningful alternative text when a real image is available.
- Dynamic content: Price, capacity, availability and recommendation ordering must be exposed as readable text, not communicated by color alone.

## 9. Open questions

| # | Question | Blocking? | Status |
|---|---|---|---|
| 1 | Module 4 specification / FR IDs are pending and will be linked once the module spec is provided. | Yes | Pending module spec |
| 2 | [NEEDS CLARIFICATION: What are the exact rules for recommendation re-ranking, including which session behavior/events are recorded and when the ordering refreshes?] | Yes | Open |
| 4 | [NEEDS CLARIFICATION: What are the destinations for `Operator Compliance`, `Master Village Codex`, and `B2B Dispatch Support`?] | No | Open |

---

## Completion checklist

- [x] The mockup is a separate cropped image file, named with the Screen ID.
- [x] Every visible element in the mockup appears in the element inventory.
- [x] Every input element has a validation rule or an explicit "none".
- [x] All five states are filled in, or marked "not applicable" with a reason.
- [x] Every defined navigation target is a Screen ID that exists in the Screen List; undefined targets are explicitly marked as open questions.
- [x] Every element that displays data names the field/content it displays, matching the supplied Screen List and mockup where available.

---

Template source: DBIZ3, VJCBI College - FTU, Session 4. Built on the DBIZ2 Screen Design structure (Screen List and Screen Layout), per DBIZ3 Syllabus v3.
