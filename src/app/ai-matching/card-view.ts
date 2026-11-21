// Pure view model of one recommendation card (mockup 22). Only API fields are used; nothing is invented.
import type { RecommendationView } from './matching-view'

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
