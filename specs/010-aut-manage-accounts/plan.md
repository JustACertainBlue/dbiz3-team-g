# Implementation Plan: US-9 Manage Accounts

Feature folder: `specs/010-aut-manage-accounts`
Branch: `001-aut-registration`
Stack: TypeScript 5.x, Node.js ≥ 22.0.0, Next.js App Router (`src/` layout), PostgreSQL, Vitest

---

## Scope Table

| ID | Type | Description |
|---|---|---|
| F-AUTH-21 | Function | View user accounts (HDT platform-wide; UBND assigned village Local Providers only) |
| F-AUTH-22 | Function | Trigger account management actions: Disable, Enable, Reset Password |
| F-AUTH-16 | Function | Verify role permission and resource data scope on every action |
| FR-021 | Functional Req | View accounts with filters (org, role, status, date), pagination, and permitted inline actions |
| FR-022 | Functional Req | Execute Disable (invalidates sessions, records status history), Enable (restores previous status), Reset Password (temporary credentials to outbox) |
| BR-009 | Business Rule | UBND may manage only Local Provider accounts in its assigned village |
| BR-010 | Business Rule | Account management cannot modify business/profile content |
| BR-011 | Business Rule | Permission checks require both role permission and resource/data scope |
| BR-012 | Business Rule | Account status and role consistency revalidated |
| BR-013 | Business Rule | Disabling an account invalidates active access immediately |
| US-9 AS-1 | Acceptance | HDT views platform-wide accounts; UBND views only Local Providers in assigned village |
| US-9 AS-2 | Acceptance | Disabling an account immediately revokes all active sessions |
| US-9 AS-3 | Acceptance | UBND may reset passwords only for Local Providers in assigned village |
| US-9 AS-4 | Acceptance | Neither HDT nor UBND can modify business/profile content through account management |
| ADM095 | Screen | User Management — account list, filters, available actions, navigation |
| ADM118 | Screen | Account Information & Access Actions — user details, action select (disable/enable/reset_password), reason, save, cancel |

**Out of scope for this story:** Editing provider or agency business profile details; ADM145 (view account details) gets a placeholder.

---

## Constitution Check

- All requirements from `docs/spec/specs/spec-AUT.md`; no invention.
- Data structures from `data/schema.sql` only: `user_accounts`, `account_status_history`, `sessions`, `provider_profiles`, `agency_profiles`, `ubnd_village_assignments`, `villages`, `audit_logs`.
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
| `verifySession` | `src/lib/auth.ts` | Session guard for admin endpoints |
| `generateTempPassword` | `src/lib/account-creation.ts` | Temporary password generation |
| Outbox pattern | `src/lib/account-creation.ts` | Write credential resets to `var/outbox/` |
| ADM095 page | `src/app/admin/users/page.tsx` | Upgrade placeholder to full implementation |
| Global CSS | `src/app/globals.css` | Styling |

### Database tables used

| Table | Usage |
|---|---|
| `user_accounts` | SELECT accounts, UPDATE `account_status`, `password_hash`, `must_change_password`, `updated_at` |
| `account_status_history` | INSERT on disable (`from_status`, `to_status='Disabled'`) and enable (`from_status='Disabled'`, `to_status=restoredStatus`) |
| `sessions` | UPDATE `revoked_at = now()` WHERE `user_id = $1 AND revoked_at IS NULL` on disable |
| `provider_profiles` | JOIN to filter by `village_id` for UBND scope |
| `agency_profiles` | JOIN for agency organization name |
| `ubnd_village_assignments` | JOIN to identify assigned village for UBND users |
| `villages` | JOIN to display village name in organization field |
| `audit_logs` | INSERT audit records for account actions |

---

## Phase 1: Design

### API Contracts

#### `GET /api/admin/accounts`
- Auth: session cookie (role `ADMIN`, admin_type `HDT` or `UBND`)
- Query params: `organization_id`, `role`, `status`, `date_from`, `date_to`, `page`, `page_size`
- Scope:
  - HDT: all accounts on platform
  - UBND: only `Local_Provider` accounts in assigned village
- Output 200:
  ```json
  {
    "users": [
      {
        "user_id": "uuid",
        "email": "user@example.com",
        "name": "Full Name",
        "organization": "Bat Trang Pottery / Hanoi Department of Tourism / UBND - Village",
        "role": "Local_Provider",
        "status": "Active",
        "last_login": "2026-10-28T12:00:00Z",
        "created_date": "2026-10-01T08:00:00Z",
        "available_actions": ["Disable", "Reset Password"]
      }
    ],
    "total_count": 1
  }
  ```

#### `POST /api/admin/accounts/[userId]/action`
- Auth: session cookie (role `ADMIN`, admin_type `HDT` or `UBND`)
- Body:
  ```json
  {
    "action_type": "disable" | "enable" | "reset_password",
    "reason": "optional text (for disable)"
  }
  ```
- Scope validation (F-AUTH-16):
  - HDT: can act on any account
  - UBND: can act only on Local Providers in its assigned village; otherwise `403 Forbidden`
- Output 200:
  ```json
  {
    "account_status": "Disabled",
    "sessions_invalidated": true,
    "temporary_password_email_status": "Success",
    "user_notification_status": "Success",
    "audit_log_id": "uuid"
  }
  ```

### Screen ADM095: User Management
- Path: `src/app/admin/users/page.tsx`
- Elements: Title, filters (role, status, date), account list table, inline action links (Manage access → ADM118, View account → ADM145), Create Account button (→ ADM117).

### Screen ADM118: Account Information & Access Actions
- Path: `src/app/admin/users/[userId]/actions/page.tsx` (or `/admin/account-actions/page.tsx?userId=...`)
- Elements: Account Identity display (read-only), Action type select (`disable`, `enable`, `reset_password`), Reason input, Save account action button, Cancel button (→ `/admin/users`).

### Placeholder Screen ADM145
- Path: `src/app/admin/view-account/page.tsx`
- Minimal placeholder showing Screen ID `ADM145` and Screen Name `View Account`.

### Complexity Tracking

| Item | Decision |
|---|---|
| ADM145 placeholder | Minimal placeholder per rule 4 |
| No new dependencies | Pure SQL + Next.js App Router |
