function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
}

const MISSING_PRIMARY_REQUESTS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'ăn trưa', pattern: /\b(?:an\s+trua|bua\s+trua|lunch)\b/ },
  { label: 'ăn sáng', pattern: /\b(?:an\s+sang|bua\s+sang|breakfast)\b/ },
  { label: 'ăn tối', pattern: /\b(?:an\s+toi|bua\s+toi|dinner)\b/ },
  { label: 'nhà hàng', pattern: /\b(?:nha\s+hang|restaurant)\b/ },
  { label: 'chỗ ăn', pattern: /\b(?:cho\s+an|places?\s+to\s+eat)\b/ },
]

function canonicalMissingPrimary(value: string): string | undefined {
  const normalized = normalizeText(value)
  return MISSING_PRIMARY_REQUESTS.find(({ label, pattern }) =>
    pattern.test(normalized) || normalized === normalizeText(label)
  )?.label
}

export function fallbackMissingPrimary(userText: string): string[] {
  const normalized = normalizeText(userText)
  const requested = MISSING_PRIMARY_REQUESTS
    .filter(({ pattern }) => pattern.test(normalized))
    .map(({ label }) => label)
  return requested.includes('ăn trưa')
    ? requested.filter(label => label !== 'chỗ ăn')
    : requested
}

export function normalizeMissingPrimary(values: unknown, userText: string): string[] {
  if (!Array.isArray(values)) return []
  const explicitlyRequested = new Set(fallbackMissingPrimary(userText))
  const normalizedRequest = normalizeText(userText)
  const validated: string[] = []
  for (const rawValue of values) {
    if (typeof rawValue !== 'string') continue
    const value = rawValue.replace(/[\r\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
    if (!value || /^(?:null|chưa có dữ liệu|no data)$/i.test(value)) continue
    const canonical = canonicalMissingPrimary(value)
    if (canonical) {
      if (explicitlyRequested.has(canonical) && !validated.includes(canonical)) {
        validated.push(canonical)
      }
      continue
    }

    const normalizedValue = normalizeText(value)
    if (
      normalizedValue.length > 1
      && normalizedRequest.includes(normalizedValue)
      && !validated.includes(value)
    ) {
      validated.push(value)
    }
  }
  return validated
}

export function stripMissingDataClaims(text: string): string {
  return text
    .split(/(?<=[.!?。！？])\s+|\n+/u)
    .filter(sentence => !/(?:chưa|không)\s+có\s+dữ\s+liệu|no\s+data|not\s+available|cannot\s+find/i.test(sentence))
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
