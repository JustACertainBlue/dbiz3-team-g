/**
 * G3 audit (linh/g3-audit) – ADM rules whose existing tests ran on an empty data set: without a date range
 * they use "Last 30 days" from today, while every seed Booking was created 2026-09-23..28. These tests use
 * the P1 window (2026-09-20..25, seven seed Bookings: 3 Booked, 2 Completed, 2 Cancelled).
 *
 * - BR-014: Agency and Provider filters are AND-combined.
 * - BR-010: a UBND sees only Bookings of its village.
 * - BR-018: collaboration frequency counts Booked + Completed only (Cancelled excluded).
 * - BR-006: the ADM API is read-only (GET only).
 * - BR-012 / BR-013: the Booking table and the Top-10 list link to no entity and no Booking Detail.
 */
import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { filterBookingTable, getTopCollaborationPairs } from '@/lib/adm/metrics-service'
import { BookingTable } from '@/app/components/admin/BookingTable'
import { TopPairsList } from '@/app/components/admin/TopPairsList'
import * as dashboardRoute from '@/app/api/adm/dashboard/route'
import * as filterOptionsRoute from '@/app/api/adm/filter-options/route'
import * as villagesRoute from '@/app/api/adm/villages/route'
import { createHdtSession, createUbndSession } from '../helpers/mock-session'

;(globalThis as { React?: typeof React }).React = React

const P1 = { preset: 'Custom' as const, startDate: '2026-09-20T00:00:00+07:00', endDate: '2026-09-25T23:59:59+07:00' }
const HONG_HA = 'ebf4fcfa-1013-5ecd-b7c6-e0d8e9fa0277'
const SONG_HONG = '2a1f0cc1-d7df-587d-afd4-445d25a5c5b0'
const BAT_TRANG = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const OTHER_PROVIDER = '70efa801-a908-5e16-8510-fd094fbdc020'
const hdt = createHdtSession()

describe('G3 audit | ADM BR-014 AND filters on real seed rows', () => {
  it('the period has seven Bookings without filters', async () => {
    expect(await filterBookingTable(hdt, P1)).toHaveLength(7)
  })

  it('Agency + Provider keep only the pair; another Provider gives none', async () => {
    expect(await filterBookingTable(hdt, { ...P1, agencyId: HONG_HA, providerId: BAT_TRANG })).toHaveLength(1)
    expect(await filterBookingTable(hdt, { ...P1, agencyId: SONG_HONG, providerId: BAT_TRANG })).toHaveLength(1)
    expect(await filterBookingTable(hdt, { ...P1, providerId: BAT_TRANG })).toHaveLength(2)
    expect(await filterBookingTable(hdt, { ...P1, providerId: OTHER_PROVIDER })).toHaveLength(1) // the Provider exists in P1 …
    expect(await filterBookingTable(hdt, { ...P1, agencyId: HONG_HA, providerId: OTHER_PROVIDER })).toEqual([]) // … but not with Hồng Hà
  })
})

describe('G3 audit | ADM BR-010 UBND village scope on real rows', () => {
  it('UBND Bát Tràng sees only the two Bát Tràng Bookings', async () => {
    const rows = await filterBookingTable(createUbndSession(), P1)
    expect(rows).toHaveLength(2)
    expect(new Set(rows.map(row => row.providerName))).toEqual(new Set(['Xưởng thủ công Bát Tràng']))
  })
})

describe('G3 audit | ADM BR-018 frequency counts Booked + Completed only', () => {
  it('P1 pairs sum to 5 Bookings (3 Booked + 2 Completed; 2 Cancelled excluded)', async () => {
    const { topPairs } = await getTopCollaborationPairs(hdt, P1)
    expect(topPairs.reduce((sum, pair) => sum + pair.bookingCount, 0)).toBe(5)
  })
})

describe('G3 audit | ADM BR-006 read-only API', () => {
  it('the ADM routes export GET only', () => {
    for (const route of [dashboardRoute, filterOptionsRoute, villagesRoute] as Array<Record<string, unknown>>) {
      expect(typeof route.GET).toBe('function')
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) expect(route[method]).toBeUndefined()
    }
  })
})

describe('G3 audit | ADM BR-012 / BR-013 no drill-down links', () => {
  it('Booking table and Top-10 list render no link to an entity or Booking Detail', async () => {
    const bookings = await filterBookingTable(hdt, P1)
    const collaboration = await getTopCollaborationPairs(hdt, P1)
    const markup = renderToStaticMarkup(React.createElement(React.Fragment, null,
      React.createElement(BookingTable, { bookings }),
      React.createElement(TopPairsList, { collaboration, onSortChange: () => {} })))
    expect(markup).toContain('Xưởng thủ công Bát Tràng')
    expect(markup).not.toMatch(/href=/)
    expect(markup).not.toContain('/bookings/')
  })
})
