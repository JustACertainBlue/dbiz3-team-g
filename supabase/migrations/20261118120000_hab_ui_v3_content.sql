-- UI v3 Đợt 1 content fields (human decision 2026-11-18, docs/build/ui-v3-spec-deviations.md). ADD only:
-- no existing column changes type, nothing is dropped. All new columns are nullable; empty values hide one row
-- in the UI. Values are filled later from a reviewed content draft, not by this migration.
--
-- experiences.highlights (jsonb, created on DEV outside the migration ledger; its own migration is on branch
-- db/add-db-only-columns) moves in content from ["text", ...] to [{"title": ..., "sub": ...}, ...] (4 items);
-- the UI reads both shapes, so no change is needed here.

-- Shared vocabulary for experiences.suitable_for (same list as src/lib/explore/vocabulary.ts SUITABLE_FOR).
ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS inclusions jsonb,
  ADD COLUMN IF NOT EXISTS guide_languages text[],
  ADD COLUMN IF NOT EXISTS child_policy text,
  ADD COLUMN IF NOT EXISTS suitable_for text[];

ALTER TABLE public.experiences
  ADD CONSTRAINT experience_inclusions_shape_chk CHECK (inclusions IS NULL OR jsonb_typeof(inclusions) = 'object'),
  ADD CONSTRAINT experience_suitable_for_vocab_chk CHECK (suitable_for IS NULL OR suitable_for <@ ARRAY[
    'Đoàn học sinh', 'Đoàn gia đình', 'Khách quốc tế', 'Team building', 'Tour nửa ngày', 'Tour văn hoá – di sản',
    'Không cần kinh nghiệm', 'Sản phẩm mang về', 'Chụp ảnh cùng nghệ nhân', 'Xem nghệ nhân làm việc'
  ]::text[]);

-- "providers": public, non-versioned workshop facts on provider_profiles (not part of the verified version).
ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS founded_year integer,
  ADD COLUMN IF NOT EXISTS parking_note text;
ALTER TABLE public.provider_profiles
  ADD CONSTRAINT provider_founded_year_chk CHECK (founded_year IS NULL OR founded_year BETWEEN 1000 AND 2100);

ALTER TABLE public.villages
  ADD COLUMN IF NOT EXISTS distance_km numeric(6,1),
  ADD COLUMN IF NOT EXISTS visit_notes jsonb,
  ADD COLUMN IF NOT EXISTS tour_suggestion_detail jsonb,
  -- "Điểm nổi bật của làng" (human decision 2026-11-19): [{"title": ..., "sub": ...}], at most 4 items. The UI
  -- always computes the counter card "N trải nghiệm ở M xưởng" itself and shows it second.
  ADD COLUMN IF NOT EXISTS highlights jsonb;
ALTER TABLE public.villages
  ADD CONSTRAINT village_distance_chk CHECK (distance_km IS NULL OR distance_km >= 0),
  ADD CONSTRAINT village_visit_notes_shape_chk CHECK (visit_notes IS NULL OR jsonb_typeof(visit_notes) = 'object'),
  ADD CONSTRAINT village_tour_detail_shape_chk CHECK (tour_suggestion_detail IS NULL OR jsonb_typeof(tour_suggestion_detail) = 'object'),
  ADD CONSTRAINT village_highlights_shape_chk CHECK (highlights IS NULL OR (jsonb_typeof(highlights) = 'array' AND jsonb_array_length(highlights) <= 4));

-- Village cover image (image import plan, human decision 2026-11-18). Nullable; pages fall back to workshop and
-- experience images when it is empty.
ALTER TABLE public.villages
  ADD COLUMN IF NOT EXISTS cover_image_id uuid REFERENCES public.stored_files(file_id) ON DELETE RESTRICT;

