-- Migration: 20261112224000_hab_provider_reviews_and_ratings.sql
-- Purpose: Add multi-source Provider Ratings, Customer Reviews, AI Sentiment Analysis, and Provider Quality Scores
-- Supports external web crawling pipeline (Google AI Studio) and AI Tour Matching scoring

-- 1. Provider Ratings table: stores multi-source aggregated ratings crawled over time
CREATE TABLE IF NOT EXISTS public.provider_ratings (
    rating_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL REFERENCES public.provider_profiles(provider_id) ON DELETE RESTRICT,
    source_platform varchar(80) NOT NULL,
    rating_value numeric(3,2) NOT NULL,
    rating_scale numeric(3,1) NOT NULL DEFAULT 5.0,
    normalized_score_100 numeric(5,2) GENERATED ALWAYS AS (ROUND((rating_value / rating_scale) * 100, 2)) STORED,
    total_reviews integer NOT NULL DEFAULT 0,
    source_url text,
    crawled_at timestamptz NOT NULL,
    is_latest boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT rating_platform_chk CHECK (source_platform IN (
        'Google Maps', 'TripAdvisor', 'Klook', 'Traveloka', 'Agoda', 'Booking.com', 'Other'
    )),
    CONSTRAINT rating_scale_chk CHECK (rating_scale IN (5.0, 10.0)),
    CONSTRAINT rating_value_chk CHECK (rating_value >= 0 AND rating_value <= rating_scale),
    CONSTRAINT rating_total_reviews_chk CHECK (total_reviews >= 0),
    CONSTRAINT provider_ratings_snapshot_uq UNIQUE (provider_id, source_platform, crawled_at)
);

CREATE INDEX IF NOT EXISTS provider_ratings_provider_idx ON public.provider_ratings (provider_id);
-- Strict partial UNIQUE index: enforces at most ONE latest rating snapshot per provider and source platform
CREATE UNIQUE INDEX IF NOT EXISTS provider_ratings_one_latest_uq
    ON public.provider_ratings (provider_id, source_platform)
    WHERE is_latest = true;
CREATE INDEX IF NOT EXISTS provider_ratings_crawled_idx ON public.provider_ratings (provider_id, source_platform, crawled_at DESC);

-- 2. Customer Reviews table: stores individual public text reviews from external platforms
CREATE TABLE IF NOT EXISTS public.provider_reviews (
    review_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL REFERENCES public.provider_profiles(provider_id) ON DELETE RESTRICT,
    source_platform varchar(80) NOT NULL,
    external_review_id varchar(255),
    rating_value numeric(3,2),
    rating_scale numeric(3,1) DEFAULT 5.0,
    author_display_name varchar(120),
    original_language varchar(10) NOT NULL DEFAULT 'vi',
    cleaned_content text NOT NULL,
    published_at timestamptz,
    crawled_at timestamptz NOT NULL,
    review_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT review_platform_chk CHECK (source_platform IN (
        'Google Maps', 'TripAdvisor', 'Klook', 'Traveloka', 'Agoda', 'Booking.com', 'Other'
    )),
    CONSTRAINT review_rating_chk CHECK (rating_value IS NULL OR (rating_value >= 0 AND rating_value <= COALESCE(rating_scale, 5.0))),
    CONSTRAINT review_content_chk CHECK (length(trim(cleaned_content)) > 0)
);

-- Deduplication index when external_review_id is provided by the platform
CREATE UNIQUE INDEX IF NOT EXISTS provider_reviews_dedup_idx
    ON public.provider_reviews (provider_id, source_platform, external_review_id)
    WHERE external_review_id IS NOT NULL;

-- Deduplication index when external_review_id is NULL, using content hash and published date
CREATE UNIQUE INDEX IF NOT EXISTS provider_reviews_null_id_dedup_uq
    ON public.provider_reviews (provider_id, source_platform, md5(cleaned_content), published_at)
    WHERE external_review_id IS NULL AND published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS provider_reviews_provider_published_idx
    ON public.provider_reviews (provider_id, published_at DESC);

CREATE INDEX IF NOT EXISTS provider_reviews_crawled_idx
    ON public.provider_reviews (crawled_at DESC);

-- 3. Review Sentiment Analysis: stores AI sentiment extraction results separated from immutable reviews
CREATE TABLE IF NOT EXISTS public.review_sentiment_analyses (
    analysis_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id uuid NOT NULL UNIQUE REFERENCES public.provider_reviews(review_id) ON DELETE CASCADE,
    sentiment varchar(16) NOT NULL,
    sentiment_score numeric(4,3) NOT NULL,
    sentiment_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
    aspect_sentiments jsonb DEFAULT '{}'::jsonb,
    confidence_score numeric(4,3) NOT NULL DEFAULT 1.000,
    ai_model_version varchar(80) NOT NULL,
    analyzed_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT sentiment_type_chk CHECK (sentiment IN ('Positive', 'Neutral', 'Negative')),
    CONSTRAINT sentiment_score_chk CHECK (sentiment_score BETWEEN -1.000 AND 1.000),
    CONSTRAINT sentiment_confidence_chk CHECK (confidence_score BETWEEN 0.000 AND 1.000),
    CONSTRAINT sentiment_tags_array_chk CHECK (jsonb_typeof(sentiment_tags) = 'array')
);

