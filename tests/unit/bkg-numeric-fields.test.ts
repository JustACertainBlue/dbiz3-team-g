import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'
import { createBooking } from '@/lib/booking/create-booking'
import { updateBooking } from '@/lib/booking/update-booking'

// #7 / §5.1 FR-003: group_size (Integer) <= max_participants. The runtime stores CSV values as
// strings, so "13" must be compared as a number: as strings "9" > "13" and 9 would be rejected.
const provider = DEMO_IDENTITIES.provider
const options = { now: () => new Date(SEED_NOW) }
const EXPERIENCE_ID = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'

function body(startAt: string, groupSize: number) {
  return {
    experience_id: EXPERIENCE_ID,
    agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
    start_at: startAt,
    duration: 60,
    group_size: groupSize,
    agreed_price: 2000000,
    booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
  }
}

describe('group_size vs max_participants stored as a string ("13")', () => {
  beforeEach(() => {
    demoRepository().reset()
    demoRepository().update('experiences', row => row.experience_id === EXPERIENCE_ID, { max_participants: '13' })
  })

  it('createBooking accepts 9 and rejects 14', async () => {
    await expect(createBooking(provider, body('2026-10-12T09:00:00+07:00', 9), options)).resolves.toMatchObject({ status: 'On hold' })
    await expect(createBooking(provider, body('2026-10-12T11:00:00+07:00', 14), options)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('updateBooking accepts 9 and rejects 14', async () => {
    const { booking_id: id } = await createBooking(provider, body('2026-10-12T09:00:00+07:00', 10), options)
    await expect(updateBooking(provider, id, { group_size: 9 }, options)).resolves.toBeTruthy()
    await expect(updateBooking(provider, id, { group_size: 14 }, options)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })
})
