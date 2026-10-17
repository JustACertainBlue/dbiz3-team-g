# Tasks: EXP prototype, US-1–4

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/explore-api.md`. **Scope**: T001–T018 are the committed US-1 slice; T019 onward records the later user-requested US-1–4 / FR-001–017 prototype extension. A checked task means the described prototype artifact exists, not that its full FR is production-complete; see [implementation-status.md](implementation-status.md).

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

T001–T002 precede T003–T004. T005–T010 were written and observed failing before T011–T016; build-log Entry 2 records the red and green runs for **US-1 only**. T011/T012 precede API/UI integration. T017/T018 close the committed US-1 slice. The subsequent user request expanded this same feature folder; the extension did not follow the original one-story plan.

## Parallel opportunities

T005–T009 and T010 touch separate test files. UI work (T014) and route work (T013) can proceed in parallel once the shared catalog contract (T011) is settled. This task was executed serially in one checkout.

## Phase 5: Later EXP prototype extension (user-requested)

These tasks describe the actual changed files so a reviewer can compare this branch with its plan. Unit tests pass, but **no pre-implementation failing run was captured for T019–T025**. The author must not tick the full-slice test-first checklist item based on the US-1 record alone.

- [X] T019 [US1/US2] Add category filtering and order by the active demo Agency ranking. Files: `src/app/api/explore/route.ts`, `src/app/explore/page.tsx`, `src/lib/explore/catalog.ts`, `tests/unit/explore-catalog.test.ts`.
- [X] T020 [US3/US4] Project role-specific Provider/Experience details, related Experiences, group discounts and public availability. Files: `src/app/explore/providers/[id]/page.tsx`, `src/app/explore/experiences/[id]/page.tsx`, `src/lib/explore/details.ts`, `src/lib/explore/availability.ts`, `src/lib/explore/seed-repository.ts`, `tests/unit/explore-details.test.ts`, `tests/unit/explore-availability.test.ts`.
- [X] T021 [US2] Add development-only Guest-consent and Agency session/event capture with in-memory state and deduplication. Files: `src/app/explore/ExploreTracker.tsx`, `src/app/api/explore/session/route.ts`, `src/app/api/explore/events/route.ts`, `src/lib/explore/runtime.ts`, `src/lib/explore/demo-runtime.ts`, `tests/unit/explore-runtime.test.ts`.
- [X] T022 [US2] Test session signals, Agency-only re-ranking, metrics, replay and promotion/rollback gates as pure rules. Files: `src/lib/explore/learning.ts`, `tests/unit/explore-learning.test.ts`.
- [X] T023 [US4] Define and test the Auth/Quote/Chat handoff boundary, permission-first order, Quote reuse and no Booking creation. Files: `src/lib/explore/handoff.ts`, `tests/unit/explore-handoff.test.ts`. Live adapters are not implemented.
- [X] T024 [US1–4] Update scope, decisions, mapping, local endpoints, quickstart and FR-by-FR limits. Files: `specs/001-exp-core/plan.md`, `research.md`, `data-model.md`, `contracts/explore-api.md`, `quickstart.md`, `implementation-status.md`, `tasks.md`.
- [X] T025 [US1–4] Record validation, historical test-first evidence and unresolved gaps without claiming full completion. File: `docs/build/build-log.md`.
- [X] T026 [US2/US4] Correct the already-decided automatic promotion scenario and record unresolved persistence/content/coordinates as open questions. Refresh the Spec Kit snapshot afterward. Files: `docs/spec/specs/spec-EXP.md`, `specs/001-exp-core/spec.md`.
- [ ] T027 [US1–4] Connect real Auth, Quote and Chat adapters, durable PostgreSQL writes, media and Nearby data, and scheduled ranking promotion/rollback; add acceptance tests and record a genuine test-first red run before each new implementation. This work is outside the current prototype and requires the relevant module/data owners.
- [X] T028 [FR-010/BR-015] Reject a ranking baseline with zero or multiple Active versions before starting an EXP session. A failing test was recorded before changing `src/lib/explore/runtime.ts`; the result is covered by `tests/unit/explore-runtime.test.ts`.
- [X] T029 [FR-006/FR-008] Report local detail-page dwell time once on navigation, page hide or tab hide so the 60-second signal can receive real UI timing. A missing-module test was recorded before adding `src/lib/explore/detail-visit.ts` and wiring `src/app/explore/ExploreTracker.tsx`; `tests/unit/explore-detail-visit.test.ts` covers elapsed seconds and duplicate exit signals. Durable FR-006 storage and section-level detail remain open under T027.

## Extension test evidence

Build-log Entry 3 records 32 passing tests, lint, build and seed validation after implementation. It does **not** record tests written and seen failing before T019–T023. Reconstructing a red run now would not prove historical test-first execution. Reviewer should treat that checklist item as not yet demonstrated for the full expanded slice.
