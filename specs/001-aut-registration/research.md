# Research: AUT — Register Tour Agency Account (US-1)

*Phase 0 output of `/speckit-plan`. Resolves all NEEDS CLARIFICATION items
before design begins.*

---

## 1. Stack Choices and Rationale

### 1.1 TypeScript + Next.js App Router

**Decision**: TypeScript `5.9.3`, Next.js `16.4.0` with the App Router
(`src/` layout, `app/` directory under `src/`).

**Rationale**:
- App Router enables React Server Components and Server Actions, keeping form
  submission logic on the server without a separate API layer for UI interactions.
- `src/` layout separates application code from root config files.
- TypeScript strict mode catches field-type mismatches at compile time, which
  directly enforces the Zod-validated field contracts in FR-002.

**Alternatives considered**:
- Pages Router: deprecated path; App Router is the current Next.js default.
- Separate Express API: unnecessary complexity for a single-slice MVP; Server
  Actions + Route Handlers are sufficient.

### 1.2 PostgreSQL (only) for business-rule tests

**Decision**: PostgreSQL `≥ 16` (matching `data/schema.sql` which uses
`btree_gist`, PostgreSQL-specific CHECK expressions, and `gen_random_uuid()`).
Tests create a disposable database, run `data/schema.sql` and
`data/seed/load_seed.sql` via `psql`, execute assertions, then drop the
database. Tests never modify files under `data/`.

**Rationale**:
- The schema uses PostgreSQL-only extensions (`btree_gist`, `EXCLUDE USING gist`,
  `timestamptz` with interval arithmetic). SQLite cannot replicate this; any
  SQLite test would test a different schema.
- A real database ensures that CHECK constraints, unique indexes, and deferred
  FKs enforced in `schema.sql` are actually exercised (constitution Principle II).

**Alternatives considered**:
- SQLite + adapter: rejected — would require a separate schema and would not
  catch PostgreSQL-specific constraint violations. Deferred to Complexity
  Tracking if the team later wants faster unit-level tests.

### 1.3 Vitest as test runner

**Decision**: Vitest `5.0.4`. `npm test` = `vitest run` (no watch mode).

**Rationale**:
- Native TypeScript support without a separate `ts-jest` transform step.
- Fast parallel test execution; compatible with the `tests/business/` helper
  that shells out to `psql`.
- `vitest run` exits after the test suite completes, which is required for CI.

### 1.4 bcryptjs for password hashing

**Decision**: `bcryptjs` `3.0.3` (pure JavaScript implementation).

**Rationale**:
- No native build step required; works on macOS and Windows without
  platform-specific binaries.
- Cost factor 12 (bcrypt default) is sufficient for MVP; can be tuned later.

**Alternatives considered**:
- `argon2` (via `@node-rs/argon2`): preferred for new systems but requires
  native compilation and Rust toolchain on Windows. Rejected for cross-platform
  free-tools requirement.
- `bcrypt` (native): requires `node-gyp` / Python build tools on Windows.
  Rejected for the same reason.

### 1.5 Zod for validation

**Decision**: Zod `4.6.7` for all server-side validation of FR-002 field rules.

**Rationale**:
- Zod v4 ships with improved performance and smaller bundle size vs v3.
- Schemas can be shared between Server Actions and business-rule tests.
- Error message format maps cleanly to the `validation_errors` output in FR-002.

---

## 2. Cross-Platform Setup (macOS + Windows, free tools)

### 2.1 PostgreSQL client tools

| Platform | Install method | Tool |
|---|---|---|
| macOS | `brew install postgresql@17` | `psql` |
| Windows | [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) installer (community, free) | `psql` added to PATH |

`quickstart.md` includes exact commands for both platforms.

### 2.2 psql-based test database lifecycle

The test helper (`tests/business/helpers/db.ts`) follows this pattern:

