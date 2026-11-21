/** UI v3 integration Step 2 item 7: the 72 h hold lives in one constant (lib/provider/hold-hours.ts); nothing else hard-codes it. */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { HOLD_HOURS } from '@/lib/provider/hold-hours'

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => { const path = join(dir, name); return statSync(path).isDirectory() ? sources(path) : /\.(ts|tsx)$/.test(name) ? [path] : [] })
}

describe('hold hours', () => {
  it('is 72 and re-exported unchanged by the older names', async () => {
    expect(HOLD_HOURS).toBe(72)
    expect((await import('@/lib/provider/hold-hours')).PROVIDER_HOLD_HOURS).toBe(HOLD_HOURS)
    expect((await import('@/lib/explore/v3-detail')).HOLD_HOURS).toBe(HOLD_HOURS)
  })
  it('no other source file defines the number or writes "72 giờ"', () => {
    const offenders = sources('src').filter(file => !file.endsWith('lib/provider/hold-hours.ts'))
      .filter(file => /HOLD_HOURS\s*=\s*72|\b72 giờ|\b72-hour/.test(readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })
  it('booking creation and the expiry scanner import the constant', () => {
    expect(readFileSync('src/lib/booking/create-booking.ts', 'utf8')).toMatch(/import \{[^}]*HOLD_HOURS[^}]*\} from '[^']*hold-hours'/)
    expect(readFileSync('src/lib/booking/expire-holds.ts', 'utf8')).toMatch(/import \{[^}]*HOLD_HOURS[^}]*\} from '[^']*hold-hours'/)
  })
})
