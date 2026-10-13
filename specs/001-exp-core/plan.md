# Implementation Plan: EXP Explore core browse

**Branch**: `001-exp-core` | **Date**: 2026-10-13 | **Spec**: [snapshot](spec.md), from `docs/spec/specs/spec-EXP.md`

## Summary

Build the first P1 vertical slice, **US-1 Browse Explore** (UC-DIS-01; F-EXPLORE-01/02): a Guest or a simulated approved Tour Agency can browse eligible Experience cards, paginate, expand a preview, and reach an Experience detail entry point. Guest commercial fields are masked. This slice reads the canonical Session 5 seed and does not write business data. US-3 and US-4 remain later P1 slices; US-2 is P2.

## Technical Context

- **Language/Version**: TypeScript 5.x, Node.js >=22
- **Framework**: Next.js App Router, React 18
- **Storage**: canonical PostgreSQL schema in `data/schema.sql`; the local US-1 read adapter loads the exact `data/seed/*.csv` fixtures without requiring a PostgreSQL service on every laptop. Production DB integration is a later slice.
- **Testing**: Vitest 2
- **CSV parsing**: `csv-parse` for quoted, multiline seed records
- **Target**: local responsive web app on Windows/macOS
- **Constraints**: `docs/spec/` and `data/` stay unchanged; no login/deployment in Session 8; no real people or credentials; no ranking-learning, quote or chat implementation in this slice.
- **Performance**: page size defaults to 12 and caps at 50 per FR-001; no invented latency target.

## Scope and trace

| Story / rule | This slice | Verification |
|---|---|---|
| US-1 AC1; F-EXPLORE-01/02 | Eligible cards and pagination | Seed integration and UI tests |
| US-1 AC2/3; BR-002/003 | Agency/Guest field and action visibility; local Agency context only | Role tests; Guest protected action leads to Login |
| US-1 AC4 | Existing Agency preference is optional at initial browse; this slice uses stable catalog order | No new ranking formula |
| US-1 AC5 | Empty catalog gives usable empty state | Empty fixture test |
| BR-001 | Verified, published Provider; active Village; unarchived Experience only | Eligibility tests |
| F-EXPLORE-02 | Card fields including 1–max capacity | Projection test |

**Out of scope**: US-2 (F-EXPLORE-05–10, 13–17), US-3 Provider Detail (F-EXPLORE-03), US-4 complete Experience Detail and Chat (F-EXPLORE-03/04/11/12). A minimal Experience detail destination supports US-1 navigation, but it is not claimed as complete US-4. No booking, quote, real authentication or cloud deployment.

## Constitution Check

| Principle | Result and reason |
|---|---|
| I. Spec source of truth | Pass: FR/BR/AC above map to `docs/spec/specs/spec-EXP.md`; attributes map to `data/schema.sql` and seed. No source spec/data edits. |
| II. Test first | Pass when each scoped AC and BR has a failing test before implementation; tasks require this order. |
| III. Thin slice | Pass: only US-1, screen, catalog logic and seeded data are built. |
| IV. Synthetic data/no secrets | Pass: read only `data/seed/`; no credentials or actual personal records. |
| V. Human review | Pass: work remains local on feature branch; teammate reviews before push/merge. |

## Project Structure

```text
specs/001-exp-core/
  spec.md  plan.md  research.md  data-model.md  quickstart.md  tasks.md
  contracts/explore-api.md
src/app/explore/page.tsx
src/app/explore/experiences/[id]/page.tsx
src/app/api/explore/route.ts
src/lib/explore/catalog.ts
src/lib/explore/seed-repository.ts
tests/unit/explore-catalog.test.ts
tests/integration/explore-seed.test.ts
```

The repository stays one Next.js project. `src/lib/explore` owns the pure eligibility and card projection rules; the seed repository handles CSV parsing; page and API share this service.

## Data and integration

See [data-model.md](data-model.md) for read-only table and column mapping. This slice uses `data/04-data-model.md`, `data/schema.sql` and the same-named CSV in `data/seed/`; the guide's example `data/data-model-EXP.md` does not exist in this repo. No column is redefined. `GET /api/explore` is the only API contract in this slice.

## Complexity Tracking

| Deferred item | Reason and consequence |
|---|---|
| Authenticated Agency context | Real login is deferred to Session 11. Local development can impersonate one approved Agency from synthetic seed; this is disabled in production. |
| Storage adapter | A read-only CSV adapter lets every team member run US-1 without installing PostgreSQL. It uses canonical seed columns and must be replaced by a PostgreSQL adapter before production. |
| Media binaries | `stored_files.csv` contains metadata and keys but the referenced image binaries are absent; UI shows a deliberate placeholder. A real media store is needed to satisfy the final photo rendering requirement. |
| Second module scaffold | AIT foundational code is still on an unmerged branch. This branch may need a merge conflict resolution after that foundation enters `main`. |
