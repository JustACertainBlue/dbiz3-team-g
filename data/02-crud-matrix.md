---
artifact: 02-crud-matrix.md
step: S2
generated: 2026-09-28
sources: FUNCTIONS, FIELDS, ENTITIES, RULES (all present)
---

# 02 — CRUD matrix (long form)

One row per (function, entity) pair that actually interacts, decided from each function's description
and its Input/Output contract — not from the entity name. `Ops` holds any of C, R, U, D. Entity codes
are the `Canonical name`s of [`01-entity-dictionary.md`](01-entity-dictionary.md), abbreviated by the
module code used there. A function that touches no persistent entity is kept with `—` so the 92-function
invariant stays visible. `D` means a delete/archive action is requested; the retention policy lives in
[`04-data-model.md`](04-data-model.md).

Entity code legend: USR User Account · ROL Role · PER Permission · SES Session · OTP Registration OTP
Challenge · RST Password Reset Token · RET Registration Resubmission Token · REG Agency Registration
Request · RSV Registration Submission Version · RRV Agency Review Record · UAS UBND Village Assignment ·
VIL Village · AGY Agency Profile · MCR Agency Major Change Request · PRV Provider Profile · PPV Provider
Profile Version · PVR Provider Verification Review · OHR Provider Operating Hours · EXP Experience ·
MED Profile/Experience Media · AID AI Description Draft · MAT Matching Session · MAM Matching Message ·
TPP Tour Preference Profile · REC Recommendation Result · APP Agency Preference Profile · SIG Preference
Signal · QUO Quote Request · EXS Explore Session · EIL Explore Interaction · RPV Ranking Parameter
Version · RQA Ranking Quality Assessment · BKG Booking · BSH Booking Status History · CHS Chat Session ·
CHP Chat Participant · CHM Chat Message · ATT Private Attachment · NOT Notification · AUD Audit Log.

## Interactions

