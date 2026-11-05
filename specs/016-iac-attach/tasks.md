# Tasks: IAC round 3 — Chat document attachments (F-CHAT-05)

**Input**: `specs/016-iac-attach/` plan.md, research.md, data-model.md, contracts/attach-api.md, quickstart.md
**Tests**: required (constitution II). Every test task comes before the code task it checks and must fail
for the right reason first. No existing test is edited (research R8).

Shared fixtures: `tests/unit/iac-fixtures.ts` (AGENCY, PROVIDER, AGENCY_CHAT, PROVIDER_CHAT, …) plus
`tests/unit/iac-attach-fixtures.ts` (file builders, `rowsAndFilesSnapshot`).

## Phase 1: Setup

- [X] T001 Confirm the active feature and green baseline: `uv run tools/start_feature.py --check`, `npm test` (910), `npm run lint`

## Phase 2: Foundational

- [X] T002 Create `tests/unit/iac-attach-fixtures.ts`: `file(name, size, bytes?)` builder, `ATTACH_TABLES` (`chat_sessions`, `chat_participants`, `chat_messages`, `stored_files`, `chat_attachments`), `rowsAndFilesSnapshot()` (rows + stored file ids of the in-memory file store), seed ids `SEED_AGENCY_ATTACHMENT = e64a4f0b…`

## Phase 3: User Story 1 — attach documents (P1), Phase A service + API

**Independent test**: curl steps 1–5 of quickstart.md.

### Tests (write first, see them fail)

- [X] T003 [P] [US1] `tests/unit/iac-attach-validate.test.ts`: `classifyFile` / `validateBatch` — 8 extensions accepted case-insensitively with the #42 MIME types; `.txt`, `.exe`, no extension → `UNSUPPORTED_FORMAT`; 0 bytes → `EMPTY_FILE`; 10,485,760 accepted, 10,485,761 → `FILE_TOO_LARGE`; 0 files and 6 files → `VALIDATION_ERROR`; one bad file in five → all errors listed with file names; duplicate names accepted (BR-009, BR-010, #42, #43, #45, SC-015)
- [X] T004 [P] [US1] `tests/unit/iac-attach-send.test.ts`: Agency and Provider each send 1 and 5 files → one `Attachment` message with empty text, output `{ message_id, attachments[{attachment_id, file_name, file_type, file_size}], sent_at }`, one `stored_files` (+ `storage_key` `chat-files/<file_id>`, empty dimensions for a PNG) and one `chat_attachments` row per file, bytes in the store; recipient unread +1; `last_message_at` = `sent_at`; `sent_at` after the latest message; history returns the attachments (FR-005, BR-008, BR-011, SC-005, #41, #44, #47)
- [X] T005 [P] [US1] same file: denied and invalid requests store nothing (`rowsAndFilesSnapshot` before = after): Guest, UBND, HDT, non-participant, unknown Chat → 403; invalid batch → 400 with `file_errors`; Closed Chat (seed Closed Chat of the pair or closed via `closeChat`) → 409 (BR-003, BR-021, AC-IAC-FILE, #45, #47)
- [X] T006 [P] [US1] `tests/unit/iac-attach-race.test.ts`: (a) seam `afterFilesWritten` closes the Chat → 409 CHAT_CLOSED, no message, files removed; (b) seam `failRecords` throws → error, no rows, files removed (#46, #47, #38). Mutation runs: remove the lock re-check; remove the cleanup
- [X] T007 [P] [US1] `tests/unit/iac-attach-download.test.ts`: participant reads bytes, `file_type`, `file_name`; other participant of the same Chat too; Closed Chat still readable; non-participant / unknown Chat / attachment of another Chat / Guest / UBND / HDT → 403; seed attachment → 404 "Tệp mẫu không có nội dung."; reading changes no row (BR-011, BR-020, SC-005, #40). Mutation run: drop the "attachment belongs to this Chat" check
- [X] T008 [P] [US1] `tests/unit/iac-attach-list.test.ts`: list preview "Tệp đính kèm: a.pdf, b.xlsx" after an attachment message; seed check: history of AGENCY_CHAT lists seed attachment `e64a4f0b…` with its seed file name and size from `data/seed/stored_files.csv` (#48)
- [X] T009 [P] [US1] `tests/integration/iac-attach-api.test.ts`: POST multipart through the route (201, 400 + `file_errors`, 400 not multipart, 403, 409) and GET download (200 headers `content-type`, `content-disposition: attachment; filename*=UTF-8''…`, `x-content-type-options: nosniff`, body bytes; 403; 404) (contracts/attach-api.md)
- [X] T010 [US1] Run `npm test`: T003–T009 fail for the right reason (missing module/function/route), all 910 others pass; commit `test(IAC): failing tests for F-CHAT-05 attachments`

### Code

- [X] T011 [US1] `src/lib/iac/chat-files.ts`: formats table, `classifyFile`, `validateBatch`, `chatFileStore()` (disk `.demo-data/chat-files/<file_id>`, memory under test) → T003 green
- [X] T012 [US1] `src/lib/iac/chat-access.ts` + `chat-http.ts`: `ChatError` optional `fileErrors`, error body adds `file_errors`
- [X] T013 [US1] `src/lib/iac/chat-service.ts`: `sendAttachments` (authorize → validate → write files → lock: Active re-check, seams, one `applyBatch`; cleanup on error) → T004–T006 green
- [X] T014 [US1] `src/lib/iac/chat-service.ts`: `readAttachment` and list preview (#48) → T007, T008 green
- [X] T015 [US1] routes `src/app/api/iac/chats/[id]/attachments/route.ts` (POST) and `[attachmentId]/route.ts` (GET) → T009 green
- [X] T016 [US1] `scripts/demo-seed.mjs`: `--reset` removes `.demo-data/chat-files` (#39); check by running the reset with a dummy file
- [X] T017 [US1] Mutation runs of T006 and T007 (lesson #13); each mutation must fail a test; record results

## Phase 4: User Story 1 — Phase B screens (COM125/COM126, COM048/COM065 rows)

- [X] T018 [P] [US1] `tests/unit/iac-attach-ui.test.ts`: `attachState(files, pending)` — per-file `error` text for each reason, `canSend` only for 1–5 all-valid files and not pending, 6 files → message "Tối đa 5 tệp"; size label (KB/MB); type label from the extension (#49). See it fail
- [X] T019 [US1] `src/app/messages/attach-state.ts` → T018 green
- [X] T020 [US1] `src/app/messages/page.tsx`: "Đính kèm" button (Active only), dialog (file input `multiple accept=…`, rows, "Hủy", "Gửi tệp"), upload with `FormData`, refresh history and list; attachment rows with download links (#49)

## Phase 5: Polish

- [X] T021 Full suite three times + `npm run lint` (lesson #22)
- [X] T022 Demo: quickstart Phase A with curl and Phase B in the built-in browser (Agency and Provider)
- [X] T023 Build log entry, checklist §1 IAC row and §3 #53 (attachments built; known limits), `03-module-status.md`, `pr-notes.md`
- [X] T024 Commit `feat(IAC): US-1 F-CHAT-05 attachments`, push the feature branch, open the PR, STOP

## Dependencies

T001 → T002 → T003–T009 (parallel) → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019 → T020 → T021–T024.
