# MVP Alpha Checklist

Course: DBIZ3 AI-native Product Development, Session 8 output (input to Session 9)
Team: `Group G`    Product: `Hanoi Artisan Bridge`    Date: `04/11/2026` (first version `14/10/2026` at `f5e7223`)
Commit checked: `deaf3ab` (`main`, PR #35) plus the CI workflow on `linh/ci-windows` (`dbe2df5`)    Tag: `mvp-alpha` (not created: gates below are not all met)

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
| Explore (EXP) | US-1 (Browse Explore), US-3 (View Provider), US-4 (View Experience) | `specs/001-exp-core` | JustACertainBlue | Agency: 1. `/explore` → 2. Provider card "Xưởng thủ công Bát Tràng" → `/explore/providers/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374` → 3. "Chi tiết" → `/explore/experiences/c9f9faf7-2987-5ae4-b1ed-95c095fcce69` |
| AI Tour Matching (AIT) | US-1 (AI Tour Matching) | `specs/001-ait-core` | nguyenthu-0505 (round 3: linhkhanh-vu) | Agency: 1. `/ai-matching` → 2. "Silk weaving workshop for 10 pax on 2026-11-20 from Hoàn Kiếm, budget 300,000 VND per person" → 5 ranked cards, Vạn Phúc #1 → 3. Request Quote → `/messages` (full path: `specs/001-ait-core/quickstart.md` §2) |
| Booking & Schedule (BKG) | US-1 (View Schedule), US-2 (Calculated Availability), US-3 (View Bookings), US-4 (Create Booking), US-5 (Manage Booking), US-6 (List Bookings) | `specs/004-bkg-core`, `specs/011-bkg-manage`, `specs/012-bkg-list`, `specs/013-bkg-schedule` | linhkhanh-vu | Provider: 1. `/provider/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374/schedule` (SCH139) → 2. `…/bookings/new` (BKG134, Tràng An, 10 pax) → BKG135 On hold → 3. Confirm/Book → Booked → 4. `…/bookings` (BKG133). Agency: 5. `/agency/02e568d8-d65e-54b1-a554-b411150d1dcb/bookings` (BKG137) → Booking detail (BKG138). Agency: `/explore/providers/50f2c8fc…/schedule` (SCH140). Full paths: each feature's `quickstart.md` |
| Admin Dashboard (ADM) | US-1 (View Admin Dashboard) | `specs/003-adm-core` | thuvutp-prog (port and fixes: linhkhanh-vu) | 1. UBND: `/admin` (village locked to Hạ Thái) → 2. HDT: `/admin` (all villages, the Booking from the BKG path is listed) |

Not on `main`, so not in this Alpha: Authentication (AUT, PR #11, `001-aut-registration`; the demo
session cookie `hab_demo_account` replaces login) and In-App Chat (IAC, PR #16, `003-iac-core`;
`main` has only the Quote/Chat handoff and the shared `/messages` page). See §3 rows 31–32.

## 2. Gates

Tick only after checking it at the commit above. Every line must be ticked for `mvp-alpha`.

Re-checked on 04/11/2026 by linhkhanh-vu (with Claude Code) at `deaf3ab`. The 14/10 ticks were for
PRF only at `f5e7223` and are replaced by the lines below.

- [ ] G1. A fresh clone runs with the commands in each `quickstart.md`, on the laptops of at least two members (one macOS and one Windows, if the team has both). Names: `linhkhanh-vu (macOS)`; Windows: GitHub Actions.
  - **Status:** tests, lint and seed validation pass on a clean Windows clone through GitHub Actions (`.github/workflows/ci.yml`, `windows-latest` and `macos-latest`: `npm ci`, `python data/scripts/validate_seed.py`, `npm test`, `npm run lint`, Node 22, Python 3). Run: `#____` (to fill after push). The UI demo path (§1) was run on macOS only. macOS local run 04/11 (Node 24.16, Python 3.14): seed `PASS: 47 CSVs`, `Tests  694 passed (694)`, lint OK. Not ticked until the Actions run number is filled in and green.
- [ ] G2. The P1 user story of every core module works end to end on the seed data, following the demo path in section 1.
  - **Status:** clicked on macOS in the built-in browser on 04/11 (`npm run demo:reset`, `npm run dev`) through every §1 path: EXP, AIT, BKG and ADM worked on seed data. **PRF US-4 does not:** `/provider/<id>/edit` shows hard-coded values that are not from the seed (sidebar "HUNG THINH WORKSHOP", lead artisan "Nguyen Van Hung", "4th Generation Guild Master", "Private Groups ≤ 40 Pax"; `src/app/provider/[providerId]/edit/page.tsx:168`, `:245`, `:249`, `:274`), and Save with no change answered "Thay đổi trường trọng yếu đã tạo phiên bản mới chờ UBND thẩm định". See §3 rows 33–34.
- [ ] G3. Every business rule (BR) of the core modules, and every acceptance scenario of their P1 stories, has an automated test. All tests pass. Last line of the test run: `Tests  694 passed (694)` (104 files, `deaf3ab`).
  - **Status:** all tests pass, but not every BR has a test: PRF BR-015 is not enforced and BR-016 has no automated test (§3 rows 2, 4); BKG screens and navigation links checked by demo only (build-log Entries 13, 22, 26: M7, M2, M3); EXP analyze finding on US-1 AC2 is still open (build-log §3 #3). A full BR-to-test trace for PRF and EXP was not done.
- [x] G4. `uv run tools/start_feature.py --check` prints OK for every feature folder (the spec snapshot matches `docs/spec/`).
  - **Status:** OK for all 8 folders on 04/11 after `--refresh` of `002-prf-core`, `004-bkg-core`, `011-bkg-manage`, `012-bkg-list`. Plan/tasks re-checked by hand: PRF changed only Mermaid escaping (`;` → `#59`); the BKG additions (#26, #27, #32, #33, #44–#82) are additive and each is "covered in" a later feature or already implemented — table at the end of each folder's `plan.md`.
- [x] G5. `/speckit-analyze` was run after `/speckit-tasks`, and every CRITICAL and HIGH finding is resolved or recorded in section 3.
  - **Status:** BKG (build-log Entries 10, 13, 22, 26), AIT round 3 and ADM (Entries 32, 33) recorded with severities and decisions. PRF and EXP re-analyzed on 04/11 (Entry 38): PRF 4 CRITICAL + 3 HIGH, EXP 4 CRITICAL + 3 HIGH, **all still open in the code and recorded in §3** (rows 1, 2, 4, 33, 35–38; EXP C3 under G6). This gate is met only in its "recorded" sense: the CRITICAL items are test-first and coverage gaps that block a clean Alpha on their own.
- [ ] G6. Every change reached `main` through a pull request reviewed by a member who did not write it.
  - **Status: not met, left empty on purpose.** No merged pull request has an approving GitHub review by a non-author (checked with `gh pr list --state merged` on 04/11):
    - #2 (JustACertainBlue), #3 (nguyenthu-0505, merged by JustACertainBlue), #5 (nguyenthu-0505), #8 PRF (nguyenthu-0505, merged by JustACertainBlue): no review recorded. Merging by another member is not a review.
    - #6 AIT (nguyenthu-0505): linhkhanh-vu requested changes twice; merged by the author without an approval.
    - #13–#35 (all BKG, AIT round 3, ADM port, fix(auth) and docs PRs; author linhkhanh-vu): merged by the author without a review. Reason: Solo work: merged without non-author review to keep pace; review was requested on #33–#35 but none was given.
    - Not through a pull request at all: the spec/data uploads and `Update spec-*.md` commits made on GitHub (Sep–Oct), and the EXP commits `4a1ae27`, `581e09a`, `bf30cea`, `2e79614`, `ada9e44` (pushed directly to `main`).
- [x] G7. No real personal data and no secret (key, password, token) in any committed file.
  - **Status:** no secret found (pattern search for API keys, private keys and tokens; `.env.example` holds mock values only; seed e-mails use `example.invalid`). The one real personal e-mail (a member's Gmail in `docs/env/Environment Readiness Report.md:71`) was replaced by `member@example.invalid` on 04/11 (edit approved by linhkhanh-vu); `git grep` for common webmail domains now finds nothing. The old address is still in git history; rewriting history was not done.
- [x] G8. `docs/build/build-log.md` has an entry for every agent run that changed code or tests.
  - **Status:** entries exist for PRF (Entries 1–7), EXP (Codex Entries 1–8), BKG (9–31), AIT round 3 (32), ADM port (33), fix(auth) (34), CI and checklist (35). The two missing runs were added on 04/11 as Entry 36 (AIT rounds 1–2, PR #6) and Entry 37 (original ADM build, PR #12), both marked "reconstructed from git history on 2026-11-04"; fields git does not record (agent, test counts, test-first order) are marked "not recorded".

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
| 10 | BKG: A denied BKG133/BKG134/BKG135/BKG144/BKG136/BKG137/BKG138/DSH018/SCH139/SCH140/SCH141 page answers HTTP 200 with an access-denied message instead of 403; no Booking data is rendered, and the APIs do return 403 (404 for an unknown or non-Verified Provider on SCH140). | BKG BR-001, BR-002, BR-014; screen SR-001 | Decide at review |
| 11 | BKG: ~~BKG138 Back goes to `/explore`, because the Agency Booking list BKG137 is not built~~ **Closed by 013**: BKG138 Back → BKG137 Booking History; Agency nav "Bookings" → BKG137, "Schedule" → SCH141 (#68). | screen-spec-BKG138 §5, #68 | Done |
| 12 | BKG: ~~The Provider page has no link to BKG135~~ **Closed by 012 US-6**: Provider page → Bookings → BKG133 → Detail → BKG135 (#66). | BKG #54, #66, screen-spec-BKG135 | Done |
| 13 | BKG: DSH018 has only the "Own booking action summary" panel; the profile, schedule and conversation panels are not built. ~~The Provider "Dashboard" link still opens PRF127~~ **nav part closed by 013**: "Dashboard" → DSH018, "Schedule" → SCH139 (#69). | BKG #65, #69, screen-spec-DSH018 | Other panels: with PRF / SCH / CHAT (not planned yet) |
| 14 | `npm audit` reports 15 dependency vulnerabilities (5 moderate, 6 high, 4 critical) on `main` `4de9d95` (up from 9 with 3 critical at Entry 2); `npm audit fix` is not run because it may change the agreed stack versions. Prototype only, no external deployment. | build-log §3 #4 | Upgrade the shared stack together with all module owners before any external deployment (not planned yet) |
| 15 | AIT: AI extraction is a local rule-based mock; no LLM is called. It reads group size, date, budget, origin (#35), craft (#32, #37) and Experience type (#34) from keywords only; free wording outside those keywords is not understood. Development stub only (the spec forbids a rule-based fallback). | AIT FR-003, FR-004, BR-017, SR-003 | Session 9 |
| 16 | AIT: "Temporary AI Failure + Retry" is real in the UI and API (503 + Retry, #27, #33, #36), but an AI failure can only be produced by a test mock or a stopped server, because no real AI call exists. | AIT FR-003, AC-AIT-FAIL, BR-017 | Session 9 |
| 17 | AIT: Route distance is a fixed per-village table, not Google Maps Distance Matrix; explanations label it "estimated" (#25). | AIT FR-006, BR-005, OQ #9 | Session 10 |
| 18 | AIT: Date availability (operating hours, On hold / Booked) is not checked in matching; the Budget suggestion (#23) therefore considers capacity only, not dates. | AIT FR-006, #23 | Session 10 |
| 19 | AIT: Provider quality in the match score is a fixed per-Experience value in code, not read from `data/`. | AIT FR-007 | Session 10 |
| 20 | AIT: Providers whose `craft_type` is Other (Chuông, Phú Vinh) match a hat or bamboo preference equally; a finer taxonomy needs a change in `data/`. | AIT #32 | Session 11 |
| 21 | AIT: Demo session cookie (`hab_demo_account`) instead of AUT login; access is Guest → Login, non-Agency → restricted page (#28). | AIT BR-001, BR-002; AUT F-AUTH-16 | Session 9–10 |
| 22 | AIT: Recommendation cards have no "View Experience" action and do not show the Provider name. | AIT FR-008, AIT121 element 7 | Session 10 |
| 23 | AIT: Test title in `tests/integration/matching-scenarios.test.ts:65` says "all seed max ≤ 20" (largest eligible group is 16; 18 overall). | Constitution I | Session 9 |
| 24 | AIT: Matching sessions, messages, Quote Requests and Chats are stored in the shared JSON runtime (`.demo-data/runtime.json`), not PostgreSQL (`src/lib/db/client.ts` is a stub). | AIT FR-005, FR-011; `data/schema.sql` | Session 9–10 |
| 25 | ADM: Demo session cookie (`hab_demo_account`) instead of AUT login; UBND demo identity is Hạ Thái (no Bookings), Bát Tràng figures are shown through the HDT village filter. | ADM BR-001, BR-002; AUT F-AUTH-16 | Session 9–10 |
| 26 | ADM: The dashboard is read-only and does not run the BKG 72-hour expiry, so an expired hold shows as On hold (and counts in Active Collaborations) until the next BKG request runs the expiry — same cause as row 8. | ADM BR-006, BR-007, BR-017; BKG FR-005 | Session 10 |
| 27 | ADM: Agencies awaiting approval are listed from `agency_registration_requests` (Pending Approval); the seed has none, so the panel shows only the Hạ Thái Provider until AUT writes registrations to the runtime. | ADM FR-007; AUT F-AUTH-04 | Session 10 |
| 28 | ADM: Data is read from the shared JSON runtime (`.demo-data/runtime.json`), not PostgreSQL. | ADM FR-002; `data/schema.sql` | Session 9–10 |
| 29 | ADM: `/admin` loads `/api/adm/filter-options` about 10 times on page load (stable afterwards); not optimised. | ADM FR-006 | Session 11 |
| 30 | ~~All modules: the shared `demoSessionFromRequest` still accepts a client-supplied `x-mock-session` header when no `hab_demo_account` cookie is sent (BKG, AIT, PRF routes); ADM reads the cookie only. Fix planned as a separate PR.~~ **Closed by fix(auth)** (PR #35, `deaf3ab`): `demoSessionFromRequest` reads the cookie only; a forged header without the cookie is a Guest on every module (`tests/integration/auth-no-header.test.ts`). | ADM AC-ADM-SCOPE; BKG BR-001; AIT BR-001 | Done |
| 31 | AUT is not on `main` (PR #11, `001-aut-registration`, stack drift Next 16 / React 19 / Vitest 5 / `pg`): no registration or login; every module uses the demo session cookie `hab_demo_account` switched by `RoleSwitcher`. | AUT F-AUTH-* | Port to `main`'s stack (not planned yet) |
| 32 | IAC is not on `main` (PR #16, `003-iac-core`): `main` has the Quote/Chat handoff and the shared `/messages` page only. PR #16 authenticates from client headers `x-mock-user-id` / `x-mock-role` and its folder number clashes with ADM (003). | IAC US-1; AUT F-AUTH-16 | After review of PR #16 (not planned yet) |
| 33 | ~~PRF: the Edit Provider Profile page (PRF128) shows hard-coded demo values that are not from the seed.~~ **Closed by slice A** (`linh/prf-fixes`, spec-PRF #31): PRF128 shows only FR-004 inputs read from the API (incl. craft_type, business_registration_number, location_address, artisan_names, operating_hours). Still not on PRF128: profile images and the registration certificate upload (BR-008, slice B). | PRF US-4, FR-004, #31 | Done (uploads: slice B) |
| 34 | ~~PRF: Save on PRF128 with no field changed answered "new version pending UBND".~~ **Closed by slice A** (spec-PRF #32): a major change is a real change of a major-field value; PRF128 sends only changed fields; a pending or Revision Required revision no longer hides the Verified Provider from Explore / Booking (BR-007). Root cause was presence-based detection plus `provider_profiles.verification_status` set to Pending Verification. | PRF US-4, US-6, BR-007, BR-018, #32 | Done |
| 35 | PRF (analyze 04/11, CRITICAL C1): BR-003 / SC-008 / US-6 AC5 (HDT and UBND read-only on profile content) has no automated test, although tasks T035 claims AC5. The API enforces it (`updateProviderProfile` allows only the owning Local Provider, `src/lib/prf/provider-service.ts:149`), but the PRF127 page shows "EDIT PROVIDER PROFILE" and "+ CREATE BOOKING" to a UBND viewer (seen 04/11, not clicked). Same class: BR-008, BR-015, BR-016 have no test (rows 1, 2, 4). | PRF BR-003, SC-008; Constitution II | PRF owner (not planned yet) |
| 36 | PRF (analyze 04/11, HIGH H1–H2): `specs/002-prf-core/tasks.md` "Step 3.2 Coverage check" says every BR-001…BR-021 has a test task, but BR-003, BR-008, BR-015, BR-016 have none; `plan.md` names Next.js 15, Drizzle (T002, T005 never done), Cloudinary and msw, while `package.json` has Next 14 and none of them (the shared JSON runtime is used). | PRF tasks.md, plan.md; Constitution I | PRF owner (not planned yet) |
| 37 | EXP (analyze 04/11, CRITICAL C1, C2, C4): no recorded failing run before code for T019–T025 (US-2, US-3/US-4 detail pages) or for the live Quote/Chat handoff (`commercial-handoff-service.ts`, `ada9e44`, in no task); US-1–4 were built in one pass, not as thin slices. Tests exist and pass; the test-first order cannot be shown after the fact. | EXP; Constitution II, III | Record the exception; later EXP work test-first (not planned yet) |
| 38 | EXP (analyze 04/11, HIGH H1–H3): Quote/Chat do not send the FR-007 preference event; the live handoff lacks the F-AUTH-16 check, Agency/source context in the first message and hiding Request Quote after use (the tested `src/lib/explore/handoff.ts` is unused); EXP docs and quickstart still describe Quote/Chat as unavailable and a removed "Dùng doanh nghiệp mẫu" control. | EXP FR-007, FR-011, FR-012, BR-005 | EXP owner (not planned yet) |
| 39 | ~~PRF: Request Revision on a Verified Provider without an open revision hid the Provider.~~ **Closed by slice A2** (`linh/prf-fixes-2`, spec-PRF #33): Request Revision applies only to a version in Pending Verification, otherwise 409 and nothing changes; the UBND review panel on PRF127 is shown only to UBND while a version is Pending Verification. | PRF US-6, BR-007, #33 | Done |
| 40 | ~~PRF127 fixed demo text, fake availability/booking_conditions, owner header not showing the revision status.~~ **Closed by slice A2**: PRF127 shows only API data (no fixed text); `availability.operating_hours` (spec-BKG #78 shape) and `booking_conditions` come from the data, `experiences` lists the non-archived Experiences (FR-003); Edit / Create Booking only for the owning Local Provider; the owner, UBND and HDT see the status of the revision under review (#32). Still: `pricing` / `capacity` are taken from the first Experience (`src/lib/prf/provider-service.ts`), and PRF127 has no profile images (BR-008, slice B). | PRF US-3, US-4, FR-003 | Done (images: slice B) |

## 4. Sign-off

| Member | Role in this Alpha | Agrees the gates are met (yes / no, and why) |
|---|---|---|
The 14/10 sign-offs (PRF only, `f5e7223`) do not cover this version; the other members were not
asked to re-sign at `deaf3ab`.

| Member | Role in this Alpha | Agrees the gates are met (yes / no, and why) |
|---|---|---|
| Nguyen Thu (`nguyenthu-0505`) | Core Feature Dev (PRF, AIT) | Not re-confirmed at `deaf3ab` (signed "yes" for PRF at `f5e7223` on 14/10). |
| Thu Vu (`thuvutp-prog`) | ADM, macOS Validation | Not re-confirmed at `deaf3ab` (signed "yes" for PRF at `f5e7223` on 14/10). |
| Khanh Linh Vu (`linhkhanh-vu`) | BKG owner; AIT round 3, ADM port, fix(auth); this checklist | **No.** G4, G5, G7, G8 met (04/11); G1 waits for the Windows Actions run; G2, G3, G6 not met (§2 status lines). No `mvp-alpha` tag until they are. |
| Viet Hoang (`JustACertainBlue`) | EXP, Seed & Windows Validation | Not re-confirmed at `deaf3ab` (signed "yes" for PRF at `f5e7223` on 14/10). |
| Truc Linh (`linh-daotruc`) | AUT, QA & Acceptance Testing | Not re-confirmed at `deaf3ab` (signed "yes" for PRF at `f5e7223` on 14/10). |
