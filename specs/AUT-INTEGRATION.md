# AUT integration from PR #11

The ten `*-aut-*` feature folders retain Truc Linh's original plan, tasks, research and contracts. Their spec snapshots have been refreshed from the current `docs/spec/specs/spec-AUT.md` using `tools/start_feature.py`. Original SQL implementation and original tests remain retrievable in the PR's author commits; their business rules were ported to the current shared runtime instead of installing a second database/session stack.

## Current quickstart

From the repository root:

```powershell
npm.cmd ci
python data/scripts/validate_seed.py
npm.cmd test
npm.cmd run lint
npm.cmd run demo:seed
npm.cmd run dev
```

Open `http://localhost:3000/login`. The four displayed demo identities continue working in development only. Other accounts authenticate against their actual bcrypt password hash. Production rejects fixture-password login.

Real email remains unconfigured. Registration, recovery, credential issuance and admin password reset return an explicit unavailable response instead of reporting successful delivery. To exercise local delivery on your laptop only, set `$env:HAB_EMAIL_MODE='dev-outbox'` before starting the development server. OTP messages go into ignored `.demo-data/otp-outbox/`; recovery, revision and temporary-credential messages go into ignored `.demo-data/auth-outbox/`. Read the local JSON file for your synthetic recipient; use its code or its `path` appended to the localhost origin. These messages are never returned in APIs or logged. Do not use real personal data or deploy this adapter as an email service.

## Adoption map

| Original story | Current UI / API | Business implementation |
|---|---|---|
| US-1 registration | `/register`, `/register/otp`, `/register/status`; `/api/register`, `/api/register/verify-otp`, `/api/register/resend-otp` | `auth/registration-service.ts`, member validation and screens; shared repository transactions |
| US-2 login | `/login`; `/api/auth/login`, `/api/auth/session` | `auth/product-session.ts`, member bcrypt rules, canonical SessionContext |
| US-3 logout | shared header confirmation; `/api/auth/logout` | revoke session, remove cookies and clear sessionStorage |
| US-4 recovery | `/forgot-password`, `/forgot-password/sent`, `/reset-password`, `/reset-password/success`; matching auth APIs | `auth/lifecycle.ts`: 15-minute hashed, single-use token and session revocation |
| US-5 change password | `/account/change-password`; `/api/auth/change-password` | current-password verification, complexity/confirmation, first-login gate, revoke sessions |
| US-6 verify Agency | `/admin/agencies`; `/api/auth/agency-reviews`, private document download | `auth/agency-review.ts`; initial registration and major legal changes remain separate |
| US-7 create UBND | `/admin/create-account`; `/api/auth/users/create` | HDT only, active unassigned village, temporary password and fixed village |
| US-8 create Provider | same screen/API resolves UBND context | assigned UBND only; Active account and separate Draft profile, nothing published |
| US-9 manage accounts | `/admin/users`; `/api/auth/users` | `auth/admin-accounts.ts`, lifecycle reset; village restriction, status history, immediate revocation |
| US-10 revise/resubmit | `/register/revise?token=...`; `/api/register/resubmit` | 24-hour hashed edit token, immutable email, new submission/document version, review history preserved |

## Boundaries kept from the integrated product

- One JSON repository and cookie `hab_session`; no direct UI data store and no parallel `session_token` cookie.
- Existing Agency Explore/Matching/Quote/Chat/Booking and Provider profile/experience/booking/schedule routes remain in use. Placeholder dashboards from the old AUT branch are superseded by these actual role workspaces.
- `must_change_password` gates business APIs until password change. Change/reset revokes sessions and sends the user through login again.
- Personal account editing remains under `/account`; Admins do not gain permission to edit business profile content.
- Real email, PostgreSQL production deployment and independent human review are not claimed complete by this integration.

## Validation and traceability

`tests/integration/aut-registration-flow.test.ts` covers OTP/account/review/login handoff and rejected paths. `tests/integration/aut-lifecycle.test.ts` covers creators/scopes, temporary credentials, recovery tokens, revision tokens/versions, status restoration and revocation. `tests/contract/product-login-api.test.ts` and `tests/contract/registration-api.test.ts` cover session and delivery/document boundaries; the existing business-module suite covers the flows retained during integration. See `docs/build/pr11-integration.md` for final command results and adoption/deviation notes.

Test fixtures and injected delivery adapters are synthetic. Human reviewer and course acceptance checkboxes must only be ticked by the person who actually performs those checks.
