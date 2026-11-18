# AIT Matching — Implementation Planning Inputs

**Updated:** 2026-11-15  
**Purpose:** Consolidate repository evidence and the remaining questions needed to plan the next AI Matching implementation.  
**Evidence note:** “Verified in repository” means checked in source/docs/tests, not queried against a live database or deployment.

## Executive summary

- The user journey is the `/ai-matching` page, but extraction and matching are separate API calls: the conversation goes through `/api/ait/sessions/:id/messages`, then a completed profile is sent to `/api/ait/matching`.
- Extraction currently tries Cloudflare Workers AI, then OpenRouter, then a rule-based fallback that includes regex. Matching itself is deterministic filtering and weighted scoring; it does not call an LLM.
- The main application uses Next.js 14 / React 18 / Node.js 22 and Supabase PostgreSQL for live data. It is not a Cloudflare Workers + D1 application. Cloudflare is an AI API provider only.
- Current hard filtering checks group capacity and budget. Date availability is not checked by the matching hard-constraint code; route scoring uses estimates/defaults rather than a live routing service.
- The repo does not provide a current live DB audit, a measured AI cost/latency report, or a clearly identified 54-case test report. These remain inputs to obtain before setting acceptance criteria.

## 1. Current code and architecture

### 1.1 AIT121 request flow

1. The UI at [`src/app/ai-matching/page.tsx`](../../src/app/ai-matching/page.tsx) creates/loads an Agency matching session.
2. The UI posts each turn to [`POST /api/ait/sessions/:id/messages`](../../src/app/api/ait/sessions/[id]/messages/route.ts). That route authorizes the Agency and session owner, saves the message, then calls `extractTourContext`.
3. [`src/lib/ai/extractor.ts`](../../src/lib/ai/extractor.ts) delegates to `ConversationalAiService.processConversation`.
4. [`src/lib/ai/llm-service.ts`](../../src/lib/ai/llm-service.ts) tries Workers AI first, OpenRouter as a fallback, and then rule-based extraction if neither returns a usable response. Regex parsing is in this fallback; regex is not the only/current primary extractor.
5. When the profile is complete, the UI posts it to [`POST /api/ait/matching`](../../src/app/api/ait/matching/route.ts).
6. Matching retrieves Verified + published candidates through [`src/lib/matching/candidate-repo.ts`](../../src/lib/matching/candidate-repo.ts), applies hard constraints in [`constraint-engine.ts`](../../src/lib/matching/constraint-engine.ts), ranks them in [`scoring-engine.ts`](../../src/lib/matching/scoring-engine.ts), and builds recommendations.

Test-mode requests use the isolated fixture in [`tests/fixtures/ai-matching/villages_providers_activities_merged.json`](../../tests/fixtures/ai-matching/villages_providers_activities_merged.json), with image mapping in [`media_manifest.json`](../../tests/fixtures/ai-matching/media_manifest.json). The route returns test media URLs only for test-mode recommendations.

### 1.2 Matching endpoint contract

`POST /api/ait/matching` requires an authenticated `Tour_Agency`. `session_id` is optional, but when supplied it must belong to that Agency. `tour_preference_profile` is required. The endpoint currently checks that a profile exists; it does not validate the full profile using the exported Zod schema.

Example request:

```json
{
  "session_id": "matching-session-uuid",
  "tour_preference_profile": {
    "hard_constraints": {
      "group_size": 10,
      "max_budget_per_person": 300000,
      "target_date_or_range": {
        "start_date": "2026-11-20"
      },
      "origin": {
        "origin_address": "Hoàn Kiếm"
      }
    },
    "matching_attributes": [
      { "type": "craft_preference", "value": "silk" },
      { "type": "experience_type", "value": "Workshop/Hands-on" }
    ],
    "preference_weights": {
      "experience_fit": 0.4,
      "route_convenience": 0.25,
      "agency_preferences": 0.2,
      "provider_quality": 0.15
    }
  }
}
```

Example successful response shape (exact result values depend on the catalog):

