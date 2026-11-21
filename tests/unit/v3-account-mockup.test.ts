/**
 * UI v3 account screens: the rendered page has the blocks of the mockup .dc.html, in its order, with its wording.
 * Expected texts: tests/fixtures/v3-account-mockup-texts.json (made by scripts/local/extract-mockup-texts.py).
 * Only static copy is compared. Data (names, emails, times, ids), template placeholders, the shared header and
 * mockup annotations are not. Every other deviation is listed in DEVIATIONS with its reason.
 */
import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import mockup from '../fixtures/v3-account-mockup-texts.json'
;(globalThis as { React?: typeof React }).React = React
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }), useSearchParams: () => new URLSearchParams('token=t'), usePathname: () => '/' }))

import LoginPage from '@/app/login/page'
import ForgotPasswordPage from '@/app/forgot-password/page'
import ForgotSentPage from '@/app/forgot-password/sent/page'
import ResetPasswordPage from '@/app/reset-password/page'
import ResetSuccessPage from '@/app/reset-password/success/page'
import RegisterPage from '@/app/register/page'
import OtpPage from '@/app/register/otp/page'
import AccountView, { type Account } from '@/app/auth-v3/AccountView'
import ReviseView, { type Revision } from '@/app/auth-v3/ReviseView'
import CompanyProfileView from '@/app/auth-v3/CompanyProfileView'
import CompanyEditView, { type AgencyFormData } from '@/app/auth-v3/CompanyEditView'
import { ContactDepartmentPopup, RejectedPopup, ReviseDocsPopup, SubmittedPopup } from '@/app/auth-v3/RegistrationPopups'

const norm = (value: string) => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()
/** Visible text of server HTML, in document order, as one string. */
const visible = (html: string) => norm(html.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' '))

