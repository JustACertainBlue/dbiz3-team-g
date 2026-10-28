# Tasks: US-7 Create UBND Account

Feature: `specs/008-aut-create-ubnd-account`
Story: US-7 (P1) — Create UBND Account (UC-ACC-07; F-AUTH-19; screen ADM117)

---

## Phase 1: Tests first

- [ ] T001 [US7] Write failing tests for FR-019 / BR-007 / BR-008 / AS-1 / AS-2 / AS-3 in `tests/business/fr019-create-ubnd-account.test.ts`
  - AS-1: valid HDT session + valid data + unassigned village → Active UBND account + village assignment created (FR-019)
  - AS-2: created account has must_change_password=true; credential email written to outbox (FR-019)
  - AS-3: non-HDT session (UBND or no session) → 403 (BR-007, FR-016)
  - Edge: duplicate email → validation error (FR-019)
  - Edge: village already assigned → 409 (BR-008)
  - Edge: village does not exist → 400 (FR-019)
  - Edge: missing required field → 400 (FR-019)

## Phase 2: Business logic

- [ ] T002 [US7] Create `src/lib/account-creation.ts` exporting `createUbndAccount(input, pool?)` (FR-019, BR-007, BR-008)
  - Validate name, email (format + uniqueness), phone (regex), assigned_village_id (exists + active + unassigned)
  - Generate temp password (randomBytes), hash with hashPassword()
  - INSERT user_accounts (role_code='ADMIN', admin_type='UBND', account_status='Active', must_change_password=true)
  - INSERT ubnd_village_assignments
  - INSERT audit_logs (action='UBND_ACCOUNT_CREATED')
  - Write credential email to var/outbox/
  - Return FR-019 output contract

## Phase 3: API route

- [ ] T003 [US7] Create `src/app/api/admin/accounts/ubnd/route.ts` — POST handler (FR-019, FR-016)
  - Read session token from Cookie, call verifySession(), check admin_type='HDT'
  - Parse body, call createUbndAccount()
  - Return 201/400/403/409 per contract

## Phase 4: UI screen

- [ ] T004 [US7] Create `src/app/admin/create-account/page.tsx` — ADM117 Create Account screen (HDT view)
  - Fields: Name, Email, Phone, Assigned village id (exactly as ADM117 spec §3)
  - Buttons: Create, Cancel (→ /admin/users)
  - States: Default, Loading, Error (field errors), Success (→ /admin/users)
  - Plain CSS from `src/app/globals.css` only; no new stylesheet

## Dependencies

- T001 before T002 (tests-first)
- T002 before T003
- T003 before T004