```typescript
// Pseudo-code — actual implementation in tasks.md
const testDbName = `artisan_test_${Date.now()}`;
execSync(`psql $ADMIN_URL -c "CREATE DATABASE \\"${testDbName}\\""`);
execSync(`psql $TEST_URL -f data/schema.sql`);
execSync(`psql $TEST_URL -f data/seed/load_seed.sql`);
// ... run tests ...
execSync(`psql $ADMIN_URL -c "DROP DATABASE \\"${testDbName}\\""`);
```

`DATABASE_URL` and `ADMIN_DATABASE_URL` live in `.env`. The test helper reads
`process.env` and derives the test DB name dynamically so parallel test runs
do not collide.

---

## 3. File Upload Strategy

**Decision**: Uploaded registration documents (FR-002 `registration_documents`
— PDF/JPG/JPEG/PNG, ≤ 10 MB, ≤ 5 files) are stored locally under
`var/uploads/{registration_request_id}/` during development.

**Rationale**:
- Avoids a cloud storage dependency (S3, GCS) before deployment decisions are
  made at Session 11.
- `var/` is git-ignored; files persist across dev-server restarts.
- The `stored_files` table in `data/schema.sql` stores a `storage_key` (path
  relative to `var/uploads/`) and metadata; no file content is in the DB.

**Interpretation**: This is a local-dev approximation of the production file
storage. The spec (FR-002) specifies format and size constraints but does not
mandate a specific storage backend. This interpretation is intentional and
explicit: **production uploads must be replaced with an object-store backend at
Session 11**.

**Alternatives considered**:
- MinIO (local S3-compatible): adds Docker dependency, rejected for
  "free tools" requirement (Docker Desktop requires a licence for commercial use).
- Committed files: rejected (binary artefacts, `.gitignore` issue).

---

## 4. OTP Email Delivery (Dev Outbox)

**Decision**: OTP emails are **not sent for real** in this slice. The OTP
generation function (`lib/otp.ts`) writes a JSON file to `var/outbox/` instead
of calling an SMTP provider.

**File format** (`var/outbox/{registration_request_id}-{timestamp}.json`):
```json
{
  "to": "applicant@example.com",
  "subject": "Your Artisan Bridge verification code",
  "otp": "123456",
  "expires_at": "2026-10-14T04:00:00.000Z",
  "registration_request_id": "uuid-here"
}
```

**Interpretation**: The spec (FR-023) requires the OTP to be "issued by email".
For this dev slice, "issued" means written to the dev outbox so a developer can
read the OTP during testing. **Real email delivery must be wired at Session 11**.

**Business rules preserved**:
- OTP is always generated server-side and stored as `otp_verifier` (hashed) in
  `registration_otp_challenges`.
