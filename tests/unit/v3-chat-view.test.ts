import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { createBookingRequest } from '@/lib/booking/booking-request'
import { listChats } from '@/lib/iac/chat-service'
import { eventView, filterChats } from '@/app/messages/chat-view'
import { toSessionContext } from '@/lib/auth/session'
import { addSlots } from '../helpers/slots'

// Screen 25 (UI v3): the request card, and one pill per status change (decision #6).
describe('chat pills for Booking Update messages', () => {
  const text = (label: string) => `Booking ${label}: Nặn gốm, 2026-11-24 08:30–09:30, 10 pax, 1,425,000 VND`
  it('titles follow the status', () => {
    expect(eventView(text('Tạm giữ')).title).toBe('Xưởng đã giữ chỗ')
    expect(eventView(text('Đã đặt')).title).toBe('Xưởng đã nhận tiền')
    expect(eventView(text('Hoàn tất')).title).toBe('Tour đã hoàn thành')
    expect(eventView(text('Đã huỷ')).title).toBe('Đặt chỗ đã huỷ')
  })
  it('keeps the original sentence as the sub line; unknown text falls back to it', () => {
    expect(eventView(text('Tạm giữ')).sub).toContain('Nặn gốm')
    expect(eventView('Something else')).toEqual({ title: 'Cập nhật đặt chỗ', sub: 'Something else' })
  })
})

describe('chat list preview of a request', () => {
  beforeEach(() => { demoRepository().reset(); addSlots() })
  it('shows a sentence, not the stored JSON', async () => {
    const agency = DEMO_IDENTITIES.agency
    await createBookingRequest(agency, { experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', date: '2026-11-30', slot_start: '09:00', slot_end: '10:00', group_size: 10, note: '' }, { now: () => new Date('2026-11-21T09:00:00+07:00') })
    const list = await listChats(await toSessionContext(agency))
    expect(list[0].last_message_preview).toMatch(/^Yêu cầu đặt chỗ: .*30\/11\/2026 09:00–10:00, 10 khách$/)
  })
})

describe('chat list: experience line and search (screen 25)', () => {
  beforeEach(() => { demoRepository().reset(); addSlots() })
  const agency = DEMO_IDENTITIES.agency
  it('each entry carries the experience name of the chat context ("" when none)', async () => {
    await createBookingRequest(agency, { experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', date: '2026-11-30', slot_start: '09:00', slot_end: '10:00', group_size: 10 }, { now: () => new Date('2026-11-21T09:00:00+07:00') })
    const list = await listChats(await toSessionContext(agency))
    const name = demoRepository().find('experiences', r => r.experience_id === 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69')!.name
    expect(list.find(entry => entry.experience_name === name)).toBeTruthy()
    expect(list.every(entry => typeof entry.experience_name === 'string')).toBe(true)
  })
  const chats = [
    { chat_session_id: '1', organization: 'Xưởng gốm Bát Tràng', participant_name: 'Kiều Anh Thư', experience_name: 'Nặn gốm thủ công' },
    { chat_session_id: '2', organization: 'Xưởng dệt lụa Vạn Phúc', participant_name: 'Lê Thị Hoa', experience_name: 'Dệt lụa truyền thống' },
  ]
  it('filterChats: by organization, participant or experience; case and accent insensitive; empty = all', () => {
    expect(filterChats(chats, '').map(c => c.chat_session_id)).toEqual(['1', '2'])
    expect(filterChats(chats, 'bat trang').map(c => c.chat_session_id)).toEqual(['1'])
    expect(filterChats(chats, 'HOA').map(c => c.chat_session_id)).toEqual(['2'])
    expect(filterChats(chats, 'det lua').map(c => c.chat_session_id)).toEqual(['2'])
    expect(filterChats(chats, '  nặn gốm ').map(c => c.chat_session_id)).toEqual(['1'])
    expect(filterChats(chats, 'khong co')).toEqual([])
  })
})
