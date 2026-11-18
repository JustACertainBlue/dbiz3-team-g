// UI v3 Đợt 1, /explore for Guest (mockup 01) and Tour Agency (mockup 21): view models for the cards, the quick
// filters, the village grid and the hold banner (human decisions 2026-11-18 #1, #4, #5, #7, #9).
import type { CsvRow, ExploreSeed } from './catalog'
import { eligibleRows } from './catalog'
import { PREFERENCE_TO_SUITABLE_FOR, craftLabel, parseHighlights, parseStringList } from './vocabulary'

type Row = ReturnType<typeof eligibleRows>[number]

/** Quick filter chips of 01/21 (they replace the activity-type chips). Unknown keys mean "Tất cả". */
export const QUICK_FILTERS = [
  { key: undefined, label: 'Tất cả' },
  { key: 'duoi-90', label: 'Dưới 90 phút' },
  { key: 'tu-90', label: 'Từ 90 phút trở lên' },
  { key: 'tu-15-khach', label: 'Ca từ 15 khách' },
] as const

export function applyQuickFilter<T extends { experience: CsvRow }>(rows: T[], key: string | undefined): T[] {
  if (key === 'duoi-90') return rows.filter(row => Number(row.experience.duration_minutes) < 90)
  if (key === 'tu-90') return rows.filter(row => Number(row.experience.duration_minutes) >= 90)
  if (key === 'tu-15-khach') return rows.filter(row => Number(row.experience.max_participants) >= 15)
  return rows
}

/** Mockup wording: up to 90 minutes in minutes ("60 phút", "90 phút"), longer in hours ("1 giờ 45 phút", "2 giờ"). */
export function durationLabel(minutes: number): string {
  if (minutes <= 90) return `${minutes} phút`
  const h = Math.floor(minutes / 60), m = minutes % 60
  return h && m ? `${h} giờ ${m} phút` : h ? `${h} giờ` : `${m} phút`
}

/** URL the browser can load: private Storage files go through /api/prf/media; seed placeholder keys are not images. */
function fileUrl(file: CsvRow): string | null {
  if (file.storage_key.startsWith('prf-media/')) return `/api/prf/media/${file.file_id}`
  return /^https?:\/\//.test(file.storage_key) ? file.storage_key : null
}

/** First image of an Experience (profile_media order), or null. */
export function experienceImage(seed: ExploreSeed, experienceId: string): string | null {
  const files = new Map(seed.stored_files.map(file => [file.file_id, file]))
  return experienceImages(seed, experienceId)[0] ?? null
}

/** Servable images of an Experience, in profile_media order. */
export function experienceImages(seed: ExploreSeed, experienceId: string): string[] {
  const files = new Map(seed.stored_files.map(file => [file.file_id, file]))
  return seed.profile_media
    .filter(item => item.experience_id === experienceId && files.get(item.file_id)?.media_type?.startsWith('image/'))
    .sort((a, b) => Number(a.display_order) - Number(b.display_order))
    .map(item => fileUrl(files.get(item.file_id)!)).filter((url): url is string => Boolean(url))
}

/** Images of a published workshop version, in display order. */
export function providerImages(seed: ExploreSeed, providerId: string, versionNo: string): string[] {
  const files = new Map(seed.stored_files.map(file => [file.file_id, file]))
  return (seed.provider_version_media ?? [])
    .filter(item => item.provider_id === providerId && item.version_no === versionNo && files.get(item.file_id)?.media_type?.startsWith('image/'))
    .sort((a, b) => Number(a.display_order) - Number(b.display_order))
    .map(item => fileUrl(files.get(item.file_id)!)).filter((url): url is string => Boolean(url))
}

export const placeLine = (village: CsvRow) => [village.name, village.district, village.city_province].filter(Boolean).join(', ')

export interface CardView {
  id: string; providerId: string; name: string; craft: string; location: string; meta: string
  highlights: string[]; priceFrom: number; image: string | null; why: string | null
}

/** Card of 01/21/24: "Giá từ … /khách" is shown to everyone (human decision; group price stays hidden for Guests). */
export function cardView(seed: ExploreSeed, row: Row, preferenceKeys: string[]): CardView {
  const { experience, version, village } = row
  return {
    id: experience.experience_id, providerId: row.provider.provider_id, name: experience.name,
    craft: craftLabel(version.craft_type ?? ''), location: placeLine(village),
    meta: `${durationLabel(Number(experience.duration_minutes))} · Tối đa ${Number(experience.max_participants)} khách/ca`,
    highlights: parseHighlights(experience.highlights).slice(0, 3).map(item => item.title),
    priceFrom: Number(experience.price_per_person), image: experienceImage(seed, experience.experience_id),
    why: preferenceKeys.length ? whyLine(experience.suitable_for, preferenceKeys) : null,
  }
}