- OTP is never returned to the client response (FR-023: "server result, never
  trusted from client").
- Resend limit (3 resends per email within 15 min) is enforced by
  `resend_sequence` in `registration_otp_challenges`.
- Attempt limit (5 per OTP) is enforced by `attempt_count`.

---

## 5. Project Scaffolding (No Interactive Setup)

**Decision**: Manually create `package.json`, `tsconfig.json`, `next.config.ts`,
and the `src/` directory tree. Do **not** run `create-next-app` (interactive)
or any scaffolder.

**Rationale**: AGENTS.md hard rule — "do not scaffold frameworks". The plan
step defines the exact tree; `speckit-tasks` will emit individual file-creation
tasks.

**Files that must not be overwritten**: `README.md`, `.gitignore`,
`.gitattributes`, `AGENTS.md`.

**Files that must be created (new)**:
- `package.json` with pinned versions
- `tsconfig.json` (strict mode, `paths` for `@/*`)
- `next.config.ts`
- `vitest.config.ts`
- `.env.example`
- `src/` tree per plan.md Project Structure

**`.gitignore` additions** (extend, do not replace):
```
# Next.js build output
.next/

# Test coverage
coverage/

# Local runtime (uploads, dev email outbox)
var/
```

---

## 6. Environment Variables

All secrets and connection strings live in `.env` (git-ignored). The committed
`.env.example` contains placeholders only:

```dotenv
# PostgreSQL connection string for the application
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/artisan_bridge

# PostgreSQL admin connection (used by tests to create/drop test databases)
ADMIN_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres
```

No other secrets are needed for this slice (no SMTP, no cloud storage, no JWT
secret — login is out of scope).

---

## 7. "Sign In" Link Placeholder

The spec's login function (US-2, F-AUTH-05) is out of scope until Session 11.
Any navigation element that would point to login (e.g., a "Sign in" link in
the header) is rendered as a plain `<a href="#">Sign in</a>` anchor with no
routing behaviour.

---

## 8. Resolved NEEDS CLARIFICATION Items

| # | Question | Answer / Source |
|---|---|---|
| 1 | Password complexity rules | 8–64 chars, ≥1 upper, ≥1 lower, ≥1 digit, ≥1 special, no whitespace. Source: spec §10 Q1. |
| 2 | Tax ID format | 10 or 13 numeric digits. Source: spec §10 Q2. |
| 3 | Registration documents rules | Business Reg. Cert required; Travel Service Licence when applicable. PDF/JPG/JPEG/PNG, ≤10 MB each, ≤5 files. Source: spec §10 Q3. |
| 4 | `contact_information` sub-fields | `contact_person_name`, `phone_number` (10–15 digits, optional `+`), `business_email` (optional). Source: spec §10 Q4. |
| 5 | `team_size` type | Integer ≥ 1, mandatory. Source: spec §10 Q5. |
| 6 | `tour_types` enumeration | Seven values from FR-002; at least one required. Source: spec §10 Q6. |
| 7 | Unknown-email recovery message | Not in scope for this slice (US-4). |
| 8 | OTP delivery mechanism (dev) | Dev outbox under `var/outbox/`. See §4 above. Recorded in Complexity Tracking. |
| 9 | Role codes | `Tour_Agency` for self-registered agencies. Source: spec §10 Q9 + data/schema.sql. |
| 10 | `registration_documents` storage | `var/uploads/` locally; recorded in Complexity Tracking. |

---

## 9. Post-Analysis Decisions (from speckit-analyze findings U1, U2, C3)

### 9.1 U1 — FR-023 OTP Resend 15-Minute Window (Interpretation)

**Question**: FR-023 says "OTP resend is limited to 3 resends per email within
15 minutes." Does "within 15 minutes" define a rolling time window separate
from the OTP's 10-minute validity, or does it simply refer to that 10-minute
expiry window?

**Decision**: The 15-minute window is **a separate, independent rate-limit window**
applied to resends per registration request. A resend is rejected when all three
of the following are true simultaneously:
1. The `resend_sequence` of the current active challenge for this `registration_request_id`
   would reach 4 (i.e., 3 resends have already been issued — `resend_sequence = 3`); **OR**
2. The `issued_at` of the earliest challenge for this `registration_request_id` in
   the current window is older than 15 minutes ago
   (`issued_at < now() - interval '15 minutes'`).

**Implementation rule** in `resendOtp()`:
```sql
-- Reject if resend_sequence is already at max for this request
SELECT resend_sequence FROM registration_otp_challenges
WHERE registration_request_id = $1
  AND invalidated_at IS NULL AND used_at IS NULL;
-- Also reject if any challenge for this request was issued > 15 min ago
-- (the window resets only if no active challenges exist for the request)
```

**`resend_sequence` semantics**: `resend_sequence = 0` means the OTP was issued
for the first time (no resend yet). `resend_sequence = 1, 2, 3` means the first,
second, and third resend respectively. The value stored on each row is the
position of that OTP in the resend sequence for the request, not a global
counter.

**Test boundary** (T033):
- 3rd resend (resend_sequence advances to 3): **allowed**.
- 4th resend attempt (would set resend_sequence = 4): **rejected** with
  `"Resend Limit Exceeded"` and no new row is inserted.
- Resend when the first OTP for this request was issued >15 min ago: **rejected**
  with `"Resend Limit Exceeded"` even if resend_sequence < 3.

**Source**: spec §5 FR-023; `data/schema.sql` constraint `otp_resend_chk`
(`resend_sequence BETWEEN 0 AND 3`); `data/seed/registration_otp_challenges.csv`
boundary-otp row `7985fd5b...` (attempt_count=5, resend_sequence=3).

---

### 9.2 U2 — agency_profiles Creation Timing and Uniqueness Constraint

**Question**: When is the `agency_profiles` row created — at Pending Approval
(immediately after OTP verification) or only after HDT Approval? And does
`agency_profiles_tax_uq` (unique index on `tax_id`) cause a 500 or a handled
validation error?

**Decision — timing**: The `agency_profiles` row is created **in the same
transaction as `user_accounts`**, immediately after OTP verification (Pending
Approval state). It is populated from the latest `registration_submission_versions`
row for the registration request (version_no = 1 on first submission).

**Evidence from data/**: All columns that are NOT NULL in `agency_profiles`
correspond directly to fields submitted in FR-002 and stored in
`registration_submission_versions`: `company_name`, `tax_id`, `company_type`,
`location`, `contact_information`, `team_size`, `tour_types`. None of these
requires the account to be in Approved state. The `agency_id` FK references
`user_accounts.user_id` which is inserted in the same transaction.

**Decision — uniqueness violation**: If a second registration request reaches
OTP verification with a `tax_id` that already exists in `agency_profiles`
(caught by `agency_profiles_tax_uq`), the code MUST:
1. Catch the PostgreSQL unique-violation error code (`23505`).
2. Roll back the entire transaction (no `user_accounts`, `agency_profiles`, or
   `audit_logs` rows are committed).
3. Return a **validation error response** (not an unhandled exception / HTTP 500):
   `{ otp_verified: false, error_message: "Tax ID already registered" }`.

**Rationale**: Tax ID uniqueness is a business constraint (each legal entity
registers once). A raw 500 would expose DB internals and give no actionable
message to the user.

**Test** (T034): covered in `tests/business/fr004-tax-id-unique.test.ts`.

**Source**: `data/schema.sql` constraint `agency_profiles_tax_uq`; spec FR-004
("creates a new Tour Agency user/account record only after … validation … passed").

---

### 9.3 C3 — audit_logs Write for Registration Completion

**Decision**: `createAgencyAccount()` writes exactly one `audit_logs` row
**inside the same transaction** as `user_accounts`, `agency_profiles`, and the
`agency_registration_requests` status update. If the `audit_logs` INSERT fails
(e.g., FK or constraint violation), the entire transaction rolls back and no
account is created.

**Row shape**:

| Column | Value |
|---|---|
| `action` | `'AGENCY_REGISTRATION_COMPLETED'` |
| `target_type` | `'UserAccount'` |
| `target_id` | `<new user_id>` (UUID of the just-inserted `user_accounts` row) |
| `actor_user_id` | `<new user_id>` (self-initiated; the applicant is the actor) |
| `change_or_result` | `'{"status":"Pending Approval"}'` (JSON string) |
| `created_at` / `occurred_at` | `now()` (within the transaction) |

**Rationale**: SC-008 requires every account action to be traceable. Registration
is the first account-creation event and must appear in the audit trail before
any HDT reviewer sees the pending request. Writing inside the transaction
guarantees the log is never missing for a committed account row.

**Test** (T035): covered in `tests/business/fr004-audit-log.test.ts`.

**Source**: spec §8 SC-008; `data/schema.sql` `audit_logs` table definition;
`data/seed/audit_logs.csv` (9 seed rows confirming the table is populated).
