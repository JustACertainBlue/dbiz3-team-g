# Traceability Matrix

Generated from current course Use Case table, Function List and explicit Screen Linked Requirements. Module §3 contains user scenarios plus named consistency acceptance examples; §5/5.1 is the exact FR/IO contract. Supporting functions need not have their own screen or new UC. Human approval is pending.

| Function | Actor | Use Case | Module FR | Screen / supporting context | Acceptance evidence |
|---|---|---|---|---|---|
| F-AUTH-01 | Guest | UC-ACC-01 | [AUT FR-001](../specs/spec-AUT.md) | REG003 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-02 | Guest | UC-ACC-01 | [AUT FR-002](../specs/spec-AUT.md) | REG003 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-03 | Guest | UC-ACC-01 | [AUT FR-003](../specs/spec-AUT.md) | REG003 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-04 | Guest | UC-ACC-01 | [AUT FR-004](../specs/spec-AUT.md) | REG116 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-05 | Member / Guest | UC-ACC-02 | [AUT FR-005](../specs/spec-AUT.md) | AUT009 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-06 | Member | UC-ACC-02 | [AUT FR-006](../specs/spec-AUT.md) | AUT009 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-07 | Member | UC-ACC-02 | [AUT FR-007](../specs/spec-AUT.md) | AUT009 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-08 | Member | UC-ACC-02 | [AUT FR-008](../specs/spec-AUT.md) | AUT009 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-09 | Member | UC-ACC-03 | [AUT FR-009](../specs/spec-AUT.md) | AUT026 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-10 | Member | UC-ACC-04 | [AUT FR-010](../specs/spec-AUT.md) | PAS011 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-11 | Member | UC-ACC-04 | [AUT FR-011](../specs/spec-AUT.md) | PAS011, PAS014 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-12 | Member | UC-ACC-04 | [AUT FR-012](../specs/spec-AUT.md) | PAS142, PAS143 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-13 | Member | UC-ACC-05 | [AUT FR-013](../specs/spec-AUT.md) | ACC129 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-14 | Member | UC-ACC-05 | [AUT FR-014](../specs/spec-AUT.md) | ACC129 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-15 | System | UC-ACC-02 | [AUT FR-015](../specs/spec-AUT.md) | AUT009 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-16 | System | UC-ACC-09 | [AUT FR-016](../specs/spec-AUT.md) | Supporting authorization/automation for linked UC; no dedicated screen | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-17 | System | UC-ACC-02 | [AUT FR-017](../specs/spec-AUT.md) | AUT009 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-18 | Admin HDT | UC-ACC-06 | [AUT FR-018](../specs/spec-AUT.md) | VER119, VER146 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-19 | Admin HDT | UC-ACC-07 | [AUT FR-019](../specs/spec-AUT.md) | ADM117 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-20 | Admin UBND | UC-ACC-08 | [AUT FR-020](../specs/spec-AUT.md) | ADM117 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-21 | Admin HDT/UBND | UC-ACC-09 | [AUT FR-021](../specs/spec-AUT.md) | ADM095, ADM145 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-22 | Admin HDT/UBND | UC-ACC-09 | [AUT FR-022](../specs/spec-AUT.md) | ADM095, ADM118 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-23 | Guest | UC-ACC-01 | [AUT FR-023](../specs/spec-AUT.md) | REG115 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-PROFILE-01 | Member / Guest | UC-PRO-01, UC-PRO-02 | [PRF FR-001](../specs/spec-PRF.md) | PRF019 | PRF §3; related examples: AC-PRF-DRAFT, AC-PRF-REVISION, AC-PRF-LOCK, AC-PRF-DELETE |
| F-PROFILE-02 | Tour Agency | UC-PRO-01 | [PRF FR-002](../specs/spec-PRF.md) | PRF021 | PRF §3; related examples: AC-PRF-DRAFT, AC-PRF-REVISION, AC-PRF-LOCK, AC-PRF-DELETE |
| F-PROFILE-03 | Member / Guest | UC-PRO-03, UC-PRO-04 | [PRF FR-003](../specs/spec-PRF.md) | DSH018, EXP067, PRF127, VIL030 | PRF §3; related examples: AC-PRF-DRAFT, AC-PRF-REVISION, AC-PRF-LOCK, AC-PRF-DELETE |
| F-PROFILE-04 | Local Provider | UC-PRO-04 | [PRF FR-004](../specs/spec-PRF.md) | PRF128 | PRF §3; related examples: AC-PRF-DRAFT, AC-PRF-REVISION, AC-PRF-LOCK, AC-PRF-DELETE |
| F-PROFILE-05 | Admin UBND | UC-PRO-06 | [PRF FR-005](../specs/spec-PRF.md) | VER119, VER146 | PRF §3; related examples: AC-PRF-DRAFT, AC-PRF-REVISION, AC-PRF-LOCK, AC-PRF-DELETE |
| F-PROFILE-06 | Local Provider | UC-PRO-05 | [PRF FR-006](../specs/spec-PRF.md) | EXP067, EXP068, EXP069, EXP070, EXP132 | PRF §3; related examples: AC-PRF-DRAFT, AC-PRF-REVISION, AC-PRF-LOCK, AC-PRF-DELETE |
| F-PROFILE-07 | Local Provider / System | UC-PRO-04, UC-PRO-05 | [PRF FR-007](../specs/spec-PRF.md) | EXP069, EXP070, PRF128 | PRF §3; related examples: AC-PRF-DRAFT, AC-PRF-REVISION, AC-PRF-LOCK, AC-PRF-DELETE |
| F-MATCH-01 | Tour Agency / Guest | UC-DIS-05 | [AIT FR-001](../specs/spec-AIT.md) | AIT121 | AIT §3; related examples: AC-AIT-ORDER, AC-AIT-FAIL, AC-AIT-CLARIFY |
| F-MATCH-02 | Tour Agency | UC-DIS-05 | [AIT FR-002](../specs/spec-AIT.md) | AIT121 | AIT §3; related examples: AC-AIT-ORDER, AC-AIT-FAIL, AC-AIT-CLARIFY |
| F-MATCH-03 | System | UC-DIS-05 | [AIT FR-003](../specs/spec-AIT.md) | AIT121 | AIT §3; related examples: AC-AIT-ORDER, AC-AIT-FAIL, AC-AIT-CLARIFY |
| F-MATCH-04 | System | UC-DIS-05 | [AIT FR-004](../specs/spec-AIT.md) | AIT121 | AIT §3; related examples: AC-AIT-ORDER, AC-AIT-FAIL, AC-AIT-CLARIFY |
| F-MATCH-05 | System | UC-DIS-05 | [AIT FR-005](../specs/spec-AIT.md) | AIT121 | AIT §3; related examples: AC-AIT-ORDER, AC-AIT-FAIL, AC-AIT-CLARIFY |
| F-MATCH-06 | System | UC-DIS-05 | [AIT FR-006](../specs/spec-AIT.md) | AIT121 | AIT §3; related examples: AC-AIT-ORDER, AC-AIT-FAIL, AC-AIT-CLARIFY |
| F-MATCH-07 | System | UC-DIS-05 | [AIT FR-007](../specs/spec-AIT.md) | AIT121 | AIT §3; related examples: AC-AIT-ORDER, AC-AIT-FAIL, AC-AIT-CLARIFY |
| F-MATCH-08 | System | UC-DIS-05 | [AIT FR-008](../specs/spec-AIT.md) | AIT121 | AIT §3; related examples: AC-AIT-ORDER, AC-AIT-FAIL, AC-AIT-CLARIFY |
| F-MATCH-09 | Tour Agency | UC-DIS-05 | [AIT FR-009](../specs/spec-AIT.md) | AIT121 | AIT §3; related examples: AC-AIT-ORDER, AC-AIT-FAIL, AC-AIT-CLARIFY |
| F-MATCH-10 | System | UC-DIS-05 | [AIT FR-010](../specs/spec-AIT.md) | AIT121 | AIT §3; related examples: AC-AIT-ORDER, AC-AIT-FAIL, AC-AIT-CLARIFY |
| F-MATCH-11 | System | UC-DIS-05 | [AIT FR-011](../specs/spec-AIT.md) | AIT121 | AIT §3; related examples: AC-AIT-ORDER, AC-AIT-FAIL, AC-AIT-CLARIFY |
| F-MATCH-12 | System | UC-DIS-05 | [AIT FR-012](../specs/spec-AIT.md) | AIT121 | AIT §3; related examples: AC-AIT-ORDER, AC-AIT-FAIL, AC-AIT-CLARIFY |
| F-MATCH-13 | System | UC-DIS-05 | [AIT FR-013](../specs/spec-AIT.md) | AIT121 | AIT §3; related examples: AC-AIT-ORDER, AC-AIT-FAIL, AC-AIT-CLARIFY |
| F-MATCH-14 | System | UC-DIS-05 | [AIT FR-014](../specs/spec-AIT.md) | AIT121 | AIT §3; related examples: AC-AIT-ORDER, AC-AIT-FAIL, AC-AIT-CLARIFY |
| F-MATCH-15 | System | UC-DIS-05 | [AIT FR-015](../specs/spec-AIT.md) | AIT121 | AIT §3; related examples: AC-AIT-ORDER, AC-AIT-FAIL, AC-AIT-CLARIFY |
| F-MATCH-16 | System | UC-DIS-05 | [AIT FR-016](../specs/spec-AIT.md) | AIT121 | AIT §3; related examples: AC-AIT-ORDER, AC-AIT-FAIL, AC-AIT-CLARIFY |
| F-EXPLORE-01 | Tour Agency / Guest | UC-DIS-01 | [EXP FR-001](../specs/spec-EXP.md) | EXP017, EXP120 | EXP §3; related examples: AC-EXP-GUEST, AC-EXP-QUOTE, AC-EXP-CONSENT, AC-EXP-VERSION |
| F-EXPLORE-02 | Tour Agency / Guest | UC-DIS-01 | [EXP FR-002](../specs/spec-EXP.md) | EXP017, EXP120, VIL030 | EXP §3; related examples: AC-EXP-GUEST, AC-EXP-QUOTE, AC-EXP-CONSENT, AC-EXP-VERSION |
| F-EXPLORE-03 | Tour Agency / Guest | UC-DIS-03, UC-DIS-04 | [EXP FR-003](../specs/spec-EXP.md) | DSC033, DSC122, DSC123, DSC124, EXP017, EXP120 | EXP §3; related examples: AC-EXP-GUEST, AC-EXP-QUOTE, AC-EXP-CONSENT, AC-EXP-VERSION |
| F-EXPLORE-04 | Tour Agency / Guest | UC-DIS-04 | [EXP FR-004](../specs/spec-EXP.md) | EXP017, EXP120 | EXP §3; related examples: AC-EXP-GUEST, AC-EXP-QUOTE, AC-EXP-CONSENT, AC-EXP-VERSION |
| F-EXPLORE-05 | System | UC-DIS-02 | [EXP FR-005](../specs/spec-EXP.md) | EXP017, EXP120 | EXP §3; related examples: AC-EXP-GUEST, AC-EXP-QUOTE, AC-EXP-CONSENT, AC-EXP-VERSION |
| F-EXPLORE-06 | System | UC-DIS-02 | [EXP FR-006](../specs/spec-EXP.md) | EXP017 | EXP §3; related examples: AC-EXP-GUEST, AC-EXP-QUOTE, AC-EXP-CONSENT, AC-EXP-VERSION |
| F-EXPLORE-07 | System | UC-DIS-02 | [EXP FR-007](../specs/spec-EXP.md) | EXP017 | EXP §3; related examples: AC-EXP-GUEST, AC-EXP-QUOTE, AC-EXP-CONSENT, AC-EXP-VERSION |
| F-EXPLORE-08 | System | UC-DIS-02 | [EXP FR-008](../specs/spec-EXP.md) | EXP017 | EXP §3; related examples: AC-EXP-GUEST, AC-EXP-QUOTE, AC-EXP-CONSENT, AC-EXP-VERSION |
| F-EXPLORE-09 | System | UC-DIS-02 | [EXP FR-009](../specs/spec-EXP.md) | EXP017 | EXP §3; related examples: AC-EXP-GUEST, AC-EXP-QUOTE, AC-EXP-CONSENT, AC-EXP-VERSION |
| F-EXPLORE-10 | System | UC-DIS-02 | [EXP FR-010](../specs/spec-EXP.md) | EXP017 | EXP §3; related examples: AC-EXP-GUEST, AC-EXP-QUOTE, AC-EXP-CONSENT, AC-EXP-VERSION |
| F-EXPLORE-11 | System | UC-DIS-04 | [EXP FR-011](../specs/spec-EXP.md) | DSC033, EXP017, SCH140 | EXP §3; related examples: AC-EXP-GUEST, AC-EXP-QUOTE, AC-EXP-CONSENT, AC-EXP-VERSION |
| F-EXPLORE-12 | System | UC-DIS-04 | [EXP FR-012](../specs/spec-EXP.md) | DSC033, EXP017 | EXP §3; related examples: AC-EXP-GUEST, AC-EXP-QUOTE, AC-EXP-CONSENT, AC-EXP-VERSION |
| F-EXPLORE-13 | System | UC-DIS-02 | [EXP FR-013](../specs/spec-EXP.md) | EXP017 | EXP §3; related examples: AC-EXP-GUEST, AC-EXP-QUOTE, AC-EXP-CONSENT, AC-EXP-VERSION |
| F-EXPLORE-14 | System | UC-DIS-02 | [EXP FR-014](../specs/spec-EXP.md) | EXP017 | EXP §3; related examples: AC-EXP-GUEST, AC-EXP-QUOTE, AC-EXP-CONSENT, AC-EXP-VERSION |
| F-EXPLORE-15 | System | UC-DIS-02 | [EXP FR-015](../specs/spec-EXP.md) | EXP017 | EXP §3; related examples: AC-EXP-GUEST, AC-EXP-QUOTE, AC-EXP-CONSENT, AC-EXP-VERSION |
| F-EXPLORE-16 | System | UC-DIS-02 | [EXP FR-016](../specs/spec-EXP.md) | EXP017 | EXP §3; related examples: AC-EXP-GUEST, AC-EXP-QUOTE, AC-EXP-CONSENT, AC-EXP-VERSION |
| F-EXPLORE-17 | System | UC-DIS-02 | [EXP FR-017](../specs/spec-EXP.md) | EXP017 | EXP §3; related examples: AC-EXP-GUEST, AC-EXP-QUOTE, AC-EXP-CONSENT, AC-EXP-VERSION |
| F-SCHED-01 | Tour Agency / Local Provider | UC-BOOK-01 | [BKG FR-001](../specs/spec-BKG.md) | DSH018, SCH139, SCH140 | BKG §3; related examples: AC-BKG-HOLD, AC-BKG-RACE, AC-BKG-EXPIRY, AC-BKG-HOURS, AC-BKG-COMPLETE |
| F-SCHED-02 | Tour Agency | UC-BOOK-01 | [BKG FR-002](../specs/spec-BKG.md) | BKG137, SCH141 | BKG §3; related examples: AC-BKG-HOLD, AC-BKG-RACE, AC-BKG-EXPIRY, AC-BKG-HOURS, AC-BKG-COMPLETE |
| F-SCHED-03 | Local Provider | UC-BOOK-04 | [BKG FR-003](../specs/spec-BKG.md) | BKG134 | BKG §3; related examples: AC-BKG-HOLD, AC-BKG-RACE, AC-BKG-EXPIRY, AC-BKG-HOURS, AC-BKG-COMPLETE |
| F-SCHED-04 | Local Provider | UC-BOOK-05 | [BKG FR-004](../specs/spec-BKG.md) | BKG144 | BKG §3; related examples: AC-BKG-HOLD, AC-BKG-RACE, AC-BKG-EXPIRY, AC-BKG-HOURS, AC-BKG-COMPLETE |
| F-SCHED-05 | Local Provider | UC-BOOK-05 | [BKG FR-005](../specs/spec-BKG.md) | BKG144, SCH139 | BKG §3; related examples: AC-BKG-HOLD, AC-BKG-RACE, AC-BKG-EXPIRY, AC-BKG-HOURS, AC-BKG-COMPLETE |
| F-SCHED-06 | Local Provider | UC-BOOK-05 | [BKG FR-006](../specs/spec-BKG.md) | BKG136, SCH139 | BKG §3; related examples: AC-BKG-HOLD, AC-BKG-RACE, AC-BKG-EXPIRY, AC-BKG-HOURS, AC-BKG-COMPLETE |
| F-SCHED-07 | Local Provider / Tour Agency | UC-BOOK-03, UC-BOOK-05 | [BKG FR-007](../specs/spec-BKG.md) | BKG135, BKG138, SCH139, SCH141 | BKG §3; related examples: AC-BKG-HOLD, AC-BKG-RACE, AC-BKG-EXPIRY, AC-BKG-HOURS, AC-BKG-COMPLETE |
| F-SCHED-08 | System | UC-BOOK-04, UC-BOOK-05 | [BKG FR-008](../specs/spec-BKG.md) | Supporting authorization/automation for linked UC; no dedicated screen | BKG §3; related examples: AC-BKG-HOLD, AC-BKG-RACE, AC-BKG-EXPIRY, AC-BKG-HOURS, AC-BKG-COMPLETE |
| F-SCHED-09 | System | UC-BOOK-02 | [BKG FR-009](../specs/spec-BKG.md) | SCH139, SCH140 | BKG §3; related examples: AC-BKG-HOLD, AC-BKG-RACE, AC-BKG-EXPIRY, AC-BKG-HOURS, AC-BKG-COMPLETE |
| F-SCHED-10 | Local Provider | UC-BOOK-06 | [BKG FR-010](../specs/spec-BKG.md) | BKG133, DSH018 | BKG §3; related examples: AC-BKG-HOLD, AC-BKG-RACE, AC-BKG-EXPIRY, AC-BKG-HOURS, AC-BKG-COMPLETE |
| F-ADMIN-01 | System | UC-ADM-01 | [ADM FR-001](../specs/spec-ADM.md) | ADM079 | ADM §3; related examples: AC-ADM-SCOPE, AC-ADM-PAIR, AC-ADM-FILTER |
| F-ADMIN-02 | System | UC-ADM-01 | [ADM FR-002](../specs/spec-ADM.md) | ADM079 | ADM §3; related examples: AC-ADM-SCOPE, AC-ADM-PAIR, AC-ADM-FILTER |
| F-ADMIN-03 | System | UC-ADM-01 | [ADM FR-003](../specs/spec-ADM.md) | ADM079 | ADM §3; related examples: AC-ADM-SCOPE, AC-ADM-PAIR, AC-ADM-FILTER |
| F-ADMIN-04 | Admin HDT/UBND | UC-ADM-01 | [ADM FR-004](../specs/spec-ADM.md) | ADM079 | ADM §3; related examples: AC-ADM-SCOPE, AC-ADM-PAIR, AC-ADM-FILTER |
| F-ADMIN-05 | Admin HDT/UBND | UC-ADM-01 | [ADM FR-005](../specs/spec-ADM.md) | ADM079 | ADM §3; related examples: AC-ADM-SCOPE, AC-ADM-PAIR, AC-ADM-FILTER |
| F-ADMIN-06 | Admin HDT/UBND | UC-ADM-01 | [ADM FR-006](../specs/spec-ADM.md) | ADM079 | ADM §3; related examples: AC-ADM-SCOPE, AC-ADM-PAIR, AC-ADM-FILTER |
| F-ADMIN-07 | Admin HDT/UBND | UC-ADM-01 | [ADM FR-007](../specs/spec-ADM.md) | ADM079 | ADM §3; related examples: AC-ADM-SCOPE, AC-ADM-PAIR, AC-ADM-FILTER |
| F-ADMIN-08 | Admin HDT/UBND | UC-ADM-01 | [ADM FR-008](../specs/spec-ADM.md) | ADM079 | ADM §3; related examples: AC-ADM-SCOPE, AC-ADM-PAIR, AC-ADM-FILTER |
| F-ADMIN-09 | Admin HDT/UBND | UC-ADM-01 | [ADM FR-009](../specs/spec-ADM.md) | ADM079 | ADM §3; related examples: AC-ADM-SCOPE, AC-ADM-PAIR, AC-ADM-FILTER |
| F-ADMIN-10 | Admin HDT/UBND | UC-ADM-01 | [ADM FR-010](../specs/spec-ADM.md) | ADM079 | ADM §3; related examples: AC-ADM-SCOPE, AC-ADM-PAIR, AC-ADM-FILTER |
| F-CHAT-01 | Tour Agency / Local Provider | UC-COM-01 | [IAC FR-001](../specs/spec-IAC.md) | COM048, COM065 | IAC §3; related examples: AC-IAC-PAIR, AC-IAC-NAV, AC-IAC-CLOSED, AC-IAC-FILE |
| F-CHAT-02 | Tour Agency / Local Provider | UC-COM-01 | [IAC FR-002](../specs/spec-IAC.md) | COM048, COM065 | IAC §3; related examples: AC-IAC-PAIR, AC-IAC-NAV, AC-IAC-CLOSED, AC-IAC-FILE |
| F-CHAT-03 | Tour Agency / Local Provider | UC-COM-01 | [IAC FR-003](../specs/spec-IAC.md) | COM048, COM065, DSH018 | IAC §3; related examples: AC-IAC-PAIR, AC-IAC-NAV, AC-IAC-CLOSED, AC-IAC-FILE |
| F-CHAT-04 | Tour Agency / Local Provider | UC-COM-01 | [IAC FR-004](../specs/spec-IAC.md) | COM048, COM065 | IAC §3; related examples: AC-IAC-PAIR, AC-IAC-NAV, AC-IAC-CLOSED, AC-IAC-FILE |
| F-CHAT-05 | Tour Agency / Local Provider | UC-COM-01 | [IAC FR-005](../specs/spec-IAC.md) | COM125, COM126 | IAC §3; related examples: AC-IAC-PAIR, AC-IAC-NAV, AC-IAC-CLOSED, AC-IAC-FILE |
| F-AUTH-24 | Member | UC-ACC-10 | [AUT FR-024](../specs/spec-AUT.md) | ACC129 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-25 | Member | UC-ACC-10 | [AUT FR-025](../specs/spec-AUT.md) | ACC130 | AUT §3; related examples: AC-AUT-OTP, AC-AUT-SESSION, AC-AUT-PERSONAL, AC-AUT-ROUTING |
| F-AUTH-26 | Guest | UC-ACC-06 | [AUT FR-026](../specs/spec-AUT.md) | REG116, REG003 | AUT §3; secure edit-link resubmission scenario |
