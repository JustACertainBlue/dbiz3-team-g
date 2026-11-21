// UI v3 Đợt 1 shared constants and tolerant readers for the content columns added by
// supabase/migrations/20261118120000_hab_ui_v3_content.sql (human decision 2026-11-18).
// Rows reach the app as strings (src/lib/db/repository.ts legacyRow: jsonb and text[] become JSON text) and the JSON
// fixtures may lack the columns, so every reader accepts '' / undefined and returns an empty value.
import type { DemoRow } from '../demo/types'

/** Vietnamese labels for the 7 craft_type values (spec-PRF FR-004). Stored values stay in English. */
export const CRAFT_LABELS: Record<string, string> = {
  Ceramics: 'Gốm sứ', 'Silk/Textile': 'Dệt lụa', Woodcarving: 'Chạm khắc gỗ', 'Food/Culinary': 'Ẩm thực',
  Metalwork: 'Kim khí', 'Paper/Painting': 'Giấy & tranh', Other: 'Nghề khác',
}
export const craftLabel = (value: string) => CRAFT_LABELS[value] ?? value

/** Craft label of cards, page heads and craft filters (human review 2026-11-19, second round): the village's
 *  editorial_craft, else the Vietnamese label of the workshop's craft_type. */
export function rowCraft(craftType: string | undefined, village: { editorial_craft?: string } | undefined): string {
  return village?.editorial_craft?.trim() || craftLabel(craftType ?? '')
}

/** Fixed vocabulary of experiences.suitable_for; same list as the migration CHECK constraint. */
export const SUITABLE_FOR = [
  'Đoàn học sinh', 'Đoàn gia đình', 'Khách quốc tế', 'Team building', 'Tour nửa ngày', 'Tour văn hoá – di sản',
  'Không cần kinh nghiệm', 'Sản phẩm mang về', 'Chụp ảnh cùng nghệ nhân', 'Xem nghệ nhân làm việc',
] as const

/**
 * Agency preference keys (agency_preference_profiles.preference_weights) that stand for a suitable_for term, for the
 * "Gợi ý vì" line on 21 (human decision 2026-11-18 #2). Only this row; price, category:* and provider:* keys are
 * not mapped, so they never produce a reason.
 */
export const PREFERENCE_TO_SUITABLE_FOR: Readonly<Record<string, (typeof SUITABLE_FOR)[number]>> = {
  culture: 'Tour văn hoá – di sản',
}

function json(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return null }
}
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

export interface Highlight { title: string; sub: string }
/** experiences.highlights: new [{title, sub}] or old ["text"]. */
export function parseHighlights(value: unknown): Highlight[] {
  const data = json(value)
  if (!Array.isArray(data)) return []
  return data.map(item => typeof item === 'string' ? { title: item.trim(), sub: '' }
    : item && typeof item === 'object' ? { title: text((item as Record<string, unknown>).title), sub: text((item as Record<string, unknown>).sub) } : { title: '', sub: '' })
    .filter(item => item.title)
}

export interface Inclusions {
  per_guest: string[]; included: string[]; take_home: boolean
  notes: { trong_buoi: string; chup_anh: string; an_toan: string; luu_y: string }
}
const strings = (value: unknown) => Array.isArray(value) ? value.map(text).filter(Boolean) : []
/** experiences.inclusions; null when the experience has none. */
export function parseInclusions(value: unknown): Inclusions | null {
  const data = json(value)
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const row = data as Record<string, unknown>
  const notes = (row.notes && typeof row.notes === 'object' ? row.notes : {}) as Record<string, unknown>
  return { per_guest: strings(row.per_guest), included: strings(row.included), take_home: row.take_home === true,
    notes: { trong_buoi: text(notes.trong_buoi), chup_anh: text(notes.chup_anh), an_toan: text(notes.an_toan), luu_y: text(notes.luu_y) } }
}

/** text[] columns (guide_languages, suitable_for). */
export function parseStringList(value: unknown): string[] {
  return strings(json(value))
}

export interface Slot { label: string; start: string; end: string; weekdays: number[] }
/** experience_slots rows of one experience, earliest first. */
export function parseSlots(rows: DemoRow[]): Slot[] {
  return rows.map(row => ({
    label: text(row.label), start: text(row.start_time).slice(0, 5), end: text(row.end_time).slice(0, 5),
    weekdays: (() => { const data = json(row.weekdays); return Array.isArray(data) ? data.map(Number).filter(Number.isInteger) : [] })(),
  })).filter(slot => slot.label && slot.start && slot.end).sort((a, b) => a.start.localeCompare(b.start))
}

export function parseDistance(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export interface VisitNotes { trang_phuc: string; san_pham: string; gio_den: string }
export function parseVisitNotes(value: unknown): VisitNotes | null {
  const data = json(value)
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const row = data as Record<string, unknown>
  return { trang_phuc: text(row.trang_phuc), san_pham: text(row.san_pham), gio_den: text(row.gio_den) }
}

export interface TourDetail { title: string; lines: string[]; extras: string[] }
export function parseTourDetail(value: unknown): TourDetail | null {
  const data = json(value)
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const row = data as Record<string, unknown>
  return { title: text(row.title), lines: strings(row.lines), extras: strings(row.extras) }
}
