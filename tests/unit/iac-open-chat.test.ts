// T011: F-CHAT-01 open or reuse the pair's Active Chat (FR-001, BR-004, BR-012, BR-018, BR-021,
// AC-IAC-PAIR, AC-IAC-CLOSED, SC-001, SC-010, #19, #21).
import { beforeEach, describe, expect, it } from 'vitest'
import { openChat } from '@/lib/iac/chat-service'
import { AGENCY, AGENCY_ID, AGENCY_USER, EXPERIENCE, PROVIDER_ID, activePairChats, closeChat, repo } from './iac-fixtures'

const MATCHING = 'fb8dee73-96ba-56c1-b6d1-17041b6ed031' // demo Agency's seed Matching Session
const chatRow = (id: string) => repo().find('chat_sessions', row => row.chat_session_id === id)!

describe('T011 | openChat', () => {
  beforeEach(() => repo().reset())

  it('creates one Active pair Chat with two participants, then reuses it', async () => {
    const first = await openChat(AGENCY, { source: 'Explore', experienceId: EXPERIENCE })
    expect(first).toEqual({ chat_session_id: expect.any(String), chat_status: 'Active', is_new_session: true })
    expect(chatRow(first.chat_session_id)).toMatchObject({ agency_id: AGENCY_ID, provider_id: PROVIDER_ID, source: 'Explore', status: 'Active' })
    expect(repo().all('chat_participants').filter(p => p.chat_session_id === first.chat_session_id)).toHaveLength(2)

    const second = await openChat(AGENCY, { source: 'Explore', experienceId: EXPERIENCE })
    expect(second).toEqual({ chat_session_id: first.chat_session_id, chat_status: 'Active', is_new_session: false })
    expect(activePairChats(AGENCY_ID, PROVIDER_ID)).toHaveLength(1)
  })

  it('stores matching_session_id for AI Matching (#19)', async () => {
    const opened = await openChat(AGENCY, { source: 'AI Matching', experienceId: EXPERIENCE, matchingSessionId: MATCHING })
    expect(chatRow(opened.chat_session_id)).toMatchObject({ source: 'AI Matching', matching_session_id: MATCHING })
  })

  it('on reuse keeps source and matching_session_id, and sets the context ids of the latest handoff (#21, BR-012)', async () => {
    const first = await openChat(AGENCY, { source: 'AI Matching', experienceId: EXPERIENCE, matchingSessionId: MATCHING })
    repo().update('chat_sessions', row => row.chat_session_id === first.chat_session_id, { quote_request_id: 'old-quote' })
    await openChat(AGENCY, { source: 'Provider Profile', experienceId: EXPERIENCE })
    expect(chatRow(first.chat_session_id)).toMatchObject({
      source: 'AI Matching', matching_session_id: MATCHING, experience_id: EXPERIENCE, quote_request_id: '', booking_id: '',
    })
  })

  it('creates a new Active Chat after the pair Chat was Closed and leaves the Closed row unchanged (BR-021, AC-IAC-CLOSED)', async () => {
    const first = await openChat(AGENCY, { source: 'Explore', experienceId: EXPERIENCE })
    closeChat(first.chat_session_id, AGENCY_USER)
    const closedBefore = chatRow(first.chat_session_id)
    const second = await openChat(AGENCY, { source: 'Explore', experienceId: EXPERIENCE })
    expect(second.is_new_session).toBe(true)
    expect(second.chat_session_id).not.toBe(first.chat_session_id)
    expect(chatRow(first.chat_session_id)).toEqual(closedBefore)
    expect(activePairChats(AGENCY_ID, PROVIDER_ID)).toHaveLength(1)
  })

  it('never creates or changes a Booking (BR-018, SC-010)', async () => {
    const bookings = JSON.stringify(repo().all('bookings'))
    await openChat(AGENCY, { source: 'Explore', experienceId: EXPERIENCE })
    expect(JSON.stringify(repo().all('bookings'))).toBe(bookings)
  })

  it('rejects an Experience-source open without experienceId and a Quote Request source (Q5)', async () => {
    await expect(openChat(AGENCY, { source: 'Explore' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 })
    await expect(openChat(AGENCY, { source: 'Quote Request', experienceId: EXPERIENCE })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })
})
