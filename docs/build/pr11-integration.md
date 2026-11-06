# AUT PR #11 integration report

Source PR: https://github.com/JustACertainBlue/dbiz3-team-g/pull/11
Original author: linh-daotruc (Truc Linh). Original head: `07d60b0e306518f23a75536af6e9f3335be146c8`.

## Result and integration decisions

All ten AUT stories from the PR are mapped to the current runtime in [the integration quickstart](../../specs/AUT-INTEGRATION.md). The original registration/OTP/status and recovery screens, input validation and bcrypt primitives were reused. The PostgreSQL account, review, recovery, revision and session rules were adapted to the shared JSON repository and SessionContext. The current role workspaces replace the AUT branch's placeholder dashboards. We keep Next.js 14/React 18/Vitest 2 and add bcryptjs 3.0.3 rather than replacing the existing dependency stack with the unrelated scaffold versions in the old PR.

The source feature documents and original build log are retained. The ten spec snapshots were refreshed with `tools/start_feature.py`; each printed OK. Original SQL code and original tests remain in the member's Git commits. They are not installed as an unused parallel production database layer. The integration adds rule/contract tests for the corresponding behavior in the shared runtime. Historical task/checklist ticks in the source documents are not treated as fresh review evidence.

## Implemented behavior

- Registration and document capture, OTP issue/resend/verify, Pending Approval account/profile creation, HDT review, new Agency password login.
- Duplicate email/tax validation, cryptographically random OTP with bcrypt verifier, ten-minute expiry, five-attempt lock, three resends within 15 minutes. OTP replay cannot create a second account.
- Private PDF/JPEG/PNG documents, at most five and 10 MB per file (the spec limit), server-generated storage names, signature checks, HDT-only attachment download. Seed rows without actual file bytes remain visibly unavailable.
- HDT creates UBND in an active, unassigned village; UBND creates Provider only in its assigned village. New Provider account Active and profile Draft are separate. The generated password forces change before business API access.
- Existing account list/detail/filter/status actions retain local UI and village scope. Disable revokes sessions immediately; enable restores the previously recorded state through account_status_history, with earlier local audit history retained as a compatibility fallback.
- Recovery uses a hashed single-use token valid for 15 minutes. Confirmation/complexity checks, password change, admin temporary-password reset and session revocation use the shared repository.
- Request More Information keeps the account Pending Approval. A delivered edit link is hashed, single-use and valid for 24 hours. Replacing the link or resubmitting invalidates older links. Resubmission creates a new data/document version on the same request and preserves review history. Email remains immutable.
- The shared `hab_session` cookie, canonical role/admin subtype/permissions and existing Agency/Provider/Admin routes remain in use. Current login, account, header, Provider layout and other local work are preserved in the integration branch history.

## Email boundary explicitly accepted by the user

Real email is unconfigured and is not represented as working. Without configuration, registration/recovery/credential issuance and password reset that require delivery report unavailable. Admin can record Request More Information, but no edit link is claimed delivered until a delivery adapter is available. Local-only `HAB_EMAIL_MODE=dev-outbox` writes synthetic test messages under ignored `.demo-data/otp-outbox/` and `.demo-data/auth-outbox/`; never to the public directory, API response or application log. Production refuses this adapter.

## Validation

- Final combined regression: 164 test files / 1,011 tests passed.
- Included `aut-lifecycle-api.test.ts`: six tests passed (invalid login payload, delivery unavailable without account enumeration, anonymous/forged requests, role restrictions, configuration state).
- Production build passed; TypeScript passed.
- Seed validator: PASS, 47 CSVs and lifecycle/scope/ranking invariants.
- Python hook tests: three tests passed.
- `node scripts/smoke-auth.mjs`: PASS, 34 page responses and 58 HTTP checks across Agency, Provider, HDT and UBND; canonical login/session, scopes and logout verified.
- Earlier limited browser check verified Provider login/dashboard/Experience navigation. Further browser automation was stopped by its URL-policy guard. At the user's instruction, final verification uses CLI/API, not a claim that every visual interaction was re-audited.
- Final post-merge checks and commit/PR status are recorded in the delivery result. Real email, production deployment and independent human review are excluded from completion claims.

## Changed-file guide

| Files | Purpose |
|---|---|
| `src/lib/auth/registration-*`, `password.ts`, `product-session.ts`, `session.ts` | Reused validation/password rules and one session/registration contract |
| `src/lib/auth/lifecycle.ts`, `api-result.ts` | Recovery, password change, account creation/reset and versioned revision rules |
| `src/lib/auth/admin-accounts.ts`, `agency-review.ts` | Atomic status/review operations and scope enforcement |
| `src/lib/demo/json-repository.ts` | Transactional synchronous read/check/write under the shared file lock |
| `src/app/api/auth/*`, `src/app/api/register/*` | API adapters and private document access |
| `src/app/register/*`, `forgot-password/*`, `reset-password/*`, `account/*`, `admin/create-account/*`, `admin/users/*` | Member screens and current workspaces connected to the common backend |
| `src/app/login/page.tsx`, `components/SessionHeader.tsx`, `product-ui.css` | Entry links, password-change gate, logout cleanup and shared form styling |
| `tests/integration/aut-*.test.ts`, `tests/contract/*login*`, `*registration*`, `aut-lifecycle-api.test.ts`, `tests/unit/product-session.test.ts` | AUT integration, rejected paths and preserved session contract |
| `scripts/smoke-auth.mjs` | Repeatable local CLI/API role smoke checks |
| `specs/*-aut-*`, `specs/AUT-INTEGRATION.md`, `docs/build/aut-pr11-original-build-log.md` | Original contribution retained with explicit current-runtime guidance |
| `AGENTS.md`, `docs/build/build-log.md`, this report | Current operating context and evidence; no source spec/data edits |

## Known technical limits

JSON and local filesystem delivery remain prototype adapters. Auth rate-limit timestamps are private runtime metadata, not an addition to the logical domain model or CSV seed package. Real email transport, a production PostgreSQL adapter, distributed transactions/outbox dispatch, storage retention and production security hardening need their own deployment work. Files saved before a rejected registration may remain as unreferenced private objects until a retention job is implemented; none become publicly accessible. This merge preserves the user's functional-prototype scope rather than claiming a production release.
