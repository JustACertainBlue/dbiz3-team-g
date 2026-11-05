// T012: F-CHAT-01 from a Booking (FR-001 Provider needs a Booking context, Q5, #24, edge "Booking outside scope").
import { beforeEach, describe, expect, it } from 'vitest'
import { openChat } from '@/lib/iac/chat-service'
import { AGENCY, AGENCY_BOOKING, AGENCY_CHAT, EXPERIENCE, PROVIDER, repo, writeSnapshot } from './iac-fixtures'

describe('T012 | openChat with source Booking', () => {
  beforeEach(() => repo().reset())

  it('Agency reuses the pair Chat of its Booking without adding a message (#24)', async () => {
    const messages = repo().all('chat_messages').length
    const opened = await openChat(AGENCY, { source: 'Booking', bookingId: AGENCY_BOOKING })
    expect(opened).toEqual({ chat_session_id: AGENCY_CHAT, chat_status: 'Active', is_new_session: false })
    expect(repo().all('chat_messages')).toHaveLength(messages)
    expect(repo().find('chat_sessions', row => row.chat_session_id === AGENCY_CHAT)?.booking_id).toBe(AGENCY_BOOKING)
  })

  const denied: Array<[string, () => Promise<unknown>, string]> = [
    ['Provider on a Booking of another Provider', () => openChat(PROVIDER, { source: 'Booking', bookingId: AGENCY_BOOKING }), 'FORBIDDEN'],
    ['unknown Booking', () => openChat(AGENCY, { source: 'Booking', bookingId: 'no-such-booking' }), 'NOT_FOUND'],
    ['Provider with source Explore (Q5)', () => openChat(PROVIDER, { source: 'Explore', experienceId: EXPERIENCE }), 'FORBIDDEN'],
    ['Provider with source Quote Request (Q5)', () => openChat(PROVIDER, { source: 'Quote Request' }), 'FORBIDDEN'],
    ['missing bookingId', () => openChat(AGENCY, { source: 'Booking' }), 'VALIDATION_ERROR'],
  ]
  for (const [name, run, code] of denied) {
    it(`${name} → ${code}, nothing written (lesson #15)`, async () => {
      const before = writeSnapshot()
      await expect(run()).rejects.toMatchObject({ code })
      expect(writeSnapshot()).toBe(before)
    })
  }
})
