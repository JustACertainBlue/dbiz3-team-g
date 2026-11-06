// T004: chat access checks (BR-001, BR-002, BR-003, BR-016, spec-IAC #27).
import { beforeEach, describe, expect, it } from 'vitest'
import { demoSessionContextFor } from '@/lib/auth/session'
import { requireChatActor, requireParticipant } from '@/lib/iac/chat-access'
import { AGENCY, PROVIDER, PROVIDER_CHAT, repo } from './iac-fixtures'

const forbidden = expect.objectContaining({ code: 'FORBIDDEN', statusCode: 403 })

describe('T004 | requireChatActor', () => {
  for (const key of ['guest', 'ubnd', 'hdt'] as const) {
    it(`${key} → 403 FORBIDDEN (BR-001, #27)`, () => {
      expect(() => requireChatActor(demoSessionContextFor(key))).toThrow(forbidden)
    })
  }

  it('Tour Agency and Local Provider pass', () => {
    expect(requireChatActor(AGENCY)).toMatchObject({ role: 'Tour_Agency', userId: AGENCY.userId, agencyId: AGENCY.agencyId })
    expect(requireChatActor(PROVIDER)).toMatchObject({ role: 'Local_Provider', userId: PROVIDER.userId, providerId: PROVIDER.providerId })
  })
})

describe('T004 | requireParticipant (BR-002, #27)', () => {
  beforeEach(() => repo().reset())

  it('returns the Chat to its participant', () => {
    expect(requireParticipant(PROVIDER, PROVIDER_CHAT).chat_session_id).toBe(PROVIDER_CHAT)
  })

  it('denies a non-participant and an unknown Chat id with the same 403', () => {
    expect(() => requireParticipant(AGENCY, PROVIDER_CHAT)).toThrow(forbidden)
    expect(() => requireParticipant(PROVIDER, 'no-such-chat')).toThrow(forbidden)
  })

  it('denies a session of the right Provider whose user is not a participant (BR-016)', () => {
    expect(() => requireParticipant({ ...PROVIDER, userId: 'someone-else' }, PROVIDER_CHAT)).toThrow(forbidden)
  })
})
