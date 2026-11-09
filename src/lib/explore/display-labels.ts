// Vietnamese display labels for the craft type and activity category enums (spec-PRF FR-004 craft_type,
// FR-005 category). Stored values, URLs and API fields keep the canonical English enum; only the text people
// read changes (consistency-contract: label variants never become enum values). Unknown values keep their text.
const CRAFT: Record<string, string> = {
  Ceramics: 'Gốm', 'Silk/Textile': 'Lụa', Woodcarving: 'Chạm gỗ', 'Food/Culinary': 'Ẩm thực',
  Metalwork: 'Kim khí', 'Paper/Painting': 'Giấy & tranh', Other: 'Nghề khác',
}
const CATEGORY: Record<string, string> = {
  'Workshop/Hands-on': 'Trải nghiệm thực hành', Sightseeing: 'Tham quan', 'Culinary/Tasting': 'Ẩm thực & thưởng thức',
  'Cultural Show': 'Biểu diễn văn hoá', Combo: 'Combo',
}

export const craftLabel = (value: string) => CRAFT[value] ?? value
export const categoryLabel = (value: string) => CATEGORY[value] ?? value
