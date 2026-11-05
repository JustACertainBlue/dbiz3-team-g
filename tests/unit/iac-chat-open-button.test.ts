// T032: BKG135 / BKG138 Chat button outcome (COM048 / COM065 navigation).
import { describe, expect, it } from 'vitest'
import { chatOpenOutcome } from '@/app/messages/chat-open'

describe('T032 | chatOpenOutcome', () => {
  it('navigates to /messages with the Chat selected on success', () => {
    expect(chatOpenOutcome({ ok: true, status: 200, body: { data: { chat_session_id: 'abc 1' } } })).toEqual({ kind: 'success', navigateTo: '/messages?chat_session_id=abc%201' })
  })

  it('shows the error message and does not navigate otherwise', () => {
    expect(chatOpenOutcome({ ok: false, status: 403, body: { error: { code: 'FORBIDDEN', message: 'Không có quyền' } } })).toEqual({ kind: 'error', message: 'Không có quyền' })
    expect(chatOpenOutcome({ networkError: true })).toEqual({ kind: 'error', message: expect.any(String) })
  })
})
