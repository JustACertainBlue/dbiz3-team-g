# Implementation Plan: US-8 Create Local Provider Account

Feature folder: `specs/009-aut-create-provider-account`
Branch: `001-aut-registration`
Stack: TypeScript 5.x, Node.js ≥ 22.0.0, Next.js App Router (`src/` layout), PostgreSQL, Vitest

---

## Scope Table

| ID | Type | Description |
|---|---|---|
| F-AUTH-20 | Function | UBND staff creates user account for Local Provider within its assigned village |
| FR-020 | Functional Req | Validate input, check email uniqueness, create user with role "Local_Provider", account_status="Active", must_change_password=true, generate temp password, send login credentials to Provider email, create empty Provider Profile with verification_status="Draft", village_id from UBND assignment |
| BR-007 | Business Rule | HDT creates UBND accounts; UBND is the operational creator of Local Provider accounts |
| BR-009 | Business Rule | UBND may manage only Local Provider accounts in its assigned village |
| BR-015 | Business Rule | Local Provider account Active status is separate from Provider profile verification |
| US-8 AS-1 | Acceptance | Valid Provider data within assigned village → Active Local Provider account + temp credentials + empty Draft provider profile |
| US-8 AS-2 | Acceptance | Provider from another village / requested village mismatch → denied (BR-009) |
| US-8 AS-3 | Acceptance | Account activation does not mean profile is verified (profile_verification_status = 'Draft') |
| ADM117 | Screen | Create Account — UBND flow: provider_name, address, contact (contact_person_name, phone_number), email, village_id (auto from UBND session assignment) |

**Out of scope for this story:** F-AUTH-19 (US-7, already done), F-AUTH-21/22 (US-9, manage accounts), Provider profile verification (other module / PRF).

---

## Constitution Check

- All requirements from `docs/spec/specs/spec-AUT.md`; no invention.
- Data structures from `data/schema.sql` only: `user_accounts`, `provider_profiles`, `provider_profile_versions`, `ubnd_village_assignments`, `audit_logs`.
- Tests written before code (constitution II).
- One story end-to-end: screen + logic + data (constitution III).
- No real personal data or secrets; disposable test DB only.

---

## Technical Context

### Reuse from earlier stories

| Component | Location | Reuse |
|---|---|---|
| `query` / `getPool` | `src/lib/db.ts` | DB access pattern |
| `hashPassword` | `src/lib/password.ts` | Temp password hashing |
| `verifySession` | `src/lib/auth.ts` | Session guard for UBND-only endpoint |
| Outbox pattern | `src/lib/account-creation.ts` | Write credentials JSON to `var/outbox/` |
| ADM117 screen | `src/app/admin/create-account/page.tsx` | Extend to render UBND provider form based on actor role/type |
| Global CSS | `src/app/globals.css` | Styling |

### Database tables used (from data/schema.sql)

| Table | Usage |
|---|---|
| `user_accounts` | INSERT new Local Provider user (`role_code='Local_Provider'`, `admin_type=NULL`, `account_status='Active'`, `must_change_password=true`) |
| `provider_profiles` | INSERT empty Draft profile (`provider_id`, `user_id`, `village_id`, `verification_status='Draft'`, `current_version_no=1`, `published_version_no=NULL`) |
| `provider_profile_versions` | INSERT initial draft version (`provider_id`, `version_no=1`, `version_status='Draft'`, `business_name`, `location_address`, `contact_information`) |
| `ubnd_village_assignments` | Read assigned `village_id` for the authenticated UBND actor |
| `audit_logs` | INSERT action='LOCAL_PROVIDER_ACCOUNT_CREATED' (SC-008) |

---

## Phase 1: Design

### API Contract

`POST /api/admin/accounts/provider`
- Auth: session cookie, requires role=`ADMIN`, admin_type=`UBND`
- Input: `{ provider_name, address, contact: { contact_person_name, phone_number }, email, requested_village_id? }`
  - Note: village_id is automatically taken from the actor's `ubnd_village_assignments`. If a client passes `requested_village_id` that differs from the assigned village, request is rejected with 403 (BR-009 / AS-2).
- Output 201:
  ```json
  {
    "user_id": "uuid",
    "account_status": "Active",
    "must_change_password": true,
    "credential_email_status": "Success",
    "success_notification": "Local Provider account created and credentials sent.",
    "provider_profile_id": "uuid",
    "profile_verification_status": "Draft"
  }
  ```
- Output error (400, 403, 409):
  ```json
  {
    "error_message": "string",
    "field_errors": [{ "field": "string", "message": "string" }]
  }
  ```

### Screen ADM117 (UBND section)

Path: `src/app/admin/create-account/page.tsx`
When actor is UBND (detected from session check / `/api/auth/me` or session response):
- Displays Provider creation form with:
  - Provider name (`provider_name`)
  - Address (`address`)
  - Contact Person Name (`contact_person_name`)
  - Contact Phone (`phone_number`)
  - Email (`email`)
  - Assigned Village ID (`village_id` — read-only display, populated from actor's assignment)
- Actions:
  - Create: submits to `POST /api/admin/accounts/provider`
  - Cancel: navigates to `/admin/users` (ADM095)

### Complexity Tracking

| Item | Decision |
|---|---|
| No new dependencies | Uses standard libraries and existing DB utilities |
| ADM117 screen | Shared page with conditional view: HDT sees UBND account creation; UBND sees Local Provider creation |
| ADM095 placeholder | Target navigation of Cancel button; placeholder exists, fully implemented in US-9 |
