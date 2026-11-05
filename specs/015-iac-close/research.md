# Research: IAC round 2 — Close Chat (F-CHAT-04)

Sources: `spec.md` (snapshot of spec-IAC incl. #29–#38), `data/schema.sql` (`chat_sessions`
`chat_closed_chk`, trigger `chat_message_not_closed`, `audit_logs`), `data/02-crud-matrix.md:341–343`,
spec-BKG FR-008 / #13 / #56, and the code of round 1 on `main` `65f4b5b`. Every decision below cites
the spec; none is new.

## R1. Close service (FR-004, BR-019, BR-021, #29–#31, #37)

- **Decision**: `closeChat(session, chatId, { closeReason }, options)` in `src/lib/iac/chat-service.ts`.
  Order: `requireParticipant` (403 for non-participant, unknown id, Guest, UBND, HDT — #29) →
  validate `close_reason` (absent or string; trimmed; empty = none; > 500 code points → 400; not a
  string → 400 — #30) → `withChatWriteLock` → re-read the Chat; `Closed` → 409 `CHAT_CLOSED` (#31)
  → one `applyBatch`: `chat_sessions` `status Closed`, `closed_at`, `closed_by` = actor user, plus
  one `audit_logs` row (#30). No message, no unread change (#37).
- `closed_at` = now, but never earlier than the Chat's latest message `sent_at` (round 1 keeps
  `sent_at` monotonic per Chat). Reason: schema trigger `chat_message_not_closed` accepts messages
  with `sent_at <= closed_at` only, so history stays valid (`chat_activity_chk` analog).
- Output (FR-004): `{ chat_session_id, chat_status: 'Closed', closed_at, closed_by, success_message }`
  with the #32 text.
- **Alternatives**: a `Closed`-kind message (rejected: `message_kind` enum has none, #37).

## R2. Concurrency (#38, Q9, lesson #13)

- Close, Send and Open all run in `withChatWriteLock` (shared with BKG). Send already re-reads
  the status inside the lock (round 1); Open plans inside the lock.
- Seams (test-only): `closeChat(…, { afterStatusCheck })` and `sendMessage(…, { afterStatusCheck })`
  pause between the status check and the write; `openChat` keeps `afterPairCheck`.
- Race tests: (a) Send paused inside the lock, Close at the same time → the message is stored and its
  `sent_at <= closed_at`; (b) Close paused, Send at the same time → Send gets 409, no message;
  (c) Close paused, Open (handoff) at the same time → a new Active Chat, the Closed row unchanged;
  (d) two Closes at the same time → one 200, one 409. Mutation: Close without the lock → (b)/(c)/(d) red.

## R3. Read-only history (#34, BR-020, SC-013, SC-014)

- `getChatHistory` adds `closed_at` and `closed_by_name` (closing user's `full_name`) when the Chat is
  Closed; nothing else changes. Reading history never changes `status` (SC-014, AC-IAC-NAV).
- Messages and attachments of a Closed Chat stay byte-identical after Close (BR-020).

## R4. After Close (#35, #36, AC-IAC-CLOSED)

- New interaction only through the round-1 entry points (handoffs, `POST /api/iac/chats` Booking);
  they already create a new Active Chat when the pair has none (round-1 tests T011, T029).
- BKG: `agency-sync.ts` unchanged (#36). End-to-end test: Agency Explore handoff → Provider closes
  through F-CHAT-04 → Provider `createBooking` for the pair → the Booking Update is in a new Active
  Chat with `source Booking` and the `booking_id`; the Closed Chat (row and messages) is unchanged;
  then an Agency Explore handoff reuses that new Chat. Mutation: make the BKG lookup accept a Closed
  source Chat → red.

## R5. Route and UI (#32, #33, #34, #35)

- `POST /api/iac/chats/{id}/close` body `{ close_reason? }` → `200 { data: FR-004 output }`; errors as
  round 1 (`{ error: { code, message } }`).
- COM048 / COM065: "Đóng hội thoại" button in the conversation header only while Active; a confirm
  dialog with an optional reason (counter `n/500`) and Cancel / Confirm (#33); after Close the screen
  shows `success_message`, then the read-only notice "Đã đóng bởi {name} lúc {time} — chỉ xem" and the
  #35 hint; no reopen or new-Chat button. Pure helpers (tested): `closeReasonState(text)` and
  `closedNotice(history)` in `src/app/messages/close-chat.ts`.

## R6. Out of scope

F-CHAT-05 attachments (`016-iac-attach`); AIT F-MATCH-13 (spec-AIT FR-013, Should; #38) → checklist §3;
Provider start from a Quote Request (§3 #51).

## R7. Existing tests

No existing test changes: the history output only gains optional fields (round-1 tests use
`toMatchObject` at that level) and `sendMessage` gains an optional seam.
