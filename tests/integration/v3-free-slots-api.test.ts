import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { demoRepository } from '@/lib/demo/json-repository'
import { GET } from '@/app/api/bkg/requests/slots/route'
import { addSlots } from '../helpers/slots'

const EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
const get = (query: string) => GET(new NextRequest(`http://localhost/api/bkg/requests/slots?${query}`))

describe('GET /api/bkg/requests/slots', () => {
  beforeEach(() => { demoRepository().reset(); addSlots() })
  it('returns the free slots of the day', async () => {
    const response = await get(`experience_id=${EXPERIENCE}&date=2026-11-30`)
    expect(response.status).toBe(200)
    expect((await response.json()).data.slots).toEqual([{ start: '09:00', end: '10:00', label: 'Ca sáng' }])
  })
  it('an empty day gives an empty list, not an error', async () => {
    const body = await (await get(`experience_id=${EXPERIENCE}&date=2026-11-29`)).json()
    expect(body.data.slots).toEqual([])
  })
  it('missing or malformed parameters are a 400', async () => {
    expect((await get('date=2026-11-30')).status).toBe(400)
    expect((await get(`experience_id=${EXPERIENCE}&date=30-11-2026`)).status).toBe(400)
  })
})
