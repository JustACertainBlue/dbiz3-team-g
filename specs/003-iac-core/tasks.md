# Tasks: 003-iac-core (In-app Chat)

**Feature**: In-app Chat (Slice `003-iac-core`)  
**Input**: [spec.md](spec.md), [plan.md](plan.md), [data-model.md](data-model.md), [contracts/chat-api.md](contracts/chat-api.md), [quickstart.md](quickstart.md)  
**Governance**: Constitution Principle II (Test-First Non-Negotiable) — every test task comes before the code task it checks.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Module structure initialization and dependency verification.

- [ ] T001 Verify project dependencies and TypeScript build setup for IAC in `tsconfig.json` and `package.json`
- [ ] T002 [P] Configure environment template in `.env.example` ensuring runtime compatibility with existing services

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data layer, seed verification, validation schemas, and auth guards that MUST complete before user story implementation.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

- [ ] T003 Test: Seed data loader verification for Tour Agency and Local Provider accounts in `tests/unit/chat-seed-data.test.ts` (loads `data/seed/user_accounts.csv`, `agency_profiles.csv`, and `provider_profiles.csv`, verifying at least 1 valid Tour Agency and 1 Local Provider fixture)
- [ ] T004 Implement seed data accessor helper in `src/lib/iac/seed-accessor.ts` (satisfies T003)
- [ ] T005 [P] Test: Domain types and Zod validation schemas for sessions, messages, and pagination cursors in `tests/unit/chat-types-validation.test.ts`
- [ ] T006 [P] Implement TypeScript interfaces and Zod validation schemas in `src/lib/iac/types.ts` and `src/lib/iac/validators.ts` (satisfies T005)
- [ ] T007 [P] Test: Participant isolation and role verification guard in `tests/unit/chat-auth-guard.test.ts` (checks `BR-001`, `BR-002`, `BR-003`, `BR-016`)
- [ ] T008 [P] Implement authentication and participant authorization guard in `src/lib/iac/auth-guard.ts` (satisfies T007)

**Checkpoint**: Foundation ready — user story testing and implementation can now begin.

---

## Phase 3: User Story 1 - Communicate via Chat (Priority: P1) 🎯 MVP

**Goal**: As a Tour Agency or Local Provider, communicate directly through persistent chat to clarify requirements, discuss experiences/bookings, view unread counts, and access paginated conversation history (`UC-COM-01`).  
**Independent Test**: Run `npx vitest run tests/integration/chat-flow.test.ts` to verify full end-to-end conversation creation, message exchange, markdown rendering, unread count tracking, and role-scoped history.

### Group 1: Chat Session Management & Single Active Pair
*Covers: FR-001, BR-001, BR-004, BR-005, BR-012, AC-IAC-PAIR, AC-IAC-NAV*

- [ ] T009 [P] [US1] Test: Open/create active chat session and unique active pair reuse in `tests/contract/chat-sessions-api.test.ts` (checks `FR-001`, `BR-001`, `BR-004`, `BR-005`, `AC-IAC-PAIR`)
- [ ] T010 [US1] Implement session management service in `src/lib/iac/chat-service.ts` (`findOrCreateActiveSession`, reusing existing active session for Agency–Provider pair) (satisfies T009)
- [ ] T011 [US1] Implement session REST API route in `src/app/api/iac/sessions/route.ts` (`POST /api/iac/sessions`) (satisfies T009, depends on T010)

### Group 2: Messaging, Markdown Formatting & Length Validation
*Covers: FR-002, BR-006, BR-007, BR-012, BR-018, BR-021, AC-IAC-CLOSED*

- [ ] T012 [P] [US1] Test: Message formatting, bold/italic parsing, max 4000 length constraint, and XSS sanitization in `tests/unit/chat-markdown.test.ts` (checks `BR-007`)
- [ ] T013 [P] [US1] Test: Send message endpoint, immutability, timestamp update, and closed session rejection in `tests/contract/chat-messages-api.test.ts` (checks `FR-002`, `BR-006`, `BR-018`, `BR-021`)
- [ ] T014 [P] [US1] Implement markdown parsing and sanitization utilities in `src/lib/iac/markdown-utils.ts` (satisfies T012)
- [ ] T015 [US1] Implement message creation in `src/lib/iac/chat-service.ts` (`sendMessage`, updating `last_message_at` and incrementing recipient `unread_count`) (satisfies T013)
- [ ] T016 [US1] Implement messages REST API route in `src/app/api/iac/sessions/[id]/messages/route.ts` (`POST /api/iac/sessions/:id/messages`) (satisfies T013, depends on T014, T015)

