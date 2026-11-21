// Vietnamese display labels for the craft type and activity category enums (spec-PRF FR-004 craft_type,
// FR-005 category). Stored values, URLs and API fields keep the canonical English enum; only the text people
// read changes (consistency-contract: label variants never become enum values). Unknown values keep their text.
const CATEGORY: Record<string, string> = {
  'Workshop/Hands-on': 'Trải nghiệm thực hành', Sightseeing: 'Tham quan', 'Culinary/Tasting': 'Ẩm thực & thưởng thức',
  'Cultural Show': 'Biểu diễn văn hoá', Combo: 'Combo',
}

// Craft labels: one shared constant since UI v3 Đợt 1 (src/lib/explore/vocabulary.ts).
export { craftLabel } from './vocabulary'
export const categoryLabel = (value: string) => CATEGORY[value] ?? value
