// UI v3 Đợt 1, screens 03 (VIL030 /village/[villageId]) and 03a (/villages), mockup pack 19/11/2026.
// Human decisions 2026-11-19: village image = cover_image_id, else the first experience image, and villages without any
// image are left out of the lists; "Vì sao nên đưa đoàn đến…" = suitable_for of the live experiences (vocabulary order,
// no duplicates); "Hoạt động nổi bật" = up to 3 experience names; "Điểm nổi bật của làng" = villages.highlights with
// the computed counter card second; empty distance_km hides the distance line.
import type { ExploreSeed, Viewer } from './catalog'
import { eligibleRows } from './catalog'
import { experienceImages, mainCraft, placeLine, villageImage } from './v3-home'
import { resultView, type ResultView } from './v3-search'
import { SUITABLE_FOR, craftLabel, parseDistance, parseHighlights, parseStringList, parseTourDetail, parseVisitNotes, type TourDetail } from './vocabulary'
import { initials } from '../../app/components/nav/nav-model'

export { villageImage }

type Row = ReturnType<typeof eligibleRows>[number]

export const VILLAGE_PAGE_SIZE = 9
const WEEKDAY = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const byName = (a: Row, b: Row) => a.experience.name.localeCompare(b.experience.name, 'vi')

function rowsByVillage(seed: ExploreSeed): Map<string, Row[]> {
  const map = new Map<string, Row[]>()
  for (const row of eligibleRows(seed)) map.set(row.village.village_id, [...(map.get(row.village.village_id) ?? []), row])
  return map
}

const distanceText = (value: unknown) => {
  const km = parseDistance(value)
  return km === null ? '' : `Cách trung tâm khoảng ${km.toLocaleString('vi-VN')} km`
}

export interface VillageCard {
  village_id: string; name: string; craft: string; craftKey: string; area: string
  providers: number; experiences: number; distance: string; image: string
}

/** Cards of 03a: active villages with live experiences and an image, most workshops first. */
export function villageCards(seed: ExploreSeed): VillageCard[] {
  const cards: VillageCard[] = []
  for (const [villageId, rows] of rowsByVillage(seed)) {
    const image = villageImage(seed, villageId)
    if (!image) continue
    const village = rows[0].village
    const craftKey = mainCraft(rows)
    cards.push({
      village_id: villageId, name: village.name, craft: village.editorial_craft || craftLabel(craftKey), craftKey,
      area: [village.district, village.city_province].filter(Boolean).join(', '),
      providers: new Set(rows.map(row => row.provider.provider_id)).size, experiences: rows.length,
      distance: distanceText(village.distance_km), image,
    })
  }
  return cards.sort((a, b) => b.providers - a.providers || b.experiences - a.experiences || a.name.localeCompare(b.name, 'vi'))
}

