/**
 * UI v3 account screens (15–20a, 28): the small pieces of logic that the mockup adds on top of the existing
 * login / registration / OTP flows. The flows themselves (API calls, validation, redirects) are unchanged.
 * Source: hab-mockup-v3 png/16 (password checklist), png/18a–18c (registration status popups), png/18 (OTP timer).
 */
import { describe, expect, it } from 'vitest'
import { formatViDateTime, otpCountdown, passwordChecks, registrationPopupKind } from '@/app/auth-v3/rules'

describe('png/16 password checklist', () => {
  it('lists four rules in the mockup order', () => {
    expect(passwordChecks('').map(check => check.id)).toEqual(['length', 'case', 'digit', 'special'])
  })
  it('marks every rule unmet for an empty password', () => {
    expect(passwordChecks('').every(check => !check.ok)).toBe(true)
  })
  it('marks the first three rules met and the special-character rule unmet for "Abcdefg1"', () => {
    expect(passwordChecks('Abcdefg1').map(check => check.ok)).toEqual([true, true, true, false])
  })
  it('needs both upper and lower case for the case rule', () => {
    expect(passwordChecks('abcdefg1!').find(check => check.id === 'case')?.ok).toBe(false)
    expect(passwordChecks('ABCDEFG1!').find(check => check.id === 'case')?.ok).toBe(false)
    expect(passwordChecks('Abcdefg1!').find(check => check.id === 'case')?.ok).toBe(true)
  })
  it('counts 8 characters as long enough and 7 as too short', () => {
    expect(passwordChecks('Abcde1!x').find(check => check.id === 'length')?.ok).toBe(true)
    expect(passwordChecks('Abcde1!').find(check => check.id === 'length')?.ok).toBe(false)
  })
  it('rejects more than 64 characters, the server limit', () => {
    expect(passwordChecks('Ab1!' + 'x'.repeat(61)).find(check => check.id === 'length')?.ok).toBe(false)
    expect(passwordChecks('Ab1!' + 'x'.repeat(60)).find(check => check.id === 'length')?.ok).toBe(true)
  })
})

describe('png/18a–18c registration popup kind', () => {
  it('maps the stored account status to the popup', () => {
    expect(registrationPopupKind('Pending Approval')).toBe('submitted')
    expect(registrationPopupKind('Rejected')).toBe('rejected')
    expect(registrationPopupKind('Revision Requested')).toBe('revise')
  })
  it('shows no popup for any other status', () => {
    expect(registrationPopupKind('Active')).toBeNull()
    expect(registrationPopupKind('')).toBeNull()
    expect(registrationPopupKind(undefined)).toBeNull()
  })
})

describe('png/18 OTP timer', () => {
  it('shows mm:ss for the remaining time', () => {
    expect(otpCountdown(272)).toBe('04:32')
    expect(otpCountdown(600)).toBe('10:00')
    expect(otpCountdown(5)).toBe('00:05')
  })
  it('never goes below zero', () => {
    expect(otpCountdown(-3)).toBe('00:00')
  })
})

describe('Vietnamese date time like "09:02, 12/11/2026"', () => {
  it('formats an ISO instant in Hanoi time', () => {
    expect(formatViDateTime('2026-11-12T02:02:00.000Z')).toBe('09:02, 12/11/2026')
  })
  it('returns an empty string for a missing or invalid value', () => {
    expect(formatViDateTime('')).toBe('')
    expect(formatViDateTime(undefined)).toBe('')
    expect(formatViDateTime('not a date')).toBe('')
  })
})

// png/18a–18d, png/16, png/28: markup of the pieces that no page reaches yet or that need no network.
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ContactDepartmentPopup, RejectedPopup, ReviseDocsPopup, SubmittedPopup } from '@/app/auth-v3/RegistrationPopups'
import AccountView from '@/app/auth-v3/AccountView'
;(globalThis as { React?: typeof React }).React = React

