# Contract: Agency Profile (FR-001, FR-002)

Source: `specs/002-prf-core/spec.md` §5.1

---

## GET /api/prf/agency/:agencyId

Returns Agency profile fields filtered by the calling actor's visibility permissions (BR-004).

### Request

| Field | Location | Type | Required |
|-------|----------|------|----------|
| `agencyId` | Path param | UUID | Yes |

### Response — 200 OK

```typescript
{
  agency_id: string;            // UUID
  agency_name: string;          // maps to agency_profiles.company_name
  company_type: "Travel Agency" | "Tour Operator" | "TMC";
  location: {
    street?: string;
    ward?: string;
    district?: string;
    city_province: string;
  };
  team_size: number;            // integer > 0
  // Authenticated collaboration fields (Local Provider, UBND, HDT):
  contact?: {
    contact_person_name?: string;
    phone_number?: string;
    business_email?: string;
  };
  // Full-detail fields (own Agency / HDT only):
  tax_id?: string;
  tour_types?: string[];
  description?: string;
  images?: ImageMeta[];
  account_status?: "Pending Approval" | "Approved" | "Rejected" | "Disabled";
}
```

### Error responses

| Status | Condition |
|--------|-----------|
| 404 | Agency not found |
| 403 | Actor not permitted to view any fields |

---

## PATCH /api/prf/agency/:agencyId

Updates the Agency's own profile. Only the Agency Owner (`agency_profiles.user_id = session.userId`) may call this (BR-001).

### Request body

```typescript
{
  company_name?: string;          // max 255 chars; major change → BR-017
  tax_id?: string;                // 10 or 13 numeric digits; major change → BR-017
  location?: { street?: string; ward?: string; district?: string; city_province?: string };
  description?: string;           // max 1000 chars
  contact_info?: { contact_person_name?: string; phone_number?: string; business_email?: string };
  team_size?: number;             // integer > 0
  tour_types?: string[];
  images?: FileRef[];             // JPG/JPEG/PNG/WEBP, max 10MB, min 1280×720 per BR-008
}
```

### Response — 200 OK

```typescript
{
  updated_profile: AgencyProfile;
  success_message: string;
  updated_at: string;             // ISO 8601
  change_log_entry: {
    editor_id: string;
    changed_fields: string[];
    edited_at: string;
    ip_address: string;
  };
  requires_hdt_rereview: boolean;
  major_change_review_status: "Not Required" | "Pending Review" | "Approved" | "Rejected";
  account_status: "Approved";    // always Approved while major-change review is pending
}
```

### Error responses

| Status | Condition |
|--------|-----------|
| 400 | Validation error (invalid tax_id format, image violations, etc.) |
| 403 | Caller is not the Agency Owner (BR-001) |
| 404 | Agency not found |

---

## POST /api/prf/agency/:agencyId/major-change

Internal endpoint; called by PATCH handler when a major-change field is detected.
Returns the same shape as the PATCH response.

---

## Shared types

```typescript
type FileRef = { file_id: string };   // stored_files.file_id already uploaded
type ImageMeta = { file_id: string; url: string; width: number; height: number };
```
