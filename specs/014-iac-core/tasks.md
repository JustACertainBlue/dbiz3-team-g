---
description: "Task list for IAC core — F-CHAT-01..03 (US-1 round 1)"
---

# Tasks: IAC core — open, send, list and history (F-CHAT-01..03)

**Input**: Design documents from `specs/014-iac-core/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/chat-api.md](contracts/chat-api.md), [quickstart.md](quickstart.md)

**Tests**: Required by the constitution (Principle II). Every test task comes before the code task it checks and is run and **seen failing because the code is missing** before that code task starts. No test is edited to make it pass; the existing-test edits of research R13 are separate tasks with their approval status and run **before** the code they relate to.

**Organization**: one user story, US-1 (P1), in two phases. **Phase A** — shared chat service and `/api/iac/chats…` (demonstrable with curl). **Phase B** — callers (Explore, AIT, BKG handoffs and Booking sync), markdown, `/messages` (COM048 / COM065) and the BKG135 / BKG138 Chat buttons (demonstrable in the browser). Out of scope (plan.md): F-CHAT-04 Close (015), F-CHAT-05 upload and COM125/COM126 (016), Provider initiation from a Quote Request (Q5), DSH018 panel.

**Existing-test edits**: T018 (Q10), T026 (H1), T027–T028 (H2) were approved by the human on 2026-11-05; each is logged in `docs/build/build-log.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[US1]**: user story of the task

## Shared test fixtures

All values from `data/seed/` through the volatile repository (`NODE_ENV=test`, `demoRepository().reset()` in `beforeEach`).

