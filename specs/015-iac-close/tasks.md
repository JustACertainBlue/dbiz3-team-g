---
description: "Task list for IAC round 2 — Close Chat (F-CHAT-04)"
---

# Tasks: IAC round 2 — Close Chat (F-CHAT-04)

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/close-api.md](contracts/close-api.md), [quickstart.md](quickstart.md)

**Tests**: Required (Principle II). Every test task comes before its code task and is seen failing because the code is missing. **No existing test is changed** (research R7); if one has to change, stop and ask.

**Organization**: US-1 (P1) round 2. **Phase A** service + API, **Phase B** screens. Out of scope: F-CHAT-05, AIT F-MATCH-13, Provider start from a Quote Request.

## Shared test fixtures

Reuse `tests/unit/iac-fixtures.ts` (round 1): demo Agency `AGENCY` (user `ac233721…`), demo Provider `PROVIDER` (user `c2c7fe0d…`), `AGENCY_CHAT` `a0b57355…` (Agency ↔ Phú Vinh, Provider user Quách Minh Tâm `40ed08b5…`), `PROVIDER_CHAT` `35ed4094…`, `AGENCY_BOOKING` `0971a1b6…`, `EXPERIENCE` `c9f9faf7…`, `writeSnapshot()` (+ `audit_logs` added locally in the new tests).

---

## Phase 1: Setup

- [ ] T001 Confirm `.specify/feature.json` → `specs/015-iac-close`; baseline `npm test` (882 passed, 137 files), `npm run lint`, `--check`; record in `docs/build/build-log.md`

---

## Phase 2 (Phase A): service and API (Priority: P1) 🎯

### Tests first

