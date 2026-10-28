# Tasks: US-9 Manage Accounts

Feature: `specs/010-aut-manage-accounts`
Story: US-9 (P1) — Manage Accounts (UC-ACC-09; F-AUTH-21, F-AUTH-22, F-AUTH-16; screens ADM095, ADM118)

---

## Phase 1: Tests first

- [ ] T001 [US9] Write failing tests for FR-021 / FR-022 / FR-016 / BR-009 / BR-010 / BR-011 / BR-013 / AS-1 / AS-2 / AS-3 / AS-4 in `tests/business/fr021-fr022-manage-accounts.test.ts`
  - AS-1: HDT sees all platform accounts; UBND sees only Local Providers in its assigned village (FR-021, BR-009)
  - AS-2: Disabling account sets status to 'Disabled' and invalidates active sessions immediately (FR-022, BR-013)
  - AS-3: UBND resets password only for Local Providers in assigned village; cross-village or non-provider target is 403 denied (FR-022, BR-009, FR-016)
  - AS-4: Account actions do not modify business or profile content (BR-010)
  - Edge: Enable restores previous status from account_status_history (FR-022)
  - Edge: Filtering by role and status (FR-021)
  - Edge: Non-admin actor cannot list or manage accounts (FR-016)

## Phase 2: Business logic

- [ ] T002 [US9] Create `src/lib/account-management.ts` exporting `listAccounts()`, `applyAccountAction()`, and `getAccountDetails()` (FR-021, FR-022, FR-016, BR-009, BR-010, BR-011, BR-013)
  - Scope checking: HDT = platform-wide; UBND = assigned village Local Providers only
  - Disable: record in account_status_history, update account_status='Disabled', revoke active sessions
  - Enable: retrieve last status from account_status_history, restore status, record in history
  - Reset password: generate temp password, hash, update user_accounts, write outbox credentials
  - Audit logging for all actions

## Phase 3: API routes

- [ ] T003 [US9] Create API routes for accounts listing and management actions:
  - `src/app/api/admin/accounts/route.ts` — GET handler with session guard, query param filters, pagination
  - `src/app/api/admin/accounts/[userId]/action/route.ts` — POST handler with session guard, action dispatch

## Phase 4: UI screens

- [ ] T004 [US9] Implement screens:
  - `src/app/admin/users/page.tsx` — ADM095 User Management (list table, filters, action links)
  - `src/app/admin/users/[userId]/actions/page.tsx` — ADM118 Account Information & Access Actions
  - `src/app/admin/view-account/page.tsx` — ADM145 minimal placeholder (Anti-invention rule 4)

## Dependencies

- T001 before T002 (tests-first)
- T002 before T003
- T003 before T004
