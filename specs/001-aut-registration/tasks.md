# Tasks: AUT — Register Tour Agency Account (US-1)

**Branch**: `001-aut-registration` | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

**Scope**: US-1 only (F-AUTH-01 to F-AUTH-04, F-AUTH-23; screens REG003, REG115, REG116).
US-2 through US-10 are **out of scope** for this branch.

> ⚠️ **Constitution Principle II**: Every business rule and acceptance scenario
> for this slice has a test task that appears **before** the code task it
> checks. Tests must be written first and observed failing before the
> implementation that makes them pass.

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Create the project scaffold from scratch without running an
interactive scaffolder. None of these tasks touches `README.md`, `.gitignore`
(already updated), `.gitattributes`, or `AGENTS.md`.

- [X] T001 Create `package.json` at repo root with exact pinned versions from plan.md (next 16.4.0, react 19.3.0, typescript 5.9.3, pg 8.23.1, bcryptjs 3.0.3, zod 4.6.7, vitest 5.0.4 and all @types listed in plan.md); set `"scripts": { "dev": "next dev", "build": "next build", "test": "vitest run" }`

- [X] T002 Create `tsconfig.json` at repo root with `"strict": true`, `"target": "ES2022"`, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"paths": { "@/*": ["./src/*"] }`, `"include": ["src", "tests"]`

- [X] T003 Create `next.config.ts` at repo root (TypeScript config, App Router, no experimental flags needed for this slice)

- [X] T004 Create `vitest.config.ts` at repo root; configure `testEnvironment: "node"`, `include: ["tests/**/*.test.ts"]`; import `dotenv/config` so tests read `.env`

- [X] T005 [P] Create `src/app/layout.tsx` — root App Router layout with HTML skeleton and a placeholder `<a href="#">Sign in</a>` navigation link (login is out of scope until Session 11)

- [X] T006 [P] Create `src/app/page.tsx` — minimal landing page that links to `/register`

- [X] T007 Create directory skeleton without implementation: `src/lib/`, `src/types/`, `src/app/register/`, `src/app/register/otp/`, `src/app/register/status/`, `src/app/api/register/`, `tests/business/helpers/`, keeping all files as empty stubs with `// TODO` comments so TypeScript compilation succeeds

- [X] T008 Run `npm install` and confirm `npm run build` compiles without errors on the stub tree (no tests yet)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure used by every US-1 task. Must be complete
before any business logic or test is written.

- [X] T009 Create `tests/business/helpers/db.ts` — exports `createTestDb(name: string)` and `dropTestDb(name: string)` that shell out to `psql` using `ADMIN_DATABASE_URL` from `.env`; `createTestDb` also runs `data/schema.sql` and `data/seed/load_seed.sql` via `psql` from the repository root; neither function modifies any file under `data/`

- [X] T010 Create `src/lib/db.ts` — exports a `pg.Pool` singleton initialized from `process.env.DATABASE_URL`; exports a typed `query<T>(sql, params)` helper; on `NODE_ENV === 'test'` the pool connects to the test DB name injected via `process.env.TEST_DATABASE_URL`

- [X] T011 Create `src/lib/password.ts` — exports `hashPassword(plain: string): Promise<string>` (bcryptjs cost 12) and `verifyPassword(plain: string, hash: string): Promise<boolean>`

- [X] T012 [P] Create `src/types/registration.ts` — TypeScript interfaces for `RegistrationRequest`, `SubmissionVersion`, `OtpChallenge`, and `StoredFileRecord`; types must match column names in `data/07-data-dictionary.md`; no runtime code

---

## Phase 3: US-1 — Register Tour Agency Account (Priority P1) 🎯 MVP

**Goal**: A Guest can complete the full registration flow — fill in REG003,
verify email via OTP on REG115, and land on REG116 with status "Pending
Approval" — all from a fresh clone using the commands in `quickstart.md`.

**Independent test**: `npm test` passes all `tests/business/` suites; manual
flow via dev server completes REG003 → REG115 → REG116 as described in
`quickstart.md §7`.

---

### 3-A — Seed-integrity test (written and failing first)

