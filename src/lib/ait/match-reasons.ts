interface MatchReason {
  key: string
  text: string
}

interface MatchResultCard {
  experience_id: string
  experience_name: string
  price_per_person: number | null
  rank: number
  reasons?: MatchReason[]
  tags?: string[]
}

function normalizeText(value: string): string {
  return value.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
}

function requestedSoftCriteria(text: string): string[] {
  const normalized = normalizeText(text)
  return ['nhẹ nhàng', 'hạng sang'].filter(criterion =>
    normalized.includes(normalizeText(criterion))
  )
}

export function matchingContextResults(
  cards: MatchResultCard[],
  criteriaText: string
): {
  last_matching_results: Omit<MatchResultCard, 'reasons' | 'tags'>[]
  match_reasons: { experience_id: string; reasons: MatchReason[] }[]
} {
  const softCriteria = requestedSoftCriteria(criteriaText)
  return {
    last_matching_results: cards.map(({ experience_id, experience_name, price_per_person, rank }) => ({
      experience_id,
      experience_name,
      price_per_person,
      rank,
    })),
    match_reasons: cards.map(card => ({
      experience_id: card.experience_id,
      reasons: [
        ...(card.reasons ?? []),
        ...softCriteria.map(criterion => {
          const matchingTag = card.tags?.find(tag =>
            normalizeText(tag).includes(normalizeText(criterion))
          )
          return {
            key: 'soft_criterion',
            text: matchingTag
              ? `Tiêu chí ${criterion}: có thuộc tính ${matchingTag}.`
              : `Tiêu chí ${criterion}: chưa có dữ liệu thuộc tính để xác nhận.`,
          }
        }),
      ],
    })),
  }
}

export function isMatchExplanationRequest(text: string): boolean {
  return /(?:tại sao|vì sao|lý do|giải thích|why|explain).*(?:đề xuất|gợi ý|chọn|tốt nhất|giá|recommend|suggest|best|price)|(?:đề xuất|gợi ý|giá).*(?:tại sao|vì sao|why)/i
    .test(text)
}

function formatPrice(price: number | null): string {
  if (price == null || !Number.isFinite(price)) return 'chưa có dữ liệu giá'
  return `${price.toLocaleString('vi-VN')}đ/người`
}

export function explainStoredMatch(
  text: string,
  context: Record<string, unknown>,
  knownExperienceNames: string[]
): string {
  const results = Array.isArray(context.last_matching_results)
    ? context.last_matching_results as Omit<MatchResultCard, 'reasons' | 'tags'>[]
    : []
  const reasonRecords = Array.isArray(context.match_reasons)
    ? context.match_reasons as { experience_id: string; reasons: MatchReason[] }[]
    : []
  const normalizedText = normalizeText(text)
  let selected = results.find(result => normalizedText.includes(normalizeText(result.experience_name)))

  const targetMatch = text.match(/(?:giá|hoạt động|trải nghiệm|tour)\s+(?:của\s+)?(.+?)[?!.]*$/i)
  const explicitTarget = targetMatch?.[1]?.trim().replace(/[?!.]+$/, '')
  if (!selected && explicitTarget) {
    const normalizedTarget = normalizeText(explicitTarget)
    const knownName = knownExperienceNames.find(name =>
      normalizedTarget.includes(normalizeText(name))
      || normalizeText(name).includes(normalizedTarget)
    )
    if (!knownName) {
      return `Mình chưa có dữ liệu về “${explicitTarget.slice(0, 100)}” trong hệ thống nên chưa thể giải thích giá.`
    }
    selected = results.find(result =>
      normalizeText(result.experience_name) === normalizeText(knownName)
    )
    if (!selected) {
      return `Mình chưa có kết quả ghép tour gần nhất cho “${knownName}” để giải thích giá.`
    }
  }

  if (!selected) {
    selected = results.find(result => result.rank === 1) ?? results[0]
  }
  if (!selected) return 'Chưa có kết quả ghép tour gần nhất để giải thích.'

  const reasons = reasonRecords.find(reason => reason.experience_id === selected!.experience_id)?.reasons ?? []
  const reasonText = reasons.length > 0
    ? reasons.map(reason => reason.text).join(' ')
    : 'Chưa có dữ liệu thuộc tính khớp để giải thích kết quả này.'
  return `“${selected.experience_name}” đang xếp hạng ${selected.rank} trong kết quả gần nhất. ${reasonText} Giá ghi nhận là ${formatPrice(selected.price_per_person)}.`
}
