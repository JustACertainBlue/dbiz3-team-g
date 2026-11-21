// Screen 28 edit panel (PRF021, png/28 .dc.html "Sửa hồ sơ công ty"): the form as a plain view, so it can be rendered and tested without a sign-in.
// The fields are those the existing API takes (PATCH /api/prf/agency/[id]); the mockup lists only some of them.
import React from 'react'
import Link from 'next/link'
import { COMPANY_TYPES, TOUR_TYPES } from '@/lib/auth/registration-validation'
import { COMPANY_LABELS, TOUR_LABELS } from './labels'
import './auth-v3.css'

export interface AgencyFormData {
  company_name: string; tax_id: string; company_type: string; street: string; ward: string; district: string; city_province: string
  description: string; team_size: number; contact_person_name: string; phone_number: string; business_email: string; tour_types: string[]
}
export type EditMessage = { type: 'success' | 'warning' | 'error'; text: string } | null

export default function CompanyEditView({ form, setForm, saving, hydrated, message, onSubmit, agencyId }: {
  form: AgencyFormData; setForm: (form: AgencyFormData) => void; saving: boolean; hydrated: boolean; message: EditMessage
  onSubmit: (event: React.FormEvent) => void; agencyId: string
}) {
  const text = (key: keyof AgencyFormData, label: string, id: string, extra: { type?: string; required?: boolean; hint?: string } = {}) => (
    <div className="av3-field"><label htmlFor={id}>{label}{extra.required && <span className="av3-req" aria-hidden="true"> *</span>}</label>
      <input id={id} type={extra.type ?? 'text'} required={extra.required} value={String(form[key])} onChange={event => setForm({ ...form, [key]: extra.type === 'number' ? Number(event.target.value) : event.target.value })} />
      {extra.hint && <span className="av3-field__hint">{extra.hint}</span>}</div>)
  const toggle = (type: string) => setForm({ ...form, tour_types: form.tour_types.includes(type) ? form.tour_types.filter(t => t !== type) : [...form.tour_types, type] })

  return <main className="av3-narrow">
    <header className="av3-reg__head">
      <h1 className="av3-h1">Sửa hồ sơ công ty <small className="av3-caption">· PRF021</small></h1>
    </header>
    <div className="av3-banner av3-banner--warn" role="note"><p>Tên công ty, mã số thuế và giấy tờ pháp lý cần Sở Du lịch duyệt lại. Trong lúc chờ, thông tin cũ vẫn được dùng.</p></div>
    {message && <div className={`av3-alert av3-alert--${message.type === 'error' ? 'danger' : 'success'}`} role={message.type === 'error' ? 'alert' : 'status'}><strong>{message.text}</strong></div>}
    <form method="post" onSubmit={onSubmit} className="av3-reg__form">
      <section className="av3-section">
        <div className="av3-cols">
          {text('company_name', 'Tên công ty', 'ce-name', { required: true })}
          {text('tax_id', 'Mã số thuế', 'ce-tax', { required: true })}
        </div>
        <div className="av3-cols">
          <div className="av3-field"><label htmlFor="ce-type">Loại hình</label>
            <select id="ce-type" value={form.company_type} onChange={event => setForm({ ...form, company_type: event.target.value })}>
              {COMPANY_TYPES.map(value => <option key={value} value={value}>{COMPANY_LABELS[value] ?? value}</option>)}
            </select></div>
          <div className="av3-field"><label htmlFor="ce-size">Số nhân viên <span className="av3-caption">(không bắt buộc)</span></label>
            <input id="ce-size" type="number" min={1} value={String(form.team_size)} onChange={event => setForm({ ...form, team_size: Number(event.target.value) })} /></div>
        </div>
        <fieldset className="av3-field av3-field--full av3-address"><legend className="av3-label">Địa chỉ</legend>
          <div className="av3-cols">
            <div className="av3-field"><label htmlFor="ce-street" className="av3-caption">Số nhà, đường</label><input id="ce-street" value={form.street} onChange={event => setForm({ ...form, street: event.target.value })} /></div>
            <div className="av3-field"><label htmlFor="ce-ward" className="av3-caption">Phường/Xã</label><input id="ce-ward" value={form.ward} onChange={event => setForm({ ...form, ward: event.target.value })} /></div>
            <div className="av3-field"><label htmlFor="ce-district" className="av3-caption">Quận/Huyện</label><input id="ce-district" value={form.district} onChange={event => setForm({ ...form, district: event.target.value })} /></div>
            <div className="av3-field"><label htmlFor="ce-city" className="av3-caption">Tỉnh/Thành phố</label><input id="ce-city" value={form.city_province} onChange={event => setForm({ ...form, city_province: event.target.value })} /></div>
          </div>
        </fieldset>
        <fieldset className="av3-tours"><legend>Loại tour công ty thường tổ chức</legend>
          <div>{[...TOUR_TYPES, ...form.tour_types.filter(type => !(TOUR_TYPES as readonly string[]).includes(type))].map(type => <label key={type} className={`av3-chipcheck${form.tour_types.includes(type) ? ' av3-chipcheck--on' : ''}`}><input type="checkbox" checked={form.tour_types.includes(type)} onChange={() => toggle(type)} />{TOUR_LABELS[type] ?? type}</label>)}</div>
        </fieldset>
        <div className="av3-field"><label htmlFor="ce-desc">Giới thiệu</label><textarea id="ce-desc" rows={4} className="av3-textarea" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></div>
        <div className="av3-cols">
          {text('contact_person_name', 'Người liên hệ', 'ce-contact', { required: true })}
          {text('phone_number', 'Điện thoại', 'ce-phone', { type: 'tel', required: true })}
          {text('business_email', 'Email công việc', 'ce-email', { type: 'email', required: true })}
        </div>
        <div className="av3-actions">
          <Link href={`/agency/${agencyId}`} className="av3-btn av3-btn--secondary">Huỷ</Link>
          <button type="submit" className="av3-btn av3-btn--primary" disabled={!hydrated || saving}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
        </div>
      </section>
      <p className="av3-pop-note av3-pop-note--green">Xưởng chỉ thấy thông tin được phép: tên công ty, loại tour và người liên hệ. Mã số thuế và giấy tờ bị ẩn.</p>
    </form>
  </main>
}
