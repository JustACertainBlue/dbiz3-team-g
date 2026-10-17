# Explore prototype API contract

`GET /api/explore?page=1&page_size=12&category=Workshop%2FHands-on`

Response 200:

```json
{
  "experience_cards": [
    {
      "id": "uuid",
      "name": "string",
      "type": "string",
      "location": { "village_name": "string" },
      "provider_name": "string",
      "images": [{ "storage_key": "string" }],
      "description": "string",
      "duration_minutes": 90,
      "capacity": { "min_pax": 1, "max_pax": 10 },
      "price": null,
      "actions": { "view_details": true, "request_quote": false, "chat": false }
    }
  ],
  "pagination": { "page": 1, "page_size": 12, "total_count": 1 }
}
```

Guest responses have `price: null`. `category` is optional and filters before pagination. An approved synthetic Agency may be selected in development via `x-demo-agency-id` request header; the server validates the ID against seed before revealing price. This temporary adapter is disabled in production and is not a real authentication scheme. Invalid page inputs return 400. Empty results return 200 with an empty array and `total_count: 0`.

`actions` reports permissions from the spec, **not implementation readiness**. Quote/Chat handoff endpoints are still absent; the UI says unavailable instead of presenting a broken action to the Agency.

`GET /explore`, `GET /explore/experiences/:id` and `GET /explore/providers/:id` render Guest and permitted detail views. Development-only Agency simulation is available through a query parameter on the UI, validated server-side. Missing media binaries and optional included/excluded items mean the full F-EXPLORE-03 contract is not complete.

## Development-only tracking endpoints

`POST /api/explore/session` accepts `{ "demo_agency_id"?: string, "analytics_consent"?: boolean }`. It creates/reuses a Guest or approved synthetic Agency session, sets the HTTP-only `explore_session` cookie and returns `session_id`, `tracking_scope`, `ranking_version_id` and ranked `results`. A Guest without analytics consent receives `No Non-essential Tracking` and no ranked exposure snapshot. The Agency ID is a **demo control, not authentication**.

`POST /api/explore/events` uses that cookie and accepts `event_id`, `action_type` (click card, expand preview, view detail, apply filter or scroll) plus permitted optional IDs, `filter_values` and elapsed seconds. It returns whether an interaction was logged and whether the Agency ranking was refreshed. Missing session returns 401; invalid input returns 400. Duplicate event IDs and Guest events without consent are not recorded. The endpoint does not accept Quote/Chat actions because those require real Auth/Chat integration.

Both POST endpoints return 503 in production. The prototype holds their state in memory and loses it on server restart. There is no durable FR-005–010 contract implementation or live Quote/Chat API yet; see [implementation status](../implementation-status.md).