```json
{
  "is_test": false,
  "top_matches": [
    {
      "experience_id": "experience-uuid",
      "provider_id": "provider-uuid",
      "experience_name": "Dệt lụa truyền thống",
      "provider_name": "Xưởng thủ công Vạn Phúc",
      "village_name": "Vạn Phúc",
      "rank": 1,
      "match_score": 89.4,
      "price_per_person": 175000,
      "max_participants": 13,
      "explanation": "Matches your silk preference and group size."
    }
  ],
  "additional_suggestions": []
}
```

If there are no eligible results, the endpoint returns `top_matches: []` and `relaxation_suggestions`. Expected errors include `401` unauthenticated, `403` wrong role/session ownership, and `400` invalid/missing request data. The published contract is [`specs/001-ait-core/contracts/matching-api.md`](../../specs/001-ait-core/contracts/matching-api.md).

### 1.3 Current data model

[`data/schema.sql`](../../data/schema.sql) defines PostgreSQL tables:

| Entity | Current relevant fields |
|---|---|
| `villages` | `village_id`, `source_code`, `name`, `district`, `city_province`, `is_active` |
| `provider_profiles` | `provider_id`, `village_id`, `verification_status`, `published_version_no` |
| `provider_profile_versions` | `business_name`, `craft_type`, `location_address`, `description`, `contact_information`, version status |
| `experiences` | `name`, `description`, `category`, `duration_minutes`, `price_per_person`, `max_participants`, `notice_period_hours`, `experience_location_address` |
| `bookings` | `experience_id`, `start_at`, `end_at`, `group_size`, `status`, agreed price and condition snapshot |

`experiences` has no generic activity-tag or coordinate columns in this schema; the provider profile version has a craft type. Matching candidate records currently carry coordinates/distance as application-level fields. The loader currently supplies fallback/default route data, and the scoring code uses estimates. A live booking-conflict/availability query is not part of the current matching filter.

### 1.4 Stack and deployment

- **Verified in repository:** TypeScript, Node.js 22.x, Next.js 14 App Router, React 18, Vitest 2.
- **Database:** Supabase PostgreSQL is the live application store; ordinary tests use isolated fixtures. See [`src/lib/db/application-store.ts`](../../src/lib/db/application-store.ts), [`AGENTS.md`](../../AGENTS.md), and [`docs/env/supabase-quickstart.md`](../../docs/env/supabase-quickstart.md).
- **Hosting decision:** accepted ADR specifies one Render web service and Supabase PostgreSQL/Storage; see [`docs/adr/0001-hosting.md`](../../docs/adr/0001-hosting.md).
- **Deployment state:** repository guidance says public deployment is a separate integration. The hosting ADR does not prove that a live service is currently deployed. Confirm the public URL and current status with the owner.
- **Not in this stack:** Cloudflare D1. Cloudflare Workers AI is called as an external API from the Node application.

## 2. Data status and quality

### 2.1 What can be established from the repo

- The canonical synthetic seed is under [`data/seed/`](../../data/seed/); its Experience CSV includes price, capacity, notice period and location address.
- The AI test fixture is separate from the canonical seed and has test-specific mapping logic. Its test asserts 30 test candidates; this must not be used as a live-provider count.
- The merged test JSON identifies itself as batch `1+2`, and its metadata says eight village datasets were added in a later revision. It is not a database inventory or a verification audit.
- `loadExperiences()` returns only providers marked Verified with a published profile version. `getTestCandidates()` constructs test candidates with a Verified status for test execution.

### 2.2 Metrics requiring a DB/data-owner report

No live database query or seed-quality audit was performed for this document. Please provide:

1. The authoritative village roster and count (the request mentions 15; reconcile this against the current fixture/seed roster).
2. Counts and percentages by status: `verified`, `from_source_only`, `unverified` (confirm exact status vocabulary first).
3. Null/missing rates for capacity, notice period, price, coordinates/location, and activity tags.
4. Number of `[DEMO]` records still in the development/production databases, and the approved replacement/cleanup plan.
5. Whether the test fixture may contain non-synthetic contact details/source data, and whether it is approved for continued use in committed tests.

The SQL schema marks Experience price, capacity and notice period `NOT NULL`, while raw source/test data can still be incomplete. The current seed loader and test-data parser have defaults for some missing values; that is not the same as a product-approved display rule.

