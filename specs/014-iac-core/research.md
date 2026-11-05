# Research: IAC core — open, send, list and history (F-CHAT-01..03)

Sources: `spec.md` (snapshot of `docs/spec/specs/spec-IAC.md`, incl. #18–#20), `data/schema.sql`
(`chat_sessions`, `chat_participants`, `chat_messages`, `chat_attachments`), the human decisions
Q1–Q10 of 2026-11-05 (memory handoff), and the code on `main` `f7d2a54`.
The interpretations of the first plan review were decided by the human on 2026-11-05 as
spec-IAC #21–#27; #28 adds `experience_id` / `booking_id` to `message_history` (R12).

## R1. What exists on `main` and what is wrong

- `src/lib/demo/commercial-handoff-service.ts` opens pair Chats for Explore and AIT and serves the
  `/messages` page through `/api/demo/conversations`. It writes values outside the schema:
  `chat_sessions.status = 'Open'` (schema: Active | Closed), `message_kind = 'Text'` and
  `'Experience Context'` (schema: User Text | Quote Request | Booking Update | Attachment), and
  `source = 'Explore'` for every handoff, also from AIT (#19).
- `openPairChat` looks for `status !== 'Closed'`, while BKG `src/lib/booking/agency-sync.ts` looks for
  `status === 'Active'`. After an Explore/AIT handoff (status `Open`), a Booking event for the same
  pair creates a second open Chat. Same pair, two threads: breaks FR-001, AC-IAC-PAIR.
- Missing: Closed check on send (BR-021), 4000-character limit (FR-002), unread increment and reset
  (BR-017), 50-message pagination (BR-015), participant name and organization (FR-003), role filter
  (BR-016), sort on `last_message_at` with a defined tie-break (BR-013).

## R2. One chat service (Q1)

- **Decision**: new `src/lib/iac/` with `chat-pairs.ts` (find the Active pair Chat, build the
  operations of a new pair Chat), `chat-service.ts` (F-CHAT-01..03), `chat-lock.ts`. The handoff
  service (Explore, AIT) and BKG `agency-sync.ts` both call `chat-pairs.ts`, so the "at most one
  Active Chat per pair" check lives in one place. PR #16 (`003-iac-core`) is not merged; it is reference only.
- **Rationale**: Q1; FR-001 "at most one Active Chat"; one fix for both creators.
- **Alternatives**: merge PR #16 (rejected Q1: it trusts `x-mock-user-id` / `x-mock-role` client
  headers, checklist §3 #30, and has its own seed accessor outside the JSON runtime).

## R3. Markdown (Q1, Q7, #20)

- **Decision**: bring `src/lib/iac/markdown-utils.ts` and `tests/unit/chat-markdown.test.ts` from
  PR #16 commit `814ac5b` (author mizaki311) into this branch in one commit with that author
  (`git checkout 814ac5b -- <2 files>` + `git commit --author="mizaki311 <…>"` with the line
  "(cherry picked from commit 814ac5bc584a37811ea69eee870d59556789361f, two files only)"). A plain
  `git cherry-pick -x 814ac5b` would bring 21 files, including PR #16's chat service and a
  `tsconfig.tsbuildinfo` change, so it is not usable as is.
- **Conflict with #20**: PR #16 renders `_text_` as italic, and its test asserts it
  (`chat-markdown.test.ts`, case "renders italic markdown *text* or _text_"). #20 says only
  `**bold**` and `*italic*` are rendered and everything else is shown as text. Changing that test is
  a test edit, approved by the human (analyze H1, 2026-11-05) ( replace the `_text_` expectation by "`_text_` stays
  literal", in the tests-first commit, logged).
- Rendering: escape `& < > " '` first, then `**…**` → `<strong>`, then `*…*` → `<em>`. The page
  renders the result with `dangerouslySetInnerHTML` only from this function.

## R4. Write lock (Q9)

- **Decision**: `withChatWriteLock` is the same in-process mutex as `withBookingWriteLock`
  (one shared tail in `src/lib/booking/write-lock.ts`). Every Chat creation and every message write
  runs inside it; BKG already creates Chats inside `withBookingWriteLock`, so both creators are
  serialised by one lock. Not re-entrant: locked code calls the `…Locked` helpers (lesson #14).
- Race test (lesson #13): test-only seam `afterPairCheck` in `openChat` pauses between "find Active
  pair Chat" and "write"; two concurrent opens for one pair → one Chat, `is_new_session` true once.
  Mutation run: with the lock removed the test fails. A second race test: `openChat` paused at the
  seam while a BKG Booking event runs for the same pair → still one Active Chat.
- **Consequence**: `createQuoteHandoff` / `createChatHandoff` become `async`. Existing tests call
  them synchronously: `tests/integration/ait-exp-br-gaps.test.ts` (lines 71–102) and
  `tests/integration/demo-functional-flow.test.ts` (lines 19–38) need `await` / `.rejects` added and
  the removed `listConversations` / `sendConversationMessage` replaced by the new service calls,
  with the same expected values. Approved by the human (analyze H2, 2026-11-05); logged (R13).
- **Alternatives**: two separate locks (rejected: a BKG event and a handoff could each create an
  Active Chat); keep everything synchronous without a lock (rejected by Q9).

## R5. F-CHAT-01 sources and context (Q3, Q4, Q5, #18, #19)

| Entry point | Actor | `source` | Extra on the Chat | Context message |
|---|---|---|---|---|
| AI Tour Matching Chat / Request Quote | Agency | `AI Matching` | `matching_session_id` | Chat: `User Text` (#18); Quote: `Quote Request` |
| Explore Experience card / detail | Agency | `Explore` | — | same |
| Explore Provider page | Agency | `Provider Profile` | — | same, for the Experience the page passes today (#24) |
| BKG135 (Provider) / BKG138 (Agency) Chat button | Provider or Agency of that Booking | `Booking` | `booking_id` | none (#24) |

- `source` and `matching_session_id` are written when the Chat is created and not changed on reuse;
  `experience_id`, `quote_request_id`, `booking_id` on the session are set to the latest handoff
  context, as `main` does today and `demo-functional-flow.test.ts` asserts; each context message
  also carries its own `experience_id` / `quote_request_id` / `booking_id` (schema C1).
  (#21)
- Context message text (#7, #18): `Xin chào, tôi quan tâm đến trải nghiệm này: **{experience name}**
  (/explore/experiences/{experience_id})`. Quote text unchanged from `main`; the Quote Request row gets the schema value of its own enum (`quote_source_chk`): `Matching` + `matching_session_id` from AI Tour Matching, `Explore` from Explore and the Explore Provider page (analyze M5).
- A Local Provider may open a Chat only with `source = Booking` and a Booking of its own (Q5,
  FR-001); Quote-Request-based Provider initiation is out of scope (Q5).
- `chat_matching_link_chk`: `source = AI Matching` requires `matching_session_id` → the AIT routes
  pass the matching session id they already check.

## R6. F-CHAT-02 send

- Authorize (participant, BR-002/BR-003; Agency or Provider only, BR-001) → validate (trimmed text
  not empty; at most 4000 characters counted as Unicode code points after trim (#25); Chat
  Active, else `409 CHAT_CLOSED`, BR-021) → lock → write `User Text` with sender, `sent_at`,
  the Chat's current context ids; `last_message_at` = `sent_at`; the other participant's
  `unread_count` + 1 (#26).
- Q8: the page disables Send while a send is pending; no `client_message_id`. A network retry can
  still store a message twice → checklist §3 known limitation.

## R7. F-CHAT-03 list (BR-013, BR-016, FR-003)

- Chats where the actor's `user_id` is in `chat_participants` and the Chat's pair matches the
  actor's role (`agency_id` = actor's Agency, or `provider_id` = actor's Provider).
- Row: `chat_session_id`, `chat_status`, `participant_name` = counterpart user's `full_name`,
  `organization` = counterpart `agency_profiles.company_name` or the published
  `provider_profile_versions.business_name` (#22), `last_message_preview` (latest message text,
  first 120 characters; Attachment without text → file name not needed in round 1, the seed has text),
  `last_message_at`, `unread_count` (actor's row).
- Order: `last_message_at` (or `started_at` when empty) newest first, then `chat_session_id`.

## R8. F-CHAT-03 history and pagination (BR-014, BR-015, Q6)

- Messages ordered by (`sent_at`, `message_id`). First page = latest 50, returned oldest → newest.
  `before_cursor` = `message_id` of the oldest loaded message; the next page = the 50 messages
  before it in that order. `has_more_messages` = older messages remain. Unknown cursor or a cursor
  of another Chat → `400 VALIDATION_ERROR`.
- Each item: `message_id`, `text`, `attachments` (read-only metadata from `chat_attachments` +
  `stored_files`: `attachment_id`, `file_name`, `file_type` = `media_type`, `file_size` =
  `file_size_bytes`), `experience_id`, `booking_id` (#28), `sender_name` (sender's `full_name`; Booking Update without sender →
  "Hệ thống"), `sent_at`, plus `message_kind` for display.
- Closed Chats stay listed and readable (BR-020 context, BR-021); the page shows them read-only.

## R9. Unread reset (BR-017, #10, #11)

- Reading the first page (no `before_cursor`) of a Chat sets the actor's `unread_count` to 0 and
  `last_read_message_id` to the newest message id (keeps BKG `recipientReadStatus` #27 working).
  Older pages do not write. (#23): the reset happens on the history read (GET), like BKG's
  expiry-on-read; authorize → validate → write; a denied read writes nothing.

## R10. Routes (Q10)

- New: `POST /api/iac/chats` (F-CHAT-01, `source = Booking` only in round 1; Explore/AIT keep their
  handoff routes, which call the same service), `GET /api/iac/chats` (list),
  `GET /api/iac/chats/{id}/messages` (history + reset), `POST /api/iac/chats/{id}/messages` (send).
- Removed: `src/app/api/demo/conversations/route.ts`, `…/[id]/messages/route.ts`. The `/messages`
  page stays (COM048 for Agency, COM065 for Provider) and moves to the new routes.
- `tests/integration/auth-no-header.test.ts:79–88` moves from `/api/demo/conversations` to
  `GET /api/iac/chats` (approved Q10; logged).

## R11. Runtime data (Q2)

- Code writes only schema values. Rows already written as `Open` / `Text` / `Experience Context` in a
  local `.demo-data/runtime.json` are fixed by `npm run demo:reset` (quickstart). No migration code.

## R12. Decided as spec-IAC #21–#28 (2026-11-05)

| # | Interpretation used by this plan |
|---|---|
| #21 | On reuse, `source` / `matching_session_id` stay as created; the session's `experience_id` / `quote_request_id` / `booking_id` follow the latest handoff; every context message carries its own ids. |
| #22 | `participant_name` = counterpart user's `full_name`; `organization` = Agency `company_name` or published Provider `business_name`. |
| #23 | Unread reset when the participant loads the first history page; `last_read_message_id` = newest message. |
| #24 | Booking-source open writes no context message; the Explore Provider page sends the #18 context message for the Experience it passes. |
| #25 | 4000 = Unicode code points of the trimmed text; the trimmed text is stored. |
| #26 | Each stored message (incl. context messages) adds 1 to the other participant's `unread_count`. |
| #27 | Unknown Chat, non-participant, Guest, UBND, HDT → 403 FORBIDDEN (as spec-BKG #67). |
| #28 | `message_history` items also carry optional `experience_id`, `booking_id`. |

## R13. Existing tests that change

| File | Change | Status |
|---|---|---|
| `tests/integration/auth-no-header.test.ts:79–88` | route `/api/demo/conversations` → `/api/iac/chats` | approved (Q10) |
| `tests/unit/chat-markdown.test.ts` (from PR #16) | `_text_` case → stays literal (#20) | approved (H1) |
| `tests/integration/ait-exp-br-gaps.test.ts:71–102` | `await` / `.rejects` (async handoff, R4) | approved (H2) |
| `tests/integration/demo-functional-flow.test.ts:19–38` | `await`; new list/history/send calls, same expected values | approved (H2) |
