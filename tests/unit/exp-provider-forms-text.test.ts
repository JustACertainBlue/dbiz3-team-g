/**
 * Provider Experience screens (EXP067, EXP068, EXP069, EXP070, EXP132): user-facing text carries no internal codes
 * (FR/BR/SR/US ids, screen ids, F-XXX-NN) and the form buttons are Vietnamese only ("Huỷ thay đổi", "Lưu thay đổi").
 * Comments in the source may keep the codes; only JSX text and string literals are checked.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const base = 'src/app/provider/[providerId]/experiences'
const files = [
  `${base}/page.tsx`, `${base}/new/page.tsx`, `${base}/[experienceId]/page.tsx`, `${base}/[experienceId]/edit/page.tsx`,
  `${base}/[experienceId]/delete/page.tsx`, `${base}/ExperienceImagesField.tsx`, `${base}/ExperienceTermsField.tsx`, `${base}/ExperienceLocationField.tsx`,
]
const CODE = /\b(?:(?:FR|BR|SR|US)-\d+|EXP\d{3}|PRF\d{3}|BKG\d{3}|F-[A-Z]+-\d+)\b/
// Drop comments (// … and {/* … */} and /* … */) so only rendered text and string literals remain.
const withoutComments = (source: string) => source.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '')

describe('Provider Experience screens | no internal codes in user-facing text', () => {
  for (const file of files) {
    it(file, () => {
      const lines = withoutComments(readFileSync(file, 'utf8')).split('\n').filter(line => CODE.test(line))
      expect(lines).toEqual([])
    })
  }
})

describe('Provider Experience forms | Vietnamese-only buttons', () => {
  it('EXP070 uses "Huỷ thay đổi" / "Lưu thay đổi"; no English in parentheses on EXP069 / EXP070', () => {
    const edit = readFileSync(`${base}/[experienceId]/edit/page.tsx`, 'utf8')
    const create = readFileSync(`${base}/new/page.tsx`, 'utf8')
    expect(edit).toContain('Huỷ thay đổi')
    expect(edit).toContain("'Lưu thay đổi'")
    for (const source of [edit, create]) expect(source).not.toMatch(/\((?:Discard|Save|Cancel|Create)\)/)
  })
})
