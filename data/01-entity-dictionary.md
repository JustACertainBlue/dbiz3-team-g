---
artifact: 01-entity-dictionary.md
step: S1
generated: 2026-09-28
sources: FUNCTIONS, FIELDS, ENTITIES, RULES, SCENARIOS, FLOWS, SCREENS, BOUNDARY (all present)
---

# 01 — Entity dictionary

Consolidated entity dictionary for Hanoi Artisan Bridge. This step reconciles entity lists written
by different module authors into one canonical set; it does not re-examine the business.

## Input map

```
INPUT MAP
  FUNCTIONS = Function List, 92 stable IDs (docs/spec/docs/function-list.md)
  FIELDS    = Function List Input/Output columns + §5.1 IO tables of the 7 module specs
  ENTITIES  = §6 "Key entities" of AUT, PRF, AIT, EXP, BKG, IAC, ADM
  RULES     = module §5.2 BR tables + docs/spec/docs/consistency-contract.md
  SCENARIOS = module §3 acceptance/success criteria
  FLOWS     = architecture usage-flow + sequence-diagram Mermaid blocks
  SCREENS   = docs/spec/docs/screen-list.md + docs/spec/screens/screen-spec-*.md
  BOUNDARY  = module §1 "Depends on" + architecture/context.md
CITATION SCHEME = Function ID (F-*) or module rule (AUT/PRF/AIT/EXP/BKG/IAC/ADM BR-*/§n)
```

`Owner` is the requirements module responsible for an entity's meaning, not the actor permitted to
edit it. `Kind` is THING (exists in its own right, including seeded reference data) or EVENT (records
that something happened at a point in time). A `[NEEDS CLARIFICATION]` never authorises filling a gap
with a design guess.

## Entities

