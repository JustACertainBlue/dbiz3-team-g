# Supabase Storage implementation and verification — 2026-11-07

## Result and boundaries

Live Provider/Experience media, registration documents, account avatars and Chat attachments now use private Supabase Storage. PostgreSQL keeps file metadata and relationships. Existing URLs, opaque sessions, role scope and commercial flows are preserved. No public bucket, Data API activation, schema/spec/seed changes, new npm dependency, GitHub push or merge was introduced.

Eight licensed illustrative craft photographs populate 32 existing synthetic gallery records (three Experience images and one Provider image per craft). The same illustrative photograph is deliberately reused within each seed craft gallery; these are not 32 unique photographs or actual photos of the named providers. Five currently eligible Experiences are visible in Explore; existing publication/verification rules continue to hide the others. Real provider uploads can replace their own gallery selections through the existing editing flow.

Wikimedia-supplied 1280 px versions total approximately 3 MB instead of approximately 32 MB of originals. Credits, authors and licenses are retained in the asset manifest and `/image-credits`. Related Experience cards also use the shared media source. No stock certificate, avatar or verification evidence was fabricated. Seed certificates lacking original bytes remain explicitly unavailable.

## Verification evidence

| Check | Result |
|---|---|
| `npm test` | 1,058 passed; 19 hosted tests intentionally skipped in the ordinary run. |
| `npm run test:postgres` | 14 passed; includes Provider → Explore and Quote → Chat → Booking → Schedule, with SQL fixture rollback. |
| `npm run test:storage` | 5 passed against hosted Storage: publication-gated image, private certificate, participant-only attachment, registration cleanup and private avatar API. SQL fixtures roll back and created cloud test files are removed. |
| `npm run lint` | Passed TypeScript validation. |
| `npm run build` | Passed production build, including the related-card image change. |
| `python data/scripts/validate_seed.py` | Passed 47 CSVs/load headers and business-rule fixture checks. |
| `python -m unittest discover -s tests/hooks -q` | 3 passed. |
| `npm run db:audit` | 47/47 business tables with RLS; zero anonymous/authenticated Data API access. |
| Private bucket check | `hab-private.public = false`; anonymous public-object URL failed in the hosted certificate test. |
| Catalog metadata audit | 32 uploaded seed gallery records; all 32 have width 1280 px and actual sizes below 600 KB. |
| Catalog rerun | Read-only plan reports zero remaining seed images; bootstrap is resumable/idempotent. |
| Existing local upload import | Zero original upload files found in this checkout. Original directories were preserved. |
| Secret handling | `.env.local` remains git-ignored. No credential values are in the change set or verification report. |
| `node scripts/smoke-auth.mjs` | Passed 34 page responses and 58 HTTP checks across Agency, Provider, HDT and UBND, including login/session/logout and scope denials. |

Desktop Chrome verification passed on 10 pages at 1440 × 1000: Guest catalog/Experience/Provider/credits, Agency catalog/Experience, and owner Provider view/edit plus Experience view/edit. All 33 displayed image instances loaded, with no gallery fallback or browser/server error in that final run. Screenshots and a machine-readable report are retained under ignored `.demo-data/storage-verification/`; screenshots of catalog, related cards and owner galleries were visually inspected after asynchronous data finished loading.

An earlier ordinary-test run hit an intermittent Windows EPERM in the existing JSON multi-process fixture lock while a build ran concurrently. The complete subsequent run passed without changing the test or unrelated JSON code. Initial large-photo uploads hit timeouts; using source-supplied thumbnails and resumable catalog import resolved this. An initial dev preview had stale Webpack module errors; its generated cache was archived under ignored `.demo-data/` and the server restarted. No source or runtime database was reset.

## Files changed and why

Paths below are repository-relative. User-installed skill folders and `skills-lock.json` predated this task and are not application changes.