| Function | Entity | Ops | Citation |
|---|---|---|---|
| F-AUTH-01 | — | — | F-AUTH-01 |
| F-AUTH-02 | REG | C | F-AUTH-02 |
| F-AUTH-02 | RSV | C | F-AUTH-02 |
| F-AUTH-02 | ATT | C | F-AUTH-02 |
| F-AUTH-03 | USR | R | F-AUTH-03 |
| F-AUTH-04 | USR | C | F-AUTH-04 |
| F-AUTH-04 | RSV | R | F-AUTH-04 |
| F-AUTH-04 | AGY | C | F-AUTH-04 |
| F-AUTH-04 | OTP | R | F-AUTH-04 |
| F-AUTH-04 | REG | RU | F-AUTH-04 |
| F-AUTH-05 | — | — | F-AUTH-05 |
| F-AUTH-06 | USR | R | F-AUTH-06 |
| F-AUTH-07 | SES | C | F-AUTH-07 |
| F-AUTH-07 | USR | RU | F-AUTH-07 |
| F-AUTH-07 | ROL | R | F-AUTH-07 |
| F-AUTH-08 | USR | R | F-AUTH-08 |
| F-AUTH-09 | SES | RU | F-AUTH-09 |
| F-AUTH-10 | — | — | F-AUTH-10 |
| F-AUTH-11 | RST | C | F-AUTH-11 |
| F-AUTH-11 | USR | R | F-AUTH-11 |
| F-AUTH-12 | RST | RU | F-AUTH-12 |
| F-AUTH-12 | USR | RU | F-AUTH-12 |
| F-AUTH-13 | USR | R | F-AUTH-13 |
| F-AUTH-14 | USR | RU | F-AUTH-14 |
| F-AUTH-15 | USR | R | F-AUTH-15 |
| F-AUTH-15 | ROL | R | F-AUTH-15 |
| F-AUTH-15 | PER | R | F-AUTH-15 |
| F-AUTH-15 | SES | U | F-AUTH-15 |
| F-AUTH-16 | USR | R | F-AUTH-16 |
| F-AUTH-16 | ROL | R | F-AUTH-16 |
| F-AUTH-16 | PER | R | F-AUTH-16 |
| F-AUTH-16 | UAS | R | F-AUTH-16 |
| F-AUTH-17 | USR | R | F-AUTH-17 |
| F-AUTH-17 | SES | RU | F-AUTH-17 |
| F-AUTH-18 | RRV | C | F-AUTH-18 |
| F-AUTH-18 | AUD | C | F-AUTH-18 |
| F-AUTH-18 | NOT | C | F-AUTH-18 |
| F-AUTH-18 | REG | RU | F-AUTH-18 |
| F-AUTH-18 | RSV | R | F-AUTH-18 |
| F-AUTH-18 | RET | C | F-AUTH-18; AUT BR-016 |
| F-AUTH-18 | MCR | RU | F-AUTH-18 |
| F-AUTH-18 | USR | RU | F-AUTH-18 |
| F-AUTH-18 | AGY | U | F-AUTH-18 |
| F-AUTH-19 | USR | C | F-AUTH-19 |
| F-AUTH-19 | UAS | C | F-AUTH-19 |
| F-AUTH-19 | AUD | C | F-AUTH-19 |
| F-AUTH-19 | VIL | R | F-AUTH-19 |
| F-AUTH-20 | USR | C | F-AUTH-20 |
| F-AUTH-20 | PRV | C | F-AUTH-20 |
| F-AUTH-20 | AUD | C | F-AUTH-20 |
| F-AUTH-20 | UAS | R | F-AUTH-20 |
| F-AUTH-20 | VIL | R | F-AUTH-20 |
| F-AUTH-21 | USR | R | F-AUTH-21 |
| F-AUTH-21 | REG | R | F-AUTH-21 |
| F-AUTH-21 | PRV | R | F-AUTH-21 |
| F-AUTH-21 | UAS | R | F-AUTH-21 |
| F-AUTH-22 | AUD | C | F-AUTH-22 |
| F-AUTH-22 | RST | C | F-AUTH-22 |
| F-AUTH-22 | USR | RU | F-AUTH-22 |
| F-AUTH-22 | UAS | R | F-AUTH-22 |
| F-AUTH-22 | SES | RU | F-AUTH-22 |
| F-AUTH-23 | REG | R | F-AUTH-23 |
| F-AUTH-23 | OTP | CRU | F-AUTH-23 |
| F-PROFILE-01 | AGY | R | F-PROFILE-01 |
| F-PROFILE-01 | MED | R | F-PROFILE-01 |
| F-PROFILE-02 | MCR | C | F-PROFILE-02 |
| F-PROFILE-02 | MED | CD | F-PROFILE-02 |
| F-PROFILE-02 | AUD | C | F-PROFILE-02 |
| F-PROFILE-02 | AGY | RU | F-PROFILE-02 |
| F-PROFILE-02 | USR | R | F-PROFILE-02 |
| F-PROFILE-02 | REG | R | F-PROFILE-02 |
| F-PROFILE-03 | PRV | R | F-PROFILE-03 |
| F-PROFILE-03 | PPV | R | F-PROFILE-03 |
| F-PROFILE-03 | VIL | R | F-PROFILE-03 |
| F-PROFILE-03 | OHR | R | F-PROFILE-03 |
| F-PROFILE-03 | EXP | R | F-PROFILE-03 |
| F-PROFILE-03 | MED | R | F-PROFILE-03 |
| F-PROFILE-04 | PPV | CRU | F-PROFILE-04 |
| F-PROFILE-04 | OHR | CRUD | F-PROFILE-04 |
| F-PROFILE-04 | MED | CRD | F-PROFILE-04 |
| F-PROFILE-04 | PRV | RU | F-PROFILE-04 |
| F-PROFILE-05 | PVR | C | F-PROFILE-05 |
| F-PROFILE-05 | AUD | C | F-PROFILE-05 |
| F-PROFILE-05 | NOT | C | F-PROFILE-05 |
| F-PROFILE-05 | PRV | RU | F-PROFILE-05 |
| F-PROFILE-05 | PPV | RU | F-PROFILE-05 |
| F-PROFILE-05 | UAS | R | F-PROFILE-05 |
| F-PROFILE-06 | EXP | CRUD | F-PROFILE-06 |
| F-PROFILE-06 | MED | CRUD | F-PROFILE-06 |
| F-PROFILE-06 | PRV | R | F-PROFILE-06 |
| F-PROFILE-06 | BKG | R | F-PROFILE-06 |
| F-PROFILE-07 | AID | C | F-PROFILE-07 |
| F-PROFILE-07 | PRV | R | F-PROFILE-07 |
| F-PROFILE-07 | EXP | R | F-PROFILE-07 |
| F-MATCH-01 | MAT | C | F-MATCH-01 |
| F-MATCH-01 | AGY | R | F-MATCH-01 |
| F-MATCH-01 | USR | R | F-MATCH-01 |
| F-MATCH-02 | MAM | C | F-MATCH-02 |
| F-MATCH-02 | MAT | RU | F-MATCH-02 |
| F-MATCH-03 | MAM | R | F-MATCH-03 |
| F-MATCH-03 | MAT | R | F-MATCH-03 |
| F-MATCH-04 | TPP | C | F-MATCH-04 |
| F-MATCH-04 | MAT | R | F-MATCH-04 |
| F-MATCH-04 | MAM | R | F-MATCH-04 |
| F-MATCH-05 | TPP | R | F-MATCH-05 |
| F-MATCH-05 | VIL | R | F-MATCH-05 |
| F-MATCH-05 | PRV | R | F-MATCH-05 |
| F-MATCH-05 | EXP | R | F-MATCH-05 |
| F-MATCH-05 | OHR | R | F-MATCH-05 |
| F-MATCH-05 | BKG | R | F-MATCH-05 |
| F-MATCH-06 | TPP | R | F-MATCH-06 |
| F-MATCH-06 | EXP | R | F-MATCH-06 |
| F-MATCH-06 | OHR | R | F-MATCH-06 |
| F-MATCH-06 | BKG | R | F-MATCH-06 |
| F-MATCH-07 | TPP | R | F-MATCH-07 |
| F-MATCH-07 | EXP | R | F-MATCH-07 |
| F-MATCH-08 | TPP | R | F-MATCH-08 |
| F-MATCH-08 | EXP | R | F-MATCH-08 |
| F-MATCH-09 | MAM | C | F-MATCH-09 |
| F-MATCH-09 | MAT | RU | F-MATCH-09 |
| F-MATCH-09 | TPP | RU | F-MATCH-09 |
| F-MATCH-10 | APP | CU | F-MATCH-10 |
| F-MATCH-10 | AGY | R | F-MATCH-10 |
| F-MATCH-10 | TPP | R | F-MATCH-10 |
| F-MATCH-11 | QUO | CR | F-MATCH-11 |
| F-MATCH-11 | CHS | CRU | F-MATCH-11 |
| F-MATCH-11 | CHM | C | F-MATCH-11 |
| F-MATCH-11 | AGY | R | F-MATCH-11 |
| F-MATCH-11 | EXP | R | F-MATCH-11 |
| F-MATCH-11 | PRV | R | F-MATCH-11 |
| F-MATCH-11 | MAT | R | F-MATCH-11 |
| F-MATCH-12 | TPP | R | F-MATCH-12 |
| F-MATCH-13 | CHS | R | F-MATCH-13 |
| F-MATCH-13 | CHM | R | F-MATCH-13 |
| F-MATCH-13 | MAT | R | F-MATCH-13 |
| F-MATCH-14 | SIG | C | F-MATCH-14 |
| F-MATCH-14 | CHM | R | F-MATCH-14 |
| F-MATCH-14 | MAT | R | F-MATCH-14 |
| F-MATCH-14 | CHS | R | F-MATCH-14 |
| F-MATCH-14 | EXP | R | F-MATCH-14 |
| F-MATCH-15 | SIG | R | F-MATCH-15 |
| F-MATCH-16 | APP | RU | F-MATCH-16 |
| F-MATCH-16 | SIG | R | F-MATCH-16 |
| F-MATCH-16 | EXP | R | F-MATCH-16 |
| F-EXPLORE-01 | EXP | R | F-EXPLORE-01 |
| F-EXPLORE-01 | PRV | R | F-EXPLORE-01 |
| F-EXPLORE-01 | MED | R | F-EXPLORE-01 |
| F-EXPLORE-01 | APP | R | F-EXPLORE-01 |
| F-EXPLORE-02 | EXP | R | F-EXPLORE-02 |
| F-EXPLORE-02 | PRV | R | F-EXPLORE-02 |
| F-EXPLORE-02 | MED | R | F-EXPLORE-02 |
| F-EXPLORE-03 | EXP | R | F-EXPLORE-03 |
| F-EXPLORE-03 | PRV | R | F-EXPLORE-03 |
| F-EXPLORE-03 | MED | R | F-EXPLORE-03 |
| F-EXPLORE-03 | OHR | R | F-EXPLORE-03 |
| F-EXPLORE-03 | BKG | R | F-EXPLORE-03 |
| F-EXPLORE-04 | EXP | R | F-EXPLORE-04 |
| F-EXPLORE-04 | PRV | R | F-EXPLORE-04 |
| F-EXPLORE-04 | APP | R | F-EXPLORE-04 |
| F-EXPLORE-05 | EXS | CU | F-EXPLORE-05 |
| F-EXPLORE-05 | EIL | C | F-EXPLORE-05 |
| F-EXPLORE-05 | EXP | R | F-EXPLORE-05 |
| F-EXPLORE-05 | PRV | R | F-EXPLORE-05 |
| F-EXPLORE-06 | EIL | C | F-EXPLORE-06 |
| F-EXPLORE-06 | EXS | R | F-EXPLORE-06 |
| F-EXPLORE-06 | EXP | R | F-EXPLORE-06 |
| F-EXPLORE-07 | EIL | C | F-EXPLORE-07 |
| F-EXPLORE-07 | SIG | C | F-EXPLORE-07 |
| F-EXPLORE-07 | EXS | R | F-EXPLORE-07 |
| F-EXPLORE-07 | EXP | R | F-EXPLORE-07 |
| F-EXPLORE-07 | QUO | R | F-EXPLORE-07 |
| F-EXPLORE-07 | CHS | R | F-EXPLORE-07 |
| F-EXPLORE-08 | EIL | R | F-EXPLORE-08 |
| F-EXPLORE-08 | SIG | R | F-EXPLORE-08 |
| F-EXPLORE-09 | APP | CRU | F-EXPLORE-09 |
| F-EXPLORE-09 | EIL | R | F-EXPLORE-09 |
| F-EXPLORE-09 | SIG | R | F-EXPLORE-09 |
| F-EXPLORE-10 | APP | R | F-EXPLORE-10 |
| F-EXPLORE-10 | EXP | R | F-EXPLORE-10 |
| F-EXPLORE-10 | PRV | R | F-EXPLORE-10 |
| F-EXPLORE-11 | QUO | CR | F-EXPLORE-11 |
| F-EXPLORE-11 | CHS | CRU | F-EXPLORE-11 |
| F-EXPLORE-11 | CHM | C | F-EXPLORE-11 |
| F-EXPLORE-11 | AGY | R | F-EXPLORE-11 |
| F-EXPLORE-11 | EXP | R | F-EXPLORE-11 |
| F-EXPLORE-12 | CHS | CRU | F-EXPLORE-12 |
| F-EXPLORE-12 | AGY | R | F-EXPLORE-12 |
| F-EXPLORE-12 | PRV | R | F-EXPLORE-12 |
| F-EXPLORE-12 | EXP | R | F-EXPLORE-12 |
| F-EXPLORE-13 | EXS | R | F-EXPLORE-13 |
| F-EXPLORE-13 | EIL | R | F-EXPLORE-13 |
| F-EXPLORE-13 | QUO | R | F-EXPLORE-13 |
| F-EXPLORE-13 | CHS | R | F-EXPLORE-13 |
| F-EXPLORE-14 | RQA | C | F-EXPLORE-14 |
| F-EXPLORE-14 | EIL | R | F-EXPLORE-14 |
| F-EXPLORE-14 | RPV | R | F-EXPLORE-14 |
| F-EXPLORE-15 | RPV | C | F-EXPLORE-15 |
| F-EXPLORE-15 | RQA | R | F-EXPLORE-15 |
| F-EXPLORE-16 | RQA | C | F-EXPLORE-16 |
| F-EXPLORE-16 | EIL | R | F-EXPLORE-16 |
| F-EXPLORE-16 | QUO | R | F-EXPLORE-16 |
| F-EXPLORE-16 | RPV | R | F-EXPLORE-16 |
| F-EXPLORE-17 | RPV | CR | F-EXPLORE-17 |
| F-EXPLORE-17 | RQA | R | F-EXPLORE-17 |
| F-EXPLORE-18 | RPV | CRU | F-EXPLORE-18 |
| F-EXPLORE-18 | RQA | R | F-EXPLORE-18 |
| F-EXPLORE-18 | AUD | C | F-EXPLORE-18 |
| F-SCHED-01 | OHR | R | F-SCHED-01 |
| F-SCHED-01 | BKG | R | F-SCHED-01 |
| F-SCHED-01 | EXP | R | F-SCHED-01 |
| F-SCHED-02 | BKG | R | F-SCHED-02 |
| F-SCHED-02 | EXP | R | F-SCHED-02 |
| F-SCHED-02 | AGY | R | F-SCHED-02 |
| F-SCHED-03 | BKG | CR | F-SCHED-03 |
| F-SCHED-03 | CHM | C | F-SCHED-03 |
| F-SCHED-03 | NOT | C | F-SCHED-03 |
| F-SCHED-03 | AGY | R | F-SCHED-03 |
| F-SCHED-03 | PRV | R | F-SCHED-03 |
| F-SCHED-03 | EXP | R | F-SCHED-03 |
| F-SCHED-03 | OHR | R | F-SCHED-03 |
| F-SCHED-03 | CHS | R | F-SCHED-03 |
| F-SCHED-04 | AUD | C | F-SCHED-04 |
| F-SCHED-04 | CHM | C | F-SCHED-04 |
| F-SCHED-04 | NOT | C | F-SCHED-04 |
| F-SCHED-04 | BKG | RU | F-SCHED-04 |
| F-SCHED-04 | EXP | R | F-SCHED-04 |
| F-SCHED-04 | OHR | R | F-SCHED-04 |
| F-SCHED-04 | CHS | R | F-SCHED-04 |
| F-SCHED-05 | BSH | C | F-SCHED-05 |
| F-SCHED-05 | CHM | C | F-SCHED-05 |
| F-SCHED-05 | NOT | C | F-SCHED-05 |
| F-SCHED-05 | BKG | RU | F-SCHED-05 |
| F-SCHED-05 | CHS | R | F-SCHED-05 |
| F-SCHED-06 | BSH | C | F-SCHED-06 |
| F-SCHED-06 | CHM | C | F-SCHED-06 |
| F-SCHED-06 | NOT | C | F-SCHED-06 |
| F-SCHED-06 | BKG | RU | F-SCHED-06 |
| F-SCHED-06 | CHS | R | F-SCHED-06 |
| F-SCHED-07 | BKG | R | F-SCHED-07 |
| F-SCHED-07 | EXP | R | F-SCHED-07 |
| F-SCHED-07 | AGY | R | F-SCHED-07 |
| F-SCHED-07 | PRV | R | F-SCHED-07 |
| F-SCHED-08 | CHM | C | F-SCHED-08 |
| F-SCHED-08 | NOT | C | F-SCHED-08 |
| F-SCHED-08 | BKG | R | F-SCHED-08 |
| F-SCHED-08 | BSH | R | F-SCHED-08 |
| F-SCHED-08 | CHS | R | F-SCHED-08 |
| F-SCHED-08 | CHP | RU | F-SCHED-08 |
| F-SCHED-09 | OHR | R | F-SCHED-09 |
| F-SCHED-09 | BKG | R | F-SCHED-09 |
| F-SCHED-09 | EXP | R | F-SCHED-09 |
| F-SCHED-10 | BKG | R | F-SCHED-10 |
| F-SCHED-10 | AGY | R | F-SCHED-10 |
| F-SCHED-10 | EXP | R | F-SCHED-10 |
| F-ADMIN-01 | USR | R | F-ADMIN-01 |
| F-ADMIN-01 | UAS | R | F-ADMIN-01 |
| F-ADMIN-02 | USR | R | F-ADMIN-02 |
| F-ADMIN-02 | UAS | R | F-ADMIN-02 |
| F-ADMIN-02 | AGY | R | F-ADMIN-02 |
| F-ADMIN-02 | PRV | R | F-ADMIN-02 |
| F-ADMIN-02 | VIL | R | F-ADMIN-02 |
| F-ADMIN-02 | BKG | R | F-ADMIN-02 |
| F-ADMIN-02 | QUO | R | F-ADMIN-02 |
| F-ADMIN-02 | CHM | R | F-ADMIN-02 |
| F-ADMIN-03 | AGY | R | F-ADMIN-03 |
| F-ADMIN-03 | PRV | R | F-ADMIN-03 |
| F-ADMIN-03 | BKG | R | F-ADMIN-03 |
| F-ADMIN-04 | AGY | R | F-ADMIN-04 |
| F-ADMIN-04 | PRV | R | F-ADMIN-04 |
| F-ADMIN-04 | BKG | R | F-ADMIN-04 |
| F-ADMIN-05 | VIL | R | F-ADMIN-05 |
| F-ADMIN-05 | PRV | R | F-ADMIN-05 |
| F-ADMIN-05 | BKG | R | F-ADMIN-05 |
| F-ADMIN-05 | UAS | R | F-ADMIN-05 |
| F-ADMIN-06 | AGY | R | F-ADMIN-06 |
| F-ADMIN-06 | PRV | R | F-ADMIN-06 |
| F-ADMIN-06 | BKG | R | F-ADMIN-06 |
| F-ADMIN-07 | AGY | R | F-ADMIN-07 |
| F-ADMIN-07 | REG | R | F-ADMIN-07 |
| F-ADMIN-07 | QUO | R | F-ADMIN-07 |
| F-ADMIN-07 | CHM | R | F-ADMIN-07 |
| F-ADMIN-07 | BKG | R | F-ADMIN-07 |
| F-ADMIN-08 | PRV | R | F-ADMIN-08 |
| F-ADMIN-08 | PVR | R | F-ADMIN-08 |
| F-ADMIN-08 | VIL | R | F-ADMIN-08 |
| F-ADMIN-08 | QUO | R | F-ADMIN-08 |
| F-ADMIN-08 | CHM | R | F-ADMIN-08 |
| F-ADMIN-08 | BKG | R | F-ADMIN-08 |
| F-ADMIN-09 | BKG | R | F-ADMIN-09 |
| F-ADMIN-09 | AGY | R | F-ADMIN-09 |
| F-ADMIN-09 | PRV | R | F-ADMIN-09 |
| F-ADMIN-09 | EXP | R | F-ADMIN-09 |
| F-ADMIN-10 | BKG | R | F-ADMIN-10 |
| F-ADMIN-10 | AGY | R | F-ADMIN-10 |
| F-ADMIN-10 | PRV | R | F-ADMIN-10 |
| F-CHAT-01 | CHS | CRU | F-CHAT-01 |
| F-CHAT-01 | CHP | C | F-CHAT-01 |
| F-CHAT-01 | AGY | R | F-CHAT-01 |
| F-CHAT-01 | PRV | R | F-CHAT-01 |
| F-CHAT-01 | EXP | R | F-CHAT-01 |
| F-CHAT-01 | QUO | R | F-CHAT-01 |
| F-CHAT-01 | BKG | R | F-CHAT-01 |
| F-CHAT-02 | CHM | C | F-CHAT-02 |
| F-CHAT-02 | CHS | RU | F-CHAT-02 |
| F-CHAT-02 | CHP | R | F-CHAT-02 |
| F-CHAT-03 | CHS | R | F-CHAT-03 |
| F-CHAT-03 | CHP | RU | F-CHAT-03 |
| F-CHAT-03 | CHM | R | F-CHAT-03 |
| F-CHAT-03 | ATT | R | F-CHAT-03 |
| F-CHAT-04 | AUD | C | F-CHAT-04 |
| F-CHAT-04 | CHS | RU | F-CHAT-04 |
| F-CHAT-04 | CHP | R | F-CHAT-04 |
| F-CHAT-05 | ATT | C | F-CHAT-05 |
| F-CHAT-05 | CHM | C | F-CHAT-05 |
| F-CHAT-05 | CHS | RU | F-CHAT-05 |
| F-CHAT-05 | CHP | R | F-CHAT-05 |
| F-AUTH-24 | USR | R | F-AUTH-24 |
| F-AUTH-24 | ROL | R | F-AUTH-24 |
| F-AUTH-25 | AUD | C | F-AUTH-25 |
| F-AUTH-25 | USR | RU | F-AUTH-25 |
| F-AUTH-26 | RSV | CR | F-AUTH-26 |
| F-AUTH-26 | ATT | C | F-AUTH-26 |
| F-AUTH-26 | NOT | C | F-AUTH-26 |
| F-AUTH-26 | REG | RU | F-AUTH-26 |
| F-AUTH-26 | RRV | R | F-AUTH-26 |
| F-AUTH-26 | RET | RU | F-AUTH-26 |
## Coverage per entity

