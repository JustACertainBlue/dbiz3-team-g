// COM048 (Agency) / COM065 (Provider), design wave 4 screen 4: pure view helpers for the Figma "Màn 4" layout.
// Content follows the screen specs: element #5 Active / Closed status, #3 list with unread count,
// COM048 #8–#10 (Close Chat, Bookings, Schedule) and COM065 #8–#10 (Create booking, Close Chat, Bookings).
import { describe, expect, it } from 'vitest'
import { attachmentLine, chatActions, chatStatusLine, dayLabel, groupByDay, initials, listTime } from '@/app/messages/chat-view'

// 18/10/2026 10:00 in Hanoi (UTC+7)
const NOW = new Date('2026-10-18T03:00:00Z')

describe('initials (avatar text, derived from the organization name)', () => {
  it('uses the first letters of the last two words', () => {
    expect(initials('Xưởng gốm Minh Châu')).toBe('MC')
    expect(initials('Hợp tác xã mây tre đan Phú Vinh')).toBe('PV')
  })
  it('handles one word and empty names', () => {
    expect(initials('Sakura')).toBe('SA')
    expect(initials('  ')).toBe('?')
  })
})

describe('chatStatusLine (element #5)', () => {
  it('names the Active and Closed states in Vietnamese; Closed is view only (SR-004)', () => {
    expect(chatStatusLine('Active')).toBe('Đang hoạt động')
    expect(chatStatusLine('Closed')).toBe('Đã đóng · chỉ xem')
  })
})

describe('time labels are Hanoi time (spec-BKG #31 / issue #87)', () => {
  it('list time: clock today, "Hôm qua" yesterday, day/month earlier', () => {
    expect(listTime('2026-10-18T10:42:00+07:00', NOW)).toBe('10:42')
    expect(listTime('2026-10-17T23:59:00+07:00', NOW)).toBe('Hôm qua')
    expect(listTime('2026-10-14T08:00:00+07:00', NOW)).toBe('14/10')
    expect(listTime(undefined, NOW)).toBe('')
  })
  it('uses the Hanoi day, not the UTC day', () => {
    // 17/10 18:30 UTC = 18/10 01:30 in Hanoi → today
    expect(listTime('2026-10-17T18:30:00Z', NOW)).toBe('01:30')
  })
  it('day separator: "Hôm nay, 18/10", "Hôm qua, 17/10", full date earlier', () => {
    expect(dayLabel('2026-10-18T09:12:00+07:00', NOW)).toBe('Hôm nay, 18/10')
    expect(dayLabel('2026-10-17T09:12:00+07:00', NOW)).toBe('Hôm qua, 17/10')
    expect(dayLabel('2026-09-30T09:12:00+07:00', NOW)).toBe('30/09/2026')
  })
})

describe('groupByDay keeps the chronological order (element #4)', () => {
  it('starts a new group when the Hanoi day changes', () => {
    const messages = [
      { message_id: 'a', sent_at: '2026-10-17T09:00:00+07:00' },
      { message_id: 'b', sent_at: '2026-10-18T09:12:00+07:00' },
      { message_id: 'c', sent_at: '2026-10-18T09:15:00+07:00' },
    ]
    const groups = groupByDay(messages, NOW)
    expect(groups.map(group => group.label)).toEqual(['Hôm qua, 17/10', 'Hôm nay, 18/10'])
    expect(groups[1].items.map(item => item.message_id)).toEqual(['b', 'c'])
  })
})

describe('attachmentLine', () => {
  it('reads "Đính kèm: <name> · <size>"', () => {
    expect(attachmentLine({ file_name: 'danh-sach-doan.xlsx', file_size: 88_064 })).toBe('Đính kèm: danh-sach-doan.xlsx · 86.0 KB')
  })
})

describe('chatActions (COM048 #8–#10, COM065 #8–#10)', () => {
  const agency = { role: 'Tour_Agency', agencyId: 'AG1', providerId: '' }
  const provider = { role: 'Local_Provider', agencyId: '', providerId: 'PR1' }
  const keys = (list: { key: string }[]) => list.map(item => item.key)

  it('Agency, Active: Close Chat, Bookings (BKG137), Schedule (SCH141)', () => {
    const list = chatActions(agency, 'Active')
    expect(keys(list)).toEqual(['close', 'bookings', 'schedule'])
    expect(list.find(item => item.key === 'bookings')?.href).toBe('/agency/AG1/bookings')
    expect(list.find(item => item.key === 'schedule')?.href).toBe('/agency/AG1/schedule')
  })
  it('Provider, Active: Create booking (BKG134), Close Chat, Bookings (BKG133); no Schedule', () => {
    const list = chatActions(provider, 'Active')
    expect(keys(list)).toEqual(['create_booking', 'close', 'bookings'])
    expect(list.find(item => item.key === 'create_booking')?.href).toBe('/provider/PR1/bookings/new')
    expect(list.find(item => item.key === 'bookings')?.href).toBe('/provider/PR1/bookings')
  })
  it('Closed is terminal: no Close Chat for either role (F-CHAT-04)', () => {
    expect(keys(chatActions(agency, 'Closed'))).not.toContain('close')
    expect(keys(chatActions(provider, 'Closed'))).not.toContain('close')
  })
  it('Agency never gets Create booking (Provider-owned lifecycle)', () => {
    expect(keys(chatActions(agency, 'Active'))).not.toContain('create_booking')
  })
})
