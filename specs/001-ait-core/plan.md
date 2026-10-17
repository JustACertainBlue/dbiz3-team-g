# Implementation Plan: 001-ait-core (AI Tour Matching)

**Branch**: `001-ait-core` | **Date**: 2026-10-07 | **Spec**: [specs/001-ait-core/spec.md](spec.md)

**Input**: Feature specification from `specs/001-ait-core/spec.md` (derived from `docs/spec/specs/spec-AIT.md`).

---

## Summary

The AI Tour Matching module (`AIT`) provides an interactive natural-language matching interface (Screen `AIT121`) for authenticated Tour Agencies to discover, evaluate, and receive ranked recommendations of verified Hanoi craft village experiences. It analyzes group requirements, asks clarification questions when critical context is missing, enforces hard feasibility constraints (capacity, date, budget, route), scores and ranks verified candidate experiences with clear explanations, enables pre-booking commercial hand-off (Request Quote / Chat), and continuously learns Agency preferences through time-decayed interaction signals.

The technical implementation uses a modern fullstack TypeScript web application on Node.js / Next.js with PostgreSQL storage, OpenAI structured outputs for natural-language extraction, Google Maps API for route convenience evaluation, and Vitest for test-first automated verification.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js >= 22.0.0 (Workstation confirmed v24.19.0)

**Framework**: Next.js (App Router)

**Storage**: PostgreSQL (with local SQLite option for zero-config automated testing)

**Test Runner**: Vitest

**Target Platform**: Node.js runtime / Responsive Web (Screen `AIT121` on macOS and Windows with free tools)

**Project Type**: Web application (Fullstack: Web UI Screen AIT121 + REST API endpoints)

**Performance Goals**: Intent extraction & constraint validation < 2.5s p95; candidate scoring & ranking < 500ms

**Constraints**:
- Strict test-first development: every business rule (`BR-001` through `BR-022`) has an automated test written and failing before implementation code.
- Zero secrets committed in source code; all API keys and credentials reside in git-ignored `.env`.
- Synthetic data only: verified against canonical data package in `data/seed/`.
- No booking creation: Request Quote creates a quote record and chat context; never creates a Booking (`BR-009`, `BR-010`).

**Scope of this feature**:
- **In Scope**: User Story `US-1 (P1): AI Tour Matching — UC-DIS-05` only.
- **Out of Scope (Explicitly excluded)**:
  - User Story `US-2 (P2)` or any secondary stories.
  - Production Login & Auth UI (deferred to Session 11; authenticated Tour Agency context is simulated via session header / test mock).
  - Cloud Production Deployment (deferred to Session 11; runs locally on dev server).
  - Guest booking and guest explore flows (belongs to EXP / BKG modules).
  - Provider profile verification lifecycle (belongs to PRF / ADM modules).
  - Post-negotiation booking creation and payment (belongs to BKG module).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Constitution Rule | Status | Evidence / Verification |
|---|---|---|---|
| **I. The Spec is the Source of Truth** | Requirements come only from `docs/spec/`. Data structures come only from `data/`. If code and spec disagree, code is wrong. Never invent requirements. | ✅ PASS | Data entities map 1:1 to `data/schema.sql` and `data/04-data-model.md`. Feature requirements trace strictly to `F-MATCH-01` through `F-MATCH-16` without added requirements. |
| **II. Business Rules are Test-First (Non-Negotiable)** | Every business rule (`BR-xxx`) and every acceptance scenario gets an automated test written and seen failing before the code that makes it pass. | ✅ PASS | Test tasks and test suites documented in `quickstart.md` cover all rules `BR-001` through `BR-022`. Red-green lifecycle enforced. |
| **III. Thin Vertical Slices** | Build one user story at a time, end to end (screen, logic, data), in priority order P1, P2, P3. Runs from clean clone with `quickstart.md`. | ✅ PASS | Slice is strictly scoped to `US-1 (P1)` covering screen `AIT121`, matching logic engine, and database persistence. `quickstart.md` provides exact clean-clone setup. |
| **IV. Synthetic Data and No Secrets** | Only seed data in `data/` is used. No real personal data, no API keys or passwords in committed files; secrets live in `.env`. | ✅ PASS | Seed data verified via `data/scripts/validate_seed.py`. `.env` is git-ignored and only dummy mock keys used in repository templates. |
| **V. Humans Approve Every Change** | Agent works on a branch, shows changed files with reasons, never pushes or merges without approval. Teammate reviews PR. | ✅ PASS | All work created on branch `001-ait-core`. No direct pushes to main. PR workflow enforced. |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-ait-core/
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0: Technical research and architecture decisions
├── data-model.md        # Phase 1: Entity definitions, table mappings to data/
├── quickstart.md        # Phase 1: Clean clone setup, test, and run instructions
├── contracts/           # Phase 1: Interface and REST API contracts
│   └── matching-api.md  # HTTP REST endpoints specification
└── tasks.md             # Phase 2: Actionable tasks (created by /speckit-tasks)
```

### Source Code (repository layout)

```text
src/
├── app/
│   ├── api/ait/                 # API route handlers
│   │   ├── sessions/route.ts    # POST /api/ait/sessions
│   │   ├── messages/route.ts    # POST /api/ait/sessions/:id/messages
│   │   ├── quote/route.ts       # POST /api/ait/sessions/:id/quote
│   │   ├── chat/route.ts        # POST /api/ait/sessions/:id/chat
│   │   ├── preferences/route.ts # GET /api/ait/preferences/:agencyId
│   │   └── decay/route.ts       # POST /api/ait/decay
│   └── ai-matching/             # Screen AIT121 UI
│       └── page.tsx             # Interactive Tour Matching conversational UI
├── lib/
│   ├── ai/                      # OpenAI intent extraction & clarification
│   ├── matching/                # Scoring, hard constraints & candidate ranking
│   ├── maps/                    # Route & distance calculation service
│   ├── db/                      # Database client adhering to data/schema.sql
│   └── decay/                   # Exponential time-decay calculation (30-day half-life)
tests/
├── contract/                    # HTTP REST API contract assertions
│   └── ait-api.test.ts
├── unit/                        # Business rule verification (BR-001 .. BR-022)
│   ├── matching-rules.test.ts
│   └── time-decay.test.ts
└── integration/                 # End-to-end matching journey tests
    └── ait-flow.test.ts
```

**Structure Decision**: Integrated fullstack Next.js application with modular domain logic in `src/lib/`, screen AIT121 UI in `src/app/ai-matching/page.tsx`, and comprehensive test suites in `tests/`.

---

## Complexity Tracking

| Item / FR | Need | Simpler Alternative Rejected Because |
|---|---|---|
| **Login & Auth UI (FR-001)** | Deferred to Session 11 | Simulated via mock session header to allow end-to-end testing of AIT slice without waiting for full auth service deployment. |
| **Cloud Deployment** | Deferred to Session 11 | Local development server (`npm run dev`) satisfies all MVP Alpha demonstration requirements with zero hosting cost. |
| **Distance Matrix Cache** | Avoid external rate limits | In-memory/local coordinate table provides instant deterministic travel time calculation for Hanoi craft villages during test suites. |
| **OpenAI Structured Outputs** | Guarantees schema adherence | Free-form prompting requires fragile JSON parsing and causes intermittent test failures. |
