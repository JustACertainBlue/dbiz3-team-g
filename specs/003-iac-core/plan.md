# Implementation Plan: 003-iac-core (In-app Chat)

**Branch**: `003-iac-core` | **Date**: 2026-10-30 | **Spec**: [specs/003-iac-core/spec.md](spec.md)

**Input**: Feature specification from `specs/003-iac-core/spec.md` (derived from `docs/spec/specs/spec-IAC.md`).

---

## 1. Summary

The In-app Chat module (`IAC`) provides authenticated, persistent direct messaging between Tour Agencies and Local Providers for craft-village collaboration, negotiation, and context hand-off (Screens `COM048` and `COM065`). It ensures that at most one Active chat session exists per Agency–Provider pair, links relevant Experience or Booking context as metadata without fragmenting conversations, delivers text messages supporting basic bold and italic formatting, displays an activity-sorted conversation list with unread counters, and supports paginated message history.

The technical implementation uses a fullstack TypeScript web application on Next.js 14 (App Router) integrated with the project's local JSON runtime repository (`json-repository.ts` backed by `data/seed/*.csv` and `data/schema.sql`), with Zod runtime validation, sanitized lightweight markdown parsing, and Vitest for automated test-first verification.

---

## 2. Technical Context

**Language/Version**: TypeScript 5.x / Node.js >= 22.0.0 (Workstation confirmed v24.19.0)

**Primary Dependencies**: Next.js 14 (App Router), React 18, Zod (runtime validation)

**Storage**: Local JSON runtime repository (`.demo-data/runtime.json` via `src/lib/demo/json-repository.ts`) with in-memory isolation for automated tests, strictly mapping to tables `chat_sessions`, `chat_participants`, and `chat_messages` in `data/schema.sql`.

**Testing**: Vitest 2 (`npm test`, `npx vitest run`)

**Target Platform**: Node.js runtime / Responsive Web (Screens `COM048` and `COM065` on macOS and Windows with free tools)

**Project Type**: Fullstack Web application (REST API route handlers in `src/app/api/iac/` + React UI in `src/app/messages/`)

**Performance Goals**: Message submission and local state update < 300ms p95; conversation list and initial history load < 500ms p95.

**Constraints**:
- Strict test-first development: every business rule (`BR-001` through `BR-021`) and acceptance scenario in scope has an automated test written and failing before implementation code.
- Zero secrets committed in source code; secrets live in git-ignored `.env`.
- Synthetic data only: canonical seed package in `data/seed/` and `data/schema.sql`.
- At most one Active Chat session per Agency–Provider pair (`chat_one_active_pair_uq`, `BR-004`).
- Message length constraint: maximum 4,000 characters (`BR-007`).
- Never automatically create a booking from Chat (`BR-018`).

**Scope of this feature**:
- **In Scope**: User Story `US-1 (P1): Communicate via Chat — UC-COM-01` only:
  - `FR-001` (`F-CHAT-01`): Open or reuse active chat session between Tour Agency and Local Provider.
  - `FR-002` (`F-CHAT-02`): Send text/basic markdown message in active chat.
  - `FR-003` (`F-CHAT-03`): View activity-sorted chat list, unread counts, and paginated message history (50 messages per page).
- **Out of Scope (Explicitly excluded)**:
  - `FR-004` (`F-CHAT-04`): Close chat session (Should-have, deferred).
  - `FR-005` (`F-CHAT-05`): Document file attachments (Should-have, deferred).
  - Production Login & Auth UI (deferred to Session 11; reuse demo session cookie `hab_demo_account`).
  - Production Cloud Deployment (deferred to Session 11; runs on local dev server).
  - Group chat, guest chat access, message editing/deletion, audio/video calling.
  - Automatic booking creation by Chat (`BR-018`).

---

## 3. Constitution Check

*GATE: Evaluated and passed before Phase 0/1 design. Re-checked post-design.*

