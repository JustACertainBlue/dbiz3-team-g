import { describe, expect, it } from 'vitest'
import cases from '../fixtures/ai_matching_testcases.json'
import { buildSystemPrompt } from '@/lib/ai/prompt-templates'
import {
  fallbackMissingPrimary,
  normalizeMissingPrimary,
} from '@/lib/ai/missing-primary'
import { buildResultsMessage } from '@/lib/ait/messages'
import { buildVillageAttributePromptBlock } from '@/lib/matching/village-coordinate-lookup'

interface MissingDataCase {
  input: string
  expected_missing_primary?: string[]
  expected_not_in_reply?: string[]
  expected_location_source?: 'district_fallback'
  expected_reply?: string
  missing_attribute?: string
}

describe('primary missing data reporting', () => {
  const [unrequestedMeal, explicitLunch, districtRadius, missingAttribute] = cases as MissingDataCase[]

  it('does not mention missing meal services for a craft-only request', () => {
    const missingPrimary = fallbackMissingPrimary(unrequestedMeal.input)
    const message = buildResultsMessage({
      count: 1,
      craft: 'dệt lụa',
      matches: [{ experience_name: 'Dệt lụa truyền thống', price_per_person: 175000 }],
      missingPrimary,
    })

    expect(missingPrimary).toEqual(unrequestedMeal.expected_missing_primary)
    for (const phrase of unrequestedMeal.expected_not_in_reply ?? []) {
      expect(message).not.toContain(phrase)
    }
    expect(message).toContain('Dệt lụa truyền thống')
  })

  it('reports only the explicitly requested missing lunch service', () => {
    const missingPrimary = normalizeMissingPrimary(
      ['ăn trưa', 'nhà hàng', 'bữa tối'],
      explicitLunch.input,
    )
    const message = buildResultsMessage({
      count: 1,
      craft: 'dệt lụa',
      matches: [{ experience_name: 'Dệt lụa truyền thống', price_per_person: 175000 }],
      missingPrimary,
    })

    expect(missingPrimary).toEqual(explicitLunch.expected_missing_primary)
    expect(message.match(/chưa có dữ liệu về ăn trưa/gi)).toHaveLength(1)
    for (const phrase of explicitLunch.expected_not_in_reply ?? []) {
      expect(message).not.toContain(phrase)
    }
    expect(message).not.toContain('nằm ngoài phạm vi')
  })

  it('treats "chỗ ăn trưa" as one specific missing request', () => {
    expect(fallbackMissingPrimary('Tìm làng lụa và gợi ý chỗ ăn trưa'))
      .toEqual(['ăn trưa'])
  })

  it('keeps an uncertain district fallback and labels its radius status', () => {
    const message = buildResultsMessage({
      count: 1,
      radiusKm: 10,
      matches: [{
        experience_name: 'Workshop theo tâm huyện',
        price_per_person: 100000,
        distance_km: 15,
        distance_source: 'haversine',
        location_source: districtRadius.expected_location_source,
        radius_status: 'unconfirmed',
      }],
    })

    expect(message).toContain(districtRadius.expected_reply)
  })

  it('keeps unavailable secondary attributes out of the model prompt block', () => {
    const attributeBlock = buildVillageAttributePromptBlock({
      food_service: { value: null, source: 'not_collected', verified_status: 'unverified' },
    })
    const prompt = buildSystemPrompt(undefined, {
      villageAttributes: {
        food_service: { value: null, source: 'not_collected', verified_status: 'unverified' },
      },
    })

    expect(attributeBlock).not.toContain(missingAttribute.missing_attribute)
    expect(attributeBlock).not.toContain('null')
    expect(prompt).not.toContain('SCORING ATTRIBUTE DATA')
    expect(prompt).toContain('"missing_primary"')
  })
})
