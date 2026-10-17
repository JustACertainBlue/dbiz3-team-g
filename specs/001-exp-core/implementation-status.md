# EXP implementation status — 14 October 2026

The requested scope is US-1 through US-4 and FR-001 through FR-017. This file distinguishes running behavior from tested domain logic and missing integrations. Canonical requirements remain in `docs/spec/specs/spec-EXP.md`.

| Requirement | Current result | Remaining before calling it complete |
|---|---|---|
| FR-001–002 / US-1 | Verified seed catalog, pagination, category filter, Guest/Agency visibility, quick preview and empty state run locally. | Agency Quote/Chat in US-1 AC2 depends on Auth/Chat. Media binaries are unavailable. |
| FR-003 / US-3–4 | Provider and Experience pages, role-specific price/contact, operating hours, public available/blocked periods, discounts, policies and other-craft suggestions run locally. | Real gallery media, complete optional included/excluded content and protected handoff are unavailable. |
| FR-004 | Same-Provider and same-craft related Experiences run locally. | `Nearby` within 20 km cannot be calculated: `data/` has no village coordinates. |
| FR-005 | Local demo records click, preview, detail, filter and scroll with event IDs; Guest opt-in and duplicate protection are tested. | Durable PostgreSQL writes and real Auth identity are not connected. |
| FR-006 | The local detail page now reports its elapsed visit time once on navigation or page/tab hide; the 60-second/two-Experience implicit-signal rule is tested as domain logic. | Full entered/exited time, scroll depth, sections viewed and next-action record cannot be stored under the current data model. The user chose to keep `data/` unchanged. Browser exit delivery and durable persistence still need integration verification. |
| FR-007 | Strong-action types and the Auth/Chat integration port are defined and tested. | No live Quote/Chat action can emit the signal until adapters exist; `source_context` has no explicit physical column. |
| FR-008–010 / US-2 | Session pattern, explicit/implicit signals, Agency-specific weights, pinned ranking version, re-ranking and exposure snapshots work in the local in-memory demo. | Shared profile and exposure history are not persisted in PostgreSQL; historical decay belongs to MATCH. |
| FR-011–012 | Quote/Chat handoff service tests permission first, once-per-Agency/Experience quote reuse, pair-chat reuse, contextual message and no Booking creation. | Actual F-AUTH-16, Quote repository and F-CHAT-01 implementations are external integration points; the UI marks Agency handoff unavailable. |
| FR-013–016 | Aggregate metrics, the specified 0–100 quality formula, weekly KPI arithmetic and replay logic are covered by unit tests. | No scheduled aggregation or durable KPI time series; retention and search-vs-scroll Scenario B need additional event sources. |
| FR-017 | Candidate weight bounds, 30-session/5-point gates and rollback threshold are tested as pure logic. | No weekly worker, atomic Draft→Active transaction, audit write or next-cohort live rollback is running. |

The development-only deterministic ranking rule uses the Active seed version's `relevance` and `quality` weights. Relevance matches Agency `category:`/`provider:` preference keys; quality is normalized from historical seed interactions. Current-session interactions do not immediately alter another Agency's ranking. This is the code-level interpretation the user approved for this prototype, not a new data/spec contract.

The source spec's SC-011 now agrees with BR-015 and closed question 23: System promotion is automatic after the gates pass; there is no Admin activation path. Open questions 28–31 record the unresolved detail-visit, strong-action source, Nearby-coordinate and included/excluded-content mappings. No `data/` file was changed.

The code is a working EXP prototype, not a deploy-ready or fully accepted implementation of all 17 FRs. Completing the remaining items requires Auth/Chat integration, durable PostgreSQL storage, a scheduler, media and the explicitly deferred data-model decisions.

The original US-1 slice has a recorded red-to-green test run in build-log Entry 2. The later US-1–4 extension has passing tests but no recorded **pre-implementation failing run**. Updating this document, plan and tasks cannot retroactively prove that sequence; leave the full-slice test-first author checkbox unticked. The extension still needs independent teammate review.

## Changed files and reasons

| File | Reason |
|---|---|
| `AGENTS.md` | Replace stale Session 7/no-stack instructions with the current EXP stack and checks. |
| `docs/build/build-log.md` | Record this EXP build run, checks and discovered gaps. |
| `docs/spec/specs/spec-EXP.md` | Align SC-011 with the chosen System promotion rule and record open questions 28–31. |
| `specs/001-exp-core/spec.md` | Refresh the generated snapshot after the source spec change. |
| `specs/001-exp-core/plan.md` | Align scope and limitations with the US-1–4 prototype. |
| `specs/001-exp-core/tasks.md` | Map the actual extension files to T019–T026 and distinguish test evidence. |
| `specs/001-exp-core/research.md` | Record later implementation decisions and rationale. |
| `specs/001-exp-core/data-model.md` | Map later EXP outputs to existing entities and identify unmapped fields. |
| `specs/001-exp-core/contracts/explore-api.md` | Document the development tracking endpoints and their limits. |
| `specs/001-exp-core/quickstart.md` | Update local run and verification steps. |
| `specs/001-exp-core/implementation-status.md` | Explain exact FR coverage and remaining dependencies. |
| `src/app/api/explore/route.ts` | Add category filtering to the catalog API. |
| `src/app/api/explore/session/route.ts` | Start consent-aware demo Explore sessions. |
| `src/app/api/explore/events/route.ts` | Receive validated demo browsing events. |
| `src/app/explore/ExploreTracker.tsx` | Capture permitted UI interactions, Guest analytics choice and local detail-visit duration on exit. |
| `src/app/explore/page.tsx` | Add filters, Provider navigation and Agency-ranked display. |
| `src/app/explore/experiences/[id]/page.tsx` | Show Experience detail, public availability and related options. |
| `src/app/explore/providers/[id]/page.tsx` | Show public or permitted Provider detail. |
| `src/lib/explore/catalog.ts` | Filter and order eligible cards while preserving field visibility. |
| `src/lib/explore/seed-repository.ts` | Read the additional canonical seed tables used by EXP. |
| `src/lib/explore/availability.ts` | Derive available/blocked periods from hours and active Bookings. |
| `src/lib/explore/details.ts` | Project role-specific Provider/Experience detail outputs. |
| `src/lib/explore/learning.ts` | Implement signals, ranking, metrics, replay and promotion gates. |
| `src/lib/explore/runtime.ts` | Exercise consent and Agency-specific re-ranking; reject multiple Active ranking versions. |
| `src/lib/explore/detail-visit.ts` | Build one elapsed-time event for a completed local detail visit. |
| `src/lib/explore/demo-runtime.ts` | Keep the local demo runtime shared across server requests. |
| `src/lib/explore/handoff.ts` | Define tested Auth/Chat integration contracts for Quote and Chat. |
| `tests/unit/explore-catalog.test.ts` | Check category filtering. |
| `tests/unit/explore-details.test.ts` | Check Provider/Experience visibility and content. |
| `tests/unit/explore-availability.test.ts` | Check booking-block subtraction and empty hours. |
| `tests/unit/explore-learning.test.ts` | Check signals, ranking, KPI and BR-015 gates. |
| `tests/unit/explore-runtime.test.ts` | Check consent, deduplication, Agency isolation and the unique Active-version invariant. |
| `tests/unit/explore-detail-visit.test.ts` | Check visit duration and one-time exit reporting. |
| `tests/unit/explore-handoff.test.ts` | Check permission, quote reuse and Chat context. |
