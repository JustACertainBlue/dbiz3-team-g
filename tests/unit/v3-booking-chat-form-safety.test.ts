/**
 * Form safety for the Booking & Chat scope (bug-list-sau-v3.md §B):
 * Every <form> in these 6 files uses method="post", and every submit button stays disabled until hydrated
 * while preserving existing pending/saving/busy/selection guards.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const SCOPED_FORMS = [
  'src/app/messages/page.tsx',
  'src/app/provider/[providerId]/bookings/[bookingId]/BookingActionsBar.tsx',
  'src/app/provider/[providerId]/bookings/new/CreateBookingForm.tsx',
  'src/app/provider/[providerId]/bookings/[bookingId]/edit/EditBookingForm.tsx',
  'src/app/agency/[agencyId]/bookings/[bookingId]/BookerForm.tsx',
  'src/app/explore/v3/RequestButton.tsx',
] as const

describe('booking & chat forms are POST and wait for hydration', () => {
  for (const path of SCOPED_FORMS) {
    it(`${path}: every <form> has method="post" and every submit button checks !hydrated`, () => {
      const source = readFileSync(path, 'utf8')
      const forms = source.match(/<form[\s>][^>]*>/g) ?? []
      expect(forms.length).toBeGreaterThan(0)
      for (const tag of forms) expect(tag, 'form tag').toMatch(/method="post"/)

      const submits = (source.match(/<(?:button|Button)\b(?:[^>]|=>)*>/g) ?? []).filter(
        tag => !/\btype="(?:button|reset)"/.test(tag),
      )
      expect(submits.length, 'submit buttons').toBeGreaterThan(0)
      for (const button of submits) expect(button, button).toMatch(/disabled=\{[^}]*!hydrated/)
      expect(source).toMatch(/useHydrated\(\)/)
    })
  }
})
