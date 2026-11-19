-- Content columns that exist on the DEV database but were never recorded in a migration
-- (checked read-only on DEV 2026-11-18: all nullable, no default). IF NOT EXISTS keeps this
-- a no-op where they already exist and adds them where they do not (a fresh database, PROD).
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.villages ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.villages ADD COLUMN IF NOT EXISTS editorial_craft text;
ALTER TABLE public.villages ADD COLUMN IF NOT EXISTS tour_suggestion text;
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS highlights jsonb;
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS group_note text;
