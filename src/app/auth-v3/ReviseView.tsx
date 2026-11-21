// Screen 17a (png/17a): the supplement form as a plain view, so it can be rendered and tested without a token.
import React from 'react'
import './auth-v3.css'

export type Revision = { comments: string; full_name: string; email: string; company_name: string; company_type: string; tax_id: string; team_size: number; tour_types: string[]; location: Record<string,string>; contact_information: Record<string,string> }
const LABELS: Record<string, string> = { street: 'Địa chỉ', ward: 'Phường', district: 'Quận/Huyện', city_province: 'Tỉnh/Thành phố', contact_person_name: 'Người liên hệ', phone_number: 'Số điện thoại', business_email: 'Email công việc' }

export type ReviseViewProps = {
  data: Revision | null; setData: (data: Revision) => void; files: File[]; setFiles: (files: File[]) => void; confirmed: boolean; setConfirmed: (value: boolean) => void
  hydrated: boolean; busy: boolean; error: string; submit: (event: React.FormEvent<HTMLFormElement>) => void
}

export default function ReviseView({ data, setData, files, setFiles, confirmed, setConfirmed, hydrated, busy, error, submit }: ReviseViewProps) {
  return <main className="av3-narrow">
    <header className="av3-reg__head">
      <a href="/login" className="av3-link">‹ Đăng nhập</a>
      <h1 className="av3-h1">Bổ sung hồ sơ đăng ký</h1>
      {data && <p className="av3-lead">{data.company_name}</p>}
    </header>
    {error && <div className="av3-alert av3-alert--danger" role="alert"><strong>{error}</strong></div>}
    {data && <form method="post" onSubmit={submit} className="av3-reg__form">
      <div className="av3-banner av3-banner--danger" role="note">
        <strong>Sở Du lịch cần bạn bổ sung</strong>
        <p>“{data.comments}”</p>
      </div>
      <section className="av3-section">
        <h2><span className="av3-num">1</span>Thông tin công ty</h2>
        <div className="av3-cols">
          <div className="av3-field"><label htmlFor="rv-company">Tên công ty <span className="av3-req" aria-hidden="true">*</span></label><input id="rv-company" required value={data.company_name} onChange={event => setData({ ...data, company_name: event.target.value })} /><span className="av3-field__hint">Đúng như trên giấy phép kinh doanh.</span></div>
          <div className="av3-field"><label htmlFor="rv-tax">Mã số thuế <span className="av3-req" aria-hidden="true">*</span></label><input id="rv-tax" required value={data.tax_id} onChange={event => setData({ ...data, tax_id: event.target.value })} /></div>
        </div>
        <details className="av3-more">
          <summary>Thông tin khác</summary>
          <p className="av3-caption">Email đăng nhập cố định: {data.email}.</p>
          <div className="av3-cols">
            <div className="av3-field"><label htmlFor="rv-name">Họ và tên</label><input id="rv-name" required value={data.full_name} onChange={event => setData({ ...data, full_name: event.target.value })} /></div>
            <div className="av3-field"><label htmlFor="rv-type">Loại hình</label><select id="rv-type" value={data.company_type} onChange={event => setData({ ...data, company_type: event.target.value })}>{['Travel Agency','Tour Operator','TMC'].map(value => <option key={value}>{value}</option>)}</select></div>
            <div className="av3-field"><label htmlFor="rv-size">Số nhân viên</label><input id="rv-size" type="number" min={1} required value={data.team_size} onChange={event => setData({ ...data, team_size: Number(event.target.value) })} /></div>
            {(['location','contact_information'] as const).flatMap(group => Object.entries(data[group]).map(([key,value]) => <div className="av3-field" key={`${group}.${key}`}><label htmlFor={`rv-${group}-${key}`}>{LABELS[key] ?? key}</label><input id={`rv-${group}-${key}`} value={value} onChange={event => setData({ ...data, [group]: { ...data[group], [key]: event.target.value } })} /></div>))}
          </div>
          <div className="av3-field"><label htmlFor="rv-tours">Loại tour (chọn nhiều bằng Ctrl/Cmd)</label><select id="rv-tours" multiple value={data.tour_types} onChange={event => setData({ ...data, tour_types: Array.from(event.target.selectedOptions).map(option => option.value) })}>{['Cultural/Heritage','Craft Village/Experiential','Culinary','Educational/Study Tour','Corporate/MICE','Family/Leisure','Other'].map(value => <option key={value}>{value}</option>)}</select></div>
        </details>
      </section>
      <section className="av3-section av3-section--flag">
        <h2><span className="av3-num">2</span>Giấy tờ pháp lý</h2>
        <p className="av3-caption">Nếu không chọn tệp mới, tài liệu hiện có được giữ trong phiên bản mới.</p>
        <label htmlFor="rv-files" className="av3-drop">
          <strong>Tải lên bản mới hoặc <span className="av3-link">chọn tệp</span></strong>
          <small>PDF, JPG hoặc PNG, tối đa 10 MB mỗi tệp, tối đa 5 tệp.</small>
          <input id="rv-files" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="av3-sr" onChange={event => setFiles(Array.from(event.target.files || []))} />
        </label>
        {files.length > 0 && <ul className="av3-files">{files.map((file, index) => <li key={`${file.name}-${index}`}><span><strong>{file.name}</strong> · {(file.size / (1024 * 1024)).toFixed(1).replace('.', ',')} MB</span><button type="button" aria-label={`Xoá ${file.name}`} onClick={() => setFiles(files.filter((_, i) => i !== index))}>✕</button></li>)}</ul>}
      </section>
      <label className="av3-check av3-check--block"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Tôi xác nhận thông tin sửa đổi là đúng.</label>
      <div className="av3-reg__submit av3-reg__submit--rule"><button className="av3-btn av3-btn--primary" disabled={!hydrated || busy || !confirmed}>{busy ? 'Đang gửi…' : 'Gửi lại hồ sơ'}</button></div>
    </form>}
  </main>
}
