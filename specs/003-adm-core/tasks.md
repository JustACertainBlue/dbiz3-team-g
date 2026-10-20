# Tasks: Admin Dashboard (ADM) — Core Slice

**Feature**: Admin Dashboard (Slice `003-adm-core`)  
**Input**: [spec.md](spec.md), [plan.md](plan.md), [data-model.md](data-model.md), [contracts/admin-dashboard-api.md](contracts/admin-dashboard-api.md), [quickstart.md](quickstart.md)  
**Governance**: Constitution Principle II (Test-First Non-Negotiable) — every business rule and acceptance scenario has an automated test task that comes **before** the code task it checks.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffolding directories, shared admin TypeScript types, and test mock session helpers.

- [X] T001 Create directory structure: `src/app/admin/`, `src/app/api/adm/dashboard/`, `src/app/api/adm/villages/`, `src/app/api/adm/filter-options/`, `src/lib/adm/`, `src/app/components/admin/`, `tests/adm/unit/`, `tests/adm/contract/`, `tests/adm/integration/`, `tests/adm/seed/`
- [X] T002 [P] Create admin dashboard types and interfaces in `src/lib/adm/types.ts` matching spec section 5.1 and `contracts/admin-dashboard-api.md`
- [X] T003 [P] Configure admin mock session helpers in `tests/adm/helpers/mock-session.ts` (supporting HDT Admin and UBND Admin with assigned village)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data seed verification, server-side administrative scope guard, and trend calculation engine.

**⚠️ CRITICAL**: No user story implementation can begin until this foundational phase is complete.

- [X] T004 [P] Test: Canonical seed data package verification in `tests/adm/seed/adm-seed.test.ts` (loads `data/seed/` and validates 8 craft villages in `villages.csv`, booking canonical statuses `On hold`, `Booked`, `Completed`, `Cancelled`, and baseline booking totals from Session 5 data package)
- [X] T005 Implement Seed catalog loader extensions for bookings, agencies, and providers in `src/lib/db/seed-loader.ts` (satisfies T004)
- [X] T006 [P] Test: Server-side administrative scope guard and village isolation in `tests/adm/unit/scope-guard.test.ts` (verifies BR-001, BR-002, BR-003, BR-004, AC-ADM-SCOPE)
- [X] T007 [P] Implement server-side scope guard in `src/lib/adm/scope-guard.ts` (satisfies T006; forces assigned_village_id for UBND, permits all or selected village for HDT)
- [X] T008 [P] Test: Time filter and trend granularity calculator in `tests/adm/unit/trend-calculator.test.ts` (verifies BR-003, BR-011, BR-019)
- [X] T009 [P] Implement trend calculator and date range derivation in `src/lib/adm/trend-calculator.ts` (satisfies T008; 1–31d daily, 32–180d weekly, >180d monthly, previous period comparison)

**Checkpoint**: Foundation ready — scope enforcement, seed loading, and trend calculation verified with passing tests.

---

## Phase 3: User Story 1 - View Admin Dashboard (Priority: P1) 🎯 MVP

**Goal**: As an HDT or UBND Admin, view operational metrics, metric cards, breakdown charts, booking monitoring list, and top collaboration pairs within my permitted administrative scope without lifecycle control or profile edit capabilities (Screen `ADM079`, `UC-ADM-01`).  
**Independent Test**: Run `npx vitest run tests/adm/integration/dashboard-flow.test.ts` to verify end-to-end dashboard data retrieval, role scoping, filter application, and read-only monitoring.

### Group 1: Summary Metric Cards & Scoped Aggregation Service
*Covers: FR-001, FR-002, FR-003, FR-004, FR-005, BR-001, BR-002, BR-003, BR-004, BR-005, BR-011, BR-017, Scenario 4, Scenario 5, AC-ADM-SCOPE, AC-ADM-PAIR*

- [X] T010 [P] [US1] Test: Summary metric cards calculation (Total Agencies, Providers, Bookings, Active Collaborations) in `tests/adm/unit/metric-cards.test.ts` (checks FR-001, FR-002, FR-003, BR-001, BR-002, BR-011, BR-017, AC-ADM-PAIR)
- [X] T011 [US1] Implement summary metric cards aggregator in `src/lib/adm/metrics-service.ts` (satisfies T010)
- [X] T012 [P] [US1] Test: Time period preset and village filter application in `tests/adm/unit/filter-metrics.test.ts` (checks FR-004, FR-005, BR-004, BR-005, Scenario 4, Scenario 5, AC-ADM-SCOPE)
- [X] T013 [US1] Implement filter handling and scoped query aggregation in `src/lib/adm/metrics-service.ts` (satisfies T012)

### Group 2: Agency & Provider Metrics and Activity Distribution
*Covers: FR-007, FR-008, BR-008, BR-009, BR-015, BR-016, Scenario 7, Scenario 8*