- Agency `DEMO_IDENTITIES.agency`: user `ac233721…` (Lý Gia Hân), Agency `02e568d8…` (Công ty Du lịch Tràng An); Active Chat `a0b57355-8142-5b47-be08-6130aa21c021` with Provider `0858b5e8…` (Xưởng thủ công Phú Vinh, user Quách Minh Tâm `40ed08b5…`), Agency unread 0, Provider unread 2; Booking `0971a1b6-32e2-5581-a02d-d9636e22e1b6` (Completed, same pair)
- Provider `DEMO_IDENTITIES.provider`: user `c2c7fe0d…` (Kiều Anh Thư), Provider `50f2c8fc…` (Bát Tràng); Active Chats `233b012e…` (Agency `ebf4fcfa…`, Provider unread 0) and `35ed4094-fa5a-55a6-ba1d-c03e56adfe79` (Agency `2a1f0cc1…` Công ty Du lịch Sông Hồng, user Chu Nhật Minh, Provider unread **5**)
- Experience `c9f9faf7-2987-5ae4-b1ed-95c095fcce69` "Nặn gốm thủ công" (Provider `50f2c8fc…`); the demo pair (`02e568d8…`, `50f2c8fc…`) has **no** seed Chat
- Closed seed Chats: `0df668d5…` (pair `b766576c…` / `484e5f78…`) and `3d5ad88d…` (pair `ab81de3b…` / `0858b5e8…`); for Closed tests on the demo actors, a fixture sets the demo Chat's `status` / `closed_at` / `closed_by` through the repository
- Write snapshot (lesson #15): deep copy of `chat_sessions`, `chat_participants`, `chat_messages`, `quote_requests`, `bookings`
- Long-history fixture: 120 `User Text` messages inserted into `35ed4094…` with distinct `sent_at`, plus two with the same `sent_at` to check the `message_id` tie-break (Q6)

---

## Phase 1: Setup

- [ ] T001 Confirm `.specify/feature.json` points to `specs/014-iac-core`; run `npm ci`, `npm test` (baseline 799 passed, 120 files), `npm run lint`, `uv run tools/start_feature.py --check`; record the baseline in `docs/build/build-log.md`
- [ ] T002 Bring `src/lib/iac/markdown-utils.ts` and `tests/unit/chat-markdown.test.ts` from PR #16 commit `814ac5b` with `git checkout 814ac5b -- src/lib/iac/markdown-utils.ts tests/unit/chat-markdown.test.ts`, commit them alone with `--author="mizaki311 <quangbmha@gmail.com>"` and the body line `(cherry picked from commit 814ac5bc584a37811ea69eee870d59556789361f, two files only)` (Q1, research R3); run `npx vitest run tests/unit/chat-markdown.test.ts` (expected: 5 passed, PR #16 behaviour)

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: access checks, pair lookup and the shared lock, used by both phases, so Phase A and Phase B never edit the same `src/lib/iac/` helper afterwards.

### Tests first

- [ ] T003 [P] Seed test in `tests/unit/iac-seed.test.ts`: the seed (data package `data/seed/chat_sessions.csv`) has 8 Chats, 6 `Active` and 2 `Closed`; `AI Matching`, `Explore`, `Provider Profile` and `Booking` appear twice each and `Quote Request` never; no Agency–Provider pair has two `Active` Chats; Chat `35ed4094…` has Provider-user `unread_count` `5`
- [ ] T004 [P] Access tests in `tests/unit/iac-access.test.ts` for `src/lib/iac/chat-access.ts`: `requireChatActor(session)` — Guest, UBND, HDT → `ChatError` `FORBIDDEN` 403 (BR-001, BR-003, #27); Agency / Provider → ok. `requireParticipant(session, chatId)` — demo Provider on `35ed4094…` → the Chat; demo Agency on `35ed4094…` → `FORBIDDEN` 403 (BR-002, #27); `no-such-chat` → `FORBIDDEN` 403 (#27, existence not revealed); a session whose `agencyId` matches but whose `userId` is not in `chat_participants` → `FORBIDDEN` (BR-016)
- [ ] T005 [P] Pair tests in `tests/unit/iac-chat-pairs.test.ts` for `src/lib/iac/chat-pairs.ts`: `findActivePairChat('02e568d8…', '0858b5e8…')` → `a0b57355…`; Closed-only pair (`ab81de3b…`, `0858b5e8…`) → undefined; demo pair → undefined; `newPairChatOperations({ agencyId, providerId, source, at, … })` returns one `chat_sessions` row with `status 'Active'`, `closed_at ''`, `closed_by ''`, `source` as given, and two `chat_participants` rows (Agency user, Provider user, `unread_count '0'`); `source 'AI Matching'` without `matchingSessionId` throws (`chat_matching_link_chk`); a source outside the schema enum throws (#19, Q2)
- [ ] T006 [P] Lock test in `tests/unit/iac-chat-lock.test.ts`: `withChatWriteLock` and `withBookingWriteLock` share one queue — a `withChatWriteLock` callback paused on a promise delays a later `withBookingWriteLock` callback until it resumes (R4)
- [ ] T007 Run `npx vitest run tests/unit/iac-seed.test.ts tests/unit/iac-access.test.ts tests/unit/iac-chat-pairs.test.ts tests/unit/iac-chat-lock.test.ts`; confirm T004–T006 fail because the modules are missing and T003 passes (seed facts); paste the output into `docs/build/build-log.md`

### Code

- [ ] T008 [P] `ChatError` (code, statusCode), `requireChatActor`, `requireParticipant` in `src/lib/iac/chat-access.ts` (makes T004 pass)
- [ ] T009 [P] `findActivePairChat`, `newPairChatOperations` in `src/lib/iac/chat-pairs.ts` (makes T005 pass)
- [ ] T010 Export the shared tail runner from `src/lib/booking/write-lock.ts` and add `withChatWriteLock` in `src/lib/iac/chat-lock.ts` using it (makes T006 pass; BKG behaviour unchanged — run `npx vitest run tests/unit/bkg-*race*.test.ts`)

**Checkpoint**: 799 + T003–T006 green.

---

## Phase 3 (Phase A): US-1 chat service and API (Priority: P1) 🎯

**Goal**: F-CHAT-01 (Booking source and the internal open used by handoffs), F-CHAT-02, F-CHAT-03 through `/api/iac/chats…`.

**Independent test**: quickstart §2 with curl.

### Tests first (Phase A)

- [ ] T011 [P] [US1] Open tests in `tests/unit/iac-open-chat.test.ts` for `openChat(session, input, options)` in `src/lib/iac/chat-service.ts`: demo Agency, `source 'Explore'`, `experienceId c9f9faf7…` → new Chat, `is_new_session true`, `chat_status 'Active'`, `source 'Explore'`, two participants; second call → same id, `is_new_session false`, still one Active Chat for the pair (FR-001, BR-004, AC-IAC-PAIR, SC-001); `source 'AI Matching'` stores `matching_session_id` (#19); on reuse `source` and `matching_session_id` unchanged, `experience_id` / `quote_request_id` / `booking_id` = latest context (#21, BR-012); demo pair with a Closed Chat fixture → new Active Chat, the Closed row deep-equal to before (FR-001, BR-021, AC-IAC-CLOSED); Booking count and rows unchanged (BR-018, SC-010)
- [ ] T012 [P] [US1] Booking-source tests in `tests/unit/iac-open-booking.test.ts`: demo Agency `{ source 'Booking', bookingId 0971a1b6… }` → `a0b57355…`, `is_new_session false`, no message written (#24); demo Provider on `0971a1b6…` (not its Booking) → `FORBIDDEN`; unknown Booking → `NOT_FOUND`; demo Provider with `source 'Explore'` or `'Quote Request'` → `FORBIDDEN` (Q5, FR-001); missing `bookingId` → `VALIDATION_ERROR`; each denied/invalid call leaves the write snapshot deep-equal (lesson #15)
- [ ] T013 [P] [US1] Race tests in `tests/unit/iac-open-race.test.ts` (Q9, lesson #13): (a) two `openChat` calls for the demo pair, both with `afterPairCheck` seams that wait on one shared gate released after both reached it or after a timeout → exactly one new Chat, one `is_new_session true`, both return the same id; (b) `openChat` paused at `afterPairCheck` while `createBooking(DEMO_IDENTITIES.provider, …)` for the demo Agency runs → after both settle, exactly one Active Chat for the pair and the Booking Update message is in it
- [ ] T014 [P] [US1] Send tests in `tests/unit/iac-send-message.test.ts` for `sendMessage(session, chatId, text, options)`: demo Provider on `35ed4094…` with `'  Xin chào  '` → stored `text 'Xin chào'`, `message_kind 'User Text'`, `sender_user_id c2c7fe0d…`, returns `message_id`, `sent_at`, `last_message_timestamp` (= `sent_at` = Chat `last_message_at`) (FR-002, SC-003); Agency user's `unread_count` + 1, sender's unchanged (BR-017, #26); `''`, `'   '` → `VALIDATION_ERROR`; 4000 code points (incl. Vietnamese letters) accepted, 4001 → `VALIDATION_ERROR` (#25); Closed fixture → `CHAT_CLOSED` 409 (BR-021, SC-014); non-participant → `FORBIDDEN`; every rejected call leaves the write snapshot deep-equal (lesson #15); earlier messages of the Chat deep-equal after a send (BR-006); Booking rows unchanged (BR-018)
- [ ] T015 [P] [US1] List tests in `tests/unit/iac-list-chats.test.ts` for `listChats(session)`: demo Provider → exactly `233b012e…` and `35ed4094…`; row `35ed4094…` = `{ chat_status 'Active', participant_name 'Chu Nhật Minh', organization 'Công ty Du lịch Sông Hồng', unread_count 5 }` with `unread_count` a number (#22, FR-003); demo Agency → `a0b57355…` with `participant_name 'Quách Minh Tâm'`, `organization 'Xưởng thủ công Phú Vinh'`; order newest `last_message_at` first, then `chat_session_id`, and a send moves the Chat to the top (BR-013, SC-006); an Agency never sees a Chat of another Agency and a Provider only Chats with Agencies (BR-016, SC-009); `last_message_preview` at most 120 characters; Closed Chat of a participant listed with `chat_status 'Closed'`; UBND / HDT / Guest rejected
- [ ] T016 [P] [US1] History tests in `tests/unit/iac-chat-history.test.ts` for `getChatHistory(session, chatId, { beforeCursor })`: Chat with one message → one item, `has_more_messages false`; long-history fixture → first page = latest 50, oldest → newest, `has_more_messages true`; `beforeCursor` = first item's id → the 50 before it; third page → remaining, `has_more_messages false`; equal `sent_at` ordered by `message_id` (BR-014, BR-015, SC-008, Q6); no messages (new Chat without context) → `[]`; item keys `message_id`, `message_kind`, `text`, `sender_name`, `sent_at`, `experience_id`, `booking_id` (#28), `attachments`; a context message from `createChatHandoff` returns its `experience_id` and a Booking Update its `booking_id`; seed Attachment message of `35ed4094…` lists its file `file_name`, `file_type`, `file_size` (number) (FR-003 output); Booking Update without sender → `sender_name 'Hệ thống'`; first page sets the actor's `unread_count` 0 and `last_read_message_id` = newest id (BR-017, SC-007, #23); an older page writes nothing; cursor of another Chat or unknown → `VALIDATION_ERROR`; non-participant → `FORBIDDEN` and the snapshot unchanged (lesson #15)
- [ ] T017 [P] [US1] API tests in `tests/integration/iac-chats-api.test.ts` (cookie `hab_demo_account` only): `GET /api/iac/chats` 200 per contract, 403 guest/ubnd/hdt (#27); `GET /api/iac/chats/{id}/messages` 200 / 403 non-participant / 403 unknown id / 400 bad cursor; `POST /api/iac/chats/{id}/messages` 201 `{ data: { message_id, sent_at, last_message_timestamp } }`, 400 empty / 4001, 409 Closed; `POST /api/iac/chats` `{ source 'Booking', booking_id }` 200 `{ data: { chat_session_id, chat_status, is_new_session } }`, 400 other source, 403, 404; a message sent through POST is returned by the next GET (BR-005, SC-004); error body `{ error: { code, message } }`; a forged `x-mock-user-id` / `x-mock-role` header changes nothing (checklist §3 #30)
- [ ] T018 [US1] **[approved Q10]** Edit `tests/integration/auth-no-header.test.ts:79–88`: replace `GET /api/demo/conversations` (import line 17) by `GET /api/iac/chats` from `src/app/api/iac/chats/route.ts`, same assertions (forged Agency = Guest); log the edit in `docs/build/build-log.md`
- [ ] T019 [US1] Run `npx vitest run tests/unit/iac-*.test.ts tests/integration/iac-chats-api.test.ts tests/integration/auth-no-header.test.ts`; confirm T011–T018 fail because `chat-service.ts` and the routes are missing (not a typo or a wrong seed value); paste the output into `docs/build/build-log.md`

### Code (Phase A)

- [ ] T020 [US1] `openChat` and `openChatLocked` (authorize → validate → `withChatWriteLock` → `findActivePairChat` → `afterPairCheck` seam → create via `newPairChatOperations` or reuse) in `src/lib/iac/chat-service.ts` (makes T011, T012, T013(a) pass)
- [ ] T021 [US1] `sendMessage` (participant → trim / length / Active → lock → message + `last_message_at` + other participant unread, one `applyBatch`) in `src/lib/iac/chat-service.ts` (makes T014 pass)
- [ ] T022 [US1] `listChats` and `getChatHistory` (cursor, pages of 50, attachments read-only, unread reset on first page inside the lock) in `src/lib/iac/chat-service.ts` (makes T015, T016 pass)
- [ ] T023 [US1] Routes `src/app/api/iac/chats/route.ts` (GET list, POST open `source Booking`) and `src/app/api/iac/chats/[id]/messages/route.ts` (GET history, POST send), mapping `ChatError` to the contract (makes T017, T018 pass)
- [ ] T024 [US1] Mutation runs for the race tests (lesson #13): (1) run the body of `openChat` without `withChatWriteLock` → T013(a) fails; (2) give `withChatWriteLock` its own queue instead of the Booking one → T013(b) fails (two Active Chats for one pair); restore and confirm both pass; record the outputs in `docs/build/build-log.md`
- [ ] T025 [US1] Mutation runs for the send rules: (1) remove the `Closed` check in `sendMessage` → T014 Closed case fails (BR-021); (2) change the limit to `> 4001` → T014 4001 case fails (#25); (3) move the unread reset in `getChatHistory` before `requireParticipant` → T016 snapshot fails (lesson #15); restore each and confirm green; record in `docs/build/build-log.md`

**Checkpoint**: Phase A tests green, incl. T013(a) and (b); quickstart §2 steps 1–6 by curl.

---

## Phase 4 (Phase B): US-1 callers, markdown and screens (Priority: P1)

**Goal**: every Chat creator uses the shared service and writes schema values (#18, #19); BKG and handoffs cannot create two Active Chats; COM048 / COM065 on the new API.

**Independent test**: quickstart §3 in the browser.

### Existing-test edits (before the code they relate to)

- [ ] T026 [US1] **[approved H1]** In `tests/unit/chat-markdown.test.ts` (from PR #16) replace the `_text_` expectation of "renders italic markdown *text* or _text_" by "`_text_` stays literal" (#20); add cases: `<b>x</b>` → `&lt;b&gt;x&lt;/b&gt;`, `***x***` and unclosed `**x` render no broken tag, `# heading` / `[a](b)` / `` `code` `` shown as text; log the edit in `docs/build/build-log.md`
- [ ] T027 [US1] **[approved H2]** In `tests/integration/ait-exp-br-gaps.test.ts:71–102` add `await` to `createQuoteHandoff` / `createChatHandoff` and use `await expect(…).rejects.toThrow(…)` instead of `expect(() => …).toThrow(…)`; expected values unchanged; same `await` edit in `tests/integration/exp-handoff-signal.test.ts:87–89` (third synchronous caller, found while writing the tests; same H2 change); log it
- [ ] T028 [US1] **[approved H2]** In `tests/integration/demo-functional-flow.test.ts:19–38` add `await`; replace `listConversations(…).find(…)` by `listChats` + `getChatHistory` and `sendConversationMessage` by `sendMessage` from `src/lib/iac/chat-service.ts`; keep the asserted values (same Quote / Chat ids, Experience context `c9f9faf7…`, first message contains "Nặn gốm thủ công", reply text visible to both participants, no Booking); log it

### Tests first (Phase B)

- [ ] T029 [P] [US1] Handoff tests in `tests/unit/iac-handoff.test.ts` for `commercial-handoff-service.ts`: `createChatHandoff(agency, c9f9faf7…, { source: 'Explore' })` → Chat `source 'Explore'`, `status 'Active'`, one message `message_kind 'User Text'`, `sender_user_id ac233721…`, `experience_id c9f9faf7…`, text contains "Nặn gốm thủ công" and `/explore/experiences/c9f9faf7…` (#18, #7); `{ source: 'Provider Profile' }` → `source 'Provider Profile'`; `{ source: 'AI Matching', matchingSessionId }` → stored; Quote handoff → message `Quote Request`, second Quote → no new message (unchanged); Quote Request row `source` = `Explore` from Explore and `Matching` + `matching_session_id` from AIT (`quote_source_chk`, analyze M5); handoff results include `chat_status 'Active'` and `is_new_session` (true on the first Chat handoff, false after; FR-001 output, analyze H3); Provider user's `unread_count` + 1 per context message (#26); no row anywhere with `status 'Open'`, `message_kind 'Text'` or `'Experience Context'` after the calls (Q2); Explore/AIT handoff after a BKG-created Active Chat for the pair reuses it
- [ ] T030 [P] [US1] Route tests in `tests/integration/iac-handoff-routes.test.ts`: `POST /api/demo/handoff` with `chat_source 'Provider Profile'` → that source; invalid `chat_source` → 400 and nothing written; `POST /api/ait/sessions/{id}/chat` and `/quote` → Chat `source 'AI Matching'`, `matching_session_id = {id}`; every handoff response keeps its existing fields and adds `chat_status`, `is_new_session` (H3); `GET /api/demo/conversations` route file no longer exists (Q10)
- [ ] T031 [P] [US1] BKG sync test in `tests/unit/iac-bkg-sync.test.ts`: after `createChatHandoff` for the demo pair, `createBooking(DEMO_IDENTITIES.provider, …)` for the demo Agency writes its Booking Update into that Chat (no second Active Chat); with no Chat for the pair, the Booking creates one with `source 'Booking'` and both participants; existing `tests/unit/bkg-agency-sync.test.ts` stays green unchanged
- [ ] T032 [P] [US1] Chat button test in `tests/unit/iac-chat-open-button.test.ts` for the pure helper `chatOpenOutcome(result)` in `src/app/messages/chat-open.ts`: 200 → navigate `/messages?chat_session_id=<id>`; error → message, no navigation (same style as `handoffOutcome` in `src/app/ai-matching/matching-view.ts`)
- [ ] T033 [P] [US1] Composer test in `tests/unit/iac-composer.test.ts` for the pure helper `composerState({ text, pending, chatStatus })` in `src/app/messages/composer-state.ts`: Send disabled when trimmed empty, over 4000 code points, `pending` true (Q8), or Chat `Closed` (read-only); counter `n/4000`
- [ ] T034 [US1] Run `npx vitest run tests/unit/chat-markdown.test.ts tests/unit/iac-handoff.test.ts tests/integration/iac-handoff-routes.test.ts tests/unit/iac-bkg-sync.test.ts tests/unit/iac-chat-open-button.test.ts tests/unit/iac-composer.test.ts tests/unit/iac-open-race.test.ts`; confirm the new tests fail for the right reason (old values / missing helpers / `_text_` still italic); paste the output into `docs/build/build-log.md`

### Code (Phase B)

- [ ] T035 [P] [US1] Remove the `_text_` rule from `renderChatMarkdown` in `src/lib/iac/markdown-utils.ts` (makes T026 pass)
- [ ] T036 [US1] `src/lib/demo/commercial-handoff-service.ts`: `createQuoteHandoff` / `createChatHandoff` become `async`, take `{ source, matchingSessionId? }`, write the Quote Request `source` from its own enum (`Matching` / `Explore`, M5), return `chat_status` and `is_new_session` too (H3), run quote lookup/insert and `openChatLocked` + context message in one `withChatWriteLock`; context message per #18; remove `openPairChat`, `sendContextMessage`, `listConversations`, `sendConversationMessage` (makes T027–T029 pass)
- [ ] T037 [US1] Callers: `src/app/api/demo/handoff/route.ts` (optional `chat_source`, default `Explore`), `src/app/explore/ProviderChatAction.tsx` (sends `chat_source 'Provider Profile'`), `src/app/api/ait/sessions/[id]/chat/route.ts` and `…/quote/route.ts` (`source 'AI Matching'`, `matchingSessionId = params.id`); delete `src/app/api/demo/conversations/route.ts` and `src/app/api/demo/conversations/[id]/messages/route.ts` (makes T030 pass)
- [ ] T038 [US1] `src/lib/booking/agency-sync.ts`: replace the Chat creation block by `newPairChatOperations({ source: 'Booking', … })` and the pair lookup fallback by `findActivePairChat`, keeping the #56 source-Chat preference and the unread +1 (makes T031 pass; `bkg-*` tests unchanged)
- [ ] T039 [P] [US1] `src/app/messages/chat-open.ts` (`chatOpenOutcome`) and `src/app/messages/ChatOpenButton.tsx` (POST `/api/iac/chats` `{ source 'Booking', booking_id }`); use it for the Chat link in `src/app/provider/[providerId]/bookings/[bookingId]/page.tsx` (BKG135) and `src/app/agency/[agencyId]/bookings/[bookingId]/page.tsx` (BKG138) (makes T032 pass)
- [ ] T040 [US1] `src/app/messages/composer-state.ts` and `src/app/messages/page.tsx`: list from `GET /api/iac/chats` (name, organization, preview, time, unread badge, Active/Closed), history from `GET /api/iac/chats/{id}/messages` with "Tải tin nhắn cũ hơn", text through `renderChatMarkdown`, Send through `POST …/messages` with the composer rules, Closed → read-only notice; keep `?chat_session_id=` selection (makes T033 pass)

**Checkpoint**: full suite green; quickstart §3 steps 1–8 in the browser.

---

## Phase 5: Polish & cross-cutting

- [ ] T041 Run `npm test` and `npm run lint`; record the last lines in `docs/build/build-log.md`; confirm no other test file changed than T018, T026–T028 (`git diff --stat main -- tests`)
- [ ] T042 Demo (rule 7, lesson #18): stop any dev server, `npm run demo:reset`, one `npm run dev`; run quickstart §2 by curl and §3 in the built-in browser (Explore, AIT and BKG on one Chat for one pair); stop and restart the server and confirm the sent messages and unread counts are still there (SC-004, BR-005, analyze L1); read response bodies, label each step clicked vs curl-checked; record in `docs/build/build-log.md`
- [ ] T043 [P] `docs/build/mvp-alpha-checklist.md`: add IAC (F-CHAT-01..03 demo path) to §1; add to §3 the known limitations (a) duplicate message possible on network retry, Send disabled while pending, no `client_message_id` (Q8); (b) Provider cannot start a Chat from a Quote Request yet (FR-001, Q5, analyze M4); (c) edge "sender loses account access while Chat is open" not handled until AUT (analyze L2); (d) Close Chat and attachments upload in 015/016
- [ ] T044 [P] Update `docs/build/claude-context/03-module-status.md` (IAC round 1 status) and `specs/014-iac-core/pr-notes.md` (shared files for BKG / AIT / EXP owners: `agency-sync.ts`, AIT chat/quote routes, `ProviderChatAction.tsx`, `commercial-handoff-service.ts`; PR #16 reference and markdown author)
- [ ] T045 Build-log entry for the whole run in `docs/build/build-log.md`; commit `feat(IAC): US-1 F-CHAT-01..03 shared chat service, list, history, send`; STOP for the human to push and open the PR

---

## Dependencies & execution order

- Setup (T001–T002) → Foundational (T003–T010) → Phase A (T011–T025) → Phase B (T026–T040) → Polish (T041–T045).
- Inside each phase: tests → run and see them fail (T007, T019, T034) → code.
- T026–T028 (approved) run before T035 / T036.
- T013(b) depends on the shared lock (T010) and `openChat` (T020), not on T038: `createBooking` already runs inside `withBookingWriteLock`, which T010 makes the same queue (analyze M2). T024 also runs (b) with a separate chat lock to show it fails.
- T036 needs T020 (`openChatLocked`); T040 needs T023 (routes) and T035 (markdown).

## Parallel opportunities

- T003–T006 (four test files); T008–T009.
- Phase A tests T011–T017 (seven files).
- Phase B tests T029–T033; code T035, T039 alongside T036–T038.
- Polish T043, T044.

## Implementation strategy

MVP = Phase A: the shared service and API are usable by curl and already fix the pair rule for the
new route. Phase B moves every existing creator onto it and replaces the page; ship both in one PR,
because the old handoff code keeps writing `Open` / `Text` until Phase B lands.
