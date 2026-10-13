# Explore browse contract — US-1

`GET /api/explore?page=1&page_size=12`

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

Guest responses have `price: null`. An approved synthetic Agency may be selected in development via `x-demo-agency-id` request header; the server validates the ID against seed before revealing price. This temporary adapter is disabled in production and is not a real authentication scheme. Invalid page inputs return 400. Empty results return 200 with an empty array and `total_count: 0`.

`actions` currently reports permissions from the spec. Quote/Chat handoff endpoints are not implemented in this US-1 slice; the UI says unavailable instead of presenting a broken action to the Agency.

`GET /explore` and `GET /explore/experiences/:id` render the Guest demo. Development-only Agency simulation is available through a query parameter on the UI, validated server-side. The detail destination is a navigation bridge; full F-EXPLORE-03/US-4 contract is deferred.
