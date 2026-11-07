-- A4 / BR-007: uniqueness belongs to currently published versions, not superseded history.
-- A revision of the same Provider must retain its registration number after publication.
SET LOCAL lock_timeout = '5s';
DROP INDEX public.provider_registration_number_uq;
CREATE UNIQUE INDEX provider_registration_number_uq
    ON public.provider_profile_versions (business_registration_number)
    WHERE version_status = 'Verified';
COMMENT ON INDEX public.provider_registration_number_uq IS
    'Registration numbers are unique among currently Verified publications; Superseded versions retain historical values.';
