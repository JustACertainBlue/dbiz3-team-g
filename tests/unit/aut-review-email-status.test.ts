import { beforeEach, describe, expect, it } from 'vitest'
import { submitRegistration, verifyRegistration } from '@/lib/auth/registration-service'
import { reviewAgency } from '@/lib/auth/agency-review'
import { reviewNotice } from '@/lib/auth/review-notice'
import { demoSessionContextFor } from '@/lib/auth/session'
import { demoRepository } from '@/lib/demo/json-repository'

// Issue #58. spec-AUT FR-018 §5.1 notification_status { in_app: Enum[Success, Fail], email: Enum[Success, Fail] };
// open question #13 (Closed): Approval, Rejection and Request More Information are notified by email + in-app.
// The HDT page must report what the API returned, and the stored notification must record whether the email
// (the US-6 AS-2 edit link) was handed to the delivery adapter.
const input = {
  full_name: 'Email Status Agency', email: 'email-status@example.invalid', password: 'Secure123!', confirm_password: 'Secure123!',
  company_name: 'Email Status Agency', company_type: 'Travel Agency', tax_id: '9999999933', team_size: 3,
  location: { street: '3 Hang Bac', ward: 'Hang Bac', district: 'Hoan Kiem', city_province: 'Ha Noi' },
  contact_information: { contact_person_name: 'Email Status', phone_number: '+84900000006' }, tour_types: ['Culinary'], registration_documents: [{}],
}
const files = [{ file_id: 'email-status-file', storage_key: 'registration-documents/email-status-file', file_name: 'certificate.pdf', media_type: 'application/pdf', file_size_bytes: '50' }]
const repo = () => demoRepository()
let requestId = ''
const notification = () => repo().all('notifications').filter(row => row.source_id === requestId).at(-1)!

describe('#58 spec-AUT FR-018 §5.1 | HDT review reports the email delivery it actually made', () => {
  beforeEach(async () => {
    repo().reset()
    let otp = ''
    requestId = (await submitRegistration(input, files, message => { otp = message.otp })).registration_request_id
    await verifyRegistration(requestId, otp)
  }, 15000)

  it('FR-018 (normal): Request More Information with a delivery adapter → result "Dev outbox", notification email Success, page says the link was written', async () => {
    const sent: Record<string, string>[] = []
    const result = await reviewAgency(await demoSessionContextFor('hdt'), requestId, 'registration', 'Request More Information', 'Bổ sung giấy phép.', message => { sent.push(message) })
    expect(result.email_delivery_status).toBe('Dev outbox')
    expect(sent).toHaveLength(1)
    expect(notification().email_delivery_status).toBe('Success')
    expect(reviewNotice(result.email_delivery_status)).not.toMatch(/chưa được gửi/)
  })

  it('FR-018 (error): no email service → result "Not configured", notification email Fail, page says email was not sent', async () => {
    const result = await reviewAgency(await demoSessionContextFor('hdt'), requestId, 'registration', 'Request More Information', 'Bổ sung giấy phép.')
    expect(result.email_delivery_status).toBe('Not configured')
    expect(notification().email_delivery_status).toBe('Fail')
    expect(reviewNotice(result.email_delivery_status)).toMatch(/chưa được gửi/)
  })

  it('FR-018 / #13 (boundary): Approve sends no email today, so it stays Fail / "Not configured"', async () => {
    const result = await reviewAgency(await demoSessionContextFor('hdt'), requestId, 'registration', 'Approve', '')
    expect(result.email_delivery_status).toBe('Not configured')
    expect(notification().email_delivery_status).toBe('Fail')
  })

  it('page text (boundary): an unknown or missing status never claims an email was delivered', () => {
    for (const status of [undefined, '', 'Something else']) expect(reviewNotice(status)).toMatch(/chưa được gửi/)
  })
})
