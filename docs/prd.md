# PRD: Hanoi Artisan Bridge

**Product:** Hanoi Artisan Bridge (HAB)  
**Version:** v3.0 (Session 7 Midterm Baseline)  
**Team:** Group G — DBIZ3 AI-native Product Development (VJCBI College, FTU)  
**Date:** 30 September 2026  
**Status:** Approved Baseline  

---

## 1. Executive Summary & Problem Statement

### 1.1 The Problem
Hanoi and surrounding Red River Delta provinces are home to over 1,300 traditional craft villages (e.g., Bát Tràng ceramics, Vạn Phúc silk, Chuông conical hats, Phú Vinh bamboo and rattan). Despite surging international and domestic interest in experiential and cultural tourism, the B2B supply chain between outbound/inbound **Tour Agencies** and **Local Craft Providers** suffers from severe friction:
1. **Discovery Fragmentation:** Tour operators rely on informal contacts, social media, and outdated directories without verified operational or pricing details.
2. **Lack of Institutional Verification:** Agencies face reputational risks regarding artisan authenticity, safety, and capacity without municipal or tourism authority validation.
3. **Communication & Booking Friction:** Lack of centralized availability, standardized quote requests, and structured B2B negotiation leads to high cancellation rates and booking mismatches.
4. **Sub-optimal Tour Itineraries:** Agencies struggle to match specific tourist group personas (e.g., family leisure vs. corporate MICE vs. deep craft workshops) with suitable geographic routing and craft village constraints.

### 1.2 The Solution: Hanoi Artisan Bridge (HAB)
Hanoi Artisan Bridge is an AI-native B2B platform that bridges Tour Agencies with verified Local Craft Providers in Hanoi's traditional craft villages:
- **Governance & Verification:** Multi-tier administration where the Hanoi Department of Tourism (HDT) and local commune authorities (UBND) vet and monitor providers and agencies.
- **AI Tour Matching:** An intelligent conversational assistant translating natural-language tour requirements into optimal, route-feasible craft village experience recommendations.
- **B2B Collaboration:** Structured Explore catalogs, direct In-app Chat with document attachments, and quote/booking lifecycle workflows.

---

## 2. Target Users & Stakeholders

| Persona | Role & Core Needs | Platform Privileges |
|---|---|---|
| **Tour Agency** | Inbound/outbound travel agencies, tour operators, and TMCs seeking curated, verified artisan experiences for tourist groups. | Self-registers (with business license & email OTP), explores experiences, uses AI Tour Matching, initiates quotes, chats with providers, and tracks bookings. |
| **Local Provider** | Artisans, household workshops, and craft cooperatives providing authentic village experiences. | Created by UBND; manages business profile, experiences, pricing, operating hours, weekly availability, and booking lifecycle. |
| **UBND Admin** | Local Commune People's Committee managing craft village jurisdiction. | Vets and verifies local provider profiles, manages provider accounts within assigned village, monitors local cultural tourism activities. |
| **HDT Admin** | Hanoi Department of Tourism platform-wide administrator. | Approves Tour Agency registrations, creates UBND accounts, manages ranking parameters, monitors system-wide dashboards and compliance. |
| **Guest** | Unauthenticated public visitor. | Views public craft village catalog and public provider profiles; initiates agency self-registration; cannot access AI Matching or B2B booking. |

---

## 3. MoSCoW Prioritized Scope (Session 3 Confirmed Baseline)

The MVP scope was established in Session 3 with the Client and refined in Session 4. Every **Must** requirement directly delivers a core capability specified in the module functional specifications.

### 3.1 Must Have (Core MVP Deliverables)

All 43 Must functions are delivered across the 7 specification modules:

