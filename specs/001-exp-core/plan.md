# Implementation Plan: EXP Explore prototype

**Branch**: `001-exp-core` | **Date**: 2026-10-13 | **Spec**: [snapshot](spec.md), from `docs/spec/specs/spec-EXP.md`

## Summary

The first committed slice implements **US-1 Browse Explore** (F-EXPLORE-01/02). A subsequent, uncommitted extension requested by the user attempts **US-1–4 and FR-001–017**: Provider/Experience detail, consent-aware interactions, Agency-specific ranking and tested handoff/optimization rules. These are different completion levels. Browse and detail flows run locally; handoff and optimization are domain logic awaiting other modules and durable storage. [implementation-status.md](implementation-status.md) is the per-requirement completion record.

## Technical Context

- **Language/Version**: TypeScript 5.x, Node.js >=22
- **Framework**: Next.js App Router, React 18
- **Storage**: canonical PostgreSQL schema in `data/schema.sql`; the prototype reads the exact `data/seed/*.csv` fixtures. New sessions and interactions live in development-server memory and disappear on restart. Production DB integration remains open.
- **Testing**: Vitest 2
- **CSV parsing**: `csv-parse` for quoted, multiline seed records
- **Target**: local responsive web app on Windows/macOS
- **Constraints**: `data/` stays unchanged; no production login, Chat, database writes, deployment or real personal data. The development Agency switch uses approved synthetic seed data and is disabled in production.
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
| US-3/4; FR-003/004 | Public and Agency Provider/Experience detail, schedule projection and related items | Detail/availability tests and local navigation |
| US-2; FR-005/008–010 | Consent-aware events, session signals and Agency-scoped re-ranking | Runtime/learning tests and local demo |
| FR-006/007/011/012 | Detail-signal rule and protected Quote/Chat handoff interface | Pure tests; live adapters and durable visit record remain open |
| FR-013–017; BR-015 | Aggregate metrics, ranking-quality formula, replay and promotion/rollback gates | Pure tests; scheduled worker, transaction and audit remain open |

**Still outside the runnable prototype**: real authentication, Quote/Chat adapters, Booking creation, PostgreSQL persistence, weekly scheduled optimization, atomic version promotion, live rollback, missing media binaries and distance-based Nearby suggestions. These gaps prevent claiming that every FR or acceptance scenario is complete.

## Constitution Check

| Principle | Result and reason |
|---|---|
| I. Spec source of truth | EXP FR/BR/AC map to `docs/spec/specs/spec-EXP.md`; attributes map to `data/schema.sql` and seed. Open source-data mappings are recorded in spec §10. |
| II. Test first | US-1 has a recorded red-to-green run in build-log Entry 2. The later extension has passing tests, but no recorded pre-implementation red run; do not claim this gate for the full extension. |
| III. Thin slice | US-1 was the initial thin slice. The later extension broadened scope at the user's request and is explicitly a prototype rather than a complete vertical slice. |
| IV. Synthetic data/no secrets | Pass: read only `data/seed/`; no credentials or actual personal records. |
| V. Human review | Pending: the extension remains uncommitted locally and needs a teammate review before PR approval. |

## Project Structure

```text
specs/001-exp-core/
  spec.md  plan.md  research.md  data-model.md  quickstart.md  tasks.md
  contracts/explore-api.md
src/app/explore/page.tsx
src/app/explore/experiences/[id]/page.tsx
src/app/explore/providers/[id]/page.tsx
src/app/explore/ExploreTracker.tsx
src/app/api/explore/{route.ts,session/route.ts,events/route.ts}
src/lib/explore/{catalog,seed-repository,details,availability,learning,runtime,demo-runtime,handoff}.ts
tests/unit/explore-*.test.ts
tests/integration/explore-seed.test.ts
```

The repository stays one Next.js project. `src/lib/explore` contains eligibility, details, availability, learning and handoff rules; the seed repository handles CSV parsing. The development runtime is an in-memory adapter, not the production persistence implementation.

## Data and integration

See [data-model.md](data-model.md) for entity mappings and unresolved persistence fields, and [contracts/explore-api.md](contracts/explore-api.md) for the catalog and development tracking endpoints. Canonical storage remains `data/04-data-model.md`, `data/schema.sql` and same-named CSV in `data/seed/`. No schema column is redefined here.

## Complexity Tracking

| Deferred item | Reason and consequence |
|---|---|
| Authenticated Agency context | Real login is absent. Local development can select one approved Agency from synthetic seed; this is disabled in production. |
| Storage adapter | A read-only CSV adapter and in-memory interaction store let the team run the prototype without PostgreSQL. Both require durable adapters before production. |
| Media binaries | `stored_files.csv` contains metadata and keys but the referenced image binaries are absent; UI shows a deliberate placeholder. A real media store is needed to satisfy the final photo rendering requirement. |
| Quote/Chat integration | Handoff permission and reuse rules are tested through interfaces only; no Auth or Chat implementation is connected. |
| Ranking operations | Agency ranking runs locally. Weekly scheduling, atomic activation and rollback are only pure rules, not a running worker. |
