// T002, T003: F-CHAT-04 close (FR-004, BR-019, BR-020, BR-021, SC-011, SC-012, SC-013, #29–#32, #37).
import { beforeEach, describe, expect, it } from 'vitest'
import { demoSessionContextFor } from '@/lib/auth/session'
import { closeChat } from '@/lib/iac/chat-service'
import { AGENCY, AGENCY_CHAT, AGENCY_USER, PROVIDER, PROVIDER_CHAT, PROVIDER_USER, repo } from './iac-fixtures'

const SUCCESS = 'Đã đóng hội thoại. Lịch sử vẫn được lưu; lần trao đổi sau sẽ mở hội thoại mới.'
const TABLES = ['chat_sessions', 'chat_participants', 'chat_messages', 'chat_attachments', 'audit_logs', 'bookings'] as const
const snapshot = () => JSON.stringify(TABLES.map(t => repo().all(t)))
const chatRow = (id: string) => repo().find('chat_sessions', r => r.chat_session_id === id)!
const auditFor = (id: string) => repo().all('audit_logs').filter(a => a.action === 'chat.close' && a.target_id === id)
const messagesOf = (id: string) => JSON.stringify(repo().all('chat_messages').filter(m => m.chat_session_id === id))
const participantsOf = (id: string) => JSON.stringify(repo().all('chat_participants').filter(p => p.chat_session_id === id))

describe('T002 | closeChat', () => {
  beforeEach(() => repo().reset())

  it('the Agency user closes its Chat; output, row and audit row (FR-004, BR-019, SC-011, #30, #32)', async () => {
    const result = await closeChat(AGENCY, AGENCY_CHAT, { closeReason: '  Đã chốt lịch  ' })
    expect(result).toEqual({ chat_session_id: AGENCY_CHAT, chat_status: 'Closed', closed_at: expect.any(String), closed_by: AGENCY_USER, success_message: SUCCESS })
    expect(chatRow(AGENCY_CHAT)).toMatchObject({ status: 'Closed', closed_at: result.closed_at, closed_by: AGENCY_USER })
    const [audit, ...more] = auditFor(AGENCY_CHAT)
    expect(more).toHaveLength(0)
    expect(audit).toMatchObject({ actor_user_id: AGENCY_USER, target_type: 'chat_session', occurred_at: result.closed_at })
    expect(JSON.parse(audit.change_or_result)).toEqual({ from: 'Active', to: 'Closed', close_reason: 'Đã chốt lịch' })
  })

  it('the Provider user closes its Chat without a reason; whitespace reason = none (SC-011, #30)', async () => {
    const result = await closeChat(PROVIDER, PROVIDER_CHAT, { closeReason: '   ' })
    expect(result.closed_by).toBe(PROVIDER_USER)
    expect(JSON.parse(auditFor(PROVIDER_CHAT)[0].change_or_result)).toEqual({ from: 'Active', to: 'Closed' })
  })

  it('accepts 500 code points and rejects 501 or a non-string reason with 400 (#30)', async () => {
    await expect(closeChat(PROVIDER, PROVIDER_CHAT, { closeReason: 'ố'.repeat(501) })).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 })
    await expect(closeChat(PROVIDER, PROVIDER_CHAT, { closeReason: 42 as never })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    await expect(closeChat(PROVIDER, PROVIDER_CHAT, { closeReason: 'ố'.repeat(500) })).resolves.toMatchObject({ chat_status: 'Closed' })
  })

  it('closed_at is not earlier than the latest message (schema chat_message_not_closed, R1)', async () => {
    repo().insert('chat_messages', {
      message_id: 'future', chat_session_id: PROVIDER_CHAT, sender_user_id: PROVIDER_USER, text: 'x', message_kind: 'User Text',
      experience_id: '', quote_request_id: '', booking_id: '', sent_at: '2099-01-01T00:00:00.000Z',
    })
    const result = await closeChat(PROVIDER, PROVIDER_CHAT, {})
    expect(Date.parse(result.closed_at)).toBeGreaterThanOrEqual(Date.parse('2099-01-01T00:00:00.000Z'))
  })

  it('adds no message, keeps unread counts, messages and attachments unchanged (#37, BR-020, SC-013)', async () => {
    const messages = messagesOf(PROVIDER_CHAT)
    const participants = participantsOf(PROVIDER_CHAT)
    const attachments = JSON.stringify(repo().all('chat_attachments'))
    await closeChat(PROVIDER, PROVIDER_CHAT, {})
    expect(messagesOf(PROVIDER_CHAT)).toBe(messages)
    expect(participantsOf(PROVIDER_CHAT)).toBe(participants)
    expect(JSON.stringify(repo().all('chat_attachments'))).toBe(attachments)
  })
})

describe('T003 | closeChat refused, nothing written (BR-021, SC-012, #29, #31, lesson #15)', () => {
  beforeEach(() => repo().reset())

  it('closing a Closed Chat → 409 CHAT_CLOSED; closed_at / closed_by / audit unchanged', async () => {
    await closeChat(AGENCY, AGENCY_CHAT, {})
    const before = snapshot()
    await expect(closeChat(AGENCY, AGENCY_CHAT, {})).rejects.toMatchObject({ code: 'CHAT_CLOSED', statusCode: 409 })
    expect(snapshot()).toBe(before)
  })

  const denied: Array<[string, () => Promise<unknown>]> = [
    ['a non-participant Agency', () => closeChat(AGENCY, PROVIDER_CHAT, {})],
    ['an unknown Chat id', () => closeChat(PROVIDER, 'no-such-chat', {})],
    ['Guest', async () => closeChat((await demoSessionContextFor('guest')), PROVIDER_CHAT, {})],
    ['UBND', async () => closeChat((await demoSessionContextFor('ubnd')), PROVIDER_CHAT, {})],
    ['HDT', async () => closeChat((await demoSessionContextFor('hdt')), PROVIDER_CHAT, {})],
  ]
  for (const [name, run] of denied) {
    it(`${name} → 403 FORBIDDEN`, async () => {
      const before = snapshot()
      await expect(((run()))).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
      expect(snapshot()).toBe(before)
    })
  }
})
