// T033: composer rules on COM048 / COM065 (FR-002 ≤ 4000, #25, Q8 Send disabled while pending, BR-021 read-only).
import { describe, expect, it } from 'vitest'
import { composerState } from '@/app/messages/composer-state'

describe('T033 | composerState', () => {
  it('enables Send for valid text on an Active Chat and shows the counter', () => {
    expect(composerState({ text: '  Xin chào ', pending: false, chatStatus: 'Active' })).toEqual({ canSend: true, counter: '8/4000', readOnly: false })
  })

  it('disables Send when empty, over 4000 code points or pending (Q8)', () => {
    expect(composerState({ text: '   ', pending: false, chatStatus: 'Active' }).canSend).toBe(false)
    expect(composerState({ text: 'ố'.repeat(4000), pending: false, chatStatus: 'Active' }).canSend).toBe(true)
    expect(composerState({ text: 'ố'.repeat(4001), pending: false, chatStatus: 'Active' })).toMatchObject({ canSend: false, counter: '4001/4000' })
    expect(composerState({ text: 'Xin chào', pending: true, chatStatus: 'Active' }).canSend).toBe(false)
  })

  it('a Closed Chat is read-only (BR-021)', () => {
    expect(composerState({ text: 'Xin chào', pending: false, chatStatus: 'Closed' })).toMatchObject({ canSend: false, readOnly: true })
  })
})
