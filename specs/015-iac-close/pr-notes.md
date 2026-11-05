# PR notes: IAC round 2 (`015-iac-close`)

- Scope: F-CHAT-04 Close Chat (FR-004, BR-019–BR-021, SC-011–SC-014, AC-IAC-CLOSED, AC-IAC-NAV); spec-IAC #29–#38.
- Also in this PR: CLAUDE.md §5 brought up to date with `main` `65f4b5b` (PR #44, 882 tests, CI #18, PR #16 closed).
- New: `closeChat` in `src/lib/iac/chat-service.ts`, `POST /api/iac/chats/{id}/close`, Close button / confirm panel /
  read-only notice on `/messages` (`src/app/messages/close-chat.ts`). History adds optional `closed_at`, `closed_by_name`.
- Close writes `chat_sessions` (status, closed_at, closed_by) and one `audit_logs` row `chat.close` (reason only there, #30).
- BKG unchanged: Booking Updates after a Close go to a new Active `source Booking` Chat (spec-BKG FR-008 step 3, #36),
  now covered end to end by `tests/integration/iac-close-booking.test.ts`.
- No existing test changed.
