# Implementation Plan: IAC round 2 — Close Chat (F-CHAT-04)

**Branch**: `015-iac-close` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md) (snapshot of `docs/spec/specs/spec-IAC.md`)

**Input**: Feature specification from `specs/015-iac-close/spec.md`

## Summary

US-1 (P1), round 2 of 3: F-CHAT-04 lets either participant close an Active Chat (confirm dialog,
optional reason in `audit_logs`), the Closed Chat stays readable and read-only, and the next
interaction opens a new Active Chat through the round-1 entry points. BKG Booking Updates keep
FR-008 (a Closed Chat is never used). Same stack and structure as `specs/014-iac-core`. See
[research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js >= 22

**Primary Dependencies**: Next.js 14 (App Router), React 18 — already in `package.json`; no new dependency

**Storage**: shared JSON runtime `src/lib/demo/json-repository.ts` (`applyBatch`); tests use the volatile copy

**Testing**: Vitest 2 (`npm test`), TypeScript check (`npm run lint`)

**Target Platform**: local Next.js development server on macOS and Windows, free tools only

**Project Type**: web application — the one Next.js project, collocated API routes

**Performance Goals**: none stated

**Constraints**: `data/` unchanged; no existing test changes (R7); 882 tests stay green; one in-process
write lock shared with BKG; demo session instead of AUT; one dev server per `runtime.json`

**Scale/Scope**: seed has 2 Closed and 6 Active Chats; F-CHAT-04 only

## Scope and trace

In scope: FR-004, BR-019, BR-020, BR-021, SC-011..SC-014, AC-IAC-CLOSED, AC-IAC-NAV, #29–#38;
screens COM048 / COM065 (Close Chat, read-only view). Out of scope: F-CHAT-05 (016), AIT F-MATCH-13
(#38), Provider start from a Quote Request (checklist §3 #51), AUT.

**Phase A** (service + API, curl) and **Phase B** (screens). B needs A.

| Spec item | Plan element | Test level | Phase |
|---|---|---|---|
| FR-004, BR-019, SC-011, #29: Agency user and Provider user each close; output fields | `closeChat` | unit + API | A |
| SC-012, #29: non-participant, unknown id, Guest, UBND, HDT → 403, nothing written | `requireParticipant` | unit + API | A |
| #30: reason trimmed, ≤ 500 code points, audit row `chat.close`; > 500 / non-string → 400 | `closeChat` | unit | A |
| #31, BR-021: close a Closed Chat → 409, nothing written | `closeChat` | unit + API | A |
| #32: `success_message` text | `closeChat` | unit | A |
| #37: no message, no unread change on close | `closeChat` | unit | A |
| BR-020, SC-013: messages/attachments unchanged; history readable after close | `getChatHistory` | unit + API | A |
| #34: history `closed_at`, `closed_by_name` for a Closed Chat only | `getChatHistory` | unit + API | A |
| SC-014, BR-021: send after close → 409; reading history keeps Closed | `sendMessage`, `getChatHistory` | unit + API | A |
| AC-IAC-NAV: list/history reads never close | read paths | unit | A |
| #38, Q9: races close/send, close/open, close/close | seams + shared lock (+ mutation) | unit | A |
| #35, AC-IAC-CLOSED: after close, Explore handoff and BKG135 open create a new Active Chat; Closed listed | round-1 entry points | unit + API | A |
| #36, FR-008 (spec-BKG): Booking Update after close goes to a new Active Chat `source Booking` (end to end) | `agency-sync.ts` unchanged | integration (+ mutation) | A |
| #33: confirm dialog, reason counter n/500, Cancel sends nothing | `closeReasonState`, page | unit + demo | B |
| #34, #35: read-only notice and hint, no reopen button | `closedNotice`, page | unit + demo | B |

## Constitution Check

| Principle | Result | Reason |
|---|---|---|
| I. Spec is the source of truth | PASS | Every row cites FR-004, BR-019–021, SC-011–014, AC-IAC-CLOSED/NAV, #29–#38. `closed_at ≥ latest sent_at` follows the schema trigger `chat_message_not_closed` (research R1), not a new requirement. |
| II. Business rules test-first | PASS (planned) | A failing test before every code task, race tests with seams and a mutation run, denied-writes-nothing snapshots; no existing test changes (R7). |
| III. Thin vertical slice | PASS | Phase A service + API, Phase B screens; F-CHAT-05 separate. |
| IV. Synthetic data, no secrets | PASS | Seed only; demo identities. |
| V. Humans approve every change | PASS | Branch `015-iac-close`; agent commits and stops; the human pushes and merges. |

Post-design re-check: unchanged.

## Project Structure

```text
specs/015-iac-close/  spec.md, plan.md, research.md, data-model.md, quickstart.md, contracts/close-api.md, tasks.md
src/lib/iac/chat-service.ts                 # A: closeChat; sendMessage seam; history closed_at / closed_by_name
src/app/api/iac/chats/[id]/close/route.ts   # A: POST close
src/app/messages/close-chat.ts              # B: closeReasonState, closedNotice (pure)
src/app/messages/page.tsx                   # B: Close button, confirm dialog, read-only notice
tests/unit/iac-close-*.test.ts, tests/integration/iac-close-*.test.ts
```

## UI choices (plan only)

- The Close button sits in the conversation header, right side, only for an Active Chat.
- The dialog is an in-page panel (no browser `confirm`, so the reason field fits): textarea, counter
  `n/500`, buttons "Hủy" and "Đóng hội thoại" (disabled over 500 or while pending).

## Complexity Tracking

| Item | Why | Consequence |
|---|---|---|
| Login and RBAC | AUT not on `main` | Demo session; participant check in code (#29). |
| Shared lock with BKG | Close/Send/Open/Booking must serialise | One Node process only (checklist §3 #53). |
| AIT F-MATCH-13 not built | Should, other module (#38) | Checklist §3 row; `closed_at` is returned for later use. |
