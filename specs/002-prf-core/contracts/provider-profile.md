# Contract: Provider Profile (FR-003, FR-004, FR-005)

Source: `specs/002-prf-core/spec.md` §5.1

---

## GET /api/prf/provider/:providerId

Returns Provider profile fields filtered by actor visibility (BR-004).
Returns published version fields when `published_version_no IS NOT NULL`.

### Request

| Field | Location | Type | Required |
|-------|----------|------|----------|
| `providerId` | Path param | UUID | Yes |

### Response — 200 OK

```typescript
{
  provider_id: string;
  // Public fields (all actors including Guest):
  provider_name: string;                   // maps to provider_profile_versions.business_name
  craft_type: CraftType;
  general_description: string;             // maps to provider_profile_versions.description
  public_images: ImageMeta[];
  participant_capacity?: { min_pax: number; max_pax: number };
  availability_summary?: object;           // computed from provider_operating_hours + bookings

  // Authenticated full fields (Tour Agency, own Provider):
  experiences?: Experience[];
  pricing?: number;                        // price_per_person of published experiences
  capacity?: number;                       // max_participants
  contact?: ContactInfo;
  availability?: object;
  booking_conditions?: object;

  // Own Provider / UBND / HDT:
  verification_status?: "Draft" | "Pending Verification" | "Verified" | "Revision Required";

  // HDT only:
  quality_metrics?: {
    total_bookings: number;
    average_booking_value: number;
    cancellation_rate: number;
    profile_completeness_score: number;
  };
}
```

### Error responses

| Status | Condition |
|--------|-----------|
| 404 | Provider not found |
| 403 | Actor not permitted |

---

## PATCH /api/prf/provider/:providerId

Updates own Provider profile. Only the Provider Owner may call this (BR-002).

### Request body

```typescript
{
  business_name?: string;                  // max 255; major change if Verified → BR-018
  craft_type?: CraftType;                  // major change if Verified → BR-018
  artisan_names?: string[];
  business_registration_number?: string;   // major change if Verified → BR-018
  business_registration_certificate?: FileRef;  // PDF/JPG/JPEG/PNG, max 10MB
  location_address?: string;
  description?: string;                    // max 1000 chars
  operating_hours?: OperatingHoursInput;   // BR-021
  booking_conditions?: object;
  profile_images?: FileRef[];              // JPG/JPEG/PNG/WEBP, max 10MB, min 1280×720
}
```

### Response — 200 OK

```typescript
{
  updated_profile: ProviderProfile;
  success_message: string;
  updated_at: string;
  change_log_entry: object;
  profile_verification_status: "Draft" | "Pending Verification" | "Verified" | "Revision Required";
  published_profile_version_status: "None" | "Verified";
  rereview_required: boolean;
}
```

### Error responses

| Status | Condition |
|--------|-----------|
| 400 | Validation error |
| 403 | Not the owner (BR-002) |
| 404 | Provider not found |

---

## POST /api/prf/provider/:providerId/verify

UBND Admin submits a review decision. Only UBND within the assigned village may call this (BR-005).

### Request body

```typescript
{
  decision: "Approve" | "Request Revision";
  revision_comments?: string;    // Required when decision = "Request Revision" (BR per spec Q17)
}
```

### Response — 200 OK

```typescript
{
  submitted_profile_view: ProviderProfileView;
  verification_status: "Verified" | "Revision Required";
  reviewer_id: string;           // maps to provider_verification_reviews.reviewer_user_id
  reviewed_at: string;           // ISO 8601
  revision_comments?: string;
  published_version_updated: boolean;
}
```

### Error responses

| Status | Condition |
|--------|-----------|
| 400 | Missing revision_comments when decision = Request Revision |
| 403 | UBND not assigned to this provider's village (BR-005); or caller is not UBND |
| 404 | Provider not found or no Pending Verification version |

---

## Shared types

```typescript
type CraftType = "Ceramics" | "Silk/Textile" | "Woodcarving" | "Food/Culinary" | "Metalwork" | "Paper/Painting" | "Other";

type OperatingHoursInput = {
  Monday?: TimeRange[];
  Tuesday?: TimeRange[];
  Wednesday?: TimeRange[];
  Thursday?: TimeRange[];
  Friday?: TimeRange[];
  Saturday?: TimeRange[];
  Sunday?: TimeRange[];
};
type TimeRange = { start: string; end: string };  // "HH:MM" local time

type ContactInfo = { contact_person_name?: string; phone_number?: string; business_email?: string };
```
