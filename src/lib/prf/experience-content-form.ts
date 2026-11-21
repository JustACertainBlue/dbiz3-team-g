// Screen 32: form state of the content columns and the payload sent to POST/PATCH /api/prf/experience (rules: experience-content.ts).
import { parseHighlights, parseInclusions, parseStringList } from '@/lib/explore/vocabulary'

export interface ContentForm {
  highlights: Array<{ title: string; sub: string }>   // always 4 boxes
  suitable_for: string[]
  group_note: string
  per_guest: string; included: string; take_home: boolean   // one item per line
  trong_buoi: string; chup_anh: string; an_toan: string; luu_y: string
  guide_languages: string
  child_policy: string
}

export const HIGHLIGHT_BOXES = 4
export const emptyContentForm = (): ContentForm => ({
  highlights: Array.from({ length: HIGHLIGHT_BOXES }, () => ({ title: '', sub: '' })), suitable_for: [], group_note: '',
  per_guest: '', included: '', take_home: false, trong_buoi: '', chup_anh: '', an_toan: '', luu_y: '', guide_languages: '', child_policy: '',
})

const lines = (value: string) => value.split('\n').map(item => item.trim()).filter(Boolean)

export function contentFormFromRow(row: Record<string, unknown>): ContentForm {
  const form = emptyContentForm()
  const highlights = parseHighlights(row.highlights).slice(0, HIGHLIGHT_BOXES)
  form.highlights = [...highlights, ...Array.from({ length: HIGHLIGHT_BOXES - highlights.length }, () => ({ title: '', sub: '' }))]
  form.suitable_for = parseStringList(row.suitable_for)
  form.guide_languages = parseStringList(row.guide_languages).join('\n')
  const inclusions = parseInclusions(row.inclusions)
  if (inclusions) Object.assign(form, { per_guest: inclusions.per_guest.join('\n'), included: inclusions.included.join('\n'), take_home: inclusions.take_home, ...inclusions.notes })
  form.group_note = typeof row.group_note === 'string' ? row.group_note : ''
  form.child_policy = typeof row.child_policy === 'string' ? row.child_policy : ''
  return form
}

export function contentPayload(form: ContentForm) {
  return {
    highlights: form.highlights.map(item => ({ title: item.title.trim(), sub: item.sub.trim() })).filter(item => item.title || item.sub),
    suitable_for: form.suitable_for,
    group_note: form.group_note,
    inclusions: { per_guest: lines(form.per_guest), included: lines(form.included), take_home: form.take_home,
      notes: { trong_buoi: form.trong_buoi, chup_anh: form.chup_anh, an_toan: form.an_toan, luu_y: form.luu_y } },
    guide_languages: lines(form.guide_languages),
    child_policy: form.child_policy,
  }
}
