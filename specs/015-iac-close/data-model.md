# Data model: IAC round 2 — Close Chat (F-CHAT-04)

Canonical definitions: [`data/04-data-model.md`](../../data/04-data-model.md) and
[`data/schema.sql`](../../data/schema.sql). Nothing in `data/` changes; this lists only what the slice
reads and writes.

## Tables written

| Table | Columns | When | Rule |
|---|---|---|---|
| `chat_sessions` | `status` Active → Closed, `closed_at`, `closed_by` (actor `user_id`) | F-CHAT-04 | FR-004, BR-019, BR-021, `chat_closed_chk` |
| `audit_logs` | new row: `audit_id`, `actor_user_id`, `action` `chat.close`, `target_type` `chat_session`, `target_id`, `occurred_at` = `closed_at`, `change_or_result` `{from, to, close_reason?}` | F-CHAT-04 | #30, CRUD matrix F-CHAT-04 → AUD C |

No write to `chat_messages` or `chat_participants` (#37). A denied or invalid request writes nothing.

## Tables read

`chat_sessions`, `chat_participants` (participant check, #29), `chat_messages` (latest `sent_at` for
`closed_at`, R1), `user_accounts.full_name` (`closed_by_name`, #34). BKG reads are unchanged (#36).

## State

`chat_sessions.status`: Active → Closed (terminal, BR-021). No transition back.