- [X] T013 [US1] **TEST FIRST** — Create `tests/business/seed-integrity.test.ts`:
  Load the seed into a fresh disposable DB using the helper from T009; assert:
  (a) `SELECT COUNT(*) FROM user_accounts` = **26** (from `data/seed/manifest.json`);
  (b) the OTP challenge with `challenge_id = '7985fd5b-02dc-5c37-bd96-6373cb98dd98'` has `attempt_count = 5` and `resend_sequence = 3` (boundary-otp fixture from `data/seed/scenario_manifest.json`).
  Run `npm test` and confirm this test **fails** (test DB does not exist yet); it will pass once T009 is complete.

---

### 3-B — Business-rule tests (written and failing before code)

Each test file must be written and confirmed **failing** before the
implementation task it precedes is started.

- [X] T014 [US1] **TEST FIRST** — Create `tests/business/fr002-validation.test.ts`:
  Import the Zod schema from `src/lib/validation.ts` (stub file; test will fail to import).
  Write failing assertions for every FR-002 field rule:
  • `full_name` max 100 chars;
  • `email` RFC format and max 254;
  • `password` 8–64 chars, ≥1 upper, ≥1 lower, ≥1 digit, ≥1 special, no whitespace;
  • `confirm_password` must match `password`;
  • `company_name` max 255;
  • `company_type` one of `Travel Agency | Tour Operator | TMC`;
  • `tax_id` exactly 10 or 13 numeric digits;
  • `location` all four sub-fields required;
  • `contact_information.phone_number` 10–15 digits optional `+`;
  • `team_size` integer ≥ 1;
  • `tour_types` array, ≥ 1 value, valid enum;
  • `registration_documents` ≥ 1 file.

- [X] T015 [US1] **TEST FIRST** — Create `tests/business/fr003-duplicate-email.test.ts`:
  Using the test DB helper, insert a `user_accounts` row with a known email, then call the duplicate-check function (stub in `src/lib/registration.ts`; test will fail on import); assert that submitting the same email returns `is_duplicate: true` and that no second account is created.

- [X] T016 [US1] **TEST FIRST** — Create `tests/business/fr004-create-account.test.ts`:
  Using the test DB helper, call the account-creation function (stub); assert all of:
  • **BR-001**: only `role_code = 'Tour_Agency'` is set;
  • **BR-002**: `account_status = 'Pending Approval'` immediately after creation;
  • **AC-US1-1**: account is created **exactly once** when all data is valid (idempotency: calling twice with same `registration_request_id` fails with a DB constraint, not a second row);
  • **AC-US1-2**: duplicate email → no account row is inserted;
  • **AC-US1-3**: no `Local_Provider` option appears in the registration form (tested here as: trying to create an account with `role_code = 'Local_Provider'` via this function throws / is rejected).

- [X] T017 [US1] **TEST FIRST** — Create `tests/business/fr023-otp.test.ts`:
  Using the test DB helper and OTP functions (stubs in `src/lib/otp.ts`); write failing assertions for every FR-023 + **AC-AUT-OTP** rule:
  • Issuing an OTP creates one row in `registration_otp_challenges` with `expires_at = issued_at + interval '10 minutes'` and `attempt_count = 0`;
  • **AC-AUT-OTP**: a wrong OTP increments `attempt_count`; no account is created; a correct OTP within expiry sets `used_at` and allows account creation exactly once;
  • An expired OTP (simulate by inserting a row with `expires_at` in the past) returns `"Expired OTP"` and no account is created;
  • A correct OTP after `attempt_count` reaches 5 returns `"Maximum Attempts Exceeded"`;
  • Resend invalidates the previous active OTP (`invalidated_at` is set), inserts a new challenge, and increments `resend_sequence`;
  • A 4th resend (would put `resend_sequence = 4`) is rejected by the DB CHECK constraint (`otp_resend_chk`), returning `"Resend Limit Exceeded"`;
  • Only one active (non-used, non-invalidated) OTP per `registration_request_id` is allowed (verified by the partial unique index `registration_one_active_otp_uq`).

---

### 3-C — Validation layer (makes T014 pass)

- [X] T018 [US1] Create `src/lib/validation.ts` — export a `registrationSchema` Zod v4 object with all FR-002 field rules; export `otpVerifySchema` for FR-023 OTP input; export TypeScript types inferred from each schema; run `npm test` and confirm **T014 now passes**

---

### 3-D — Data-access layer (makes T015, T016, T017 pass)

