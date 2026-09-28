# 01 — Entity dictionary

## Input map

| Slot | Source | Status |
|---|---|---|
| FUNCTIONS | [Function List](../../docs/spec/docs/function-list.md), 91 stable IDs | Present |
| FIELDS | Function List input/output and seven [module FR/IO tables](../../docs/spec/specs/) | Present; type/ownership gaps listed in [review](05-review.md) |
| ENTITIES | §6 of AUT, PRF, AIT, EXP, BKG, IAC, ADM module specs | Present; mixes stored records and derived views |
| RULES | Module BR tables and [consistency contract](../../docs/spec/docs/consistency-contract.md) | Present |
| SCENARIOS | Module acceptance/success criteria | Present; incomplete for some boundary cases |
| FLOWS / SCREENS | Usage/sequence diagrams and Screen Specs | Present |

`Owner` is the requirements module responsible for the meaning of an entity, not the user permitted to edit it. `View` is a query result, not automatically a stored table.

## A. Canonical entities

| Code | Canonical entity | Kind | Owner | One-sentence definition and source |
|---|---|---|---|---|
| USR | User Account | Thing | AUT | Authenticated identity, role, account status and credentials; F-AUTH-04/07/19/20/22. |
| ROL | Role | Reference | AUT | Canonical role code assigned to accounts; F-AUTH-15/16 and consistency contract §Actor. |
| PER | Permission | Reference | AUT | Action/resource permission checked before protected work; F-AUTH-15/16. |
| SES | Session | Event | AUT | Revocable authenticated user session; F-AUTH-07/09/17. |
| OTP | Registration OTP Challenge | Event | AUT | Server-side email-verification attempt tied to a registration request; F-AUTH-23/04. |
| RST | Password Reset Token | Event | AUT | Single-use, expiring recovery authorization; F-AUTH-11/12. |
| RET | Registration Resubmission Token | Event | AUT | Single-use, time-limited edit authorization tied to a registration request; F-AUTH-26. |
| REG | Agency Registration Request | Thing | AUT | Agency registration and current HDT review state; F-AUTH-01–04/18/26. |
| RSV | Registration Submission Version | Event | AUT | Immutable snapshot of one submitted/resubmitted registration; F-AUTH-18/26. |
| RRV | Agency Review Record | Event | AUT | HDT decision and comments against a submission; F-AUTH-18/26. |
| UAS | UBND Village Assignment | Thing | AUT | Scope link between an UBND admin account and its one assigned village; F-AUTH-19/16. |
| VIL | Village | Reference | PRF | Seeded read-only locality catalog item; F-PROFILE-03/04 and consistency contract §Village. |
| AGY | Agency Profile | Thing | PRF | Agency business and profile data; F-PROFILE-01/02. |
| MCR | Agency Major Change Request | Event | PRF/AUT | Proposed Company Name/Tax ID change kept separate from approved Agency data until HDT review; F-PROFILE-02, F-AUTH-18. |
| PRV | Provider Profile | Thing | PRF | Provider business data, verification state and published version; F-PROFILE-03–05. |
| PPV | Provider Profile Version | Event | PRF | Editable/submitted/last-published content snapshot for Provider verification; F-PROFILE-04/05. Exact field scope open. |
| PVR | Provider Verification Review | Event | PRF | UBND decision on a Provider profile version; F-PROFILE-05. |
| OHR | Provider Operating Hours | Thing | PRF | Recurring local weekly windows used to calculate availability; F-PROFILE-04, F-SCHED-09. |
| EXP | Experience | Thing | PRF | Provider-owned experience, pricing, capacity, location and booking policy; F-PROFILE-06. |
| MED | Profile/Experience Media | Thing | PRF | Media reference plus category and owner; F-PROFILE-02/04/06. |
| AID | AI Description Draft | Event | PRF | Generated description proposal for Provider/Experience; F-PROFILE-07. |
| MAT | Matching Session | Event | AIT | Agency AI matching conversation and context; F-MATCH-01/02/09. |
| MAM | Matching Message | Event | AIT | User/assistant utterance inside a matching session; F-MATCH-02/09. |
| TPP | Tour Preference Profile | Thing | AIT | Extracted constraints and weights for one matching session; F-MATCH-03/04/09. |
| REC | Recommendation Result | Event | AIT | Ranked candidate and explanation produced by matching; F-MATCH-05–08. |
| APP | Agency Preference Profile | Thing | AIT | Persisted Agency preferences shared by AIT and Explore; F-MATCH-10/16, F-EXPLORE-09. |
| SIG | Preference Signal | Event | AIT | Time-stamped Agency preference evidence; F-MATCH-14/15, F-EXPLORE-07–09. |
| QUO | Quote Request | Thing | AIT | One reusable Agency–Experience inquiry identity; F-MATCH-11, F-EXPLORE-11. |
| EXS | Explore Session | Event | EXP | Anonymous or Agency browse session with consent context; F-EXPLORE-05/06. |
| EIL | Explore Interaction | Event | EXP | Eligible click/view/filter/detail/action observation; F-EXPLORE-05–07/13. |
| RPV | Ranking Parameter Version | Reference | EXP | Controlled Explore ranking configuration version; F-EXPLORE-15–17. |
| RQA | Ranking Quality Assessment | Event | EXP | Periodic KPI/quality evaluation; F-EXPLORE-14/16/17. |
| BKG | Booking | Thing | BKG | Provider-created, single-slot reservation for Agency and Experience; F-SCHED-03–07. |
| BSH | Booking Status History | Event | BKG | Accepted booking state transition; F-SCHED-05/06/08. |
| CHS | Chat Session | Thing | IAC | Agency–Provider conversation, active or closed; F-CHAT-01/04. |
| CHP | Chat Participant/Read State | Thing | IAC | Authorized membership and per-user unread position; F-CHAT-01/03. |
| CHM | Chat Message | Event | IAC | Text/system booking update inside Chat; F-CHAT-02/03, F-SCHED-08. |
| ATT | Private Attachment | Thing | IAC/AUT | File metadata and private storage reference for chat/registration; F-CHAT-05, F-AUTH-02/26. Shared owner unresolved. |
| NOT | Notification | Event | AUT/BKG/PRF | Recipient-scoped in-app event, read state, and email-delivery outcome; consistency contract §Dashboard. Shared owner unresolved. |
| AUD | Audit Log | Event | AUT | Actor/action/target/time record for security/review changes; AUT §6, F-AUTH-16/18/22. |

