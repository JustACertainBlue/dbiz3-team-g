-- Step 2A image delivery (human request 2026-11-20): the media route reads the facts of one file by file_id
-- (src/lib/prf/media-access.ts). These lookups had no index (file_id is not the leading key of the primary keys).
-- Indexes only: no table, column, constraint or data change.
CREATE INDEX IF NOT EXISTS profile_media_file_idx ON public.profile_media (file_id);
CREATE INDEX IF NOT EXISTS provider_version_media_file_idx ON public.provider_version_media (file_id);
CREATE INDEX IF NOT EXISTS provider_version_documents_file_idx ON public.provider_version_documents (file_id);
CREATE INDEX IF NOT EXISTS villages_cover_image_idx ON public.villages (cover_image_id) WHERE cover_image_id IS NOT NULL;
