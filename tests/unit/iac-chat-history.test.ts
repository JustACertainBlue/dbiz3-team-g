// T016: F-CHAT-03 history and unread reset (FR-003, BR-014, BR-015, BR-017, SC-007, SC-008, Q6, #23, #28).
import { beforeEach, describe, expect, it } from 'vitest'
import { getChatHistory, openChat } from '@/lib/iac/chat-service'
import { AGENCY, EXPERIENCE, PROVIDER, PROVIDER_CHAT, PROVIDER_USER, participant, repo, writeSnapshot } from './iac-fixtures'

const SONG_HONG_USER = '242e10ad-ff4d-5aa3-a3be-9e3f6d710235'

// 120 messages one minute apart from 2026-09-24 09:00 +07:00, plus two with the same sent_at (Q6 tie-break).
function longHistory() {
  for (let i = 0; i < 120; i += 1) {
    const at = new Date(Date.parse('2026-09-24T02:00:00Z') + i * 60_000).toISOString()
    repo().insert('chat_messages', {
      message_id: `m-${String(i).padStart(3, '0')}`, chat_session_id: PROVIDER_CHAT, sender_user_id: SONG_HONG_USER,
      text: `Tin ${i}`, message_kind: 'User Text', experience_id: '', quote_request_id: '', booking_id: '', sent_at: at,
    })
  }
  for (const id of ['tie-b', 'tie-a']) {
    repo().insert('chat_messages', {
      message_id: id, chat_session_id: PROVIDER_CHAT, sender_user_id: SONG_HONG_USER, text: id,
      message_kind: 'User Text', experience_id: '', quote_request_id: '', booking_id: '', sent_at: '2026-09-25T09:00:00+07:00',
    })
  }
}

describe('T016 | getChatHistory', () => {
  beforeEach(() => repo().reset())

  it('returns one seed message with context ids and read-only attachment metadata (#28, FR-003)', async () => {
    const history = await getChatHistory(PROVIDER, PROVIDER_CHAT)
    expect(history).toMatchObject({ chat_session_id: PROVIDER_CHAT, chat_status: 'Active', has_more_messages: false })
    expect(history.message_history).toEqual([{
      message_id: '9f42b859-f056-52f2-8a86-57284255ab73', message_kind: 'Attachment', text: 'Tệp thông tin đoàn khách.',
      sender_name: 'Chu Nhật Minh', sent_at: '2026-09-23T10:00:00+07:00',
      experience_id: EXPERIENCE, booking_id: '5782011c-b56d-5b61-bc01-80dd210c769c',
      attachments: [{ attachment_id: 'ce1092ad-7690-5ee9-b4b2-c8182ed7390b', file_name: 'Tai-lieu-chatfile-5.pdf', file_type: 'application/pdf', file_size: 240000 }],
    }])
  })

  it('pages 50 at a time, oldest → newest, with before_cursor and has_more_messages (BR-014, BR-015, SC-008, Q6)', async () => {
    longHistory() // seed message + 120 + 2 = 123
    const first = await getChatHistory(PROVIDER, PROVIDER_CHAT)
    expect(first.message_history).toHaveLength(50)
    expect(first.has_more_messages).toBe(true)
    expect(first.message_history.slice(-2).map(m => m.message_id)).toEqual(['tie-a', 'tie-b'])
    expect(first.message_history[0].message_id).toBe('m-072')
    const second = await getChatHistory(PROVIDER, PROVIDER_CHAT, { beforeCursor: first.message_history[0].message_id })
    expect(second.message_history.map(m => m.message_id)).toEqual(Array.from({ length: 50 }, (_, i) => `m-${String(i + 22).padStart(3, '0')}`))
    expect(second.has_more_messages).toBe(true)
    const third = await getChatHistory(PROVIDER, PROVIDER_CHAT, { beforeCursor: second.message_history[0].message_id })
    expect(third.message_history).toHaveLength(23)
    expect(third.message_history[0].message_id).toBe('9f42b859-f056-52f2-8a86-57284255ab73')
    expect(third.has_more_messages).toBe(false)
  })

  it('returns an empty history for a Chat without messages', async () => {
    const opened = await openChat(AGENCY, { source: 'Explore', experienceId: EXPERIENCE })
    expect(await getChatHistory(AGENCY, opened.chat_session_id)).toMatchObject({ message_history: [], has_more_messages: false })
  })

  it('names a Booking Update without sender "Hệ thống" and returns its booking_id (#28)', async () => {
    repo().insert('chat_messages', {
      message_id: 'bkg-1', chat_session_id: PROVIDER_CHAT, sender_user_id: '', text: 'Booking On hold: …', message_kind: 'Booking Update',
      experience_id: EXPERIENCE, quote_request_id: '', booking_id: 'b-1', sent_at: '2026-09-25T09:00:00+07:00',
    })
    const last = (await getChatHistory(PROVIDER, PROVIDER_CHAT)).message_history.at(-1)!
    expect(last).toMatchObject({ message_id: 'bkg-1', sender_name: 'Hệ thống', booking_id: 'b-1', experience_id: EXPERIENCE })
  })

  it('first page resets the reader unread to 0 and last_read_message_id to the newest message; older pages write nothing (BR-017, SC-007, #23)', async () => {
    longHistory()
    await getChatHistory(PROVIDER, PROVIDER_CHAT)
    expect(participant(PROVIDER_CHAT, PROVIDER_USER)).toMatchObject({ unread_count: '0', last_read_message_id: 'tie-b' })
    expect(participant(PROVIDER_CHAT, SONG_HONG_USER)!.unread_count).toBe('0')
    repo().update('chat_participants', p => p.chat_session_id === PROVIDER_CHAT && p.user_id === PROVIDER_USER, { unread_count: '3' })
    const before = writeSnapshot()
    await getChatHistory(PROVIDER, PROVIDER_CHAT, { beforeCursor: 'm-072' })
    expect(writeSnapshot()).toBe(before)
  })

  it('rejects an unknown cursor or a cursor of another Chat with 400, nothing written', async () => {
    const before = writeSnapshot()
    await expect(getChatHistory(PROVIDER, PROVIDER_CHAT, { beforeCursor: 'nope' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 })
    const otherChatMessage = repo().all('chat_messages').find(m => m.chat_session_id !== PROVIDER_CHAT)!.message_id
    await expect(getChatHistory(PROVIDER, PROVIDER_CHAT, { beforeCursor: otherChatMessage })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(writeSnapshot()).toBe(before)
  })

  it('denies a non-participant with 403 and writes nothing (BR-002, #27, lesson #15)', async () => {
    const before = writeSnapshot()
    await expect(getChatHistory(AGENCY, PROVIDER_CHAT)).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
    expect(writeSnapshot()).toBe(before)
  })
})
