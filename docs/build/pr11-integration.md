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
