# Contract: AI Tour Matching REST API

## Endpoints Summary

| Method | Path | Summary | Spec References |
|---|---|---|---|
| `POST` | `/api/ait/sessions` | Open new matching session | FR-001, BR-001, BR-002, BR-016 |
| `POST` | `/api/ait/sessions/:id/messages` | Send message, analyze intent & receive recommendations/clarifications | FR-002..FR-009, BR-004..BR-008, BR-017 |
| `POST` | `/api/ait/sessions/:id/quote` | Initiate Request Quote handoff | FR-011, BR-009, BR-018 |
| `POST` | `/api/ait/sessions/:id/chat` | Initiate direct Chat handoff | FR-011, BR-019 |
| `GET` | `/api/ait/preferences/:agencyId` | Fetch Agency preference profile & personalized ranking | FR-010, FR-016, BR-022 |
| `POST` | `/api/ait/decay` | Trigger time decay on preference signals | FR-015, BR-021 |

---

### 1. `POST /api/ait/sessions`
Opens a new matching session for an authenticated Tour Agency.

- **Headers**:
  - `Authorization: Bearer <token>`
- **Response `201 Created`**:
  ```json
  {
    "matching_session_id": "7f8b911a-3e5c-48c2-bb50-3a812da05b10",
    "agency_id": "4b68e9e1-2c06-4447-b8db-d50d75c87910",
    "started_at": "2026-10-07T09:00:00Z",
    "status": "Active"
  }
  ```
- **Error Responses**:
  - `401 Unauthorized` / `302 Redirect /login`: When user is not authenticated (`BR-002`).
  - `403 Forbidden`: When user role is not `Agency` (`BR-001`).

---

### 2. `POST /api/ait/sessions/:id/messages`
Processes natural language tour requirements from the Tour Agency.

- **Request Body**:
  ```json
  {
    "message_text": "We have 15 French tourists visiting Hanoi on Nov 10, wanting a traditional pottery workshop in Bat Trang with budget around 400,000 VND per person."
  }
  ```
- **Response `200 OK` (When critical fields are complete — Recommendations produced)**:
  ```json
  {
    "message_id": "6a9f4a90-3fb1-43ee-b141-9277d0a28f80",
    "is_complete": true,
    "tour_context": {
      "group_size": 15,
      "tour_purpose": "Cultural Workshop",
      "craft_types": ["Pottery"],
      "target_date": "2026-11-10",
      "budget_max": 400000,
      "origin": "Old Quarter, Hanoi"
    },
    "recommendations": {
      "run_no": 1,
      "top_matches": [
        {
          "rank": 1,
          "experience_id": "550e8400-e29b-41d4-a716-446655440000",
          "name": "Bat Trang Traditional Ceramic Crafting",
          "provider_name": "Gom Su Bat Trang Artisan Co.",
          "village_name": "Bat Trang Ceramic Village",
          "match_score": 94.5,
          "experience_fit_score": 96.0,
          "price_per_person": 350000,
          "explanation": "Perfect match for group size 15 and budget 400k. Verified master artisan workshop located in Bat Trang."
        }
      ],
      "additional_suggestions": []
    }
  }
  ```
- **Response `200 OK` (When critical fields are missing — Clarification requested)**:
  ```json
  {
    "message_id": "6a9f4a90-3fb1-43ee-b141-9277d0a28f80",
    "is_complete": false,
    "follow_up_questions": [
      "How many participants will be joining this tour?",
      "What is your intended date or timeframe for visiting?"
    ],
    "recommendations": null
  }
  ```
- **Response `503 Service Unavailable`**:
  ```json
  {
    "error_code": "AI_SERVICE_UNAVAILABLE",
    "message": "Temporary AI Failure. Conversation state is preserved.",
    "retry_available": true
  }
  ```

---

### 3. `POST /api/ait/sessions/:id/quote`
Triggers commercial Request Quote interest handoff (`BR-009`, `BR-018`).

- **Request Body**:
  ```json
  {
    "experience_id": "550e8400-e29b-41d4-a716-446655440000"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "quote_request_id": "11112222-3333-4444-5555-666677778888",
    "is_new_request": true,
    "chat_session_id": "88889999-aaaa-bbbb-cccc-ddddeeeeffff",
    "status": "Submitted"
  }
  ```
  *(Re-submitting returns `is_new_request: false` with the same `quote_request_id` per `BR-018`)*.
