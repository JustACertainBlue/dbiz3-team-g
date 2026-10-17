# Tasks: Profile Management (PRF) — Core Slice

**Branch**: `002-prf-core` | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

> Constitution Principle II: Every BR (BR-001…BR-021) and every acceptance scenario
> must have a test task that comes **before** the code task it checks.
> Test tasks are marked `[TEST]`; code tasks are marked `[CODE]`.

---

## Phase 1: Setup

**Purpose**: Project scaffolding and shared configuration for the PRF slice.

- [X] T001 Create directory structure: `src/app/api/prf/`, `src/lib/prf/`, `src/db/schema/`, `tests/prf/unit/`, `tests/prf/integration/`, `tests/prf/seed/`
- [ ] T002 [P] Add Drizzle ORM dependency and configure dual adapter (pg + better-sqlite3) in `drizzle.config.ts` and `src/db/index.ts`
- [X] T003 [P] Add `msw` dev dependency and create `tests/prf/helpers/msw-handlers.ts` with Cloudinary and OpenAI stub handlers
- [X] T004 [P] Create `tests/prf/helpers/mockSession.ts` — factory for mocked sessions by role (Tour Agency Owner, Local Provider, UBND, HDT, Guest)
- [ ] T005 Create `src/db/schema/prf.ts` — Drizzle table references for all PRF tables (no new columns; imports from canonical schema)

**Checkpoint**: Directory structure exists; `npm test` runs (zero test files is OK at this point).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared PRF utilities required by all user stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 [TEST] Write `tests/prf/unit/visibility.test.ts` — tests for `filterAgencyFields(actor, profile)` and `filterProviderFields(actor, profile)` covering all actor types (Guest, Tour Agency, Local Provider, UBND, HDT, own-owner). Verify tests FAIL before implementation.
- [X] T007 Create `src/lib/prf/visibility.ts` — implements `filterAgencyFields` and `filterProviderFields` per BR-004 visibility rules. Run T006 tests → must all PASS.
- [X] T008 [TEST] Write `tests/prf/seed/prf-seed.test.ts` — loads seed data and verifies: (a) at least one `provider_profiles` row has `verification_status = 'Draft'`, (b) at least one `experiences` row has `price_per_person > 0`, (c) at least one `provider_operating_hours` row exists. (Constitution Principle II — seed coverage test.) Verify tests FAIL before seed is loaded.
- [X] T009 Create `src/lib/prf/validators.ts` — Zod schemas for all FR inputs: `AgencyProfilePatchSchema`, `ProviderProfilePatchSchema`, `ExperienceCreateSchema`, `ExperienceUpdateSchema`, `VerifyProviderSchema`, `AIDescriptionSchema`
- [X] T010 [P] Create `src/lib/prf/agency-service.ts` — stub (throws NotImplemented) for `getAgencyProfile`, `updateAgencyProfile`
- [X] T011 [P] Create `src/lib/prf/provider-service.ts` — stub for `getProviderProfile`, `updateProviderProfile`, `reviewProvider`
- [X] T012 [P] Create `src/lib/prf/experience-service.ts` — stub for `createExperience`, `updateExperience`, `deleteExperience`
- [X] T013 [P] Create `src/lib/prf/ai-service.ts` — stub for `generateDescriptionDraft`

**Checkpoint**: Foundation ready. `npm test` runs visibility tests (T006) — all pass.

---

## Phase 3: US-3 — View Local Provider Profile (P1) — FR-003

**Goal**: Any actor can view a Provider profile with fields filtered by their visibility role.

**Independent Test**: GET `/api/prf/provider/:id` returns only public fields for Guest, full fields for authenticated Tour Agency.

### Tests — US-3 (write first, see them fail)

