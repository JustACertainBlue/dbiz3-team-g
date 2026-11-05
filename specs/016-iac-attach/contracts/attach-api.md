# Contract: F-CHAT-05 attachments

Session: cookie `hab_demo_account` (`agency` | `provider` | …). Errors: `{ "error": { "code", "message" } }`
as `specs/014-iac-core/contracts/chat-api.md`; a 400 for files adds `file_errors`.

## POST /api/iac/chats/{chat_session_id}/attachments

Body: `multipart/form-data`, one `files` part per file (1–5).

201:

```json
{ "data": {
  "message_id": "uuid",
  "attachments": [ { "attachment_id": "uuid", "file_name": "bao-gia.pdf", "file_type": "application/pdf", "file_size": 12345 } ],
  "sent_at": "2026-11-05T10:00:00.000Z"
} }
```

| Case | Status | code |
|---|---|---|
| Guest, UBND, HDT, non-participant, unknown Chat (#47, #27) | 403 | FORBIDDEN |
| Body not multipart, 0 files, more than 5 files (BR-010, #45) | 400 | VALIDATION_ERROR |
| Any file with another extension, 0 bytes or > 10,485,760 bytes (BR-009, #42, #43, #45) | 400 | VALIDATION_ERROR + `file_errors: [{ file_name, reason }]` |
| Chat Closed, also when closed during the upload (BR-021, #47) | 409 | CHAT_CLOSED |

`reason` values: `UNSUPPORTED_FORMAT`, `FILE_TOO_LARGE`, `EMPTY_FILE`. Every error stores nothing (#45, #46).

## GET /api/iac/chats/{chat_session_id}/attachments/{attachment_id}

200: the file bytes; `Content-Type` = `file_type`; `Content-Disposition: attachment; filename*=UTF-8''…`;
`X-Content-Type-Options: nosniff`. Works for Active and Closed Chats (BR-020, #40).

| Case | Status | code |
|---|---|---|
| Guest, UBND, HDT, non-participant, unknown Chat, attachment not in this Chat (#40, #27) | 403 | FORBIDDEN |
| Attachment without stored content (seed) | 404 | NOT_FOUND, message "Tệp mẫu không có nội dung." |

## Changed outputs

- `GET /api/iac/chats`: `last_message_preview` of a latest message without text that has attachments =
  "Tệp đính kèm: " + file names joined by ", " (#48).
- History items already return `attachments: [{ attachment_id, file_name, file_type, file_size }]`.
