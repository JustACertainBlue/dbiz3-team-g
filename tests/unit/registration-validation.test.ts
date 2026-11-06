import { describe, expect, it } from 'vitest'
import { otpVerifySchema, registrationSchema } from '../../src/lib/auth/registration-validation'

const valid = {
  full_name: 'Nguyen An', email: 'agency@example.invalid', password: 'Secure123!', confirm_password: 'Secure123!',
  company_name: 'Example Agency', company_type: 'Travel Agency', tax_id: '1234567890',
  location: { street: '1 Main', ward: 'Ward', district: 'District', city_province: 'Hanoi' },
  contact_information: { contact_person_name: 'Nguyen An', phone_number: '0912345678' },
  team_size: 2, tour_types: ['Cultural/Heritage'], registration_documents: [{}],
}

describe('AUT registration validation from PR #11', () => {
  it('accepts a complete valid submission', () => expect(registrationSchema.safeParse(valid).success).toBe(true))
  it('rejects mismatched or weak passwords and invalid tax IDs', () => {
    for (const change of [{ confirm_password: 'different' }, { password: 'weak', confirm_password: 'weak' }, { tax_id: '123' }]) {
      expect(registrationSchema.safeParse({ ...valid, ...change }).success).toBe(false)
    }
  })
  it('accepts only a six digit OTP with a valid registration ID', () => {
    const registration_request_id = '4bbf44e8-604d-5b3e-b1bd-324091eea2fb'
    expect(otpVerifySchema.safeParse({ registration_request_id, otp_code: '012345' }).success).toBe(true)
    expect(otpVerifySchema.safeParse({ registration_request_id, otp_code: '12345' }).success).toBe(false)
  })
})
