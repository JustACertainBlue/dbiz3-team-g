// UI v3 Đợt 1, screens 04 (Tour Agency) and 23 (Guest) on /explore/experiences/[id]: view model of the detail page
// (human decisions 2026-11-18 #3, #4, #5, #9; deviations in docs/build/ui-v3-spec-deviations.md). Rows of a list
// hide when their field is empty; blocks follow the mockup.
import type { CsvRow, ExploreSeed, Viewer } from './catalog'
import { eligibleRows } from './catalog'
import { calculateAvailability } from './availability'
import { durationLabel, experienceImages, placeLine, providerImages } from './v3-home'
import { availabilityOn, priceFor, type PriceView } from './v3-search'
import { craftLabel, parseDistance, parseHighlights, parseInclusions, parseSlots, parseStringList, type Highlight } from './vocabulary'
import { initials } from '../../app/components/nav/nav-model'

export const HOLD_HOURS = 72 // src/lib/booking/create-booking.ts HOLD_HOURS (BKG BR-004)
const WEEKDAY = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const WEEKDAY_LONG = ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật']
const isoWeekday = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7 + 1
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
const lines = (value: string) => value.split(/\n+/).map(item => item.trim()).filter(Boolean)

/** Description paragraphs (split on blank lines); a short "Title:" start is shown in bold, as in the mockup. */
export function aboutParagraphs(description: string): Array<{ lead: string; text: string }> {
  return description.split(/\n\s*\n/).map(item => item.trim()).filter(Boolean).map(paragraph => {
    const colon = paragraph.indexOf(':')
    return colon > 0 && colon <= 40 ? { lead: paragraph.slice(0, colon + 1), text: paragraph.slice(colon + 1) } : { lead: '', text: paragraph }
  })
}

export interface CancelRow { when: string; what: string; short: string }
/** experiences.cancellation_policy rules {threshold_hours, fee_percentage} as refund rows. */
export function cancellationRows(policy: string): CancelRow[] {
  let data: unknown
  try { data = policy ? JSON.parse(policy) : null } catch { return [] }
  const rules = data && typeof data === 'object' && Array.isArray((data as { rules?: unknown }).rules) ? (data as { rules: Array<{ threshold_hours: number; fee_percentage: number }> }).rules : []
  return [...rules].sort((a, b) => b.threshold_hours - a.threshold_hours).map(rule => {
    const refund = Math.max(0, 100 - Number(rule.fee_percentage))
    return { when: `Báo huỷ trước ${rule.threshold_hours} giờ`, what: `Hoàn ${refund}% số tiền đã trả.`, short: `Huỷ trước ${rule.threshold_hours} giờ: hoàn ${refund}% số tiền` }
  })
}

export interface SlotRow { id: string; label: string; time: string; minutes: number; fit: string; free: boolean }
/** Fixed slots of that weekday that are free on the date (experience_slots × availability.ts), earliest first. */
export function slotRows(seed: ExploreSeed, slotData: CsvRow[], experienceId: string, date: string, guests: number | null): SlotRow[] {
  const experience = seed.experiences.find(row => row.experience_id === experienceId)
  if (!experience || !date) return []
  const weekday = isoWeekday(date)
  const free = calculateAvailability(experience.provider_id, seed.provider_operating_hours ?? [], seed.bookings ?? [], { from: date, to: date }).available_slots
  const max = Number(experience.max_participants)
  return parseSlots(slotData.filter(row => row.experience_id === experienceId)).filter(slot => slot.weekdays.includes(weekday))
    .map((slot, index) => ({ id: `${slot.label}-${index}`, label: slot.label, time: `${slot.start} – ${slot.end}`, minutes: Number(experience.duration_minutes),
      fit: !guests ? '' : guests <= max ? `Vừa cho đoàn ${guests} khách trong một ca` : `Đoàn ${guests} khách cần chia thành nhiều ca`,
      free: free.some(range => range.start_at.slice(11, 16) <= slot.start && range.end_at.slice(11, 16) >= slot.end) }))
    .filter(slot => slot.free)
}

