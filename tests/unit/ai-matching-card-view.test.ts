/**
 * UI v3 screen 22 (mockup 22-GhepTourAI): the recommendation card reuses the card of screen 02.
 * Only what the matching API returns is shown; the AI logic is unchanged (human decision 15/11:
 * suggest single experiences, never combine them into an itinerary).
 */
import { describe, expect, it } from 'vitest'
import { recommendationCardView } from '@/app/ai-matching/card-view'

const rec = { experience_id: 'e1', provider_id: 'p1', experience_name: 'Nặn gốm thủ công', provider_name: 'Xưởng Bát Tràng', village_name: 'Bát Tràng',
  rank: 1, match_score: 91, price_per_person: 150000, max_participants: 12, explanation: 'Rẻ nhất, mỗi em có một sản phẩm gốm' }

describe('recommendationCardView', () => {
  it('maps API fields to the card of screen 02', () => {
    expect(recommendationCardView(rec)).toEqual({
      id: 'e1', href: '/explore/experiences/e1', scheduleHref: '/explore/experiences/e1#lich', providerHref: '/explore/providers/p1',
      name: 'Nặn gốm thủ công', where: 'Bát Tràng', providerName: 'Xưởng Bát Tràng',
      tags: ['Tối đa 12 khách/ca'], why: 'Rẻ nhất, mỗi em có một sản phẩm gốm', pricePerPerson: '150.000 ₫', score: 91,
    })
  })

  it('shows no capacity tag or price when the API gives none (no invented data)', () => {
    const view = recommendationCardView({ ...rec, max_participants: undefined, price_per_person: undefined })
    expect(view.tags).toEqual([])
    expect(view.pricePerPerson).toBeNull()
  })

  it('encodes ids in links', () => {
    expect(recommendationCardView({ ...rec, experience_id: 'a b' }).href).toBe('/explore/experiences/a%20b')
  })
})
