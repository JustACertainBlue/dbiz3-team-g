// T013: Close dialog and read-only notice helpers (#33, #34, #35).
import { describe, expect, it } from 'vitest'
import { closeReasonState, closedNotice } from '@/app/messages/close-chat'

describe('T013 | closeReasonState', () => {
  it('counts trimmed code points against 500 and blocks while pending (#30, #33)', () => {
    expect(closeReasonState({ text: '  Xong ', pending: false })).toEqual({ counter: '4/500', canConfirm: true })
    expect(closeReasonState({ text: '', pending: false }).canConfirm).toBe(true)
    expect(closeReasonState({ text: 'ố'.repeat(500), pending: false }).canConfirm).toBe(true)
    expect(closeReasonState({ text: 'ố'.repeat(501), pending: false })).toEqual({ counter: '501/500', canConfirm: false })
    expect(closeReasonState({ text: 'Xong', pending: true }).canConfirm).toBe(false)
  })
})

describe('T013 | closedNotice', () => {
  it('names who closed it, says read-only and gives the new-interaction hint (#34, #35)', () => {
    const notice = closedNotice({ chat_status: 'Closed', closed_at: '2026-11-05T02:00:00.000Z', closed_by_name: 'Lý Gia Hân' })!
    expect(notice.title).toContain('Đã đóng bởi Lý Gia Hân')
    expect(notice.title).toContain('chỉ xem')
    expect(notice.hint).toMatch(/hội thoại mới/)
  })

  it('returns null for an Active Chat', () => {
    expect(closedNotice({ chat_status: 'Active' })).toBeNull()
  })
})
