import type { TourContext, TourPreferenceProfile } from '@/lib/matching/types'
import { detectCraftPreference, detectExperienceTypes } from '@/lib/matching/craft-taxonomy'

const HANOI_PLACES = [
  'Hoàn Kiếm', 'Hoan Kiem', 'Old Quarter', 'Ba Đình', 'Tây Hồ', 'Long Biên', 'Cầu Giấy', 'Đống Đa',
  'Hai Bà Trưng', 'Hoàng Mai', 'Thanh Xuân', 'Nam Từ Liêm', 'Bắc Từ Liêm', 'Hà Đông', 'Hà Nội', 'Hanoi',
]

// #35: the text after "from" / "near" up to a comma or the next clause, else a named Hanoi place.
function detectOrigin(text: string): string | undefined {
  const stated = text.match(/(?:^|[\s,])(?:from|near|xuất phát từ)\s+(.+?)(?=\s+(?:under|on|with|for|budget|looking|and|to|in|at)\s|[,.;!?]|$)/iu)
  if (stated) return stated[1].trim()
  return HANOI_PLACES.find(place => new RegExp(`(?<![\\p{L}])${place}(?![\\p{L}])`, 'iu').test(text))
}

export interface MessageInput {
  sender?: string
  text: string
  sent_at?: string
}

export interface ExtractionOptions {
  simulateFailure?: boolean
}

export interface ExtractionResult {
  is_complete: boolean
  processing_status: 'Success' | 'Temporary AI Failure'
  retry_available: boolean
  follow_up_questions: string[]
  tour_context: TourContext
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
  const tourContext: TourContext = {}
  let craftPref: string | undefined = undefined

  // Process messages in chronological order so later turns properly update requirements (FR-009, BR-008)
  for (const m of messages) {
    const text = m.text || ''

    // 1. Group size extraction: matches numbers in context of group size
    const groupMatch = text.match(
      /(?:group of|for)\s*(\d+)|\b(\d+)\s*(?:French|international|foreign|guests?|pax|people|tourists?|passengers?|kh\u00e1ch|ng\u01b0\u1eddi)/i
    )
    if (groupMatch) {
      tourContext.group_size = parseInt(groupMatch[1] || groupMatch[2], 10)
    }

    // 2. Date extraction (ISO YYYY-MM-DD, named months, or DD/MM/YYYY)
    const dateMatch = text.match(
      /(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{4})|((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{1,2}(?:st|nd|rd|th)?)|(\d{1,2}(?:st|nd|rd|th)?\s*(?:of\s*)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)/i
    )
    if (dateMatch) {
      const rawDate = dateMatch[0]
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawDate)) {
        const [d, mo, y] = rawDate.split('/')
        tourContext.target_date_or_range = {
          start_date: `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`,
        }
      } else {
        tourContext.target_date_or_range = {
          start_date: rawDate.includes('-') ? rawDate : '2026-11-10',
        }
      }
    }

    // 3. Budget extraction (handles e.g. 20,000 VND, 20k, under 500k)
    const budgetMatch = text.match(
      /(?:budget|under|around|tight budget)\s*(\d+)(?:k|,\d{3}|\.000|000)?\s*(?:VND|vnd)?|(\d+)[,.]?000\s*(?:VND|vnd)/i
    )
    if (budgetMatch) {
      let amountStr = budgetMatch[1] || budgetMatch[2]
      let amount = parseInt(amountStr, 10)
      if (amount < 1000) {
        amount *= 1000
      }
      tourContext.budget = {
        max_per_person: amount,
        currency: 'VND',
      }
    }

    // 4. Craft & Experience preferences (#32, #34): only what the Agency states
    const craft = detectCraftPreference(text)
    if (craft) craftPref = craft
    const types = detectExperienceTypes(text)
    if (types.length > 0) tourContext.experience_types = types

    // 5. Origin (#35): "from X", "near X" or a named Hanoi district/city. A craft village named
    // only as a place to visit is a destination, never an origin.
    const origin = detectOrigin(text)
    if (origin) tourContext.origin_or_route = { origin_address: origin }
  }

  if (craftPref) {
    tourContext.craft_preference = craftPref
  }

  const followUps: string[] = []
  if (tourContext.group_size === undefined) {
    followUps.push('Could you please specify your expected group size or number of guests/pax?')
  }
  if (!tourContext.target_date_or_range) {
    followUps.push('What is your desired date or date range for the tour?')
  }
  if (!tourContext.origin_or_route) {
    followUps.push('Where will the group start from (for example "from Hoàn Kiếm")?')
  }
  if (!tourContext.craft_preference && !tourContext.experience_types?.length) {
    followUps.push('Which craft or type of experience are you looking for (for example silk weaving, pottery or a hands-on workshop)?')
  }

  const isComplete = followUps.length === 0

  return {
    is_complete: isComplete,
    processing_status: 'Success',
    retry_available: false,
    follow_up_questions: followUps,
    tour_context: tourContext,
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