/** "Thứ Tư đã có đoàn giữ chỗ, Thứ Năm đã kín lịch. Xưởng nghỉ Thứ Bảy và Chủ nhật." for the week of the date. */
export function weekNote(seed: ExploreSeed, providerId: string, date: string): string {
  const monday = addDays(date, 1 - isoWeekday(date))
  const busy: string[] = [], closed: string[] = []
  for (let i = 0; i < 7; i++) {
    const day = addDays(monday, i)
    const state = availabilityOn(seed, providerId, day)
    if (state.ok) continue
    const name = WEEKDAY_LONG[isoWeekday(day)]
    if (state.text.includes('xưởng nghỉ')) closed.push(name)
    else busy.push(`${name} ${state.text.includes('giữ chỗ') ? 'đã có đoàn giữ chỗ' : 'đã kín lịch'}`)
  }
  const parts = [busy.join(', '), closed.length ? `Xưởng nghỉ ${closed.length > 1 ? `${closed.slice(0, -1).join(', ')} và ${closed[closed.length - 1]}` : closed[0]}` : '']
  return parts.filter(Boolean).map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}.`).join(' ')
}

function openingLine(seed: ExploreSeed, providerId: string): string {
  const hours = (seed.provider_operating_hours ?? []).filter(row => row.provider_id === providerId).map(row => ({ day: Number(row.weekday), start: row.local_start.slice(0, 5), end: row.local_end.slice(0, 5) }))
  if (!hours.length) return ''
  const days = [...new Set(hours.map(row => row.day))].sort((a, b) => a - b)
  const contiguous = days.every((day, index) => index === 0 || day === days[index - 1] + 1)
  const range = contiguous && days.length > 1 ? `${WEEKDAY[days[0]]} đến ${WEEKDAY[days[days.length - 1]]}` : days.map(day => WEEKDAY[day]).join(', ')
  return `Nhận đoàn ${range}, từ ${hours[0].start} đến ${hours[0].end}`
}

export interface InfoGroup { title: string; items: string[]; note?: string }
export interface DetailView {
  id: string; providerId: string; villageId: string; villageName: string; name: string; eyebrow: string; providerLine: string; priceFrom: number
  images: string[]; owner: { initials: string; name: string; title: string; phone: string | null }
  highlights: Highlight[]; maxGuests: number; durationText: string
  group: { guests: number | null; dateText: string; perGuest: string[]; guide: boolean; cancel: string; price: PriceView }
  about: Array<{ lead: string; text: string }>; suitableFor: string[]; halfDay: { lines: string[]; extras: string[] } | null
  includes: InfoGroup[]; policies: Array<{ title: string; rows: Array<{ when?: string; what: string }> }>
  faq: Array<{ q: string; a: string }>; payments: boolean
}

export function detailView(seed: ExploreSeed, id: string, viewer: Viewer, query: { date: string; guests: number | null }, slotData: CsvRow[], payments: boolean): DetailView | null {
  const row = eligibleRows(seed).find(item => item.experience.experience_id === id)
  if (!row) return null
  const { experience, version, village, provider } = row
  const isAgency = viewer.kind === 'agency'
  const inclusions = parseInclusions(experience.inclusions)
  const owner = seed.user_accounts.find(account => account.user_id === provider.user_id)?.full_name ?? ''
  let contact: Record<string, string> = {}
  try { contact = version.contact_information ? JSON.parse(version.contact_information) : {} } catch { contact = {} }
  const minutes = Number(experience.duration_minutes), max = Number(experience.max_participants), notice = Number(experience.notice_period_hours)
  const cancel = cancellationRows(experience.cancellation_policy ?? '')
  const suitableFor = parseStringList(experience.suitable_for)
  const opening = openingLine(seed, provider.provider_id)
  const km = parseDistance(village.distance_km)
  const craft = craftLabel(version.craft_type ?? '')
  const dateText = query.date ? `${WEEKDAY_LONG[isoWeekday(query.date)]} ${query.date.slice(8, 10)}/${query.date.slice(5, 7)}` : ''

  const includes: InfoGroup[] = [
    { title: 'Đã gồm trong giá', items: inclusions?.included ?? [] },
    { title: 'Sản phẩm mang về', items: inclusions?.take_home ? ['Mỗi khách một sản phẩm tự làm'] : [] },
    { title: 'Lưu ý cho đoàn', items: lines(inclusions?.notes.luu_y ?? '') },
    { title: 'Ngôn ngữ hướng dẫn', items: parseStringList(experience.guide_languages) },
    { title: 'Thời lượng & số khách', items: [`${durationLabel(minutes)} mỗi ca`, `Tối đa ${max} khách mỗi ca`, ...(experience.notice_period_hours !== '' && Number.isFinite(notice) ? [`Đặt trước ít nhất ${notice} giờ`] : [])] },
    { title: 'Trong buổi trải nghiệm', items: lines(inclusions?.notes.trong_buoi ?? '') },
    { title: 'Chụp ảnh, quay phim', items: [], note: inclusions?.notes.chup_anh ?? '' },
    { title: 'An toàn', items: lines(inclusions?.notes.an_toan ?? '') },
  ].filter(group => group.items.length || group.note)

  const policies: DetailView['policies'] = [
    ...(experience.notice_period_hours !== '' && Number.isFinite(notice) ? [{ title: 'Đặt trước', rows: [{ what: `Gửi yêu cầu ít nhất ${notice} giờ trước giờ đoàn đến.` }] }] : []),
    { title: 'Giữ chỗ', rows: [{ what: `Sau khi thống nhất, xưởng giữ chỗ cho đoàn trong ${HOLD_HOURS} giờ. Thanh toán trong thời gian này để chắc chắn có lịch.` }] },
    ...(cancel.length ? [{ title: 'Huỷ đặt chỗ', rows: [...cancel.map(row => ({ when: row.when, what: row.what })),
      ...(payments ? [{ when: 'Báo huỷ muộn hơn', what: 'Không được hoàn tiền.' }, { when: 'Xưởng huỷ', what: 'Hoàn đủ 100%, xưởng hoàn tiền lại cho bạn.' }] : [])] }] : []),
    { title: 'Số khách', rows: [{ what: `Tối đa ${max} khách mỗi ca. Đoàn đông hơn có thể chia thành nhiều ca liên tiếp.` }] },
    ...(experience.child_policy ? [{ title: 'Trẻ em', rows: [{ what: experience.child_policy }] }] : []),
    ...(payments ? [{ title: 'Hình thức thanh toán', rows: [{ what: 'Tiền vào thẳng tài khoản của xưởng, xưởng xác nhận đặt chỗ sau khi nhận tiền.' }] }] : []),
  ]

  const faq = [
    { q: 'Giá đã niêm yết, sao còn phải gửi yêu cầu?', a: 'Giá là cố định, nhưng xưởng cần xác nhận ngày, giờ và số khách của đoàn trước khi giữ chỗ. Gửi yêu cầu không mất phí và chưa tạo đặt chỗ.' },
    ...(payments ? [{ q: 'Đã thanh toán mà xưởng chưa xác nhận thì sao?', a: 'Sau 48 giờ chưa được xác nhận, bạn sẽ thấy nút “Yêu cầu hoàn tiền” và được hoàn đủ 100%.' }] : []),
    { q: 'Tôi muốn đổi ngày hoặc số khách?', a: 'Nhắn xưởng qua mục Tin nhắn. Chỉ xưởng mới cập nhật được đặt chỗ.' },
    ...(payments ? [{ q: 'Khi nào tôi phải thanh toán?', a: `Sau khi xưởng giữ chỗ, bạn có ${HOLD_HOURS} giờ để thanh toán theo mã QR trong trang chi tiết đặt chỗ. Tiền vào thẳng tài khoản xưởng; xưởng bấm xác nhận là đặt chỗ hoàn tất. Quá hạn, chỗ giữ tự huỷ.` }] : []),
    { q: `Đoàn đông hơn ${max} khách thì sao?`, a: 'Nhắn xưởng để hỏi cách chia nhóm hoặc chọn thêm ngày.' },
    ...(km !== null ? [{ q: 'Xưởng cách trung tâm Hà Nội bao xa?', a: [`Khoảng ${km.toLocaleString('vi-VN')} km.`, provider.parking_note ?? ''].filter(Boolean).join(' ') }] : []),
  ]

  return {
    id, providerId: provider.provider_id, villageId: village.village_id, villageName: village.name, name: experience.name,
    eyebrow: [craft, `Làng ${village.name}`].filter(Boolean).join(' · ').toUpperCase(),
    providerLine: `${version.business_name} · ${placeLine(village)}`, priceFrom: Number(experience.price_per_person),
    images: [...new Set([...experienceImages(seed, id), ...providerImages(seed, provider.provider_id, version.version_no)])],
    owner: { initials: initials(owner || version.business_name), name: owner, title: `Chủ ${version.business_name}`, phone: isAgency ? contact.phone_number || null : null },
    highlights: parseHighlights(experience.highlights).slice(0, 4), maxGuests: max, durationText: durationLabel(minutes),
    group: { guests: query.guests, dateText, perGuest: inclusions?.per_guest ?? [], guide: Boolean(inclusions?.included.length), cancel: cancel[0]?.short ?? '',
      price: priceFor(seed, experience, query.guests, isAgency) },
    about: aboutParagraphs(experience.description ?? ''), suitableFor,
    halfDay: suitableFor.includes('Tour nửa ngày') ? {
      lines: [`${durationLabel(minutes)} tại xưởng, đoàn vẫn kịp ghép thêm một điểm tham quan`, ...(opening ? [opening] : [])],
      extras: [...(inclusions?.take_home ? ['Sản phẩm mang về cho từng khách'] : []), ...(inclusions?.included ?? [])].slice(0, 2),
    } : null,
    includes, policies, faq, payments,
  }
}
