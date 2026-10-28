# Tasks: US-8 Create Local Provider Account

Feature: `specs/009-aut-create-provider-account`
Story: US-8 (P1) — Create Local Provider Account (UC-ACC-08; F-AUTH-20; screen ADM117)

---

## Phase 1: Tests first

- [ ] T001 [US8] Write failing tests for FR-020 / BR-007 / BR-009 / BR-015 / AS-1 / AS-2 / AS-3 in `tests/business/fr020-create-provider-account.test.ts`
  - AS-1: valid UBND session + valid provider data → Active Local Provider account + temp credentials + Draft provider profile created (FR-020)
  - AS-2: provider belongs to another village / requested village mismatch → 403 denied (BR-009)
  - AS-3: account activation does not mean profile verified (profile verification_status is Draft, account is Active) (BR-015)
  - Edge: non-UBND actor (HDT or unauthenticated) → 403 (BR-007, FR-016)
  - Edge: duplicate email → 400 (FR-020)
  - Edge: missing required fields (provider_name, address, contact, email) → 400 (FR-020)
  - Edge: UBND has no assigned village → 400 (FR-020)

## Phase 2: Business logic

- [ ] T002 [US8] Add `createLocalProviderAccount(input, pool?)` to `src/lib/account-creation.ts` (FR-020, BR-007, BR-009, BR-015)
  - Validate actorAdminType === 'UBND'
  - Validate required fields: provider_name, address, contact (contact_person_name, phone_number), email
  - Fetch assigned village for UBND actor from `ubnd_village_assignments`
  - If requested_village_id provided and differs from assigned village, return 403 (BR-009, AS-2)
  - Check email uniqueness
  - Generate temp password, hash with hashPassword()
  - INSERT user_accounts (role_code='Local_Provider', admin_type=NULL, account_status='Active', must_change_password=true)
  - INSERT provider_profiles (verification_status='Draft', current_version_no=1, published_version_no=NULL, village_id=assigned_village)
  - INSERT provider_profile_versions (version_no=1, version_status='Draft', business_name, location_address, contact_information)
  - INSERT audit_logs (action='LOCAL_PROVIDER_ACCOUNT_CREATED')
  - Write credentials JSON to var/outbox/
  - Return FR-020 output contract

## Phase 3: API route

- [ ] T003 [US8] Create `src/app/api/admin/accounts/provider/route.ts` — POST handler (FR-020, FR-016)
  - Read session token from Cookie, call verifySession(), check admin_type='UBND'
  - Parse body, call createLocalProviderAccount()
  - Return 201/400/403 per contract

## Phase 4: UI screen

- [ ] T004 [US8] Update `src/app/admin/create-account/page.tsx` — ADM117 Create Account screen (UBND section)
  - When actor is UBND, render Local Provider form:
    - Provider name (ADM117 element 8)
    - Address (ADM117 element 9)
    - Contact person name & phone (ADM117 element 10)
    - Email (FR-020)
    - Village id (ADM117 element 11 — read-only from session assignment)
  - Buttons: Create (element 12), Cancel (element 13 → /admin/users)
  - States: Default, Loading, Error (field errors), Success (→ /admin/users)
  - Plain CSS from `src/app/globals.css` only

## Dependencies

- T001 before T002 (tests-first)
- T002 before T003
- T003 before T004
