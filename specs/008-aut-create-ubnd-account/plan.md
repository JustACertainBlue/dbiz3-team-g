# Implementation Plan: US-7 Create UBND Account

Feature folder: `specs/008-aut-create-ubnd-account`
Branch: `001-aut-registration`
Stack: TypeScript 5.x, Node.js ≥ 22.0.0, Next.js App Router (`src/` layout), PostgreSQL, Vitest

---

## Scope Table

| ID | Type | Description |
|---|---|---|
| F-AUTH-19 | Function | HDT creates UBND account with assigned village and temporary credentials |
| FR-019 | Functional Req | Validate input, auto-generate temp password, create ADMIN/UBND record, status=Active, must_change_password=true, assign village, send credentials via outbox |
| BR-007 | Business Rule | HDT creates UBND accounts; UBND creates Local Provider accounts |
| BR-008 | Business Rule | Each UBND account is assigned to exactly one fixed village |
| US-7 AS-1 | Acceptance | Valid UBND data + unassigned village → Active UBND account + village assignment |
| US-7 AS-2 | Acceptance | New UBND user receives temp credentials and must_change_password=true |
| US-7 AS-3 | Acceptance | Non-HDT actor cannot create a UBND account |
| ADM117 | Screen | Create Account — HDT flow: name, email, phone, assigned_village_id |

**Out of scope for this story:** F-AUTH-20, F-AUTH-21/22, ADM095 full implementation.

---

## Constitution Check

- All requirements from spec-AUT.md; no invention.
- Data structures from data/schema.sql only.
- Tests written before code (constitution II).
- One story end-to-end: screen + logic + data (constitution III).
- No real personal data or secrets.

---

## Technical Context

### Reuse from earlier stories

| Component | Location | Reuse |
|---|---|---|
| `query` / `getPool` | `src/lib/db.ts` | DB access pattern |
| `hashPassword` | `src/lib/password.ts` | Temp password hashing |
| `verifySession` | `src/lib/auth.ts` | Session guard for admin-only endpoint |
| Outbox pattern | `src/lib/agency-review.ts` | Write JSON to `var/outbox/` |
| Global CSS | `src/app/globals.css` | Styling |

### Database tables used (from data/schema.sql)

| Table | Usage |
|---|---|
| `user_accounts` | INSERT new UBND user (role_code='ADMIN', admin_type='UBND', account_status='Active', must_change_password=true) |
| `ubnd_village_assignments` | INSERT (ubnd_user_id, village_id, assigned_by, assigned_at) |
| `villages` | Validate that village_id exists and is_active=true |
| `sessions` | Read (verifySession guard) |
| `audit_logs` | INSERT action='UBND_ACCOUNT_CREATED' (SC-008) |

### Temporary password strategy

Auto-generated: `randomBytes(16).toString('hex')` — 32-char hex satisfying all complexity rules. Written to outbox file only. Never persisted in plain text; never returned to client.

### Village already assigned check

Enforced at application layer: pre-check `ubnd_village_assignments` for existing row with village_id before insert.

---

## Phase 1: Design

### API Contract

POST /api/admin/accounts/ubnd
- Auth: session with role=ADMIN, admin_type=HDT
- Input: { name, email, phone, assigned_village_id }
- Output 201: { user_id, account_status: "Active", must_change_password: true, credential_email_status, village_assignment, success_notification }
- Output error: { error_message, field_errors? }

### Screen ADM117 (HDT section)

Path: src/app/admin/create-account/page.tsx
Fields: Name, Email, Phone, Assigned village id
On success: navigate to ADM095 (/admin/users)
On error: inline field errors

### Complexity Tracking

| Item | Decision |
|---|---|
| No new npm dependency needed | All logic uses Node.js builtins + existing pg pool |
| Placeholder: ADM079 | /admin/dashboard — already exists |
| ADM095 | Placeholder already exists; upgraded in US-9 |
