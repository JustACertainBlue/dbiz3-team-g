import type { TourContext, TourPreferenceProfile } from '@/lib/matching/types'

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

    // 4. Craft & Experience preferences
    if (/silk|lụa/i.test(text)) {
      craftPref = 'silk'
    } else if (/pottery|ceramic|gốm/i.test(text)) {
      craftPref = 'pottery'
    } else if (/conical hat|nón lá/i.test(text)) {
      craftPref = 'conical hat'
    } else if (/embroider|thêu/i.test(text)) {
      craftPref = 'embroidery'
    } else if (/bamboo|mây tre/i.test(text)) {
      craftPref = 'bamboo'
    }

    // 5. Origin / Route
    if (/Bat Trang|Bát Tràng/i.test(text)) {
      tourContext.origin_or_route = { origin_address: 'Hanoi Center', destination_address: 'Bat Trang' }
    } else if (/Van Phuc|Vạn Phúc/i.test(text)) {
      tourContext.origin_or_route = { origin_address: 'Hanoi Center', destination_address: 'Van Phuc' }
    } else if (/Chuong|Chuông/i.test(text)) {
      tourContext.origin_or_route = { origin_address: 'Hanoi Center', destination_address: 'Chuong' }
    } else if (/Hoàn Kiếm|Old Quarter|Hanoi/i.test(text) && !tourContext.origin_or_route) {
      tourContext.origin_or_route = { origin_address: 'Old Quarter, Hanoi' }
    }
  }

  if (!tourContext.origin_or_route) {
    tourContext.origin_or_route = { origin_address: 'Old Quarter, Hanoi' }
  }

  if (craftPref) {
    tourContext.craft_preference = craftPref
  }
  tourContext.experience_types = ['Workshop/Hands-on']

  const followUps: string[] = []
  if (tourContext.group_size === undefined) {
    followUps.push('Could you please specify your expected group size or number of guests/pax?')
  }
  if (!tourContext.target_date_or_range) {
    followUps.push('What is your desired date or date range for the tour?')
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

  const matchingAttributes = (tourContext.experience_types || ['Workshop/Hands-on']).map(type => ({
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
