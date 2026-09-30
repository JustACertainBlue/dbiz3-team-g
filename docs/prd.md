# PRD: Hanoi Artisan Bridge MVP Scope v3

## 1. Product summary

Hanoi Artisan Bridge is a responsive web platform that connects Tour Agencies with verified Local Providers offering craft-village experiences. It gives Agencies one place to discover, compare, discuss and book suitable Experiences; it gives Local Providers a controlled way to publish and maintain their offerings; and it gives Hanoi Department of Tourism (HDT) and UBND administrators scoped monitoring and verification capabilities.

This document is the current MVP scope baseline. The Function List is the authoritative source for individual function contracts and priorities. Where this document differs from the earlier MVP draft, the current Function List and Consistency Contract take precedence.

## 2. Problem and opportunity

Tour Agencies need reliable craft-village partners when their existing supplier network cannot meet a tour's route, group-size, activity or timing requirements. Information about local providers and experiences is fragmented, difficult to compare and not consistently verified. Local Providers have limited visibility to Agencies. Public-sector stakeholders need an aggregated, scoped view of platform activity without taking over commercial booking decisions.

The product addresses this by maintaining a verified Provider and Experience catalogue, matching Agency requirements to eligible Experiences, enabling contextual communication and recording the resulting Booking lifecycle.

## 3. Target users and roles

| User or role | Primary need | MVP responsibility |
| --- | --- | --- |
| Tour Agency | Find suitable, trustworthy experience suppliers and coordinate a group visit | Register, browse, use AI matching, view schedules, chat and view its own bookings |
| Local Provider | Publish local craft-village experiences and manage agreed bookings | Maintain own profile and Experiences, manage Booking lifecycle, participate in Chat |
| UBND Admin | Verify and monitor Providers in one assigned village | Create Local Provider accounts, verify Provider profiles within assigned village, view scoped dashboard data |
| HDT Admin | Govern the platform and oversee cross-village operation | Approve Agencies, create UBND accounts, manage account status and view platform-wide dashboard data |
| Guest | Explore public verified information | Browse public Explore, Provider and Experience views; no Booking or private data access |

## 4. Product objectives

1. Enable an Agency to move from a tour requirement to a verified Provider/Experience candidate and an agreed Booking without relying on an unstructured external spreadsheet or message trail.
2. Make public discovery data trustworthy by exposing only eligible Experiences from currently Verified Provider profiles linked to the seeded Village catalogue.
3. Keep commercial decisions with Agencies and Local Providers while preserving scoped oversight for UBND and HDT.
4. Preserve enough history for status, verification, communication and audit traceability.

## 5. MVP scope and MoSCoW priorities

### Must have

| Capability | Included outcome | Authoritative function IDs | Specification |
| --- | --- | --- | --- |
| Authentication, account lifecycle and access control | Agency registration with OTP and HDT approval; login/logout; password recovery; RBAC; HDT/UBND account administration; personal account management | `F-AUTH-01` to `F-AUTH-26` | [AUT](spec/specs/spec-AUT.md) |
| Agency, Provider and Experience profiles | Agency and Provider profile viewing/editing; Provider profile verification by assigned UBND; Experience management with verified publication controls | `F-PROFILE-01` to `F-PROFILE-06` | [PRF](spec/specs/spec-PRF.md) |
| AI Tour Matching | Agency enters tour requirements; system clarifies, models preferences, retrieves eligible candidates, applies hard constraints, ranks and presents recommendations or fallback options | `F-MATCH-01` to `F-MATCH-09`, `F-MATCH-12` | [AIT](spec/specs/spec-AIT.md) |
| Public and authenticated Explore | Browse verified Experience cards and view Experience/Provider details | `F-EXPLORE-01` to `F-EXPLORE-03` | [EXP](spec/specs/spec-EXP.md) |
| Schedule and Booking | Public Provider schedule; Agency private schedule; Provider creates/updates Booking; lifecycle is On hold, Booked, Completed or Cancelled; calculated availability and schedule synchronization | `F-SCHED-01` to `F-SCHED-10` | [BKG](spec/specs/spec-BKG.md) |
| Core In-app Chat | Agency/Provider open a contextual chat, exchange text messages and view their own history | `F-CHAT-01` to `F-CHAT-03` | [IAC](spec/specs/spec-IAC.md) |
| Admin monitoring | HDT/UBND dashboard, scoped metrics, village filter and Agency/Provider/Booking metrics | `F-ADMIN-01` to `F-ADMIN-03`, `F-ADMIN-05`, `F-ADMIN-07` to `F-ADMIN-09` | [ADM](spec/specs/spec-ADM.md) |

### Should have