### Group 3: Chat List, Activity Sorting, Unread Counter & History Pagination
*Covers: FR-003, BR-002, BR-013, BR-014, BR-015, BR-016, BR-017*

- [ ] T017 [P] [US1] Test: Chat list sorting by latest message, unread counter reset on history view, and 50-message pagination in `tests/contract/chat-list-history.test.ts` (checks `FR-003`, `BR-013`, `BR-014`, `BR-015`, `BR-016`, `BR-017`)
- [ ] T018 [US1] Implement chat list and paginated history retrieval in `src/lib/iac/chat-service.ts` (`listUserChats`, `getSessionMessages`, resetting caller's `unread_count`) (satisfies T017)
- [ ] T019 [US1] Implement list endpoint in `src/app/api/iac/sessions/route.ts` (`GET /api/iac/sessions`) and history endpoint in `src/app/api/iac/sessions/[id]/messages/route.ts` (`GET /api/iac/sessions/:id/messages`) (satisfies T017, depends on T018)

### Group 4: User Interface & End-to-End Integration Flow
*Covers: Screens COM048, COM065, SC-001 .. SC-010*

- [ ] T020 [P] [US1] Test: End-to-end integration flow between Tour Agency and Local Provider in `tests/integration/chat-flow.test.ts` (verifies complete flow: open from context, send formatted message, receive unread notification, reset on read, verify persistence)
- [ ] T021 [US1] Update conversational chat UI in `src/app/messages/page.tsx` connecting to real IAC endpoints (`/api/iac/sessions`, `/api/iac/sessions/:id/messages`) with live message list, bold/italic rendering, unread badge, and input submission (satisfies T020)

**Checkpoint**: At this point, User Story 1 (P1) is fully functional and testable independently.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Verification, quickstart validation, and clean-up.

- [ ] T022 [P] Validate that zero booking records are created during any chat action (`BR-018`) in `tests/unit/chat-no-booking.test.ts`
- [ ] T023 Run full regression test suite (`npm test`) and TypeScript check (`npm run lint`)
- [ ] T024 Follow and verify clean-clone demo path in `specs/003-iac-core/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies
1. **Setup (Phase 1)**: Can start immediately.
2. **Foundational (Phase 2)**: Depends on Phase 1; **BLOCKS** Phase 3 (User Story 1).
3. **User Story 1 (Phase 3)**: Depends on Phase 2.
   - Within US-1: Tests MUST be written and seen failing before implementing corresponding code.
   - Group 1 (Sessions) $\rightarrow$ Group 2 (Messages) $\rightarrow$ Group 3 (List & History) $\rightarrow$ Group 4 (UI & E2E).
4. **Polish (Phase 4)**: Depends on US-1 completion.

### Parallel Opportunities [P]
- `T002` can run in parallel with `T001`.
- `T005`, `T007` (Foundational tests) can run in parallel with `T003`.
- `T006`, `T008` (Foundational code) can run in parallel with `T004`.
- All test tasks `T009`, `T012`, `T013`, `T017`, `T020` can be created and run in parallel to establish test coverage.

---

## Implementation Strategy (MVP First)

1. **Step 5 (Tests First)**: Implement Setup (Phase 1), Foundational (Phase 2), and test tasks `T009`, `T012`, `T013`, `T017`, `T020`. Run `npm test` and verify that all new tests fail for the right reason (missing service and endpoints).
2. **Step 6 (Code)**: Implement code tasks `T010`, `T011`, `T014`, `T015`, `T016`, `T018`, `T019`, `T021`. Run `npm test` and verify all tests pass without modifying any test file.
3. **Step 7 (Verify)**: Run demo path in `quickstart.md` across Agency and Provider accounts, verify message exchange and unread clearing.

