// Screen 32 part A: content columns of experiences (highlights, suitable_for, group_note, inclusions, guide_languages,
// child_policy) are validated by the DB constraints' rules and written by createExperience / updateExperience.
import { describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/db/application-store'
import { createExperience, updateExperience, getExperienceById, ExperienceError, type ExperienceInput } from '@/lib/prf/experience-service'
import { parseExperienceContent, ContentFieldError } from '@/lib/prf/experience-content'
import { parseHighlights, parseInclusions, parseStringList } from '@/lib/explore/vocabulary'
import { providerSession, SEED_IDS } from '../helpers/mockSession'

const owner = providerSession(SEED_IDS.provider1Verified, SEED_IDS.provider1VerifiedUserId)
const base: ExperienceInput = {
  name: 'Nặn gốm nội dung', description: 'Trải nghiệm nặn gốm có nghệ nhân hướng dẫn tận tình.', category: 'Workshop/Hands-on',
  duration_minutes: 60, price_per_person: 150000, max_participants: 12, notice_period_hours: 24,
  images: ['Activity', 'Space', 'Product'].map(category => ({ url: `https://img.test/${category}.jpg`, category, media_type: 'image/jpeg', file_size_bytes: 1000000, width_px: 1920, height_px: 1080 })) as ExperienceInput['images'],
}

describe('parseExperienceContent (rules of the DB CHECK constraints)', () => {
  it('highlights: 1–4 items, strings or {title, sub}; stored as [{title, sub}]; empty list clears', () => {
    expect(parseExperienceContent({ highlights: ['Tự tay làm', { title: 'Mang sản phẩm về', sub: 'Mỗi khách một sản phẩm' }, { title: 'Gọn 60 phút' }] }).highlights)
      .toBe(JSON.stringify([{ title: 'Tự tay làm', sub: '' }, { title: 'Mang sản phẩm về', sub: 'Mỗi khách một sản phẩm' }, { title: 'Gọn 60 phút', sub: '' }]))
    expect(parseExperienceContent({ highlights: [] }).highlights).toBe('')
    expect(() => parseExperienceContent({ highlights: ['1', '2', '3', '4', '5'] })).toThrow(ContentFieldError)
    expect(() => parseExperienceContent({ highlights: [''] })).toThrow(ContentFieldError)
    expect(() => parseExperienceContent({ highlights: [{ sub: 'x' }] })).toThrow(ContentFieldError)
    expect(() => parseExperienceContent({ highlights: [{ title: 'x', sub: 3 }] })).toThrow(ContentFieldError)
    expect(() => parseExperienceContent({ highlights: 'text' })).toThrow(ContentFieldError)
  })
  it('suitable_for: only the shared vocabulary', () => {
    expect(parseExperienceContent({ suitable_for: ['Đoàn học sinh', 'Tour nửa ngày'] }).suitable_for).toEqual(['Đoàn học sinh', 'Tour nửa ngày'])
    expect(parseExperienceContent({ suitable_for: [] }).suitable_for).toBe('')
    expect(() => parseExperienceContent({ suitable_for: ['Đoàn bất kỳ'] })).toThrow(ContentFieldError)
  })
  it('group_note, child_policy: text, blank clears; guide_languages: list', () => {
    expect(parseExperienceContent({ group_note: ' Hoàn hảo cho tour nửa ngày! ', child_policy: '', guide_languages: ['Tiếng Việt', 'Tiếng Anh cơ bản'] }))
      .toEqual({ group_note: 'Hoàn hảo cho tour nửa ngày!', child_policy: '', guide_languages: ['Tiếng Việt', 'Tiếng Anh cơ bản'] })
  })
  it('inclusions: object with lists, take_home and notes; unknown keys are dropped; non-object refused', () => {
    const value = parseExperienceContent({ inclusions: { per_guest: ['1 chỗ bàn xoay'], included: ['Đất sét'], take_home: true, notes: { trong_buoi: 'Chỗ rửa tay', zzz: 'x' }, other: 1 } }).inclusions as string
    expect(JSON.parse(value)).toEqual({ per_guest: ['1 chỗ bàn xoay'], included: ['Đất sét'], take_home: true, notes: { trong_buoi: 'Chỗ rửa tay', chup_anh: '', an_toan: '', luu_y: '' } })
    expect(() => parseExperienceContent({ inclusions: ['x'] })).toThrow(ContentFieldError)
  })
  it('fields that are absent stay absent', () => { expect(parseExperienceContent({})).toEqual({}) })
})

describe('createExperience / updateExperience write the content columns', () => {
  it('create stores them and the public parsers read them back', async () => {
    const created = await createExperience(owner, { ...base, highlights: ['Tự tay làm', { title: 'Gọn 60 phút', sub: 'Dễ ghép tour' }], suitable_for: ['Tour nửa ngày'], group_note: 'Hoàn hảo cho tour nửa ngày!',
      inclusions: { included: ['Đất sét'], take_home: true }, guide_languages: ['Tiếng Việt'], child_policy: 'Trẻ từ 6 tuổi' } as ExperienceInput)
    const row = (await demoRepository().find('experiences', item => item.experience_id === created.experience_id))!
    expect(parseHighlights(row.highlights)).toEqual([{ title: 'Tự tay làm', sub: '' }, { title: 'Gọn 60 phút', sub: 'Dễ ghép tour' }])
    expect(parseStringList(row.suitable_for)).toEqual(['Tour nửa ngày'])
    expect(parseStringList(row.guide_languages)).toEqual(['Tiếng Việt'])
    expect(parseInclusions(row.inclusions)?.included).toEqual(['Đất sét'])
    expect(row.group_note).toBe('Hoàn hảo cho tour nửa ngày!')
    expect(row.child_policy).toBe('Trẻ từ 6 tuổi')
    const detail = await getExperienceById(created.experience_id) as { highlights: string }
    expect(parseHighlights(detail.highlights)).toHaveLength(2)
  })
  it('create without content columns leaves them empty (existing behaviour)', async () => {
    const created = await createExperience(owner, base)
    const row = (await demoRepository().find('experiences', item => item.experience_id === created.experience_id))!
    expect(parseHighlights(row.highlights ?? '')).toEqual([])
  })
  it('update changes only the fields sent, and clears on an empty list', async () => {
    const created = await createExperience(owner, { ...base, highlights: ['A'], suitable_for: ['Đoàn học sinh'], child_policy: 'x' } as ExperienceInput)
    await updateExperience(created.experience_id, owner, { suitable_for: [], group_note: 'Ghi chú' } as Partial<ExperienceInput>)
    const row = (await demoRepository().find('experiences', item => item.experience_id === created.experience_id))!
    expect(parseStringList(row.suitable_for ?? '')).toEqual([])
    expect(row.group_note).toBe('Ghi chú')
    expect(parseHighlights(row.highlights)).toEqual([{ title: 'A', sub: '' }])
    expect(row.child_policy).toBe('x')
  })
  it('invalid content is a 400 and nothing is written', async () => {
    await expect(createExperience(owner, { ...base, highlights: ['1', '2', '3', '4', '5'] } as ExperienceInput)).rejects.toMatchObject({ statusCode: 400 })
    const created = await createExperience(owner, base)
    await expect(updateExperience(created.experience_id, owner, { suitable_for: ['Không có trong danh sách'] } as Partial<ExperienceInput>)).rejects.toBeInstanceOf(ExperienceError)
    const row = (await demoRepository().find('experiences', item => item.experience_id === created.experience_id))!
    expect(row.suitable_for ?? '').toBe('')
  })
})
