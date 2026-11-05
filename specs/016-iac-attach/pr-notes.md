# PR notes: IAC round 3 (`016-iac-attach`)

- Scope: F-CHAT-05 attachments (FR-005, BR-003, BR-008–BR-011, BR-020, BR-021, SC-005, SC-015, AC-IAC-FILE); spec-IAC #39–#50.
- New: `src/lib/iac/chat-file-rules.ts`, `src/lib/iac/chat-files.ts` (file store `.demo-data/chat-files/<file_id>`),
  `sendAttachments` / `readAttachment` in `src/lib/iac/chat-service.ts`, `POST /api/iac/chats/{id}/attachments`
  (multipart, field `files`), `GET /api/iac/chats/{id}/attachments/{attachmentId}` (download only, participants only),
  "Đính kèm" dialog on `/messages` (`src/app/messages/attach-state.ts`).
- One attachment action writes one `Attachment` message + one `stored_files` and one `chat_attachments` row per file;
  an invalid file, a refusal or a failure stores nothing (files are removed again).
- `npm run demo:reset` now also deletes `.demo-data/chat-files`. Stop the dev server before a reset.
- `data/` unchanged (#41, #50). No existing test changed. Tests: 958 (+48), lint OK.
- Known limits: checklist §3 #56 (local files, seed attachments without content, extension-only check).
