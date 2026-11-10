/**
 * #242 adopted (spec PR #251, decision linhkhanh-vu 2026-11-10): F-AUTH-19 takes the village by NAME.
 * spec-AUT FR-019 / §5.1 `village_name`, US-7 AS-1, 1a, 1b, 1c, OQ #22; screen-spec-ADM117 §3 #5.
 * - existing active village without UBND (trimmed, case-insensitive) → assigned, no new village;
 * - unknown name → new ACTIVE village with only its name, source_code "HDT-xxxxxxxx", city_province "Hà Nội";
 * - village that already has a UBND → "Village already has an assigned UBND", nothing written (BR-008);
 * - inactive village → "Village is inactive", nothing written (1c);
 * - suggestions (GET /api/auth/users/create) list only active villages without UBND;
 * - F-AUTH-20 unchanged: a Provider is still created only in its UBND's ACTIVE assigned village.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { demoRepository } from '@/lib/demo/json-repository'
import { demoSessionContextFor } from '@/lib/auth/session'
import { createManagedAccount } from '@/lib/auth/lifecycle'
import { GET as createOptions } from '@/app/api/auth/users/create/route'
import CreateAccountFields from '@/app/admin/create-account/CreateAccountFields'
import { createAccountPayload } from '@/app/admin/create-account/create-payload'

const repo = demoRepository()
const delivery = () => {}
const BAT_TRANG = '20896522-6235-5699-aeaf-f48b8150d895' // seed village that already has a UBND
const hdt = () => demoSessionContextFor('hdt')
const input = (village_name: string, email = `ubnd-${randomUUID().slice(0, 8)}@example.invalid`) =>
  ({ name: 'Synthetic UBND', email, phone: '0912345678', village_name })
const count = (table: string) => repo.all(table as never).length

describe('#242 / F-AUTH-19 | UBND village by name', () => {
  beforeEach(() => repo.reset())

  it('AS-1: the name of an active village without UBND (any case, spaces) assigns that village; no village is created', async () => {
    const village = randomUUID()
    repo.insert('villages', { village_id: village, source_code: 'SYN-1', name: 'Làng Thử Nghiệm', district: '', city_province: 'Hà Nội', is_active: 'true' })
    const villages = count('villages')
    const user = await createManagedAccount(await hdt(), 'ubnd', input('  làng thử nghiệm '), delivery)
    expect(count('villages')).toBe(villages)
    expect(repo.find('ubnd_village_assignments', row => row.ubnd_user_id === user.user_id)?.village_id).toBe(village)
  })

  it('1a: an unknown name creates an ACTIVE village with only its name (HDT-xxxxxxxx, Hà Nội) and assigns it', async () => {
    const villages = count('villages')
    const user = await createManagedAccount(await hdt(), 'ubnd', input('  Làng Mới Toanh  '), delivery)
    expect(count('villages')).toBe(villages + 1)
    const assignment = repo.find('ubnd_village_assignments', row => row.ubnd_user_id === user.user_id)!
    const village = repo.find('villages', row => row.village_id === assignment.village_id)!
    expect(village).toMatchObject({ name: 'Làng Mới Toanh', is_active: 'true', city_province: 'Hà Nội', district: '' })
    expect(village.source_code).toMatch(/^HDT-[0-9A-F]{8}$/)
    expect(repo.find('user_accounts', row => row.user_id === user.user_id)).toMatchObject({ role_code: 'ADMIN', admin_type: 'UBND', account_status: 'Active' })
  })

  it('1b: a village that already has a UBND is refused (409) and nothing is written', async () => {
    const before = [count('user_accounts'), count('villages'), count('ubnd_village_assignments')]
    await expect(createManagedAccount(await hdt(), 'ubnd', input('BÁT TRÀNG'), delivery))
      .rejects.toMatchObject({ status: 409, message: 'Village already has an assigned UBND' })
    expect([count('user_accounts'), count('villages'), count('ubnd_village_assignments')]).toEqual(before)
  })

  it('1c: an inactive village is refused with "Village is inactive" and nothing is written', async () => {
    repo.insert('villages', { village_id: randomUUID(), source_code: 'SYN-2', name: 'Làng Tạm Ngưng', district: '', city_province: 'Hà Nội', is_active: 'false' })
    const before = [count('user_accounts'), count('villages'), count('ubnd_village_assignments')]
    await expect(createManagedAccount(await hdt(), 'ubnd', input('làng tạm ngưng'), delivery))
      .rejects.toMatchObject({ status: 409, message: 'Village is inactive' })
    expect([count('user_accounts'), count('villages'), count('ubnd_village_assignments')]).toEqual(before)
  })

  it('a failing credential delivery rolls back the new village too', async () => {
    const before = [count('user_accounts'), count('villages')]
    await expect(createManagedAccount(await hdt(), 'ubnd', input('Làng Sẽ Rollback'), () => { throw new Error('Delivery failure') }))
      .rejects.toThrow('Delivery failure')
    expect([count('user_accounts'), count('villages')]).toEqual(before)
    expect(repo.find('villages', row => row.name === 'Làng Sẽ Rollback')).toBeUndefined()
  })

  it('an empty or over-long village name is refused (400)', async () => {
    await expect(createManagedAccount(await hdt(), 'ubnd', input('   '), delivery)).rejects.toMatchObject({ status: 400 })
    await expect(createManagedAccount(await hdt(), 'ubnd', input('x'.repeat(256)), delivery)).rejects.toMatchObject({ status: 400 })
  })
})

describe('#242 / F-AUTH-20 unchanged | Provider only in the UBND\'s ACTIVE village', () => {
  beforeEach(() => repo.reset())

  it('a UBND whose assigned village is inactive cannot create a Provider ("Village not found or inactive")', async () => {
    const village = randomUUID()
    repo.insert('villages', { village_id: village, source_code: 'SYN-3', name: 'Làng Đã Đóng', district: '', city_province: 'Hà Nội', is_active: 'false' })
    const ubnd = { ...(await demoSessionContextFor('ubnd')), assignedVillageId: village }
    await expect(createManagedAccount(ubnd, 'provider', { name: 'Synthetic Workshop', email: 'inactive-v@example.invalid', phone: '0912345678', village_id: village, address: 'Street 1',
      contact: { contact_person_name: 'Synthetic Contact', phone_number: '0912345678' } }, delivery)).rejects.toThrow('Village not found or inactive')
  })
})

describe('#242 / ADM117 §3 #5 | suggestions and form', () => {
  beforeEach(() => repo.reset())

  it('GET suggestions for HDT list only ACTIVE villages without UBND', async () => {
    const free = randomUUID(), closed = randomUUID()
    repo.insert('villages', { village_id: free, source_code: 'SYN-4', name: 'Làng Còn Trống', district: '', city_province: 'Hà Nội', is_active: 'true' })
    repo.insert('villages', { village_id: closed, source_code: 'SYN-5', name: 'Làng Không Hoạt Động', district: '', city_province: 'Hà Nội', is_active: 'false' })
    const response = await createOptions(new Request('http://localhost/api/auth/users/create', { headers: { cookie: 'hab_demo_account=hdt' } }))
    const ids = ((await response.json()).villages as { village_id: string }[]).map(v => v.village_id)
    expect(ids).toContain(free)
    expect(ids).not.toContain(closed)
    expect(ids).not.toContain(BAT_TRANG)
  })

  it('the UBND form has a required village_name text input with the suggestions as a datalist; the Provider form keeps village_id', () => {
    const options = { kind: 'ubnd', villages: [{ village_id: 'v1', name: 'Làng Còn Trống' }] }
    const ubnd = renderToStaticMarkup(createElement(CreateAccountFields, { options }))
    expect(ubnd).toMatch(/<input[^>]*name="village_name"[^>]*required=""[^>]*list="ubnd-village-suggestions"|<input[^>]*list="ubnd-village-suggestions"[^>]*name="village_name"/)
    expect(ubnd).toMatch(/<datalist id="ubnd-village-suggestions"><option value="Làng Còn Trống"><\/option><\/datalist>/)
    expect(ubnd).not.toMatch(/name="village_id"/)
    const provider = renderToStaticMarkup(createElement(CreateAccountFields, { options: { ...options, kind: 'provider' } }))
    expect(provider).toMatch(/<select[^>]*name="village_id"/)
  })

  it('the payload sends village_name for UBND', () => {
    expect(createAccountPayload({ name: 'U', email: 'u@example.invalid', phone: '0912345678', village_name: 'Làng Mới' }, 'ubnd'))
      .toEqual({ name: 'U', email: 'u@example.invalid', phone: '0912345678', village_name: 'Làng Mới', kind: 'ubnd' })
  })
})
