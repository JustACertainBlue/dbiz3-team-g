// Screen 28 edit panel (PRF021, png/28 .dc.html "Sửa hồ sơ công ty"): the form as a plain view, so it can be rendered and tested without a sign-in.
// The fields are those the existing API takes (PATCH /api/prf/agency/[id]); the mockup lists only some of them.
import React from 'react'
import Link from 'next/link'
import './auth-v3.css'

export interface AgencyFormData {
  company_name: string; tax_id: string; company_type: string; street: string; ward: string; district: string; city_province: string
  description: string; team_size: number; contact_person_name: string; phone_number: string; business_email: string; tour_types: string[]
}
export type EditMessage = { type: 'success' | 'warning' | 'error'; text: string } | null

export const EDIT_TOUR_TYPES = ['Cultural/Heritage', 'Craft Village/Experiential', 'Educational/Study Tour', 'Artisan Apprenticeship & Masterclasses', 'Eco-Tourism & Rural Gastronomy', 'High-End MICE & VIP Delegations']

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
        <div className="av3-field av3-field--full"><span className="av3-label">Địa chỉ</span>
          <div className="av3-cols">
            <input aria-label="Số nhà, đường" value={form.street} onChange={event => setForm({ ...form, street: event.target.value })} />
            <input aria-label="Phường" value={form.ward} onChange={event => setForm({ ...form, ward: event.target.value })} />
            <input aria-label="Quận/Huyện" value={form.district} onChange={event => setForm({ ...form, district: event.target.value })} />
            <input aria-label="Tỉnh/Thành phố" value={form.city_province} onChange={event => setForm({ ...form, city_province: event.target.value })} />
          </div>
        </div>
        <div className="av3-field"><label htmlFor="ce-desc">Giới thiệu</label><textarea id="ce-desc" rows={4} className="av3-textarea" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></div>
        <div className="av3-cols">
          {text('contact_person_name', 'Người liên hệ', 'ce-contact', { required: true })}
          {text('phone_number', 'Điện thoại', 'ce-phone', { type: 'tel', required: true })}
          {text('business_email', 'Email công việc', 'ce-email', { type: 'email', required: true })}
          {text('team_size', 'Số nhân viên', 'ce-size', { type: 'number' })}
        </div>
        <div className="av3-field"><label htmlFor="ce-type">Loại hình</label>
          <select id="ce-type" value={form.company_type} onChange={event => setForm({ ...form, company_type: event.target.value })}>
            {['Tour Operator', 'Travel Agency', 'TMC', 'DMC'].map(value => <option key={value} value={value}>{value}</option>)}
          </select></div>
        <fieldset className="av3-tours"><legend>Loại tour công ty thường tổ chức</legend>
          <div>{EDIT_TOUR_TYPES.map(type => <label key={type} className={`av3-chipcheck${form.tour_types.includes(type) ? ' av3-chipcheck--on' : ''}`}><input type="checkbox" checked={form.tour_types.includes(type)} onChange={() => toggle(type)} />{type}</label>)}</div>
        </fieldset>
        <div className="av3-actions">
          <Link href={`/agency/${agencyId}`} className="av3-btn av3-btn--secondary">Huỷ</Link>
          <button type="submit" className="av3-btn av3-btn--primary" disabled={!hydrated || saving}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
        </div>
      </section>
      <p className="av3-pop-note av3-pop-note--green">Xưởng chỉ thấy thông tin được phép: tên công ty, loại tour và người liên hệ. Mã số thuế và giấy tờ bị ẩn.</p>
    </form>
  </main>
}
