# Contract: Close Chat — `POST /api/iac/chats/{id}/close` (F-CHAT-04)

Source: spec-IAC FR-004 §5.1, BR-019–BR-021, #29–#38. Actor from the cookie `hab_demo_account` only.
Error body `{ "error": { "code", "message" } }`; nothing is written on any error.
Order: authorize → validate → lock → re-check status → write.

Body: `{ "close_reason"?: string }`.

| Case | Answer |
|---|---|
| Participant (Agency or Provider user) on an Active Chat | `200 { data: { chat_session_id, chat_status: "Closed", closed_at, closed_by, success_message } }` |
| `close_reason` not a string, or > 500 code points after trim | `400 VALIDATION_ERROR` |
| Chat already Closed | `409 CHAT_CLOSED` |
| Non-participant, unknown id, Guest, UBND, HDT | `403 FORBIDDEN` |

`success_message` = "Đã đóng hội thoại. Lịch sử vẫn được lưu; lần trao đổi sau sẽ mở hội thoại mới." (#32).
After Close: `POST …/messages` → `409 CHAT_CLOSED` (BR-021); `GET …/messages` → `200` with
`chat_status "Closed"`, `closed_at`, `closed_by_name` (#34); the Chat list keeps the Chat with
`chat_status "Closed"` (#35).
