/**
 * T022 — Validate that zero booking records are created during any chat action (BR-018)
 * Traces to: spec-IAC.md BR-018, FR-001, FR-002, FR-003.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { getSeedAgencies, getSeedProviders } from '@/lib/iac/seed-accessor'
import {
  findOrCreateActiveSession,
  sendMessage,
  listUserChats,
  getSessionMessages,
} from '@/lib/iac/chat-service'

describe('T022 | Chat actions do not create booking records (BR-018)', () => {
  const seedAgencies = getSeedAgencies()
  const seedProviders = getSeedProviders()
  const agency = seedAgencies[0]
  const provider = seedProviders[0]

  beforeEach(() => {
    demoRepository().reset()
    demoRepository().remove(
      'chat_sessions',
      s => s.agency_id === agency.agency_id && s.provider_id === provider.provider_id
    )
  })

  it('guarantees no rows are added to bookings table during any chat lifecycle operation', () => {
    const initialBookingCount = demoRepository().all('bookings').length

    // 1. Open active session
    const sessionResult = findOrCreateActiveSession(
      agency.agency_id,
      provider.provider_id,
      'Explore'
    )
    expect(sessionResult.chat_session_id).toBeTruthy()
    expect(demoRepository().all('bookings').length).toBe(initialBookingCount)

    // 2. Send message from agency
    const msg1 = sendMessage(
      sessionResult.chat_session_id,
      agency.user_id,
      'Can we book for 20 guests next month?'
    )
    expect(msg1.message_id).toBeTruthy()
    expect(demoRepository().all('bookings').length).toBe(initialBookingCount)

    // 3. Send message from provider
    const msg2 = sendMessage(
      sessionResult.chat_session_id,
      provider.user_id,
      'Yes, we can accommodate 20 guests.'
    )
    expect(msg2.message_id).toBeTruthy()
    expect(demoRepository().all('bookings').length).toBe(initialBookingCount)

    // 4. List user chats
    const agencyChats = listUserChats(agency.user_id, 'TourAgency')
    expect(agencyChats.length).toBeGreaterThanOrEqual(1)
    expect(demoRepository().all('bookings').length).toBe(initialBookingCount)

    // 5. Retrieve session messages
    const history = getSessionMessages(sessionResult.chat_session_id, agency.user_id)
    expect(history.message_history.length).toBe(2)
    expect(demoRepository().all('bookings').length).toBe(initialBookingCount)

    // Verify specifically that no booking references this chat session
    const chatBookings = demoRepository()
      .all('bookings')
      .filter(b => b.source_chat_session_id === sessionResult.chat_session_id)
    expect(chatBookings).toHaveLength(0)
  })
})

