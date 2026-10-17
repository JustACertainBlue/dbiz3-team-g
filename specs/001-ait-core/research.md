# Technical Research: AI Tour Matching (AIT)

## Overview
This document records technical decisions and architectural resolutions for module `AIT (AI Tour Matching)` according to the project constitution and `docs/spec/specs/spec-AIT.md`.

---

### Decision 1: Application Architecture & Technology Stack
- **Decision**: Fullstack TypeScript application using **Next.js (App Router) + Node.js** backed by **PostgreSQL** and validated with **Vitest**.
- **Rationale**:
  - Aligns with the system architecture in `docs/spec/docs/architecture/system configuration.md` specifying React/Next.js Web UI for Presentation Tier and Node.js for the Backend Logic Tier.
  - Consolidates UI (Screen `AIT121`) and REST API endpoints in a unified type-safe codebase, simplifying end-to-end slice delivery (Constitution Principle III).
  - Vitest provides sub-second execution for test-first business rule verification (Constitution Principle II).
- **Alternatives considered**:
  - *Python / FastAPI backend + React Vite frontend*: Good for AI scripting, but introduces multi-repo / dual-runtime complexity for a small cross-functional team, conflicting with Principle III.
  - *Pure Next.js Server Actions*: Rejected because external clients and integration tests need clean HTTP REST contracts (`/contracts/`).

---

### Decision 2: AI Intent Extraction & Clarification Engine (FR-003, FR-004)
- **Decision**: Structured Outputs with OpenAI API (`gpt-4o-mini` or equivalent JSON-schema constrained model) with deterministic fallback handling.
- **Rationale**:
  - `F-MATCH-03` requires extracting `tour_context` containing 12 domain attributes (tour purpose, group size, date range, route, intensity, etc.) and identifying whether critical fields (`group_size`, `target_date_or_range`, `origin_or_route`, and experience preferences) are complete.
  - OpenAI Structured Outputs guarantee schema compliance matching `data/schema.sql` JSONB schemas.
  - In accordance with `BR-017` and `AC-AIT-FAIL`, if the AI service times out or fails, the system returns `Temporary AI Failure` with a retry option without fabricating hallucinated matches.
- **Alternatives considered**:
  - *Regex/keyword parser*: Too brittle for Vietnamese natural language descriptions of tours.
  - *LangChain/LlamaIndex*: Unnecessary abstraction layer and dependency overhead for simple single-prompt extraction.

---

### Decision 3: Route & Distance Calculation (FR-006)
- **Decision**: Google Maps Distance Matrix API with cached pairwise village/district distances.
- **Rationale**:
  - `F-MATCH-06` requires calculating travel distance and time from tour origin to candidate craft villages in Hanoi (e.g. Bat Trang, Van Phuc, Chuong, Quat Dong, Phu Vinh).
  - Seed catalog contains deterministic lat/long coordinates for craft villages in Hanoi. Caching distances between Hanoi center and villages eliminates external API latency and quota consumption during automated test runs.
- **Alternatives considered**:
  - *Haversine straight-line distance*: Fails business requirements because river crossings and road networks in suburban Hanoi deviate significantly from straight lines.

---

### Decision 4: Ranking & Scoring Algorithm (FR-007, FR-008)
- **Decision**: Two-stage deterministic pipeline:
  1. **Hard Constraint Filter**: Candidate experiences must belong to Verified Local Providers (`BR-003`), meet group capacity ($max\_participants \ge group\_size$), stay within max budget, and match target dates.
  2. **Multi-Factor Weighted Scoring (0–100)**: Normalized sum of:
     - Experience Fit Score (craft category alignment, duration match) (Weight: 40%)
     - Route & Location Convenience (travel time score) (Weight: 25%)
     - Inferred / Historical Agency Preferences (Weight: 20%)
     - Provider Quality / Distinctiveness Assessment (Weight: 15%)
  - Threshold check: Default score threshold $\ge 60/100$ (`BR-020`). If no candidates meet 60, triggers `FR-012` criteria relaxation suggestions.
- **Rationale**:
  - Guarantees deterministic, reproducible ranking matching test-first assertions.
  - Ensures Top 5 recommendations (`top_matches`) have explicit human-readable explanations (`BR-007`).

---

### Decision 5: Commercial Context & Hand-off (FR-011)
- **Decision**:
  - Request Quote creates or reuses exactly one `quote_requests` record per `(agency_id, experience_id)` pair (`BR-018`).
  - Active Chat is scoped per `(agency_id, provider_id)` pair (`BR-019`).
  - **No Booking is ever created** during AI Tour Matching (`BR-009`, `BR-010`).
- **Rationale**:
  - Prevents race conditions and duplicate conversations while maintaining strict modular separation between Matching and Booking/Schedule.

---

### Decision 6: Historical Time Decay Model (FR-015, FR-016)
- **Decision**: Exponential half-life decay function:
  $$effective\_weight = base\_weight \times 0.5^{(\Delta t / 30)}$$
  where $\Delta t$ is elapsed days since `captured_at`.
- **Rationale**:
  - Directly implements `BR-021` and `F-MATCH-15` without arbitrary step boundaries.
  - Runs in scheduled background batch or on-demand prior to re-ranking Agency Explore feeds (`BR-022`).