CREATE INDEX IF NOT EXISTS review_sentiment_tags_gin_idx
    ON public.review_sentiment_analyses USING gin (sentiment_tags);

-- 4. Provider Quality Scores: stores computed quality score metrics for AI matching
CREATE TABLE IF NOT EXISTS public.provider_quality_scores (
    score_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL REFERENCES public.provider_profiles(provider_id) ON DELETE RESTRICT,
    bayesian_rating numeric(5,2) NOT NULL,
    raw_average_rating numeric(3,2) NOT NULL,
    total_reviews_count integer NOT NULL DEFAULT 0,
    volume_score numeric(5,2) NOT NULL,
    sentiment_score numeric(5,2) NOT NULL,
    recency_score numeric(5,2) NOT NULL,
    final_quality_score numeric(5,2) NOT NULL,
    weight_configuration jsonb NOT NULL DEFAULT '{"rating": 0.50, "volume": 0.20, "sentiment": 0.20, "recency": 0.10}'::jsonb,
    calculated_at timestamptz NOT NULL DEFAULT now(),
    is_current boolean NOT NULL DEFAULT true,
    CONSTRAINT quality_bayesian_chk CHECK (bayesian_rating BETWEEN 0 AND 100),
    CONSTRAINT quality_volume_chk CHECK (volume_score BETWEEN 0 AND 100),
    CONSTRAINT quality_sentiment_chk CHECK (sentiment_score BETWEEN 0 AND 100),
    CONSTRAINT quality_recency_chk CHECK (recency_score BETWEEN 0 AND 100),
    CONSTRAINT quality_final_chk CHECK (final_quality_score BETWEEN 0 AND 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_quality_scores_current_uq
    ON public.provider_quality_scores (provider_id)
    WHERE is_current = true;

-- 5. Views for quick AI Matching & Explore access
CREATE OR REPLACE VIEW public.v_provider_latest_ratings AS
SELECT
    p.provider_id,
    p.village_id,
    r.rating_id,
    r.source_platform,
    r.rating_value,
    r.rating_scale,
    r.normalized_score_100,
    r.total_reviews,
    r.source_url,
    r.crawled_at
FROM public.provider_profiles p
JOIN public.provider_ratings r ON r.provider_id = p.provider_id
WHERE r.is_latest = true;

CREATE OR REPLACE VIEW public.v_provider_quality_summary AS
SELECT
    p.provider_id,
    p.village_id,
    qs.bayesian_rating,
    qs.raw_average_rating,
    qs.total_reviews_count,
    qs.volume_score,
    qs.sentiment_score,
    qs.recency_score,
    qs.final_quality_score,
    qs.weight_configuration,
    qs.calculated_at
FROM public.provider_profiles p
LEFT JOIN public.provider_quality_scores qs ON qs.provider_id = p.provider_id AND qs.is_current = true;

-- 6. Permissions and RLS for hab_app server role and future CSV/JSON import
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_ratings TO hab_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_reviews TO hab_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_sentiment_analyses TO hab_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_quality_scores TO hab_app;
GRANT SELECT ON public.v_provider_latest_ratings TO hab_app;
GRANT SELECT ON public.v_provider_quality_summary TO hab_app;

ALTER TABLE public.provider_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_sentiment_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_quality_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hab_server_read ON public.provider_ratings;
CREATE POLICY hab_server_read ON public.provider_ratings FOR SELECT TO hab_app USING (true);
DROP POLICY IF EXISTS hab_server_write ON public.provider_ratings;
CREATE POLICY hab_server_write ON public.provider_ratings FOR ALL TO hab_app USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS hab_server_read ON public.provider_reviews;
CREATE POLICY hab_server_read ON public.provider_reviews FOR SELECT TO hab_app USING (true);
DROP POLICY IF EXISTS hab_server_write ON public.provider_reviews;
CREATE POLICY hab_server_write ON public.provider_reviews FOR ALL TO hab_app USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS hab_server_read ON public.review_sentiment_analyses;
CREATE POLICY hab_server_read ON public.review_sentiment_analyses FOR SELECT TO hab_app USING (true);
DROP POLICY IF EXISTS hab_server_write ON public.review_sentiment_analyses;
CREATE POLICY hab_server_write ON public.review_sentiment_analyses FOR ALL TO hab_app USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS hab_server_read ON public.provider_quality_scores;
CREATE POLICY hab_server_read ON public.provider_quality_scores FOR SELECT TO hab_app USING (true);
DROP POLICY IF EXISTS hab_server_write ON public.provider_quality_scores;
CREATE POLICY hab_server_write ON public.provider_quality_scores FOR ALL TO hab_app USING (true) WITH CHECK (true);
