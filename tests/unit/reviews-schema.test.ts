import { describe, it, expect } from 'vitest'
import {
  ProviderRatingSchema,
  ProviderReviewSchema,
  ReviewSentimentAnalysisSchema,
  QualityScoreWeightsSchema,
  calculateBayesianRating,
  calculateProviderQualityScore,
} from '@/lib/reviews/types'

describe('Reviews & Ratings Schema & Scoring Test', () => {
  it('validates a correct ProviderRating', () => {
    const valid = {
      provider_id: '11111111-1111-1111-1111-111111111111',
      source_platform: 'Google Maps',
      rating_value: 4.8,
      rating_scale: 5.0,
      total_reviews: 120,
      source_url: 'https://maps.google.com/?cid=123',
      crawled_at: new Date().toISOString(),
      is_latest: true,
    }
    const result = ProviderRatingSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects an invalid source platform including Facebook', () => {
    const invalidFb = {
      provider_id: '11111111-1111-1111-1111-111111111111',
      source_platform: 'Facebook',
      rating_value: 4.8,
      crawled_at: new Date().toISOString(),
    }
    expect(ProviderRatingSchema.safeParse(invalidFb).success).toBe(false)

    const invalid = {
      provider_id: '11111111-1111-1111-1111-111111111111',
      source_platform: 'UntrustedBlog',
      rating_value: 4.8,
      crawled_at: new Date().toISOString(),
    }
    const result = ProviderRatingSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('validates a ProviderReview with cleaned content', () => {
    const review = {
      provider_id: '11111111-1111-1111-1111-111111111111',
      source_platform: 'TripAdvisor',
      external_review_id: 'ta-rev-98721',
      rating_value: 5.0,
      rating_scale: 5.0,
      author_display_name: 'Minh T.',
      original_language: 'vi',
      cleaned_content: 'Không gian lò gốm rất thoáng, nghệ nhân hướng dẫn tỉ mỉ.',
      published_at: '2026-10-15T10:00:00Z',
      crawled_at: new Date().toISOString(),
    }
    const result = ProviderReviewSchema.safeParse(review)
    expect(result.success).toBe(true)
  })

  it('validates AI Review Sentiment Analysis with aspect tags', () => {
    const analysis = {
      review_id: '22222222-2222-2222-2222-222222222222',
      sentiment: 'Positive',
      sentiment_score: 0.85,
      sentiment_tags: ['artisan_guidance', 'workshop_space', 'hands_on_quality'],
      aspect_sentiments: {
        artisan_guidance: 'Positive',
        workshop_space: 'Positive',
      },
      confidence_score: 0.95,
      ai_model_version: 'gemini-1.5-pro',
    }
    const result = ReviewSentimentAnalysisSchema.safeParse(analysis)
    expect(result.success).toBe(true)
  })

  it('calculates Bayesian Rating accurately', () => {
    // 0 reviews should return the prior mean (75.0)
    expect(calculateBayesianRating(5.0, 5.0, 0)).toBe(75.0)

    // With 10 reviews (equal to minReviewsThreshold), bayesian is halfway between prior (75) and 100
    // (10 * 75 + 100 * 10) / 20 = 1750 / 20 = 87.5
    expect(calculateBayesianRating(5.0, 5.0, 10)).toBe(87.5)

    // With 100 reviews of 5.0, bayesian pulls heavily toward 100
    // (10 * 75 + 100 * 100) / 110 = 10750 / 110 = 97.73
    expect(calculateBayesianRating(5.0, 5.0, 100)).toBe(97.73)
  })

  it('calculates Provider Quality Score using reference weights (50/20/20/10)', () => {
    const score = calculateProviderQualityScore({
      bayesianRating: 90, // 50% -> 45
      volumeScore: 80,    // 20% -> 16
      sentimentScore: 85, // 20% -> 17
      recencyScore: 70,   // 10% -> 7
    })
    // 45 + 16 + 17 + 7 = 85.0
    expect(score).toBe(85.0)
  })

  it('validates quality score weight configuration sum = 1.0', () => {
    expect(
      QualityScoreWeightsSchema.safeParse({
        rating: 0.5,
        volume: 0.2,
        sentiment: 0.2,
        recency: 0.1,
      }).success
    ).toBe(true)

    expect(
      QualityScoreWeightsSchema.safeParse({
        rating: 0.5,
        volume: 0.3, // sum = 1.1
        sentiment: 0.2,
        recency: 0.1,
      }).success
    ).toBe(false)
  })
})

