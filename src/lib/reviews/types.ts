import { z } from 'zod'

/**
 * Platform sources for crawled ratings and reviews
 */
export const REVIEW_SOURCE_PLATFORMS = [
  'Google Maps',
  'TripAdvisor',
  'Klook',
  'Traveloka',
  'Agoda',
  'Booking.com',
  'Other',
] as const

export type ReviewSourcePlatform = (typeof REVIEW_SOURCE_PLATFORMS)[number]

/**
 * Sentiment classifications
 */
export const SENTIMENT_TYPES = ['Positive', 'Neutral', 'Negative'] as const
export type SentimentType = (typeof SENTIMENT_TYPES)[number]

/**
 * Extensible sentiment aspect tags for AI Tour Matching
 */
export const EXTENSIBLE_SENTIMENT_TAGS = [
  'artisan_guidance',
  'hands_on_quality',
  'workshop_space',
  'product_quality',
  'family_friendly',
  'waiting_time',
  'service_quality',
  'scenic_view',
  'cultural_depth',
  'accessibility',
] as const

export type SentimentAspectTag = (typeof EXTENSIBLE_SENTIMENT_TAGS)[number] | string

/**
 * Zod Schemas for Crawled Rating
 */
export const ProviderRatingSchema = z.object({
  rating_id: z.string().uuid().optional(),
  provider_id: z.string().uuid(),
  source_platform: z.enum(REVIEW_SOURCE_PLATFORMS),
  rating_value: z.number().min(0),
  rating_scale: z.number().default(5.0),
  normalized_score_100: z.number().min(0).max(100).optional(),
  total_reviews: z.number().int().nonnegative().default(0),
  source_url: z.string().url().optional().nullable(),
  crawled_at: z.string().datetime(),
  is_latest: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
})

export type ProviderRating = z.infer<typeof ProviderRatingSchema>

/**
 * Zod Schemas for Crawled Customer Review
 */
export const ProviderReviewSchema = z.object({
  review_id: z.string().uuid().optional(),
  provider_id: z.string().uuid(),
  source_platform: z.enum(REVIEW_SOURCE_PLATFORMS),
  external_review_id: z.string().max(255).optional().nullable(),
  rating_value: z.number().min(0).optional().nullable(),
  rating_scale: z.number().default(5.0).optional().nullable(),
  author_display_name: z.string().max(120).optional().nullable(),
  original_language: z.string().max(10).default('vi'),
  cleaned_content: z.string().min(1),
  published_at: z.string().datetime().optional().nullable(),
  crawled_at: z.string().datetime(),
  review_url: z.string().url().optional().nullable(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

export type ProviderReview = z.infer<typeof ProviderReviewSchema>

/**
 * Zod Schemas for AI Review Sentiment Analysis
 */
export const ReviewSentimentAnalysisSchema = z.object({
  analysis_id: z.string().uuid().optional(),
  review_id: z.string().uuid(),
  sentiment: z.enum(SENTIMENT_TYPES),
  sentiment_score: z.number().min(-1.0).max(1.0),
  sentiment_tags: z.array(z.string()).default([]),
  aspect_sentiments: z.record(z.enum(SENTIMENT_TYPES)).optional().default({}),
  confidence_score: z.number().min(0.0).max(1.0).default(1.0),
  ai_model_version: z.string().max(80),
  analyzed_at: z.string().datetime().optional(),
})

export type ReviewSentimentAnalysis = z.infer<typeof ReviewSentimentAnalysisSchema>

/**
 * Configurable Quality Score Weights
 */
export const QualityScoreWeightsSchema = z.object({
  rating: z.number().min(0).max(1).default(0.50),
  volume: z.number().min(0).max(1).default(0.20),
  sentiment: z.number().min(0).max(1).default(0.20),
  recency: z.number().min(0).max(1).default(0.10),
}).refine(
  w => Math.abs(w.rating + w.volume + w.sentiment + w.recency - 1.0) < 0.001,
  { message: 'Sum of quality score weights must equal 1.0 (100%)' }
)

export type QualityScoreWeights = z.infer<typeof QualityScoreWeightsSchema>

/**
 * Provider Quality Score
 */
export const ProviderQualityScoreSchema = z.object({
  score_id: z.string().uuid().optional(),
  provider_id: z.string().uuid(),
  bayesian_rating: z.number().min(0).max(100),
  raw_average_rating: z.number().min(0).max(5.0),
  total_reviews_count: z.number().int().nonnegative(),
  volume_score: z.number().min(0).max(100),
  sentiment_score: z.number().min(0).max(100),
  recency_score: z.number().min(0).max(100),
  final_quality_score: z.number().min(0).max(100),
  weight_configuration: QualityScoreWeightsSchema,
  calculated_at: z.string().datetime().optional(),
  is_current: z.boolean().default(true),
})

export type ProviderQualityScore = z.infer<typeof ProviderQualityScoreSchema>

/**
 * Computes the Bayesian Adjusted Rating on a 0-100 scale:
 * formula: (C * m + R * v) / (C + v)
 * where:
 *   C = confidence parameter (e.g. 10 minimum reviews)
 *   m = global prior mean (e.g. 75/100, equivalent to 3.75/5.0)
 *   R = provider average normalized rating (0-100)
 *   v = provider total reviews count
 */
export function calculateBayesianRating(
  rawRating: number,
  scale: number,
  reviewCount: number,
  minReviewsThreshold: number = 10,
  globalPriorMean: number = 75.0
): number {
  if (reviewCount <= 0 || scale <= 0) return globalPriorMean
  const normalizedR = Math.min(100, Math.max(0, (rawRating / scale) * 100))
  const C = minReviewsThreshold
  const v = reviewCount
  const bayesian = (C * globalPriorMean + normalizedR * v) / (C + v)
  return Math.round(bayesian * 100) / 100
}

/**
 * Computes Provider Quality Score from the 4 sub-metrics:
 * Quality = W_rating * BayesianRating + W_vol * VolumeScore + W_sent * SentimentScore + W_rec * RecencyScore
 */
export function calculateProviderQualityScore(metrics: {
  bayesianRating: number
  volumeScore: number
  sentimentScore: number
  recencyScore: number
  weights?: QualityScoreWeights
}): number {
  const w = metrics.weights || {
    rating: 0.50,
    volume: 0.20,
    sentiment: 0.20,
    recency: 0.10,
  }

  const score =
    w.rating * metrics.bayesianRating +
    w.volume * metrics.volumeScore +
    w.sentiment * metrics.sentimentScore +
    w.recency * metrics.recencyScore

  return Math.round(Math.min(100, Math.max(0, score)) * 100) / 100
}

