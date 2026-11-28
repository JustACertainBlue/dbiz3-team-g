// Pure view helpers for COM048 (Tour Agency) / COM065 (Local Provider), design wave 4 screen 4 (Figma "Màn 4").
// Content stays inside the screen specs: element #5 Active / Closed, #3 list with unread count, #4 chronological
// messages, COM048 #8–#10 (Close Chat, Bookings, Schedule), COM065 #8–#10 (Create booking, Close Chat, Bookings).
import { hanoiClock, hanoiDate } from '@/lib/time/hanoi-time'
import { sizeLabel } from './attach-state'

/** Avatar text from the organization name: first letters of the last two words ("Xưởng gốm Minh Châu" → "MC"). */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return [...words[0]].slice(0, 2).join('').toUpperCase()
  return words.slice(-2).map(word => [...word][0]).join('').toUpperCase()
}

/** Element #5. A Closed Chat is terminal and its history is read-only (SR-004). */
export const chatStatusLine = (status: string) => status === 'Active' ? 'Đang hoạt động' : 'Đã đóng · chỉ xem'

const previousDay = (date: string) => {
  const day = new Date(`${date}T00:00:00Z`)
  day.setUTCDate(day.getUTCDate() - 1)
  return day.toISOString().slice(0, 10)
}
const dayMonth = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`

/** Time in the conversation list, Hanoi time: "10:42" today, "Hôm qua", otherwise "14/10". */
export function listTime(value: string | undefined, now: Date): string {
  const date = hanoiDate(value)
  if (!date) return ''
  const today = hanoiDate(now)
  if (date === today) return hanoiClock(value)
  if (date === previousDay(today)) return 'Hôm qua'
  return dayMonth(date)
}

/** Day separator in the message log, Hanoi time: "Hôm nay, 18/10", "Hôm qua, 17/10", otherwise "30/09/2026". */
export function dayLabel(value: string, now: Date): string {
  const date = hanoiDate(value)
  const today = hanoiDate(now)
  if (date === today) return `Hôm nay, ${dayMonth(date)}`
  if (date === previousDay(today)) return `Hôm qua, ${dayMonth(date)}`
  return `${dayMonth(date)}/${date.slice(0, 4)}`
}

/** Splits the chronological history into Hanoi days without reordering it. */
export function groupByDay<T extends { sent_at: string }>(messages: T[], now: Date): { label: string; items: T[] }[] {
  const groups: { date: string; label: string; items: T[] }[] = []
  for (const message of messages) {
    const date = hanoiDate(message.sent_at)
    const last = groups[groups.length - 1]
    if (last && last.date === date) last.items.push(message)
    else groups.push({ date, label: dayLabel(message.sent_at, now), items: [message] })
  }
  return groups.map(({ label, items }) => ({ label, items }))
}

export const attachmentLine = (file: { file_name: string; file_size: number }) => `Đính kèm: ${file.file_name} · ${sizeLabel(file.file_size)}`

export type ChatAction = { key: 'create_booking'; label: string; href: string }

/**
 * Header buttons of the thread (screen 25, decision 21/11): "Đóng hội thoại", "Đặt chỗ" and "Lịch" are gone for both
 * roles. The Local Provider keeps "Tạo đặt chỗ"; the request card has its own "Tạo đặt chỗ từ yêu cầu" button.
 */
export function chatActions(session: { role: string | null; agencyId?: string | null; providerId?: string | null }, _status: string): ChatAction[] {
  if (session.role === 'Local_Provider') return [{ key: 'create_booking', label: 'Tạo đặt chỗ', href: `/provider/${session.providerId}/bookings/new` }]
  return []
}

// #158: a poll fetches the latest page of the open Chat. Messages the user already loaded with
// "older messages" stay; new ones are appended; status fields (Closed) come from the latest page.
export function mergeLatestPage<M extends { message_id: string }, H extends { chat_session_id: string; message_history: M[]; has_more_messages: boolean }>(
  current: H | null, latest: H,
): H {
  if (!current || current.chat_session_id !== latest.chat_session_id) return latest
  const latestIds = new Set(latest.message_history.map(message => message.message_id))
  const first = latest.message_history[0]?.message_id
  const firstIndex = first === undefined ? -1 : current.message_history.findIndex(message => message.message_id === first)
  if (firstIndex <= 0) return latest
  const older = current.message_history.slice(0, firstIndex).filter(message => !latestIds.has(message.message_id))
  return { ...latest, message_history: [...older, ...latest.message_history], has_more_messages: current.has_more_messages }
}

// Pill of a Booking Update message (mockup 25 ".evt", UI v3 decision #6). The stored sentence (spec-BKG #49,
// "Đặt chỗ {status label}: …" or legacy "Booking {status label}: …") stays the sub line; the title is derived from its status label.
const EVENT_TITLE: Record<string, string> = {
  'chờ thanh toán': 'Xưởng đã giữ chỗ',
  'đã thanh toán': 'Xưởng đã nhận tiền',
  // Sentences stored before the 21/11 wording change.
  'tạm giữ': 'Xưởng đã giữ chỗ',
  'đã đặt': 'Xưởng đã nhận tiền',
  'hoàn tất': 'Tour đã hoàn thành',
  'đã huỷ': 'Đặt chỗ đã huỷ',
  'công ty báo đã thanh toán': 'Công ty báo đã thanh toán',
}
export function eventView(text: string): { title: string; sub: string } {
  const label = (/^(?:Booking |Đặt chỗ )?([^:]+): /.exec(text)?.[1] ?? '').toLowerCase()
  return { title: EVENT_TITLE[label] ?? 'Cập nhật đặt chỗ', sub: text }
}

const fold = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim()

/** Screen 25 search box: keeps the chats whose organization, participant or experience contains the text (no case, no accents). */
export function filterChats<T extends { organization: string; participant_name: string; experience_name: string }>(chats: readonly T[], query: string): T[] {
  const needle = fold(query)
  if (!needle) return [...chats]
  return chats.filter(chat => [chat.organization, chat.participant_name, chat.experience_name].some(field => fold(field).includes(needle)))
}