**Decision needed:** when source data is absent or unverified, should the UI show “Chưa có dữ liệu”, hide the field, or exclude the candidate? Define separate rules for user-facing display and match eligibility.

## 3. Functionality decisions to confirm

### 3.1 Intent and profile fields

The current profile types can represent group size, visitor profile, tour purpose, date/range, origin/route, experience types, craft preference, budget, intensity and special requirements. Current completeness logic requires group size, date, origin and experience/craft preference (unless explicitly waived).

Please confirm which fields are required for this release:

- [ ] Area/location: departure origin, desired village/destination, or both?
- [ ] Budget: total tour budget, per-person ceiling, or both? Currency and inclusive/exclusive costs?
- [ ] Date: exact date/range, flexible date, and timezone rules?
- [ ] Group size: one number, min/max range, and acceptable splitting/rotation?
- [ ] Preference: craft, activity type, sightseeing/workshop/show/food, duration/intensity?
- [ ] Visitor profile: school, corporate, family, age/accessibility/language needs?
- [ ] Optional needs: guide language, meals, restroom, bus parking, accessibility?

### 3.2 Hard constraints vs. scoring preferences

**Current implementation:** group capacity and maximum price are hard filters; experience/craft fit, route convenience, agency preference and provider quality contribute to a weighted score. Candidates below 60/100 are removed. Although date is extracted and stored in the profile, the current hard-constraint engine does not enforce date availability. The candidate API also does not currently reject a date based on existing Bookings.

**Decision needed:** list each field as **hard filter**, **soft score**, **informational only**, or **not in this release**. In particular decide date/availability, maximum travel distance/time, minimum quality/trust level, and unknown/null values.

### 3.3 Results and chatbot scope

**Current implementation:** up to five top matches and additional suggestions, with explanations. Matching can hand off to Request Quote or Chat; AIT does not create a Booking. The existing app has no itinerary builder or payment step in this matching endpoint.

Please decide whether this release needs:

- [ ] Ranked matches and explainable reasons only.
- [ ] Multi-stop itinerary generation (and if so, travel time, opening hours and schedule constraints).
- [ ] Business tags such as free entry, souvenirs, meals, group discounts, or verified/trust signals.
- [ ] Real-time availability and how it is sourced/updated.
- [ ] A minimum set of provider evidence to show in a trust signal.

The current knowledge base is an in-code, keyword-matched catalog, not a vector/RAG service. Prompts ask the assistant to stay within platform scope and avoid fabricating unavailable providers, but the knowledge content itself needs an owner review before being treated as authoritative. Confirm:

1. Approved sources the assistant may use (catalog only, approved documentation, or external sources).
2. What it may answer (tour matching, village/activity facts, platform help, etc.).
3. What it must refuse or hand off, and the exact behavior when data is missing or stale.

## 4. AI infrastructure and retrieval

### 4.1 Existing code defaults

- Cloudflare Workers AI is the primary LLM provider when configured. Code defaults are `@cf/meta/llama-3.1-8b-instruct`, with `@cf/zai-org/glm-4.7-flash` as its fallback.
- OpenRouter is a secondary provider. Code defaults are `google/gemini-2.0-flash-lite:free` with configured free-model fallbacks.
- Rule-based extraction is used if no LLM provider produces a usable response.
- Candidate scoring is deterministic application code; an LLM is not used to calculate the match score.
- Code comments describe a 10,000 Neurons/day Workers AI free allocation and a 24-hour cooldown. These are implementation assumptions, not a checked current quota/price commitment.
- Client timeouts default to 30 seconds. No repository evidence was found for measured p95 latency or actual monthly cost.

Please confirm model/provider approval, current account quotas, production cost ceiling, latency target, and whether user messages may be sent to these third-party AI services.

### 4.2 Semantic search and activity text

No embedding model, Vectorize index, or TF-IDF implementation was found in the AIT path. Knowledge retrieval currently scores keyword/topic matches from a static knowledge base.

**Decision needed:** retain keyword search for this slice, implement TF-IDF, or adopt an embedding service (and specify model, language coverage, update/index process, privacy and cost). If embedding activities, approve a canonical text template, for example:

`activity name + description + category + craft type + village + provider's verified description + tags`

