// T031: BKG Booking Updates land in the pair's one Active Chat (FR-001; fixes research R1).
import { beforeEach, describe, expect, it } from 'vitest'
import { createChatHandoff } from '@/lib/demo/commercial-handoff-service'
import { createBooking } from '@/lib/booking/create-booking'
import { SEED_NOW } from '@/lib/booking/clock'
import { AGENCY, AGENCY_ID, AGENCY_USER, DEMO_PROVIDER, EXPERIENCE, PROVIDER_ID, PROVIDER_USER, activePairChats, repo } from './iac-fixtures'

const body = {
  experience_id: EXPERIENCE, agency_id: AGENCY_ID, start_at: '2026-10-12T09:00:00+07:00', duration: 60, group_size: 10,
  agreed_price: 2000000, booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
}

describe('T031 | Booking sync and the pair Chat', () => {
  beforeEach(() => repo().reset())

  it('after a handoff, a new Booking writes its Booking Update into the same Chat', async () => {
    const handoff = await createChatHandoff(AGENCY, EXPERIENCE)
    await createBooking(DEMO_PROVIDER, { ...body }, { now: () => new Date(SEED_NOW) })
    const chats = activePairChats(AGENCY_ID, PROVIDER_ID)
    expect(chats.map(c => c.chat_session_id)).toEqual([handoff.chat_session_id])
    expect(repo().all('chat_messages').filter(m => m.chat_session_id === handoff.chat_session_id).map(m => m.message_kind)).toEqual(['User Text', 'Booking Update'])
  })

  it('without a Chat, the Booking creates one Active Chat with source Booking and both participants', async () => {
    await createBooking(DEMO_PROVIDER, { ...body }, { now: () => new Date(SEED_NOW) })
    const [chat] = activePairChats(AGENCY_ID, PROVIDER_ID)
    expect(chat).toMatchObject({ source: 'Booking', status: 'Active', closed_at: '', closed_by: '' })
    const users = repo().all('chat_participants').filter(p => p.chat_session_id === chat.chat_session_id)
    expect(users.map(p => p.user_id).sort()).toEqual([AGENCY_USER, PROVIDER_USER].sort())
    expect(users.find(p => p.user_id === AGENCY_USER)!.unread_count).toBe('1')
  })
})
