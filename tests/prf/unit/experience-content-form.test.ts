// Screen 32: form state of the content columns <-> API payload. Pure functions, no UI.
import { describe, expect, it } from 'vitest'
import { contentFormFromRow, contentPayload, emptyContentForm } from '@/lib/prf/experience-content-form'
import { parseExperienceContent } from '@/lib/prf/experience-content'

describe('contentFormFromRow', () => {
  it('reads the DB shapes (old strings and {title, sub}), pads highlights to 4 boxes, lists become lines', () => {
    const form = contentFormFromRow({
      highlights: JSON.stringify(['Tự tay làm', { title: 'Mang về', sub: 'Mỗi khách một bát' }]), suitable_for: '["Tour nửa ngày"]', guide_languages: '["Tiếng Việt","Tiếng Anh cơ bản"]',
      inclusions: JSON.stringify({ per_guest: ['1 chỗ bàn xoay'], included: ['Đất sét', 'Dụng cụ'], take_home: true, notes: { trong_buoi: 'Chỗ rửa tay', chup_anh: '', an_toan: 'Hộp sơ cứu', luu_y: '' } }),
      group_note: 'Hoàn hảo cho tour nửa ngày!', child_policy: 'Trẻ từ 6 tuổi',
    })
    expect(form.highlights).toEqual([{ title: 'Tự tay làm', sub: '' }, { title: 'Mang về', sub: 'Mỗi khách một bát' }, { title: '', sub: '' }, { title: '', sub: '' }])
    expect(form).toMatchObject({ suitable_for: ['Tour nửa ngày'], guide_languages: 'Tiếng Việt\nTiếng Anh cơ bản', per_guest: '1 chỗ bàn xoay', included: 'Đất sét\nDụng cụ', take_home: true, trong_buoi: 'Chỗ rửa tay', an_toan: 'Hộp sơ cứu', group_note: 'Hoàn hảo cho tour nửa ngày!', child_policy: 'Trẻ từ 6 tuổi' })
  })
  it('an empty or missing row gives the empty form', () => {
    expect(contentFormFromRow({})).toEqual(emptyContentForm())
    expect(emptyContentForm().highlights).toHaveLength(4)
  })
})

describe('contentPayload', () => {
  it('drops blank highlight boxes, splits lines, always sends every field (so clearing works) and passes the server validation', () => {
    const form = { ...emptyContentForm(), highlights: [{ title: ' A ', sub: '' }, { title: '', sub: '' }, { title: 'B', sub: 'b' }, { title: '', sub: '' }], suitable_for: ['Đoàn học sinh'], included: 'x\n\n y ', take_home: true }
    const payload = contentPayload(form) as Record<string, unknown>
    expect(payload.highlights).toEqual([{ title: 'A', sub: '' }, { title: 'B', sub: 'b' }])
    expect(payload.inclusions).toMatchObject({ included: ['x', 'y'], per_guest: [], take_home: true })
    expect(Object.keys(payload).sort()).toEqual(['child_policy', 'group_note', 'guide_languages', 'highlights', 'inclusions', 'suitable_for'])
    expect(() => parseExperienceContent(payload)).not.toThrow()
  })
  it('a box with a sub line and no title is sent as is, so the server refuses it', () => {
    const payload = contentPayload({ ...emptyContentForm(), highlights: [{ title: '', sub: 'chỉ có mô tả' }, ...emptyContentForm().highlights.slice(1)] }) as { highlights: unknown[] }
    expect(payload.highlights).toEqual([{ title: '', sub: 'chỉ có mô tả' }])
    expect(() => parseExperienceContent(payload as Record<string, unknown>)).toThrow()
  })
})