| Principle | Constitution Rule | Status | Evidence / Verification |
|---|---|---|---|
| **I. The Spec is the Source of Truth** | Requirements come only from `docs/spec/`. Data structures come only from `data/`. If code and spec disagree, code is wrong. Never invent requirements. | ✅ PASS | Data structures map 1:1 to `chat_sessions`, `chat_participants`, and `chat_messages` in `data/schema.sql` and `data/04-data-model.md`. Requirements trace strictly to `F-CHAT-01`, `F-CHAT-02`, and `F-CHAT-03` without invented scope. Consistency check T3 completed. |
| **II. Business Rules are Test-First (Non-Negotiable)** | Every business rule (`BR-xxx`) and every acceptance scenario gets an automated test written and seen failing before the code that makes it pass. | ✅ PASS | Test suites planned in `quickstart.md` cover all business rules `BR-001` through `BR-021` relevant to `US-1 (P1)`. Red-green lifecycle will be enforced during task implementation. |
| **III. Thin Vertical Slices** | Build one user story at a time, end to end (screen, logic, data), in priority order P1, P2, P3. Runs from clean clone with `quickstart.md`. | ✅ PASS | The slice is strictly limited to `US-1 (P1)` covering screens `COM048`/`COM065`, chat service logic, and persistence. `quickstart.md` provides reproducible verification steps. |
| **IV. Synthetic Data and No Secrets** | Only seed data in `data/` is used. No real personal data, no API keys or passwords in committed files; secrets live in `.env`. | ✅ PASS | Seed data verified via `data/scripts/validate_seed.py`. Mock accounts from `user_accounts.csv` and `data/seed/` are used exclusively. No secrets in code. |
| **V. Humans Approve Every Change** | Agent works on a branch, shows changed files with reasons, never pushes or merges without approval. Teammate reviews PR. | ✅ PASS | All work created on branch `003-iac-core`. No direct pushes or merges to `main`. Pull request review process enforced. |

---

## 4. Project Structure

### Documentation (this feature)

```text
specs/003-iac-core/
├── spec.md              # Read-only snapshot of docs/spec/specs/spec-IAC.md
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0: Technical research and architecture decisions
├── data-model.md        # Phase 1: Entity definitions, table mappings to data/
├── quickstart.md        # Phase 1: Clean clone setup, test, and run instructions
├── contracts/           # Phase 1: Interface and REST API contracts
│   └── chat-api.md      # REST endpoints contract specification
└── tasks.md             # Phase 2: Actionable tasks (created by /speckit-tasks)
```

### Source Code (repository layout)

```text
src/
├── app/
│   ├── api/iac/                 # REST API route handlers
│   │   ├── sessions/
│   │   │   ├── route.ts         # POST /api/iac/sessions (open/reuse), GET /api/iac/sessions (list)
│   │   │   └── [id]/
│   │   │       └── messages/
│   │   │           └── route.ts # GET /api/iac/sessions/:id/messages, POST /api/iac/sessions/:id/messages
│   └── messages/                # Screens COM048 / COM065 UI
│       └── page.tsx             # Interactive Chat conversation and history view
├── lib/
│   ├── iac/                     # In-app Chat domain logic
│   │   ├── chat-service.ts      # Core chat session & messaging service
│   │   ├── markdown-utils.ts    # Bold/italic formatter and sanitizer
│   │   ├── types.ts             # Domain models and I/O contracts
│   │   └── validators.ts        # Zod input validation schemas
│   └── demo/
│       └── json-repository.ts   # Persistent JSON repository adapter for runtime data
tests/
├── contract/                    # REST API contract assertions
│   └── chat-api.test.ts
├── unit/                        # Business rule verification (BR-001 .. BR-021)
│   ├── chat-rules.test.ts
│   └── chat-markdown.test.ts
└── integration/                 # End-to-end communication flow tests
    └── chat-flow.test.ts
```

---

## 5. Complexity Tracking

| Item / Feature Requirement | Need | Simpler Alternative Rejected Because |
|---|---|---|
| **Login & Auth UI** | Deferred to Session 11 | Simulated via demo session cookie (`hab_demo_account`) to maintain consistency with `001-ait-core`, `001-exp-core`, and `002-prf-core` without blocking on full auth service. |
| **Cloud Deployment** | Deferred to Session 11 | Local dev server (`npm run dev`) satisfies all MVP Alpha demonstration requirements with zero infrastructure overhead. |
| **WebSocket / Real-time Gateway** | Omitted for MVP | Spec defines immediate HTTP request/response delivery (`F-CHAT-02`). Re-fetch on send and polling provide 100% compliant behavior without external WebSocket infrastructure. |
| **Heavy Markdown Parsing Library** | Avoid bundle bloat and XSS | Custom regex-based sanitizer strictly supporting bold (`**text**`) and italic (`*text*`) meets `BR-007` while eliminating security vulnerabilities. |
