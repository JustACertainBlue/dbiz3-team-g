/**
 * Issue #208 — EXP070 Edit Experience shows the "Experience location address" input
 * (screen-spec-EXP070.md:40, §3 #14: `experience_location_address` — F-PROFILE-06, String; Optional for Update),
 * with the create form's checks (required text, at most 500 characters as ExperienceCreateSchema), and keeps the
 * BR-014 lock (screen-spec-EXP070.md:75 SR-003: On hold/Booked references lock experience_location_address).
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import ExperienceLocationField from '@/app/provider/[providerId]/experiences/ExperienceLocationField'

const render = (locked: boolean) => renderToStaticMarkup(createElement(ExperienceLocationField, {
  value: 'Thôn 1, Bát Tràng, Gia Lâm', locked, onChange: () => {},
}))
const input = (html: string) => html.match(/<input[^>]*>/)![0]

describe('#208 | EXP070 §3 #14 Experience location address', () => {
  it('no active booking: an editable, required text input of at most 500 characters, labelled', () => {
    const html = render(false)
    expect(html).toContain('Địa điểm diễn ra trải nghiệm')
    expect(input(html)).toMatch(/type="text"/)
    expect(input(html)).toMatch(/\srequired=""/)
    expect(input(html)).toMatch(/maxLength="500"/i)
    expect(input(html)).toContain('value="Thôn 1, Bát Tràng, Gia Lâm"')
    expect(input(html)).not.toMatch(/disabled/)
    expect(html).not.toContain('Đang khóa')
  })

  it('BR-014: with an On hold/Booked booking the input is disabled and marked "Đang khóa"', () => {
    const html = render(true)
    expect(input(html)).toMatch(/disabled=""/)
    expect(html).toContain('Đang khóa')
    expect(input(html)).toContain('value="Thôn 1, Bát Tràng, Gia Lâm"')
  })

  it('the EXP070 page renders the field from the loaded value and locks it with the other BR-014 fields', () => {
    const page = readFileSync('src/app/provider/[providerId]/experiences/[experienceId]/edit/page.tsx', 'utf8')
    expect(page).toMatch(/<ExperienceLocationField\b[^>]*value=\{formData\.experience_location_address\}/)
    expect(page).toMatch(/<ExperienceLocationField\b[^>]*locked=\{hasActiveBookings\}/)
  })
})
