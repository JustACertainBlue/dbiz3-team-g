import { beforeEach, describe, expect, it } from 'vitest'
import { POST as login } from '@/app/api/auth/login/route'
import { POST as createMatchingSession } from '@/app/api/ait/sessions/route'
import { POST as requestQuote } from '@/app/api/ait/sessions/[id]/quote/route'
import { POST as openChat } from '@/app/api/ait/sessions/[id]/chat/route'
import { demoRepository } from '@/lib/demo/json-repository'

const repo = demoRepository()
const testAgencyEmails = [
  't-an-agency@example.invalid',
  't-binh-agency@example.invalid',
  't-chi-agency@example.invalid',
]

describe('Synthetic Agency seed accounts', () => {
  beforeEach(() => repo.reset())

  it('links each approved bcrypt-backed account to its Agency profile and registration records', async () => {
    const accounts = await repo.all('user_accounts')
    const agencies = await repo.all('agency_profiles')
    const registrations = await repo.all('agency_registration_requests')
    const submissions = await repo.all('registration_submission_versions')
    const preferences = await repo.all('agency_preference_profiles')

    for (const email of testAgencyEmails) {
      const account = accounts.find(row => row.email === email)
      expect(account).toBeDefined()
      expect(account).toMatchObject({ role_code: 'Tour_Agency', account_status: 'Approved' })
      expect(account!.password_hash).toMatch(/^\$2[aby]\$10\$/)

      const agency = agencies.find(row => row.user_id === account!.user_id)
      expect(agency).toBeDefined()
      const registration = registrations.find(row => row.registration_request_id === agency!.registration_request_id)
      expect(registration).toMatchObject({ current_status: 'Approved', agency_user_id: account!.user_id })
      expect(submissions.some(row => row.registration_request_id === agency!.registration_request_id)).toBe(true)
      expect(preferences.some(row => row.agency_id === agency!.agency_id)).toBe(true)
    }
  })
})

const passwords = process.env.HAB_TEST_AGENCY_PASSWORDS
  ? JSON.parse(process.env.HAB_TEST_AGENCY_PASSWORDS) as Record<string, string>
  : null

describe.skipIf(!passwords)('Synthetic Agency product login', () => {
  beforeEach(() => repo.reset())

  it('authenticates each bcrypt-backed account and issues its Agency session', async () => {
    for (const email of testAgencyEmails) {
      const response = await login(new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: passwords![email] }),
      }))
      const body = await response.json()
      const account = (await repo.find('user_accounts', row => row.email === email))!
      const agency = (await repo.find('agency_profiles', row => row.user_id === account.user_id))!

      expect(response.status).toBe(200)
      expect(response.headers.get('set-cookie')).toContain('hab_session=')
      expect(body.data.session).toMatchObject({
        authenticated: true,
        role: 'Tour_Agency',
        agencyId: agency.agency_id,
      })
    }
  })

  it('lets each authenticated test Agency open a quote and Chat handoff', async () => {
    const experienceId = 'c8281688-2dc1-5cb1-9ff6-139df04ba562'
    for (const email of testAgencyEmails) {
      const loginResponse = await login(new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: passwords![email] }),
      }))
      const cookie = loginResponse.headers.get('set-cookie')?.split(';', 1)[0]
      expect(loginResponse.status).toBe(200)
      expect(cookie).toMatch(/^hab_session=/)

      const sessionResponse = await createMatchingSession(new Request('http://localhost/api/ait/sessions', {
        method: 'POST',
        headers: { cookie: cookie! },
      }))
      const matchingSession = await sessionResponse.json()
      expect(sessionResponse.status).toBe(201)

      const context = { params: { id: matchingSession.session_id } }
      const quoteResponse = await requestQuote(new Request(`http://localhost/api/ait/sessions/${matchingSession.session_id}/quote`, {
        method: 'POST',
        headers: { cookie: cookie!, 'content-type': 'application/json' },
        body: JSON.stringify({ experience_id: experienceId }),
      }), context)
      const chatResponse = await openChat(new Request(`http://localhost/api/ait/sessions/${matchingSession.session_id}/chat`, {
        method: 'POST',
        headers: { cookie: cookie!, 'content-type': 'application/json' },
        body: JSON.stringify({ experience_id: experienceId }),
      }), context)

      expect(quoteResponse.status).toBe(200)
      expect(chatResponse.status).toBe(200)
      expect((await chatResponse.json()).chat_session_id).toBeTruthy()
    }
  })
})
