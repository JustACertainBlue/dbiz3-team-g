# Implementation Plan: Admin Dashboard (ADM) — Core Slice

**Branch**: `003-adm-core` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-adm-core/spec.md` (derived from `docs/spec/specs/spec-ADM.md`).

---

## Summary

The Admin Dashboard module (`ADM`) provides Hanoi Department of Tourism (HDT) and Commune People's Committee (UBND) administrators with summarized operational information about Agencies, Local Providers, Bookings, and Agency–Provider collaboration within their authorized data scope. The core interface (Screen `ADM079`) supports role-based monitoring through summary metric cards, interactive status breakdown charts, time-series booking trends, a filterable booking monitoring table, and a ranked list of top collaborating pairs.

The dashboard enforces strict administrative data isolation: HDT Admins view platform-wide metrics with unrestricted village filtering, while UBND Admins are strictly scoped to their assigned village (pre-selected and unchangeable). The system is strictly read-only: no endpoint permits creating, updating, confirming, cancelling, or deleting any operational or profile records (`BR-006`, `BR-013`).

The technical implementation uses a modern fullstack TypeScript web application on Node.js / Next.js 14 (App Router), leveraging seed data loaders and database access adhering to `data/`, with Vitest for test-first automated verification on both macOS and Windows using free tools.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js >= 22.0.0 (Workstation confirmed v24.19.0)

**Framework**: Next.js 14 (App Router)

**Storage**: PostgreSQL (with local SQLite option for zero-config testing; CSV seed loader `src/lib/db/seed-loader.ts` reading `data/seed/`). Canonical schema and seed defined in `data/`.

**Test Runner**: Vitest (Unit, Contract, and Integration test suites)

**Target Platform**: macOS 13+ and Windows 11 with free tools (Node.js runtime / Responsive Web, Screen `ADM079`)

**Project Type**: Fullstack Web Application (Next.js App Router UI Screen `ADM079` + REST API endpoints under `/api/adm/*`)

**Performance Goals**:
- Dashboard metrics query & aggregation < 500ms p95 under local load
- Initial dashboard page load & render < 1.0s

**Constraints**:
- **Strictly Read-Only**: The dashboard is an observational monitoring screen; no endpoint may create, update, or delete any record (`BR-006`, `BR-013`).
- **Server-Side Scope Enforcement**: Scoping rules (`BR-001`, `BR-002`, `BR-003`, `BR-008`, `BR-009`, `BR-010`) are strictly enforced at the API layer; requests from UBND actors cannot bypass their assigned village scope.
- **Strict Test-First Development**: Every business rule (`BR-001` through `BR-019`) has automated unit/integration tests written and failing before implementation code.
- **Zero Secrets & Synthetic Data Only**: No production credentials in code; secrets reside in `.env`; seed data in `data/seed/` is the sole source of truth.
- **Session & Auth Integration**: Production login and cloud deployment are deferred to Session 11. Role, admin subtype (`HDT` or `UBND`), and `assigned_village_id` are supplied via the shared session mechanism (`src/lib/auth/session.ts`), client role switcher (`src/app/components/RoleSwitcher.tsx`), and seed loader (`src/lib/db/seed-loader.ts`).

**Scope of this feature**:
- **In Scope**: User Story `US-1 (P1): View Admin Dashboard — UC-ADM-01` only (covers FR-001 through FR-010, BR-001 through BR-019, screen `ADM079`).
- **Out of Scope (Explicitly excluded by spec section 1)**:
  - Booking lifecycle actions (creating, updating, confirming, cancelling, completing bookings).
  - Editing Agency or Local Provider profile content.
  - User account management and authentication onboarding (AUT module).
  - Verifying Agency registration or Local Provider profiles (PRF/AUT modules).
  - Editing Experience content (PRF module).
  - Entity drill-down detail views (no F-ADMIN-11/12 in MVP).
  - Global system configuration.
  - Explore and AI Matching ranking/scoring analytics.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Constitution Rule | Status | Evidence / Verification |
|---|---|---|---|
| **I. The Spec is the Source of Truth** | Requirements come only from `docs/spec/`. Data structures come only from `data/`. If code and spec disagree, code is wrong. Never invent requirements. | ✅ PASS | Requirements trace 1:1 to `docs/spec/specs/spec-ADM.md` (FR-001..FR-010, BR-001..BR-019). Data structures reference `data/04-data-model.md` and `data/schema.sql`. No fields or operations invented. |
| **II. Business Rules are Test-First (Non-Negotiable)** | Every business rule (`BR-xxx`) and every acceptance scenario gets an automated test written and seen failing before the code that makes it pass. | ✅ PASS | Test suites in `tests/adm/unit/` explicitly test `BR-001` through `BR-019` and edge cases before implementation code is written. |
| **III. Thin Vertical Slices** | Build one user story at a time, end to end (screen, logic, data), in priority order P1, P2, P3. Runs from clean clone with `quickstart.md`. | ✅ PASS | Slice is strictly scoped to `US-1 (P1)` covering screen `ADM079`, aggregation service, API routes, and seed loader. `quickstart.md` verifies clean clone execution on macOS and Windows. |
| **IV. Synthetic Data and No Secrets** | Only seed data in `data/` is used. No real personal data, no API keys or passwords in committed files; secrets live in `.env`. | ✅ PASS | Only synthetic CSV seed data from `data/seed/` is queried. No secrets committed. |
| **V. Humans Approve Every Change** | Agent works on a branch, shows changed files with reasons, never pushes or merges without approval. Teammate reviews PR. | ✅ PASS | All work conducted on feature branch `003-adm-core`. Changes reported with rationale; no git pushes or merges. |

---

## Project Structure

### Documentation (this feature)

```text
specs/003-adm-core/
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0: Technical research and architectural decisions
├── data-model.md        # Phase 1: Tables read by this slice, mapping to data/
├── quickstart.md        # Phase 1: Clean clone setup, test, and run instructions
├── contracts/           # Phase 1: Interface and REST API contracts
│   └── admin-dashboard-api.md # HTTP REST endpoints specification
└── tasks.md             # Phase 2: Actionable tasks (created by /speckit-tasks)
```

### Source Code (repository layout)

```text
src/
├── app/
│   ├── admin/
│   │   └── page.tsx             # Screen ADM079: Admin Dashboard (Cards, Charts, Filters, Lists)
│   ├── api/
│   │   └── adm/
│   │       ├── dashboard/
│   │       │   └── route.ts     # GET /api/adm/dashboard (Scoped aggregation endpoint)
│   │       ├── villages/
│   │       │   └── route.ts     # GET /api/adm/villages (Scoped village options)
│   │       └── filter-options/
│   │           └── route.ts     # GET /api/adm/filter-options (Agency & Provider autocomplete)
│   └── components/
│       ├── RoleSwitcher.tsx     # Role switcher supporting HDT Admin and UBND Admin
│       └── admin/
│           ├── MetricCards.tsx  # Summary cards: Agencies, Providers, Bookings, Collaborations
│           ├── FilterPanel.tsx  # Time preset, village dropdown, agency/provider autocomplete
│           ├── ChartsSection.tsx# Booking status breakdown & Booking trend line
│           ├── BookingTable.tsx # Filtered booking list table (Date, Agency, Provider, Exp, Status, Price)
│           └── TopPairsList.tsx # Top 10 collaborating Agency–Provider pairs (Frequency/Recency)
├── lib/
│   ├── adm/
│   │   ├── metrics-service.ts   # Core aggregation engine for all 10 FRs
│   │   ├── scope-guard.ts       # Server-side authorization & village isolation enforcement
│   │   └── trend-calculator.ts  # Granularity derivation (BR-019) & comparison periods (BR-003, BR-011)
│   ├── auth/
│   │   └── session.ts           # Reused session context definition
│   └── db/
│       └── seed-loader.ts       # Seed CSV loader loading villages, accounts, bookings, agencies, providers
tests/
└── adm/
    ├── unit/
    │   ├── scope-guard.test.ts     # BR-001, BR-002, BR-003, BR-008, BR-009, BR-010
    │   ├── metrics-service.test.ts # FR-002, FR-007, FR-008, FR-009, FR-010, BR-014..BR-018
    │   └── trend-calculator.test.ts# BR-003, BR-011, BR-019
    ├── contract/
    │   └── admin-api.test.ts       # HTTP REST API contract assertions for /api/adm/*
    └── integration/
        └── dashboard-flow.test.ts  # End-to-end dashboard load & role-switching verification
```

**Structure Decision**: Integrated fullstack Next.js application matching the project structure established in `001-ait-core` and `002-prf-core`, placing screen `ADM079` UI in `src/app/admin/page.tsx`, domain aggregation and scope validation in `src/lib/adm/`, and test-first test suites in `tests/adm/`.

---

## Complexity Tracking

| Item / Decision | Need | Simpler Alternative Rejected Because |
|---|---|---|
| **Mock Session via Header / RoleSwitcher** | Deferred Login UI to Session 11 | Full OAuth / JWT login UI is out of scope until Session 11. Reusing `RoleSwitcher` and `x-mock-session` allows instant testing of both HDT and UBND operational views without authentication blockers. |
| **Server-Side Scope Guard** | Enforce administrative boundary (BR-002, BR-010) | Client-side filtering alone allows unauthorized cross-village data leakage via direct API calls or tampered query parameters. |
| **In-Memory Seed Aggregator for Local Testing** | Zero-config instant local execution | Heavy OLAP cubes or background aggregation workers add significant operational overhead and fail the zero-config requirement on macOS/Windows workstations. |
| **Strict Read-Only Architecture** | Enforce BR-006 & BR-013 | No POST/PUT/PATCH/DELETE endpoints are implemented under `/api/adm/*`, preventing any accidental state modification from the monitoring screen. |
