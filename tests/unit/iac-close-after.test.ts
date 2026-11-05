// T004: after a Close (BR-021, SC-013, SC-014, AC-IAC-NAV, AC-IAC-CLOSED, #34, #35).
import { beforeEach, describe, expect, it } from 'vitest'
import { closeChat, getChatHistory, listChats, openChat, sendMessage } from '@/lib/iac/chat-service'
import { createChatHandoff } from '@/lib/demo/commercial-handoff-service'
import { AGENCY, AGENCY_BOOKING, AGENCY_CHAT, AGENCY_ID, EXPERIENCE, PROVIDER, PROVIDER_CHAT, PROVIDER_ID, activePairChats, repo } from './iac-fixtures'

const chatRow = (id: string) => repo().find('chat_sessions', r => r.chat_session_id === id)!

describe('T004 | after close', () => {
  beforeEach(() => repo().reset())

  it('send → 409 CHAT_CLOSED (SC-014)', async () => {
    await closeChat(PROVIDER, PROVIDER_CHAT, {})
    await expect(sendMessage(PROVIDER, PROVIDER_CHAT, 'Còn đó không?')).rejects.toMatchObject({ code: 'CHAT_CLOSED', statusCode: 409 })
  })

  it('history stays readable with closed_at and closed_by_name; reading does not reopen (#34, SC-013, SC-014)', async () => {
    const before = await getChatHistory(AGENCY, AGENCY_CHAT)
    expect(before).not.toHaveProperty('closed_at')
    expect(before).not.toHaveProperty('closed_by_name')
    const closed = await closeChat(AGENCY, AGENCY_CHAT, {})
    const after = await getChatHistory(AGENCY, AGENCY_CHAT)
    expect(after).toMatchObject({ chat_status: 'Closed', closed_at: closed.closed_at, closed_by_name: 'Lý Gia Hân' })
    expect(after.message_history).toEqual(before.message_history)
    expect(chatRow(AGENCY_CHAT).status).toBe('Closed')
  })

  it('the Closed Chat stays in the list as Closed (#35)', async () => {
    await closeChat(PROVIDER, PROVIDER_CHAT, {})
    expect(listChats(PROVIDER).find(c => c.chat_session_id === PROVIDER_CHAT)?.chat_status).toBe('Closed')
  })

  it('list and history reads never close an Active Chat (AC-IAC-NAV)', async () => {
    listChats(PROVIDER)
    await getChatHistory(PROVIDER, PROVIDER_CHAT)
    expect(chatRow(PROVIDER_CHAT).status).toBe('Active')
  })

  it('after close, an Explore handoff opens a new Active Chat and the Closed row is unchanged (AC-IAC-CLOSED, #35)', async () => {
    const first = await createChatHandoff(AGENCY, EXPERIENCE)
    await closeChat(PROVIDER, first.chat_session_id, {})
    const closedRow = JSON.stringify(chatRow(first.chat_session_id))
    const second = await createChatHandoff(AGENCY, EXPERIENCE)
    expect(second).toMatchObject({ is_new_session: true, chat_status: 'Active' })
    expect(second.chat_session_id).not.toBe(first.chat_session_id)
    expect(JSON.stringify(chatRow(first.chat_session_id))).toBe(closedRow)
    expect(activePairChats(AGENCY_ID, PROVIDER_ID)).toHaveLength(1)
  })

  it('after close, opening from the Booking creates a new Active Chat (#35)', async () => {
    await closeChat(AGENCY, AGENCY_CHAT, {})
    const opened = await openChat(AGENCY, { source: 'Booking', bookingId: AGENCY_BOOKING })
    expect(opened.is_new_session).toBe(true)
    expect(opened.chat_session_id).not.toBe(AGENCY_CHAT)
    expect(chatRow(AGENCY_CHAT).status).toBe('Closed')
  })
})
