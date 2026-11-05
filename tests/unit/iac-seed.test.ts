// T003: seed facts of the Session 5 data package (data/seed/chat_*.csv) used by the IAC tests.
import { beforeEach, describe, expect, it } from 'vitest'
import { PROVIDER_CHAT, PROVIDER_USER, participant, repo } from './iac-fixtures'

describe('T003 | IAC seed facts', () => {
  beforeEach(() => repo().reset())

  it('has 8 Chats, 6 Active and 2 Closed, with four source values twice each and no Quote Request', () => {
    const chats = repo().all('chat_sessions')
    expect(chats).toHaveLength(8)
    expect(chats.filter(c => c.status === 'Active')).toHaveLength(6)
    expect(chats.filter(c => c.status === 'Closed')).toHaveLength(2)
    for (const source of ['AI Matching', 'Explore', 'Provider Profile', 'Booking']) {
      expect(chats.filter(c => c.source === source)).toHaveLength(2)
    }
    expect(chats.filter(c => c.source === 'Quote Request')).toHaveLength(0)
  })

  it('has at most one Active Chat per Agency–Provider pair (chat_one_active_pair_uq)', () => {
    const pairs = repo().all('chat_sessions').filter(c => c.status === 'Active').map(c => `${c.agency_id}|${c.provider_id}`)
    expect(new Set(pairs).size).toBe(pairs.length)
  })

  it('gives the demo Provider 5 unread messages in Chat 35ed4094…', () => {
    expect(participant(PROVIDER_CHAT, PROVIDER_USER)?.unread_count).toBe('5')
  })
})
