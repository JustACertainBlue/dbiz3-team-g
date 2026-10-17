# Contract: Experience Management (FR-006)

Source: `specs/002-prf-core/spec.md` §5.1

---

## POST /api/prf/experience

Creates a new Experience under the authenticated Provider (BR-002).

### Request body

```typescript
{
  provider_id: string;              // UUID — must match session provider
  name: string;
  description: string;
  category: ExperienceCategory;
  duration: number;                 // minutes, integer > 0
  images: ExperienceImageInput[];   // at least one per required category (BR-009)
  price_per_person: number;         // decimal > 0, VND (BR-010)
  max_participants: number;         // integer > 0 (BR-010)
  notice_period: number;            // hours, integer >= 0 (BR-010)
  cancellation_policy: CancellationPolicy;
  experience_location_address: string;
  group_discounts?: DiscountRule[];
  special_rates?: DiscountRule[];
}
```

### Response — 201 Created

```typescript
{
  experience: Experience;
  success_message: string;
  explore_listing_updated: boolean;
  matching_data_refreshed: boolean;
}
```

---

## GET /api/prf/experience/:experienceId

Returns full Experience detail for the owning Provider.

---

## PATCH /api/prf/experience/:experienceId

Updates an existing Experience. Only the owning Provider may call this (BR-002).

### Locked fields when active bookings exist (BR-014)

When `bookings` contains a row with `experience_id = this experience AND status IN ('On hold', 'Booked')`,
the following fields are read-only and must be rejected with `400 Active Booking Field Locked`:
`price_per_person`, `group_discounts`, `special_rates`, `max_participants`, `duration`, `experience_location_address`

Fields that remain editable: `description`, `images`, `notice_period`, `cancellation_policy`.

### Request body

All fields from POST body but all optional; omit `provider_id`.

### Response — 200 OK

```typescript
{
  experience: Experience;
  success_message: string;
  explore_listing_updated: boolean;
  matching_data_refreshed: boolean;
  validation_errors?: ValidationError[];
}
```

---

## DELETE /api/prf/experience/:experienceId

Deletes or archives an Experience (BR-019).

### Logic

1. Check for active bookings (`status IN ('On hold', 'Booked')`) → **block** (return 409).
2. Check for historical bookings (`status IN ('Completed', 'Cancelled')`) → **archive** (`archived_at = now()`).
3. No bookings at all → **hard delete**.

### Response — 200 OK

```typescript
{
  success_message: string;
  deletion_result: "Hard Deleted" | "Archived" | "Blocked by Active Booking";
  archived_at?: string;            // ISO 8601 — when archived
  explore_listing_updated: boolean;
  matching_data_refreshed: boolean;
}
```

### Error responses

| Status | Condition |
|--------|-----------|
| 400 | Validation errors (invalid price, capacity, etc.) |
| 403 | Not the owner |
| 404 | Experience not found |
| 409 | Blocked by active booking (BR-019) |

---

## Image management rules (BR-009, BR-015)

- Every Experience must have ≥ 1 image in each category: `Activity`, `Space`, `Product`.
- Deleting the last image in any required category is blocked until a replacement in the same category exists (BR-015).
- Image validation: JPG/JPEG/PNG/WEBP, max 10MB, min 1280×720 (BR-008).

---

## Shared types

```typescript
type ExperienceCategory = "Workshop/Hands-on" | "Sightseeing" | "Culinary/Tasting" | "Cultural Show" | "Combo";

type ExperienceImageInput = {
  file_id: string;
  category: "Activity" | "Space" | "Product";
  display_order: number;
};

type CancellationPolicy = {
  rules: Array<{ threshold_hours: number; fee_percentage: number }>;
  notes?: string;
};

type DiscountRule = {
  pax_threshold: number;     // integer > 0
  discount_percentage: number; // decimal 0–100
};

type ValidationError =
  | "Active Booking Field Locked"
  | "Active Booking Prevents Deletion"
  | "Required Image Category Missing"
  | "Last Required Category Image Cannot Be Deleted"
  | "Invalid Price"
  | "Invalid Capacity"
  | "Invalid Notice Period";

type Experience = {
  experience_id: string;
  provider_id: string;
  name: string;
  description: string;
  category: ExperienceCategory;
  duration: number;
  price_per_person: number;
  max_participants: number;
  notice_period: number;
  experience_location_address: string;
  cancellation_policy: CancellationPolicy;
  group_discounts: DiscountRule[];
  special_rates: DiscountRule[];
  archived_at?: string;
  created_at: string;
  updated_at: string;
};
```
