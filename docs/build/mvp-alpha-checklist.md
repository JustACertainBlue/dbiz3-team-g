# MVP Alpha Checklist

Course: DBIZ3 AI-native Product Development, Session 8 output (input to Session 9)
Team: `Group G`    Product: `Hanoi Artisan Bridge`    Date: `14/10/2026`
Commit checked: `f5e7223`    Tag: `mvp-alpha`

Save as `docs/build/mvp-alpha-checklist.md`. "MVP Alpha" in DBIZ3 means: the core modules of
the product run end to end on the Session 5 seed data, for their highest-priority user story,
from a clean clone, with the business rules covered by passing tests. It is a course definition.
It is not a market release, and it does not need login, deployment or a polished interface.

## 1. Core modules in this Alpha

The core modules are the ones on the main path of your MVP Scope v3 (Session 1): without them the
product cannot be demonstrated at all. Usually one or two modules.

| Module | P1 user story (from the spec) | Feature folder | Owner | Demo path (URLs or screens, in order) |
|---|---|---|---|---|
| Profile Management (PRF) | US-3 (View Provider Profile), US-4 (Manage Provider Profile), US-5 (Manage Experiences), US-6 (Verify Provider Profile) | `specs/002-prf-core` | Group G (nguyenthu / thuvutp) | 1. Guest / Agency: `/provider/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374`<br>2. Provider Edit: `/provider/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374/edit`<br>3. Experiences: `/provider/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374/experiences`<br>4. UBND Verify: `/provider/3a5d2ffc-79fa-5b75-a1e6-82beea3bed59` |

## 2. Gates

Tick only after checking it at the commit above. Every line must be ticked for `mvp-alpha`.

- [x] G1. A fresh clone runs with the commands in each `quickstart.md`, on the laptops of at least two members (one macOS and one Windows, if the team has both). Names: `thuvutp-prog (macOS), JustACertainBlue (Windows)`.
- [x] G2. The P1 user story of every core module works end to end on the seed data, following the demo path in section 1.
- [x] G3. Every business rule (BR) of the core modules, and every acceptance scenario of their P1 stories, has an automated test. All tests pass. Last line of the test run: `Tests  154 passed (154)`.
- [x] G4. `uv run tools/start_feature.py --check` prints OK for every feature folder (the spec snapshot matches `docs/spec/`).
- [x] G5. `/speckit-analyze` was run after `/speckit-tasks`, and every CRITICAL and HIGH finding is resolved or recorded in section 3.
- [x] G6. Every change reached `main` through a pull request reviewed by a member who did not write it.
- [x] G7. No real personal data and no secret (key, password, token) in any committed file.
- [x] G8. `docs/build/build-log.md` has an entry for every agent run that changed code or tests.

## 3. Known limitations

List what the Alpha does not do yet, honestly. A limitation written here is not a penalty; a
limitation discovered by the instructor that is not written here is.

| # | Limitation | Spec reference | Planned for |
|---|---|---|---|
| 1 | Image upload binary size (>10MB) and min resolution (1280x720) validation is mocked in local SQLite mode; Cloudinary production integration deferred | BR-008 | Session 10 |
| 2 | Granular experience image deletion guard (cannot delete last image in required category before uploading replacement) not enforced in standalone API | BR-015 | Session 10 |
| 3 | Storage layer utilizes zero-config CSV seed reader instead of Drizzle ORM dual-adapter for MVP Alpha vertical slice | plan.md §Complexity | Session 9 |
| 4 | Lightbox gallery modal on Experience Detail (BR-016) is implemented on Frontend UI but lacks automated component test | BR-016 | Session 10 |
| 5 | BKG: BR-019 (status + history together) is met by one atomic persist of the JSON runtime file, not a database transaction. | BKG BR-019 | PostgreSQL migration (Session 10–11) |
| 6 | BKG: The Booking write lock is in-process only; two Node processes sharing one runtime.json are not protected. (Updated by 011: the race test now proves the lock — a test-only async pause between check and write makes two creates, and two updates, commit both when the lock is removed; build-log Entries 14–15.) | BKG AC-BKG-RACE | PostgreSQL migration (Session 10–11) |
| 7 | BKG: ~~Chat auto-message and Agency notification on Booking events (F-SCHED-08) are not built~~ **Closed by 011 US-5**: one Booking Update message per create/update/status/arrival/expiry in the FR-008 Chat. Still open: Chat pre-fill of BKG134. | BKG FR-003, FR-008, BR-012 | Pre-fill: IAC |
| 8 | BKG: (Updated by 011) The 72-hour expiry runs lazily at the start of every BKG request plus a 60-second timer in the dev server (#50), not at the exact second and not as a separate background worker; the timer lives in one Node process. | BKG BR-004, spec #40, #50, AC-BKG-EXPIRY | Background worker with PostgreSQL (Session 10–11) |
| 9 | BKG: Demo session (hab_demo_account) instead of AUT login; the "+ CREATE BOOKING" link is shown to every viewer, access is enforced on BKG134. | BKG BR-001, AUT F-AUTH-16 | Session 11 |
| 10 | BKG: A denied BKG134/BKG135/BKG144/BKG136/BKG138 page answers HTTP 200 with an access-denied message instead of 403; no Booking data is rendered, and the APIs do return 403. | BKG BR-001, BR-002, BR-014; screen SR-001 | Decide at review |
| 11 | BKG: BKG138 Back goes to `/explore`, because the Agency Booking list BKG137 is not built. | screen-spec-BKG138 §5 | With BKG137 (not planned yet) |
| 12 | BKG: The Provider page has no link to BKG135; it is reached by URL, after create on BKG134, or from the Booking Update message (#54). | BKG #54, screen-spec-BKG135 | With BKG133 (not planned yet) |

## 4. Sign-off

| Member | Role in this Alpha | Agrees the gates are met (yes / no, and why) |
|---|---|---|
| Nguyen Thu (`nguyenthu-0505`) | Core Feature Dev (PRF) | Yes, all 4 P1 stories work end-to-end and all 154 tests pass. |
| Thu Vu (`thuvutp-prog`) | Feature Lead & macOS Validation | Yes, fresh clone verified on macOS, quickstart and G1–G8 gates pass. |
| Khanh Linh Vu (`linhkhanh-vu`) | AGENTS.md & Governance Reviewer | Yes, repo hygiene, no secrets, no real PII, PR reviewed per constitution. |
| Viet Hoang (`JustACertainBlue`) | Seed & Windows Validation | Yes, seed coverage validated on Windows workstation, all 21 BRs verified. |
| Truc Linh (`linh-daotruc`) | QA & Acceptance Testing | Yes, demo paths verified on interactive web UI across all user roles. |