| Canonical name | Definition (one sentence) | THING/EVENT | Owner | Aliases | Citation |
|---|---|---|---|---|---|
| User Account | Authenticated identity holding role, admin subtype, account status and credentials. | THING | AUT | account, member | F-AUTH-04/07/19/20/22 |
| Role | Seeded canonical role code assigned to an account (ADMIN / Tour_Agency / Local_Provider). | THING (reference) | AUT | role code | F-AUTH-15/16; contract §Actor |
| Permission | Seeded action/resource permission checked before a protected operation. | THING (reference) | AUT | ACL entry | F-AUTH-15/16 |
| Session | Revocable authenticated user session. | EVENT | AUT | login session, token context | F-AUTH-07/09/17 |
| Registration OTP Challenge | Server-side email-verification attempt tied to one registration request. | EVENT | AUT | OTP, email verification | F-AUTH-23/04 |
| Password Reset Token | Single-use, 15-minute recovery authorization. | EVENT | AUT | recovery token, reset link | F-AUTH-11/12 |
| Registration Resubmission Token | Single-use edit authorization that expires 24 hours after issue for a returned registration; replacement or successful use invalidates older active tokens. | EVENT | AUT | resubmission link | F-AUTH-18/26; AUT BR-016 |
| Agency Registration Request | Agency registration and its current HDT review state, before an account exists. | THING | AUT | pending registration | F-AUTH-01–04/18/26 |
| Registration Submission Version | Immutable snapshot of one submitted or resubmitted registration. | EVENT | AUT | submission snapshot | F-AUTH-02/04/26 |
| Agency Review Record | One HDT decision and comments against a submitted registration or major change. | EVENT | AUT | HDT decision | F-AUTH-18/26 |
| UBND Village Assignment | Scope link between one UBND admin account and its one assigned village. | THING | AUT | village scope | F-AUTH-19/16 |
| Village | Seeded read-only locality catalog item. | THING (reference) | PRF | craft village, locality | F-PROFILE-03/04; contract §Village |
| Agency Profile | Approved Tour Agency business and profile data. | THING | PRF | agency, company profile | F-PROFILE-01/02 |
| Agency Major Change Request | Proposed Company Name / Tax ID change held separate from approved Agency data until HDT review. | EVENT | PRF/AUT | major legal change | F-PROFILE-02; F-AUTH-18 |
| Provider Profile | Local Provider business data, verification state and published version pointer. | THING | PRF | provider, artisan business | F-PROFILE-03–05 |
| Provider Profile Version | Editable/submitted/last-published content snapshot for Provider verification. | EVENT | PRF | profile revision | F-PROFILE-04/05 |
| Provider Verification Review | One UBND decision on a Provider profile version. | EVENT | PRF | verification decision | F-PROFILE-05 |
| Provider Version Document | Supporting document (e.g. business registration certificate) attached to a Provider version. | THING | PRF | provider legal doc | F-PROFILE-04/05 |
| Provider Operating Hours | Recurring weekly local windows that feed availability calculation. | THING | PRF | working hours, opening hours | F-PROFILE-04; F-SCHED-09 |
| Experience | Provider-owned experience with pricing, capacity, location and booking policy. | THING | PRF | activity, offering | F-PROFILE-06 |
| Profile/Experience Media | Media reference plus category and its single owner (Agency / Provider / Experience). | THING | PRF | image, photo, gallery item | F-PROFILE-02/04/06 |
| AI Description Draft | Generated description proposal for a Provider or Experience, never auto-published. | EVENT | PRF | AI refine draft | F-PROFILE-07 |
| Matching Session | Agency AI-matching conversation and context. | EVENT | AIT | matching conversation | F-MATCH-01/02/09 |
| Matching Message | One user/assistant utterance inside a matching session. | EVENT | AIT | chat turn (matching) | F-MATCH-02/09 |
| Tour Preference Profile | Extracted constraints and weights for one matching session. | THING | AIT | requirement profile | F-MATCH-03/04/09 |
| Recommendation Result | Ranked candidate and explanation produced by matching (persistence open, Q-10). | EVENT | AIT | match result, ranked candidate | F-MATCH-05–08 |
| Agency Preference Profile | Persisted Agency preferences shared by Matching and Explore. | THING | AIT | Agency Experience Preference Profile | F-MATCH-10/16; F-EXPLORE-09 |
| Preference Signal | Time-stamped Agency preference evidence with decay weight. | EVENT | AIT | learning signal | F-MATCH-14/15; F-EXPLORE-07–09 |
| Quote Request | One reusable Agency–Experience inquiry identity (not a Booking). | THING | AIT | quote inquiry | F-MATCH-11; F-EXPLORE-11 |
| Explore Session | Anonymous or Agency browse session with consent context. | EVENT | EXP | browse session | F-EXPLORE-05/06 |
| Explore Interaction | Eligible click/view/filter/detail/action observation. | EVENT | EXP | interaction log, behavior event | F-EXPLORE-05–07/13 |
| Ranking Parameter Version | Controlled Explore ranking configuration version. | THING (reference) | EXP | algorithm version | F-EXPLORE-15–17 |
| Ranking Quality Assessment | Periodic KPI/quality evaluation of a ranking version. | EVENT | EXP | KPI evaluation | F-EXPLORE-14/16/17 |
| Booking | Provider-created single-slot reservation for an Agency and Experience. | THING | BKG | reservation, allotment | F-SCHED-03–07 |
| Booking Status History | One accepted Booking state transition (including worker expiry). | EVENT | BKG | status transition, booking event | F-SCHED-05/06/08 |
| Chat Session | Agency–Provider conversation, Active or Closed. | THING | IAC | conversation, thread | F-CHAT-01/04 |
| Chat Participant/Read State | Authorized membership and per-user unread position in a chat. | THING | IAC | membership, read cursor | F-CHAT-01/03 |
| Chat Message | Text or system booking-update message inside a chat. | EVENT | IAC | message | F-CHAT-02/03; F-SCHED-08 |
| Private Attachment | File metadata and private storage reference for chat or registration files. | THING | IAC/AUT | attachment, stored file link | F-CHAT-05; F-AUTH-02/26 |
| Notification | Recipient-scoped in-app event with read state and email-delivery outcome. | EVENT | AUT/BKG/PRF | alert, in-app notification | contract §Dashboard |
| Audit Log | Actor/action/target/time record for security and administrative changes. | EVENT | AUT | audit trail | AUT §6; F-AUTH-16/18/22 |

## Implied but never declared

Entities required by a function or rule but absent from the owning module's §6 entity list. Each is a
specification defect to send back to its owner, not a silent addition.

