# Contract: Admin Dashboard REST API

**Feature**: `003-adm-core` | **Spec**: [specs/003-adm-core/spec.md](spec.md)

This contract defines the HTTP REST interface exposed by the Next.js App Router API routes to support Screen `ADM079` (Admin Dashboard).

> **Updated 2026-11-04 (Phase 5 port, T067).** Authentication is the server-side demo session: cookie
> `hab_demo_account` (`hdt`, `ubnd`, …; identities in `src/lib/auth/demo-session.ts`). A client-supplied
> session (`x-mock-session` header, `hab_mock_session` cookie) is ignored. No cookie or Guest → `401`;
> an authenticated actor that is not HDT/UBND → `403`. UBND's village comes from its identity
> (`ubnd_village_assignments.csv`), never from the request. Data comes from the shared JSON runtime, so
> Bookings created or changed by BKG are included. Time basis (`docs/spec/docs/consistency-contract.md:110`):
> Agency/Provider totals are snapshots at the end date; Booking totals, status breakdown, trend, table and
> top 10 use the Booking `created_at` within the period; Active Collaborations are pairs with an On hold or
> Booked Booking at the end date (from `booking_status_history`). Agency/Provider filters apply to the
> Booking table, top 10, status breakdown and trend, not to the four cards (spec #21). UBND Agency scope =
> Agencies with a Booking, Quote Request or Chat with a Provider in the village (spec #22). There is no
> `/api/adm/users` endpoint (User Management belongs to AUT, spec-ADM:48).

---

## Endpoints Summary

| Method | Path | Summary | Spec References |
|---|---|---|---|
| `GET` | `/api/adm/dashboard` | Retrieve aggregated dashboard metrics, charts, tables, and top pairs scoped to the admin actor. | FR-001..FR-010, BR-001..BR-019 |
| `GET` | `/api/adm/villages` | Retrieve available villages for the village filter panel (locked for UBND, unlocked for HDT). | FR-001, FR-005, BR-001..BR-004 |
| `GET` | `/api/adm/filter-options` | Autocomplete search for Agency and Provider filter selectors, scoped to permitted administrative boundary. | FR-006, BR-008, BR-009, BR-010 |

---

## 1. `GET /api/adm/dashboard`

Retrieves all aggregated operational metrics for the Admin Dashboard according to role, assigned village, time range, and entity filters.

### Request

- **Cookie**: `hab_demo_account=hdt` or `hab_demo_account=ubnd` (see the note above).

- **Query Parameters**:
  | Parameter | Type | Required | Default | Description |
  |---|---|---|---|---|
  | `preset` | `string` | No | `Last 30 days` | Period preset: `Last 7 days`, `Last 30 days`, `Last 90 days`, `Last year`, `Custom`. |
  | `startDate` | `string` (ISO date) | If preset=`Custom` | Derived | Start date of custom reporting window (`YYYY-MM-DD`). |
  | `endDate` | `string` (ISO date) | If preset=`Custom` | Derived | End date of custom reporting window (`YYYY-MM-DD`). |
  | `villageId` | `string` (UUID) | No | `null` | Target village. Ignored and forced to assigned village for `UBND` Admins (`BR-002`, `BR-003`). |
  | `agencyId` | `string` (UUID) | No | `null` | Filter booking list and top pairs by specific Agency (`BR-014`). |
  | `providerId` | `string` (UUID) | No | `null` | Filter booking list and top pairs by specific Provider (`BR-014`). |
  | `sortBy` | `string` | No | `Frequency` | Top collaboration sort order: `Frequency` or `Recency` (`FR-010`). |

### Response `200 OK`

```json
{
  "scope": {
    "role": "ADMIN",
    "adminType": "HDT",
    "assignedVillageId": null,
    "effectiveVillageId": null,
    "isVillageFilterLocked": false
  },
  "period": {
    "preset": "Last 30 days",
    "startDate": "2026-09-18T00:00:00.000Z",
    "endDate": "2026-10-18T23:59:59.999Z",
    "granularity": "Daily"
  },
  "metricCards": [
    {
      "label": "Total Agencies",
      "value": 12,
      "trendPct": 8.5,
      "trendDirection": "Up",
      "subLabel": "Registered Tour Agencies"
    },
    {
      "label": "Total Providers",
      "value": 24,
      "trendPct": 0.0,
      "trendDirection": "Flat",
      "subLabel": "Local Artisan Workshops"
    },
    {
      "label": "Total Bookings",
      "value": 158,
      "trendPct": 14.2,
      "trendDirection": "Up",
      "subLabel": "In selected reporting period"
    },
    {
      "label": "Active Collaborations",
      "value": 18,
      "trendPct": null,
      "trendDirection": null,
      "subLabel": "Unique pairs with active bookings"
    }
  ],
  "agencyMetrics": {
    "countsByStatus": {
      "Pending Approval": 2,
      "Approved": 8,
      "Rejected": 1,
      "Disabled": 1
    },
    "activeAgencyCount": 7,
    "statusChartData": [
      { "status": "Approved", "count": 8, "pct": 66.7 },
      { "status": "Pending Approval", "count": 2, "pct": 16.7 },
      { "status": "Rejected", "count": 1, "pct": 8.3 },
      { "status": "Disabled", "count": 1, "pct": 8.3 }
    ]
  },
  "providerMetrics": {
    "countsByVillageAndStatus": [
      {
        "villageId": "20896522-6235-5699-aeaf-f48b8150d895",
        "villageName": "Bát Tràng",
        "accountStatus": { "Active": 8, "Disabled": 0 },
        "verificationStatus": { "Draft": 1, "Pending Verification": 1, "Verified": 6, "Revision Required": 0 }
      }
    ],
    "activeProviderCount": 15,
    "activityDistribution": [
      { "craftType": "Ceramics", "activityType": "Booking", "count": 85 },
      { "craftType": "Ceramics", "activityType": "Quote Request", "count": 42 },
      { "craftType": "Silk/Textile", "activityType": "Booking", "count": 55 }
    ]
  },
  "bookingMetrics": {
    "countsByStatus": {
      "On hold": 14,
      "Booked": 68,
      "Completed": 62,
      "Cancelled": 14
    },
    "statusChartData": [
      { "status": "Booked", "count": 68, "pct": 43.0 },
      { "status": "Completed", "count": 62, "pct": 39.2 },
      { "status": "On hold", "count": 14, "pct": 8.9 },
      { "status": "Cancelled", "count": 14, "pct": 8.9 }
    ],
    "trendChartData": [
      { "periodStart": "2026-09-18", "count": 5 },
      { "periodStart": "2026-09-19", "count": 8 }
    ],
    "bookingTable": [
      {
        "bookingId": "b1b2c3d4-0001-0001-0001-000000000001",
        "date": "2026-10-12T09:00:00Z",
        "agencyName": "Indochina Heritage Voyages",
        "providerName": "Xưởng Gốm Hưng Thịnh Bát Tràng",
        "experienceName": "Nghệ thuật vuốt gốm truyền thống",
        "status": "Booked",
        "price": 3500000.00
      }
    ]
  },
  "collaborationMetrics": {
    "topPairs": [
      {
        "agencyId": "5fecc699-71e4-5bf0-ac1b-2090e05c2cd9",
        "agencyName": "Indochina Heritage Voyages",
        "providerId": "50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374",
        "providerName": "Xưởng Gốm Hưng Thịnh Bát Tràng",
        "bookingCount": 24,
        "lastDate": "2026-10-15T14:30:00Z"
      }
    ],
    "sortBy": "Frequency",
    "visualizationType": "Ranked List"
  }
}
```

The response also contains `pendingVerification` (A6): `Array<{ kind: 'Provider' | 'Agency', id, name, villageId | null, submittedAt }>`
— Providers with `verification_status = Pending Verification` and Agency registration requests in Pending Approval,
read-only; UBND receives only its village's Providers and no Agencies.

### Error Responses

- `400 Bad Request`:
  ```json
  { "error": "Invalid date range: startDate must be before or equal to endDate" }
  ```
- `401 Unauthorized` (no `hab_demo_account` cookie, or Guest; a forged `x-mock-session` is ignored):
  ```json
  { "error": "Authentication required. Please provide a valid session." }
  ```
- `403 Forbidden`:
  ```json
  { "error": "Forbidden: Admin privileges required to view dashboard." }
  ```

---

## 2. `GET /api/adm/villages`

Retrieves the list of craft villages eligible for filtering.

### Request

- **Cookie**: `hab_demo_account` (HDT or UBND)

### Response `200 OK`

- **For HDT Admin**:
  ```json
  {
    "isLocked": false,
    "assignedVillageId": null,
    "villages": [
      { "villageId": "20896522-6235-5699-aeaf-f48b8150d895", "name": "Bát Tràng", "district": "Gia Lâm" },
      { "villageId": "c0d0d95f-d59c-5c35-946a-f397e380dd14", "name": "Vạn Phúc", "district": "Hà Đông" },
      { "villageId": "688d408b-9d98-5b66-bfa7-659a67462108", "name": "Chuông", "district": "Thanh Oai" },
      { "villageId": "b1017646-ec89-58d1-aaa9-df783b1c2506", "name": "Quất Động", "district": "Thường Tín" }
    ]
  }
  ```

- **For UBND Admin**:
  ```json
  {
    "isLocked": true,
    "assignedVillageId": "20896522-6235-5699-aeaf-f48b8150d895",
    "villages": [
      { "villageId": "20896522-6235-5699-aeaf-f48b8150d895", "name": "Bát Tràng", "district": "Gia Lâm" }
    ]
  }
  ```

---

## 3. `GET /api/adm/filter-options`

Provides autocomplete suggestions for Tour Agencies and Local Providers.

### Request

- **Cookie**: `hab_demo_account` (HDT or UBND)
- **Query Parameters**:
  - `type`: `agency` | `provider` (Required)
  - `query`: `string` (Optional search substring)

### Response `200 OK`

```json
{
  "type": "provider",
  "options": [
    {
      "id": "50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374",
      "name": "Xưởng Gốm Hưng Thịnh Bát Tràng",
      "villageId": "20896522-6235-5699-aeaf-f48b8150d895"
    }
  ]
}
```
*(For UBND Admin, only providers situated in the assigned village and agencies that have historical interactions with that village are returned).*