| File | Reason |
|---|---|
| `.env.example` | Document backend-only Storage variables without credentials. |
| `AGENTS.md` | Keep runtime/storage status factual for future agents. |
| `package.json` | Add Storage setup/import/catalog/hosted-test commands; dependencies unchanged. |
| `scripts/storage/client.mjs` | Private REST adapter, safe paths, bounded requests, missing-object handling and explicit administrative seed refresh support. |
| `scripts/storage/setup.mjs` | Validate project alignment and create/check a private bucket. |
| `scripts/storage/import-local.mjs` | Plan/import original local upload bytes while retaining originals. |
| `scripts/storage/bootstrap-catalog.mjs` | Guarded import/refresh of committed seed image IDs, metadata integrity checks and compensation. |
| `scripts/storage/test.mjs` | Explicit opt-in runner for hosted Storage tests. |
| `src/lib/storage/object-store.ts` | Single asynchronous live byte-storage boundary; ordinary-test fixtures only on disk. |
| `src/lib/prf/media-store.ts` | Move validated image/certificate byte I/O to Storage and preserve public/private guards and cleanup. |
| `src/lib/prf/provider-service.ts` | Check certificate availability in cloud storage. |
| `src/lib/iac/chat-files.ts` | Use asynchronous cloud attachment storage; retain isolated test memory store. |
| `src/lib/iac/chat-service.ts` | Await attachment writes, reads and compensating cleanup. |
| `src/lib/auth/registration-files.ts` | Upload validated registration files and compensate partial/failed submission writes. |
| `src/lib/auth/agency-review.ts` | Check actual document availability in Storage. |
| `src/app/api/auth/account/avatar/route.ts` | Preserve owner-only avatar API while storing bytes durably. |
| `src/app/api/auth/agency-reviews/documents/[fileId]/route.ts` | Preserve HDT permission/linkage checks while reading private document bytes. |
| `src/app/api/prf/media/[fileId]/route.ts` | Return cloud bytes through the same authorized media URL. |
| `src/app/api/register/route.ts` | Remove newly uploaded objects if registration persistence fails. |
| `src/app/api/register/resubmit/route.ts` | Apply the same compensation for resubmissions. |
| `src/app/admin/providers/[id]/page.tsx` | Review certificate availability against Storage rather than local disk. |
| `src/app/components/MediaImage.tsx` | Reset failed-image fallback when its URL changes after an upload. |
| `src/app/explore/experiences/[id]/page.tsx` | Replace related-card color-only blocks with actual Experience images. |
| `src/app/explore/explore.css` | Fit related-card photographs and keep their labels readable. |
| `src/app/layout.tsx` | Expose an image-credit link and illustrative-seed disclosure. |
| `src/app/image-credits/page.tsx` | Display source, creator, license and derivative-use information. |
| `assets/demo-media/ceramics.jpg` | Licensed pottery-making illustration. |
| `assets/demo-media/silk.jpg` | Licensed weaving illustration. |
| `assets/demo-media/bamboo.jpg` | Licensed Phu Vinh bamboo/rattan products illustration. |
| `assets/demo-media/conical-hats.jpg` | Licensed conical-hat making illustration. |
| `assets/demo-media/embroidery.jpg` | Licensed Vietnamese embroidery illustration. |
| `assets/demo-media/wood-carving.jpg` | Licensed carved wooden screen illustration. |
| `assets/demo-media/lacquer.jpg` | Licensed lacquer artwork illustration. |
| `assets/demo-media/water-puppets.jpg` | Licensed water-puppet theater illustration. |
| `assets/demo-media/manifest.json` | Preserve provenance/license and actual dimensions/byte counts for all photographs. |
| `assets/demo-media/README.md` | Explain illustrative use, attribution obligations and safe bootstrap boundaries. |
| `tests/unit/storage-client.test.ts` | Check configuration, privacy, path rejection, no-upsert default and real Storage missing-object semantics. |
| `tests/storage/private-files.test.ts` | Verify all four live file categories and authorization with real cloud bytes. |
| `tests/unit/iac-attach-send.test.ts` | Await asynchronous attachment reads in the existing assertion. |
| `docs/env/supabase-storage.md` | Setup, commands, access model, retention and deployment limits. |
| `docs/env/supabase-quickstart.md` | Link Storage setup and remove obsolete local-byte runtime statements. |
| `docs/build/supabase-storage-plan.md` | Record the implementation scope and safety boundaries. |
| `docs/build/supabase-storage-results.md` | Record actual outcomes and every changed file/reason. |
| `docs/build/build-log.md` | Record this implementation and verification run. |

## Remaining operational work

Real email/OTP, production deployment, separate production credentials, automated backup/retention and quota monitoring remain outside this task. Detaching an image/document does not immediately delete historical bytes. PostgreSQL and object storage have separate transaction boundaries; compensating cleanup covers known failures, but operational orphan reconciliation is still needed for process crashes. No local disk fallback hides an unavailable Storage service.
