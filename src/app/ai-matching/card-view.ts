// Pure view model of one recommendation card (mockup 22). Only API fields are used; nothing is invented.
import type { RecommendationView } from './matching-view'
import type { PriceView } from '@/lib/explore/v3-search'

const vnd = (value: number) => `${value.toLocaleString('vi-VN')} ₫`

export function recommendationCardView(rec: Partial<RecommendationView> & Pick<RecommendationView, 'experience_id' | 'provider_id'>) {
  const href = `/explore/experiences/${encodeURIComponent(rec.experience_id)}`
  return {
    id: rec.experience_id,
    href,
    scheduleHref: `${href}#lich`,
    providerHref: `/explore/providers/${encodeURIComponent(rec.provider_id)}`,
    name: rec.experience_name ?? '',
    where: rec.village_name ?? '',
    providerName: rec.provider_name ?? '',
    tags: typeof rec.max_participants === 'number' ? [`Tối đa ${rec.max_participants} khách/ca`] : [],
    why: rec.explanation ?? '',
    pricePerPerson: typeof rec.price_per_person === 'number' ? vnd(rec.price_per_person) : null,
    score: rec.match_score ?? null,
  }
}

/** Per-guest price shown under the group total (mockup 22): total ÷ guests after the discount; null when there is no group price. */
export function perGuest(price: PriceView): number | null {
  return price.kind === 'group' && price.guests > 0 ? Math.round(price.total / price.guests) : null
}

/** Reasons shown on the card: drops the capacity and budget sentences, which the card already shows as facts and price. */
export function conciseExplanation(explanation: string): string {
  const sentences = explanation.trim().split(/(?<=\.)\s+(?=\p{Lu})/u)
  const distinctReasons = sentences.filter(sentence =>
    !/^(Sức chứa tối đa|\d[\d.,]*đ\/người, trong ngân sách)/i.test(sentence.trim())
  )
  return (distinctReasons.length > 0 ? distinctReasons : sentences.slice(0, 1)).join(' ').trim()
}
