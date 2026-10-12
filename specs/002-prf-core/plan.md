# Implementation Plan: Profile Management (PRF) — Core Slice

**Branch**: `002-prf-core` | **Date**: 2026-10-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-prf-core/spec.md`

## Summary

The Profile Management module (PRF) enables Tour Agencies and Local Providers to maintain
their business profiles, while UBND Admins verify Provider profiles and Local Providers
manage their Experiences. The slice covers all six user stories (US-1 through US-6) — every
FR in spec-PRF.md — including AI-assisted description refinement (FR-007).

Technical approach: Next.js 15 App Router (TypeScript 5.x) for the UI and API routes,
PostgreSQL (with SQLite via Drizzle ORM for zero-config local testing), and Vitest for all
automated tests. Image uploads go through Cloudinary. AI description refinement calls the
OpenAI API; both are stubbed in tests.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js >= 22.0.0

**Primary Dependencies**:
- Next.js 15 (App Router)
- Drizzle ORM (PostgreSQL adapter; `better-sqlite3` adapter for local SQLite testing)
- Cloudinary Node SDK (`cloudinary` npm package) — image upload/optimize
- OpenAI Node SDK (`openai` npm package) — AI description refinement (FR-007)
- Zod — runtime validation for all API inputs
- `jose` — JWT session token verification (delegates to AUT module)

**Storage**: PostgreSQL (production); SQLite via Drizzle (`better-sqlite3`) for zero-config
local development and CI. The data model in `data/` is the source of truth; no migrations
that alter `data/schema.sql` entities are created by this slice.

**Testing**: Vitest (unit + integration); `@testing-library/react` for component tests.
HTTP-layer tests use `msw` (Mock Service Worker) to stub Cloudinary and OpenAI.

**Target Platform**: macOS 13+ and Windows 11 (development); Linux (CI/deployment — out of scope until Session 11)

**Project Type**: Web application — Next.js App Router with collocated API routes

**Performance Goals**: API routes must respond within 500 ms p95 under local load. Image validation is synchronous; Cloudinary upload is asynchronous.

**Constraints**:
- Must run from a fresh clone with `npm install` + seed load + `npm run dev` on macOS and Windows
- No secrets in committed files — Cloudinary and OpenAI credentials live in `.env`
- Login/auth out of scope until Session 11; tests mock the authenticated user session
- Seed data from `data/` must not be altered

**Scale/Scope**: MVP — 6 user stories; ~15 API routes; ~10 page components; ~30 test files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Assessment | Reason |
|-----------|-----------|--------|
| **I. Spec is Source of Truth** | PASS | All entities and attributes come from `data/04-data-model.md` and `spec.md`. No fields are invented. Five naming mismatches (e.g. `agency_name` vs `company_name`) are resolved as API-layer mappings only — `data/` is unchanged. |
| **II. Business Rules are Test-First** | PASS | tasks.md will require a test task for every BR-001 through BR-021 and every acceptance scenario before the corresponding code task. |
| **III. Thin Vertical Slices** | PASS | Six user stories are all P1/P2 per the spec. We build US-3, US-4, US-5, US-6 (all P1) first, then US-1 and US-2 (P2). Each story produces a runnable vertical slice. |
| **IV. Synthetic Data and No Secrets** | PASS | Only `data/seed/` data is used in tests. Cloudinary and OpenAI keys go in `.env` (git-ignored). |
| **V. Humans Approve Every Change** | PASS | Agent works on `002-prf-core`; driver pushes branch; PR reviewed before merge. |

No gate violations.

## Complexity Tracking

| Item | Decision | Note |
|------|----------|------|
| Cloudinary dependency | Required by BR-008 (image format/size rules) and spec dependency list | No free alternative matches spec requirement; mocked in tests |
| OpenAI dependency | Required by FR-007 / BR-011 / BR-012 / BR-013 | Mocked in tests; feature gracefully degrades when key absent |
| Drizzle dual-adapter (PG + SQLite) | Allows zero-config local testing without a running Postgres | Same schema files; no extra migrations |

## Project Structure

### Documentation (this feature)

```text
specs/002-prf-core/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── agency-profile.md
│   ├── provider-profile.md
│   ├── experience.md
│   └── ai-description.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   └── prf/
│   │       ├── agency/[agencyId]/
│   │       │   ├── route.ts                  # GET (FR-001), PATCH (FR-002)
│   │       │   └── major-change/
│   │       │       └── route.ts              # POST major-change request (FR-002)
│   │       ├── provider/[providerId]/
│   │       │   ├── route.ts                  # GET (FR-003), PATCH (FR-004)
│   │       │   └── verify/
│   │       │       └── route.ts              # POST (FR-005)
│   │       ├── experience/
│   │       │   ├── route.ts                  # POST create (FR-006)
│   │       │   └── [experienceId]/
│   │       │       └── route.ts              # GET, PATCH, DELETE (FR-006)
│   │       └── ai/description/
│   │           └── route.ts                  # POST (FR-007)
│   ├── agency/[agencyId]/
│   │   ├── page.tsx                          # PRF019 Agency Profile view
│   │   └── edit/page.tsx                     # PRF021 Edit Agency Profile
│   └── provider/[providerId]/
│       ├── page.tsx                          # PRF127 Provider Profile view
│       ├── edit/page.tsx                     # PRF128 Edit Provider Profile
│       └── experiences/
│           ├── page.tsx                      # EXP067 Experience Management
│           ├── [experienceId]/
│           │   ├── page.tsx                  # EXP068 Experience Detail – Owner
│           │   ├── edit/page.tsx             # EXP070 Edit Experience
│           │   └── delete/page.tsx           # EXP132 Delete Confirmation
│           └── new/page.tsx                  # EXP069 Add Experience
├── lib/
│   └── prf/
│       ├── agency-service.ts                 # FR-001, FR-002
│       ├── provider-service.ts               # FR-003, FR-004, FR-005
│       ├── experience-service.ts             # FR-006
│       ├── ai-service.ts                     # FR-007
│       ├── visibility.ts                     # Actor visibility rules (BR-004)
│       └── validators.ts                     # Zod schemas for all inputs
└── db/
    └── schema/
        └── prf.ts                            # Drizzle table refs for PRF tables

tests/
└── prf/
    ├── unit/
    │   ├── agency-service.test.ts
    │   ├── provider-service.test.ts
    │   ├── experience-service.test.ts
    │   ├── ai-service.test.ts
    │   └── visibility.test.ts
    ├── integration/
    │   ├── agency-routes.test.ts
    │   ├── provider-routes.test.ts
    │   ├── experience-routes.test.ts
    │   └── ai-routes.test.ts
    └── seed/
        └── prf-seed.test.ts                  # Seed smoke-test (BR-006, BR-007)
```

**Structure Decision**: Single Next.js project (existing repo). PRF API routes are
colocated under `src/app/api/prf/`, matching the existing `src/app/api/ait/` pattern.
All PRF business logic lives in `src/lib/prf/`. Tests live in `tests/prf/`.