/** Mockup text that is data, a placeholder, an annotation or the shared header: never compared. */
const DATA = /\{\{|@example\.invalid|Tràng An|Lý Gia Hân|GiayDKKD|HS-\d|^\(024\)|^\d{1,2}:\d{2}|^\d{2}\/\d{2}\/\d{4}|^BƯỚC \d$|^[A-Z]{2}$|^[·.*:,]$|^· |^Hà Nội$/
const HEADER = new Set(['Hanoi Artisan Bridge', 'Khám phá', 'Lịch sử đặt chỗ', 'Lịch', 'Tin nhắn', 'Ghép tour AI'])
const isStatic = (text: string, screen: string) => text.length > 2 && !DATA.test(text) && !(screen !== '15' && HEADER.has(text))

/** Known differences, text -> reason. A text listed here is skipped; one not listed and missing fails the test. */
const DEVIATIONS: Record<string, Record<string, string>> = {
  '15': { 'Email hoặc mật khẩu chưa đúng. Kiểm tra lại hoặc đặt lại mật khẩu.': 'error state, shown only after a failed sign-in (wording is in login/page.tsx)' },
  '16': { 'Chúng tôi đã gửi đường dẫn đặt lại mật khẩu đến': 'step 2 names the email only when step 1 kept it in sessionStorage; without it the page says "Nếu email đã đăng ký…"' },
  '17': {
    // Màn 17: mockup 21/11 đã bỏ 3 trường (Loại hình, Số nhân viên, Loại tour); giữ lại vì schema + DB bắt buộc (NOT NULL); gỡ cần migration, để đợt sau.
    '(3 fields)': 'Màn 17: mockup 21/11 đã bỏ 3 trường; giữ lại vì schema + DB bắt buộc (NOT NULL); gỡ cần migration, để đợt sau',
    'Tôi xác nhận thông tin trên là đúng và đồng ý với': 'the box is there, but there is no terms page yet and the agreement is not stored (it only gates the submit button)',
    'điều khoản sử dụng': 'plain text, no terms page yet',
    'chính sách bảo mật': 'plain text, no privacy page yet',
    'Đã có tài khoản?': 'mockup top bar: shared header (SessionHeader), not this page',
    'Đăng nhập': 'mockup top bar link (see above)',
    'Xưởng nghề sẽ thấy email này khi trao đổi với bạn.': 'register test forbids the word "xưởng" on /register; ours says "Nghệ nhân sẽ thấy…"',
    'Nhắn tin trực tiếp với xưởng': 'same guard test; ours says "với nghệ nhân"',
    'Giấy chứng nhận đăng ký doanh nghiệp, giấy phép lữ hành (nếu có). PDF, JPG hoặc PNG, tối đa 10 MB mỗi tệp.': 'ours adds ", tối đa 5 tệp" (server limit)',
  },
  '17a': {
    '‹ Tài khoản của tôi': 'the applicant is signed out: ours links "‹ Đăng nhập"',
    'Mã số thuế phải khớp với tên công ty trên giấy đăng ký.': 'per-field reviewer note: the data has one free-text comment only',
    '· bản đã gửi': 'no data on the file already sent',
    'PDF, JPG hoặc PNG, tối đa 10 MB mỗi tệp. Chụp rõ phần mã số thuế.': 'ours: "…tối đa 10 MB mỗi tệp, tối đa 5 tệp." (the second sentence is note-specific)',
    'CẦN SỬA': 'field marker: the data has no per-field flag',
    'Tải lên bản mới hoặc': 'the row of the file already sent is not shown, ours keeps the upload text (checked below)',
  },
  '19': {
    'Doanh nghiệp của tôi': 'the sidebar link shows only for an account with a business profile (the sample has one, see test)',
    'Không đổi được email đăng nhập. Thông tin công ty sửa ở mục Doanh nghiệp của tôi.': 'checked in the edit-mode test',
    'Sau khi đổi, các thiết bị khác đang đăng nhập sẽ phải đăng nhập lại.': 'ours signs out this device too: "Sau khi đổi, bạn cần đăng nhập lại."',
    'Quản trị viên': 'data: the account title',
  },
  '19a': { 'Theo dõi trạng hồ sơ': 'typo in the .dc.html; png/19a and ours say "Theo dõi trạng thái hồ sơ"' },
  '28': {
    'Tổng quan': 'mockup provider sub-navigation, shared header', 'Trải nghiệm': 'same', 'Xưởng thủ công Bát Tràng': 'same',
    'Công ty lữ hành nội địa · Hà Nội': 'company type is the stored enum: ours says "Công ty lữ hành · Hà Nội"',
    'Văn hoá, di sản': 'tour types of the sample company, data', 'Làng nghề, trải nghiệm': 'tour types of the sample company, data',
    '22 phố Huế, phường Phạm Đình Hổ, quận Hai Bà Trưng, Hà Nội': 'data (the sample address)',
    'Công ty lữ hành nội địa': 'company type is the stored enum Travel Agency / Tour Operator / TMC; ours shows "Công ty lữ hành / điều hành tour / TMC"',
    'Công ty lữ hành quốc tế': 'same enum reason', 'Đại lý du lịch': 'same enum reason',
    'Khách quốc tế': 'tour types are the stored enum (no "Khách quốc tế"; ours has Ẩm thực, Gia đình, Khác)', 'Đơn vị tổ chức tour trải nghiệm văn hóa và làng nghề tại Hà Nội.': 'data',
  },
  // Screen 18 also holds, in the mockup, the states "Sở Du lịch cần bổ sung", "Lý do", "Bổ sung và gửi lại", "Bắt đầu khám phá": the product
  // shows them as the popups of /login (18b, 18c, 18d), by decision, not inside the OTP page; the OTP test stops before them.
  '18': { '(sau 60 giây)': 'resend cooldown: not in the spec (step 0 #10)' },
}

function check(screen: string, html: string, options: { from?: number; to?: number; skip?: string[] } = {}) {
  const page = visible(html)
  const skipped = { ...(DEVIATIONS[screen] ?? {}) }
  const expected = (mockup as Record<string, string[]>)[screen].slice(options.from ?? 0, options.to)
    .map(text => text.replace(/^[✓○] /, ''))
    .filter(text => isStatic(text, screen) && !(text in skipped) && !(options.skip ?? []).includes(text))
  let cursor = 0
  const missing: string[] = []
  const outOfOrder: string[] = []
  for (const text of expected) {
    const wanted = norm(text)
    const at = page.indexOf(wanted, cursor)
    if (at >= 0) cursor = at + wanted.length
    else if (page.includes(wanted)) outOfOrder.push(text)
    else missing.push(text)
  }
  return { missing, outOfOrder, checked: expected.length }
}
const render = (Page: React.ComponentType<any>, props: Record<string, unknown> = {}) => renderToStaticMarkup(React.createElement(Page, props))
const noop = () => {}

describe('mockup texts, blocks and order', () => {
  it('15 sign-in', () => { const r = check('15', render(LoginPage), { from: 1 }); expect(r).toMatchObject({ missing: [], outOfOrder: [] }) })
  it('16 step 1', () => { const t = (mockup as any)['16']; const r = check('16', render(ForgotPasswordPage), { from: 1, to: t.indexOf('BƯỚC 2') }); expect(r).toMatchObject({ missing: [], outOfOrder: [] }) })
  it('16 step 2', () => { const t = (mockup as any)['16']; const r = check('16', render(ForgotSentPage), { from: t.indexOf('BƯỚC 2'), to: t.indexOf('BƯỚC 3') }); expect(r).toMatchObject({ missing: [], outOfOrder: [] }) })
  it('16 step 3', () => { const t = (mockup as any)['16']; const r = check('16', render(ResetPasswordPage), { from: t.indexOf('BƯỚC 3'), to: t.indexOf('Đã đổi mật khẩu') }); expect(r).toMatchObject({ missing: [], outOfOrder: [] }) })
  it('16 step 4', () => { const t = (mockup as any)['16']; const r = check('16', render(ResetSuccessPage), { from: t.indexOf('Đã đổi mật khẩu') }); expect(r).toMatchObject({ missing: [], outOfOrder: [] }) })
  it('17 register', () => { const r = check('17', render(RegisterPage), { from: 1 }); expect(r).toMatchObject({ missing: [], outOfOrder: [] }) })
  it('18 OTP', () => { const t = (mockup as any)['18']; const r = check('18', render(OtpPage), { from: 1, to: t.indexOf('{{stTitle}}') }); expect(r).toMatchObject({ missing: [], outOfOrder: [] }) })
  it('18a popup', () => { const r = check('18a', render(SubmittedPopup, { open: true, onClose: noop, info: { code: 'HS-2611-0007', company: 'Công ty Du lịch Tràng An', email: 'a@example.invalid', sentAt: '09:02, 12/11/2026' } }), { from: 1 }); expect(r).toMatchObject({ missing: [], outOfOrder: [] }) })
  it('18b popup', () => { const r = check('18b', render(ReviseDocsPopup, { open: true, onClose: noop, company: 'Công ty Du lịch Tràng An', note: { field: 'Giấy chứng nhận đăng ký doanh nghiệp', message: 'Giấy đăng ký doanh nghiệp bị mờ phần mã số thuế. Vui lòng tải lại bản rõ hơn.', at: '10:15, 13/11/2026' }, reviseHref: '/r' }), { from: 1 }); expect(r).toMatchObject({ missing: [], outOfOrder: [] }) })
  it('18c popup', () => { const r = check('18c', render(RejectedPopup, { open: true, onClose: noop, company: 'Công ty Du lịch Tràng An', note: { message: 'Mã số thuế không khớp với tên công ty trên giấy đăng ký.', at: '15:40, 13/11/2026' }, reviseHref: '/r', contact: { email: 'a', phone: 'b', hours: 'c' } }), { from: 1 }); expect(r).toMatchObject({ missing: [], outOfOrder: [] }) })
  it('18d popup', () => { const r = check('18d', render(ContactDepartmentPopup, { open: true, onClose: noop, info: { code: 'HS-2611-0007', email: 'a', phone: 'b', hours: 'c' } }), { from: 1 }); expect(r).toMatchObject({ missing: [], outOfOrder: [] }) })

  const account: Account = { full_name: 'Lý Gia Hân', title: 'Quản trị viên', phone: '+84 932 000 002', email: 'doanhnghiep3@example.invalid', account_status: 'Active', created_at: '2026-11-12T02:02:00.000Z', role: 'Tour_Agency', admin_type: null, data_scope: 'own', organization: 'Công ty Du lịch Tràng An', business_href: '/agency/ag-1' }
  const view = (changes: Record<string, unknown> = {}) => render(AccountView, { account, panel: 'info', forced: false, error: '', saving: false, saved: false, avatarVersion: 0, avatarFailed: true, onEdit: noop, onCancel: noop, onSubmit: noop, onAvatar: noop, onAvatarError: noop, ...changes })
  const at = (screen: string, text: string, after = 0) => (mockup as any)[screen].indexOf(text, after)

  it('19 my account (view): sidebar, profile, rows', () => {
    const r = check('19', view(), { from: 1, to: at('19', 'Sửa thông tin cá nhân'), skip: ['Doanh nghiệp của tôi'] })
    expect(r).toMatchObject({ missing: [], outOfOrder: [] })
    expect(view()).toContain('Doanh nghiệp của tôi')
  })
  it('19 my account (edit): the edit block of the mockup', () => {
    const from = at('19', 'Sửa thông tin cá nhân')
    const r = check('19', view({ panel: 'edit' }), { from, to: at('19', 'Đổi mật khẩu', from) })
    expect(r).toMatchObject({ missing: [], outOfOrder: [] })
    expect(view({ panel: 'edit' })).toContain('Không đổi được email đăng nhập. Thông tin công ty sửa ở mục Doanh nghiệp của tôi.')
  })
  it('19 change password: the password block of the mockup', () => {
    const from = at('19', 'Đổi mật khẩu', at('19', 'Sửa thông tin cá nhân'))
    const r = check('19', view({ panel: 'password' }), { from })
    expect(r).toMatchObject({ missing: [], outOfOrder: [] })
  })
  it('19a waiting account: banner, then the same profile', () => {
    const r = check('19a', view({ account: { ...account, account_status: 'Pending Approval' } }), { from: 1, to: at('19a', 'Sửa thông tin cá nhân'), skip: ['Doanh nghiệp của tôi ›'] })
    expect(r).toMatchObject({ missing: [], outOfOrder: [] })
    const html = view({ account: { ...account, account_status: 'Pending Approval' } })
    expect(html).toContain('Doanh nghiệp của tôi ›')
    expect(html).toContain('Chờ Sở Du lịch duyệt')
  })
  it('28 company profile: title block and the three cards', () => {
    const agency = { agency_id: 'ag-1', agency_name: 'Công ty Du lịch Tràng An', company_type: 'Travel Agency', location: { street: '22 phố Huế', ward: 'Phạm Đình Hổ', city_province: 'Hà Nội' }, team_size: 10, contact: { contact_person_name: 'Lý Gia Hân', phone_number: '+84 932 000 002', business_email: 'doanhnghiep3@example.invalid' }, tax_id: '0107000002', tour_types: ['Cultural/Heritage', 'Craft Village/Experiential'], description: 'Đơn vị tổ chức tour.' }
    const html = render(CompanyProfileView, { agency, agencyId: 'ag-1' })
    const r = check('28', html, { from: 1, to: at('28', 'Sửa hồ sơ công ty') })
    expect(r).toMatchObject({ missing: [], outOfOrder: [] })
    for (const text of ['Văn hoá, di sản', 'Làng nghề, trải nghiệm']) expect(html).toContain(text)
  })

  it('17a supplement form: note, company block, documents block, confirm, submit', () => {
    const data: Revision = { comments: 'Giấy đăng ký doanh nghiệp bị mờ.', full_name: 'Lý Gia Hân', email: 'a@example.invalid', company_name: 'Công ty Du lịch Tràng An', company_type: 'Travel Agency', tax_id: '0107000002', team_size: 10, tour_types: [], location: { street: 'x' }, contact_information: { phone_number: '1' } }
    const html = render(ReviseView, { data, setData: noop, files: [], setFiles: noop, confirmed: false, setConfirmed: noop, hydrated: true, busy: false, error: '', submit: noop })
    const r = check('17a', html, { from: 1 })
    expect(r).toMatchObject({ missing: [], outOfOrder: [] })
    expect(html).toContain('Tải lên bản mới hoặc')
  })

  it('28 edit (PRF021): note, fields in order, cancel, save, last note', () => {
    const form: AgencyFormData = { company_name: 'Công ty Du lịch Tràng An', tax_id: '0107000002', company_type: 'Travel Agency', street: '22 phố Huế', ward: 'Phạm Đình Hổ', district: 'Hai Bà Trưng', city_province: 'Hà Nội', description: 'Đơn vị tổ chức tour.', team_size: 10, contact_person_name: 'Lý Gia Hân', phone_number: '+84 932 000 002', business_email: 'doanhnghiep3@example.invalid', tour_types: [] }
    const html = render(CompanyEditView, { form, setForm: noop, saving: false, hydrated: true, message: null, onSubmit: noop, agencyId: 'ag-1' })
    const from = at('28', 'Sửa hồ sơ công ty')
    const r = check('28', html, { from, skip: ['Giới thiệu', 'Đơn vị tổ chức tour trải nghiệm văn hóa và làng nghề tại Hà Nội.', 'Địa chỉ'] })
    expect(r).toMatchObject({ missing: [], outOfOrder: [] })
    for (const text of ['Địa chỉ', 'Giới thiệu', 'Số nhân viên', 'Email công việc']) expect(html).toContain(text)
  })
})
