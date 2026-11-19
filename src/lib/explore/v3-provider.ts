// UI v3 Đợt 1, screen 24 (/explore/providers/[id]; DSC122 Tour Agency, DSC123 Guest): view model of the workshop page
// (human decisions 2026-11-18 #4, #5, #9, #10). Rows of a list hide when their field is empty.
import type { CsvRow, ExploreSeed, Viewer } from './catalog'
import { eligibleRows } from './catalog'
import { calculateAvailability } from './availability'
import { cardView, experienceImages, providerImages, type CardView } from './v3-home'
import { resultView, type ResultView } from './v3-search'
import { aboutParagraphs } from './v3-detail'
import { craftLabel, parseDistance, parseStringList, SUITABLE_FOR, rowCraft } from './vocabulary'
import { initials } from '../../app/components/nav/nav-model'

const WEEKDAY = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const STATUS: Record<string, string> = { 'On hold': 'đang chờ thanh toán', Booked: 'đã đặt', Completed: 'hoàn tất', Cancelled: 'đã huỷ' }
const HANOI_OFFSET = 7 * 3_600_000
const hanoiDate = (date: Date) => new Date(date.getTime() + HANOI_OFFSET).toISOString().slice(0, 10)
const dayMonth = (iso: string) => { const local = hanoiDate(new Date(iso)); return `${local.slice(8, 10)}/${local.slice(5, 7)}` }

function hoursOf(seed: ExploreSeed, providerId: string) {
  const rows = (seed.provider_operating_hours ?? []).filter(row => row.provider_id === providerId)
  const days = [...new Set(rows.map(row => Number(row.weekday)))].sort((a, b) => a - b)
  if (!rows.length) return null
  const contiguous = days.every((day, index) => index === 0 || day === days[index - 1] + 1)
  const range = contiguous && days.length > 1 ? `${WEEKDAY[days[0]]} – ${WEEKDAY[days[days.length - 1]]}` : days.map(day => WEEKDAY[day]).join(', ')
  const closed = [1, 2, 3, 4, 5, 6, 7].filter(day => !days.includes(day)).map(day => WEEKDAY[day])
  return { range, time: `${rows[0].local_start.slice(0, 5)} – ${rows[0].local_end.slice(0, 5)}`, closed }
}

export interface ProviderView {
  id: string; initials: string; eyebrow: string; name: string; address: string; villageId: string
  images: string[]; owner: { initials: string; name: string; title: string; phone: string | null; email: string | null }
  together: { count: number; latest: string; status: string; href: string } | null
  highlights: Array<{ title: string; sub: string }>; about: Array<{ lead: string; text: string }>; suitableFor: string[]
  experiences: ResultView[]; firstExperienceId: string | null; similar: CardView[]
  info: Array<{ label: string; value: string }>; faq: Array<{ q: string; a: string }>; payments: boolean
}

