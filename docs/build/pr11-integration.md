# AUT PR #11 integration

Source: https://github.com/JustACertainBlue/dbiz3-team-g/pull/11
Source head: `07d60b0e306518f23a75536af6e9f3335be146c8` (linh-daotruc).

## Implemented

- Reused registration and OTP input validation from `src/lib/validation.ts`, adapting the Zod enum error option to the currently installed Zod 3.
- Reused bcrypt password hashing/verification primitives from `src/lib/password.ts` with cost 12.
- Adapted password authentication to the shared JSON repository, `hab_session` cookie and canonical SessionContext.
- User role, organization and assigned village now resolve from stored accounts/profiles/assignments rather than the fixed demo identity list.
- Agency login requires Approved; Provider/Admin login requires Active. Session reads revalidate status and role context.
- Kept fixture-only password compatibility for the four original demo accounts in non-production environments. Real password hashes never use that fallback; production login never uses it.
- Preserved existing role landing paths and API response format used by the integrated UI.

## Validation

- Regression suite after the auth changes: 159 files / 988 tests passed.
- Additional API contract test: password login, canonical session and logout for a new non-demo Agency passed (one test).
- TypeScript passed before the final API test addition; production build is checked separately.

## Remaining before PR #11 can be merged

- Registration, private uploaded documents, OTP verification and resubmission must use the shared repository with transactional uniqueness and status transitions.
- Compare and integrate Agency review and account-management rules with the current local implementations; preserve village restrictions.
- Integrate credential issuance/recovery/change-password with a clearly configured delivery adapter. Real email is still unconfigured; do not advertise successful email delivery.
- Port applicable PostgreSQL business tests and preserve their rule coverage; PostgreSQL-specific tests require an isolated database.
- Reconcile feature documents/build logs and repository configuration without overwriting active module routes or dependency versions.
- Resolve the PR branch against current main, run full regression/build and browser role-flow checks, then update and merge the PR. No merge or GitHub update has happened at this checkpoint.

The PR source remains intact on its original branch. This checkpoint is an integration in progress, not completion of AUT or approval of PR #11.

## Registration integration update

- Reused the member's registration, OTP and status screens with scoped green/cream styling. Fixed the form/API field naming mismatch and optional blank business email validation.
- Added JSON-backed registration and OTP services, plus register/verify/resend endpoints. No account is created before successful server-side OTP verification. Account/profile creation and OTP consumption are atomic and replay-safe.
- Added a repository transaction that serializes the full synchronous read/check/write operation across local processes. Duplicate email/tax checks and OTP attempt updates run inside it.
- OTP codes use cryptographic randomness and bcrypt verifiers; expire after 10 minutes; reject at five failed attempts; resend invalidates the earlier challenge and is limited to three within 15 minutes.
- Added private PDF/JPEG/PNG document storage and an HDT-only download endpoint. Missing seed binaries stay explicitly unavailable. Files are limited to five, 5 MB each, with signature checks and server-generated storage names.
- Delivery defaults to unavailable (503). For local tests only, explicitly set `HAB_EMAIL_MODE=dev-outbox`; codes are written to ignored `.demo-data/otp-outbox/`. No code is returned by an API or logged. This is not real email delivery.
- Integration tests passed for registration → OTP → Pending Approval → HDT approval → password login, replay, five-attempt lock, failed-delivery rollback, resend invalidation, expiry and duplicate submissions.
- Regression at that point: 161 files / 993 tests passed. Additional document/delivery guard tests: six passed; Agency review tests: three passed. Build passed before the latest document-download route and cosmetic text changes; TypeScript passed with the document route.

Still outstanding: secure revise/resubmit workflow, the rest of account-creation/management differences, credential recovery/change/issuance integration, the full latest browser audit, PR conflict resolution, GitHub update and merge. The registration implementation above replaces the first registration TODO; it does not mark those other areas complete.
