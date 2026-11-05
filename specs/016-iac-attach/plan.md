# Implementation Plan: IAC round 3 — Chat document attachments (F-CHAT-05)

**Branch**: `016-iac-attach` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md) (snapshot of `docs/spec/specs/spec-IAC.md`)

**Input**: Feature specification from `specs/016-iac-attach/spec.md`

## Summary

US-1 (P1), round 3 of 3: F-CHAT-05 lets a participant of an Active Chat send 1–5 documents (PDF, DOC,
DOCX, XLS, XLSX, JPG, JPEG, PNG, ≤ 10 MB each) as one `Attachment` message. Files are stored privately
in the demo runtime and downloaded only by participants, also after the Chat is Closed. An invalid
batch stores nothing. Same stack and structure as `specs/014-iac-core` and `specs/015-iac-close`. See
[research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js >= 22

**Primary Dependencies**: Next.js 14 (App Router), React 18 — already in `package.json`; no new dependency
(multipart parsing with the built-in `Request.formData()`, files with `node:fs`)

**Storage**: shared JSON runtime `src/lib/demo/json-repository.ts` (`applyBatch`) for rows; file content in
`.demo-data/chat-files/<file_id>` (git-ignored, #39); tests use the volatile repository and an in-memory file store

**Testing**: Vitest 2 (`npm test`), TypeScript check (`npm run lint`)

**Target Platform**: local Next.js development server on macOS and Windows, free tools only

**Project Type**: web application — the one Next.js project, collocated API routes

**Performance Goals**: none stated; a batch is at most 5 × 10 MB

**Constraints**: `data/` unchanged (#41, #50); no existing test changes; 910 tests stay green; one in-process
write lock shared with Close/Send/Open/BKG (#38, #47); demo session instead of AUT

**Scale/Scope**: seed has 8 attachments (4 PDF, 4 JPEG) with metadata only; F-CHAT-05 only

## Scope and trace

In scope: FR-005, BR-003, BR-008–BR-011, BR-020, BR-021, SC-005, SC-015, AC-IAC-FILE, edge cases
"unsupported format", "exceeds 10 MB", "multi-file contains invalid files", "upload succeeds but attachment
fails", #39–#50; screens COM125 / COM126 and the attachment rows of COM048 / COM065. Out of scope: AUT,
cloud storage, virus scanning (#42: content not inspected), captions (#44), document tags (#49).

**Phase A** (service + API, curl) and **Phase B** (screens). B needs A.

| Spec item | Plan element | Test level | Phase |
|---|---|---|---|
| FR-005, BR-008, SC-005, #44: Agency and Provider send 1–5 files → one `Attachment` message, `text` NULL; output `message_id`, `attachments[]`, `sent_at` | `sendAttachments` | unit + API | A |
| #42: extension check, case-insensitive; `file_type` from the extension; browser MIME ignored | `classifyFile` | unit | A |
| BR-009, #43, SC-015: > 10,485,760 bytes, 0 bytes, other extensions rejected; exactly 10,485,760 accepted | `validateBatch` | unit + API | A |
| BR-010, #45, AC-IAC-FILE: 0 or 6 files → 400; one invalid file in 5 → 400 `file_errors[]`, nothing stored (rows and files) | `validateBatch` | unit + API | A |
| BR-003, #47 (#27): unknown Chat, non-participant, Guest, UBND, HDT → 403; nothing stored | `requireParticipant` | unit + API | A |
| BR-021, #47: Closed Chat → 409 CHAT_CLOSED; nothing stored | lock re-check | unit + API | A |
| #46, edge "upload succeeds but attachment fails": record write fails → written files removed | `sendAttachments` cleanup | unit (+ mutation) | A |
| #47, #38: attach vs close race (seam after files are written, before the lock re-check) → 409, files removed | seam + shared lock (+ mutation) | unit | A |
| #47 (#26): recipient unread +1; `last_message_at`; `sent_at` monotonic | `messageOperations`, `nextSentAt` | unit | A |
| #41: Chat images stored with `width_px` / `height_px` empty; `stored_files` row per file; `storage_key` `chat-files/<file_id>` | `sendAttachments` | unit | A |
| BR-011, SC-005, #40: participant downloads the bytes (`Content-Disposition: attachment`, stored `file_type`); others 403; Closed Chat still downloads; seed file → 404 | `readAttachment`, GET route | unit + API (+ mutation) | A |
| #48: list preview "Tệp đính kèm: a, b" for an attachment message without text | `listChats` | unit | A |
| BR-011, BR-020: history returns the attachments; unchanged after close | `getChatHistory` (existing) | unit | A |
| seed check: seed attachment `e64a4f0b…` in the demo Agency Chat is listed with its seed name and size | `getChatHistory` | unit | A |
| #39: `demo:reset` removes `.demo-data/chat-files` | `scripts/demo-seed.mjs` | demo (script) | A |
| #49: dialog state: per-file errors, Send enabled only for 1–5 valid files and no pending send, Cancel sends nothing | `attachState` (pure) | unit + demo | B |
| #49: Attach only on an Active Chat; history shows name, type, size, download link | page | demo | B |

## Constitution Check

| Principle | Result | Reason |
|---|---|---|
| I. Spec is the source of truth | PASS | Every row cites FR-005, BR-003/008–011/020/021, SC-005/015, AC-IAC-FILE, #39–#50. |
| II. Business rules test-first | PASS (planned) | A failing test before every code task; race and cleanup seams with mutation runs; denied-writes-nothing snapshots of rows and files; no existing test changes. |
| III. Thin vertical slice | PASS | Phase A service + API, Phase B screens. |
| IV. Synthetic data, no secrets | PASS | Seed and generated test bytes only; files stay in git-ignored `.demo-data/`. |
| V. Humans approve every change | DEVIATION (recorded) | Since 2026-11-05 the agent pushes the feature branch and opens the PR; the human merges (CLAUDE.md §3 rule 3, build log §4 row 46, checklist §3 #55). |

Post-design re-check: unchanged.

## Project Structure

```text
specs/016-iac-attach/  spec.md, plan.md, research.md, data-model.md, quickstart.md, contracts/attach-api.md, tasks.md
src/lib/iac/chat-files.ts                                      # A: formats, validateBatch (pure), file store (disk / memory)
src/lib/iac/chat-service.ts                                    # A: sendAttachments, readAttachment, list preview (#48)
src/lib/iac/chat-access.ts                                     # A: ChatError carries file_errors
src/lib/iac/chat-http.ts                                       # A: error body adds file_errors
src/app/api/iac/chats/[id]/attachments/route.ts                # A: POST multipart
src/app/api/iac/chats/[id]/attachments/[attachmentId]/route.ts # A: GET download
scripts/demo-seed.mjs                                          # A: reset removes .demo-data/chat-files
src/app/messages/attach-state.ts                               # B: attachState (pure)
src/app/messages/page.tsx                                      # B: Attach button, dialog, attachment rows
tests/unit/iac-attach-*.test.ts, tests/integration/iac-attach-api.test.ts
```

## UI choices (plan only)

- "Đính kèm" button next to Send, only for an Active Chat. The dialog is an in-page panel like Close:
  `<input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png">`, one row per file
  (name, type, size in KB/MB, error in red), buttons "Hủy" and "Gửi tệp" (disabled unless 1–5 valid files
  and nothing pending).
- Attachment rows in the history: file name as a download link, type label (PDF, DOCX, …) and size.

## Complexity Tracking

| Item | Why | Consequence |
|---|---|---|
| Local file store instead of cloud storage | No storage service in the stack (checklist §3 #42) | Files live in `.demo-data/chat-files/`; one machine only; `demo:reset` clears them. |
| Seed attachments have no content | `data/` has metadata only | Download → 404 "Tệp mẫu không có nội dung." (#40). |
| Content not inspected | #42 | A renamed file with an allowed extension is accepted; served only as a download (`attachment`). |
| Shared lock, one process | as #38 | Checklist §3 #53. |
