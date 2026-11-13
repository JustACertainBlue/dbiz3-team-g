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
}

// Order matters only when one message names several crafts: the first entry wins.
const CRAFTS: CraftEntry[] = [
  { preference: 'silk', label: 'silk weaving', craftType: 'Silk/Textile', keywords: ['silk', 'lụa', 'textile', 'vạn phúc', 'van phuc', 'nha xá'] },
  { preference: 'embroidery', label: 'embroidery', craftType: 'Silk/Textile', keywords: ['embroidery', 'thêu', 'quất động', 'quat dong'] },
  { preference: 'pottery', label: 'pottery', craftType: 'Ceramics', keywords: ['pottery', 'ceramic', 'gốm', 'bát tràng', 'bat trang', 'kim lan'] },
  { preference: 'woodcarving', label: 'woodcarving', craftType: 'Woodcarving', keywords: ['woodcarving', 'carving', 'wood', 'gỗ', 'tạc', 'mộc', 'chàng sơn', 'chang son', 'sơn đồng', 'son dong'] },
  { preference: 'food', label: 'food and cooking', craftType: 'Food/Culinary', keywords: ['culinary', 'cooking', 'food', 'ẩm thực', 'cự đà', 'cu da'] },
  { preference: 'metalwork', label: 'metalwork', craftType: 'Metalwork', keywords: ['metal', 'bronze', 'đúc đồng', 'đồ đồng', 'đúc', 'định công', 'dinh cong', 'ngũ xã'] },
  { preference: 'painting', label: 'lacquer and painting', craftType: 'Paper/Painting', keywords: ['lacquer', 'painting', 'paper', 'sơn mài', 'tranh', 'hạ thái', 'ha thai', 'điệp'] },
  { preference: 'conical hat', label: 'conical hat making', craftType: 'Other', keywords: ['conical hat', 'nón', 'chuông', 'chuong'] },
  { preference: 'bamboo', label: 'bamboo and rattan weaving', craftType: 'Other', keywords: ['bamboo', 'rattan', 'mây', 'tre', 'phú vinh', 'phu vinh'] },
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

export function detectCraftPreference(text: string): string | undefined {
  return CRAFTS.find(entry => entry.keywords.some(keyword => hasWord(text, keyword)))?.preference
}

export function craftTypeForPreference(preference: string): CraftType | undefined {
  return CRAFTS.find(entry => entry.preference === preference.toLowerCase())?.craftType
}

export function craftLabel(preference: string): string {
  return CRAFTS.find(entry => entry.preference === preference.toLowerCase())?.label ?? preference
}

export function detectExperienceTypes(text: string): string[] {
  return EXPERIENCE_TYPES.filter(entry => entry.keywords.some(keyword => hasWord(text, keyword))).map(entry => entry.category)
}
