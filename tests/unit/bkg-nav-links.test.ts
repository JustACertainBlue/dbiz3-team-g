/**
 * G3 audit (linh/g3-audit) – 013 M3 / #66, #68, #69: the BKG navigation targets used by PRF127, PRF128,
 * PRF019 and the BKG pages come from one helper. Written before src/lib/booking/nav-links.ts.
 */
import { describe, expect, it } from 'vitest'
import { providerBkgLinks, agencyBkgLinks } from '@/lib/booking/nav-links'

const BAT_TRANG = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const TRANG_AN = '02e568d8-d65e-54b1-a554-b411150d1dcb'

describe('G3 audit | BKG navigation links (#66, #68, #69)', () => {
  it('providerBkgLinks: Dashboard → DSH018, Bookings → BKG133, Schedule → SCH139 (#66, #69)', () => {
    expect(providerBkgLinks(BAT_TRANG)).toEqual({
      dashboard: `/provider/${BAT_TRANG}/dashboard`,
      bookings: `/provider/${BAT_TRANG}/bookings`,
      schedule: `/provider/${BAT_TRANG}/schedule`,
    })
  })

  it('agencyBkgLinks: Bookings → BKG137, Schedule → SCH141 (#68)', () => {
    expect(agencyBkgLinks(TRANG_AN)).toEqual({ bookings: `/agency/${TRANG_AN}/bookings`, schedule: `/agency/${TRANG_AN}/schedule` })
  })
})
