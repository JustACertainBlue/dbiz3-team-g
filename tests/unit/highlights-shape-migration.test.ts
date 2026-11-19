// supabase/migrations/20261119100000_hab_highlights_shape.sql (human decision 2026-11-19): experiences.highlights and
// villages.highlights share one rule (NULL, or 1–4 items, each a non-empty string or an object with a non-empty string
// title and an optional string sub); the editorial profile and group-note constraints stay untouched.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const sql = readFileSync('supabase/migrations/20261119100000_hab_highlights_shape.sql', 'utf8')
const check = (name: string) => sql.match(new RegExp(`ADD CONSTRAINT ${name} CHECK \\(([\\s\\S]*?)\\n\\);`))?.[1]?.replace(/\s+/g, ' ').trim() ?? ''

describe('highlights shape migration', () => {
  it('drops and re-adds both highlights constraints under the same names', () => {
    expect(sql).toContain('ALTER TABLE public.experiences DROP CONSTRAINT IF EXISTS experience_editorial_highlights_chk;')
    expect(sql).toContain('ALTER TABLE public.villages DROP CONSTRAINT IF EXISTS village_highlights_shape_chk;')
    expect(check('experience_editorial_highlights_chk')).not.toBe('')
  })
  it('uses the same rule for experiences and villages', () => {
    expect(check('experience_editorial_highlights_chk')).toBe(check('village_highlights_shape_chk'))
    const rule = check('experience_editorial_highlights_chk')
    expect(rule).toContain('jsonb_array_length(highlights) BETWEEN 1 AND 4')
    expect(rule).toContain(`'$[*].type() ? (@ != "string" && @ != "object")'`)
    expect(rule).toContain('@.title.type() == "string" && @.title != ""')
    expect(rule).toContain('(!exists(@.sub) || @.sub.type() == "string")')
  })
  it('does not touch the editorial profile or group note constraints', () => {
    expect(sql.replace(/^--.*$/gm, '')).not.toMatch(/village_editorial_profile_chk|experience_editorial_group_note_chk/)
  })
})
