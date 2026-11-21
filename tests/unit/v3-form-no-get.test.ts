/**
 * Before the page hydrates a <form> without method submits as GET and puts its fields (passwords!) in the URL.
 * Every account form must therefore be method="post" and have its submit button disabled in the server-rendered HTML.
 */
import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
;(globalThis as { React?: typeof React }).React = React
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }), useSearchParams: () => new URLSearchParams('token=t') }))

import LoginPage from '@/app/login/page'
import ForgotPasswordPage from '@/app/forgot-password/page'
import ResetPasswordPage from '@/app/reset-password/page'
import RegisterPage from '@/app/register/page'
import OtpPage from '@/app/register/otp/page'
import ReviseRegistration from '@/app/register/revise/page'
import PasswordPanel from '@/app/auth-v3/PasswordPanel'
import CompanyEditView from '@/app/auth-v3/CompanyEditView'

const pages: Array<[string, React.ComponentType]> = [
  ['15 login', LoginPage], ['16 forgot', ForgotPasswordPage], ['16 reset', ResetPasswordPage], ['17 register', RegisterPage],
  ['18 otp', OtpPage], ['17a revise', ReviseRegistration], ['password panel', PasswordPanel as unknown as React.ComponentType], ['edit company', (() => React.createElement(CompanyEditView, { form: { company_name: '', tax_id: '', company_type: 'Travel Agency', street: '', ward: '', district: '', city_province: '', description: '', team_size: 1, contact_person_name: '', phone_number: '', business_email: '', tour_types: [] }, setForm: () => {}, saving: false, hydrated: false, message: null, onSubmit: () => {}, agencyId: 'a' })) as React.ComponentType],
]

describe('account forms are safe before hydration', () => {
  it.each(pages)('%s: every <form> is method="post"', (_name, Page) => {
    const html = renderToStaticMarkup(React.createElement(Page))
    for (const form of html.match(/<form\b[^>]*>/g) ?? []) expect(form).toMatch(/method="post"/)
  })
  it.each(pages)('%s: every submit button is disabled in the server HTML', (_name, Page) => {
    const html = renderToStaticMarkup(React.createElement(Page))
    for (const button of html.match(/<button\b[^>]*type="submit"[^>]*>|<button\b(?![^>]*type=)[^>]*>/g) ?? []) expect(button).toMatch(/disabled=""/)
  })
  it('the forms exist (the checks above are not empty)', () => {
    for (const name of ['15 login', '16 forgot', '16 reset', '17 register', '18 otp', 'password panel', 'edit company']) {
      const Page = pages.find(([n]) => n === name)![1]
      expect(renderToStaticMarkup(React.createElement(Page))).toMatch(/<form\b/)
    }
  })
})