| Entity | Created by | Read by | Updated by | Deleted by |
|---|---|---|---|---|
| AGY | F-AUTH-04 | F-ADMIN-02, F-ADMIN-03, F-ADMIN-04, F-ADMIN-06, F-ADMIN-07, F-ADMIN-09, F-ADMIN-10, F-CHAT-01, F-EXPLORE-11, F-EXPLORE-12, F-MATCH-01, F-MATCH-10, F-MATCH-11, F-PROFILE-01, F-PROFILE-02, F-SCHED-02, F-SCHED-03, F-SCHED-07, F-SCHED-10 | F-AUTH-18, F-PROFILE-02 | — |
| AID | F-PROFILE-07 | — | — | — |
| APP | F-EXPLORE-09, F-MATCH-10 | F-EXPLORE-01, F-EXPLORE-04, F-EXPLORE-09, F-EXPLORE-10, F-MATCH-16 | F-EXPLORE-09, F-MATCH-10, F-MATCH-16 | — |
| ATT | F-AUTH-02, F-AUTH-26, F-CHAT-05 | F-CHAT-03 | — | — |
| AUD | F-AUTH-18, F-AUTH-19, F-AUTH-20, F-AUTH-22, F-AUTH-25, F-CHAT-04, F-PROFILE-02, F-PROFILE-05, F-SCHED-04, F-EXPLORE-18 | — | — | — |
| BKG | F-SCHED-03 | F-ADMIN-02, F-ADMIN-03, F-ADMIN-04, F-ADMIN-05, F-ADMIN-06, F-ADMIN-07, F-ADMIN-08, F-ADMIN-09, F-ADMIN-10, F-CHAT-01, F-EXPLORE-03, F-MATCH-05, F-MATCH-06, F-PROFILE-06, F-SCHED-01, F-SCHED-02, F-SCHED-03, F-SCHED-04, F-SCHED-05, F-SCHED-06, F-SCHED-07, F-SCHED-08, F-SCHED-09, F-SCHED-10 | F-SCHED-04, F-SCHED-05, F-SCHED-06 | — |
| BSH | F-SCHED-05, F-SCHED-06 | F-SCHED-08 | — | — |
| CHM | F-CHAT-02, F-CHAT-05, F-EXPLORE-11, F-MATCH-11, F-SCHED-03, F-SCHED-04, F-SCHED-05, F-SCHED-06, F-SCHED-08 | F-ADMIN-02, F-ADMIN-07, F-ADMIN-08, F-CHAT-03, F-MATCH-13, F-MATCH-14 | — | — |
| CHP | F-CHAT-01 | F-CHAT-02, F-CHAT-03, F-CHAT-04, F-CHAT-05, F-SCHED-08 | F-CHAT-03, F-SCHED-08 | — |
| CHS | F-CHAT-01, F-EXPLORE-11, F-EXPLORE-12, F-MATCH-11 | F-CHAT-01, F-CHAT-02, F-CHAT-03, F-CHAT-04, F-CHAT-05, F-EXPLORE-07, F-EXPLORE-11, F-EXPLORE-12, F-EXPLORE-13, F-MATCH-11, F-MATCH-13, F-MATCH-14, F-SCHED-03, F-SCHED-04, F-SCHED-05, F-SCHED-06, F-SCHED-08 | F-CHAT-01, F-CHAT-02, F-CHAT-04, F-CHAT-05, F-EXPLORE-11, F-EXPLORE-12, F-MATCH-11 | — |
| EIL | F-EXPLORE-05, F-EXPLORE-06, F-EXPLORE-07 | F-EXPLORE-08, F-EXPLORE-09, F-EXPLORE-13, F-EXPLORE-14, F-EXPLORE-16 | — | — |
| EXP | F-PROFILE-06 | F-ADMIN-09, F-CHAT-01, F-EXPLORE-01, F-EXPLORE-02, F-EXPLORE-03, F-EXPLORE-04, F-EXPLORE-05, F-EXPLORE-06, F-EXPLORE-07, F-EXPLORE-10, F-EXPLORE-11, F-EXPLORE-12, F-MATCH-05, F-MATCH-06, F-MATCH-07, F-MATCH-08, F-MATCH-11, F-MATCH-14, F-MATCH-16, F-PROFILE-03, F-PROFILE-06, F-PROFILE-07, F-SCHED-01, F-SCHED-02, F-SCHED-03, F-SCHED-04, F-SCHED-07, F-SCHED-09, F-SCHED-10 | F-PROFILE-06 | F-PROFILE-06 |
| EXS | F-EXPLORE-05 | F-EXPLORE-06, F-EXPLORE-07, F-EXPLORE-13 | F-EXPLORE-05 | — |
| MAM | F-MATCH-02, F-MATCH-09 | F-MATCH-03, F-MATCH-04 | — | — |
| MAT | F-MATCH-01 | F-MATCH-02, F-MATCH-03, F-MATCH-04, F-MATCH-09, F-MATCH-11, F-MATCH-13, F-MATCH-14 | F-MATCH-02, F-MATCH-09 | — |
| MCR | F-PROFILE-02 | F-AUTH-18 | F-AUTH-18 | — |
| MED | F-PROFILE-02, F-PROFILE-04, F-PROFILE-06 | F-EXPLORE-01, F-EXPLORE-02, F-EXPLORE-03, F-PROFILE-01, F-PROFILE-03, F-PROFILE-04, F-PROFILE-06 | F-PROFILE-06 | F-PROFILE-02, F-PROFILE-04, F-PROFILE-06 |
| NOT | F-AUTH-18, F-AUTH-26, F-PROFILE-05, F-SCHED-03, F-SCHED-04, F-SCHED-05, F-SCHED-06, F-SCHED-08 | — | — | — |
| OHR | F-PROFILE-04 | F-EXPLORE-03, F-MATCH-05, F-MATCH-06, F-PROFILE-03, F-PROFILE-04, F-SCHED-01, F-SCHED-03, F-SCHED-04, F-SCHED-09 | F-PROFILE-04 | F-PROFILE-04 |
| OTP | F-AUTH-23 | F-AUTH-04, F-AUTH-23 | F-AUTH-23 | — |
| PER | — | F-AUTH-15, F-AUTH-16 | — | — |
| PPV | F-PROFILE-04 | F-PROFILE-03, F-PROFILE-04, F-PROFILE-05 | F-PROFILE-04, F-PROFILE-05 | — |
| PRV | F-AUTH-20 | F-ADMIN-02, F-ADMIN-03, F-ADMIN-04, F-ADMIN-05, F-ADMIN-06, F-ADMIN-08, F-ADMIN-09, F-ADMIN-10, F-AUTH-21, F-CHAT-01, F-EXPLORE-01, F-EXPLORE-02, F-EXPLORE-03, F-EXPLORE-04, F-EXPLORE-05, F-EXPLORE-10, F-EXPLORE-12, F-MATCH-05, F-MATCH-11, F-PROFILE-03, F-PROFILE-04, F-PROFILE-05, F-PROFILE-06, F-PROFILE-07, F-SCHED-03, F-SCHED-07 | F-PROFILE-04, F-PROFILE-05 | — |
| PVR | F-PROFILE-05 | F-ADMIN-08 | — | — |
| QUO | F-EXPLORE-11, F-MATCH-11 | F-ADMIN-02, F-ADMIN-07, F-ADMIN-08, F-CHAT-01, F-EXPLORE-07, F-EXPLORE-11, F-EXPLORE-13, F-EXPLORE-16, F-MATCH-11 | — | — |
| REG | F-AUTH-02 | F-ADMIN-07, F-AUTH-04, F-AUTH-18, F-AUTH-21, F-AUTH-23, F-AUTH-26, F-PROFILE-02 | F-AUTH-04, F-AUTH-18, F-AUTH-26 | — |
| RET | F-AUTH-18 | F-AUTH-26 | F-AUTH-26 | — |
| ROL | — | F-AUTH-07, F-AUTH-15, F-AUTH-16, F-AUTH-24 | — | — |
| RPV | F-EXPLORE-15, F-EXPLORE-17, F-EXPLORE-18 | F-EXPLORE-14, F-EXPLORE-16, F-EXPLORE-17, F-EXPLORE-18 | F-EXPLORE-18 | — |
| RQA | F-EXPLORE-14, F-EXPLORE-16 | F-EXPLORE-15, F-EXPLORE-17, F-EXPLORE-18 | — | — |
| RRV | F-AUTH-18 | F-AUTH-26 | — | — |
| RST | F-AUTH-11, F-AUTH-22 | F-AUTH-12 | F-AUTH-12 | — |
| RSV | F-AUTH-02, F-AUTH-26 | F-AUTH-04, F-AUTH-18, F-AUTH-26 | — | — |
| SES | F-AUTH-07 | F-AUTH-09, F-AUTH-17, F-AUTH-22 | F-AUTH-09, F-AUTH-15, F-AUTH-17, F-AUTH-22 | — |
| SIG | F-EXPLORE-07, F-MATCH-14 | F-EXPLORE-08, F-EXPLORE-09, F-MATCH-15, F-MATCH-16 | — | — |
| TPP | F-MATCH-04 | F-MATCH-05, F-MATCH-06, F-MATCH-07, F-MATCH-08, F-MATCH-09, F-MATCH-10, F-MATCH-12 | F-MATCH-09 | — |
| UAS | F-AUTH-19 | F-ADMIN-01, F-ADMIN-02, F-ADMIN-05, F-AUTH-16, F-AUTH-20, F-AUTH-21, F-AUTH-22, F-PROFILE-05 | — | — |
| USR | F-AUTH-04, F-AUTH-19, F-AUTH-20 | F-ADMIN-01, F-ADMIN-02, F-AUTH-03, F-AUTH-06, F-AUTH-07, F-AUTH-08, F-AUTH-11, F-AUTH-12, F-AUTH-13, F-AUTH-14, F-AUTH-15, F-AUTH-16, F-AUTH-17, F-AUTH-18, F-AUTH-21, F-AUTH-22, F-AUTH-23, F-AUTH-24, F-AUTH-25, F-MATCH-01, F-PROFILE-02 | F-AUTH-07, F-AUTH-12, F-AUTH-14, F-AUTH-18, F-AUTH-22, F-AUTH-25 | — |
| VIL | — | F-ADMIN-02, F-ADMIN-05, F-ADMIN-08, F-AUTH-19, F-AUTH-20, F-MATCH-05, F-PROFILE-03 | — | — |
## Anomalies

