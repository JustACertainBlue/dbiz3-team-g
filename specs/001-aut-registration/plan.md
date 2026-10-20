# Implementation Plan: AUT — Register Tour Agency Account (US-1)

**Branch**: `001-aut-registration` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-aut-registration/spec.md`

---

## Summary

Implement **US-1 (P1): Register Tour Agency Account** (UC-ACC-01), covering
functions F-AUTH-01 through F-AUTH-04 and F-AUTH-23, and screens REG003,
REG115, REG116. A Guest submits Agency details and supporting documents, verifies
email ownership via a 6-digit OTP, and the system creates a `Pending Approval`
account for HDT review. All other user stories (US-2 through US-10) are **out of
scope** for this slice.

The stack is: **TypeScript 5.x / Node.js ≥ 22 / Next.js App Router (src/
layout) / PostgreSQL** (single engine). Business-rule tests run against a real
PostgreSQL database created from `data/schema.sql` and seeded from
`data/seed/load_seed.sql`. OTP email delivery is stubbed to a dev outbox file
under `var/outbox/`. Document uploads are written to `var/uploads/`.

---

## Technical Context

**Language/Version**: TypeScript `5.9.3` on Node.js `≥ 22.0.0`

**Primary Dependencies** (exact versions from npm registry, 2026-10-14):

| Package | Version | Role |
|---|---|---|
| `next` | `16.4.0` | App Router framework |
| `react` | `19.3.0` | UI rendering |
| `react-dom` | `19.3.0` | DOM binding |
| `typescript` | `5.9.3` | Language |
| `pg` | `8.23.1` | PostgreSQL client (node-postgres) |
| `bcryptjs` | `3.0.3` | Password hashing (pure JS, no native build) |
| `zod` | `4.6.7` | Server-side validation |
| `vitest` | `5.0.4` | Test runner (`npm test` = `vitest run`) |
| `@types/node` | `26.6.5` | Node.js type definitions |
| `@types/react` | `19.3.0` | React type definitions |
| `@types/react-dom` | `19.3.0` | React-DOM type definitions |
| `@types/pg` | `8.23.1` | pg type definitions |
| `@types/bcryptjs` | `3.0.0` | bcryptjs type definitions |

**Storage**: PostgreSQL only. No SQLite (see Complexity Tracking).

**Testing**: Vitest `5.0.4`; `npm test` runs `vitest run` (no watch mode).
Business-rule tests spin up a disposable database via `psql` and run
`data/schema.sql` + `data/seed/load_seed.sql` from the repository root.
Test files **never modify** any file under `data/`.

**Target Platform**: macOS and Windows (free tools only — PostgreSQL + psql
available at no cost on both).

**Project Type**: Web application (Next.js App Router, `src/` layout).

**Performance Goals**: None specified for this slice (MVP focus).

**Constraints**:
- Must run from a fresh clone with the commands in `quickstart.md`.
- No interactive scaffolding; do not overwrite `README.md`, `.gitignore`,
  `.gitattributes`, or `AGENTS.md`.
- `.env` is git-ignored; only `.env.example` (placeholders) is committed.
- Login and deployment are **out of scope** until Session 11.

**Scale/Scope**: Single user story, US-1, end-to-end (three screens, four
server actions / API routes).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec is Source of Truth | ✅ PASS | All requirements traced to `docs/spec/specs/spec-AUT.md` §3 US-1, §5 FR-001–004, FR-023. No invented requirement. |
| II. Business Rules are Test-First | ✅ PASS | Every BR and acceptance scenario for US-1 will have a failing test written before the code that makes it pass. |
| III. Thin Vertical Slices | ✅ PASS | Only US-1 is in scope; US-2 to US-10 are listed as out of scope. |
| IV. Synthetic Data and No Secrets | ✅ PASS | Only `data/seed/` data used. Secrets in `.env` (git-ignored). |
| V. Humans Approve Every Change | ✅ PASS | Agent works on branch `001-aut-registration`; no push or merge without team review. |

**Violations requiring justification** — see Complexity Tracking below.

---

## Out of Scope (this slice)

The following user stories from `docs/spec/specs/spec-AUT.md` are **explicitly
out of scope** and must not be implemented in this branch:

- **US-2** (P2): Log In — UC-ACC-02 (F-AUTH-05 to F-AUTH-08, F-AUTH-15)
- **US-3** (P3): Log Out — UC-ACC-03 (F-AUTH-09)
- **US-4** (P2): Forgot Password — UC-ACC-04 (F-AUTH-10 to F-AUTH-12)
- **US-5** (P2): Change Password — UC-ACC-05 (F-AUTH-13 to F-AUTH-14)
- **US-6** (P1): Verify Agency — UC-ACC-06 (F-AUTH-18)
- **US-7** (P1): Create UBND Account — UC-ACC-07 (F-AUTH-19)
- **US-8** (P1): Create Local Provider Account — UC-ACC-08 (F-AUTH-20)
- **US-9** (P1): Manage Accounts — UC-ACC-09 (F-AUTH-21, F-AUTH-22)
- **US-10** (P1): Revise and Resubmit Agency Registration — UC-ACC-06 (F-AUTH-26)

---

## Project Structure

### Documentation (this feature)

```text
specs/001-aut-registration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── api.md           # Server Action / API route contracts
│   └── otp.md           # OTP stub contract
└── tasks.md             # Phase 2 output (speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing / placeholder home
│   ├── register/
│   │   ├── page.tsx                  # REG003 — Agency Registration form
│   │   ├── otp/
│   │   │   └── page.tsx              # REG115 — OTP Verification Input
│   │   └── status/
│   │       └── page.tsx              # REG116 — Registration Status
│   └── api/
│       └── register/
│           └── route.ts              # POST /api/register  (F-AUTH-02/03)
├── lib/
│   ├── db.ts                         # pg Pool, typed query helpers
│   ├── validation.ts                 # Zod schemas (FR-002 field rules)
│   ├── password.ts                   # bcryptjs hash / verify
│   ├── otp.ts                        # OTP generate / verify / dev outbox
│   └── files.ts                      # Multipart upload → var/uploads/
└── types/
    └── registration.ts               # Shared TS types for registration flow

