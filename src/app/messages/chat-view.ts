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

export type ChatAction = { key: 'create_booking' | 'close' | 'bookings' | 'schedule'; label: string; href?: string }

/**
 * Screen actions next to the conversation header. Close Chat only while Active (F-CHAT-04: Closed is terminal).
 * Leaving through Bookings / Schedule never closes the Chat (COM048 #9–#10, COM065 #10).
 */
export function chatActions(session: { role: string | null; agencyId?: string | null; providerId?: string | null }, status: string): ChatAction[] {
  const active = status === 'Active'
  if (session.role === 'Local_Provider') {
    const base = `/provider/${session.providerId}`
    return [
      { key: 'create_booking', label: 'Tạo đặt chỗ', href: `${base}/bookings/new` },
      ...(active ? [{ key: 'close', label: 'Đóng hội thoại' } as ChatAction] : []),
      { key: 'bookings', label: 'Đặt chỗ', href: `${base}/bookings` },
    ]
  }
  const base = `/agency/${session.agencyId}`
  return [
    ...(active ? [{ key: 'close', label: 'Đóng hội thoại' } as ChatAction] : []),
    { key: 'bookings', label: 'Đặt chỗ', href: `${base}/bookings` },
    { key: 'schedule', label: 'Lịch', href: `${base}/schedule` },
  ]
}
