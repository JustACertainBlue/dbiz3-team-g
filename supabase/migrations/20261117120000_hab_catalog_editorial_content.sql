-- Editorial fields for village profiles and itinerary planning.
-- Nullable fields keep existing rows usable while editorial content is prepared.
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.villages
    ADD COLUMN description text,
    ADD COLUMN editorial_craft text,
    ADD COLUMN tour_suggestion text,
    ADD CONSTRAINT village_editorial_profile_chk CHECK (
        (description IS NULL AND editorial_craft IS NULL AND tour_suggestion IS NULL)
        OR (
            description IS NOT NULL AND btrim(description) <> '' AND
            editorial_craft IS NOT NULL AND btrim(editorial_craft) <> '' AND
            tour_suggestion IS NOT NULL AND btrim(tour_suggestion) <> ''
        )
    );

ALTER TABLE public.experiences
    ADD COLUMN highlights jsonb,
    ADD COLUMN group_note text,
    ADD CONSTRAINT experience_editorial_highlights_chk CHECK (
        highlights IS NULL OR CASE
            WHEN jsonb_typeof(highlights) <> 'array' THEN false
            ELSE jsonb_array_length(highlights) > 0
                AND NOT jsonb_path_exists(highlights, '$[*] ? (@.type() != "string" || @ == "")')
        END
    ),
    ADD CONSTRAINT experience_editorial_group_note_chk CHECK (
        group_note IS NULL OR btrim(group_note) <> ''
    );
