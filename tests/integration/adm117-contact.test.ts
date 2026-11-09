/**
 * Issue #170 — ADM117 Contact (screen-spec-ADM117.md:36 element #10; F-AUTH-20): contact
 * { contact_person_name, phone_number } is entered on the Provider form and stored in
 * provider_profile_versions.contact_information (column exists, data/schema.sql:314; no schema change).
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { demoSessionContextFor } from '@/lib/auth/session'
import { createManagedAccount, type Delivery } from '@/lib/auth/lifecycle'
import CreateAccountFields from '@/app/admin/create-account/CreateAccountFields'
import { createAccountPayload } from '@/app/admin/create-account/create-payload'

const village = '12eb6828-903d-44df-a4c1-b1564c6587c0'
const delivery: Delivery = () => {}
const base = { name: 'Synthetic Workshop', email: 'contact-workshop@example.invalid', phone: '0912345678', village_id: village, address: 'Street 1' }

async function ubnd() {
  return { ...(await demoSessionContextFor('ubnd')), assignedVillageId: village }
}
function storedContact(providerId: string) {
  const version = demoRepository().find('provider_profile_versions', row => row.provider_id === providerId && row.version_no === '1')
  return JSON.parse(version!.contact_information)
}

beforeEach(() => {
  demoRepository().reset()
  demoRepository().insert('villages', { village_id: village, name: 'Synthetic village', is_active: 'true' })
})

describe('#170 | the entered contact is stored', () => {
  it('contact person and phone from the form reach contact_information (trimmed)', async () => {
    const created = await createManagedAccount(await ubnd(), 'provider', { ...base, contact: { contact_person_name: '  Nguyễn Văn Liên Hệ ', phone_number: '+84987654321' } }, delivery)
    expect(storedContact(created.provider_id!)).toEqual({ contact_person_name: 'Nguyễn Văn Liên Hệ', phone_number: '+84987654321' })
  })

  it.each([
    ['empty person', { contact_person_name: ' ', phone_number: '0987654321' }],
    ['bad phone', { contact_person_name: 'Liên Hệ', phone_number: '12ab' }],
    ['phone missing', { contact_person_name: 'Liên Hệ' }],
  ])('%s → refused, no account created', async (_label, contact) => {
    await expect(createManagedAccount(await ubnd(), 'provider', { ...base, contact }, delivery)).rejects.toThrow('contact')
    expect(demoRepository().find('user_accounts', row => row.email === base.email)).toBeUndefined()
  })
})

describe('#170 | ADM117 screen', () => {
  it('the Provider form has Required "Người liên hệ" and "Điện thoại liên hệ"; the UBND form has none', () => {
    const provider = renderToStaticMarkup(createElement(CreateAccountFields, { options: { kind: 'provider', villages: [] } }))
    expect(provider).toMatch(/Người liên hệ<span[^>]*aria-hidden="true"[^>]*> \*<\/span><\/span><input name="contact_person_name" required="" aria-required="true"/)
    expect(provider).toMatch(/Điện thoại liên hệ<span[^>]*aria-hidden="true"[^>]*> \*<\/span><\/span><input name="contact_phone_number" required="" aria-required="true" pattern=/)
    const ubndForm = renderToStaticMarkup(createElement(CreateAccountFields, { options: { kind: 'ubnd', villages: [] } }))
    expect(ubndForm).not.toMatch(/contact_/)
  })

  it('the request body nests the two fields as contact (F-AUTH-20 contract)', () => {
    expect(createAccountPayload({ ...base, contact_person_name: 'A', contact_phone_number: '0987654321' }, 'provider'))
      .toEqual({ ...base, kind: 'provider', contact: { contact_person_name: 'A', phone_number: '0987654321' } })
    expect(createAccountPayload({ name: 'U', email: 'u@example.invalid', phone: '0912345678', village_id: village }, 'ubnd'))
      .toEqual({ name: 'U', email: 'u@example.invalid', phone: '0912345678', village_id: village, kind: 'ubnd' })
  })
})