## B. Derived views and aliases

| Module-spec noun | Treatment and evidence |
|---|---|
| Experience Card/Detail, Related Experience Set, Ranked Experience | Views from EXP/PRV/MED and ranking results; EXP §6, F-EXPLORE-01–04/10. |
| Public Schedule Block, Agency Private Schedule Entry | Views from OHR + BKG; BKG §6, F-SCHED-01/02/09. |
| Dashboard View/Filter/Card/Metrics/Collaboration Pair/Time Series | Scoped aggregates, not separately editable; ADM §6, F-ADMIN-01–10. |
| Chat List Entry, Message Cursor, Unread Count | Views from CHS/CHM/CHP; IAC §6, F-CHAT-03. |
| Candidate Experience, Route Distance Record, Ranked Candidate | Matching intermediates; whether REC persists is open; AIT §6, F-MATCH-05–08. |
| Agency Experience Preference Profile | Alias of APP; EXP Open Question 13 and consistency contract §Explore and AI. |
| Booking Condition, Group Arrival Record, Booking Event | Booking snapshot, completion transition and BSH/CHM event respectively; BKG §6, BR-016, F-SCHED-03/05/06/08. |

## C. Reconciliation decisions for human review

| ID | Conflict or implied entity | Current treatment |
|---|---|---|
| NC-01 | AUT §6 omits OTP Challenge, Submission Version and Resubmission Token, but F-AUTH-23/26 require them | Implied entities; AUT owner to confirm. |
| NC-02 | ATT serves legal and chat files with different access/retention rules | Shared metadata is a candidate; owner to decide. |
| NC-03 | In-app Notification is in the consistency contract but not module §6 | Candidate NOT; assign an owner. |
| NC-04 | AIT recommendation persistence vs transient calculation is not explicit | REC persistence remains optional. |
| NC-05 | Global ranking approval and algorithm approver UI are unresolved | RPV/RQA analytical records only; no approval action inferred. |
| NC-06 | Provider review state and last published Verified version coexist | PPV is an implied entity; exact version/snapshot boundary needs PRF owner decision. |
| NC-07 | Major Agency legal changes were absent from PRF §6 entity list | MCR is required by F-PROFILE-02/F-AUTH-18; proposed values must not overwrite approved AGY values. |
