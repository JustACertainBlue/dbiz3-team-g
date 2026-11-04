# Contract: AI Tour Matching REST API

Updated 2026-10-30 (Round 3, `tasks.md` Phase 5) to match the code on `main` and the behaviour after
Phase 5. Spec decisions referenced as `#n` are in spec §10.

**Authentication** (all endpoints): demo session cookie `hab_demo_account` (`guest | agency | provider |
ubnd | hdt`, `src/lib/auth/demo-session.ts`); AUT login is not integrated. Every endpoint authorizes
first, then validates the body, then reads or writes; a denied or invalid request writes nothing.

| Status | When |
|---|---|
| `401` | Not authenticated (Guest) — BR-002 |
| `403` | Authenticated but not a Tour Agency, or the matching session belongs to another Agency — BR-001 |

## Endpoints Summary

| Method | Path | Summary | Spec References |
|---|---|---|---|
| `POST` | `/api/ait/sessions` | Open a matching session | FR-001, BR-001, BR-002, BR-016 |
| `POST` | `/api/ait/sessions/:id/messages` | Store an Agency message and analyze the conversation; or re-analyze (`retry`) | FR-002..FR-004, FR-009, BR-004, BR-008, BR-017, #27, #29, #33, #34 |
| `GET` | `/api/ait/sessions/:id/messages` | Conversation history | FR-002 |
| `POST` | `/api/ait/matching` | Retrieve, filter, rank and explain candidates for a Tour Preference Profile; no-match relaxation | FR-005..FR-008, FR-012, BR-003, BR-005..BR-007, BR-011, BR-020, #23..#26, #30, #32 |
| `POST` | `/api/ait/sessions/:id/quote` | Request Quote handoff | FR-011, BR-009, BR-010, BR-018, #31 |
| `POST` | `/api/ait/sessions/:id/chat` | Direct Chat handoff | FR-011, BR-019, #31 |
| `GET` | `/api/ait/preferences/:agencyId` | Agency preference profile and personalized ranking | FR-010, FR-016, BR-022 |

There is no `/api/ait/decay` endpoint; time decay (FR-015, BR-021) is a library function
(`src/lib/decay/time-decay.ts`).

---

### 1. `POST /api/ait/sessions`

- **Request body**: `{}`
- **Response `201 Created`**:
  ```json
  {
    "matching_session_id": "7749ac9e-a2b6-4cb1-b878-42a66f237c9f",
    "session_id": "7749ac9e-a2b6-4cb1-b878-42a66f237c9f",
    "agency_id": "02e568d8-d65e-54b1-a554-b411150d1dcb",
    "started_at": "2026-10-30T15:41:50.169Z",
    "last_activity_at": "2026-10-30T15:41:50.169Z",
    "status": "active"
  }
  ```
