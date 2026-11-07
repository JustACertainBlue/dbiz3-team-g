import { beforeEach, describe, expect, it } from 'vitest'
import { closeChat, getChatHistory, sendMessage } from '@/lib/iac/chat-service'
import { createChatHandoff } from '@/lib/demo/commercial-handoff-service'
import { createBooking } from '@/lib/booking/create-booking'
import { withBookingWriteLock } from '@/lib/booking/write-lock'
import { AGENCY, AGENCY_ID, EXPERIENCE, PROVIDER, PROVIDER_ID, activePairChats, repo } from '../unit/iac-fixtures'

// Integration contract "IAC ↔ BKG shared write lock" (docs/test/integration-contract.md): Chat writes and Booking
// writes share one queue (withBookingWriteLock / withChatWriteLock) with an Active re-check inside it
// (spec-IAC #38, #47; spec-BKG FR-008 / F-SCHED-08, #13, #56). Fixture store only: no database.
const pause = () => new Promise<void>(resolve => setTimeout(resolve, 30))
const at = (iso: string) => ({ now: () => new Date(iso) })
const booking = (startAt: string) => ({
  experience_id: EXPERIENCE, agency_id: AGENCY_ID, start_at: startAt, duration: 60, group_size: 10, agreed_price: 2000000,
  booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
})
const kinds = async (chatId: string) => (await getChatHistory(PROVIDER, chatId)).message_history
  .filter(m => m.message_kind !== 'Quote Request').map(m => m.message_kind === 'Booking Update' ? 'booking' : `text:${m.text}`)

describe('IAC ↔ BKG | shared write lock', () => {
  beforeEach(() => repo().reset())

  it('spec-IAC #38 / spec-BKG FR-008 (normal): a Booking event waits for a Chat send that holds the lock, then lands after it', async () => {
    const { chat_session_id: chatId } = await createChatHandoff(AGENCY, EXPERIENCE)
    await Promise.all([
      sendMessage(AGENCY, chatId, 'Gửi trước', { afterStatusCheck: pause }),
      createBooking(PROVIDER, booking('2026-10-12T09:00:00+07:00'), at('2026-09-29T17:00:00.000Z')),
    ])
    expect((await kinds(chatId)).slice(-2)).toEqual(['text:Gửi trước', 'booking'])
  })

  it('spec-IAC #38 (boundary): a Booking section that throws releases the lock, so the next Chat send still completes', async () => {
    const { chat_session_id: chatId } = await createChatHandoff(AGENCY, EXPERIENCE)
    await expect(withBookingWriteLock(async () => { await pause(); throw new Error('booking failed') })).rejects.toThrow('booking failed')
    const sent = await sendMessage(AGENCY, chatId, 'Vẫn gửi được')
    expect((await kinds(chatId)).at(-1)).toBe('text:Vẫn gửi được')
    expect(sent.message_id).toBeTruthy()
  })

  it('spec-IAC #47 / BR-014 (boundary): a Chat send and a Booking event at the same instant get strictly increasing sent_at in write order', async () => {
    const { chat_session_id: chatId } = await createChatHandoff(AGENCY, EXPERIENCE)
    const instant = '2026-09-29T17:00:00.500Z'
    await Promise.all([
      sendMessage(AGENCY, chatId, 'Cùng lúc', at(instant)),
      createBooking(PROVIDER, booking('2026-10-12T11:00:00+07:00'), at(instant)),
    ])
    const history = (await getChatHistory(PROVIDER, chatId)).message_history.slice(-2)
    expect(history.map(m => m.message_kind)).toEqual(['User Text', 'Booking Update'])
    expect(Date.parse(history[1].sent_at)).toBeGreaterThan(Date.parse(history[0].sent_at))
  })

  it('spec-IAC #38 / spec-BKG #13, #56 (error): a Booking event queued behind a Close never writes into the Closed Chat; it opens a new Active one', async () => {
    const { chat_session_id: chatId } = await createChatHandoff(AGENCY, EXPERIENCE)
    const closedBefore = (await getChatHistory(PROVIDER, chatId)).message_history.length
    const [, created] = await Promise.all([
      closeChat(AGENCY, chatId, {}, { afterStatusCheck: pause }),
      createBooking(PROVIDER, booking('2026-10-12T13:00:00+07:00'), at('2026-09-29T17:00:00.000Z')),
    ])
    expect((await getChatHistory(PROVIDER, chatId)).message_history).toHaveLength(closedBefore)
    const active = await activePairChats(AGENCY_ID, PROVIDER_ID)
    expect(active).toHaveLength(1)
    expect(active[0].chat_session_id).not.toBe(chatId)
    expect(repo().all('chat_messages').some(m => m.chat_session_id === active[0].chat_session_id && m.booking_id === created.booking_id)).toBe(true)
  })
})
