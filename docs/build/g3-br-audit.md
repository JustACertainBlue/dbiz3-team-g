# G3 business-rule → test audit (5 November 2026, branch `linh/g3-audit`, base `main` `71429cc`; PRF BR-014/017 and AIT BR-015 updated after `linh/br-fixes`)

Every BR of the five modules on `main`, checked line by line against the current code and tests (not
against build logs). Method: five read-only audits (one per module) opened each candidate test and confirmed
its assertions exercise the rule; cheap gaps were then closed with new tests on this branch, each proven by a
mutation check (build-log Entry 43). Test paths are relative to `tests/`, code paths to `src/`.

Status: **COVERED** = a test asserts the rule's behaviour · **PARTIAL** = a named part is untested ·
**MISSING** = no test · **CODE BREAKS** = the running code does not follow the rule (a correct test would fail) ·
**N/A** = outside the built scope (reason given). "new" = test added on this branch.

Scope note: this audit covers BRs. G3 also asks for every acceptance scenario of the P1 stories; those were
not re-audited here.

## Summary

| Module | BRs | COVERED | PARTIAL | MISSING | CODE BREAKS | N/A |
|---|---|---|---|---|---|---|
| AIT | 22 | 17 | 0 | 0 | 0 (BR-015 fixed, `linh/br-fixes`) | 5 (BR-012, 013, 021, 022 Should; see BR-014 note) |
| PRF | 21 | 15 | 5 | 1 (BR-013) | 0 (BR-014, BR-017 fixed, `linh/br-fixes`) | 0 |
| EXP | 15 | 10 | 0 | 1 (BR-014, decided exception) | 0 | 4 (BR-011, 012, 013, 015: learning loop, Should) |
| BKG | 19 | 17 | 0 | 0 | 0 | 2 (BR-013 unused number, BR-015 other module) |
| ADM | 19 | 16 | 3 | 0 | 0 | 0 |

## AIT (spec-AIT BR-001..BR-022)

