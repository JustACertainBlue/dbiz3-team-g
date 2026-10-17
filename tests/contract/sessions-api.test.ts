/**
 * T010 — Matching session creation and message history (FR-001, FR-002, BR-016)
 *
 * CONSTITUTION II: Must FAIL before T013/T014 route implementations.
 */
import { describe, it, expect } from 'vitest'
import { createMatchingSession, addMessage, getMessages } from '@/lib/matching/session-service'

describe('T010 | Session Creation & Message History (FR-001, FR-002, BR-016)', () => {
  it('FR-001 / BR-016: creates a matching session for an authenticated agency', async () => {
    const session = await createMatchingSession('agency-001')
    expect(session.matching_session_id).toBeTruthy()
    expect(session.agency_id).toBe('agency-001')
    expect(session.started_at).toBeInstanceOf(Date)
    expect(session.last_activity_at).toBeInstanceOf(Date)
  })

  it('BR-016: last_activity_at >= started_at on creation', async () => {
    const session = await createMatchingSession('agency-002')
    expect(session.last_activity_at.getTime()).toBeGreaterThanOrEqual(
      session.started_at.getTime()
    )
  })

  it('FR-002: stores an Agency message in the session', async () => {
    const session = await createMatchingSession('agency-003')
    const msg = await addMessage(session.matching_session_id, 'Agency', 'I need a silk workshop')
    expect(msg.message_id).toBeTruthy()
    expect(msg.sender).toBe('Agency')
    expect(msg.text).toBe('I need a silk workshop')
  })

  it('FR-002: rejects messages over 2000 characters', async () => {
    const session = await createMatchingSession('agency-004')
    await expect(
      addMessage(session.matching_session_id, 'Agency', 'x'.repeat(2001))
    ).rejects.toThrow()
  })

  it('FR-002: retrieves conversation history for a session', async () => {
    const session = await createMatchingSession('agency-005')
    await addMessage(session.matching_session_id, 'Agency', 'Hello')
    await addMessage(session.matching_session_id, 'Assistant', 'What is your group size?')
    const messages = await getMessages(session.matching_session_id)
    expect(messages).toHaveLength(2)
    expect(messages[0].sender).toBe('Agency')
    expect(messages[1].sender).toBe('Assistant')
  })
})