| Field name / noun | Source | Why it looks like an entity |
|---|---|---|
| Registration OTP Challenge | F-AUTH-23 input `otp_request_id`, attempt/resend limits | A server-side, stateful, expiring record with its own attempt counters — not derivable from the request row; absent from AUT §6. |
| Registration Submission Version | F-AUTH-26 resubmission "increments version and retains previous documents/reviews" | Append-only history the request cannot hold in a single row; absent from AUT §6. |
| Registration Resubmission Token | F-AUTH-26 single-use 24-hour token; F-AUTH-18 Request More Information; AUT BR-016 | A stateful authorization tied to a request; replacement or successful use invalidates older active tokens. It remains absent from the AUT §6 entity list but is fully defined by the current functional and business rules. |
| Agency Major Change Request | F-PROFILE-02 "proposed major changes stored separately"; F-AUTH-18 major review | Proposed Company Name/Tax ID that must not overwrite approved Agency values — a separate pending record; absent from PRF §6 entity list. |
| Provider Profile Version | F-PROFILE-04/05 "last Verified version remains published during new review" | Requires storing an editable version and a published version at once; absent as a first-class entity from PRF §6. |
| Notification | consistency contract §Dashboard; F-AUTH-18, F-PROFILE-05, F-SCHED-03 output `notification_status` | A recipient-scoped, read-tracked, delivery-tracked record referenced across modules but declared in no module §6. |
| Account/Profile Status History | consistency contract §Dashboard "snapshots at the selected end date" | As-of-date KPI needs status timestamps over time; a current-status column cannot reconstruct them; declared nowhere. |

## Conflicts requiring a human decision

| Type | Items | Sources | What must be decided | Decision |
|---|---|---|---|---|
| shared ownership | Private Attachment spans legal registration files and chat files with different access/retention | F-AUTH-02/26; F-CHAT-05 | One schema owner + per-context access policy (shared `stored_file` metadata vs split tables). | |
| shared ownership | Notification claimed by AUT, BKG and PRF flows | contract §Dashboard; F-AUTH-18/F-PROFILE-05/F-SCHED-03 | Assign one owning module and a module-specific event vocabulary. | |
| synonym | Agency Preference Profile vs "Agency Experience Preference Profile" | F-MATCH-10; EXP Open Question 13; contract §Explore | Confirm one shared record consumed by both Matching and Explore; do not keep two copies. | |
| type mismatch / duplicate authority | `account_status` declared on both Agency Profile (PRF §6) and User Account (AUT) | F-AUTH-07; F-PROFILE-01 | Store status on User Account only; Agency Profile derives it as a view. | |
| collision risk | "Booking Event" (BKG §6) names both a status transition and a chat/notification side effect | BKG §6; F-SCHED-08 | Keep Booking Status History (transition) separate from the emitted Chat message / Notification. | |
| surplus-entity candidate | Recommendation Result has no required CRUD write (F-MATCH-08 returns but never persists) | F-MATCH-08; §02 anomaly | Decide whether ranked results persist (traceability) or stay transient; see Q-10. | |

## Open questions

| # | Question | Blocking? | Owner | Default applied | Consequence if the default is wrong |
|---|---|---|---|---|---|
| Q1 | [NEEDS CLARIFICATION: is `tax_id` globally unique across Agencies and across historical rejected registration versions?] | No | AUT/PRF | Treat `tax_id` as a unique business key on the current approved Agency only; rejected history retains its value without releasing it. | Duplicate legal identities could be approved, or a legitimate re-registration blocked. |
| Q2 | [NEEDS CLARIFICATION: what stable natural key identifies a seeded Village? Name is not unique-safe.] | No | PRF/data | Use a provisional `DEMO-HN-*` source code as the natural key until an authoritative catalog is supplied. | Seed rows cannot be upserted against the real catalog; village references may need remapping. |
| Q3 | [NEEDS CLARIFICATION: does an unaccepted AI Description Draft persist, and for how long?] | No | PRF/AIT | Persist drafts with an `accepted_at?`; expire unaccepted drafts under a later retention policy. | Storage grows with abandoned drafts, or draft history needed for audit is lost. |
| Q4 | [NEEDS CLARIFICATION: is a UBND assignment strictly one village per UBND, and can a village have several UBND admins?] | No | AUT | One village per UBND account (unique `ubnd_user_id`); a village may have more than one UBND admin. | Scope checks (F-AUTH-16) misfire if the real rule differs. |