export function providerView(seed: ExploreSeed, providerId: string, viewer: Viewer, now: Date, payments: boolean, query: { date: string; guests: number | null } = { date: '', guests: null }): ProviderView | null {
  const all = eligibleRows(seed)
  const own = all.filter(row => row.provider.provider_id === providerId)
  const provider = seed.provider_profiles.find(row => row.provider_id === providerId)
  const version = provider && seed.provider_profile_versions.find(row => row.provider_id === providerId && row.version_no === provider.published_version_no)
  const village = provider && seed.villages.find(row => row.village_id === provider.village_id)
  if (!provider || provider.verification_status !== 'Verified' || !version || version.version_status !== 'Verified' || !village || village.is_active !== 'true') return null
  const isAgency = viewer.kind === 'agency'
  let contact: Record<string, string> = {}
  try { contact = version.contact_information ? JSON.parse(version.contact_information) : {} } catch { contact = {} }
  const owner = seed.user_accounts.find(row => row.user_id === provider.user_id)?.full_name ?? ''
  const max = own.reduce((value, row) => Math.max(value, Number(row.experience.max_participants)), 0)
  const languages = [...new Set(own.flatMap(row => parseStringList(row.experience.guide_languages)))]
  const suitable = new Set(own.flatMap(row => parseStringList(row.experience.suitable_for)))
  const suitableFor = [...suitable].sort((a, b) => SUITABLE_FOR.indexOf(a as never) - SUITABLE_FOR.indexOf(b as never))
  const hours = hoursOf(seed, providerId)
  const founded = Number(provider.founded_year)
  const km = parseDistance(village.distance_km)
  const child = own.map(row => row.experience.child_policy).find(Boolean) ?? ''
  const languageText = languages.map((item, index) => index === 0 ? item.charAt(0).toLowerCase() + item.slice(1) : item.charAt(0).toLowerCase() + item.slice(1)).join(', ')

  let together: ProviderView['together'] = null
  if (viewer.kind === 'agency') {
    const mine = (seed.bookings ?? []).filter(row => row.agency_id === viewer.agencyId && row.provider_id === providerId)
      .sort((a, b) => (b.created_at || b.start_at).localeCompare(a.created_at || a.start_at))
    if (mine.length) {
      const latest = mine[0], name = seed.experiences.find(row => row.experience_id === latest.experience_id)?.name ?? 'Đặt chỗ'
      together = { count: mine.length, latest: `${name} · ${dayMonth(latest.start_at)}`, status: STATUS[latest.status] ?? latest.status.toLowerCase(), href: `/agency/${viewer.agencyId}/bookings` }
    }
  }

  const highlights = [
    ...(founded > 0 ? [{ title: `Xưởng mở từ năm ${founded}`, sub: `${new Date(now).getUTCFullYear() - founded} năm làm nghề` }] : []),
    ...(max > 0 ? [{ title: `Nhận đoàn tới ${max} khách/ca`, sub: 'Đoàn đông hơn chia thành nhiều ca' }] : []),
    ...(languages.length ? [{ title: `Hướng dẫn ${languageText}`, sub: 'Ngôn ngữ hướng dẫn' }] : []),
    ...(hours ? [{ title: `Nhận đoàn ${hours.range}`, sub: hours.time }] : []),
  ]

  const info = [
    { label: 'Địa chỉ', value: [version.location_address, km !== null ? `cách trung tâm khoảng ${km.toLocaleString('vi-VN')} km` : ''].filter(Boolean).join(' · ') },
    { label: 'Giờ nhận đoàn', value: hours ? `${hours.range}, ${hours.time}.${hours.closed.length ? ` Nghỉ ${hours.closed.join(', ')}` : ''}`.replace(/\.$/, '') : '' },
    { label: 'Sức chứa', value: max > 0 ? `Tối đa ${max} khách mỗi ca, nhiều ca liên tiếp trong ngày` : '' },
    { label: 'Ngôn ngữ hướng dẫn', value: languages.join(', ') },
    { label: 'Đỗ xe', value: provider.parking_note ?? '' },
    { label: 'Thanh toán', value: payments ? 'Mã QR, tiền vào thẳng tài khoản của xưởng' : '' },
    { label: 'Điện thoại', value: isAgency ? contact.phone_number ?? '' : '' },
    { label: 'Email', value: isAgency ? contact.business_email ?? '' : '' },
  ].filter(row => row.value)

  const faq = [
    ...(max > 0 ? [{ q: 'Xưởng nhận đoàn bao nhiêu khách?', a: `Mỗi ca tối đa ${max} khách. Đoàn đông hơn có thể chia thành nhiều ca liên tiếp, bạn nhắn xưởng để sắp xếp.` }] : []),
    ...(provider.parking_note ? [{ q: 'Xe đoàn đỗ ở đâu?', a: provider.parking_note }] : []),
    ...(child ? [{ q: 'Trẻ nhỏ tham gia được không?', a: child }] : []),
    { q: 'Làm sao liên hệ với xưởng?', a: 'Công ty lữ hành đã đăng nhập nhắn tin trực tiếp với xưởng ở mục Tin nhắn. Số điện thoại và email hiện trên trang này sau khi đăng nhập.' },
    ...(hours ? [{ q: 'Xưởng có nhận đoàn cuối tuần?', a: `${hours.closed.length ? `Hiện xưởng nghỉ ${hours.closed.join(' và ')}.` : 'Xưởng nhận đoàn cả tuần.'} Lịch trống luôn cập nhật theo lịch của xưởng.` }] : []),
    ...(payments ? [{ q: 'Thanh toán cho xưởng thế nào?', a: 'Sau khi xưởng giữ chỗ, bạn thanh toán bằng mã QR trong trang chi tiết đặt chỗ. Tiền vào thẳng tài khoản của xưởng.' }] : []),
  ]

  const craft = rowCraft(version.craft_type, village)
  const otherVillages = all.filter(row => row.village.village_id !== village.village_id && row.version.craft_type === version.craft_type)
  return {
    id: providerId, initials: initials(version.business_name), eyebrow: [craft, `Làng ${village.name}`].filter(Boolean).join(' · ').toUpperCase(),
    name: version.business_name, address: [village.name, village.district, village.city_province].filter(Boolean).join(', '), villageId: village.village_id,
    images: [...new Set([...providerImages(seed, providerId, version.version_no), ...own.flatMap(row => experienceImages(seed, row.experience.experience_id))])],
    owner: { initials: initials(owner || version.business_name), name: owner, title: 'Chủ xưởng', phone: isAgency ? contact.phone_number || null : null, email: isAgency ? contact.business_email || null : null },
    together, highlights, about: aboutParagraphs(version.description ?? ''), suitableFor,
    experiences: own.map(row => resultView(seed, row, query, isAgency)), firstExperienceId: own[0]?.experience.experience_id ?? null,
    similar: otherVillages.slice(0, 3).map(row => cardView(seed, row, [])), info, faq, payments,
  }
}

