# Local Provider publication verification — 2026-11-07

## Scope and findings

Verified the Provider journey against hosted PostgreSQL and private Supabase Storage using synthetic identities, a synthetic village, three licensed image uploads and a clearly synthetic PDF certificate. Unlike rollback-only tests, every business step commits normally; a separate database connection reads the result. Cleanup removes only UUIDs created by the test, not existing accounts, villages or seed records.

The existing demo UBND identity belongs to inactive Ha Thai. Creating a Provider there correctly fails with `Village not found or inactive`. The test uses its own active village and Admin, preserving the team's existing state.

Found a real publication defect: `provider_registration_number_uq` included both `Verified` and `Superseded` versions. Publishing a revision with the same legal registration number as its own historical version failed with SQL unique violation / HTTP 500. The new migration limits uniqueness to currently `Verified` versions, matching A4's existing comment and PRF BR-007's versioned-publication contract. Historical numbers remain intact. A negative database test still rejects a second currently Verified Provider with the same number.

Initial fixture-construction/cleanup mistakes were corrected before acceptance (actual village column names, unique source code and deferred cyclic Provider/version foreign keys). A narrowly scoped cleanup recovered the synthetic records from failed runs; existing business records were not reset.

## Final results

- After applying the migration, hosted route-handler verification passed all 6 Storage tests, including the full committed Provider journey.
- Actual localhost HTTP verification passed all 6 tests again (Provider journey: 52 seconds). Upload, profile edit, Experience creation and review used real opaque sessions and the running Next.js server. Public Experience HTML hid the unpublished record and displayed it after approval. Next.js streaming can send HTTP 200 for a not-found page; the test checks that unpublished content is absent and the not-found response is rendered, rather than trusting the status alone.
- Hosted PostgreSQL regression: 14 passed after the migration.
- Ordinary regression: 1,058 passed, 20 hosted tests intentionally skipped. TypeScript passed.
- Database audit: 47/47 tables have RLS, zero anonymous/authenticated Data API table access.
- Independent final SQL inspection confirmed the index predicate is `version_status = 'Verified'`, with zero remaining Provider-flow test accounts or villages.
- One HTTP attempt was invalidated by my mistakenly running the scoped test cleanup concurrently. It affected synthetic fixtures only. The accepted final run was sequential and completed its own cleanup successfully.

The fresh-index predicate follows PostgreSQL's [partial unique index mechanism](https://www.postgresql.org/docs/17/indexes-partial.html). No UI, endpoint contract or business state transition was changed.

## Milestones checked

| Step | Evidence |
|---|---|
| Provision synthetic UBND and Provider | Real accounts/profile records committed; actual bcrypt passwords and opaque sessions used for Provider/Admin requests. Email delivery is injected into a test-only receiver, never claimed as real email. |
| Save incomplete profile | PATCH succeeds, separate SQL reader sees Draft; unauthorized edit rejected. |
| Upload files | Three JPEGs and one synthetic PDF uploaded; stored_files visible from separate SQL connection; actual Storage image bytes equal uploaded bytes. Invalid image rejected. |
| Complete profile / submit | PATCH writes contact/legal fields, operating hours, versioned gallery/certificate links and Pending Verification. |
| Create Experience | Requires Activity/Space/Product images; record remains absent from Explore eligibility until Provider publication. |
| Review permissions | Non-UBND review rejected. Owner image and certificate remain inaccessible to Guest before publication. |
| Request revision / resubmit | Revision Required → corrected PATCH → Pending Verification persisted. |
| First approval | Provider and version become Verified, published pointer is set, decisions persist, Experience becomes eligible; public pricing stays hidden. |
| Public/private files | Published gallery image readable to Guest; business certificate remains private after approval. |
| Later major edit | New pending version created; Explore continues using old published legal name. |
| Approve later version | Old version becomes Superseded; new legal name becomes public without losing historical registration number. |
| Legal uniqueness | Another Verified Provider cannot take the published registration number (23505); negative operation rolls back. |
| Cleanup | Newly created Provider/Admin/village absent from independent SQL reader; test-owned uploads removed. No reset or seed regeneration. |

## Reproduction

Configure the existing ignored development database/Storage variables, then run:

```text
npm run db:migrate
npm run test:storage
npm run test:postgres
npm run lint
```

Ordinary `npm test` skips hosted tests and does not change Supabase. For actual HTTP verification, keep the development server on localhost:3000 and opt in:

```powershell
$env:HAB_PROVIDER_FLOW_HTTP='1'
npm.cmd run test:storage
Remove-Item Env:HAB_PROVIDER_FLOW_HTTP
```

HTTP mode sends upload, profile PATCH, Experience creation and review through the running Next.js server and checks public Experience HTML before/after approval. The default run invokes the same API route handlers in-process. Neither mode is a browser click-through or verification of real email delivery.

The migration was applied to the configured development project and an idempotent rerun skipped it. Do not modify previously applied migration files or rerun the initial schema to apply this fix. `data/schema.sql` is the original schema snapshot and is unchanged under the repository's data-file ownership rule; the deployed upgrade is represented by the new versioned migration. Future fresh databases must use the documented migration runner.

## Files changed

| File | Reason |
|---|---|
| `supabase/migrations/20261107094557_hab_provider_registration_history.sql` | Repair currently-published registration uniqueness without deleting history or changing UI flow. |
| `tests/storage/provider-publication.test.ts` | Add committed, independently verified Provider publication regression and optional localhost HTTP mode. |
| `docs/build/provider-publication-verification.md` | Record evidence, scope, limitations and rerun instructions. |
| `docs/build/build-log.md` | Record this test/fix run and actual acceptance results. |

No GitHub push is part of this verification task.
