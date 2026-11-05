# Contract: IAC core — `/api/iac/chats` (F-CHAT-01..03)

Source: spec-IAC §5.1 FR-001..FR-003, BR-001..007/012..018/021, #10–#12, #18–#28; research R5–R10.
Actor from the demo cookie `hab_demo_account` only. Error body `{ "error": { "code", "message" } }`
(as BKG 011/012); nothing is written on any error. Order: authorize → validate → lock → read/write.

Common errors (#27, as spec-BKG #67): Guest, UBND, HDT → `403 FORBIDDEN` (BR-001, BR-003); unknown Chat id
and a Chat the actor does not participate in → `403 FORBIDDEN` (BR-002), so existence is not revealed.

## POST `/api/iac/chats` — F-CHAT-01 from a Booking (BKG135 / BKG138)

Body: `{ "source": "Booking", "booking_id": "<uuid>" }`. Other `source` values → `400 VALIDATION_ERROR`
(Explore / Provider Profile / AI Matching open through their handoff routes below; Quote Request
initiation is out of scope, Q5). Missing `booking_id` → `400`. Unknown Booking → `404`. Booking
not of the actor's Agency / Provider → `403`.

`200`: `{ "data": { "chat_session_id", "chat_status": "Active", "is_new_session": boolean } }`
(`true` only when a new Active Chat was created for the pair). No context message (#24).

## Handoff routes (existing, now on the shared service)

| Route | `source` written | Response (existing fields kept; `chat_status`, `is_new_session` added, FR-001 output) |
|---|---|---|
| `POST /api/demo/handoff` `{ action, experience_id, source_context?, chat_source? }` | `chat_source` ∈ {`Explore` (default), `Provider Profile`} else `400` | `{ data: { quote_request_id?, chat_session_id, chat_status, is_new_session, … } }` |
| `POST /api/ait/sessions/{id}/chat`, `/quote` | `AI Matching` + `matching_session_id` = `{id}` | today's object + `chat_status`, `is_new_session` |

Context message (#18): Chat → `User Text` from the Agency user, `experience_id` set; Quote →
`Quote Request` (only for a new Quote Request, as today).

## GET `/api/iac/chats` — F-CHAT-03 list

`200`:

```text
data:
  chat_list: [ {
    chat_session_id, chat_status ("Active" | "Closed"),
    participant_name,        # counterpart user's full_name (#22)
    organization,            # counterpart company_name / published business_name (#22)
    last_message_preview?,   # latest message text, at most 120 characters
    last_message_at?,        # ISO timestamp
    unread_count             # JSON number, the actor's own counter
  } ]                        # last_message_at (or started_at) newest first, then chat_session_id (BR-013)
```

Only Chats where the actor is a participant and of the actor's role pair (BR-002, BR-016).

## GET `/api/iac/chats/{id}/messages?before_cursor=<message_id>` — F-CHAT-03 history

`200`:

```text
data:
  chat_session_id, chat_status,
  message_history: [ {
    message_id, message_kind, text?, sender_name, sent_at,
    experience_id?, booking_id?,                                            # #28
    attachments?: [ { attachment_id, file_name, file_type, file_size } ]   # read-only (R8)
  } ]                        # oldest → newest, at most 50 (BR-014, BR-015)
  has_more_messages: boolean
```

Order (`sent_at`, `message_id`). Without `before_cursor`: the latest 50, and the actor's
`unread_count` → 0, `last_read_message_id` → newest message (BR-017, #23). With `before_cursor`
= `message_id` of the oldest loaded message: the 50 before it; nothing written. A cursor that is not
a message of this Chat → `400 VALIDATION_ERROR`.

## POST `/api/iac/chats/{id}/messages` — F-CHAT-02 send

Body: `{ "message_text": "<text>" }`. Trimmed text empty → `400 VALIDATION_ERROR`; more than 4000
code points → `400 VALIDATION_ERROR` (#25); Chat `Closed` → `409 CHAT_CLOSED` (BR-021).

`201`: `{ "data": { "message_id", "sent_at", "last_message_timestamp" } }` (`last_message_timestamp`
= `sent_at` = the Chat's new `last_message_at`). The other participant's `unread_count` + 1 (#26).
