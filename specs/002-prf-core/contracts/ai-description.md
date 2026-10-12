# Contract: AI Description Refinement (FR-007)

Source: `specs/002-prf-core/spec.md` §5.1

---

## POST /api/prf/ai/description

Generates an AI-refined version of a Provider or Experience description. Only the owning
Local Provider may call this (BR-002). The original description is always retained in the
response (BR-012). The draft is **never** automatically saved as the published description
(BR-011, BR-012, BR-013).

### Request body

```typescript
{
  original_description: string;      // Required (BR-012: retained regardless)
  source_type: "Provider" | "Experience";  // Required
  experience_type?: ExperienceCategory;    // Optional — Experience only
  profile_context?: {
    business_name?: string;
    craft_type?: string;
    location?: string;
    target_audience?: string;
    raw_description?: string;
  };
}
```

### Response — 200 OK

```typescript
{
  refined_description_draft: string;   // Required — AI-generated rewrite
  original_description: string;        // Required — always returned unchanged (BR-012)
}
```

The response contains only the draft. The Provider then chooses one of:
- **Accept**: call PATCH on the owning profile/experience route with `description = refined_description_draft`
- **Edit**: modify the draft locally, then call PATCH
- **Regenerate**: call this endpoint again
- **Discard**: do nothing — the original is never replaced

### Error responses

| Status | Condition |
|--------|-----------|
| 400 | Missing required fields (`original_description`, `source_type`) |
| 403 | Caller is not a Local Provider or not the owner |
| 503 | OpenAI service unavailable (spec edge case: "AI refinement service is unavailable") |

### Service-unavailable handling

When `OPENAI_API_KEY` is absent or the OpenAI API returns an error, the route must return
`503 Service Unavailable` with a user-readable message. The original description must NOT
be modified.

### Test contract

Tests MUST verify:
1. A successful call returns both `refined_description_draft` and `original_description`.
2. The `original_description` in the response exactly matches the input (BR-012).
3. There is no code path that automatically writes `refined_description_draft` to any database table (BR-012, BR-013).
4. When the AI service is stubbed to fail, the route returns 503 (spec edge case).

---

## Shared types

```typescript
type ExperienceCategory = "Workshop/Hands-on" | "Sightseeing" | "Culinary/Tasting" | "Cultural Show" | "Combo";
```
