// Screen 32, read-only "Nghề và làng nghề": the village's editorial craft (else the Vietnamese label of the workshop's craft type) + "Làng <tên>".
import { describe, expect, it } from 'vitest'
import { craftLine, providerCraftLine } from '@/lib/provider/craft-line'
import { GET } from '@/app/api/prf/provider/[providerId]/craft-line/route'

const BAT_TRANG = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'

describe('craftLine', () => {
  it('uses the village editorial craft first, then the craft type label', () => {
    expect(craftLine('Ceramics', { name: 'Bát Tràng', editorial_craft: 'Gốm men rạn' })).toBe('Gốm men rạn · Làng Bát Tràng')
    expect(craftLine('Ceramics', { name: 'Bát Tràng', editorial_craft: ' ' })).toBe('Gốm sứ · Làng Bát Tràng')
    expect(craftLine('Silk/Textile', { name: 'Vạn Phúc' })).toBe('Dệt lụa · Làng Vạn Phúc')
  })
  it('without a village it is the craft alone; without both it is empty', () => {
    expect(craftLine('Ceramics', undefined)).toBe('Gốm sứ')
    expect(craftLine(undefined, undefined)).toBe('')
  })
})

describe('providerCraftLine / route', () => {
  it('reads the workshop village and published version', async () => {
    expect(await providerCraftLine(BAT_TRANG)).toMatch(/ · Làng Bát Tràng$/)
    expect(await providerCraftLine('00000000-0000-0000-0000-000000000000')).toBe('')
  })
  it('GET returns {craft_line} to the owner (access rules: v3-provider-form-safety.test.ts)', async () => {
    const response = await GET(new Request('http://localhost/x', { headers: { cookie: 'hab_demo_account=provider' } }), { params: { providerId: BAT_TRANG } })
    expect(response.status).toBe(200)
    expect((await response.json()).craft_line).toMatch(/Làng Bát Tràng$/)
  })
})

import { PROVIDER_HOLD_HOURS } from '@/lib/provider/hold-hours'
import { HOLD_HOURS } from '@/lib/explore/v3-detail'
describe('hold hours shown on screen 32', () => {
  it('equals the booking rule (72 h)', () => { expect(PROVIDER_HOLD_HOURS).toBe(HOLD_HOURS); expect(PROVIDER_HOLD_HOURS).toBe(72) })
})
