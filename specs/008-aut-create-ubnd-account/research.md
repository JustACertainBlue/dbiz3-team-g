# Research: US-7 Create UBND Account

## Decisions and Interpretations

### Interpretation 1: Village uniqueness enforcement
**Decision**: Enforce at application layer via pre-check query on `ubnd_village_assignments`.
**Rationale**: The schema has an index `ubnd_village_assignments_village_idx ON ubnd_village_assignments (village_id)` but this is not a UNIQUE constraint. We pre-check for an existing row with the same village_id before inserting. If found, return a 409/400 error.
**Recorded as proposed open question**: Yes — whether the village-uniqueness index should be upgraded to a UNIQUE constraint in the schema (Blocking: No).

### Interpretation 2: Temporary password format
**Decision**: `randomBytes(16).toString('hex')` → 32-character hex string. Satisfies 8–64 char, upper=no, but complexity rule requires uppercase. Use mixed approach: first 8 chars uppercase hex, next chars lowercase + digit + special.
**Revised Decision**: Use `randomBytes(12).toString('base64url').replace(/-/g,'a').replace(/_/g,'A').slice(0,16) + 'Aa1!'` → guaranteed to meet all complexity rules.
**Rationale**: Simpler and spec-safe. Temp password is written only to outbox, never returned to client.

### Interpretation 3: Role check for AS-3 (non-HDT cannot create UBND)
**Decision**: Check session admin_type === 'HDT'. If admin_type is 'UBND' or role is not 'ADMIN', return 403 Forbidden.
**Rationale**: FR-019 states "HDT staff creates..."; FR-016 enforces role/scope checks on every protected action.

### Interpretation 4: email uniqueness
**Decision**: Check `user_accounts_email_uq` index violation. If email already exists, return validation error.
**Rationale**: FR-019 requires email uniqueness (implied from global user_accounts_email_uq constraint).

## References
- spec-AUT.md §5 FR-019, §5.2 BR-007, BR-008
- data/schema.sql: user_accounts, ubnd_village_assignments, villages, audit_logs
- Pattern: agency-review.ts (outbox), auth.ts (verifySession), password.ts (hashPassword)

---

## Traceability Table

| Artifact | Scope ID |
|---|---|
| `src/lib/account-creation.ts` → `createUbndAccount()` | FR-019, BR-007, BR-008 |
| `src/app/api/admin/accounts/ubnd/route.ts` → POST handler | FR-019, FR-016 |
| `src/app/admin/create-account/page.tsx` → ADM117 screen | ADM117 (F-AUTH-19) |
| Field: Name | FR-019 input `name` |
| Field: Email | FR-019 input `email` |
| Field: Phone | FR-019 input `phone` |
| Field: Assigned village id | FR-019 input `assigned_village_id` |
| System field: Role (read-only) | ADM117 §3 element 6 |
| System field: Admin type (read-only) | ADM117 §3 element 7 |
| Button: Create | ADM117 §5 element 1 |
| Button: Cancel | ADM117 §5 element 2 |
| Audit log INSERT `UBND_ACCOUNT_CREATED` | SC-008 |

