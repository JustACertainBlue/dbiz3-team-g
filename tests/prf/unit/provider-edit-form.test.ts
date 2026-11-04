/**
 * Slice A (linh/prf-fixes) – PRF128 Edit Provider Profile form helpers.
 *
 * Written before src/lib/prf/provider-edit-form.ts exists (Constitution II).
 * - US-4 AC1: the form shows the Provider's existing information (from the API, not hard-coded).
 * - FR-004: the form edits the FR-004 inputs, including craft_type, business_registration_number,
 *   location_address, artisan_names and operating_hours.
 * - Save sends only the fields the Provider changed, so an unchanged Save is never a major change.
 * - operating_hours use ISO weekdays 1–7 (spec-BKG #28, #78), so Sunday (7) can be saved.
 */
import { describe, expect, it } from 'vitest'
import {
  PROVIDER_CRAFT_TYPES,
  buildProviderPatch,
  operatingHoursToRows,
  profileToForm,
} from '@/lib/prf/provider-edit-form'
import { ProviderProfilePatchSchema } from '@/lib/prf/validators'

const profile = {
  provider_name: 'Xưởng thủ công Bát Tràng',
  craft_type: 'Ceramics',
  business_registration_number: 'HKD-HN-20260001',
  location_address: 'Thôn nghề truyền thống, Bát Tràng, Gia Lâm, Hà Nội',
  general_description: 'Không gian trải nghiệm nghề truyền thống dành cho đoàn khách.',
  artisan_names: ['Nghệ nhân A', 'Nghệ nhân B'],
  contact: { phone_number: '+84963000000', business_email: 'langnghe1@example.invalid' },
}
// F-SCHED-01 `operating_hours` shape (spec-BKG #78): ISO weekday keys, arrays of ranges.
const hours = { 1: [{ local_start: '08:00', local_end: '17:00' }], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [{ local_start: '09:00', local_end: '12:00' }] }

describe('Slice A | profileToForm (US-4 AC1)', () => {
  it('fills every field from the API profile and the operating hours', () => {
    const form = profileToForm(profile, hours)
    expect(form).toMatchObject({
      business_name: 'Xưởng thủ công Bát Tràng',
      craft_type: 'Ceramics',
      business_registration: 'HKD-HN-20260001',
      location_address: profile.location_address,
      general_description: profile.general_description,
      artisan_names: 'Nghệ nhân A, Nghệ nhân B',
      phone_number: '+84963000000',
      business_email: 'langnghe1@example.invalid',
    })
    expect(form.operating_hours).toEqual([
      { weekday: 1, local_start: '08:00', local_end: '17:00' },
      { weekday: 7, local_start: '09:00', local_end: '12:00' },
    ])
  })

  it('offers exactly the FR-004 craft_type values', () => {
    expect(PROVIDER_CRAFT_TYPES).toEqual(['Ceramics', 'Silk/Textile', 'Woodcarving', 'Food/Culinary', 'Metalwork', 'Paper/Painting', 'Other'])
  })
})

describe('Slice A | buildProviderPatch (FR-004, BR-018)', () => {
  const initial = profileToForm(profile, hours)

  it('an unchanged form sends nothing', () => {
    expect(buildProviderPatch(initial, { ...initial, operating_hours: [...initial.operating_hours] })).toEqual({})
  })

  it('sends only the changed fields', () => {
    expect(buildProviderPatch(initial, { ...initial, business_name: 'Tên mới', general_description: 'Mô tả mới' }))
      .toEqual({ business_name: 'Tên mới', general_description: 'Mô tả mới' })
  })

  it('sends artisan_names as an array and operating_hours as the full ISO-weekday list when changed', () => {
    const changed = {
      ...initial,
      artisan_names: 'Nghệ nhân A,  Nghệ nhân C ',
      operating_hours: [...initial.operating_hours, { weekday: 6, local_start: '08:00', local_end: '11:00' }],
    }
    expect(buildProviderPatch(initial, changed)).toEqual({
      artisan_names: ['Nghệ nhân A', 'Nghệ nhân C'],
      operating_hours: [
        { weekday: 1, local_start: '08:00', local_end: '17:00', is_closed: false },
        { weekday: 7, local_start: '09:00', local_end: '12:00', is_closed: false },
        { weekday: 6, local_start: '08:00', local_end: '11:00', is_closed: false },
      ],
    })
  })
})

describe('Slice A | operating hours use ISO weekdays 1–7 (spec-BKG #28, #78; BR-021)', () => {
  it('turns the #78 object into rows ordered by weekday', () => {
    expect(operatingHoursToRows(hours).map(row => row.weekday)).toEqual([1, 7])
  })

  it('accepts Sunday = 7 and rejects 0 in the PATCH schema', () => {
    const period = (weekday: number) => ({ operating_hours: [{ weekday, local_start: '09:00', local_end: '12:00', is_closed: false }] })
    expect(ProviderProfilePatchSchema.safeParse(period(7)).success).toBe(true)
    expect(ProviderProfilePatchSchema.safeParse(period(0)).success).toBe(false)
  })
})