- [X] T033 [US1] **TEST FIRST** — Create `tests/business/fr023-otp-resend-boundary.test.ts`:
  Using the test DB helper and OTP stubs from `src/lib/otp.ts`; write failing assertions for the FR-023 15-minute resend window (interpretation recorded in research.md §9.1):
  • 1st resend (resend_sequence 0→1): **allowed**;
  • 2nd resend (resend_sequence 1→2): **allowed**;
  • 3rd resend (resend_sequence 2→3): **allowed** — this is the maximum permitted;
  • 4th resend attempt (would set resend_sequence = 4): **rejected** with `"Resend Limit Exceeded"`; assert no new `registration_otp_challenges` row is inserted;
  • Resend for a request whose first OTP was issued more than 15 minutes ago (insert a seed challenge with `issued_at = now() - interval '16 minutes'` and resend_sequence = 0): **rejected** with `"Resend Limit Exceeded"` even though resend_sequence < 3.
  Run `npm test` and confirm this test **fails** before T019 is complete.

- [X] T019 [US1] Create `src/lib/otp.ts` — exports:
  `issueOtp(registrationRequestId, email, db): Promise<{ otpPlaintext: string }>` — generates a 6-digit random OTP, hashes it with bcryptjs, inserts a `registration_otp_challenges` row; in dev/test writes a JSON stub to `var/outbox/` per the format in `contracts/otp.md`; returns plaintext only in `NODE_ENV === 'test'` for test assertions;
  `verifyOtp(registrationRequestId, otpCode, db): Promise<OtpVerifyResult>` — enforces attempt limit, expiry, and consumption logic;
  `resendOtp(registrationRequestId, email, db): Promise<{ otpPlaintext: string }>` — invalidates current OTP, issues new one; enforces both the count limit (resend_sequence ≤ 3 via DB constraint) and the 15-minute window (query earliest `issued_at` for this request; reject if > 15 min ago — see research.md §9.1).
  Run `npm test` and confirm **T017 and T033 now pass**.

- [X] T020 [US1] Create `src/lib/files.ts` — exports `saveUploadedFiles(registrationRequestId, files: File[]): Promise<StoredFileRecord[]>` — validates each file (PDF/JPG/JPEG/PNG, ≤ 10 MB, ≤ 5 total); writes to `var/uploads/{registrationRequestId}/`; returns metadata for insertion into `stored_files`

- [X] T034 [US1] **TEST FIRST** — Create `tests/business/fr004-tax-id-unique.test.ts`:
  Using the test DB helper, simulate two registration requests reaching OTP verification with the same `tax_id` but different emails; assert that:
  • The second `createAgencyAccount()` call rolls back the entire transaction — no `user_accounts`, `agency_profiles`, `audit_logs`, or `agency_registration_requests` status-update rows are committed for the second request;
  • The function returns a handled validation error (not an unhandled exception / HTTP 500) with `field: "tax_id"` and `message: "Tax ID already registered"` (caught from PostgreSQL error code `23505`);
  • The first registration's rows remain intact in the DB.
  Run `npm test` and confirm this test **fails** before T021 is complete.

- [X] T035 [US1] **TEST FIRST** — Create `tests/business/fr004-audit-log.test.ts`:
  Using the test DB helper, call `createAgencyAccount()` after a successful OTP verification; assert that:
  • Exactly one `audit_logs` row is inserted within the same transaction, with: `action = 'AGENCY_REGISTRATION_COMPLETED'`, `target_type = 'UserAccount'`, `target_id = <new user_id>`, `actor_user_id = <new user_id>`, `change_or_result = '{"status":"Pending Approval"}'`;
  • If the `audit_logs` INSERT is forced to fail (e.g., by passing an invalid UUID as `target_id` in a test-only override), the entire transaction rolls back and no `user_accounts` or `agency_profiles` row is committed.
  Run `npm test` and confirm this test **fails** before T021 is complete.

