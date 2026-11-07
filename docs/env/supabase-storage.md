# Supabase Storage development setup

## What changes for the application

PostgreSQL stores the existing `stored_files` metadata and relationships. Supabase Storage stores the actual image/document/attachment bytes. Screens keep their existing API URLs and opaque `hab_session` login. No Data API activation, Supabase Auth migration, new schema or browser-held secret is needed.

`src/lib/storage/object-store.ts` is the shared server boundary. Live requests never fall back to local disk. Ordinary automated tests use isolated disk/memory fixtures; hosted Storage tests explicitly opt in. `scripts/storage/client.mjs` calls the Storage REST API with a backend secret and rejects unexpected object paths.

## Configure once per development project

Add these variables to the ignored repository-root `.env.local`, then restart Next.js. Never send the secret to chat or add a `NEXT_PUBLIC_` prefix.

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=
SUPABASE_STORAGE_BUCKET=hab-private
```

Copy Project URL and backend secret from that same Supabase project. `storage:setup` checks that the Storage project matches `DATABASE_APP_URL`. The bucket must remain **private**. Do not add anonymous read/upload policies to solve image display; the application serves authorized images through its own API.

From the repository root (use `npm.cmd` in PowerShell if script execution is restricted):

```text
npm run storage:setup
npm run storage:import-local
npm run storage:import-local -- --apply
npm run storage:catalog
npm run storage:catalog -- --apply
npm run test:storage
npm run dev
```

Both imports are read-only plans unless `--apply` is supplied. Local import preserves original files and skips existing cloud objects. Catalog import uses only committed seed file IDs linked to experiences/provider galleries; it preserves their IDs and relationships. It never substitutes certificates or replaces user-uploaded UUIDs. It checks the bundled photo dimensions/byte counts before upload. A rerun safely resumes remaining seed records after a network error.

For an intentional refresh of previously bootstrapped **seed** photographs, review assets/credits first, then use `npm run storage:catalog -- --apply --refresh-seed-images`. This explicit flag permits replacement only for IDs from the committed seed catalog. Ordinary uploads never upsert existing objects. Metadata changes use compare-and-set and compensate failed writes; the hosted bucket and SQL database are not one atomic transaction.

## Access rules that remain in force

| Object prefix | Who can read through the application |
|---|---|
| `prf-media/` | Owner/reviewer according to existing scope; linked images of published, verified, active providers are public. Certificates remain private. |
| `chat-files/` | Authorized Agency/Provider participants of the linked Chat; Admin and Guest are denied. |
| `registration-documents/` | HDT administrator with `manage_users`, and only a linked registration document. |
| `account-avatars/` | Authenticated owner of the account avatar. |

Secret-key requests bypass Storage RLS, so these application guards are essential. Private buckets prevent direct anonymous object URLs from bypassing them. Do not import the Storage client into a browser component. Missing objects return unavailable/404 rather than fabricated files. Existing detach/archive flows retain historical file bytes; an orphan-retention/cleanup policy is future operational work.

## Images and verification

Eight licensed, credited craft photographs are bundled under `assets/demo-media/`. They illustrate synthetic Experience/Provider records, not actual providers or verification evidence. Source and license links are available from the site footer and `/image-credits`. Source seed CSVs are unchanged; the bootstrap updates development file metadata only.

Hosted tests roll SQL fixtures back and remove only the cloud objects they created. They cover public-image publication, private certificates, participant-only Chat attachments, registration document cleanup and private account avatars. Ordinary `npm test` does not access hosted Storage. See [verification results](../build/supabase-storage-results.md) for the actual commands and outcomes from this implementation.

Production still needs separate environment credentials, backup/retention and quota monitoring, and real email configuration. This integration does not claim production deployment or real OTP delivery.
