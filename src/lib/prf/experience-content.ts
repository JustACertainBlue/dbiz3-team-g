// Screen 32 part A: the content columns of `experiences` that the v3 detail pages read (highlights, suitable_for, group_note,
// inclusions, guide_languages, child_policy). Rules follow the DB constraints (migrations 20261118120000, 20261119100000):
//   highlights    jsonb  NULL or 1–4 items, each a non-empty string or {title non-empty, sub string}; stored as [{title, sub}]
//   suitable_for  text[] only terms of SUITABLE_FOR
//   inclusions    jsonb  object {per_guest[], included[], take_home, notes{trong_buoi, chup_anh, an_toan, luu_y}}
//   guide_languages text[], group_note text (not blank), child_policy text
// A field that is absent is not touched; an empty list or blank text clears the column (NULL).
// text[] values are returned as JS arrays (pg serialises them; the fixture store keeps them as JSON); jsonb as JSON strings.
import { SUITABLE_FOR } from '@/lib/explore/vocabulary'

export class ContentFieldError extends Error { readonly statusCode = 400 }

export type ContentChanges = Record<string, string | string[]>
const fail = (message: string): never => { throw new ContentFieldError(message) }
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)

function textList(name: string, value: unknown): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) return fail(`${name} must be a list of text`)
  return (value as string[]).map(item => item.trim()).filter(Boolean)
}
function text(name: string, value: unknown): string {
  if (typeof value !== 'string') return fail(`${name} must be text`)
  return value.trim()
}

export function parseExperienceContent(input: Record<string, unknown>): ContentChanges {
  const out: ContentChanges = {}
  if (input.highlights !== undefined) {
    if (!Array.isArray(input.highlights)) fail('highlights must be a list')
    const items = (input.highlights as unknown[]).map(item => {
      if (typeof item === 'string') return item.trim() ? { title: item.trim(), sub: '' } : fail('highlight title is empty')
      if (isObject(item) && typeof item.title === 'string' && item.title.trim() && (item.sub === undefined || typeof item.sub === 'string'))
        return { title: item.title.trim(), sub: (item.sub as string | undefined)?.trim() ?? '' }
      return fail('highlight needs a title')
    })
    if (items.length > 4) fail('highlights holds at most 4 items')
    out.highlights = items.length ? JSON.stringify(items) : ''
  }
  if (input.suitable_for !== undefined) {
    const list = textList('suitable_for', input.suitable_for)
    const unknown = list.filter(term => !(SUITABLE_FOR as readonly string[]).includes(term))
    if (unknown.length) fail(`suitable_for has unknown terms: ${unknown.join(', ')}`)
    out.suitable_for = list.length ? list : ''
  }
  if (input.guide_languages !== undefined) { const list = textList('guide_languages', input.guide_languages); out.guide_languages = list.length ? list : '' }
  if (input.group_note !== undefined) out.group_note = text('group_note', input.group_note)
  if (input.child_policy !== undefined) out.child_policy = text('child_policy', input.child_policy)
  if (input.inclusions !== undefined) {
    if (!isObject(input.inclusions)) return fail('inclusions must be an object')
    const row = input.inclusions, notes = isObject(row.notes) ? row.notes : {}
    const note = (key: string) => (typeof notes[key] === 'string' ? (notes[key] as string).trim() : '')
    out.inclusions = JSON.stringify({
      per_guest: row.per_guest === undefined ? [] : textList('inclusions.per_guest', row.per_guest),
      included: row.included === undefined ? [] : textList('inclusions.included', row.included),
      take_home: row.take_home === true,
      notes: { trong_buoi: note('trong_buoi'), chup_anh: note('chup_anh'), an_toan: note('an_toan'), luu_y: note('luu_y') },
    })
  }
  return out
}

export const CONTENT_FIELDS = ['highlights', 'suitable_for', 'group_note', 'inclusions', 'guide_languages', 'child_policy'] as const