describe('registration status popups', () => {
  const noop = () => {}
  it('18a lists the company, email, send time and the waiting status, and hides rows with no data', () => {
    const html = renderToStaticMarkup(React.createElement(SubmittedPopup, { open: true, onClose: noop, info: { company: 'Công ty Du lịch Tràng An', email: 'a@example.invalid', sentAt: '09:02, 12/11/2026' } }))
    expect(html).toContain('Đã gửi hồ sơ đăng ký thành công')
    expect(html).toContain('Công ty Du lịch Tràng An')
    expect(html).toContain('Chờ Sở Du lịch duyệt')
    expect(html).not.toContain('Mã hồ sơ')
  })
  it('18a renders nothing while closed', () => {
    expect(renderToStaticMarkup(React.createElement(SubmittedPopup, { open: false, onClose: noop, info: {} }))).toBe('')
  })
  it('18b shows the reviewer note and a link to the revise page', () => {
    const html = renderToStaticMarkup(React.createElement(ReviseDocsPopup, { open: true, onClose: noop, company: 'Tràng An', note: { field: 'Giấy chứng nhận đăng ký doanh nghiệp', message: 'Bản mờ.', at: '10:15, 13/11/2026' }, reviseHref: '/register/revise?token=t' }))
    expect(html).toContain('Hồ sơ cần bổ sung giấy tờ')
    expect(html).toContain('Bản mờ.')
    expect(html).toContain('href="/register/revise?token=t"')
  })
  it('18c offers the contact popup and the resubmit link; 18d puts the profile code in the mail subject', () => {
    const rejected = renderToStaticMarkup(React.createElement(RejectedPopup, { open: true, onClose: noop, company: 'Tràng An', note: { message: 'Sai MST.' }, reviseHref: '/register/revise?token=t', contact: { email: 'h@example.invalid', phone: '0', hours: '08:00' } }))
    expect(rejected).toContain('Hồ sơ đăng ký chưa được duyệt')
    expect(rejected).toContain('Liên hệ Sở Du lịch')
    expect(rejected).toContain('Sửa và gửi lại hồ sơ')
    const contact = renderToStaticMarkup(React.createElement(ContactDepartmentPopup, { open: true, onClose: noop, info: { code: 'HS-1', email: 'h@example.invalid', phone: '0', hours: '08:00' } }))
    expect(contact).toContain('mailto:h@example.invalid?subject=')
  })
  it('18c hides the contact button and the contact sentence while the contact is empty', () => {
    const html = renderToStaticMarkup(React.createElement(RejectedPopup, { open: true, onClose: noop, note: { message: 'Sai MST.' }, contact: null }))
    expect(html).toContain('Hồ sơ đăng ký chưa được duyệt')
    expect(html).not.toContain('Liên hệ Sở Du lịch')
    expect(html).not.toContain('example.invalid')
  })
  it('the contact constant is empty until the team supplies a real one (no example.invalid)', async () => {
    const { DEPARTMENT_CONTACT } = await import('@/app/auth-v3/department-contact')
    expect(DEPARTMENT_CONTACT === null || !JSON.stringify(DEPARTMENT_CONTACT).includes('example.invalid')).toBe(true)
  })
})

describe('screen 19 account status', () => {
  it('shows the approved Agency status in Vietnamese', () => {
    const noop = () => {}
    const html = renderToStaticMarkup(React.createElement(AccountView, {
      account: { full_name: 'Nguyễn An', title: 'Điều hành', phone: '0123456789', email: 'an@example.invalid', account_status: 'Approved', role: 'Tour_Agency', admin_type: null, data_scope: '', organization: 'Công ty An', business_href: null },
      panel: 'info', forced: false, error: '', saving: false, saved: false, avatarVersion: 0, avatarFailed: true,
      onEdit: noop, onCancel: noop, onSubmit: noop, onAvatar: noop, onAvatarError: noop,
    }))
    expect(html).toContain('Đã duyệt')
    expect(html).not.toContain('>Approved<')
  })
})
