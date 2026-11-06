// T006: end to end, a Booking Update after Close goes to a new Active Chat (#36; spec-BKG FR-008 step 3, #13, #56).
import { beforeEach, describe, expect, it } from 'vitest'
import { closeChat } from '@/lib/iac/chat-service'
import { createChatHandoff } from '@/lib/demo/commercial-handoff-service'
import { createBooking } from '@/lib/booking/create-booking'
import { SEED_NOW } from '@/lib/booking/clock'
import { AGENCY, AGENCY_ID, AGENCY_USER, DEMO_PROVIDER, EXPERIENCE, PROVIDER, PROVIDER_ID, PROVIDER_USER, activePairChats, repo } from '../unit/iac-fixtures'

const body = (sourceChat: string) => ({
  experience_id: EXPERIENCE, agency_id: AGENCY_ID, start_at: '2026-10-12T09:00:00+07:00', duration: 60, group_size: 10,
  agreed_price: 2000000, source_chat_session_id: sourceChat,
  booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
})

describe('T006 | Close then Booking (C8)', () => {
  beforeEach(() => repo().reset())

  it('the Booking Update lands in a new Active Booking Chat; the Closed Chat is untouched; Explore then reuses the new Chat', async () => {
    const handoff = await createChatHandoff(AGENCY, EXPERIENCE)
    await closeChat(PROVIDER, handoff.chat_session_id, { closeReason: 'Chuyển sang đặt chỗ' })
    const closedRow = JSON.stringify(repo().find('chat_sessions', c => c.chat_session_id === handoff.chat_session_id))
    const closedMessages = JSON.stringify(repo().all('chat_messages').filter(m => m.chat_session_id === handoff.chat_session_id))

    const created = await createBooking(DEMO_PROVIDER, body(handoff.chat_session_id), { now: () => new Date(SEED_NOW) }) as { booking_id?: string; booking?: { booking_id: string } }
    const update = repo().all('chat_messages').find(m => m.message_kind === 'Booking Update' && m.chat_session_id !== handoff.chat_session_id && m.experience_id === EXPERIENCE)!
    const [active] = activePairChats(AGENCY_ID, PROVIDER_ID)
    expect(activePairChats(AGENCY_ID, PROVIDER_ID)).toHaveLength(1)
    expect(update.chat_session_id).toBe(active.chat_session_id)
    expect(active).toMatchObject({ source: 'Booking', booking_id: update.booking_id })
    expect(repo().all('chat_participants').filter(p => p.chat_session_id === active.chat_session_id).map(p => p.user_id).sort()).toEqual([AGENCY_USER, PROVIDER_USER].sort())
    expect(created).toBeDefined()

    expect(JSON.stringify(repo().find('chat_sessions', c => c.chat_session_id === handoff.chat_session_id))).toBe(closedRow)
    expect(JSON.stringify(repo().all('chat_messages').filter(m => m.chat_session_id === handoff.chat_session_id))).toBe(closedMessages)

    const again = await createChatHandoff(AGENCY, EXPERIENCE)
    expect(again).toMatchObject({ chat_session_id: active.chat_session_id, is_new_session: false })
  })
})
