// Pure helper for the Chat buttons on BKG135 / BKG138: open the pair Chat (source Booking) and go to COM048 / COM065.
export type ChatOpenResult = { networkError: true } | { ok: boolean; status: number; body: any }
export type ChatOpenOutcome = { kind: 'success'; navigateTo: string } | { kind: 'error'; message: string }

export const CHAT_OPEN_FAILURE = 'Không thể mở Chat. Vui lòng thử lại.'

export function chatOpenOutcome(result: ChatOpenResult): ChatOpenOutcome {
  if ('networkError' in result) return { kind: 'error', message: CHAT_OPEN_FAILURE }
  const chatId = result.ok ? result.body?.data?.chat_session_id : undefined
  if (!chatId) return { kind: 'error', message: result.body?.error?.message || CHAT_OPEN_FAILURE }
  return { kind: 'success', navigateTo: `/messages?chat_session_id=${encodeURIComponent(chatId)}` }
}
