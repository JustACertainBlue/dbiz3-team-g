# Tasks: EXP US-1 Browse Explore

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/explore-api.md`. **Scope**: US-1 (P1) only.

## Phase 1: Setup

- [X] T001 Create `package.json`, `tsconfig.json`, `next-env.d.ts`, `vitest.config.ts` for the agreed Next.js/TypeScript/Vitest stack.
- [X] T002 Add `src/app/layout.tsx` and `src/app/globals.css` base shell; install locked dependencies in `package-lock.json`.

## Phase 2: Foundational

- [X] T003 Implement CSV fixture reader in `src/lib/explore/seed-repository.ts` against `data/seed/` column names.
- [X] T004 Define typed catalog/card inputs in `src/lib/explore/catalog.ts`; no business filtering yet.

## Phase 3: US-1 Browse Explore (P1)

**Goal**: Guest and approved synthetic Agency browse only eligible Experience cards with correct visibility and pagination.

**Independent demo**: `npm run dev`, visit `/explore`, inspect Guest cards/preview/detail destination, then switch to a seeded approved Agency in development and inspect permitted pricing.

### Tests first — run and observe missing-implementation failure

- [X] T005 [US1] In `tests/unit/explore-catalog.test.ts`, test BR-001 eligibility: unverified Provider, unpublished version, archived Experience and inactive Village are excluded; eligible record remains.
- [X] T006 [US1] In `tests/unit/explore-catalog.test.ts`, test US-1 AC1/5 and FR-001 page 1/12, max 50, empty result and invalid page.
- [X] T007 [US1] In `tests/unit/explore-catalog.test.ts`, test BR-002 and US-1 AC2/3: Guest protected actions locked, approved Agency permissions enabled; unapproved identity gets no Agency view.
- [X] T008 [US1] In `tests/unit/explore-catalog.test.ts`, test BR-003: Guest price hidden, approved Agency price visible.
- [X] T009 [US1] In `tests/unit/explore-catalog.test.ts`, test FR-002 fields, capacity 1–max, stable initial ordering, and AC4 optional preference profile does not break browse.
- [X] T010 [US1] In `tests/integration/explore-seed.test.ts`, load canonical CSV fixtures; assert a known eligible Experience and exclusion of a known ineligible Experience; check media metadata. Inspect the missing-binary fallback during T018.

### Code — tests remain unchanged

- [X] T011 [US1] Implement eligibility, role projection, pagination, stable ordering and card fields in `src/lib/explore/catalog.ts` for T005–T009.
- [X] T012 [US1] Complete seed joins in `src/lib/explore/seed-repository.ts` for T010; do not edit `data/`.
- [X] T013 [US1] Add `GET /api/explore` in `src/app/api/explore/route.ts` with validation and development-only Agency simulation.
- [X] T014 [US1] Add Guest/Agency catalog, cards, preview, pagination and empty state in `src/app/explore/page.tsx` and `src/app/globals.css`.
- [X] T015 [US1] Add navigation destination in `src/app/explore/experiences/[id]/page.tsx`; preserve role visibility and keep full US-4 out of scope.
- [X] T016 [US1] Add a Guest Login destination in `src/app/login/page.tsx` for protected-action navigation; do not claim production auth.

## Phase 4: Verify and log

- [X] T017 Run `python data/scripts/validate_seed.py`, `npm test`, `npm run lint`, `npm run build`; record results in `docs/build/build-log.md`.
- [X] T018 Follow `specs/001-exp-core/quickstart.md` locally; manually inspect Guest and Agency demo path and record limitations in build log.

## Dependencies & execution order

T001–T002 precede T003–T004. T005–T010 were written and observed failing before T011–T016. T011/T012 precede API/UI integration. T017/T018 are final gates. US-3/US-4 P1 and US-2 P2 get separate slices after this one.

## Parallel opportunities

T005–T009 and T010 touch separate test files. UI work (T014) and route work (T013) can proceed in parallel once the shared catalog contract (T011) is settled. This task was executed serially in one checkout.
