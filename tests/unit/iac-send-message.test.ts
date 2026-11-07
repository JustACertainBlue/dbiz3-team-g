// T014: F-CHAT-02 send (FR-002, BR-002, BR-006, BR-017, BR-018, BR-021, SC-003, SC-014, #25, #26).
import { beforeEach, describe, expect, it } from 'vitest'
import { sendMessage } from '@/lib/iac/chat-service'
import { AGENCY, PROVIDER, PROVIDER_CHAT, PROVIDER_USER, closeChat, participant, repo, writeSnapshot } from './iac-fixtures'

const SONG_HONG_USER = '242e10ad-ff4d-5aa3-a3be-9e3f6d710235'
const messagesOf = (chatId: string) => repo().all('chat_messages').filter(m => m.chat_session_id === chatId)

describe('T014 | sendMessage', () => {
  beforeEach(() => repo().reset())

  it('stores the trimmed text as User Text with sender and time, and updates last_message_at (FR-002, SC-003)', async () => {
    const result = await sendMessage(PROVIDER, PROVIDER_CHAT, '  Xin chào  ')
    expect(result).toEqual({ message_id: expect.any(String), sent_at: expect.any(String), last_message_timestamp: result.sent_at })
    const stored = repo().find('chat_messages', m => m.message_id === result.message_id)
    expect(stored).toMatchObject({ chat_session_id: PROVIDER_CHAT, text: 'Xin chào', message_kind: 'User Text', sender_user_id: PROVIDER_USER, sent_at: result.sent_at })
    expect(repo().find('chat_sessions', c => c.chat_session_id === PROVIDER_CHAT)?.last_message_at).toBe(result.sent_at)
  })

  it('adds 1 to the other participant only (BR-017, #26)', async () => {
    const other = Number(participant(PROVIDER_CHAT, SONG_HONG_USER)!.unread_count)
    const own = participant(PROVIDER_CHAT, PROVIDER_USER)!.unread_count
    await sendMessage(PROVIDER, PROVIDER_CHAT, 'Một')
    expect(participant(PROVIDER_CHAT, SONG_HONG_USER)!.unread_count).toBe(String(other + 1))
    expect(participant(PROVIDER_CHAT, PROVIDER_USER)!.unread_count).toBe(own)
  })

  it('accepts 4000 code points (Vietnamese letters included) and rejects 4001 (#25)', async () => {
    await expect(sendMessage(PROVIDER, PROVIDER_CHAT, 'ố'.repeat(4000))).resolves.toBeDefined()
    await expect(sendMessage(PROVIDER, PROVIDER_CHAT, `  ${'a'.repeat(4000)}  `)).resolves.toBeDefined()
    await expect(sendMessage(PROVIDER, PROVIDER_CHAT, 'ố'.repeat(4001))).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 })
  })

  const rejected: Array<[string, () => void, () => Promise<unknown>, string, number]> = [
    ['empty text', () => {}, () => sendMessage(PROVIDER, PROVIDER_CHAT, ''), 'VALIDATION_ERROR', 400],
    ['whitespace-only text', () => {}, () => sendMessage(PROVIDER, PROVIDER_CHAT, '   \n '), 'VALIDATION_ERROR', 400],
    ['4001 characters', () => {}, () => sendMessage(PROVIDER, PROVIDER_CHAT, 'a'.repeat(4001)), 'VALIDATION_ERROR', 400],
    ['a Closed Chat (BR-021, SC-014)', () => closeChat(PROVIDER_CHAT, PROVIDER_USER), () => sendMessage(PROVIDER, PROVIDER_CHAT, 'Còn đó không?'), 'CHAT_CLOSED', 409],
    ['a non-participant (BR-002)', () => {}, () => sendMessage(AGENCY, PROVIDER_CHAT, 'Xin chào'), 'FORBIDDEN', 403],
  ]
  for (const [name, arrange, run, code, status] of rejected) {
    it(`${name} → ${status} ${code}, nothing written (lesson #15)`, async () => {
      arrange()
      const before = writeSnapshot()
      await expect(((run()))).rejects.toMatchObject({ code, statusCode: status })
      expect(writeSnapshot()).toBe(before)
    })
  }

  it('leaves earlier messages and all Bookings unchanged (BR-006, BR-018)', async () => {
    const earlier = JSON.stringify(messagesOf(PROVIDER_CHAT))
    const bookings = JSON.stringify(repo().all('bookings'))
    await sendMessage(PROVIDER, PROVIDER_CHAT, 'Tin mới')
    expect(JSON.stringify(messagesOf(PROVIDER_CHAT).slice(0, -1))).toBe(earlier)
    expect(JSON.stringify(repo().all('bookings'))).toBe(bookings)
  })
})