Confirm which fields must be excluded (personal contact fields, unverified claims, prices that change, etc.) and how stale indexed text is refreshed.

## 5. Guardrails and access control

**Verified in code:**

- Matching session routes require an authenticated Tour Agency; messages/handoffs also verify that the session belongs to that Agency.
- The extraction service checks common prompt-injection phrases and patterns that request another Agency’s/private or admin-only data.
- The system prompt instructs the model not to reveal secrets/system instructions and to stay within platform scope.
- Authorization is enforced in API code, independently of the prompt. The text-pattern checks are heuristics, not a security guarantee.

Please confirm:

1. Role-to-resource permissions for Agency, Provider, UBND and HDT; which provider/catalog fields are public to an Agency?
2. Whether unverified providers/activities are completely excluded or can appear with an explicit status.
3. Required tests for cross-Agency isolation, prompt injection, prompt disclosure, tool/API misuse, and out-of-scope requests.
4. Whether AI logs may store user messages, retention period, and redaction requirements.
5. Exact refusal/fallback copy and whether unsupported queries should offer nearby supported alternatives.

## 6. Tests and acceptance criteria

### 6.1 Evidence in repository

- Relevant suites include [`tests/integration/matching-scenarios.test.ts`](../../tests/integration/matching-scenarios.test.ts), [`tests/integration/ait-matching-api.test.ts`](../../tests/integration/ait-matching-api.test.ts), [`tests/unit/ait-test-dataset-matching.test.ts`](../../tests/unit/ait-test-dataset-matching.test.ts), and other AIT unit/integration tests.
- [`docs/test/test-plan.md`](../../docs/test/test-plan.md) describes normal, boundary, error and permission cases, but no current results sheet for a specifically named 54-case suite was found.
- Repository instructions record a historical run of 1,030 passing tests on 2026-11-07. This is not a current run for this planning note.
- No tests were run while preparing this documentation-only file.

Please provide the 54-case source/list and its latest execution output, including pass/fail, skipped cases, environment, commit and date. Then agree:

- Minimum top-k relevance threshold and how “correct” labels are produced.
- Minimum pass rate (for example top-3 relevance); owner must approve the numeric target.
- Zero unauthorized data access/disclosure as a release gate.
- Required coverage for missing/null data, multilingual and typo input, date/capacity/budget boundaries, no-match, provider status, latency and quota exhaustion.
- Exact deadline, demo/nộp path and required versus deferred features.

## 7. Review feedback and scope boundary

No specific review comments were included with this request. Paste/link the review notes so each can be classified and accepted/rejected against product scope.

| Feedback item | Current implementation evidence | Decision |
|---|---|---|
| Tag comparison | No generic Experience tag field is in the current `experiences` schema or scoring factors; craft type/category are used. | Which tags are required, who owns them, and are they filters or score signals? |
| Trust signal | Candidate retrieval filters to Verified + published providers; scoring uses provider-quality values/defaults. No agreed user-facing trust-signal contract was found. | Define evidence, display and eligibility threshold. |
| Real-time availability | Date is extracted, but current matching does not check Booking conflicts/availability. Booking scheduling exists in BKG. | Is availability in this slice? If yes, define source of truth and race/staleness behavior. |
| UI changes | AIT121 and match cards already exist. | List specific UI acceptance criteria and whether they are in scope. |
| Payment | No payment flow in AIT matching/Quote/Chat handoff; Booking is handled by BKG. | Confirm explicitly out of scope unless a separate approved requirement says otherwise. |
| Itinerary / sales tags | Not returned by current matching API. | Include now or defer? Define output shape and source data. |

## Answers needed from the team

1. What is the authoritative 15-village roster, status breakdown and data-cleanup plan?
2. Which input fields are mandatory, optional, hard constraints and soft preferences?
3. Is date-based real-time availability part of this delivery?
4. What result payload is required: rank/reason only, tags/trust signals, itinerary, or some combination?
5. What are the approved AI model, provider, quota/cost ceiling, latency target and data-retention policy?
6. What is the 54-case test artifact and its latest run result? What quantitative acceptance threshold should apply?
7. What are the deadline and required demo/nộp flow?
8. Which exact review comments are in scope, and are UI/payment explicitly included or excluded?