/** "Gợi ý vì: Hợp …": suitable_for terms matching the Agency's preference keys, either literally or through
 *  PREFERENCE_TO_SUITABLE_FOR; null when nothing matches. */
export function whyLine(suitableFor: unknown, preferenceKeys: string[]): string | null {
  const keys = new Set(preferenceKeys.flatMap(key => PREFERENCE_TO_SUITABLE_FOR[key] ? [key, PREFERENCE_TO_SUITABLE_FOR[key]] : [key]))
  const common = parseStringList(suitableFor).filter(term => keys.has(term))
  if (!common.length) return null
  return `Gợi ý vì: Hợp ${common.map(term => term.charAt(0).toLowerCase() + term.slice(1)).join(', ')}`
}

export function preferenceKeys(seed: ExploreSeed, agencyId: string | null): string[] {
  if (!agencyId) return []
  const row = seed.agency_preference_profiles.find(item => item.agency_id === agencyId)
  if (!row?.preference_weights) return []
  try { const data = JSON.parse(row.preference_weights); return data && typeof data === 'object' ? Object.keys(data) : [] } catch { return [] }
}

export interface VillageTile { village_id: string; name: string; craft: string; area: string; providers: number; image: string }

/** Village grid of 01/21: villages with at least one image (workshop or experience images), most workshops first. */
export function villageTiles(seed: ExploreSeed): VillageTile[] {
  const byVillage = new Map<string, Row[]>()
  for (const row of eligibleRows(seed)) byVillage.set(row.village.village_id, [...(byVillage.get(row.village.village_id) ?? []), row])
  const tiles: VillageTile[] = []
  for (const [villageId, rows] of byVillage) {
    const village = rows[0].village
    const providers = new Map(rows.map(row => [row.provider.provider_id, row]))
    const image = rows.map(row => experienceImage(seed, row.experience.experience_id)).find(Boolean)
      ?? [...providers.values()].flatMap(row => providerImages(seed, row.provider.provider_id, row.version.version_no))[0]
    if (!image) continue
    const crafts = [...providers.values()].map(row => row.version.craft_type).filter(Boolean)
    const common = crafts.sort((a, b) => crafts.filter(c => c === b).length - crafts.filter(c => c === a).length)[0] ?? ''
    tiles.push({ village_id: villageId, name: village.name, craft: village.editorial_craft || craftLabel(common),
      area: [village.district, village.city_province].filter(Boolean).join(', '), providers: providers.size, image })
  }
  return tiles.sort((a, b) => b.providers - a.providers || a.name.localeCompare(b.name, 'vi'))
}

const HANOI = 'Asia/Ho_Chi_Minh'
function parts(date: Date) {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: HANOI, day: '2-digit', month: '2-digit' })
    .formatToParts(date).map(part => [part.type, part.value]))
  return values as Record<string, string>
}
const dayMonth = (date: Date) => { const p = parts(date); return `${p.day}/${p.month}` }
const hourMinute = (date: Date) => new Intl.DateTimeFormat('vi-VN', { timeZone: HANOI, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date)

export interface HoldBanner { bookingId: string; href: string; title: string; note: string; image: string | null }

/** Banner of 21: the Agency's On hold booking whose hold has not expired (the one expiring first). */
export function holdBanner(seed: ExploreSeed, agencyId: string, now: Date): HoldBanner | null {
  const held = (seed.bookings ?? [])
    .filter(row => row.agency_id === agencyId && row.status === 'On hold' && row.hold_expires_at && new Date(row.hold_expires_at) > now)
    .sort((a, b) => a.hold_expires_at.localeCompare(b.hold_expires_at))[0]
  if (!held) return null
  const experience = seed.experiences.find(row => row.experience_id === held.experience_id)
  const until = new Date(held.hold_expires_at)
  return {
    bookingId: held.booking_id, href: `/agency/${agencyId}/bookings/${held.booking_id}`,
    title: `${experience?.name ?? 'Đặt chỗ'} · ${dayMonth(new Date(held.start_at))} · ${Number(held.group_size)} khách`,
    note: `Xưởng đang giữ chỗ đến ${hourMinute(until)}, ${dayMonth(until)}. Thanh toán để chốt lịch cho đoàn.`,
    image: experienceImage(seed, held.experience_id),
  }
}
