/**
 * Screens 29–33 (provider) against the approved mockup v3: the blocks exist, come in the mockup's order, and carry the mockup's
 * words. Expected strings live in tests/fixtures/mockup-v3/provider-screens.json; every string was checked, in order, against the
 * visible text of hab-mockup-v3/screens/<screen>.html (source of the .dc.html). "optional" blocks are data driven: when the
 * page shows them they must keep that order and wording; "required" ones always show.
 * Not in the mockup text but built: nothing is asserted for it. Not built (no column): FAQ editor, "Người hướng dẫn".
 */
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

;(globalThis as { React?: typeof React }).React = React
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => ({ value: 'provider' }) }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }), useParams: () => ({}), redirect: () => { throw new Error('redirect') }, notFound: () => { throw new Error('notFound') } }))

import { demoRepository } from '@/lib/demo/json-repository'
import ProviderDashboardPage from '@/app/provider/[providerId]/dashboard/page'
import ExperienceManagementPage from '@/app/provider/[providerId]/experiences/page'
import ProviderProfilePage from '@/app/provider/[providerId]/page'
import ProviderExperienceDetail from '@/app/provider/[providerId]/experiences/[experienceId]/page'
import ExperienceFormBody from '@/app/provider/[providerId]/experiences/ExperienceFormBody'
import { emptyContentForm } from '@/lib/prf/experience-content-form'

type Spec = { required: string[]; optional: string[]; tableHeaders?: string[] }
const spec: Record<string, Spec> = JSON.parse(readFileSync('tests/fixtures/mockup-v3/provider-screens.json', 'utf8'))
const BAT_TRANG = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'" }
const visible = (markup: string) => markup.replace(/<(script|style)[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, '\n').replace(/&(amp|lt|gt|quot|#x27);/g, m => ENTITIES[m]).replace(/[ \t]*\n[ \t\n]*/g, '\n')

/** Every required string appears, in order; the optional ones that appear keep their order. */
function expectBlocks(markup: string, screen: string) {
  const text = visible(markup), { required, optional } = spec[screen]
  let at = 0
  for (const item of required) {
    const found = text.indexOf(item, at)
    expect(found, `${screen}: "${item}" missing or out of order after position ${at}`).toBeGreaterThanOrEqual(0)
    at = found + item.length
  }
  let last = 0
  for (const item of optional) {
    const found = text.indexOf(item, last)
    if (found >= 0) last = found + item.length
    else expect(text.indexOf(item), `${screen}: optional "${item}" is on the page but out of order`).toBe(-1)
  }
}

describe('provider screens follow the mockup blocks, order and words', () => {
  beforeEach(() => demoRepository().reset())

  it('29 Tổng quan xưởng', async () => {
    expectBlocks(renderToStaticMarkup(await ProviderDashboardPage({ params: { providerId: BAT_TRANG } })), '29-TongQuanXuong')
  })

  it('31 Quản lý trải nghiệm: title, add button, row line "₫/khách · phút · tối đa khách/ca", pager "Hiển thị x–y / N trải nghiệm"', async () => {
    const markup = renderToStaticMarkup(await ExperienceManagementPage({ params: { providerId: BAT_TRANG }, searchParams: {} }))
    expectBlocks(markup, '31-QuanLyTraiNghiem')
    const text = visible(markup)
    expect(text).toMatch(/[\d.]+ ₫\/khách · \d+ phút · tối đa \d+ khách\/ca/)
    expect(text).toMatch(/Hiển thị \d+–\d+ \/ \d+ trải nghiệm/)
    expect(text).toMatch(/(đặt chỗ sắp tới|Chưa có đặt chỗ)/)
  })

  it('30 Hồ sơ xưởng của tôi', async () => {
    expectBlocks(renderToStaticMarkup(await ProviderProfilePage({ params: { providerId: BAT_TRANG } })), '30-HoSoXuongCuaToi')
  })

  it('33 Chi tiết trải nghiệm của xưởng', async () => {
    const experience = (await demoRepository().all('experiences')).find(row => row.provider_id === BAT_TRANG && !row.archived_at)!
    const markup = renderToStaticMarkup(await ProviderExperienceDetail({ params: { providerId: BAT_TRANG, experienceId: experience.experience_id }, searchParams: {} }))
    expectBlocks(markup, '33-TraiNghiemChuXuong')
    // The slot table shows only when the experience has a free slot on the chosen day (data); then its columns follow the mockup.
    const text = visible(markup), at = text.indexOf('Ca trải nghiệm\nSố khách')
    if (at >= 0) { let pos = at; for (const head of spec['33-TraiNghiemChuXuong'].tableHeaders!) { const found = text.indexOf(head, pos); expect(found, head).toBeGreaterThanOrEqual(0); pos = found + head.length } }
  })

  const formMarkup = (extra: Record<string, unknown> = {}) => {
    const noop = () => {}
    return renderToStaticMarkup(React.createElement(ExperienceFormBody, {
      formData: { name: 'Nặn gốm', category: 'Workshop/Hands-on', duration_minutes: 60, price_per_person: 150000, max_participants: 12, notice_period_hours: 24, experience_location_address: 'Bát Tràng', cancellation_rules_text: '', description: 'Mô tả đủ dài.' },
      setFormData: noop, hasActiveBookings: false, images: [], setImages: noop, setUploading: noop, content: emptyContentForm(), setContent: noop, slots: [],
      policy: { rules: [] }, group: [], special: [], onPolicy: noop, onGroup: noop, onSpecial: noop,
      aiRefining: false, aiDraft: null, onAiRefine: noop, onApplyDraft: noop, onDismissDraft: noop, craftLine: 'Gốm sứ · Làng Bát Tràng', ...extra,
    } as never))
  }

  it('32 Form trải nghiệm: sections and labels in the mockup order', () => {
    expectBlocks(formMarkup(), '32-FormTraiNghiem')
  })

  it('32 read-only facts: craft and village, 72 h hold (constant), payment method; all disabled, none is sent on save', () => {
    const markup = formMarkup()
    // The payment sentence differs from the mockup on purpose (Khánh Linh, 21/11); it comes from the fixture's "deviations" entry.
    const payment = (spec['32-FormTraiNghiem'] as unknown as { deviations: Array<{ value: string; mockupValue: string }> }).deviations[0]
    expect(markup).not.toContain(payment.mockupValue)
    for (const value of ['Gốm sứ · Làng Bát Tràng', '72', payment.value]) {
      const input = markup.match(new RegExp(`<input[^>]*value="${value}"[^>]*>`))?.[0]
      expect(input, value).toBeTruthy()
      expect(input).toMatch(/disabled=""/)
      expect(input).not.toMatch(/\sname=/)
    }
  })

  it('32 group and special discounts sit in "Giá & ca" (before the slots), the cancellation rules stay in "Chính sách của xưởng"', () => {
    const text = visible(formMarkup())
    const at = (item: string, from = 0) => { const found = text.indexOf(item, from); expect(found, item).toBeGreaterThanOrEqual(0); return found }
    let pos = at('Giá & ca trải nghiệm')
    for (const item of ['Chiết khấu đoàn', 'Giá đặc biệt', 'Các ca trong ngày', 'Bao gồm & tiện ích', 'Chính sách của xưởng', 'Chính sách hủy']) pos = at(item, pos)
  })
})
