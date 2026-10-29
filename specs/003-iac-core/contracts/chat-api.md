# REST API Contract: In-app Chat (IAC) — Core Slice

Base path: `/api/iac`

Authentication: Demo session cookie `hab_demo_account` (or `x-demo-user-id` in automated tests). All endpoints verify caller authentication per `BR-003`.

---

## 1. Open or Reuse Chat Session (`POST /api/iac/sessions`)

Traces to: `FR-001` (`F-CHAT-01`), `BR-001`, `BR-004`, `BR-005`.

### Request
- **Method**: `POST`
- **Path**: `/api/iac/sessions`
- **Headers**:
  - `Content-Type: application/json`
- **Body**:
  ```json
  {
    "recipient_id": "33333333-3333-3333-3333-333333333331",
    "source": "Explore",
    "experience_id": "44444444-4444-4444-4444-444444444441",
    "quote_request_id": null,
    "booking_id": null
  }
  ```

### Validation Rules
- `recipient_id`: UUID, required. Must refer to a valid counterpart profile/user.
- `source`: Enum required, one of `['AI Matching', 'Explore', 'Provider Profile', 'Quote Request', 'Booking']`.
- Role verification (`BR-001`): One party must be `Tour Agency`, the other must be `Local Provider`.
- Provider restriction (§10 Q2/Q3): Local Provider can initiate only when `source` is `'Quote Request'` or `'Booking'`.
- Session reuse (`BR-004`): If an active session already exists for this Agency–Provider pair, return that session (`is_new_session: false`).

### Response (200 OK or 201 Created)
```json
{
  "chat_session_id": "77777777-7777-7777-7777-777777777771",
  "chat_status": "Active",
  "is_new_session": true
}
```

### Errors
- `400 Bad Request`: Missing `recipient_id`, invalid `source`, or missing required context for Quote/Booking source.
- `401 Unauthorized`: No active user session.
- `403 Forbidden`: Caller is not authorized (e.g. Guest role, or Provider initiating without valid Quote/Booking context).

---

## 2. List Conversations for Logged-in User (`GET /api/iac/sessions`)

Traces to: `FR-003` (`F-CHAT-03`), `BR-002`, `BR-013`, `BR-016`.

### Request
- **Method**: `GET`
- **Path**: `/api/iac/sessions`

### Business Logic
- Filters `chat_sessions` where logged-in user is a registered participant in `chat_participants` (`BR-002`).
- Tour Agency sees only Provider counterparts; Local Provider sees only Agency counterparts (`BR-016`).
- Sorted by `last_message_at` descending (most recent first, `BR-013`).

### Response (200 OK)
```json
{
  "chat_list": [
    {
      "chat_session_id": "77777777-7777-7777-7777-777777777771",
      "chat_status": "Active",
      "participant_name": "Nguyen Van Chuong",
      "organization": "Chuong Conical Hat Cooperative",
      "last_message_preview": "We can accommodate your group of 15.",
      "last_message_at": "2026-10-30T04:15:00.000Z",
      "unread_count": 2
    }
  ]
}
```

### Errors
- `401 Unauthorized`: No active user session.

---

## 3. Get Paginated Message History (`GET /api/iac/sessions/:id/messages`)

Traces to: `FR-003` (`F-CHAT-03`), `BR-002`, `BR-014`, `BR-015`, `BR-017`.

### Request
- **Method**: `GET`
- **Path**: `/api/iac/sessions/{chat_session_id}/messages`
- **Query Parameters**:
  - `before_cursor` (optional, ISO string): For loading messages older than this timestamp.

### Business Logic
- Validates that caller is a participant in `chat_participants` for `{chat_session_id}`; returns 403 Forbidden if not (`BR-002`).
- Resets caller's `unread_count` in `chat_participants` to 0 (`BR-017`).
- Loads up to 50 messages per page (`BR-015`).
- Returns messages ordered chronologically (`sent_at ASC`, `BR-014`).

### Response (200 OK)
```json
{
  "chat_session_id": "77777777-7777-7777-7777-777777777771",
  "message_history": [
    {
      "message_id": "88888888-8888-8888-8888-888888888881",
      "text": "Hello, we are interested in booking the conical hat workshop.",
      "sender_id": "22222222-2222-2222-2222-222222222221",
      "sender_name": "Hanoi Heritage Travel",
      "sent_at": "2026-10-30T04:10:00.000Z"
    },
    {
      "message_id": "88888888-8888-8888-8888-888888888882",
      "text": "We can accommodate your group of 15.",
      "sender_id": "33333333-3333-3333-3333-333333333331",
      "sender_name": "Nguyen Van Chuong",
      "sent_at": "2026-10-30T04:15:00.000Z"
    }
  ],
  "has_more_messages": false
}
```

### Errors
- `401 Unauthorized`: No active user session.
- `403 Forbidden`: User is not a participant of this conversation.
- `404 Not Found`: `chat_session_id` does not exist.

---

## 4. Send Message in Active Chat (`POST /api/iac/sessions/:id/messages`)

Traces to: `FR-002` (`F-CHAT-02`), `BR-002`, `BR-006`, `BR-007`, `BR-021`.

### Request
- **Method**: `POST`
- **Path**: `/api/iac/sessions/{chat_session_id}/messages`
- **Headers**:
  - `Content-Type: application/json`
- **Body**:
  ```json
  {
    "message_text": "Could you provide details on the morning schedule?"
  }
  ```

### Validation Rules
- Caller must be an authorized participant of this chat (`BR-002`, `BR-003`).
- `chat_sessions.status` must be `Active`. Sending into a `Closed` session is strictly rejected (`BR-021`).
- `message_text`: String, required. Trimmed length must be between 1 and 4000 characters (`BR-007`). Empty or whitespace-only rejected with 400.

### Business Logic
- Inserts new row into `chat_messages` with `message_kind = 'User Text'`.
- Updates `chat_sessions.last_message_at = sent_at`.
- Increments `unread_count` by 1 for the counterpart participant in `chat_participants`.

### Response (201 Created)
```json
{
  "message_id": "88888888-8888-8888-8888-888888888883",
  "sent_at": "2026-10-30T04:20:00.000Z",
  "last_message_timestamp": "2026-10-30T04:20:00.000Z"
}
```

### Errors
- `400 Bad Request`: Empty message, text > 4000 characters, or malformed JSON.
- `401 Unauthorized`: No active user session.
- `403 Forbidden`: User is not a participant, or session status is `Closed`.
- `404 Not Found`: Session does not exist.