- [X] T014 [P] [US1] Test: Agency account status breakdown and active agency count in `tests/adm/unit/agency-metrics.test.ts` (checks FR-007, BR-008, BR-015, Scenario 7)
- [X] T015 [P] [US1] Test: Provider status matrix by village, craft type distribution, and active provider count in `tests/adm/unit/provider-metrics.test.ts` (checks FR-008, BR-009, BR-016, Scenario 8)
- [X] T016 [US1] Implement Agency status and activity distribution calculation in `src/lib/adm/metrics-service.ts` (satisfies T014)
- [X] T017 [US1] Implement Provider status matrix and craft/activity distribution calculation in `src/lib/adm/metrics-service.ts` (satisfies T015)

### Group 3: Booking Metrics, Trend Charts & Monitoring Table
*Covers: FR-006, FR-009, BR-005, BR-006, BR-007, BR-010, BR-013, BR-014, BR-019, Scenario 6, Scenario 9, Scenario 11, AC-ADM-FILTER*

- [X] T018 [P] [US1] Test: Booking status breakdown and time-series trend line in `tests/adm/unit/booking-metrics.test.ts` (checks FR-009, BR-007, BR-010, BR-019, Scenario 9)
- [X] T019 [P] [US1] Test: Booking monitoring table filtering by Agency, Provider, and combined AND intersection in `tests/adm/unit/booking-table.test.ts` (checks FR-006, FR-009, BR-006, BR-013, BR-014, Scenario 6, Scenario 11, AC-ADM-FILTER)
- [X] T020 [US1] Implement booking status aggregation and trend series generation in `src/lib/adm/metrics-service.ts` (satisfies T018)
- [X] T021 [US1] Implement booking monitoring table filtering and price/date formatting in `src/lib/adm/metrics-service.ts` (satisfies T019)

### Group 4: Agency–Provider Collaboration Ranking
*Covers: FR-006, FR-010, BR-010, BR-014, BR-018, Scenario 10, AC-ADM-PAIR, AC-ADM-FILTER*

- [X] T022 [P] [US1] Test: Top 10 collaboration pairs ranking by Frequency and Recency (excluding On hold and Cancelled) in `tests/adm/unit/collaboration-metrics.test.ts` (checks FR-010, BR-010, BR-018, Scenario 10, AC-ADM-PAIR)
- [X] T023 [US1] Implement top 10 collaboration ranking algorithm with Frequency and Recency sorting in `src/lib/adm/metrics-service.ts` (satisfies T022)

### Group 5: REST API Endpoints & Contract Verification
*Covers: FR-001..FR-010, BR-001..BR-007, BR-010..BR-019, AC-ADM-SCOPE*

- [X] T024 [P] [US1] Test: Contract test for GET /api/adm/dashboard in `tests/adm/contract/dashboard-api.test.ts` (checks `contracts/admin-dashboard-api.md`, FR-001..FR-010, BR-001..BR-007, BR-010..BR-019, AC-ADM-SCOPE)
- [X] T025 [P] [US1] Test: Contract test for GET /api/adm/villages and GET /api/adm/filter-options in `tests/adm/contract/villages-filter-api.test.ts` (checks `contracts/admin-dashboard-api.md`, FR-005, FR-006, BR-002, BR-003, BR-008, BR-009)
- [X] T026 [US1] Implement GET /api/adm/dashboard route handler in `src/app/api/adm/dashboard/route.ts` (satisfies T024)
- [X] T027 [US1] Implement GET /api/adm/villages route handler in `src/app/api/adm/villages/route.ts` (satisfies T025)
- [X] T028 [US1] Implement GET /api/adm/filter-options route handler in `src/app/api/adm/filter-options/route.ts` (satisfies T025)

### Group 6: Screen ADM079 UI Component Acceptance Tests & Implementation
*Covers: Screen ADM079, UC-ADM-01, Acceptance Scenarios 1..11, BR-003, BR-004, BR-005, BR-006, BR-012, BR-013, BR-014, AC-ADM-SCOPE, AC-ADM-FILTER*

> **CRITICAL (Principle II)**: UI acceptance tests T029, T030, and T031 MUST be written and verified to FAIL before implementing UI components and page assembly T032–T038.