- [X] T021 [US1] Create `src/lib/registration.ts` — exports:
  `isDuplicateEmail(email: string, db): Promise<boolean>` — queries `user_accounts` unique index;
  `createRegistrationRequest(data: ValidatedRegistration, passwordHash: string, db): Promise<string>` — inserts `agency_registration_requests` (status `Awaiting OTP`) + `registration_submission_versions` (version_no 1) + `stored_files` + `registration_documents` rows in a single transaction; returns `registration_request_id`;
  `createAgencyAccount(registrationRequestId: string, db): Promise<{ userId: string; agencyAccountId: string }>` — called only after OTP verified; within a single transaction: inserts `user_accounts` (role `Tour_Agency`, status `Pending Approval`), inserts `agency_profiles` (filled from `registration_submission_versions.version_no = 1` — see research.md §9.2), inserts one `audit_logs` row (see research.md §9.3), updates `agency_registration_requests.current_status` to `Pending Approval` and sets `agency_user_id`; catches PostgreSQL `23505` on `agency_profiles_tax_uq` and returns a validation error instead of throwing (see research.md §9.2).
  Run `npm test` and confirm **T015, T016, T034 and T035 now pass**.

---

### 3-E — API layer

- [X] T022 [US1] Create `src/app/api/register/route.ts` — Next.js Route Handler `POST /api/register`; parse `multipart/form-data`; run `registrationSchema` validation; call `isDuplicateEmail`; call `saveUploadedFiles`; call `createRegistrationRequest`; call `issueOtp`; return `201 { registration_request_id, is_valid: true }` on success or `422 { is_valid: false, validation_errors }` on failure; match the contract in `contracts/api.md` exactly

- [X] T036 [US1] **TEST FIRST** — Create `tests/business/fr023-outbox-fail.test.ts`:
  Simulate an outbox write failure that occurs **after** the DB transaction commits; assert that:
  • The `user_accounts` row with `account_status = 'Pending Approval'` remains in the database (the transaction is already committed);
  • `POST /api/register/verify-otp` returns HTTP `200` with `otp_verified: true` and `confirmation_email_status: "Fail"` (not a 500 or 4xx);
  • No partial outbox file is left on disk.
  Implementation hint: inject a mock outbox writer into `src/lib/otp.ts` via `NODE_ENV === 'test'` that throws after the DB commit but before the file write completes.
  Run `npm test` and confirm this test **fails** before T023 is complete.

- [X] T023 [US1] Create `src/app/api/register/verify-otp/route.ts` — `POST /api/register/verify-otp`; parse JSON body; run `otpVerifySchema`; call `verifyOtp`; on success call `createAgencyAccount` (which commits the DB transaction atomically); then attempt the confirmation outbox write in a `try/catch` outside the transaction; return `200 { otp_verified: true, user_id, agency_account_id, account_status, confirmation_email_status }` where `confirmation_email_status` is `"Success"` on outbox-write success or `"Fail"` on failure (a Fail does NOT roll back the account — see research.md §9.3 and contracts/api.md); or return the appropriate error response per `contracts/api.md` when `verifyOtp` itself fails

- [X] T024 [US1] Create `src/app/api/register/resend-otp/route.ts` — `POST /api/register/resend-otp`; parse JSON body; call `resendOtp`; return `200 { resent: true }` or `429` on limit exceeded

---

### 3-F — UI screens

- [X] T025 [US1] Create `src/app/register/page.tsx` — REG003 Agency Registration form; React Client Component; all FR-002 fields with client-side preview validation using `registrationSchema`; file upload input (PDF/JPG/JPEG/PNG, ≤ 10 MB, ≤ 5 files); submit POSTs `multipart/form-data` to `/api/register`; on success stores `registration_request_id` in `sessionStorage` and navigates to `/register/otp`; on error displays `validation_errors`; no Local Provider option is offered (BR-001 / AC-US1-3)

- [X] T026 [US1] Create `src/app/register/otp/page.tsx` — REG115 OTP Verification Input; 6-digit numeric input; reads `registration_request_id` from `sessionStorage`; POSTs to `/api/register/verify-otp`; shows remaining attempts on error; "Resend code" button POSTs to `/api/register/resend-otp` and resets the form; on success navigates to `/register/status`

- [X] T027 [US1] Create `src/app/register/status/page.tsx` — REG116 Registration Status; reads `account_status` and `agency_account_id` from `sessionStorage` set by the OTP page; displays "Your application is pending HDT review" confirmation; clears `registration_request_id` from `sessionStorage`

---

### 3-G — End-to-end validation

