// UI v3 Đợt 1, screen 02 /explore/search (human decision 2026-11-18 #1; deviation from spec-EXP Q8/Q11 recorded in
// docs/build/ui-v3-spec-deviations.md #2). Keyword without diacritics over experience name, craft label and village;
// guests → max_participants >= guests; date → lib/explore/availability.ts; filters, sort and pagination as mockup 02.
import type { CsvRow, ExploreSeed, Viewer } from './catalog'
import { eligibleRows } from './catalog'
import { calculateAvailability } from './availability'
import { durationLabel, experienceImage, placeLine } from './v3-home'
import type { ImageRef } from '../prf/media-urls'
import { craftLabel, parseDistance, parseHighlights, parseInclusions, rowCraft } from './vocabulary'

type Row = ReturnType<typeof eligibleRows>[number]
export const PAGE_SIZE = 7

/** Lower case without Vietnamese diacritics (unaccent): "Đào Thục" → "dao thuc". */
export function foldText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()
}

export const DURATION_OPTIONS = [
  { value: 'duoi-90', label: 'Dưới 90 phút', test: (m: number) => m < 90 },
  { value: '90-120', label: 'Từ 90 phút đến 2 giờ', test: (m: number) => m >= 90 && m <= 120 },
  { value: 'tren-120', label: 'Trên 2 giờ', test: (m: number) => m > 120 },
] as const
export const SORT_OPTIONS = [
  { value: '', label: 'Phù hợp nhất' }, { value: 'gia', label: 'Giá thấp đến cao' }, { value: 'thoi-luong', label: 'Thời lượng ngắn nhất' },
] as const

export interface SearchQuery {
  q: string; date: string; guests: number | null; crafts: string[]; villages: string[]; min: number | null; max: number | null
  durations: string[]; cap15: boolean; fit: boolean; freeOnly: boolean; sort: string; page: number
}

const list = (value: string | string[] | undefined) => (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean)
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? ''
const amount = (value: string) => { const n = Number(value.replace(/[^\d]/g, '')); return value && Number.isFinite(n) && n > 0 ? n : null }