- [X] T014 [TEST] [US3] Write `tests/prf/unit/provider-service.test.ts` section "getProviderProfile" — covers: (a) Guest sees only public fields (no contact, no pricing, no verification_status) per BR-004; (b) Tour Agency sees collaboration fields; (c) HDT sees quality_metrics; (d) UBND sees verification_status within assigned village; (e) Provider's own profile shows full editable fields. Verify FAIL.
- [X] T015 [TEST] [US3] Write `tests/prf/integration/provider-routes.test.ts` section "GET /api/prf/provider/:id" — AC1 through AC4 of US-3. Verify FAIL.

### Implementation — US-3

- [X] T016 [US3] Implement `getProviderProfile(providerId, actorSession)` in `src/lib/prf/provider-service.ts` — reads `provider_profiles`, published `provider_profile_versions`, `provider_operating_hours`, `experiences`; applies `filterProviderFields`. Run T014 → PASS.
- [X] T017 [US3] Create `src/app/api/prf/provider/[providerId]/route.ts` — `GET` handler: parse session, call `getProviderProfile`, return filtered result. Run T015 → PASS.
- [X] T018 [US3] Create `src/app/provider/[providerId]/page.tsx` — PRF127 Provider Profile page; fetches from API route; renders public fields for Guest; shows full detail for authenticated actors.

**Checkpoint**: `GET /api/prf/provider/:id` works for all actor types. All T014–T015 tests pass.

---

## Phase 4: US-4 — Manage Provider Profile (P1) — FR-004

**Goal**: A Local Provider can update its own profile; submission triggers verification lifecycle.

**Independent Test**: PATCH saves draft; first complete submission changes status to Pending Verification; major-field change by Verified provider creates new pending version while keeping published version.

### Tests — US-4 (write first, see them fail)

- [X] T019 [TEST] [US4] Extend `tests/prf/unit/provider-service.test.ts` section "updateProviderProfile" — covers: BR-002 (ownership check); BR-006 (incomplete → Draft, complete first save → Pending Verification); BR-007 (Verified provider major change: new version pending, published unchanged); BR-008 (image format/size); BR-018 (major fields: business_name, craft_type, business_registration); BR-021 (operating_hours written to provider_operating_hours, not elsewhere). Verify FAIL.
- [X] T020 [TEST] [US4] Extend `tests/prf/integration/provider-routes.test.ts` section "PATCH /api/prf/provider/:id" — US-4 AC1–AC8. Verify FAIL.

### Implementation — US-4

- [X] T021 [US4] Implement `updateProviderProfile(providerId, actorSession, input)` in `src/lib/prf/provider-service.ts` — handles Draft/Pending Verification state machine (BR-006), major-field detection (BR-018), version insert, `provider_operating_hours` upsert (BR-021), audit_log write. Run T019 → PASS.
- [X] T022 [US4] Add `PATCH` handler to `src/app/api/prf/provider/[providerId]/route.ts` — validate body with `ProviderProfilePatchSchema`, call `updateProviderProfile`. Run T020 → PASS.
- [X] T023 [US4] Create `src/app/provider/[providerId]/edit/page.tsx` — PRF128 Edit Provider Profile form; fields for all FR-004 inputs; AI Refine button (calls FR-007); Save Changes button.

**Checkpoint**: PATCH updates Provider profile. Lifecycle states work. T019–T020 all pass.

---

## Phase 5: US-5 — Manage Experiences (P1) — FR-006

**Goal**: A Local Provider can create, update and delete its own Experiences; business rules for pricing, image categories and booking locks are enforced.

**Independent Test**: Create experience with required image set → saved; attempt without 3-category images → error; delete with active booking → blocked; delete with historical only → archived; locked-field edit during active booking → rejected.

### Tests — US-5 (write first, see them fail)

- [X] T024 [TEST] [US5] Write `tests/prf/unit/experience-service.test.ts` — covers: BR-002 (ownership); BR-009 (3 required image categories); BR-010 (price > 0, capacity > 0, notice >= 0); BR-014 (locked fields list during active booking); BR-015 (last image per category cannot be deleted); BR-019 (delete logic: block/archive/hard-delete); BR-020 (experience edit does not trigger provider re-verification). Verify FAIL.
- [X] T025 [TEST] [US5] Write `tests/prf/integration/experience-routes.test.ts` — POST, PATCH, DELETE for all US-5 acceptance scenarios (AC1–AC9), including boundary values for price and capacity. Verify FAIL.