/** Active villages with live experiences but no image: left out of 01/21/03a (listed for the image search). */
export function villagesWithoutImage(seed: ExploreSeed): Array<{ village_id: string; name: string }> {
  return [...rowsByVillage(seed)].filter(([villageId]) => !villageImage(seed, villageId))
    .map(([villageId, rows]) => ({ village_id: villageId, name: rows[0].village.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}

export interface VillageList {
  total: number; all: number; page: number; craft: string; items: VillageCard[]
  facets: Array<{ value: string; label: string; n: number }>
}

/** 03a: filter by the village craft label (`nghe`, same label as the cards), 9 villages per page (`page`). */
export function villageList(seed: ExploreSeed, params: Record<string, string | string[] | undefined>): VillageList {
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? ''
  const cards = villageCards(seed)
  const facets = [...new Set(cards.map(card => card.craft))].sort((a, b) => a.localeCompare(b, 'vi'))
    .map(value => ({ value, label: value, n: cards.filter(card => card.craft === value).length }))
  const craft = facets.some(facet => facet.value === one(params.nghe)) ? one(params.nghe) : ''
  const selected = craft ? cards.filter(card => card.craft === craft) : cards
  const pages = Math.max(1, Math.ceil(selected.length / VILLAGE_PAGE_SIZE))
  const requested = Number(one(params.page))
  const page = Number.isInteger(requested) && requested >= 1 && requested <= pages ? requested : 1
  return { total: selected.length, all: cards.length, page, craft, facets, items: selected.slice((page - 1) * VILLAGE_PAGE_SIZE, page * VILLAGE_PAGE_SIZE) }
}

export interface VillageHighlight { title: string; sub: string; counter: boolean }
export interface VillageProvider { id: string; name: string; initials: string; owner: string; line: string; firstExperienceId: string }
export interface VillageNote { key: string; label: string; text: string }
export interface VillageView {
  id: string; name: string; eyebrow: string; title: string; place: string; images: string[]
  highlights: VillageHighlight[]; options: Array<{ id: string; name: string }>; about: string[]; why: string[]
  tour: TourDetail | null; info: Array<{ label: string; value: string }>; results: ResultView[]; experienceCount: number
  moreHref: string; providers: VillageProvider[]; notes: VillageNote[]
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

function daysOff(seed: ExploreSeed, providerIds: string[]): string {
  const rows = (seed.provider_operating_hours ?? []).filter(row => providerIds.includes(row.provider_id))
  if (!rows.length) return ''
  const open = new Set(rows.map(row => Number(row.weekday)))
  const closed = [1, 2, 3, 4, 5, 6, 7].filter(day => !open.has(day)).map(day => WEEKDAY[day])
  return closed.length ? `Xưởng nghỉ ${closed.join(', ')}.` : ''
}

/** Screen 03. null for an unknown or inactive village. `ex` narrows the experience cards to one experience. */
export function villageView(seed: ExploreSeed, villageId: string, viewer: Viewer, query: { date: string; guests: number | null; ex: string }): VillageView | null {
  const village = seed.villages.find(row => row.village_id === villageId)
  if (!village || village.is_active !== 'true') return null
  const rows = (rowsByVillage(seed).get(villageId) ?? []).sort(byName)
  const providerIds = [...new Set(rows.map(row => row.provider.provider_id))]
  const craft = village.editorial_craft || craftLabel(mainCraft(rows))
  const distance = distanceText(village.distance_km)

  const cover = villageImage(seed, villageId)
  const images = [...new Set([...(cover ? [cover] : []), ...rows.flatMap(row => experienceImages(seed, row.experience.experience_id))])]

  const counter: VillageHighlight = { title: `${rows.length} trải nghiệm ở ${providerIds.length} xưởng`, sub: '', counter: true }
  const own = parseHighlights(village.highlights).map(item => ({ ...item, counter: false }))
  const highlights = [...own.slice(0, 1), counter, ...own.slice(1)].slice(0, 4)

  const terms = new Set(rows.flatMap(row => parseStringList(row.experience.suitable_for)))
  const chosen = rows.find(row => row.experience.experience_id === query.ex)
  const shown = chosen ? [chosen] : rows.slice(0, 3)
  const isAgency = viewer.kind === 'agency'

  const notes = parseVisitNotes(village.visit_notes)
  const off = daysOff(seed, providerIds)
  return {
    id: villageId, name: village.name, eyebrow: craft ? `LÀNG NGHỀ ${craft.toUpperCase()}` : 'LÀNG NGHỀ', title: `Làng ${village.name}`,
    place: [placeLine(village), distance].filter(Boolean).join(' · '), images, highlights,
    options: rows.map(row => ({ id: row.experience.experience_id, name: row.experience.name })),
    about: (village.description ?? '').split(/\n+/).map(text => text.trim()).filter(Boolean),
    why: SUITABLE_FOR.filter(term => terms.has(term)),
    tour: parseTourDetail(village.tour_suggestion_detail),
    info: [
      { label: 'Địa chỉ', value: placeLine(village) },
      ...(rows.length ? [{ label: 'Hoạt động nổi bật', value: rows.slice(0, 3).map((row, index) => index ? lowerFirst(row.experience.name) : row.experience.name).join(', ') }] : []),
    ],
    results: shown.map(row => resultView(seed, row, query, isAgency)), experienceCount: rows.length,
    moreHref: !chosen && rows.length > 3 ? `/explore/search?lang=${villageId}` : '',
    providers: providerIds.map(id => {
      const own = rows.filter(row => row.provider.provider_id === id)
      const { provider, version } = own[0]
      const owner = seed.user_accounts.find(row => row.user_id === provider.user_id)?.full_name ?? ''
      return {
        id, name: version.business_name, initials: initials(version.business_name), owner,
        line: `${own.length} trải nghiệm · Nhận đoàn tới ${Math.max(...own.map(row => Number(row.experience.max_participants) || 0))} khách/ca`,
        firstExperienceId: own[0].experience.experience_id, count: own.length,
      }
    }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi')).map(({ count: _count, ...item }) => item),
    notes: [
      ...(notes ? ([['trang_phuc', 'Trang phục'], ['san_pham', 'Sản phẩm'], ['gio_den', 'Giờ đến']] as const)
        .filter(([key]) => notes[key]).map(([key, label]) => ({ key, label, text: notes[key] })) : []),
      ...(off ? [{ key: 'ngay_nghi', label: 'Ngày nghỉ', text: off }] : []),
    ],
  }
}
