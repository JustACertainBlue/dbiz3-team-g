# 02 — Function × entity CRUD matrix

Each row is one stable Function ID from the [Function List](../../docs/spec/docs/function-list.md); the ID is also the source citation. Entity codes are defined in [01-entity-dictionary.md](01-entity-dictionary.md). `—` means no persistent entity operation is specified by that function. `D` means a delete/archive action is requested; the actual policy is in the logical model. Read operations include authorization/context reads when the function explicitly requires them. Derived UI and calculation functions are not given artificial writes.

| Function ID | C | R | U | D |
|---|---|---|---|---|
| F-AUTH-01 | — | — | — | — |
| F-AUTH-02 | — | — | — | — |
| F-AUTH-03 | — | USR | — | — |
| F-AUTH-04 | USR, RSV, AGY | OTP, REG | REG | — |
| F-AUTH-05 | — | — | — | — |
| F-AUTH-06 | — | USR | — | — |
| F-AUTH-07 | SES | USR, ROL | USR | — |
| F-AUTH-08 | — | USR | — | — |
| F-AUTH-09 | — | SES | SES | — |
| F-AUTH-10 | — | — | — | — |
| F-AUTH-11 | RST | USR | — | — |
| F-AUTH-12 | — | RST, USR | RST, USR | — |
| F-AUTH-13 | — | USR | — | — |
| F-AUTH-14 | — | USR | USR | — |
| F-AUTH-15 | — | USR, ROL, PER | SES | — |
| F-AUTH-16 | — | USR, ROL, PER, UAS | — | — |
| F-AUTH-17 | — | USR, SES | SES | — |
| F-AUTH-18 | RRV, AUD, NOT | REG, RSV, MCR, USR | REG, MCR, USR, AGY | — |
| F-AUTH-19 | USR, UAS, AUD | VIL | — | — |
| F-AUTH-20 | USR, PRV, AUD | UAS, VIL | — | — |
| F-AUTH-21 | — | USR, REG, PRV, UAS | — | — |
| F-AUTH-22 | AUD, RST | USR, UAS, SES | USR, SES | — |
| F-AUTH-23 | REG, OTP | USR, OTP, REG | OTP | — |
| F-PROFILE-01 | — | AGY, MED | — | — |
| F-PROFILE-02 | MCR, MED, AUD | AGY, USR, REG | AGY | MED |
| F-PROFILE-03 | — | PRV, PPV, VIL, OHR, EXP, MED | — | — |
| F-PROFILE-04 | PPV, OHR, MED | PRV, PPV, OHR, MED | PRV, PPV, OHR | MED, OHR |
| F-PROFILE-05 | PVR, AUD, NOT | PRV, PPV, UAS | PRV, PPV | — |
| F-PROFILE-06 | EXP, MED | PRV, EXP, BKG, MED | EXP, MED | EXP, MED |
| F-PROFILE-07 | AID | PRV, EXP | — | — |
| F-MATCH-01 | MAT | AGY, USR | — | — |
| F-MATCH-02 | MAM | MAT | MAT | — |
| F-MATCH-03 | — | MAM, MAT | — | — |
| F-MATCH-04 | TPP | MAT, MAM | — | — |
| F-MATCH-05 | — | TPP, VIL, PRV, EXP, OHR, BKG | — | — |
| F-MATCH-06 | — | TPP, EXP, OHR, BKG | — | — |
| F-MATCH-07 | — | TPP, EXP | — | — |
| F-MATCH-08 | — | TPP, EXP | — | — |
| F-MATCH-09 | MAM | MAT, TPP | MAT, TPP | — |
| F-MATCH-10 | APP | AGY, TPP | APP | — |
| F-MATCH-11 | QUO, CHS, CHM | AGY, EXP, PRV, MAT, QUO, CHS | CHS | — |
| F-MATCH-12 | — | TPP | — | — |
| F-MATCH-13 | — | CHS, CHM, MAT | — | — |
| F-MATCH-14 | SIG | CHM, MAT, CHS, EXP | — | — |
| F-MATCH-15 | — | SIG | — | — |
| F-MATCH-16 | — | APP, SIG, EXP | APP | — |
| F-EXPLORE-01 | — | EXP, PRV, MED, APP | — | — |
| F-EXPLORE-02 | — | EXP, PRV, MED | — | — |
| F-EXPLORE-03 | — | EXP, PRV, MED, OHR, BKG | — | — |
| F-EXPLORE-04 | — | EXP, PRV, APP | — | — |
| F-EXPLORE-05 | EXS, EIL | EXP, PRV | EXS | — |
| F-EXPLORE-06 | EIL | EXS, EXP | — | — |
| F-EXPLORE-07 | EIL, SIG | EXS, EXP, QUO, CHS | — | — |
| F-EXPLORE-08 | — | EIL, SIG | — | — |
| F-EXPLORE-09 | APP | EIL, SIG, APP | APP | — |
| F-EXPLORE-10 | — | APP, EXP, PRV | — | — |
| F-EXPLORE-11 | QUO, CHS, CHM | AGY, EXP, QUO, CHS | CHS | — |
| F-EXPLORE-12 | CHS | AGY, PRV, EXP, CHS | CHS | — |
| F-EXPLORE-13 | — | EXS, EIL, QUO, CHS | — | — |
| F-EXPLORE-14 | RQA | EIL, RPV | — | — |
| F-EXPLORE-15 | RPV | RQA | — | — |
| F-EXPLORE-16 | RQA | EIL, QUO, RPV | — | — |
| F-EXPLORE-17 | RPV | RQA, RPV | — | — |
| F-SCHED-01 | — | OHR, BKG, EXP | — | — |
| F-SCHED-02 | — | BKG, EXP, AGY | — | — |
| F-SCHED-03 | BKG, CHM, NOT | AGY, PRV, EXP, OHR, BKG, CHS | — | — |
| F-SCHED-04 | AUD, CHM, NOT | BKG, EXP, OHR, CHS | BKG | — |
| F-SCHED-05 | BSH, CHM, NOT | BKG, CHS | BKG | — |
| F-SCHED-06 | BSH, CHM, NOT | BKG, CHS | BKG | — |
| F-SCHED-07 | — | BKG, EXP, AGY, PRV | — | — |
| F-SCHED-08 | CHM, NOT | BKG, BSH, CHS, CHP | CHP | — |
| F-SCHED-09 | — | OHR, BKG, EXP | — | — |
| F-SCHED-10 | — | BKG, AGY, EXP | — | — |
| F-ADMIN-01 | — | USR, UAS | — | — |
| F-ADMIN-02 | — | USR, UAS, AGY, PRV, VIL, BKG, QUO, CHM | — | — |
| F-ADMIN-03 | — | AGY, PRV, BKG | — | — |
| F-ADMIN-04 | — | AGY, PRV, BKG | — | — |
| F-ADMIN-05 | — | VIL, PRV, BKG, UAS | — | — |
| F-ADMIN-06 | — | AGY, PRV, BKG | — | — |
| F-ADMIN-07 | — | AGY, REG, QUO, CHM, BKG | — | — |
| F-ADMIN-08 | — | PRV, PVR, VIL, QUO, CHM, BKG | — | — |
| F-ADMIN-09 | — | BKG, AGY, PRV, EXP | — | — |
| F-ADMIN-10 | — | BKG, AGY, PRV | — | — |
| F-CHAT-01 | CHS, CHP | AGY, PRV, EXP, QUO, BKG, CHS | CHS | — |
| F-CHAT-02 | CHM | CHS, CHP | CHS | — |
| F-CHAT-03 | — | CHS, CHP, CHM, ATT | CHP | — |
| F-CHAT-04 | AUD | CHS, CHP | CHS | — |
| F-CHAT-05 | ATT, CHM | CHS, CHP | CHS | — |
| F-AUTH-24 | — | USR, ROL | — | — |
| F-AUTH-25 | AUD | USR | USR | — |
| F-AUTH-26 | RSV, ATT, NOT | REG, RSV, RRV, RET | REG, RET | — |

## Matrix interpretation and anomalies

- UI/validation-only functions `F-AUTH-01`, `F-AUTH-02`, `F-AUTH-05`, `F-AUTH-10` touch no persistent entity. They are intentional **ORPHAN FUNCTION** flags in a data CRUD matrix, not missing features.
- `F-AUTH-23` explicitly stores the server-side registration request, sends the OTP and verifies it; its C/R/U cells cover those steps. `F-AUTH-04` consumes only a server-verified request. Resubmission-token issuance is specified as part of Request More Information but its exact storage/expiry is still open; see Q-01 in [review](05-review.md).
- ROL/PER and VIL are seeded reference records: no user-facing C/D function is expected. Their seed source is still open.
- REC is an **UNUSED ENTITY candidate** in this matrix because F-MATCH-08 returns recommendations but never requires them to persist. Keep it only if Q-10 approves recommendation history; otherwise treat the output as transient and remove REC from the persisted model.
- The matrix makes no physical-delete claim for EXP or MED. `F-PROFILE-06` selects hard delete only when there are no Booking references, otherwise archive/deny according to the consistency contract.
- Delivery attempts, recommendations, dashboard aggregates, and schedule blocks are not silently materialized just because a screen displays them. Questions about their persistence are explicit in the review.
