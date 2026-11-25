import { detectCraftPreference } from '@/lib/matching/craft-taxonomy'

// Small helpers shared by llm-service and conversation-state. They live here so the two modules
// no longer import each other.

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Resolves the craft preference for one turn. The model may answer with a free phrase ("dệt lụa")
 * instead of a canonical taxonomy key, so map it through the taxonomy first; otherwise the raw phrase
 * leaks into the match reason. Falls back to the newest user message that names a craft.
 */
export function resolveCraftPreference(
  extractedCraft: unknown,
  userMessages: Array<{ text?: string }>
): string | undefined {
  const raw = extractedCraft ? String(extractedCraft) : ''
  const canonical = raw ? detectCraftPreference(raw) : undefined
  if (canonical) return canonical
  for (const m of [...userMessages].reverse()) {
    const found = detectCraftPreference(m.text || '')
    if (found) return found
  }
  return raw || undefined
}

/**
 * True when an origin returned by the model is actually present in what the user wrote. Prevents the
 * assistant from treating a village it suggested itself as the group's starting point.
 */
export function isOriginGroundedInUserText(origin: string, userText: string): boolean {
  const needle = normalize(origin)
  if (!needle) return false
  return normalize(userText).includes(needle)
}

// "đoàn khách từ Ý" says where the guests come from, not where the tour starts. These are countries
// and nationalities, written in Vietnamese and in English, without diacritics.
const COUNTRIES = new Set([
  'y', 'italia', 'italy', 'phap', 'france', 'duc', 'germany', 'nhat', 'nhat ban', 'japan',
  'han', 'han quoc', 'korea', 'south korea', 'my', 'hoa ky', 'usa', 'united states', 'anh',
  'vuong quoc anh', 'uk', 'united kingdom', 'england', 'uc', 'australia', 'trung quoc', 'china',
  'an do', 'india', 'thai lan', 'thailand', 'tay ban nha', 'spain', 'canada', 'nga', 'russia',
  'singapore', 'malaysia', 'indonesia', 'philippines', 'dai loan', 'taiwan', 'ha lan', 'netherlands',
  'bi', 'belgium', 'thuy si', 'switzerland', 'thuy dien', 'sweden', 'dan mach', 'denmark', 'na uy',
  'norway', 'bo dao nha', 'portugal', 'ao', 'austria', 'new zealand', 'brazil', 'mexico', 'lao',
  'campuchia', 'cambodia', 'myanmar',
])

/** True when the text names a country or nationality rather than a place in Hanoi. */
export function isNationalityOrigin(origin: string): boolean {
  const key = normalize(origin).replace(/^(?:nuoc|quoc gia)\s+/, '')
  return COUNTRIES.has(key)
}

/** An origin is usable only if the user wrote it and it is a place, not a country or nationality. */
export function isUsableOrigin(origin: string, userText: string): boolean {
  return isOriginGroundedInUserText(origin, userText) && !isNationalityOrigin(origin)
}