| Function ID | Function Name | Delivering Spec Module | Description & Scope Reference |
|---|---|---|---|
| **F-AUTH-01** to **04** | Agency Registration & Verification | [`AUT`](docs/spec/specs/spec-AUT.md) | Guest self-registration, validation, duplicate checking, and account creation in Pending Approval. |
| **F-AUTH-05** to **08** | Authentication & Role Routing | [`AUT`](docs/spec/specs/spec-AUT.md) | Credential verification, session generation, status checking, and routing to role-specific dashboard. |
| **F-AUTH-09** | Session Termination | [`AUT`](docs/spec/specs/spec-AUT.md) | Invalidation of authentication token and session state. |
| **F-AUTH-10** to **12** | Password Recovery | [`AUT`](docs/spec/specs/spec-AUT.md) | Time-limited token reset links sent via email. |
| **F-AUTH-13** to **14** | Password Change | [`AUT`](docs/spec/specs/spec-AUT.md) | In-app credential change with password hashing. |
| **F-AUTH-15** to **17** | RBAC & Scope Enforcement | [`AUT`](docs/spec/specs/spec-AUT.md) | Role initialization, per-action permission checks, and periodic session validity verification. |
| **F-AUTH-18** | HDT Agency Approval | [`AUT`](docs/spec/specs/spec-AUT.md) | HDT review of agency registrations and major profile changes. |
| **F-AUTH-19** | HDT Create UBND Account | [`AUT`](docs/spec/specs/spec-AUT.md) | Administrative provisioning of village-scoped UBND accounts. |
| **F-AUTH-20** | UBND Create Provider Account | [`AUT`](docs/spec/specs/spec-AUT.md) | Creation of local provider credentials within assigned village. |
| **F-AUTH-21** to **22** | Account Lifecycle Management | [`AUT`](docs/spec/specs/spec-AUT.md) | Administrative listing, filtering, disable, enable, and password reset actions. |
| **F-AUTH-23** | Registration Email OTP | [`AUT`](docs/spec/specs/spec-AUT.md) | 6-digit email OTP verification prior to agency creation. |
| **F-PROFILE-01** to **02** | Tour Agency Profile | [`PRF`](docs/spec/specs/spec-PRF.md) | Public vs. private agency profile view, owner editing, and HDT re-review trigger on tax ID / legal name change. |
| **F-PROFILE-03** to **04** | Local Provider Profile | [`PRF`](docs/spec/specs/spec-PRF.md) | Multi-tier visibility, draft saving, weekly operating hours, and submission to UBND. |
| **F-PROFILE-05** | UBND Provider Verification | [`PRF`](docs/spec/specs/spec-PRF.md) | Commune-level verification, approval, or revision-required feedback. |
| **F-PROFILE-06** | Experience & Pricing Management | [`PRF`](docs/spec/specs/spec-PRF.md) | Experience creation, required image categories, and active booking field locking. |
| **F-MATCH-01** to **02** | AI Assistant Access & Input | [`AIT`](docs/spec/specs/spec-AIT.md) | Agency-only conversational interface for capturing natural-language tour requirements. |
| **F-MATCH-03** to **04** | Intent & Preference Modeling | [`AIT`](docs/spec/specs/spec-AIT.md) | Structured tour context extraction, clarification loops, and weighted preference profile generation. |
| **F-MATCH-05** to **07** | Candidate Retrieval & Scoring | [`AIT`](docs/spec/specs/spec-AIT.md) | Filtering verified providers, route calculation, and multi-factor suitability scoring. |
| **F-MATCH-08** to **09** | Recommendations & Refinement | [`AIT`](docs/spec/specs/spec-AIT.md) | Displaying Top 5 matches with match explanations and conversational criteria relaxation. |
| **F-MATCH-12** | No-Match Fallback | [`AIT`](docs/spec/specs/spec-AIT.md) | Contextual relaxation suggestions when match scores fall below threshold. |
| **F-EXPLORE-01** to **04** | Catalog Browsing & Detail | [`EXP`](docs/spec/specs/spec-EXP.md) | Filterable search of verified villages, providers, experiences, and detail views. |
| **F-EXPLORE-05** to **07** | Interaction Logging & Ranking | [`EXP`](docs/spec/specs/spec-EXP.md) | Recording explore sessions, calculating ranking scores, and deploying parameter updates. |
| **F-SCHED-01** to **04** | Booking Creation & Transition | [`BKG`](docs/spec/specs/spec-BKG.md) | Initializing booking in On hold, provider confirmation to Booked, completion, and cancellation. |
| **F-SCHED-05** to **08** | Booking Calendar & History | [`BKG`](docs/spec/specs/spec-BKG.md) | Agency and provider booking lists, status history audit logs, and calendar views. |
| **F-SCHED-09** | Availability Calculation | [`BKG`](docs/spec/specs/spec-BKG.md) | Computing available booking slots based on operating hours, capacity, and active reservations. |
| **F-ADMIN-01** to **05** | Administrative Dashboards | [`ADM`](docs/spec/specs/spec-ADM.md) | HDT platform KPIs, UBND village statistics, ranking parameter configuration, and audit logs. |
| **F-CHAT-01** to **05** | B2B In-App Chat | [`IAC`](docs/spec/specs/spec-IAC.md) | Persistent chat sessions between agency and provider, messaging, pagination, session close, and attachments. |