### Implementation — US-5

- [X] T026 [US5] Implement `createExperience(actorSession, input)` in `src/lib/prf/experience-service.ts` — validate ownership, required images per category (BR-009), numeric bounds (BR-010); insert `experiences` + `experience_discount_rules` + `profile_media`; set `explore_listing_updated` and `matching_data_refreshed` flags. Run T024 create section → PASS.
- [X] T027 [US5] Implement `updateExperience(experienceId, actorSession, input)` — ownership check (BR-002), active-booking locked-field check (BR-014), image category minimum check (BR-015), audit log. Run T024 update section → PASS.
- [X] T028 [US5] Implement `deleteExperience(experienceId, actorSession)` — booking status check (BR-019): block on active, archive on historical, hard-delete on none. Run T024 delete section → PASS.
- [X] T029 [US5] Create `src/app/api/prf/experience/route.ts` (POST) and `src/app/api/prf/experience/[experienceId]/route.ts` (GET, PATCH, DELETE). Run T025 → PASS.
- [X] T030 [P] [US5] Create `src/app/provider/[providerId]/experiences/page.tsx` — EXP067 Experience Management list.
- [X] T031 [P] [US5] Create `src/app/provider/[providerId]/experiences/new/page.tsx` — EXP069 Add Experience form with 3-category image upload.
- [X] T032 [P] [US5] Create `src/app/provider/[providerId]/experiences/[experienceId]/page.tsx` — EXP068 Experience Detail – Owner View with gallery lightbox (BR-016).
- [X] T033 [P] [US5] Create `src/app/provider/[providerId]/experiences/[experienceId]/edit/page.tsx` — EXP070 Edit Experience; locked-field UI when active booking exists.
- [X] T034 [P] [US5] Create `src/app/provider/[providerId]/experiences/[experienceId]/delete/page.tsx` — EXP132 Delete Confirmation with booking-status messaging.

**Checkpoint**: Full Experience CRUD works. All T024–T025 pass.

---

## Phase 6: US-6 — Verify Provider Profile (P1) — FR-005

**Goal**: A UBND Admin can approve or request revision on a Provider profile in its assigned village.

**Independent Test**: Approve sets Verified; Request Revision (with comments) sets Revision Required; cross-village attempt returns 403.

### Tests — US-6 (write first, see them fail)

- [X] T035 [TEST] [US6] Write `tests/prf/unit/provider-service.test.ts` section "reviewProvider" — covers: BR-005 (village scope check); US-6 AC2 (Approve → Verified); US-6 AC3 (Request Revision → Revision Required, comments required); US-6 AC4 (cross-village → denied); US-6 AC5 (UBND read-only, no profile content edit); BR-007 (approve replaces published_version_no when Verified). Verify FAIL.
- [X] T036 [TEST] [US6] Write `tests/prf/integration/provider-routes.test.ts` section "POST /api/prf/provider/:id/verify" — AC1–AC6 of US-6. Verify FAIL.

### Implementation — US-6

- [X] T037 [US6] Implement `reviewProvider(providerId, actorSession, decision, revisionComments)` in `src/lib/prf/provider-service.ts` — village check against `ubnd_village_assignments` (BR-005); insert `provider_verification_reviews`; update `provider_profiles.verification_status` and `published_version_no` on Approve (BR-007). Run T035 → PASS.
- [X] T038 [US6] Create `src/app/api/prf/provider/[providerId]/verify/route.ts` — `POST` handler with `VerifyProviderSchema` validation; requires `revision_comments` when `decision = Request Revision`. Run T036 → PASS.
- [X] T039 [US6] Create `src/app/provider/[providerId]/page.tsx` — add UBND review panel (Approve / Request Revision buttons with comment textarea) visible only to UBND actors. Render via VER146/VER119 screen pattern.

