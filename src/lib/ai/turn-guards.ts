import { hanoiDate } from '@/lib/booking/clock'
import { craftLabel } from '@/lib/matching/craft-taxonomy'
import type { AitConversationState } from '@/lib/ait/conversation-state'

// Small, deterministic checks applied to one conversation turn after the model has answered.

const EXPLICIT_DATE = /\b(?:(\d{4})-(\d{2})-(\d{2})|(\d{1,2})\/(\d{1,2})\/(\d{4}))\b/

/**
 * When the Agency wrote a complete date (with a year) that is already behind us, say so plainly.
 * Without a year the date means its next occurrence, so it can never be in the past.
 */
export function pastDateNotice(text: string, now: Date): string | undefined {
  const m = text.match(EXPLICIT_DATE)
  if (!m) return undefined
  const [year, month, day] = m[1] ? [m[1], m[2], m[3]] : [m[6], m[5], m[4]]
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  if (Number.isNaN(Date.parse(iso)) || iso >= hanoiDate(now.getTime())) return undefined
  return `Ngày ${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year} đã qua. Bạn vui lòng chọn một ngày từ hôm nay trở đi.`
}

const VI_LABELS: Record<string, string> = {
  silk: 'dệt lụa',
  embroidery: 'thêu tay',
  pottery: 'làm gốm',
  woodcarving: 'chạm khắc gỗ',
  food: 'ẩm thực làng nghề',
  metalwork: 'đúc đồng',
  painting: 'sơn mài và tranh',
  'conical hat': 'làm nón lá',
  bamboo: 'mây tre đan',
}

/** Vietnamese craft name for the reply. Fixing it here means no English key is ever translated later. */
export function craftLabelVi(craft: string): string {
  return VI_LABELS[craft.toLowerCase()] ?? craftLabel(craft)
}

/** One suggestion target per craft the Agency named. Crafts are never merged into one itinerary. */
export function craftSuggestionTargets(state: Pick<AitConversationState, 'craft' | 'crafts'>): string[] {
  const crafts = state.crafts?.length ? state.crafts : state.craft ? [state.craft] : []
  return [...new Set(crafts)]
}