### 3.2 Should Have (High-Value Enhancements)
- **F-PROFILE-07:** AI-assisted description draft generation with human-in-the-loop review.
- **F-MATCH-10:** Persistent Agency Preference Profile saving and reuse across sessions.
- **F-MATCH-11:** One-click Quote Request creation linking AI recommendations directly to Chat.
- **F-MATCH-13 & 14:** Time-decay event processing and feedback loop integration for ranking models.
- **F-EXPLORE-08 & 09:** Trending experiences indicator and personalized recommendations based on past agency signals.
- **F-SCHED-10:** Email notification triggers upon booking status changes (On hold, Booked, Cancelled).

### 3.3 Could Have (Future Release Candidates)
- Multi-village sequential tour itinerary builder.
- Automated calendar synchronization with Google Calendar / iCal.
- Multi-language UI support (English, Vietnamese, French, Japanese).

### 3.4 Won't Have (Out of Scope for MVP)
- Real-time payment gateway integration, credit card processing, or automated escrow (B2B payment terms are handled directly offline between parties).
- SMS OTP gateway (email OTP via SMTP/API is authoritative).
- Direct automated API synchronization with Vietnam National Administration of Tourism (VNAT) databases.
- Consumer-facing B2C booking or retail shopping checkout.

---

## 4. Scope Evolution Since Session 3

| Component | Session 3 Client Discussion | Refinement in Session 4/5 Spec | Reason for Change |
|---|---|---|---|
| **Booking Lifecycle** | Direct confirmation upon request was proposed. | Canonical states: `On hold` -> `Booked` -> `Completed` / `Cancelled`. | Ensures Local Providers explicitly verify workshop capacity before confirming (F-SCHED-03). |
| **Agency Approval** | Simple email verification. | 2-step verification: Email OTP verification followed by HDT compliance check of business license. | Eliminates fraudulent travel agencies and satisfies regulatory requirements. |
| **Provider Onboarding** | Self-registration by craft households. | UBND-administered account creation only. | Rural artisans require local government assistance and validation of craft village legitimacy. |
| **Chat Scoping** | Chat tied per experience or quote request. | Chat scoped per Agency–Provider organization pair; quotes attached as context messages. | Prevents fragmented communication channels between the same business partners. |

---

## 5. Non-Functional Requirements & System Constraints

1. **Security & Privacy:** Strictly zero production personal data (PII) in development. Synthetic data only. Passwords hashed using bcrypt/argon2.
2. **Determinism:** Mockup test seed data is 100% reproducible via fixed UUID namespaces.
3. **Availability & Performance:** AI matching responses delivered within 5 seconds; catalog filtering within 500ms.
4. **Architectural Traceability:** Strict end-to-end traceability from PRD functions to Spec FRs, ERD entities, SQL schemas, and Mockup Seed rows.
