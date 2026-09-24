# Screen Spec: DSC122

> File này gộp 2 bản draft khác nhau của DSC122 (tham chiếu module spec khác nhau, một vài chi tiết khác nhau). Cả 2 bản được giữ nguyên bên dưới để đối chiếu.

---

# PRF

# Screen Spec: DSC122 Provider Profile

| Field | Value |
|---|---|
| Screen ID | `DSC122` |
| Screen name | Provider Profile |
| Actor | Tour Agency |
| Priority | Must |
| Belongs to module | `module-spec-PRF` |
| Mockup image | `img/DSC122.png` |
| Status | Draft |

## 1. Purpose

**Shown when:** A logged-in Tour Agency opens a Local Provider from Explore, AI Tour Matching, or a Village Profile, to view the Provider's permitted business information, Village affiliation, and Experiences before contacting or requesting a quote.

**The user leaves this screen when:** The Agency navigates back via breadcrumb/nav, opens an Experience (View Details), starts a Chat/Request Quote, opens the Village Profile, or opens the top-level Account menu.

## 2. Mockup

![DSC122](img/DSC122.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Global nav (Explore, AI Tour Matching, Bookings, Schedules, Messages) | Header | Static links, per-actor menu | Yes | — |
| 2 | Agency identity chip | Text | `agency_name` + `agency_id` of logged-in Agency (session) | Yes | — |
| 3 | User avatar / name | Header | Logged-in user's initials, name, role | Yes | — |
| 4 | Breadcrumb (Home / Explore / Village / Provider) | Navigation | Static + `village.name`, `provider.business_name` | Yes | — |
| 5 | Verified badge | Text | Derived from Provider Profile `verification_status = Verified` (only Verified Providers reach this screen per BR-007) | Yes | — |
| 6 | Provider title | Header | `business_name` (Provider Profile, FR-003) | Yes | — |
| 7 | Master artisan / subtitle | Text | `artisan_names` (Provider Profile) | No | — |
| 8 | Location line | Text | `location` (Provider Profile) | Yes | — |
| 9 | Specialty tag chips (Est. year, craft tags) | Tag list | `craft_type` / `craft specialties` tags (Provider Profile) | No | — |
| 10 | "Direct Chat with Master" button | Button | Opens Chat | Yes | Visible to authenticated Tour Agency only |
| 11 | Hero image | Image | Primary `profile_images` item | Yes | — |
| 12 | Guild Status / B2B Capacity info row | Text | Provider profile fields (custom attributes) | No | — |
| 13 | "Workshop Facilities & Capacity" section | Header | Static | Yes | — |
| 14 | Facility cards (x3) | List/Card | Provider facility attributes (title, description, metric) | No | — |
| 15 | Gallery carousel (image + slide counter) | Image | `profile_images` array | Yes | Min per BR-008 image rules |
| 16 | Carousel prev/next arrows | Button | Cycles gallery images | Yes | — |
| 17 | Gallery thumbnail strip (6 items) | List | `profile_images` thumbnails | Yes | Selected thumbnail highlights active slide |
| 18 | "Offered Workshop Experiences" section | Header | Static | Yes | — |
| 19 | Experience card (x2, instant confirm type) | Card | `Experience` entity: name, images, duration, capacity, level, description, public rate, B2B net rate, contract tier, guaranteed pax | Yes | Only Published, live Experiences shown |
| 20 | Experience card (x1, bespoke/on-request type) | Card | `Experience` entity: name, images, days, cohort size, description, pricing model = Custom Commission | Yes | — |
| 21 | "View Details" link (per card) | Link | Navigates to Experience Detail | Yes | — |
| 22 | "Chat with Provider" button (per instant-confirm card) | Button | Opens Chat | Yes | — |
| 23 | "Request Quote" button (bespoke card) | Button | Triggers Request Quote action | Yes | Fires only once per Experience (Screen List rule); remains visible but disabled after first use, rather than disappearing |
| 24 | "Village Affiliation" section | Card | `Village` entity: name, description, registry no., status | Yes | — |
| 25 | "Agency Logistics & Operational Coordination" box | Card | Dispatch contact fields (phone, coordinator, languages, pier/parking info, accessibility note) | No | — |
| 26 | Footer nav & legal links | Footer | Static | Yes | — |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | Full Provider profile with gallery, facilities, Experiences and Village affiliation, as in the mockup | Provider exists and is Verified |
| Empty (no data) | Facilities/Experience sections hidden or replaced with "No Experiences published yet" message; gallery falls back to a single placeholder image | Provider has zero Published Experiences (e.g. all in Draft) |
| Loading | Skeleton blocks for header, hero image, facility cards, and Experience cards while profile and Experience data load | Screen just opened / data fetch in progress |
| Error | Full-page error message ("This profile is unavailable") with a link back to Explore | Provider not found, deleted, or `verification_status` is not `Verified` (BR-007), or fetch fails |
| Success / confirmation | N/A on this screen — confirmation of a sent quote/chat message appears inside Chat (COM048), not here | — |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | Breadcrumb "Explore" | tap | Navigates to Explore | `EXP017` |
| 2 | Breadcrumb Village segment | tap | Navigates to the Provider's Village | `VIL030` |
| 3 | "Direct Chat with Master" | tap | Opens conversation thread with this Provider | `COM048` |
| 4 | Carousel prev/next arrows | tap | Advances/rewinds gallery image | stays |
| 5 | Thumbnail | tap | Sets that image as the active slide | stays |
| 6 | Experience "View Details" | tap | Opens the Experience | `DSC033` |
| 7 | "Chat with Provider" (instant-confirm card) | tap | Opens Chat with this Provider, no pre-filled message | `COM048` |
| 8 | "Request Quote" (bespoke card) | tap | Opens Chat and auto-sends the initial quote-request message for that Experience (once only) | `COM048` |
| 9 | "Bat Trang Ceramic Village Guild" title | tap | Opens the affiliated Village profile | `VIL030` |
| 10 | Avatar | tap | Opens the account dropdown | Account Dropdown (—) |
| 11 | Nav: AI Tour Matching / Bookings / Schedules / Messages | tap | Navigates to that module | `AIT121` / `BKG137` / `SCH141` / Chat list |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | Only Verified Provider profiles are eligible for display to a Tour Agency. | BR-007 |
| SR-002 | Displayed fields follow actor-specific visibility rules for Tour Agency: the Agency can view the Provider's business name, craft type, artisan names, location, description, operating hours, Experiences, pricing, capacity, booking conditions, and contact information (a restricted set compared to HDT, which additionally sees administrative/verification information such as business registration and verification details). | BR-004, FR-003 |
| SR-003 | "Request Quote" can be triggered only once per Experience per Agency; the button remains visible but disabled (shown as already-requested) on subsequent visits rather than disappearing. | Screen List, "Request Quote - Action" row |
| SR-004 | This screen is view-only; no Provider field can be edited from here. | BR-002, BR-003 |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| FR-003 | Renders Local Provider profile information filtered to the Tour Agency visibility rule set. |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the two-column hero (text + image) stacks to single column; the three facility cards and three Experience cards stack vertically; the gallery thumbnail strip becomes horizontally scrollable.
- Text that must remain readable (contrast, minimum size): B2B net price and "Save X%" text must retain sufficient contrast against the strikethrough public rate; badge text (Verified Heritage Provider) minimum 12px.

## 9. Open questions

| # | Question | Blocking? | Status |
|---|---|---|---|
| 1 | Agency-visible Provider fields: the Agency can view the Provider's business name, craft type, artisan names, location, description, operating hours, Experiences, pricing, capacity, booking conditions, and contact information. HDT has the same full-detail view, plus access to administrative/verification information such as business registration and verification details. | Yes | Closed |
| 2 | "Request Quote" remains visible-but-disabled after first use. | No | Closed |

---

## Completion checklist

- [x] The mockup is a separate cropped image file, named with the Screen ID.
- [x] Every visible element in the mockup appears in the element inventory.
- [x] Every input element has a validation rule or an explicit "none" (screen is view-only; no inputs).
- [x] All five states are filled in, or marked "not applicable" with a reason.
- [x] Every navigation target is a Screen ID that exists in the Screen List.
- [x] Every element that displays data names the field it displays, matching the module spec.


---

# module-spec-EXP

# Screen Spec: DSC122 Provider Profile

| Field | Value |
|---|---|
| Screen ID | `DSC122` |
| Screen name | Provider Profile |
| Actor | Tour Agency |
| Priority | Must |
| Belongs to module | `module-spec-EXP` |
| Mockup image | `img/DSC122.png` |
| Status | Draft |

## 1. Purpose

**Shown when:** A Tour Agency clicks "View Provider Profile" from `VIL030`, `DSC033`, or an Experience/Village card. Admin also views this screen (rendered identically to the Agency view, including B2B pricing/capacity). A Local Provider cannot open another Local Provider's profile through this screen.

**The user leaves this screen when:** they start a chat with the master/provider, open an Experience Detail, or navigate back via the breadcrumb.

## 2. Mockup

![DSC122](img/DSC122.png)

## 3. Element inventory

| # | Element | Type | Content / data source | Required | Validation |
|---|---|---|---|---|---|
| 1 | Header nav | Header | Logo, Explore/AI Tour Matching/Bookings/Schedule/Messages, user name/role + Portal ID, avatar | Yes | — |
| 2 | Breadcrumb | Text | "Home / Explore / [Village] / [Provider name]" | Yes | Non-clickable last crumb |
| 3 | Verified badge | Tag | "✓ Verified Heritage Provider" | No | Shown only for verified providers |
| 4 | Title | Header | Provider/workshop name | Yes | — |
| 5 | Subtitle | Text | Master artisan name + generation/title | Yes | — |
| 6 | Location line | Text | Village + district + city, with pin icon | Yes | — |
| 7 | Tag chips | Tag | e.g. "Est. YYYY", craft technique tags | No | — |
| 8 | Direct Chat with Master button | Button | "💬 Direct Chat with Master" | Yes | — |
| 9 | Hero image | Image | Workshop/master photo placeholder, aspect ratio note, caption | Yes | Falls back to placeholder if not uploaded |
| 10 | Meta row | Text | "Guild Status" value, "B2B Capacity" value | Yes | — |
| 11 | Facilities & Capacity card (×3) | Card | icon, title, description, stat label/value | Yes (per card) | — |
| 12 | Image gallery/carousel | Image | slide counter (e.g. "Slide 01/06"), large image + caption, prev/next arrows, thumbnail strip (labeled) | Yes | Only authenticated view; falls back to single static image on failure |
| 13 | "Offered Workshop Experiences" section header | Text | Static | Yes | — |
| 14 | Experience card (×N) | Card | tier tag ("Instant Confirm" / "Bespoke · On Request"), image, duration/guests/level meta, title, description, pricing block (public reference rate struck through, Agency B2B Net rate, savings %, guaranteed pax/slot OR "Contact for Pricing"), "View Details" link, "Chat with Provider →" or "Request Quote →" button | Yes (per card) | Bespoke-tier cards always show "Contact for Pricing" instead of a net rate |
| 15 | Village Affiliation section | Text | Guild/village name heading, description paragraph, verified registry number badge | Yes | — |
| 16 | Logistics & Dispatch section | List | 3 columns (Direct Dispatch & Hotline; Coach Turnaround & Parking; Access & Amenities), each icon/label/value/description | No | — |
| 17 | Footer | Footer | Brand, tagline, links, copyright, system ref | Yes | — |

## 4. States

| State | What the user sees | Trigger |
|---|---|---|
| Default | Fully populated provider page with facilities, gallery, and B2B-priced experience cards, as shown | Provider data and at least one experience resolve |
| Empty (no data) | "Offered Workshop Experiences" section shows "No experiences are currently listed by this provider." | Provider record exists but has zero published experiences |
| Loading | Skeleton blocks for hero image, facility cards, gallery, and experience cards; header/breadcrumb render immediately | Provider data is being fetched |
| Error | Full-section banner: "We couldn't load this provider's profile." with a "Retry" button; or full-page "This provider is no longer available." if the record was removed | Provider data fetch fails or provider ID is invalid |
| Success / confirmation | Not applicable — screen is view-only; chat/quote confirmations occur on their target screens (`COM048`) | — |

## 5. Interactions and navigation

| # | Element | User action | System response | Goes to screen |
|---|---|---|---|---|
| 1 | Breadcrumb village link | tap | — | `VIL030` |
| 2 | "Direct Chat with Master" | tap | Opens/continues chat with this provider | `COM048` |
| 3 | Gallery prev/next arrows | tap | Cycles the active slide | stays on `DSC122` |
| 4 | Gallery thumbnail | tap | Jumps to that slide | stays on `DSC122` |
| 5 | Experience card "View Details" | tap | — | `DSC033` |
| 6 | Experience card "Chat with Provider →" / "Request Quote →" | tap | Opens/creates a chat thread, auto-sending a quote request for Bespoke-tier items | `COM048` |
| 7 | Village Affiliation heading | tap | — | `VIL030` |

## 6. Screen-level rules

| Rule ID | Rule | Source |
|---|---|---|
| SR-001 | B2B Net pricing and guaranteed pax/slot values are visible only to authenticated, verified Tour Agencies, in contrast with the Guest view on `DSC123` | Screen List, DSC122 vs DSC123 overview |
| SR-002 | Bespoke/on-request experience tiers always show "Contact for Pricing" instead of a fixed net rate | Mockup, EXP-03 card |
| SR-003 | Only verified/published experiences render in the "Offered Workshop Experiences" list | Inferred, consistent with `VIL030` SR-001 |
| SR-004 | A Local Provider cannot view another Local Provider's profile on this screen — they only see their own Experiences and their affiliated Village (via the Agency-facing profile view). Admin sees this screen exactly as an Agency does, including full B2B pricing/capacity data | Clarified answer, open question #1 |

## 7. Linked requirements

| FR ID (from the module spec) | What this screen does for it |
|---|---|
| — | [NEEDS CLARIFICATION: module spec `module-spec-EXP` with FR IDs not yet available] |

## 8. Responsive and accessibility notes

- Smallest supported width: 360px
- What collapses or stacks on a narrow screen: the 3-column Facilities grid stacks to 1 column; the image carousel thumbnail strip becomes horizontally scrollable; the 3-column Experience card row stacks to 1 column; the 3-column Logistics & Dispatch row stacks to 1 column
- Text that must remain readable: struck-through public reference rate vs. bold B2B net rate must keep sufficient visual distinction (not just strikethrough) for accessibility

## 9. Open questions

| # | Question | Blocking? | Status |
|---|---|---|---|
| 1 | Can a Local Provider or Admin also view this screen for another provider, and if so does pricing render the same way? — **Answer:** A Local Provider does not see another Local Provider's profile through this screen — they only view their own experiences and their affiliated village, alongside the Agency-facing profile view. Admin views this screen the same way an Agency does (full B2B pricing/capacity data visible). | No | Resolved |
| 2 | Is the "Village Affiliation" section heading/name clickable through to `VIL030`, or informational only? — **Answer:** Clickable. | No | Resolved |

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

