// T005: Close, Send and Open at the same time (#38, Q9, lesson #13). Seams pause between the status check and the write.
import { beforeEach, describe, expect, it } from 'vitest'
import { closeChat, sendMessage } from '@/lib/iac/chat-service'
import { createChatHandoff } from '@/lib/demo/commercial-handoff-service'
import { AGENCY, AGENCY_ID, EXPERIENCE, PROVIDER, PROVIDER_CHAT, PROVIDER_ID, activePairChats, repo } from './iac-fixtures'

const pause = () => new Promise<void>(resolve => setTimeout(resolve, 20))
const messagesOf = (id: string) => repo().all('chat_messages').filter(m => m.chat_session_id === id)

describe('T005 | close races', () => {
  beforeEach(() => repo().reset())

  it('(a) a send already past its check is stored before closed_at', async () => {
    const [sent, closed] = await Promise.all([
      sendMessage(PROVIDER, PROVIDER_CHAT, 'Tin cuối', { afterStatusCheck: pause }),
      closeChat(PROVIDER, PROVIDER_CHAT, {}),
    ])
    expect(Date.parse(sent.sent_at)).toBeLessThanOrEqual(Date.parse(closed.closed_at))
    expect(messagesOf(PROVIDER_CHAT).some(m => m.message_id === sent.message_id)).toBe(true)
  })

  it('(b) a send during a paused close is refused with 409 and stores nothing', async () => {
    const before = messagesOf(PROVIDER_CHAT).length
    const results = await Promise.allSettled([
      closeChat(PROVIDER, PROVIDER_CHAT, {}, { afterStatusCheck: pause }),
      sendMessage(PROVIDER, PROVIDER_CHAT, 'Quá muộn'),
    ])
    expect(results[0].status).toBe('fulfilled')
    expect(results[1]).toMatchObject({ status: 'rejected', reason: { code: 'CHAT_CLOSED' } })
    expect(messagesOf(PROVIDER_CHAT)).toHaveLength(before)
  })

  it('(c) an open during a paused close gets a new Active Chat; the Closed Chat gets no message', async () => {
    const first = await createChatHandoff(AGENCY, EXPERIENCE)
    const closedMessages = messagesOf(first.chat_session_id).length
    const [, handoff] = await Promise.all([
      closeChat(PROVIDER, first.chat_session_id, {}, { afterStatusCheck: pause }),
      createChatHandoff(AGENCY, EXPERIENCE),
    ])
    expect(handoff.chat_session_id).not.toBe(first.chat_session_id)
    expect(handoff.is_new_session).toBe(true)
    expect(messagesOf(first.chat_session_id)).toHaveLength(closedMessages)
    expect(activePairChats(AGENCY_ID, PROVIDER_ID).map(c => c.chat_session_id)).toEqual([handoff.chat_session_id])
  })

  it('(d) two closes at once: one succeeds, one gets 409; one audit row', async () => {
    const results = await Promise.allSettled([
      closeChat(PROVIDER, PROVIDER_CHAT, {}, { afterStatusCheck: pause }),
      closeChat(PROVIDER, PROVIDER_CHAT, {}, { afterStatusCheck: pause }),
    ])
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.find(r => r.status === 'rejected')).toMatchObject({ reason: { code: 'CHAT_CLOSED' } })
    expect(repo().all('audit_logs').filter(a => a.action === 'chat.close' && a.target_id === PROVIDER_CHAT)).toHaveLength(1)
  })
})