tests/
├── business/
│   ├── helpers/
│   │   └── db.ts                     # createTestDb / teardownTestDb (psql)
│   ├── fr002-validation.test.ts      # FR-002 field validation rules
│   ├── fr003-duplicate-email.test.ts # FR-003 duplicate email check
│   ├── fr004-create-account.test.ts  # FR-004 create Pending Approval account
│   └── fr023-otp.test.ts             # FR-023 OTP lifecycle
└── ui/
    └── (placeholder — UI snapshot tests, added in later tasks)

var/                     # Runtime-only, git-ignored
├── outbox/              # Dev OTP email stubs (JSON files)
└── uploads/             # Uploaded registration documents

.env.example             # Placeholder credentials (committed)
```

**Structure Decision**: Next.js App Router with `src/` layout. Server Actions
and Route Handlers handle form submissions and API calls. Business-rule tests
live in `tests/business/` and use a real PostgreSQL test database. No separate
`backend/` package is needed for this single-slice MVP.

---

## Complexity Tracking

| Item | Category | Reason | If Wanted Later |
|---|---|---|---|
| SQLite alternative engine | Deferred feature | Team input not provided; PostgreSQL is the sole engine per spec. | Add a `vitest.config.sqlite.ts` and an adapter in `lib/db.ts`; track in a future plan step. |
| Real email delivery for OTP | Deferred integration | No SMTP/email service is configured for this slice; OTP is written to `var/outbox/` as a JSON file. | Wire an SMTP provider (e.g., Resend) at Session 11 when deployment is in scope. |
| Login / authentication | Out of scope until Session 11 | Login (US-2) requires session management; deferred per team decision. `Sign in` link renders as a `<a href="#">` placeholder. | Implement in the Session-11 deployment slice. |
| Deployment / production hosting | Out of scope until Session 11 | No hosting target chosen yet. | Choose hosting at Session 11. |
