// T005: one Active Chat per pair lookup and the rows of a new pair Chat (FR-001, #19, schema checks).
import { beforeEach, describe, expect, it } from 'vitest'
import { findActivePairChat, newPairChatOperations } from '@/lib/iac/chat-pairs'
import { AGENCY_CHAT, AGENCY_ID, AGENCY_USER, PHU_VINH, PROVIDER_ID, PROVIDER_USER, repo } from './iac-fixtures'

const AT = '2026-10-01T09:00:00+07:00'

describe('T005 | findActivePairChat', () => {
  beforeEach(() => repo().reset())

  it('finds the Active Chat of a pair', async () => {
    expect((await findActivePairChat(AGENCY_ID, PHU_VINH))?.chat_session_id).toBe(AGENCY_CHAT)
  })

  it('ignores Closed Chats and returns nothing for a pair without Chat', async () => {
    expect((await findActivePairChat('ab81de3b-a65e-5f0d-9407-894ac464a0e9', PHU_VINH))).toBeUndefined()
    expect((await findActivePairChat(AGENCY_ID, PROVIDER_ID))).toBeUndefined()
  })
})

describe('T005 | newPairChatOperations', () => {
  beforeEach(() => repo().reset())

  it('builds one Active chat_sessions row and two participants with unread 0', async () => {
    const { chat, operations } = (await newPairChatOperations({ agencyId: AGENCY_ID, providerId: PROVIDER_ID, source: 'Explore', at: AT }))
    expect(chat).toMatchObject({ agency_id: AGENCY_ID, provider_id: PROVIDER_ID, source: 'Explore', status: 'Active', started_at: AT, closed_at: '', closed_by: '' })
    const inserts = operations.filter(op => 'row' in op) as Array<{ table: string; row: Record<string, string> }>
    expect(inserts.filter(op => op.table === 'chat_sessions')).toHaveLength(1)
    const participants = inserts.filter(op => op.table === 'chat_participants').map(op => op.row)
    expect(participants.map(p => p.user_id).sort()).toEqual([AGENCY_USER, PROVIDER_USER].sort())
    expect(participants.every(p => p.unread_count === '0' && p.chat_session_id === chat.chat_session_id)).toBe(true)
  })

  it('stores matching_session_id for AI Matching and refuses AI Matching without it (chat_matching_link_chk)', async () => {
    const { chat } = (await newPairChatOperations({ agencyId: AGENCY_ID, providerId: PROVIDER_ID, source: 'AI Matching', matchingSessionId: 'ms-1', at: AT }))
    expect(chat.matching_session_id).toBe('ms-1')
    ;(await expect(async () => (await newPairChatOperations({ agencyId: AGENCY_ID, providerId: PROVIDER_ID, source: 'AI Matching', at: AT }))).rejects.toThrow())
  })

  it('refuses a source outside the schema enum (#19, Q2)', async () => {
    ;(await expect(async () => (await newPairChatOperations({ agencyId: AGENCY_ID, providerId: PROVIDER_ID, source: 'Open' as never, at: AT }))).rejects.toThrow())
  })
})