- [ ] T002 [P] [US1] Close tests in `tests/unit/iac-close-chat.test.ts` for `closeChat(session, chatId, { closeReason }, options)` in `src/lib/iac/chat-service.ts`: Agency user closes `AGENCY_CHAT` and Provider user closes `PROVIDER_CHAT` → `{ chat_session_id, chat_status 'Closed', closed_at, closed_by: actor userId, success_message: #32 text }`; row `status Closed`, `closed_at`, `closed_by` (FR-004, BR-019, SC-011, #29, #32); one `audit_logs` row `chat.close` / `chat_session` / `target_id` / `actor_user_id`, `change_or_result` `{from:'Active', to:'Closed', close_reason:'Đã chốt lịch'}`, without `close_reason` when absent or whitespace (#30); 500 code points accepted, 501 → `VALIDATION_ERROR` 400, non-string → 400 (#30); `closed_at` ≥ latest message `sent_at` (R1); no message, unread counts unchanged (#37); messages and attachments of the Chat deep-equal before/after (BR-020, SC-013)
- [ ] T003 [P] [US1] Denied/invalid tests in the same file: close twice → `CHAT_CLOSED` 409 and the row/audit unchanged (#31, BR-021); demo Agency on `PROVIDER_CHAT`, unknown id, Guest, UBND, HDT → `FORBIDDEN` 403; every rejected call leaves the write snapshot (incl. `audit_logs`) deep-equal (lesson #15)
- [ ] T004 [P] [US1] After-close tests in `tests/unit/iac-close-after.test.ts`: `sendMessage` → 409 (SC-014); `getChatHistory` → `chat_status 'Closed'`, `closed_at`, `closed_by_name 'Lý Gia Hân'`, the same messages as before, and status still Closed after the read (#34, SC-013, SC-014); Active Chat history has no `closed_at` / `closed_by_name` keys; `listChats` keeps the Closed Chat with `chat_status 'Closed'` (#35); list/history reads leave an Active Chat Active (AC-IAC-NAV); after close, `createChatHandoff(AGENCY, EXPERIENCE)` for a closed demo-pair Chat and `openChat(AGENCY, { source: 'Booking', bookingId: AGENCY_BOOKING })` each create a new Active Chat (`is_new_session true`) and leave the Closed row deep-equal (AC-IAC-CLOSED, #35)
- [ ] T005 [P] [US1] Race tests in `tests/unit/iac-close-race.test.ts` (#38, lesson #13): (a) `sendMessage` paused at `afterStatusCheck` + `closeChat` at once → message stored, `sent_at <= closed_at`, Chat Closed; (b) `closeChat` paused at `afterStatusCheck` + `sendMessage` at once → send rejects `CHAT_CLOSED`, no new message; (c) `closeChat` paused + `createChatHandoff` for the same pair at once → handoff gets a new Active Chat, the Closed row has no new message; (d) two `closeChat` at once → one fulfilled, one `CHAT_CLOSED`; one audit row
- [ ] T006 [P] [US1] End-to-end C8 test in `tests/integration/iac-close-booking.test.ts` (#36, spec-BKG FR-008, #13, #56): Agency `createChatHandoff(AGENCY, EXPERIENCE)` → Provider `closeChat` → Provider `createBooking` for the demo Agency (fixture body of `iac-open-race.test.ts`, `now` = `SEED_NOW`) with `source_chat_session_id` = the Closed Chat → the Booking Update is in a new Active Chat `source 'Booking'`, `booking_id` set, both participants; the Closed Chat row and messages deep-equal; exactly one Active Chat for the pair; then `createChatHandoff(AGENCY, EXPERIENCE)` reuses the new Chat (`is_new_session false`)
- [ ] T007 [P] [US1] API tests in `tests/integration/iac-close-api.test.ts` for `POST /api/iac/chats/{id}/close`: 200 shape per contract; 409 second close; 400 reason 501; 403 agency on `PROVIDER_CHAT`, unknown id, guest, ubnd, hdt; then `POST …/messages` 409 and `GET …/messages` 200 with `closed_at`, `closed_by_name`; error body `{ error: { code, message } }`
- [ ] T008 [US1] Run `npx vitest run tests/unit/iac-close-*.test.ts tests/integration/iac-close-*.test.ts`; confirm they fail because `closeChat`, the seam, the history fields and the route are missing; paste the output into `docs/build/build-log.md`

### Code

- [ ] T009 [US1] `closeChat` (authorize → validate → lock → re-check → `applyBatch` chat row + audit row; `closed_at` = max(now, latest `sent_at`)) and the `afterStatusCheck` seam in `sendMessage` in `src/lib/iac/chat-service.ts` (makes T002, T003, T005 pass)
- [ ] T010 [US1] `getChatHistory`: `closed_at`, `closed_by_name` for Closed Chats in `src/lib/iac/chat-service.ts` (makes T004 pass; T006 passes with no BKG change)
- [ ] T011 [US1] Route `src/app/api/iac/chats/[id]/close/route.ts` (makes T007 pass)
- [ ] T012 [US1] Mutation runs, each restored, outputs in `docs/build/build-log.md`: (1) drop the Closed re-check → T003 close-twice red; (2) skip `requireParticipant` (find the Chat only) → T003 outsider red; (3) `closeChat` without the lock → T005 (b)/(d) red; (4) `sendMessage` checks the status outside the lock → T005 (a) or (b) red; (5) BKG lookup accepts a Closed source Chat (`samePairActive` ignores status) → T006 red

**Checkpoint**: quickstart §2 by curl.

---

## Phase 3 (Phase B): screens (Priority: P1)

- [ ] T013 [P] [US1] Helper tests in `tests/unit/iac-close-ui.test.ts` for `src/app/messages/close-chat.ts`: `closeReasonState('  Xong ')` → `{ counter '4/500', canConfirm true }`; 500 code points ok, 501 → `canConfirm false`; `pending` → false (#33); `closedNotice({ chat_status 'Closed', closed_at, closed_by_name })` → contains "Đã đóng bởi Lý Gia Hân" and "chỉ xem" and the #35 hint; Active → `null`
- [ ] T014 [US1] Run T013 and confirm it fails (module missing); paste output into the build log
- [ ] T015 [US1] `src/app/messages/close-chat.ts` and `src/app/messages/page.tsx`: "Đóng hội thoại" in the header while Active; dialog with reason textarea, counter, "Hủy" / "Đóng hội thoại" (#33); on 200 show `success_message`, reload list + history; Closed → notice from `closedNotice`, no composer, no Close, no reopen button (#34, #35) (makes T013 pass)

---

## Phase 4: Polish

- [ ] T016 `npm test` three times in a row + `npm run lint`; `git diff --stat main -- tests` shows only new files
- [ ] T017 Demo (rule 7): stop servers, `npm run demo:reset`, one dev server; quickstart §2 by curl, §3 in the built-in browser (both roles close, read-only view, new Chat from Explore and from BKG135); label clicked vs curl-checked; record in the build log
- [ ] T018 [P] `docs/build/mvp-alpha-checklist.md` §3: row 53 → Close done (attachments remain); new row for AIT F-MATCH-13 not built (#38); §1 IAC row adds the Close step
- [ ] T019 [P] `docs/build/claude-context/03-module-status.md` IAC row; `specs/015-iac-close/pr-notes.md`
- [ ] T020 Build-log entry; commit `feat(IAC): US-1 F-CHAT-04 close Chat, read-only history`; STOP for the human to push and merge

## Dependencies

Setup → Phase A tests (T002–T007) → T008 → code T009–T011 → T012 → Phase B (T013–T015) → Polish. T006 needs only T009 (BKG unchanged).

## Parallel

T002–T007 (separate files); T018, T019.

## Strategy

MVP = Phase A (curl). Phase B adds the button and read-only view; both in one PR.
