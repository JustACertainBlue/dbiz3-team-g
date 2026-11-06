// T013: at most one Active Chat per pair under concurrency (FR-001, edge "same pair opens
// simultaneously", Q9). The seam pauses between the pair check and the write (lesson #13).
import { beforeEach, describe, expect, it } from 'vitest'
import { openChat } from '@/lib/iac/chat-service'
import { createBooking } from '@/lib/booking/create-booking'
import { SEED_NOW } from '@/lib/booking/clock'
import { AGENCY, AGENCY_ID, DEMO_PROVIDER, EXPERIENCE, PROVIDER_ID, activePairChats, repo } from './iac-fixtures'

const pause = () => new Promise<void>(resolve => setTimeout(resolve, 20))
const bookingBody = {
  experience_id: EXPERIENCE, agency_id: AGENCY_ID, start_at: '2026-10-12T09:00:00+07:00', duration: 60, group_size: 10,
  agreed_price: 2000000, booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
}

describe('T013 | concurrent opens for one pair', () => {
  beforeEach(() => repo().reset())

  it('(a) two simultaneous opens create exactly one Chat', async () => {
    const [a, b] = await Promise.all([
      openChat(AGENCY, { source: 'Explore', experienceId: EXPERIENCE }, { afterPairCheck: pause }),
      openChat(AGENCY, { source: 'Explore', experienceId: EXPERIENCE }, { afterPairCheck: pause }),
    ])
    expect(a.chat_session_id).toBe(b.chat_session_id)
    expect([a.is_new_session, b.is_new_session].filter(Boolean)).toHaveLength(1)
    expect(activePairChats(AGENCY_ID, PROVIDER_ID)).toHaveLength(1)
  })

  it('(b) a Booking event during a paused open still leaves one Active Chat, holding the Booking Update', async () => {
    let booking: Promise<unknown> | undefined
    const opened = await openChat(AGENCY, { source: 'Explore', experienceId: EXPERIENCE }, {
      afterPairCheck: async () => {
        booking = createBooking(DEMO_PROVIDER, { ...bookingBody }, { now: () => new Date(SEED_NOW) })
        await pause()
      },
    })
    await booking
    const chats = activePairChats(AGENCY_ID, PROVIDER_ID)
    expect(chats).toHaveLength(1)
    expect(chats[0].chat_session_id).toBe(opened.chat_session_id)
    expect(repo().all('chat_messages').filter(m => m.chat_session_id === opened.chat_session_id && m.message_kind === 'Booking Update')).toHaveLength(1)
  })
})