Reported only — no function or entity is added to make the matrix look complete.

| Kind | Entity or function | Hypothesis (missing function / surplus entity) | Resolution |
|---|---|---|---|
| Function touches no entity | F-AUTH-01, F-AUTH-05, F-AUTH-10 | Neither: these are display-only UI functions and intentionally persist no data. | |
| Entity with no C | ROL, PER, VIL | Neither: seeded reference data; no user-facing create function is expected. Seed authority open (Q2). | |
| Entity with C but no R | NOT (Notification) | Neither: read happens through the recipient's notification view; confirm a read consumer exists at UI level. | |
| Entity with C but no R | AID (AI Description Draft) | Possible missing read: a draft is created and accepted/edited within F-PROFILE-07, but no function re-reads a stored draft. Confirm whether drafts are re-openable. | |
| Entity with C but no R | AUD (Audit Log) | Neither by design: written by many functions, read only through accountability/admin review, not a user screen. Confirm retention/read consumer. | |
| Declared entity no function touches | REC (Recommendation Result) | Surplus-entity candidate: F-MATCH-08 returns recommendations but never requires them to persist. Keep only if Q-10 approves recommendation history. | |
| Multi-owner create | ATT created by F-AUTH-26 and F-CHAT-05; NOT created across AUT/PRF/BKG | Ownership unclear: assign one schema owner and a per-context access policy before integration. | |

## Open questions

| # | Question | Blocking? | Owner | Default applied | Consequence if the default is wrong |
|---|---|---|---|---|---|
| Q2 | [NEEDS CLARIFICATION: does F-PROFILE-07 store the AI draft, and can it be re-read after leaving the editor?] | No | PRF/AIT | Store draft with `accepted_at?`; treat re-open as out of MVP scope. | An expected "resume draft" screen has no data source. |
| Q3 | [NEEDS CLARIFICATION: is Recommendation Result persisted for traceability, or transient per matching run?] | No | AIT | Persist per run for traceability (Q-10). | Either wasted storage, or lost audit trail for why an Experience was recommended. |