export function parseSearch(params: Record<string, string | string[] | undefined>): SearchQuery {
  const guests = Number(one(params.guests))
  const date = one(params.date)
  const page = Number(one(params.page))
  return {
    q: one(params.q).slice(0, 120), date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    guests: Number.isInteger(guests) && guests > 0 && guests <= 500 ? guests : null,
    crafts: list(params.nghe), villages: list(params.lang), min: amount(one(params.tu)), max: amount(one(params.den)),
    durations: list(params.tg), cap15: one(params.suc) === '15', fit: one(params.vua) !== '0', freeOnly: one(params.trong) === '1',
    sort: SORT_OPTIONS.some(option => option.value === one(params.sx)) ? one(params.sx) : '',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

const HANOI = 'Asia/Ho_Chi_Minh'
const dayMonthOf = (isoDate: string) => `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`
const addDays = (isoDate: string, days: number) => new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
const hhmm = (local: string) => local.slice(11, 16)

export interface Availability { ok: boolean; text: string }
/** "Còn trống ngày 24/11 · 08:00–17:00" / "Ngày 24/11 đã có đoàn giữ chỗ. Thử ngày 25/11" (next free day within 14). */
export function availabilityOn(seed: ExploreSeed, providerId: string, date: string): Availability {
  const hours = seed.provider_operating_hours ?? [], bookings = seed.bookings ?? []
  const result = calculateAvailability(providerId, hours, bookings, { from: date, to: date })
  const slot = result.available_slots[0]
  if (slot) return { ok: true, text: `Còn trống ngày ${dayMonthOf(date)} · ${hhmm(slot.start_at)}–${hhmm(slot.end_at)}` }
  const reason = result.blocked_slots.some(block => block.status === 'On hold') ? 'đã có đoàn giữ chỗ'
    : result.operating_hours.some(row => row.weekday === ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7 + 1)) ? 'đã kín lịch' : 'xưởng nghỉ'
  const later = calculateAvailability(providerId, hours, bookings, { from: addDays(date, 1), to: addDays(date, 14) }).available_slots[0]
  return { ok: false, text: `Ngày ${dayMonthOf(date)} ${reason}.${later ? ` Thử ngày ${dayMonthOf(later.start_at.slice(0, 10))}` : ''}` }
}

export type PriceView =
  | { kind: 'group'; guests: number; total: number; old: number | null; note: string }
  | { kind: 'locked'; perPerson: number }
  | { kind: 'from'; perPerson: number }

/** Group price for the chosen guests with the best reached Group Discount; Guests only see "Giá từ" + lock. */
export function priceFor(seed: ExploreSeed, experience: CsvRow, guests: number | null, isAgency: boolean): PriceView {
  const perPerson = Number(experience.price_per_person)
  if (!guests) return { kind: 'from', perPerson }
  if (!isAgency) return { kind: 'locked', perPerson }
  const rules = (seed.experience_discount_rules ?? []).filter(rule => rule.experience_id === experience.experience_id && rule.rule_kind === 'Group Discount')
    .map(rule => ({ pax: Number(rule.pax_threshold), pct: Number(rule.discount_percentage) })).sort((a, b) => a.pax - b.pax)
  const full = perPerson * guests
  const reached = rules.filter(rule => guests >= rule.pax).sort((a, b) => b.pct - a.pct)[0]
  if (reached) return { kind: 'group', guests, total: Math.round(full * (100 - reached.pct) / 100), old: full, note: `Giảm ${reached.pct}% giá đoàn` }
  const next = rules.find(rule => guests < rule.pax)
  return { kind: 'group', guests, total: full, old: null, note: next ? `Đoàn từ ${next.pax} khách giảm ${next.pct}%` : '' }
}

export interface ResultView {
  id: string; name: string; image: ImageRef | null; villageId: string; villageLine: string; providerName: string
  distance: string; craft: string; tags: string[]; highlights: string[]; included: boolean
  availability: Availability | null; price: PriceView
}

export function resultView(seed: ExploreSeed, row: Row, query: Pick<SearchQuery, 'date' | 'guests'>, isAgency: boolean): ResultView {
  const { experience, version, village } = row
  const inclusions = parseInclusions(experience.inclusions)
  const km = parseDistance(village.distance_km)
  const notice = Number(experience.notice_period_hours)
  return {
    id: experience.experience_id, name: experience.name, image: experienceImage(seed, experience.experience_id),
    villageId: village.village_id, villageLine: [village.name, village.district].filter(Boolean).join(', '), providerName: version.business_name,
    distance: km === null ? '' : `Cách trung tâm Hà Nội khoảng ${km.toLocaleString('vi-VN')} km`,
    craft: rowCraft(version.craft_type, village),
    tags: [durationLabel(Number(experience.duration_minutes)), `Tối đa ${Number(experience.max_participants)} khách/ca`,
      ...(inclusions?.take_home ? ['Mang sản phẩm về'] : []), ...(Number.isFinite(notice) && experience.notice_period_hours !== '' ? [`Đặt trước ${notice} giờ`] : [])],
    highlights: parseHighlights(experience.highlights).slice(0, 3).map(item => item.title),
    included: Boolean(inclusions && inclusions.included.length),
    availability: query.date ? availabilityOn(seed, row.provider.provider_id, query.date) : null,
    price: priceFor(seed, experience, query.guests, isAgency),
  }
}

function matches(row: Row, folded: string): number {
  if (!folded) return 1
  const name = foldText(row.experience.name), craft = foldText(`${rowCraft(row.version.craft_type, row.village)} ${craftLabel(row.version.craft_type ?? '')}`), village = foldText(row.village.name)
  return name.includes(folded) ? 3 : craft.includes(folded) ? 2 : village.includes(folded) ? 1 : 0
}

export interface Facet { value: string; label: string; n: number }
export interface SearchResult {
  total: number; page: number; pageSize: number; items: ResultView[]
  facets: { crafts: Facet[]; durations: Facet[]; fit: number; cap15: number; free: number; villages: Facet[] }
}

export function searchExperiences(seed: ExploreSeed, query: SearchQuery, viewer: Viewer, _ranked = true): SearchResult {
  const isAgency = viewer.kind === 'agency'
  const folded = foldText(query.q)
  const base = eligibleRows(seed).map(row => ({ row, score: matches(row, folded) })).filter(item => item.score > 0)
  const free = new Map<string, boolean>()
  const isFree = (row: Row) => {
    if (!query.date) return true
    if (!free.has(row.provider.provider_id)) free.set(row.provider.provider_id, availabilityOn(seed, row.provider.provider_id, query.date).ok)
    return free.get(row.provider.provider_id)!
  }
  const minutes = (row: Row) => Number(row.experience.duration_minutes)
  const price = (row: Row) => Number(row.experience.price_per_person)
  const fits = (row: Row) => !query.guests || !query.fit || Number(row.experience.max_participants) >= query.guests
  const checks: Record<string, (row: Row) => boolean> = {
    craft: row => !query.crafts.length || query.crafts.includes(rowCraft(row.version.craft_type, row.village)),
    budget: row => (query.min === null || price(row) >= query.min) && (query.max === null || price(row) <= query.max),
    duration: row => !query.durations.length || DURATION_OPTIONS.some(option => query.durations.includes(option.value) && option.test(minutes(row))),
    fit: fits, cap15: row => !query.cap15 || Number(row.experience.max_participants) >= 15,
    free: row => !query.freeOnly || isFree(row),
    village: row => !query.villages.length || query.villages.includes(row.village.village_id),
  }
  const passes = (row: Row, except?: string) => Object.entries(checks).every(([name, check]) => name === except || check(row))
  const selected = base.filter(item => passes(item.row))
  const sorted = [...selected].sort((a, b) => query.sort === 'gia' ? price(a.row) - price(b.row) || a.row.experience.name.localeCompare(b.row.experience.name, 'vi')
    : query.sort === 'thoi-luong' ? minutes(a.row) - minutes(b.row) || a.row.experience.name.localeCompare(b.row.experience.name, 'vi')
    : b.score - a.score)
  const count = (except: string, test: (row: Row) => boolean) => base.filter(item => passes(item.row, except) && test(item.row)).length
  const crafts = [...new Set(base.map(item => rowCraft(item.row.version.craft_type, item.row.village)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'))
  const villages = [...new Map(base.map(item => [item.row.village.village_id, item.row.village])).values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  const page = Math.min(query.page, Math.max(1, Math.ceil(sorted.length / PAGE_SIZE)))
  return {
    total: sorted.length, page, pageSize: PAGE_SIZE,
    items: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(item => resultView(seed, item.row, query, isAgency)),
    facets: {
      crafts: crafts.map(value => ({ value, label: value, n: count('craft', row => rowCraft(row.version.craft_type, row.village) === value) })),
      durations: DURATION_OPTIONS.map(option => ({ value: option.value, label: option.label, n: count('duration', row => option.test(minutes(row))) })),
      fit: query.guests ? count('fit', row => Number(row.experience.max_participants) >= query.guests!) : 0,
      cap15: count('cap15', row => Number(row.experience.max_participants) >= 15),
      free: query.date ? count('free', isFree) : 0,
      villages: villages.map(village => ({ value: village.village_id, label: village.name, n: count('village', row => row.village.village_id === village.village_id) })),
    },
  }
}

/** Subtitle "Cho đoàn 10 khách, ngày Thứ Ba 24/11/2026". */
export function searchSubtitle(query: SearchQuery): string {
  const parts: string[] = []
  if (query.guests) parts.push(`đoàn ${query.guests} khách`)
  if (query.date) {
    const date = new Date(`${query.date}T05:00:00Z`)
    const weekday = new Intl.DateTimeFormat('vi-VN', { timeZone: HANOI, weekday: 'long' }).format(date)
    parts.push(`ngày ${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${query.date.slice(8, 10)}/${query.date.slice(5, 7)}/${query.date.slice(0, 4)}`)
  }
  return parts.length ? `Cho ${parts.join(', ')}` : ''
}

export { placeLine }

/** "Lọc (n)" on screen 02 below 900 px (human review 2026-11-19): each chosen craft, duration and village, plus budget,
 *  15+ capacity and free-only once each. The search itself (q, date, guests) and the sort are not filters. */
export function activeFilterCount(query: SearchQuery): number {
  return query.crafts.length + query.durations.length + query.villages.length
    + (query.min !== null || query.max !== null ? 1 : 0) + (query.cap15 ? 1 : 0) + (query.freeOnly ? 1 : 0)
}

/** "Xoá bộ lọc": keeps q, date, guests and the sort; drops every filter and the page. */
export function clearFiltersHref(params: Record<string, string | string[] | undefined>): string {
  const next = new URLSearchParams()
  for (const key of ['q', 'date', 'guests', 'sx']) {
    const value = params[key]
    const one = Array.isArray(value) ? value[0] : value
    if (one) next.set(key, one)
  }
  return next.size ? `/explore/search?${next.toString()}` : '/explore/search'
}
