-- PRF FR-005 and the canonical ERD allow 0..many decisions for one submitted version.
-- Request More Information may also be reissued for an Agency version. Each decision already
-- has its own immutable review_id; a subject-level UNIQUE constraint incorrectly loses history.
ALTER TABLE public.agency_review_records DROP CONSTRAINT agency_review_reg_subject_uq;
ALTER TABLE public.provider_verification_reviews DROP CONSTRAINT provider_review_subject_uq;
CREATE INDEX agency_review_subject_history_idx
  ON public.agency_review_records(registration_request_id,registration_version_no,decided_at DESC);
CREATE INDEX provider_review_subject_history_idx
  ON public.provider_verification_reviews(provider_id,version_no,reviewed_at DESC);