- [ ] T028 [US1] Follow `quickstart.md §6–7`: start dev server with `npm run dev`, complete the full REG003 → REG115 → REG116 flow manually; verify with the SQL query in `quickstart.md §7` that one row appears with `account_status = 'Pending Approval'`; confirm `npm test` still passes

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T029 [P] Create `var/.gitkeep` — empty file so `var/` directory is tracked in git (the directory itself is git-ignored; this sentinel file is inside it so `mkdir -p var/outbox var/uploads` is not needed by every developer). **Note**: `.gitignore` ignores `var/` contents; add `!var/.gitkeep` exception so only this file is committed.

- [ ] T030 [P] Verify `.env.example` exists and contains the two required placeholder keys (`DATABASE_URL`, `ADMIN_DATABASE_URL`); verify `.gitignore` has `.next/`, `coverage/`, and `var/` entries (already done in plan step — confirm no regression)

- [ ] T031 Run `npm run build` and confirm the production build succeeds without TypeScript errors or Next.js warnings

- [ ] T032 Review `specs/001-aut-registration/quickstart.md` for accuracy against the implemented code; update any command that changed during implementation; do **not** modify files under `data/`

---

## Dependencies & Execution Order

### Phase dependencies

```
Phase 1 (Setup)
  └── Phase 2 (Foundational: T009–T012)
        └── Phase 3-A Seed test (T013)   ← verify seed integrity first
        └── Phase 3-B Tests (T014–T017)  ← all test files written BEFORE code
              └── Phase 3-C Validation (T018)  → makes T014 pass
              └── Phase 3-D Data access  (T019–T021) → makes T015, T016, T017 pass
                    └── Phase 3-E API layer (T022–T024)
                          └── Phase 3-F UI screens (T025–T027)
                                └── Phase 3-G E2E validation (T028)
        └── Phase 4 (Polish: T029–T032) — after T028
```

### Within Phase 3 — test-first ordering

| Test task | Must FAIL before | Implementation that makes it pass |
|---|---|---|
| T013 (seed integrity) | Phase 2 complete | T009 (db helper) |
| T014 (FR-002 validation) | T014 written | T018 (`validation.ts`) |
| T015 (FR-003 duplicate email) | T015 written | T021 (`registration.ts`) |
| T016 (FR-004 create account + BR-001, BR-002, AC-US1-1/2/3) | T016 written | T021 (`registration.ts`) |
| T017 (FR-023 OTP + AC-AUT-OTP) | T017 written | T019 (`otp.ts`) |
| T033 (FR-023 resend boundary: 3rd allowed, 4th rejected; 15-min window) | T033 written | T019 (`otp.ts`) |
| T034 (FR-004 tax_id unique → rollback + validation error, not 500) | T034 written | T021 (`registration.ts`) |
| T035 (C3 audit_logs row in same transaction as account creation) | T035 written | T021 (`registration.ts`) |
| T036 (C1 outbox-fail → account survives; confirmation_email_status Fail) | T036 written | T023 (`verify-otp/route.ts`) |

### Parallel opportunities

- T005 and T006 (layout/home page) can run in parallel with T007 during setup.
- T012 (types) can run in parallel with T009–T011 in Phase 2.
- T014, T015, T016, T017 (test stubs) can be written in parallel — they all
  fail on import until the implementation tasks run.
- T025, T026, T027 (UI screens) can be worked in parallel after T022–T024 exist.
- T029 and T030 (polish) can run in parallel.

---

## Implementation Strategy

### MVP (this slice only)

1. Complete **Phase 1** (T001–T008) — scaffold compiles
2. Complete **Phase 2** (T009–T012) — DB helper + shared lib stubs
3. Write all **test stubs (T013–T017)** and confirm they fail
4. Implement **validation layer (T018)** → T014 passes
5. Implement **data-access layer (T019–T021)** → T015, T016, T017 pass
6. Implement **API layer (T022–T024)** — `npm test` still passes
7. Implement **UI screens (T025–T027)** — manual E2E flow works
8. **Validate (T028)** — `npm test` all green, manual flow confirmed
9. **Polish (T029–T032)**

### Commit cadence (suggestion)

Commit after each task or at each Checkpoint. Use `type: summary` commit messages
per AGENTS.md conventions (e.g., `test: add fr023 otp business-rule tests`).

---

## Notes

- `[P]` = task touches different files from others marked `[P]` in the same
  phase; no shared-file conflict; safe to assign to a different team member.
- `[US1]` label is present on every Phase 3 task for traceability.
- No task writes to or regenerates files under `data/`.
- US-2 through US-10 are **not represented** in this file.
