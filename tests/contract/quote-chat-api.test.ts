/**
 * T023 — Request Quote uniqueness, chat session reuse, and zero booking creation
 * Covers: FR-011, BR-009, BR-010, BR-018, BR-019
 *
 * CONSTITUTION II: Must FAIL before T026/T027 implementations.
 */
import { describe, it, expect } from 'vitest'
import {
  createOrReuseQuoteRequest,
  openOrReuseChat,
  countBookingsForAgency,
} from '@/lib/matching/handoff-service'

describe('T023 | Commercial Handoff — Quote & Chat (FR-011, BR-009, BR-010, BR-018, BR-019)', () => {
  const agencyId = 'agency-test-001'
  const providerId = 'prov-test-001'
  const experienceId = 'exp-test-001'
  const sessionId = 'session-test-001'

  it('FR-011 / BR-018: creates a new quote_request for first Request Quote action', async () => {
    const result = await createOrReuseQuoteRequest({ agencyId, experienceId, sessionId })
    expect(result.quote_request_id).toBeTruthy()
    expect(result.is_new_request).toBe(true)
  })

  it('BR-018: reuses the same quote_request_id on second Request Quote for same (agency, experience)', async () => {
    const first = await createOrReuseQuoteRequest({ agencyId, experienceId, sessionId })
    const second = await createOrReuseQuoteRequest({ agencyId, experienceId, sessionId })
    expect(second.quote_request_id).toBe(first.quote_request_id)
    expect(second.is_new_request).toBe(false)
  })

  it('BR-009 / BR-010: NO booking is created when Request Quote is triggered', async () => {
    await createOrReuseQuoteRequest({ agencyId, experienceId, sessionId })
    const bookings = await countBookingsForAgency(agencyId)
    expect(bookings).toBe(0)
  })

  it('BR-019: creates a new chat session when no active chat exists between agency and provider', async () => {
    const uniqueAgencyId = 'agency-unique-001'
    const result = await openOrReuseChat({ agencyId: uniqueAgencyId, providerId, contextMessage: 'Interested in pottery' })
    expect(result.chat_session_id).toBeTruthy()
    expect(result.is_new_session).toBe(true)
  })

  it('BR-019: reuses existing active chat for same agency-provider pair', async () => {
    const uniqueAgencyId = 'agency-unique-002'
    const first = await openOrReuseChat({ agencyId: uniqueAgencyId, providerId, contextMessage: 'First message' })
    const second = await openOrReuseChat({ agencyId: uniqueAgencyId, providerId, contextMessage: 'New context' })
    expect(second.chat_session_id).toBe(first.chat_session_id)
    expect(second.is_new_session).toBe(false)
  })

  it('FR-011: direct Chat handoff does NOT create a quote_request', async () => {
    const uniqueAgency = 'agency-chat-only-001'
    const chat = await openOrReuseChat({ agencyId: uniqueAgency, providerId, contextMessage: 'Just browsing' })
    expect(chat.chat_session_id).toBeTruthy()
    // No quote created in this path
    expect((chat as unknown as Record<string, unknown>).quote_request_id).toBeUndefined()
  })
})
