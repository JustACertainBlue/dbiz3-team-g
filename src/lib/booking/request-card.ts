// The booking request is a chat message of kind "Quote Request" whose text is this JSON (UI v3 decision #12:
// a message with data attached; chat_messages has no payload column, quote_requests has no slot/guest columns).
// Client-safe: no server imports.

export interface BookingRequestCard {
  type: 'booking_request'
  v: 1
  experience_id: string
  experience_name: string
  date: string // YYYY-MM-DD, Hanoi
  slot_start: string // HH:mm or ''
  slot_end: string // HH:mm or ''
  group_size: number
  note: string
}

export const encodeBookingRequest = (card: Omit<BookingRequestCard, 'type' | 'v'>): string =>
  JSON.stringify({ type: 'booking_request', v: 1, ...card })

export function parseBookingRequest(text: string | null | undefined): BookingRequestCard | null {
  if (!text || text[0] !== '{') return null
  try {
    const value = JSON.parse(text) as Partial<BookingRequestCard>
    if (value?.type !== 'booking_request' || value.v !== 1 || typeof value.date !== 'string' || typeof value.group_size !== 'number') return null
    return {
      type: 'booking_request', v: 1, experience_id: String(value.experience_id ?? ''), experience_name: String(value.experience_name ?? ''),
      date: value.date, slot_start: String(value.slot_start ?? ''), slot_end: String(value.slot_end ?? ''), group_size: value.group_size, note: String(value.note ?? ''),
    }
  } catch { return null }
}

/** One-line text for the chat list preview. */
export function requestPreview(card: BookingRequestCard): string {
  const [y, m, d] = card.date.split('-')
  return `Yêu cầu đặt chỗ: ${card.experience_name}, ${d}/${m}/${y}${card.slot_start ? ` ${card.slot_start}–${card.slot_end}` : ''}, ${card.group_size} khách`
}