| Capability | Included outcome | Authoritative function IDs | Specification |
| --- | --- | --- | --- |
| AI description refinement | Generate a standardized draft while retaining original Provider/Experience content | `F-PROFILE-07` | [PRF](spec/specs/spec-PRF.md) |
| Preference learning and Explore ranking | Record Agency behavior, update preference weights, re-rank within session and evaluate ranking quality | `F-MATCH-10`, `F-MATCH-11`, `F-MATCH-13` to `F-MATCH-16`, `F-EXPLORE-04` to `F-EXPLORE-17` | [AIT](spec/specs/spec-AIT.md), [EXP](spec/specs/spec-EXP.md) |
| Advanced dashboard filters and collaboration metric | Time/Agency/Provider filtering and ranked collaboration pairs | `F-ADMIN-04`, `F-ADMIN-06`, `F-ADMIN-10` | [ADM](spec/specs/spec-ADM.md) |

### Could have

| Capability | Included outcome | Authoritative function IDs | Specification |
| --- | --- | --- | --- |
| Quote request and richer Chat | Request Quote from Explore, close chats and exchange permitted attachments | `F-EXPLORE-11`, `F-EXPLORE-12`, `F-CHAT-04`, `F-CHAT-05` | [EXP](spec/specs/spec-EXP.md), [IAC](spec/specs/spec-IAC.md) |


### Won't have in this MVP

- E-contract management.
- Native mobile application; MVP is responsive web.
- Village catalogue CRUD or Village verification lifecycle. Village is a seeded, read-only reference catalogue; Provider verification determines eligibility.
- Automatic AI model retraining. The System adjusts ranking parameters from recorded learning/quality data, promotes a qualified version automatically and rolls back on measured degradation; it does not retrain an AI model.
- CMS, featured content, bulk notification, accounting, staff management or advanced moderation.

## 6. Key business rules

- `ADMIN` is one role with `admin_type = HDT` or `UBND`; permissions and data scope depend on subtype.
- UBND may create and verify Local Provider accounts/profiles only within its assigned village. HDT approves Agency registration and manages platform-wide administration.
- A Provider profile must be currently Verified before its Experiences can be eligible for public discovery and AI matching.
- A Booking has one operating time slot in MVP. Its canonical lifecycle is `On hold → Booked → Completed` or `Cancelled`; a new Booking begins `On hold`, which expires after 72 hours if not resolved.
- Chat is contextual and access-controlled. At most one Active chat exists for an Agency-Provider pair; Closed chats remain immutable historical records.
- Public users see only permitted public data. Private schedules, booking detail, account actions and scoped dashboard data require authorization.

## 7. Success criteria

The MVP is ready to build when the following can be demonstrated without manual interpretation:

1. An Agency can register, be approved, sign in and receive only authorized access.
2. A UBND Admin can create a Local Provider account, review a complete submitted profile in its village and publish a Verified version.
3. An Agency can obtain matching recommendations from eligible Provider/Experience data, inspect details and begin a permitted conversation.
4. A Local Provider can create a Booking, manage allowed status changes and have both Provider and Agency schedules reflect the result.
5. HDT and UBND dashboards show the same metric definition within their different permitted scopes.
6. Every Must capability traces from this PRD to a Function ID, module specification, screen specification, data entity and synthetic seed evidence.

## 8. Scope decisions recorded from the earlier MVP draft

| Earlier draft wording | Current decision | Reason/source of truth |
| --- | --- | --- |
| In-app Chat was Should | Core open/send/view Chat is Must; closing and file attachment remain Should | Current Function List priorities and IAC spec |
| Explore learning loop was described as Must | Core Explore browsing is Must; behavior learning, re-ranking and KPI optimization are Should | Current Function List priorities |
| Village profile CRUD/verification was implied | Village is a seeded read-only catalogue; Provider profile verification is the governed workflow | Consistency Contract and `F-PROFILE-05` |
| HDT and UBND both verify all Provider information | UBND verifies Provider profiles only in its assigned village; HDT approves Agencies and monitors platform-wide | `F-PROFILE-05`, `F-AUTH-18`, `F-AUTH-20` |
| Standalone notifications were Could | Supporting notification records may exist, but no standalone notification feature is committed | Current Function List and data model |

## 9. Repository traceability

- Function contracts and priorities: [Function List](spec/docs/function-list.md)
- Cross-artifact mapping: [Traceability Matrix](spec/docs/traceability-matrix.md)
- Shared roles, states and data definitions: [Consistency Contract](spec/docs/consistency-contract.md)
- Data model and seed package: [data/README.md](../data/README.md)
- Screen specifications: `docs/spec/screens/screen-spec-<ID>.md`
