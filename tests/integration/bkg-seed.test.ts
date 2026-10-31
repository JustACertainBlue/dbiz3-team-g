import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { SEED_NOW } from '@/lib/booking/clock'

// T003: one value the Session 5 data package already states.
// data/05-review.md: "The Booking seed is evaluated as of 2026-09-30 ... its remaining On hold record expires on 2026-10-01".
describe('T003 | BKG seed values', () => {
  beforeEach(() => demoRepository().reset())

  it('uses the seed generation time from data/seed/manifest.json as the test clock', () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), 'data', 'seed', 'manifest.json'), 'utf8')) as { generated_at: string }
    expect(manifest.generated_at).toBe('2026-09-30T00:00:00+07:00')
    expect(SEED_NOW).toBe(manifest.generated_at)
  })

  it('has exactly one On hold Booking, expiring on 2026-10-01', () => {
    const onHold = demoRepository().all('bookings').filter(row => row.status === 'On hold')
    expect(onHold).toHaveLength(1)
    expect(onHold[0].hold_expires_at.slice(0, 10)).toBe('2026-10-01')
  })
})
