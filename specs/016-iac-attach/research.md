# Research: IAC round 3 — F-CHAT-05 attachments

All decisions come from spec-IAC #39–#50 (approved by the human on 2026-11-05); this file records how
they are built.

## R1 File store (#39)

- **Decision**: `src/lib/iac/chat-files.ts` exposes `chatFileStore()` with `write(fileId, bytes)`,
  `read(fileId)` (bytes or `null`) and `remove(fileId)`. Outside tests it writes
  `.demo-data/chat-files/<file_id>` (no extension; the name comes from `stored_files`). Under
  `NODE_ENV === 'test'` it keeps a `Map` in memory, like the volatile repository. `storage_key` =
  `chat-files/<file_id>`.
- **Rationale**: no new dependency, works on macOS and Windows, never touches the real runtime in tests,
  and the file name never becomes a path (no path traversal).
- **Alternatives**: metadata only like EXP (`upload://`) — rejected by the human (C1); base64 inside
  `runtime.json` — every write would rewrite up to 50 MB.

## R2 Upload format (#39)

- **Decision**: `POST /api/iac/chats/{id}/attachments`, `multipart/form-data`, one `files` field per file,
  read with `await request.formData()` and `formData.getAll('files')`. Non-`File` entries are ignored; a
  body that is not multipart → 400.
- **Rationale**: built into Next 14 route handlers and browsers (`FormData`), no body-size config needed
  for route handlers.

## R3 Validation order (#42, #43, #45, #47)

Authorize (403) → count (0 or > 5 → 400) → each file: extension in the list, size > 0, size ≤ 10,485,760
(collect every error) → any error → 400 with `file_errors` → write files → lock: re-check Active (409),
write rows. The service takes plain `{ name, size, bytes }` objects so unit tests do not need multipart.

## R4 Failure cleanup and race (#46, #47)

`sendAttachments` writes the files, then calls `withChatWriteLock`. Inside: re-check Active, optional
test seam `afterFilesWritten` (pause), `applyBatch`. Any error after the files were written removes them
(`try/catch` → `remove` each → re-throw). Seams: `afterFilesWritten` (close-race) and `failRecords`
(throws before `applyBatch`) are test-only options like `afterStatusCheck` in 015.

## R5 Rows written (#41, #44, #47)

Per action: one `chat_messages` row (`message_kind` `Attachment`, `text` empty, sender, context ids of
the Chat like a text message, `sent_at` via `nextSentAt`); per file one `stored_files` row (`file_id`,
`storage_key`, `file_name` as sent, `media_type` from the extension, `file_size_bytes`, `width_px` /
`height_px` empty, `uploaded_by`, `created_at` = `sent_at`) and one `chat_attachments` row
(`attachment_id`, `message_id`, `file_id`, `uploaded_by`, `created_at`); plus `messageOperations`
(`last_message_at`, recipient unread +1). One `applyBatch`.

## R6 Download (#40)

`GET /api/iac/chats/{id}/attachments/{attachmentId}`: `requireParticipant` (403); the attachment must
belong to a message of that Chat, else 403 (same answer as unknown, #27); bytes from the store, else 404
NOT_FOUND "Tệp mẫu không có nội dung."; response headers `Content-Type` = stored `media_type`,
`Content-Disposition: attachment; filename*=UTF-8''<encoded name>`, `X-Content-Type-Options: nosniff`.
Reading does not change unread counts.

## R7 Reset (#39)

`scripts/demo-seed.mjs --reset` also removes `.demo-data/chat-files` (`rmSync`, recursive, force).
Seeding without `--reset` leaves it. Stop the dev server first (lesson #19).

## R8 Existing tests

No existing test changes are needed: history already returns `attachments`; `listChats` gains a preview
only for messages without text (seed attachment messages all have text).
