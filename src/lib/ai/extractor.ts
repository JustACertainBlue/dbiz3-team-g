import type { TourContext, TourPreferenceProfile } from '@/lib/matching/types'
import { ConversationalAiService, type ConversationalAiResult } from './llm-service'
import type { QuotaStatus } from './quota-manager'

export interface MessageInput {
  sender?: string
  text: string
  sent_at?: string
}

export interface ExtractionOptions {
  simulateFailure?: boolean
  now?: () => Date
}

export interface ExtractionResult {
  is_complete: boolean
  processing_status: 'Success' | 'Temporary AI Failure'
  retry_available: boolean
  follow_up_questions: string[]
  tour_context: TourContext
  conversational_reply?: string
  intent?: 'tour_matching' | 'platform_guidance' | 'mixed'
  quota_status?: QuotaStatus
  usedLlm?: boolean
}

export async function extractTourContext(
  input: MessageInput[] | { sessionId?: string; messages: MessageInput[] },
  options?: ExtractionOptions
): Promise<ExtractionResult> {
  if (options?.simulateFailure) {
    return {
      is_complete: false,
      processing_status: 'Temporary AI Failure',
      retry_available: true,
      follow_up_questions: [],
      tour_context: {},
    }
  }

  const messages: MessageInput[] = Array.isArray(input) ? input : input.messages || []

  // Run through Conversational AI service (with Cloudflare Workers AI + Quota Protection)
  const result: ConversationalAiResult = await ConversationalAiService.processConversation(
    messages,
    options
  )

  return {
    is_complete: result.is_complete,
    processing_status: 'Success',
    retry_available: false,
    follow_up_questions: result.follow_up_questions,
    tour_context: result.tour_context,
    conversational_reply: result.conversational_reply,
    intent: result.intent,
    quota_status: result.quota_status,
    usedLlm: result.usedLlm,
  }
}

export async function buildTourPreferenceProfile(
  tourContext: TourContext
): Promise<TourPreferenceProfile> {
  const hardConstraints = {
    group_size: tourContext.group_size,
    max_budget_per_person: tourContext.budget?.max_per_person,
    target_date_or_range: tourContext.target_date_or_range,
    origin: tourContext.origin_or_route,
  }

  const matchingAttributes = (tourContext.experience_types || []).map(type => ({
    type: 'experience_type',
    value: type,
  }))

  if (tourContext.craft_preference) {
    matchingAttributes.push({
      type: 'craft_preference',
      value: tourContext.craft_preference,
    })
  }

  return {
    hard_constraints: hardConstraints,
    matching_attributes: matchingAttributes,
    inferred_preferences: ['Authentic Craft', 'Cultural Immersion'],
    preference_weights: {
      experience_fit: 0.4,
      route_convenience: 0.25,
      agency_preferences: 0.2,
      provider_quality: 0.15,
    },
  }
}