- **Errors**: `401 { "error": "Unauthorized", "redirectTo": "/login" }`; `403` for a non-Agency actor
  (no session is created, #28).

---

### 2. `POST /api/ait/sessions/:id/messages`

- **Request body (new message)**: `{ "sender": "Agency", "text": "Silk weaving, 10 pax on 2026-11-20 from Hoàn Kiếm" }`
  (`text` 1–2,000 characters).
- **Request body (Retry, #33)**: `{ "retry": true }` — re-analyzes the stored conversation; no message is
  added.
- **Response `201 Created`** (new message) / **`200 OK`** (retry):
  ```json
  {
    "message": { "message_id": "…", "sender": "Agency", "text": "…", "sent_at": "…" },
    "extraction": {
      "is_complete": true,
      "processing_status": "Success",
      "retry_available": false,
      "follow_up_questions": [],
      "tour_context": {
        "group_size": 10,
        "target_date_or_range": { "start_date": "2026-11-20" },
        "origin_or_route": { "origin_address": "Hoàn Kiếm" },
        "craft_preference": "silk"
      }
    },
    "tour_preference_profile": {
      "hard_constraints": { "group_size": 10, "target_date_or_range": { "start_date": "2026-11-20" }, "origin": { "origin_address": "Hoàn Kiếm" } },
      "matching_attributes": [{ "type": "craft_preference", "value": "silk" }],
      "preference_weights": { "experience_fit": 0.4, "route_convenience": 0.25, "agency_preferences": 0.2, "provider_quality": 0.15 }
    }
  }
  ```
  `craft_preference` is an internal field derived from the Agency's stated Experience preference (#32,
  #34); it is not one of the `tour_context` fields of spec OQ #3 and is not part of the FR-003 output
  contract. A stated origin is "from X", "near X" or a named Hanoi district/city; a craft village named
  only as a destination is not an origin (#35).
  `message` is `null` on retry. While any OQ #4 field (group size, date, origin, Experience preference
  #34) is missing: `is_complete: false`, one follow-up question per missing field, and
  `tour_preference_profile: null`. No field is defaulted (#29).
- **Response `503 Service Unavailable`** (AI processing failed, #27): the Agency message stays stored.
  ```json
  {
    "error_code": "AI_SERVICE_UNAVAILABLE",
    "message": "Temporary AI Failure — we couldn't process your request right now. Your conversation is saved.",
    "retry_available": true
  }
  ```
- **Errors**: `400` empty or over-long text; `401`; `403`.

---

### 3. `POST /api/ait/matching`

- **Request body**: `{ "session_id": "…", "tour_preference_profile": { … from §2 … } }`
- **Response `200 OK` (matches)**: candidates scoring below 60 are dropped (#30); up to 5 `top_matches`
  and up to 5 `additional_suggestions`.
  ```json
  {
    "top_matches": [
      {
        "experience_id": "c8281688-2dc1-5cb1-9ff6-139df04ba562",
        "provider_id": "…",
        "experience_name": "Dệt lụa truyền thống",
        "provider_name": "Xưởng thủ công Vạn Phúc",
        "village_name": "Vạn Phúc",
        "rank": 1,
        "match_score": 89.4,
        "price_per_person": 175000,
        "max_participants": 13,
        "explanation": "Matches your silk preference (Silk/Textile). Takes up to 13 pax for your group of 10. About 12 km from Hoàn Kiếm (estimated)."
      }
    ],
    "additional_suggestions": []
  }
  ```
  The explanation names only evaluated profile factors (#25); the wording above is illustrative.
- **Response `200 OK` (no match, FR-012)**:
  ```json
  {
    "top_matches": [],
    "relaxation_suggestions": {
      "relaxation_suggestions": [
        { "criterion": "Budget", "suggested_value": 150000 },
        { "criterion": "Distance", "suggested_value": "Expand radius by 15km to include outer craft villages" },
        { "criterion": "Dates", "suggested_value": "Consider flexible dates (+/- 2 days)" }
      ],
      "conversation_prompt": "…"
    }
  }
  ```
  `criterion` ∈ {Budget, Distance, Dates}. The Budget value is the lowest price among candidates that
  pass every non-budget constraint and score ≥ 60 (#23, #30); it is omitted when there is none. When
  capacity is the reason, `conversation_prompt` names it with the largest accepted group (#24).
- **Errors**: `400` missing `tour_preference_profile`; `401`; `403`.

---

### 4. `POST /api/ait/sessions/:id/quote`

- **Request body**: `{ "experience_id": "c8281688-2dc1-5cb1-9ff6-139df04ba562" }`
- **Response `200 OK`**:
  ```json
  { "quote_request_id": "b4ebaa04-0675-4ca9-a02c-75f6a2cc1ba1", "chat_session_id": "3bc2a986-bee0-4137-b1ba-d326d9883961", "is_new_request": true }
  ```
  Repeating for the same Agency–Experience returns the same `quote_request_id` with
  `is_new_request: false` (BR-018); the Chat is the Agency–Provider pair Chat (BR-019); no Booking is
  created (BR-009, BR-010). The UI then opens `/messages?chat_session_id=<chat_session_id>` (#31).
- **Errors**: `401`; `403`; `400` missing `experience_id`; `404` unknown Experience; `409` Provider not
  available.

---

### 5. `POST /api/ait/sessions/:id/chat`

- **Request body**: `{ "experience_id": "…" }`
- **Response `200 OK`**: `{ "chat_session_id": "…", "initial_message_id": "…" }` — the existing Active
  Chat of the Agency–Provider pair is reused (BR-019); no Quote Request and no Booking are created. The UI
  then opens `/messages?chat_session_id=<chat_session_id>` (#31).
- **Errors**: as §4.