**Checkpoint**: UBND verification flow complete. T035–T036 all pass.

---

## Phase 7: US-1 — Manage Agency Profile (P2) — FR-001, FR-002

**Goal**: A Tour Agency Owner can view and update its own Agency profile; major field changes create an HDT review request without disabling the account.

**Independent Test**: PATCH non-major field → immediate update; PATCH company_name → `requires_hdt_rereview: true`, old name still shown; cross-agency PATCH → 403.

### Tests — US-1 (write first, see them fail)

- [X] T040 [TEST] [US1] Write `tests/prf/unit/agency-service.test.ts` — covers: BR-001 (only owner may edit); BR-004 (visibility filter for GET); BR-017 (company_name / tax_id are major changes → agency_major_change_requests insert, existing data unchanged); US-1 AC3 (cross-agency edit denied); US-1 AC4 (major change → account remains Approved). Verify FAIL.
- [X] T041 [TEST] [US1] Write `tests/prf/integration/agency-routes.test.ts` — GET and PATCH for US-1 AC1–AC4. Verify FAIL.

### Implementation — US-1

- [X] T042 [US1] Implement `getAgencyProfile(agencyId, actorSession)` in `src/lib/prf/agency-service.ts` — reads `agency_profiles`, applies `filterAgencyFields`. Run T040 GET section → PASS.
- [X] T043 [US1] Implement `updateAgencyProfile(agencyId, actorSession, input)` — ownership check (BR-001); major-change detection (BR-017) → insert `agency_major_change_requests`, leave current profile intact; non-major changes update `agency_profiles` immediately; write `audit_logs`. Run T040 PATCH section → PASS.
- [X] T044 [US1] Create `src/app/api/prf/agency/[agencyId]/route.ts` — GET and PATCH handlers. Run T041 → PASS.
- [X] T045 [US1] Create `src/app/api/prf/agency/[agencyId]/major-change/route.ts` — POST internal endpoint for major-change request.
- [X] T046 [US1] Create `src/app/agency/[agencyId]/page.tsx` — PRF019 Agency Profile view.
- [X] T047 [US1] Create `src/app/agency/[agencyId]/edit/page.tsx` — PRF021 Edit Agency Profile form.

**Checkpoint**: Agency profile management works. T040–T041 all pass.

---

## Phase 8: US-2 — View Agency Profile (P2) — FR-001

**Goal**: Any authorized actor or Guest can view permitted Agency fields; restricted information (Tax ID, tour_types) is hidden from non-authorized actors.

**Independent Test**: GET as Guest → no Tax ID; GET as HDT → full detail; GET as another Agency → contact visible, Tax ID not visible.

### Tests — US-2 (write first, see them fail)

- [X] T048 [TEST] [US2] Extend `tests/prf/unit/agency-service.test.ts` section "getAgencyProfile visibility" — US-2 AC1–AC4 for Guest, HDT, UBND, other Agency, own Agency. Verify FAIL.
- [X] T049 [TEST] [US2] Extend `tests/prf/integration/agency-routes.test.ts` section "GET visibility" — AC1–AC4 of US-2. Verify FAIL.

### Implementation — US-2

- [X] T050 [US2] Update `filterAgencyFields` in `src/lib/prf/visibility.ts` — ensure Guest sees only: `agency_name`, `company_type`, `location`, `team_size`; HDT sees full profile; local-provider/UBND sees +contact; owner sees +tax_id, +tour_types. Run T048–T049 → PASS.

**Checkpoint**: Agency profile visibility enforced for all actors. T048–T049 pass.

---

## Phase 9: AI Description Refinement — FR-007 (supporting function)

**Goal**: Local Provider can generate an AI-refined description draft; the draft is never auto-saved.

**Independent Test**: POST returns `refined_description_draft` + `original_description`; exiting without accepting leaves original unchanged; service-unavailable path returns 503.

### Tests — AI Refinement (write first, see them fail)

