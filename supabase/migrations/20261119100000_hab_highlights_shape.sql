-- Highlights may hold the UI v3 shape (human decision 2026-11-19). experiences.highlights and villages.highlights:
-- NULL, or an array of 1–4 items, each a non-empty string or an object whose "title" is a non-empty string and whose
-- "sub", when present, is a string. Replaces experience_editorial_highlights_chk (20261117120000, strings only) and
-- village_highlights_shape_chk (20261118120000, any items). village_editorial_profile_chk and
-- experience_editorial_group_note_chk are unchanged.
-- Items are counted rather than negated, so an item the path cannot evaluate counts as invalid. The type guard uses
-- .type(), which lax mode does not unwrap, so a nested array item is refused. Checked on DEV (read only, 19/11) against
-- 18 sample values and the existing rows: 0 experiences and 0 villages fail.
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.experiences DROP CONSTRAINT IF EXISTS experience_editorial_highlights_chk;
ALTER TABLE public.experiences ADD CONSTRAINT experience_editorial_highlights_chk CHECK (
    highlights IS NULL OR CASE
        WHEN jsonb_typeof(highlights) <> 'array' THEN false
        ELSE jsonb_array_length(highlights) BETWEEN 1 AND 4
            AND NOT jsonb_path_exists(highlights, '$[*].type() ? (@ != "string" && @ != "object")')
            AND jsonb_array_length(highlights) = jsonb_array_length(jsonb_path_query_array(highlights,
                '$[*] ? ((@.type() == "string" && @ != "") || (@.type() == "object" && @.title.type() == "string" && @.title != "" && (!exists(@.sub) || @.sub.type() == "string")))'))
    END
);

ALTER TABLE public.villages DROP CONSTRAINT IF EXISTS village_highlights_shape_chk;
ALTER TABLE public.villages ADD CONSTRAINT village_highlights_shape_chk CHECK (
    highlights IS NULL OR CASE
        WHEN jsonb_typeof(highlights) <> 'array' THEN false
        ELSE jsonb_array_length(highlights) BETWEEN 1 AND 4
            AND NOT jsonb_path_exists(highlights, '$[*].type() ? (@ != "string" && @ != "object")')
            AND jsonb_array_length(highlights) = jsonb_array_length(jsonb_path_query_array(highlights,
                '$[*] ? ((@.type() == "string" && @ != "") || (@.type() == "object" && @.title.type() == "string" && @.title != "" && (!exists(@.sub) || @.sub.type() == "string")))'))
    END
);
