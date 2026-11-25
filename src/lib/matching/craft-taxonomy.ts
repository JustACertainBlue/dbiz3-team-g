// Craft and Experience-type vocabulary for AI Tour Matching (spec AIT §10 #32, #34).
// craft_type and category values are the enums of data/04-data-model.md. "đồng" alone is the currency (#37).

export type CraftType =
  | 'Ceramics'
  | 'Silk/Textile'
  | 'Woodcarving'
  | 'Food/Culinary'
  | 'Metalwork'
  | 'Paper/Painting'
  | 'Other'

interface CraftEntry {
  preference: string
  label: string
  craftType: CraftType
  keywords: string[]
  tagKeywords?: string[]
}

// Order matters only when one message names several crafts: the first entry wins.
const CRAFTS: CraftEntry[] = [
  { preference: 'silk', label: 'silk weaving', craftType: 'Silk/Textile', keywords: ['silk', 'lụa', 'lua', 'textile', 'vạn phúc', 'van phuc', 'nha xá', 'nha xa'] },
  { preference: 'embroidery', label: 'embroidery', craftType: 'Silk/Textile', keywords: ['embroidery', 'thêu', 'theu', 'quất động', 'quat dong'] },
  { preference: 'pottery', label: 'pottery', craftType: 'Ceramics', keywords: ['pottery', 'ceramic', 'gốm', 'gom', 'gom su', 'bát tràng', 'bat trang', 'kim lan'] },
  { preference: 'woodcarving', label: 'woodcarving', craftType: 'Woodcarving', keywords: ['woodcarving', 'carving', 'wood', 'gỗ', 'go', 'tạc', 'tac', 'mộc', 'moc', 'chạm khắc', 'cham khac', 'chàng sơn', 'chang son', 'sơn đồng', 'son dong'] },
  { preference: 'food', label: 'food and cooking', craftType: 'Food/Culinary', keywords: ['culinary', 'cooking', 'food', 'ẩm thực', 'am thuc', 'cự đà', 'cu da'] },
  { preference: 'metalwork', label: 'metalwork', craftType: 'Metalwork', keywords: ['metal', 'bronze', 'đúc đồng', 'duc dong', 'đồ đồng', 'do dong', 'đúc', 'duc', 'định công', 'dinh cong', 'ngũ xã', 'ngu xa'] },
  { preference: 'painting', label: 'lacquer and painting', craftType: 'Paper/Painting', keywords: ['lacquer', 'painting', 'paper', 'sơn mài', 'son mai', 'tranh', 'hạ thái', 'ha thai', 'điệp', 'diep'] },
  { preference: 'conical hat', label: 'conical hat making', craftType: 'Other', keywords: ['conical hat', 'nón', 'non', 'chuông', 'chuong'], tagKeywords: ['conical hat', 'nón', 'non'] },
  { preference: 'bamboo', label: 'bamboo and rattan weaving', craftType: 'Other', keywords: ['bamboo', 'rattan', 'mây', 'may', 'tre', 'phú vinh', 'phu vinh'], tagKeywords: ['bamboo', 'rattan', 'mây', 'may', 'tre'] },
]

const EXPERIENCE_TYPES: { category: string; keywords: string[] }[] = [
  { category: 'Workshop/Hands-on', keywords: ['workshop', 'hands-on'] },
  { category: 'Cultural Show', keywords: ['show', 'performance', 'puppet'] },
  { category: 'Sightseeing', keywords: ['sightseeing'] },
  { category: 'Culinary/Tasting', keywords: ['tasting', 'culinary'] },
  { category: 'Combo', keywords: ['combo'] },
]

// Whole-word match that also works for Vietnamese letters (\b is ASCII-only).
function hasWord(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu').test(text)
}

export function detectAllCraftPreferences(text: string): string[] {
  if (!text) return []
  const matches: { preference: string; index: number }[] = []
  for (const entry of CRAFTS) {
    let earliestIndex = -1
    for (const keyword of entry.keywords) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const rx = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'giu')
      const m = rx.exec(text)
      if (m && (earliestIndex === -1 || m.index < earliestIndex)) {
        earliestIndex = m.index
      }
    }
    if (earliestIndex !== -1) {
      matches.push({ preference: entry.preference, index: earliestIndex })
    }
  }
  matches.sort((a, b) => a.index - b.index)
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of matches) {
    if (!seen.has(item.preference)) {
      seen.add(item.preference)
      result.push(item.preference)
    }
  }
  return result
}

export function detectCraftPreference(text: string): string | undefined {
  const all = detectAllCraftPreferences(text)
  return all.length > 0 ? all[0] : undefined
}

export function craftTypeForPreference(preference: string): CraftType | undefined {
  return CRAFTS.find(entry => entry.preference === preference.toLowerCase())?.craftType
}

export function matchesCraftPreference(
  preference: string,
  candidate: { craft_type?: string | null; tags?: string[] | null }
): boolean {
  const normalizedPreference = preference.toLowerCase()
  const expectedType = craftTypeForPreference(normalizedPreference)
  if (!expectedType || candidate.craft_type !== expectedType) return false
  if (expectedType !== 'Other') return true

  const tags = Array.isArray(candidate.tags) ? candidate.tags : []
  const informativePreferences = CRAFTS.filter(entry =>
    entry.craftType === 'Other'
    && entry.tagKeywords?.some(keyword => tags.some(tag => hasWord(tag, keyword)))
  )

  // §10 #32 treats Other as a shared fallback only when tags cannot identify its craft.
  return informativePreferences.length === 0
    || informativePreferences.some(entry => entry.preference === normalizedPreference)
}

export function craftLabel(preference: string): string {
  return CRAFTS.find(entry => entry.preference === preference.toLowerCase())?.label ?? preference
}

export function detectExperienceTypes(text: string): string[] {
  return EXPERIENCE_TYPES.filter(entry => entry.keywords.some(keyword => hasWord(text, keyword))).map(entry => entry.category)
}
