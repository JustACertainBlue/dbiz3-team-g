/**
 * T057 (A8): names come from data/ (Constitution I), never invented placeholders; the sidebar shows
 * the demo identity's displayName.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { demoRepository } from '@/lib/demo/json-repository'
import { filterBookingTable, getTopCollaborationPairs } from '@/lib/adm/metrics-service'
import { AdminSidebar } from '@/app/components/admin/AdminSidebar'
import { createHdtSession } from '../helpers/mock-session'

const INVENTED = /Indochina Heritage Voyages|Tour Agency Partner|Artisan Workshop|Trải nghiệm làng nghề|Local Artisan Workshop|Vo Minh Khoa|Nguyen Van Canh/

describe('T057 | A8 names from data', () => {
  beforeEach(() => demoRepository().reset())

  it('every table row and top pair over the seed period uses names from data/', async () => {
    const period = { preset: 'Custom' as const, startDate: '2026-09-01T00:00:00+07:00', endDate: '2026-10-31T23:59:59+07:00' }
    const rows = await filterBookingTable(createHdtSession(), period)
    expect(rows.length).toBeGreaterThan(0)
    expect(JSON.stringify(rows)).not.toMatch(INVENTED)
    const pairs = await getTopCollaborationPairs(createHdtSession(), period)
    expect(JSON.stringify(pairs)).not.toMatch(INVENTED)
  })

  it('AdminSidebar shows the given displayName, not a hard-coded admin name', () => {
    const html = renderToStaticMarkup(React.createElement(AdminSidebar, { adminType: 'UBND', displayName: 'UBND Admin · Hạ Thái' }))
    expect(html).toContain('UBND Admin · Hạ Thái')
    expect(html).not.toMatch(INVENTED)
  })
})