- [X] T029 [P] [US1] Test: Dashboard role-based scope and layout acceptance test in `tests/adm/integration/dashboard-scope.test.ts` (verifies Scenario 1, Scenario 2, Scenario 3, Scenario 11, AC-ADM-SCOPE before UI implementation)
- [X] T030 [P] [US1] Test: Filter panel component interactions and village lock acceptance test in `tests/adm/unit/filter-panel.test.ts` (verifies Scenario 3, Scenario 4, Scenario 5, Scenario 6, BR-003, BR-004, BR-005, BR-014, AC-ADM-FILTER before UI implementation)
- [X] T031 [P] [US1] Test: Dashboard cards, charts, read-only table, and top pairs UI presentation acceptance test in `tests/adm/unit/ui-components.test.ts` (verifies Scenario 7, Scenario 8, Scenario 9, Scenario 10, Scenario 11, BR-006, BR-012, BR-013 before UI implementation)
- [X] T032 [P] [US1] Implement summary metric cards component in `src/app/components/admin/MetricCards.tsx` (displays Total Agencies, Providers, Bookings, Active Collaborations with trend percentage; satisfies T031)
- [X] T033 [P] [US1] Implement filter panel component in `src/app/components/admin/FilterPanel.tsx` (handles preset periods, custom date picker, village selector with locked state for UBND, and agency/provider autocomplete; satisfies T030)
- [X] T034 [P] [US1] Implement charts section component in `src/app/components/admin/ChartsSection.tsx` (displays booking status breakdown and time-series booking trend line; satisfies T031)
- [X] T035 [P] [US1] Implement booking monitoring table component in `src/app/components/admin/BookingTable.tsx` (read-only sortable columns: Date, Agency, Provider, Experience, Status, Price per BR-006/BR-012/BR-013; satisfies T031)
- [X] T036 [P] [US1] Implement top collaboration pairs component in `src/app/components/admin/TopPairsList.tsx` (ranked list of top 10 pairs with Frequency/Recency toggle; satisfies T031)
- [X] T037 [US1] Update RoleSwitcher banner in `src/app/components/RoleSwitcher.tsx` to include HDT Admin and UBND Admin personas with links to `/admin` (satisfies T029)
- [X] T038 [US1] Assemble Screen ADM079 page in `src/app/admin/page.tsx` (integrates FilterPanel, MetricCards, ChartsSection, BookingTable, TopPairsList, connecting to `/api/adm/*`; satisfies T029)
- [X] T039 [US1] Test: End-to-end integration test of full Screen ADM079 user journey and filter reactivity in `tests/adm/integration/dashboard-flow.test.ts` (verifies end-to-end pass across all acceptance scenarios 1..11, AC-ADM-SCOPE, AC-ADM-PAIR, AC-ADM-FILTER)

**Checkpoint**: User Story 1 complete — full Admin Dashboard functional, strictly scoped on server side, read-only, passing all unit, contract, and integration test suites.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: System-wide test suite execution, quickstart validation, and code hygiene.

- [X] T040 [P] Run full automated test suite with `npx vitest run tests/adm/` and ensure all tests pass
- [X] T041 [P] Validate `quickstart.md` execution flow on macOS and Windows clean clone environments
- [X] T042 Run TypeScript type verification (`npm run lint`) and clean up any unused imports or variables

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS User Story 1.
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion.
- **Polish (Phase 4)**: Depends on User Story 1 completion.

### Within User Story 1

1. **Test-First Order**: Every test task (`T010`, `T012`, `T014`, `T015`, `T018`, `T019`, `T022`, `T024`, `T025`, `T029`, `T030`, `T031`, `T039`) MUST be written and seen failing before the corresponding implementation code.
2. **Domain Service before API Routes**: `metrics-service.ts` implementation precedes route handlers (`/api/adm/*`).
3. **API Routes before UI Page**: Backend API endpoints precede `src/app/admin/page.tsx`.
4. **UI Acceptance Tests before UI Components**: `T029`, `T030`, `T031` precede `MetricCards.tsx`, `FilterPanel.tsx`, `ChartsSection.tsx`, `BookingTable.tsx`, `TopPairsList.tsx`, `RoleSwitcher.tsx`, and `src/app/admin/page.tsx`.

---

## Parallel Execution Opportunities

- **Phase 1**: `T002` (types) and `T003` (mock session) can execute in parallel.
- **Phase 2**: `T004` (seed test), `T006` (scope guard test), and `T008` (trend calculator test) can run in parallel.
- **Phase 3 (Unit Tests)**:
  - Unit test tasks `T010`, `T012`, `T014`, `T015`, `T018`, `T019`, `T022` can be written in parallel.
  - Contract test tasks `T024` and `T025` can run in parallel.
- **Phase 3 (UI Acceptance Tests & Components)**:
  - UI acceptance test tasks `T029`, `T030`, `T031` can run in parallel.
  - UI components `T032`, `T033`, `T034`, `T035`, `T036` can be developed in parallel once their respective acceptance tests are established.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`T001`..`T003`)
2. Complete Phase 2: Foundational (`T004`..`T009`) — **CRITICAL**: verify seed data and scope guard tests pass.
3. Complete Phase 3: User Story 1 (`T010`..`T039`) — test-first across metrics, routes, UI acceptance tests, components, and page assembly.
4. Complete Phase 4: Polish & Validation (`T040`..`T042`).
5. **STOP and VALIDATE**: Follow `quickstart.md` to switch between `🏛️ HDT Admin` and `🏛️ UBND Admin` and verify that village isolation and read-only monitoring hold true.