-- Provenance of imported images (human decision 2026-11-18). Read by the server only; never shown in the UI.
CREATE TABLE IF NOT EXISTS public.image_sources (
    file_id uuid PRIMARY KEY REFERENCES public.stored_files(file_id) ON DELETE CASCADE,
    source_type varchar(20) NOT NULL,
    page_url text,
    license_url text,
    nguoi_chup varchar(255),
    ngay_chup date,
    co_nguoi_ro_mat boolean NOT NULL DEFAULT false,
    da_xin_phep boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT image_source_type_chk CHECK (source_type IN ('unsplash', 'pexels', 'pixabay', 'commons_cc0', 'flickr_pd', 'tu_chup')),
    CONSTRAINT image_source_page_chk CHECK (source_type = 'tu_chup' OR page_url IS NOT NULL),
    CONSTRAINT image_source_own_photo_chk CHECK (source_type <> 'tu_chup' OR (nguoi_chup IS NOT NULL AND ngay_chup IS NOT NULL)),
    CONSTRAINT image_source_consent_chk CHECK (NOT co_nguoi_ro_mat OR da_xin_phep)
);
ALTER TABLE public.image_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.image_sources FROM PUBLIC, anon, authenticated, hab_app;
GRANT SELECT ON public.image_sources TO hab_app;
CREATE POLICY hab_backend_select ON public.image_sources FOR SELECT TO hab_app USING (true);

-- Village cover image (image import plan, human decision 2026-11-18). Nullable; pages fall back to workshop and
-- experience images when it is empty.
ALTER TABLE public.villages
  ADD COLUMN IF NOT EXISTS cover_image_id uuid REFERENCES public.stored_files(file_id) ON DELETE RESTRICT;

-- Provenance of imported images (human decision 2026-11-18). Read by the server only; never shown in the UI.
CREATE TABLE IF NOT EXISTS public.image_sources (
    file_id uuid PRIMARY KEY REFERENCES public.stored_files(file_id) ON DELETE CASCADE,
    source_type varchar(20) NOT NULL,
    page_url text,
    license_url text,
    nguoi_chup varchar(255),
    ngay_chup date,
    co_nguoi_ro_mat boolean NOT NULL DEFAULT false,
    da_xin_phep boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT image_source_type_chk CHECK (source_type IN ('unsplash', 'pexels', 'pixabay', 'commons_cc0', 'flickr_pd', 'tu_chup')),
    CONSTRAINT image_source_page_chk CHECK (source_type = 'tu_chup' OR page_url IS NOT NULL),
    CONSTRAINT image_source_own_photo_chk CHECK (source_type <> 'tu_chup' OR (nguoi_chup IS NOT NULL AND ngay_chup IS NOT NULL)),
    CONSTRAINT image_source_consent_chk CHECK (NOT co_nguoi_ro_mat OR da_xin_phep)
);
ALTER TABLE public.image_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.image_sources FROM PUBLIC, anon, authenticated, hab_app;
GRANT SELECT ON public.image_sources TO hab_app;
CREATE POLICY hab_backend_select ON public.image_sources FOR SELECT TO hab_app USING (true);

-- Fixed time slots per Experience ("Ca sáng 08:30 – 09:30"). weekdays: ISO 1 = Monday … 7 = Sunday.
CREATE TABLE IF NOT EXISTS public.experience_slots (
    slot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id uuid NOT NULL REFERENCES public.experiences(experience_id) ON DELETE CASCADE,
    label varchar(80) NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL,
    weekdays smallint[] NOT NULL,
    CONSTRAINT experience_slot_time_chk CHECK (end_time > start_time),
    CONSTRAINT experience_slot_weekdays_chk CHECK (cardinality(weekdays) > 0 AND weekdays <@ ARRAY[1,2,3,4,5,6,7]::smallint[])
);
CREATE INDEX IF NOT EXISTS experience_slots_experience_idx ON public.experience_slots(experience_id);

ALTER TABLE public.experience_slots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.experience_slots FROM PUBLIC, anon, authenticated, hab_app;
GRANT SELECT ON public.experience_slots TO hab_app;
CREATE POLICY hab_backend_select ON public.experience_slots FOR SELECT TO hab_app USING (true);
