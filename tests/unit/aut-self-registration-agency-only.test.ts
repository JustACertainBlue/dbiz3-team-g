import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Issue #62. spec-AUT BR-001: "Guest self-registration is permitted for Tour Agency only" (Local Providers are
// onboarded by UBND, F-AUTH-20). US-1 AS-3: "Given the Guest attempts to register as a Local Provider, then Local
// Provider self-registration is not offered." Covers the form (REG003), the registration service and the only
// route that creates Provider accounts.
;(globalThis as { React?: typeof React }).React = React
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }), useSearchParams: () => new URLSearchParams() }))

import RegisterPage from '@/app/register/page'
import { submitRegistration, verifyRegistration } from '@/lib/auth/registration-service'
import { POST as createAccount } from '@/app/api/auth/users/create/route'
import { demoRepository } from '@/lib/demo/json-repository'

const input = {
  full_name: 'Agency Self Registration', email: 'self-registration@example.invalid', password: 'Secure123!', confirm_password: 'Secure123!',
  company_name: 'Self Registration Agency', company_type: 'Travel Agency', tax_id: '9999999911', team_size: 5,
  location: { street: '1 Hang Bac', ward: 'Hang Bac', district: 'Hoan Kiem', city_province: 'Ha Noi' },
  contact_information: { contact_person_name: 'Self Registration', phone_number: '+84900000003' }, tour_types: ['Culinary'], registration_documents: [{}],
}
const files = [{ file_id: 'self-reg-file', storage_key: 'registration-documents/self-reg-file', file_name: 'certificate.pdf', media_type: 'application/pdf', file_size_bytes: '50' }]
const repo = () => demoRepository()

async function register(extra: Record<string, unknown> = {}) {
  let otp = ''
  const { registration_request_id } = await submitRegistration({ ...input, ...extra } as never, files, message => { otp = message.otp })
  return verifyRegistration(registration_request_id, otp)
}

describe('#62 spec-AUT BR-001 / US-1 AS-3 | self-registration creates Tour Agency accounts only', () => {
  beforeEach(() => repo().reset())

  it('BR-001 (normal): a completed self-registration creates a Tour_Agency account (Pending Approval) with an Agency profile and no Provider profile', async () => {
    const result = await register()
    const account = repo().find('user_accounts', row => row.user_id === result.user_id)!
    expect(account).toMatchObject({ role_code: 'Tour_Agency', admin_type: '', account_status: 'Pending Approval' })
    expect(repo().find('agency_profiles', row => row.user_id === result.user_id)).toBeDefined()
    expect(repo().find('provider_profiles', row => row.user_id === result.user_id)).toBeUndefined()
  }, 15000)

  it('BR-001 (boundary): role fields smuggled into the registration request are ignored; the account is still Tour_Agency', async () => {
    const result = await register({ role_code: 'Local_Provider', role: 'ADMIN', admin_type: 'HDT', provider_id: 'x', village_id: '20896522-6235-5699-aeaf-f48b8150d895' })
    expect(repo().find('user_accounts', row => row.user_id === result.user_id)).toMatchObject({ role_code: 'Tour_Agency', admin_type: '' })
    expect(repo().all('provider_profiles').some(row => row.user_id === result.user_id)).toBe(false)
  }, 15000)

  it('US-1 AS-3 (boundary): the registration form (REG003) offers no role choice and no Local Provider option', () => {
    const html = renderToStaticMarkup(React.createElement(RegisterPage))
    expect(html).toMatch(/<form/)
    expect(html).not.toMatch(/name="role|name="role_code|Local[ _]Provider|Nhà cung cấp|Xưởng/i)
  })

  it('US-1 AS-3 (boundary, review 09/11): the only choice control is company_type with the FR-001 enum; no radio, no other select', () => {
    const html = renderToStaticMarkup(React.createElement(RegisterPage))
    expect([...html.matchAll(/<select[^>]*name="([^"]+)"/g)].map(m => m[1])).toEqual(['company_type'])
    expect(html).not.toMatch(/type="radio"/)
    expect([...html.matchAll(/<option[^>]*>([^<]*)</g)].map(m => m[1])).toEqual(['Travel Agency', 'Tour Operator', 'TMC'])
  })

  it('BR-001 (error): a Guest cannot create a Local Provider account through the account-creation route; nothing is written', async () => {
    const before = repo().all('user_accounts').length
    const response = await createAccount(new Request('http://localhost:3000/api/auth/users/create', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'provider', name: 'Guest Provider', email: 'guest-provider@example.invalid', phone: '0900000004', village_id: '20896522-6235-5699-aeaf-f48b8150d895', address: 'Bat Trang' }),
    }))
    expect([401, 403]).toContain(response.status)
    expect(repo().all('user_accounts').length).toBe(before)
  })
})