- [X] T051 [TEST] Write `tests/prf/unit/ai-service.test.ts` — covers: BR-011 (draft preserves factual meaning — verified structurally, not semantically); BR-012 (original_description returned unchanged in response; no database write in this call); BR-013 (Accept/Edit/Regenerate/Discard paths — verified via absence of auto-save code path). Verify FAIL.
- [X] T052 [TEST] Write `tests/prf/integration/ai-routes.test.ts` — POST happy path; missing-field error; OpenAI stub failure → 503. Verify FAIL.

### Implementation — AI Refinement

- [X] T053 Implement `generateDescriptionDraft(input, actorSession)` in `src/lib/prf/ai-service.ts` — calls OpenAI API (stubbed in tests via msw); inserts `ai_description_drafts` row; returns draft + original without modifying any profile/experience row. Run T051 → PASS.
- [X] T054 Create `src/app/api/prf/ai/description/route.ts` — POST handler with `AIDescriptionSchema` validation; 503 on service error. Run T052 → PASS.

**Checkpoint**: AI description route works. Drafts are never auto-saved. T051–T052 pass.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T055 [P] Run `python data/scripts/validate_seed.py` — confirm seed coverage. Fix test seed helpers if any assertion fails (T008).
- [X] T056 [P] Review all API routes for missing `audit_logs` writes — add where absent (FR-002, FR-004, FR-006 each require a change_log_entry).
- [X] T057 [P] Add `tests/prf/unit/validators.test.ts` — boundary-value tests for all Zod schemas (empty string, 0-price, negative capacity, wrong MIME type, overlong description).
- [X] T058 Run full test suite (`npx vitest run`) — all tests green.
- [X] T059 Follow `specs/002-prf-core/quickstart.md` from top on a clean clone — record any step that fails and fix it.
- [X] T060 [P] Update `AGENTS.md` section 2 with real install/seed/test/run commands for PRF if they differ from AIT.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user story phases**
- **Phase 3 (US-3)**: Depends on Phase 2
- **Phase 4 (US-4)**: Depends on Phase 2; builds on provider-service started in Phase 3
- **Phase 5 (US-5)**: Depends on Phase 2; independent of US-3/US-4
- **Phase 6 (US-6)**: Depends on Phase 4 (needs provider versions to exist)
- **Phase 7 (US-1)**: Depends on Phase 2; independent of US-3–US-6
- **Phase 8 (US-2)**: Depends on Phase 7 (US-1 GET route must exist)
- **Phase 9 (AI)**: Depends on Phase 2; can run in parallel with US-3–US-8
- **Phase 10 (Polish)**: Depends on all user story phases

### Parallel opportunities

Once Phase 2 is done, the following can run in parallel:
- US-3 + US-5 (no shared service state)
- US-1 + US-3 + US-5 (different services)
- AI Refinement (Phase 9) alongside any user story phase

---

## Implementation Strategy

### MVP first (Phases 1–3 only)
1. Complete Phases 1 and 2
2. Complete Phase 3 (US-3: View Provider Profile)
3. STOP and validate — `quickstart.md` US-3 demo path works
4. Proceed to Phase 4

### Minimum passing for Session 7 demo
Phases 1–6 = US-3, US-4, US-5, US-6 — all P1 stories. Both Team A and B can demo a
complete Provider-side journey including verification.

---

## Step 3.2 Coverage check

| Criterion | Status |
|-----------|--------|
| Every BR (BR-001…BR-021) has a test task before its code task | ✅ — see T006, T014, T019, T024, T035, T040, T048, T051 |
| Every test task comes before the code task it checks | ✅ — Txx [TEST] always precedes Txx+n [CODE] in each phase |
| Every task names an exact file path | ✅ |
| First user story phase (US-3, Phase 3) can be finished and demonstrated alone | ✅ |
| Seed data test included (T008 — checks values from Session 5 seed) | ✅ |
| Out-of-scope user stories absent | ✅ (no US-7 or beyond) |
