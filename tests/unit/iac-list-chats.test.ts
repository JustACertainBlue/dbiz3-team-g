// T015: F-CHAT-03 Chat list (FR-003, BR-002, BR-013, BR-016, SC-006, SC-009, #22).
import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { listChats, sendMessage } from '@/lib/iac/chat-service'
import { AGENCY, AGENCY_CHAT, AGENCY_ID, PROVIDER, PROVIDER_CHAT, PROVIDER_ID, PROVIDER_USER, closeChat, repo } from './iac-fixtures'

describe('T015 | listChats', () => {
  beforeEach(() => repo().reset())

  it('Provider sees exactly its two Chats with name, organization and numeric unread (#22)', () => {
    const list = listChats(PROVIDER)
    expect(list.map(c => c.chat_session_id)).toEqual(['233b012e-4734-5689-86ee-2f4b50300ed3', PROVIDER_CHAT])
    expect(list[1]).toEqual({
      chat_session_id: PROVIDER_CHAT, chat_status: 'Active', participant_name: 'Chu Nhật Minh',
      organization: 'Công ty Du lịch Sông Hồng', last_message_preview: 'Tệp thông tin đoàn khách.',
      last_message_at: '2026-09-23T10:00:00+07:00', unread_count: 5,
    })
  })

  it('Agency sees its Provider Chat with the published business name (#22)', () => {
    expect(listChats(AGENCY)).toEqual([expect.objectContaining({
      chat_session_id: AGENCY_CHAT, participant_name: 'Quách Minh Tâm', organization: 'Xưởng thủ công Phú Vinh', unread_count: 0,
    })])
  })

  it('orders by latest activity, newest first; a send moves the Chat to the top (BR-013, SC-006)', async () => {
    await sendMessage(PROVIDER, PROVIDER_CHAT, 'Mới nhất')
    expect(listChats(PROVIDER)[0]).toMatchObject({ chat_session_id: PROVIDER_CHAT, last_message_preview: 'Mới nhất' })
  })

  it('only lists Chats of the actor and of its role pair (BR-002, BR-016, SC-009)', () => {
    const chats = repo().all('chat_sessions')
    const agencyIds = listChats(AGENCY).map(c => c.chat_session_id)
    const providerIds = listChats(PROVIDER).map(c => c.chat_session_id)
    expect(agencyIds.every(id => chats.find(c => c.chat_session_id === id)!.agency_id === AGENCY_ID)).toBe(true)
    expect(providerIds.every(id => chats.find(c => c.chat_session_id === id)!.provider_id === PROVIDER_ID)).toBe(true)
  })

  it('cuts the preview to 120 characters and lists a Closed Chat as Closed', async () => {
    await sendMessage(PROVIDER, PROVIDER_CHAT, 'x'.repeat(300))
    closeChat(PROVIDER_CHAT, PROVIDER_USER)
    const row = listChats(PROVIDER).find(c => c.chat_session_id === PROVIDER_CHAT)!
    expect([...row.last_message_preview!].length).toBe(120)
    expect(row.chat_status).toBe('Closed')
  })

  for (const key of ['guest', 'ubnd', 'hdt'] as const) {
    it(`${key} is refused (BR-001, #27)`, () => {
      expect(() => listChats(DEMO_IDENTITIES[key])).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }))
    })
  }
})