| BR | Status | Test | Code | Note |
|---|---|---|---|---|
| 001 | COVERED | integration/ait-matching-api.test.ts:120 (guest 401, other roles 403), :141, :152 | app/api/ait/sessions/route.ts:8-12 | `/api/ait/preferences/[agencyId]` has no auth check (see BR-015) |
| 002 | COVERED | unit/ai-matching-access.test.ts:7, :15, :19 | app/ai-matching/ai-matching-access.ts:6-9 | helper only; layout redirect not rendered in a test |
| 003 | COVERED (new) | integration/ait-exp-br-gaps.test.ts:31 — Draft and Revision Required Providers' Experiences excluded | lib/db/seed-loader.ts:146 | the older candidate-filter tests only re-checked hard-coded flags |
| 004 | COVERED | unit/clarification.test.ts (:22, :32, :97); ait-matching-api.test.ts:185 | lib/ai/extractor.ts:114-128 | `POST /api/ait/matching` trusts the client profile |
| 005 | COVERED | unit/hard-constraints.test.ts:51, :57; ait-matching-api.test.ts:62 | lib/matching/constraint-engine.ts:76-83 | date constraint not applied (checklist §3 #18) |
| 006 | COVERED | unit/scoring-engine.test.ts:46, :83 | lib/matching/scoring-engine.ts:36-106 | quality fixed per Experience (§3 #19) |
| 007 | COVERED | unit/recommendations.test.ts:91-109; ait-matching-api.test.ts:209 | lib/matching/recommendation-service.ts:38-60 | |
| 008 | COVERED | ait-matching-api.test.ts:62 (10→15→13→200 pax in one session) | lib/ai/extractor.ts:53-108 | |
| 009 | COVERED | ait-matching-api.test.ts:94 (no Booking after Quote/Chat) | lib/demo/commercial-handoff-service.ts | `tests/contract/quote-chat-api.test.ts` tests unused `lib/matching/handoff-service.ts` |
| 010 | COVERED | ait-matching-api.test.ts:117 | commercial-handoff-service.ts | |
| 011 | COVERED | recommendations.test.ts:125, :133, :138; ait-matching-api.test.ts:219 | recommendation-service.ts:98-138 | Distance/Dates suggestions are fixed text (engine filters neither) |
| 012 | N/A | — | — | FR-013/014 learning loop (Should) not built; AIT chats carry `source: 'Explore'` |
| 013 | N/A | unit/time-decay.test.ts:37 (library) | lib/decay/time-decay.ts | FR-015 (Should), not wired |
| 014 | COVERED (new) | ait-exp-br-gaps.test.ts:40 — Agency B keeps the global order after Agency A's profile | lib/preferences/preference-service.ts:81-117 | in-memory profile store (FR-016 partly built) |
| 015 | COVERED (fixed) | integration/ait-preferences-auth.test.ts (Guest 401, other roles / other Agency 403, profile unchanged) | app/api/ait/preferences/[agencyId]/route.ts (`denied`) | fixed on `linh/br-fixes` (checklist §3 #46); store still in memory |
| 016 | COVERED (new) | ait-exp-br-gaps.test.ts:57 — POST sessions 201, one row stored | app/api/ait/sessions/route.ts | |
| 017 | COVERED | integration/ait-failure-api.test.ts:39 | app/api/ait/sessions/[id]/messages/route.ts:51-57 | |
| 018 | COVERED (+new) | ait-matching-api.test.ts:94-105; ait-exp-br-gaps.test.ts:70 (reuse after a cancelled Booking) | commercial-handoff-service.ts | no separate code path for the cancelled case, so no mutation of its own |
| 019 | COVERED (+new) | ait-matching-api.test.ts:107-115; ait-exp-br-gaps.test.ts:79 (Closed Chat not reopened) | commercial-handoff-service.ts (`status !== 'Closed'`) | |
| 020 | COVERED | recommendations.test.ts:113; ait-matching-api.test.ts:85 | recommendation-service.ts:29-33 | |
| 021 | N/A | time-decay.test.ts:22-32 (library) | time-decay.ts | FR-015 (Should), not wired |
| 022 | N/A | preference-profile.test.ts:76 | preference-service.ts | FR-016 (Should), partly built |

## PRF (spec-PRF BR-001..BR-021, clarifications #31–#34)

| BR | Status | Test | Code | Note |
|---|---|---|---|---|
| 001 | PARTIAL | prf/unit/agency-service.test.ts:40; prf/integration/agency-routes.test.ts:77 | lib/prf/agency-service.ts:62-68 | only cross-Agency tested; "other Agency users" (non-owner roles) not built |
| 002 | COVERED | prf/unit/provider-service.test.ts:209; experience-service.test.ts:49, :59 | provider-service.ts; experience-service.ts | |
| 003 | COVERED (+new) | prf/integration/admin-read-only.test.ts:29, :38; prf/unit/prf-br-gaps.test.ts:28 (Agency profile) | provider-service.ts; agency-service.ts:65 | |
| 004 | COVERED | prf/unit/visibility.test.ts:59-250 | lib/prf/visibility.ts | |
| 005 | COVERED | provider-service.test.ts:315; provider-routes.test.ts:212 | provider-service.ts | check skipped if a UBND session has no village (untested) |
| 006 | COVERED | provider-service.test.ts:234, :241 | provider-service.ts | completeness judged on the request body only |
| 007 | COVERED | prf/unit/provider-versioning.test.ts:54-104; provider-profile-a2.test.ts:31-90 | provider-service.ts; explore/catalog.ts:61 | |
| 008 | PARTIAL | prf/unit/experience-images.test.ts:35, :41, :81 | lib/prf/experience-images.ts | Provider-profile images have no upload path (checklist §3 #42) |
| 009 | COVERED | experience-images.test.ts:76; experience-service.test.ts:72 | experience-service.ts | |
| 010 | COVERED (+new) | experience-service.test.ts:98, :109; prf-br-gaps.test.ts:39 (notice < 0) | lib/prf/validators.ts | |
| 011 | PARTIAL | prf/unit/ai-service.test.ts:31 (one keyword) | lib/prf/ai-service.ts | AI is a local stub |
| 012 | PARTIAL | ai-service.test.ts:23, :39 | ai-service.ts | PRF128 puts the draft into the description field; Save then makes it final |
| 013 | MISSING | — | experiences/new/page.tsx (Accept/discard UI) | Accept/Edit/Regenerate/Discard exist only as UI; no pure helper to test |
| 014 | COVERED (fixed) | prf/unit/prf-br-fixes.test.ts (price/capacity/duration/location refused with 409 on Booked seed Experience; description allowed; Completed-only not locked; unchanged values allowed) | lib/prf/experience-service.ts | fixed on `linh/br-fixes` (§3 #44) |
| 015 | COVERED | experience-images.test.ts:98-122 | experience-service.ts; experience-images.ts | |
| 016 | PARTIAL | prf/unit/lightbox.test.ts:9-26 | lib/prf/lightbox.ts | tap-to-open on EXP068 not render-tested (client page) |
| 017 | COVERED (fixed) | prf/unit/prf-br-fixes.test.ts (name/Tax ID kept, Pending Review request stored; other fields immediate) | lib/prf/agency-service.ts | fixed on `linh/br-fixes` (§3 #45); HDT review flow not built (§3 #49) |
| 018 | COVERED (+new) | provider-versioning.test.ts:67; prf-br-gaps.test.ts:53, :58 (Craft Type, Business Registration) | provider-service.ts | |
| 019 | COVERED (+new) | experience-service.test.ts:146-162; prf-br-gaps.test.ts:67 (real Booked seed Bookings) | experience-service.ts | |
| 020 | COVERED (new) | prf-br-gaps.test.ts:76 (provider row unchanged) | experience-service.ts | |
| 021 | COVERED (new) | prf-br-gaps.test.ts:86 (save → read back) | provider-service.ts | use in F-SCHED-09 covered by BKG |

## EXP (spec-EXP BR-001..BR-015, clarifications #29, #32, #33)

| BR | Status | Test | Code | Note |
|---|---|---|---|---|
| 001 | COVERED | unit/explore-catalog.test.ts:30 | lib/explore/catalog.ts:61-65 | |
| 002 | COVERED (+new) | explore-catalog.test.ts:55; integration/ait-exp-br-gaps.test.ts:92 (Guest/other roles 403 on the live handoff, nothing written) | commercial-handoff-service.ts | |
| 003 | COVERED | explore-catalog.test.ts:68; explore-details.test.ts:38-62 | catalog.ts; details.ts | |
| 004 | COVERED | explore-runtime.test.ts:51; explore-learning.test.ts:14 | explore/runtime.ts:91-125 | in memory only |
| 005 | COVERED (new) | ait-exp-br-gaps.test.ts:108 (strong +0.2 vs explicit +0.1) | explore/learning.ts:68 | |
| 006 | COVERED | explore-learning.test.ts:14-35; exp-handoff-signal.test.ts:40 | learning.ts; runtime.ts | |
| 007 | COVERED | explore-runtime.test.ts:51 | runtime.ts:110-122 | |
| 008 | COVERED | explore-runtime.test.ts:58; explore-learning.test.ts:43 | runtime.ts; learning.ts | |
| 009 | COVERED (+new) | ait-exp-br-gaps.test.ts:92 (live service); explore-handoff.test.ts:18 (unused `handoff.ts`) | commercial-handoff-service.ts | live check is the demo role, not F-AUTH-16 (checklist §3 #38) |
| 010 | COVERED (+new) | demo-functional-flow.test.ts:16; ait-exp-br-gaps.test.ts:100 (Chat) | commercial-handoff-service.ts | |
| 011 | N/A | explore-learning.test.ts:71 (pure function) | learning.ts:117-149 | aggregate metrics (FR-013, Should) not used by the app |
| 012 | N/A | explore-learning.test.ts:53-123 (stages in isolation) | learning.ts:88-200 | FR-013–017 loop (Should) not composed or scheduled |
| 013 | N/A | explore-learning.test.ts:53, :59, :93 (pure) | learning.ts | same |
| 014 | MISSING | — | — | decided exception: F-EXPLORE-17 (Should, P2) not built (checklist §3 #41) |
| 015 | N/A | explore-learning.test.ts:85-111 (gates as pure logic) | learning.ts:151-200 | weekly promotion not built (F-EXPLORE-17) |

## BKG (spec-BKG BR-001..BR-019, clarifications #26–#82)

| BR | Status | Test | Code | Note |
|---|---|---|---|---|
| 001 | COVERED | unit/bkg-manage-access.test.ts:39; bkg-booking-access.test.ts:37; integration/bkg-create-api.test.ts:52; bkg-manage-api.test.ts:78 | lib/booking/* | |
| 002 | COVERED | bkg-agency-bookings.test.ts:34; bkg-booking-access.test.ts:33; bkg-booking-actions.test.ts:31 | booking-access.ts | |
| 003 | COVERED | bkg-create-booking.test.ts:33 | create-booking.ts | |
| 004 | COVERED | bkg-create-booking.test.ts:39; bkg-expire-holds.test.ts:29 | create-booking.ts; expire-holds.ts | |
| 005 | COVERED | bkg-create-booking.test.ts:47; bkg-availability.test.ts:89 | conflicts.ts | |
| 006 | COVERED (+new) | bkg-provider-schedule.test.ts:100; bkg-availability-consistency.test.ts:24; unit/bkg-br-gaps.test.ts:28 (schedule API GET only) | availability.ts | |
| 007 | COVERED (+new) | bkg-update-booking.test.ts:36; bkg-br-gaps.test.ts:38 (status change ignores detail fields) | update-booking.ts; change-status.ts | |
| 008 | COVERED | bkg-agency-bookings.test.ts:34, :95 | booking-access.ts | |
| 009 | COVERED | bkg-provider-schedule.test.ts:53; bkg-availability.test.ts:68 | availability.ts | |
| 010 | COVERED | bkg-mark-arrival.test.ts:23-42 | mark-arrival.ts | |
| 011 | COVERED (+new) | bkg-change-status.test.ts:70; bkg-update-booking.test.ts:45; bkg-br-gaps.test.ts:52 (Completed) | change-status.ts | |
| 012 | COVERED | bkg-agency-sync.test.ts:45-112 | agency-sync.ts | |
| 013 | N/A | — | — | number unused in spec-BKG (open question #34) |
| 014 | COVERED | bkg-booking-access.test.ts:41; bkg-detail-page-access.test.ts:35 | booking-access.ts | |
| 015 | N/A | — | — | quoting belongs to EXP/AIT (#75) |
| 016 | COVERED | bkg-mark-arrival.test.ts:23 | mark-arrival.ts | |
| 017 | COVERED (+new) | bkg-booking-actions.test.ts:16, :20; bkg-list-bookings.test.ts:120; unit/bkg-screens.test.ts:38 (BKG135 buttons visible, disabled per rule, SC-007) | booking-actions.ts | Confirm relies on expiry-first for #59 |
| 018 | COVERED | bkg-create-eligibility.test.ts:50-67 | create-booking.ts | |
| 019 | COVERED | bkg-create-booking.test.ts:71, :79; bkg-change-status.test.ts:35, :79; bkg-repository-batch-update.test.ts:27 | applyBatch | arrival/expiry rollback rely on the generic applyBatch test |

BKG screens recorded as "demo only" (build-log Entries 13, 22, 26) now have tests: 011 M7 → `unit/bkg-screens.test.ts:38`;
012 M2 (#66, #67) → `bkg-screens.test.ts:54, :64, :70`; 013 M3 (#68, #69) → `bkg-screens.test.ts:82`,
`unit/bkg-nav-links.test.ts:12, :20` (PRF127/PRF128/PRF019 now use `lib/booking/nav-links.ts`).

## ADM (spec-ADM BR-001..BR-019, clarifications #21–#22, contract:110)

Finding: many older ADM tests pass on an empty data set — without dates they use "Last 30 days" from today, while
every seed Booking was created 2026-09-23..28 (e.g. `adm/unit/booking-table.test.ts:43` still passed with the
AND filter mutated to OR). The new tests use the P1 window 2026-09-20..25 (seven seed Bookings).

| BR | Status | Test | Code | Note |
|---|---|---|---|---|
| 001 | COVERED | adm/unit/scope-guard.test.ts:23; metric-cards.test.ts:69 | lib/adm/scope-guard.ts | |
| 002 | COVERED | scope-guard.test.ts:45; contract/dashboard-api.test.ts:50; agency-metrics.test.ts:78 | scope-guard.ts; metrics-service.ts | |
| 003 | COVERED | scope-guard.test.ts:57; dashboard-api.test.ts:89; filter-panel.test.ts:43 | scope-guard.ts | |
| 004 | COVERED | scope-guard.test.ts:23, :34; filter-metrics.test.ts:26 | scope-guard.ts | |
| 005 | PARTIAL | metric-cards.test.ts:64; booking-table.test.ts:74-86; adm-br-gaps.test.ts:37 (table) | metrics-service.ts | Agency/Provider filters on status breakdown, trend and Top 10 not asserted on real rows |
| 006 | COVERED (+new) | pending-verification.test.ts:44; adm/unit/adm-br-gaps.test.ts:62 (routes GET only) | app/api/adm/* | |
| 007 | COVERED | booking-metrics.test.ts:57 | metrics-service.ts | |
| 008 | COVERED | agency-metrics.test.ts:54, :65 | metrics-service.ts | Chat-only relation untested |
| 009 | COVERED | provider-metrics.test.ts:56, :68 | metrics-service.ts | |
| 010 | COVERED (new) | adm-br-gaps.test.ts:47 (UBND Bát Tràng: 2 of 7) | metrics-service.ts | |
| 011 | COVERED | trend-calculator.test.ts:56 | trend-calculator.ts | card-level null not asserted |
| 012 | COVERED (new) | adm-br-gaps.test.ts:71 (no `href` in table / Top 10) | components/admin/* | |
| 013 | COVERED (new) | adm-br-gaps.test.ts:71 (no Booking Detail link) | components/admin/* | |
| 014 | COVERED (new) | adm-br-gaps.test.ts:37 (AND on real rows) | metrics-service.ts:615-622 | the older test was vacuous |
| 015 | PARTIAL | agency-metrics.test.ts:54, :60 (zero cases) | metrics-service.ts:305-332 | no positive Active Agency count asserted |
| 016 | PARTIAL | provider-metrics.test.ts:56, :63 (zero cases) | metrics-service.ts:425-469 | no positive Active Provider count asserted |
| 017 | COVERED | metric-cards.test.ts:78; adm-runtime-api.test.ts:58 | metrics-service.ts | |
| 018 | COVERED (new) | adm-br-gaps.test.ts:55 (P1 frequency 5 = 3 Booked + 2 Completed) | metrics-service.ts:660-666 | |
| 019 | COVERED | trend-calculator.test.ts:18-36 | trend-calculator.ts | day count excludes the end date (31-day month counts 30): spec silent |
