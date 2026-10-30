import { describe, expect, it } from 'vitest'
import { withBookingWriteLock } from '@/lib/booking/write-lock'

// T005 (AC-BKG-RACE support): critical sections never interleave.
const tick = () => new Promise(resolve => setTimeout(resolve, 5))

describe('T005 | withBookingWriteLock', () => {
  it('runs a second section only after the first has finished', async () => {
    const events: string[] = []
    const section = (name: string) => withBookingWriteLock(async () => {
      events.push(`${name}:start`)
      await tick()
      events.push(`${name}:end`)
      return name
    })

    const results = await Promise.all([section('a'), section('b')])

    expect(results).toEqual(['a', 'b'])
    expect(events).toEqual(['a:start', 'a:end', 'b:start', 'b:end'])
  })

  it('releases the lock when a section rejects', async () => {
    const failing = withBookingWriteLock(async () => {
      await tick()
      throw new Error('boom')
    })
    const next = withBookingWriteLock(() => 'after')

    await expect(failing).rejects.toThrow('boom')
    await expect(next).resolves.toBe('after')
  })
})
