// Pure helpers for Close Chat on COM048 / COM065 (spec-IAC #30, #33, #34, #35).
export const CLOSE_REASON_LIMIT = 500

export function closeReasonState(input: { text: string; pending: boolean }) {
  const length = [...input.text.trim()].length
  return { counter: `${length}/${CLOSE_REASON_LIMIT}`, canConfirm: !input.pending && length <= CLOSE_REASON_LIMIT }
}

export const NEW_CHAT_HINT = 'Muốn trao đổi tiếp? Mở hội thoại mới từ Explore, AI Tour Matching hoặc từ một Booking.'

export function closedNotice(history: { chat_status: string; closed_at?: string; closed_by_name?: string }) {
  if (history.chat_status !== 'Closed') return null
  const when = history.closed_at ? new Date(history.closed_at).toLocaleString('vi-VN') : ''
  const who = history.closed_by_name || 'một bên tham gia'
  return { title: `Đã đóng bởi ${who}${when ? ` lúc ${when}` : ''} — chỉ xem`, hint: NEW_CHAT_HINT }
}
