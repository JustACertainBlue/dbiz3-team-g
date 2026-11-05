# Implementation Plan: IAC core — open, send, list and history (F-CHAT-01..03)

**Branch**: `014-iac-core` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md) (snapshot of `docs/spec/specs/spec-IAC.md`)

**Input**: Feature specification from `specs/014-iac-core/spec.md`

## Summary

US-1 (P1), round 1 of 3: F-CHAT-01 open or reuse the one Active Chat of an Agency–Provider pair,
F-CHAT-02 send text, F-CHAT-03 Chat list and paginated history with unread counts. One shared chat
service replaces the Chat code of `commercial-handoff-service.ts` and the Chat creation in BKG
`agency-sync.ts`, so Explore, AI Tour Matching and Booking all reuse the same Active Chat and write
only schema values (#18, #19). The `/messages` page (COM048 / COM065) moves to new `/api/iac/chats…`
routes. F-CHAT-04 (Close) is `015-iac-close`; F-CHAT-05 (attachments) is `016-iac-attach`.

Same stack and structure as `specs/013-bkg-schedule`. See [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js >= 22

**Primary Dependencies**: Next.js 14 (App Router), React 18 — already in `package.json`; no new dependency (markdown is a 30-line escape-then-replace function, R3)

**Storage**: shared JSON runtime `src/lib/demo/json-repository.ts` (`demoRepository()`, `applyBatch`); tests use the volatile copy. No PostgreSQL.

**Testing**: Vitest 2 (`npm test`), TypeScript check (`npm run lint`)

**Target Platform**: local Next.js development server on macOS and Windows, free tools only

**Project Type**: web application — the one Next.js project, collocated API routes

**Performance Goals**: none stated; history pages of 50 (BR-015)

**Constraints**: `data/` unchanged; `docs/spec/` changed only by the human (#18–#20 done); 799 tests on `main` stay green apart from the listed test edits (R13); one in-process write lock shared with BKG (R4); demo session instead of AUT; one dev server per `runtime.json` (lesson #19)

**Scale/Scope**: seed has 8 Chats (6 Active, 2 Closed), 8 messages, 16 participants; US-1 F-CHAT-01..03 only

## Scope and trace

In scope: **US-1 (P1)** F-CHAT-01, F-CHAT-02, F-CHAT-03; screens COM048 (Agency) and COM065
(Provider) on `/messages`; Chat buttons on BKG135 / BKG138. Out of scope: F-CHAT-04 Close Chat and
the Close button (015); F-CHAT-05 upload, COM125/COM126 and the Attach button (016; seed attachments
are only listed read-only, R8); Provider initiation from a Quote Request (Q5); DSH018 "Recent
conversations" panel (PRF dashboard; it can call `GET /api/iac/chats` later); AUT login.

**Phase A** (service + API) and **Phase B** (callers and screens: handoffs, BKG sync, `/messages`,
Chat buttons). B needs A. A is demonstrable alone with curl; B with the browser.

| Spec item | Plan element | Test level | Phase |
|---|---|---|---|
| FR-001, BR-004, AC-IAC-PAIR, SC-001: reuse the pair's Active Chat, `is_new_session` | `openChat` | unit + API | A |
| FR-001 at most one Active Chat per pair; edge "same pair opens simultaneously" (Q9) | `withChatWriteLock` + seam race test (+ mutation run) | unit | A |
| FR-001 / BR-021 / AC-IAC-CLOSED: Closed pair Chat → new Active Chat, Closed row unchanged | `openChat` | unit | A |
| #19 `source` per entry point; `matching_session_id` for AI Matching | `openChat` input from each caller | unit + API | A, B |
| FR-001 Provider only with `source = Booking` of its own Booking (Q5); edge "Booking outside scope" | `authorizeOpen` | unit + API | A |
| BR-001, BR-003, BR-016: only Agency / Provider; UBND / HDT / Guest denied | every service | unit + API | A |
| BR-002, SC-002, edge "Chat ID changed by hand": non-participant or unknown Chat → 403 (#27) | `requireParticipant` | unit + API | A |
| FR-002, SC-003: message stored with sender, `sent_at`; `last_message_at` updated; output `message_id`, `sent_at`, `last_message_timestamp` | `sendMessage` | unit + API | A |
| FR-002 empty / whitespace-only → 400, > 4000 → 400 (#25), nothing written | `sendMessage` | unit | A |
| BR-021, SC-014: send into a Closed Chat → 409, nothing written | `sendMessage` | unit + API | A |
| BR-006: messages never edited or deleted (no update/delete path) | repository calls in `chat-service.ts` | unit (snapshot of earlier rows) | A |
| BR-007, #20: `**bold**`, `*italic*`; all else escaped | `renderChatMarkdown` | unit | B |
| FR-003, BR-013, SC-006: list fields, newest first | `listChats` | unit + API | A |
| FR-003 `participant_name`, `organization` (#22) | `listChats` | unit (seed values) | A |
| BR-014, BR-015, SC-008, Q6: oldest → newest, 50 per page, `before_cursor`, `has_more_messages`; > 50 messages; no messages | `getChatHistory` | unit + API | A |
| BR-017, SC-007, #10, #11: unread +1 for the other participant (#26), reset on open (#23) | `sendMessage`, `getChatHistory` | unit + API | A |
| BR-005, SC-004: Chat and history persist (runtime file) and are reloaded | read after write through API | API | A |
| BR-012: context ids on the Chat / message, not attachments (#21) | `openChat` | unit | A |
| #28: `message_history` items carry `experience_id`, `booking_id` | `getChatHistory` | unit + API | A |
| FR-001 output `chat_status`, `is_new_session` on the handoff routes too (analyze H3) | handoff routes | API | B |
| BR-018, SC-010: no Booking created or changed by any Chat action | Booking count/snapshot | unit | A, B |
| #18 context message `User Text` from the Agency with `experience_id`; Quote keeps `Quote Request` | handoff service | unit | B |
| Explore / AIT / Provider page handoffs use the shared service (#19) | `commercial-handoff-service.ts`, routes | unit + API | B |
| BKG event + handoff for one pair → one Active Chat (FR-001; fixes R1) | `agency-sync.ts` uses `chat-pairs.ts` | unit (race) | B |
| COM048 / COM065: list, history, load older, Send disabled while pending (Q8), counter 4000, Closed read-only | `/messages` page | demo | B |
| BKG135 / BKG138 Chat → open `source = Booking` → `/messages?chat_session_id=…` | Chat buttons | API + demo | B |
| Order authorize → validate → write; denied/invalid writes nothing (lesson #15) | every service | unit (deep snapshot) | A |

## Constitution Check

*GATE: checked before Phase 0 and again after Phase 1.*

| Principle | Result | Reason |
|---|---|---|
| I. Spec is the source of truth | PASS | Every row above cites FR-001..003, BR-001..007/012..018/021, AC-IAC-PAIR/CLOSED, SC-001..004/006..008/010/014, #10–#12, #18–#28. The seven interpretations of the first plan review are now spec-IAC #21–#27 (decided 2026-11-05); #28 adds `experience_id` / `booking_id` to `message_history`. |
| II. Business rules test-first | PASS (planned) | tasks.md puts a failing test before every code task, incl. the seam race test with a mutation run (lesson #13) and denied-writes-nothing snapshots (lesson #15). Four existing test files change (R13), all approved (Q10; H1/H2 of 2026-11-05) and logged. |
| III. Thin vertical slice | PASS | Phase A (service + API) and Phase B (callers + screens) form one P1 story end to end; Close and Attach are separate features. |
| IV. Synthetic data, no secrets | PASS | Seed only; demo identities; no key. |
| V. Humans approve every change | PASS | Branch `014-iac-core`; agent commits and stops, the human pushes and merges; the markdown commit keeps author mizaki311 (Q1); shared files of BKG/EXP/AIT are listed in the PR. |

Post-design re-check: unchanged — data-model.md redefines no column; every route traces to FR-001..003.

## Project Structure

### Documentation (this feature)

```text
specs/014-iac-core/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/chat-api.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/lib/iac/
├── chat-lock.ts           # A: withChatWriteLock = shared Booking/Chat mutex (R4)
├── chat-pairs.ts          # A: findActivePairChat, newPairChatOperations (used by service and BKG)
├── chat-service.ts        # A: openChat(+Locked), sendMessage, listChats, getChatHistory
├── chat-access.ts         # A: authorizeOpen, requireParticipant, ChatError
└── markdown-utils.ts      # B: from PR #16 (author mizaki311), adjusted to #20
src/lib/booking/write-lock.ts                      # A: export the shared tail for chat-lock.ts
src/lib/booking/agency-sync.ts                     # B: Chat lookup/creation through chat-pairs.ts — BKG file
src/lib/demo/commercial-handoff-service.ts         # B: async; uses chat-service; source per caller; drop list/send
src/app/api/iac/chats/route.ts                     # A: POST open (source Booking), GET list
src/app/api/iac/chats/[id]/messages/route.ts       # A: GET history (+ reset), POST send
src/app/api/demo/handoff/route.ts                  # B: optional chat_source (Explore | Provider Profile)
src/app/api/ait/sessions/[id]/chat/route.ts        # B: source AI Matching + matching_session_id — AIT file
src/app/api/ait/sessions/[id]/quote/route.ts       # B: same — AIT file
src/app/explore/ProviderChatAction.tsx             # B: sends chat_source Provider Profile — EXP file
src/app/messages/page.tsx                          # B: COM048/COM065 on the new API
src/app/messages/ChatOpenButton.tsx                # B: client button used by BKG135/BKG138
src/app/provider/[providerId]/bookings/[bookingId]/page.tsx   # B: Chat button (BKG135) — BKG file
src/app/agency/[agencyId]/bookings/[bookingId]/page.tsx       # B: Chat button (BKG138) — BKG file
src/app/api/demo/conversations/**                  # B: removed (Q10)
tests/unit/iac-*.test.ts, tests/integration/iac-*.test.ts
```

**Structure Decision**: a new `src/lib/iac/` folder like `src/lib/booking/`; API under
`/api/iac/`. The `/messages` page keeps its URL so every existing "Messages" / "Chat" link still works.

## UI choices (plan only, not in the spec)

- `/messages?chat_session_id=…` selects that Chat; without it the first Chat of the list.
- List row: counterpart name, organization, preview, time, unread badge, "Active" / "Closed".
- History: "Tải tin nhắn cũ hơn" button at the top while `has_more_messages`; markdown rendered (#20).
- Composer: textarea, counter `n/4000`, Send disabled while empty, over 4000 or pending (Q8);
  Closed Chat → composer hidden, "Hội thoại đã đóng — chỉ xem".

## Complexity Tracking

| Item | Why | Consequence / when resolved |
|---|---|---|
| Login and RBAC (F-AUTH-16) | AUT not on `main` | Demo cookie session; participant check in code (BR-002/003). |
| Shared lock with BKG (R4) | Two creators of Active Chats | All Chat and Booking writes are serialised in one process; two processes on one `runtime.json` are not protected (as BKG). |
| GET history writes (unread reset, #23) | No separate "read" endpoint in the spec | After authorize + validate only; denied read writes nothing (tested). |
| Async handoff functions (R4) | Lock needs `await` | Two existing test files get `await` edits (R13, approved H2), logged. |
| Duplicate on network retry (Q8) | No `client_message_id` | Send disabled while pending; checklist §3 known limitation. |
| Shared files of other modules (BKG, AIT, EXP) | Callers of the one chat service | PR lists them for their owners; behaviour of those modules unchanged except `source` / message values. |
| Provider initiation from a Quote Request (FR-001, Q5) | Deferred by Q5 | Checklist §3 known limitation; only `source = Booking` for Providers in this slice. |
| `quote_requests.source` always `Explore` on `main` (analyze M5) | Same bug as the Chat source | T036 writes the Quote Request `source` from its own schema enum: `Matching` + `matching_session_id` (AIT) or `Explore`; listed for the EXP/AIT owners. |
| Edge "sender loses account access while Chat is open" | Needs AUT account status | Checklist §3 known limitation (demo identities are always active). |
| Old runtime rows (`Open`, `Text`, `Experience Context`) | Q2 | `npm run demo:reset`; no migration code. |
