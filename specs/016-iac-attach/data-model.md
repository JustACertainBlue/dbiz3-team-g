# Data model: IAC round 3 — F-CHAT-05

Source of truth: [data/04-data-model.md](../../data/04-data-model.md) and [data/schema.sql](../../data/schema.sql).
No field is redefined here; this slice adds no table or column (#50).

| Table | Read | Written | Through |
|---|---|---|---|
| `chat_sessions` | status, pair, context ids | `last_message_at` | FR-005, #47 |
| `chat_participants` | participant check | recipient `unread_count` +1 | BR-003, #47 (#26) |
| `chat_messages` | latest `sent_at` | one row, `message_kind` `Attachment`, `text` empty | FR-005, #44 |
| `stored_files` | name, type, size for history and download | one row per file, `width_px`/`height_px` empty | #39, #41, #42 |
| `chat_attachments` | attachments of a message | one row per file | FR-005, BR-011 |
| `user_accounts`, `agency_profiles`, `provider_profiles`, `provider_profile_versions` | names (existing) | — | FR-003 |

Schema checks that apply: `chat_message_content_chk` (text may be NULL only for `Attachment`),
`stored_file_size_chk` (> 0, ≤ 10,485,760), `stored_file_image_minsize_chk` (passes with NULL dimensions,
#41), `chat_attachments` `UNIQUE (message_id, file_id)`, trigger `chat_message_not_closed` (no message in a
Closed Chat, BR-021).

File content: `.demo-data/chat-files/<file_id>` (not a table; git-ignored; #39).
