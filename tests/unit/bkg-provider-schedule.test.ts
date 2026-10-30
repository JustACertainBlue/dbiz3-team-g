import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'
import { buildCalendarBlocks } from '@/lib/booking/availability'
import { getProviderSchedule } from '@/lib/booking/provider-schedule'

// T010–T012: F-SCHED-01 (US-1 AS-1, AS-2; FR-001; #71, #73, #74, #78, #80; BR-009, SC-010).
const PROVIDER = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const OTHER = '70efa801-a908-5e16-8510-fd094fbdc020'
const PENDING = '3a5d2ffc-79fa-5b75-a1e6-82beea3bed59'
const EXPIRED_HOLD = '54d7a276-90a2-5c70-be22-cb59ea95ea14' // Sun 2026-10-11, hold until 2026-10-01T08:00
const at = (iso: string) => ({ now: () => new Date(iso) })
const seedNow = at(SEED_NOW)
const OCT = { date_from: '2026-10-01', date_to: '2026-10-31' }
const otherOwner = { ...DEMO_IDENTITIES.provider, providerId: OTHER }
const invalid = (promise: Promise<unknown>) => expect(promise).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
const WRITE_TABLES = ['bookings', 'booking_status_history', 'chat_messages', 'chat_sessions', 'chat_participants']
const snapshot = () => JSON.parse(JSON.stringify(WRITE_TABLES.map(table => demoRepository().all(table))))

describe('T010 | getProviderSchedule ranges, operating_hours, owner view', () => {
  beforeEach(() => demoRepository().reset())

  it('defaults to today .. +29 days in Asia/Ho_Chi_Minh (FR-001)', async () => {
    const { calendar_blocks } = await getProviderSchedule(DEMO_IDENTITIES.provider, PROVIDER, {}, seedNow)
    expect(calendar_blocks[0].start_at).toBe('2026-09-30T00:00:00+07:00')
    expect(calendar_blocks.at(-1)!.end_at).toBe('2026-10-30T00:00:00+07:00')
  })

  it('validates the range: order, format, at most 31 days (#71)', async () => {
    await invalid(getProviderSchedule(DEMO_IDENTITIES.provider, PROVIDER, { date_from: '2026-10-06', date_to: '2026-10-05' }, seedNow))
    await invalid(getProviderSchedule(DEMO_IDENTITIES.provider, PROVIDER, { date_from: '2026-10-01', date_to: '2026-11-01' }, seedNow))
    await invalid(getProviderSchedule(DEMO_IDENTITIES.provider, PROVIDER, { date_from: '05/10/2026' }, seedNow))
    await expect(getProviderSchedule(DEMO_IDENTITIES.provider, PROVIDER, OCT, seedNow)).resolves.toBeTruthy()
  })

  it('operating_hours has the seven ISO weekdays (#78)', async () => {
    const { operating_hours } = await getProviderSchedule(DEMO_IDENTITIES.provider, PROVIDER, OCT, seedNow)
    expect(Object.keys(operating_hours).sort()).toEqual(['1', '2', '3', '4', '5', '6', '7'])
    expect(operating_hours['1']).toEqual([{ local_start: '08:00:00', local_end: '17:00:00' }])
    for (const day of ['2', '3', '4', '5', '6', '7']) expect(operating_hours[day]).toEqual([])
  })

  it('the owner view carries booking_id on own Booking blocks (#73)', async () => {
    const { calendar_blocks } = await getProviderSchedule(DEMO_IDENTITIES.provider, PROVIDER, OCT, seedNow)
    expect(calendar_blocks.find(block => block.start_at === '2026-10-05T09:00:00+07:00')).toMatchObject({ status: 'Booked', booking_id: '4bf17b30-9819-5c47-b745-06be7171087b' })
  })
})

describe('T011 | public view allow-list (#73, US-1 AS-2, BR-009, SC-010)', () => {
  beforeEach(() => demoRepository().reset())

  it('every public block has exactly start_at, end_at, status', async () => {
    const result = await getProviderSchedule(DEMO_IDENTITIES.agency, PROVIDER, OCT, seedNow)
    expect(result.calendar_blocks.length).toBeGreaterThan(0)
    for (const block of result.calendar_blocks) expect(Object.keys(block).sort()).toEqual(['end_at', 'start_at', 'status'])
    const text = JSON.stringify(result)
    for (const secret of ['ebf4fcfa', '2a1f0cc1', 'Hồng Hà', '900000', 'hold_expires_at', 'agency']) expect(text).not.toContain(secret)
  })
})

describe('T012 | authorize → validate → expire → read (#80)', () => {
  beforeEach(() => demoRepository().reset())

  it('the owner sees a due hold already expired', async () => {
    const { calendar_blocks } = await getProviderSchedule(otherOwner, OTHER, { date_from: '2026-10-11', date_to: '2026-10-11' }, at('2026-10-02T00:00:00+07:00'))
    expect(calendar_blocks).toEqual([{ start_at: '2026-10-11T00:00:00+07:00', end_at: '2026-10-12T00:00:00+07:00', status: 'Unavailable' }])
  })

  it('denied requests write nothing', async () => {
    const before = snapshot()
    const due = at('2026-10-02T00:00:00+07:00')
    await expect(getProviderSchedule(DEMO_IDENTITIES.ubnd, OTHER, {}, due)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(getProviderSchedule(DEMO_IDENTITIES.guest, OTHER, {}, due)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(getProviderSchedule(DEMO_IDENTITIES.provider, OTHER, {}, due)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(getProviderSchedule(DEMO_IDENTITIES.agency, PENDING, {}, due)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(snapshot()).toEqual(before)
    expect(demoRepository().find('bookings', row => row.booking_id === EXPIRED_HOLD)!.status).toBe('On hold')
  })

  it('an invalid range from the owner writes nothing', async () => {
    const before = snapshot()
    await invalid(getProviderSchedule(otherOwner, OTHER, { date_from: '2026-10-06', date_to: '2026-10-05' }, at('2026-10-02T00:00:00+07:00')))
    expect(snapshot()).toEqual(before)
  })
})

describe('#72 | public blocks stay within one local day (demo finding, Entry 29)', () => {
  beforeEach(() => demoRepository().reset())

  it('every public block starts and ends on the same local day (or at the next midnight)', async () => {
    const { calendar_blocks } = await getProviderSchedule(DEMO_IDENTITIES.agency, PROVIDER, OCT, seedNow)
    for (const block of calendar_blocks) {
      const day = block.start_at.slice(0, 10)
      const nextMidnight = new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10) + 'T00:00:00+07:00'
      expect(block.end_at.slice(0, 10) === day || block.end_at === nextMidnight).toBe(true)
    }
  })

  it('the public view equals buildCalendarBlocks in public mode', async () => {
    const range = { date_from: '2026-10-05', date_to: '2026-10-10' }
    const { calendar_blocks } = await getProviderSchedule(DEMO_IDENTITIES.agency, PROVIDER, range, seedNow)
    const hours = demoRepository().all('provider_operating_hours').filter(row => row.provider_id === PROVIDER)
    const bookings = demoRepository().all('bookings').filter(row => row.provider_id === PROVIDER)
    expect(calendar_blocks).toEqual(buildCalendarBlocks(hours, bookings, range.date_from, range.date_to, 'public'))
  })
})
