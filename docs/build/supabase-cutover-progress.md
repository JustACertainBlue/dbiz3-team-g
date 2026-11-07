# Live PostgreSQL cutover — completed

See [results and per-file changes](supabase-cutover-results.md) and [team quickstart](../env/supabase-quickstart.md). All live APIs and server pages use PostgreSQL; ordinary tests alone use JSON fixtures. No silent fallback and no GitHub push.

Validation: 1,052 ordinary tests pass; 14 explicit hosted tests pass with fixture rollback. Production build, TypeScript, seed validation, TLS and RLS audit pass. Migrations/seed reruns are idempotent. Localhost is served at http://localhost:3000.

21 non-conflicting Provider/Matching records were imported from the old JSON file. Conflicting legacy Chat/Booking history remains archived in that unchanged file; no old login tokens were imported. File bytes, email delivery, Supabase Auth, background hosting and high-volume query optimization remain separate deployment work.
