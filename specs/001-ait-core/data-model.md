# Data Model Mapping: 001-ait-core (AI Tour Matching)

## Canonical Source of Truth
The canonical data model, physical schema, and deterministic seed data are defined authoritatively in:
- Entity & Logical Data Model: [data/04-data-model.md](../../data/04-data-model.md)
- Physical DDL Schema: [data/schema.sql](../../data/schema.sql)
- Seed Data Package: [data/seed/](../../data/seed/)

**Rule**: This feature slice does NOT redefine, alter, or add any fields or tables in `data/`. All database interactions in this slice strictly map to the existing canonical tables.

---

## Tables Read and Written by Slice `001-ait-core`

| Table Name | Operations | FR / BR Mapping | Purpose in this Feature Slice |
|---|---|---|---|
| `matching_sessions` | `INSERT`, `SELECT`, `UPDATE` | FR-001 (F-MATCH-01), BR-016 | Creates and manages conversational session state for authenticated Tour Agencies. |
| `matching_messages` | `INSERT`, `SELECT` | FR-002 (F-MATCH-02), FR-009 (F-MATCH-09) | Persists conversational message history between Agency and AI assistant. |
| `tour_preference_profiles` | `INSERT`, `SELECT`, `UPDATE` | FR-004 (F-MATCH-04), FR-009 (F-MATCH-09), BR-004 | Stores extracted structured tour constraints, attributes, and normalized weights. |
| `provider_profiles` | `SELECT` only | FR-005 (F-MATCH-05), BR-003 | Verifies candidate eligibility (`profile_verification_status = 'Approved'` and published version). |
| `experiences` | `SELECT` only | FR-005 (F-MATCH-05), FR-006 (F-MATCH-06) | Retrieves candidate experiences, capacity limits, duration, and pricing for constraint checking. |
| `villages` | `SELECT` only | FR-005 (F-MATCH-05), FR-006 (F-MATCH-06) | Retrieves village coordinates and locations for route and distance calculation. |
| `recommendation_results` | `INSERT`, `SELECT` | FR-007 (F-MATCH-07), FR-008 (F-MATCH-08), BR-007, BR-020 | Persists ranked candidate recommendations with scores (0–100) and explanations for each run. |
| `quote_requests` | `INSERT`, `SELECT` | FR-011 (F-MATCH-11), BR-009, BR-018 | Creates or reuses a single commercial pre-negotiation interest record per (Agency, Experience) pair. |
| `chat_sessions` | `SELECT`, `INSERT` | FR-011 (F-MATCH-11), BR-019 | Opens or reuses an active chat session between Tour Agency and Local Provider. |
| `agency_preference_profiles` | `SELECT`, `INSERT`, `UPDATE` | FR-010 (F-MATCH-10), FR-016 (F-MATCH-16), BR-014, BR-022 | Stores and updates persistent cumulative agency preferences for future matching and Explore re-ranking. |
| `preference_signals` | `INSERT`, `SELECT`, `UPDATE` | FR-014 (F-MATCH-14), FR-015 (F-MATCH-15), BR-013, BR-021 | Records discrete interaction signals and applies 30-day exponential half-life time-decay. |

---

## Explicit Boundaries & Non-Operations
- **`bookings` table**: Strictly **NOT WRITTEN** (`BR-009`, `BR-010`). Selecting "Request Quote" or "Chat" never creates a booking record. Bookings are handled exclusively by Provider through the Booking/Schedule module.
- **`user_accounts` & Auth**: Authentication sessions are assumed present via mock context in tests; production login UI is deferred to Session 11.