export interface CalendarDay { day: number; date: string; state: 'past' | 'free' | 'hold' | 'busy' | 'off'; hours: string }
export interface MonthCalendar { month: string; title: string; leading: number; days: CalendarDay[]; prev: string; next: string }

/** Month grid (Monday first) of the workshop calendar: past, free, held, booked or closed day. */
export function monthCalendar(seed: ExploreSeed, providerId: string, month: string, now: Date): MonthCalendar {
  const [year, mon] = month.split('-').map(Number)
  const first = `${month}-01`
  const count = new Date(Date.UTC(year, mon, 0)).getUTCDate()
  const last = `${month}-${String(count).padStart(2, '0')}`
  const result = calculateAvailability(providerId, seed.provider_operating_hours ?? [], seed.bookings ?? [], { from: first, to: last })
  const today = hanoiDate(now)
  const leading = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7
  const shift = (offset: number) => { const d = new Date(Date.UTC(year, mon - 1 + offset, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` }
  const days: CalendarDay[] = []
  for (let day = 1; day <= count; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`
    const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7 + 1
    const open = result.operating_hours.find(row => row.weekday === weekday)
    const free = result.available_slots.find(slot => slot.start_at.startsWith(date))
    const blocks = result.blocked_slots.filter(block => block.start_at.startsWith(date))
    const state: CalendarDay['state'] = date < today ? 'past' : free ? 'free' : !open ? 'off' : blocks.some(block => block.status === 'On hold') ? 'hold' : 'busy'
    days.push({ day, date, state, hours: open ? `${open.local_start.slice(0, 5)} – ${open.local_end.slice(0, 5)}` : '' })
  }
  return { month, title: `Tháng ${mon}/${year}`, leading, days, prev: shift(-1), next: shift(1) }
}

export type { CsvRow }
