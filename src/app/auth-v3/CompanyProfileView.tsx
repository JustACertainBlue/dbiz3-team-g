// Screen 28 (png/28): the company profile body as a plain view, so it can be rendered and tested without a sign-in.
import React from 'react'
import Link from 'next/link'
import { COMPANY_LABELS, TOUR_LABELS } from './labels'
import './auth-v3.css'

export interface AgencyData {
  agency_id: string
  agency_name: string
  company_type: string
  location?: { street?: string; ward?: string; district?: string; city_province?: string }
  team_size?: number
  contact?: { contact_person_name?: string; phone_number?: string; business_email?: string }
  tax_id?: string
  tour_types?: string[]
  description?: string
  account_status?: string
}
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join('').toUpperCase() || 'TA'

export default function CompanyProfileView({ agency, agencyId }: { agency: AgencyData; agencyId: string }) {
  const address = [agency.location?.street, agency.location?.ward && `phường ${agency.location.ward}`, agency.location?.district, agency.location?.city_province].filter(Boolean).join(', ')
  const typeLabel = COMPANY_LABELS[agency.company_type] ?? agency.company_type
  const rows = (items: Array<[string, React.ReactNode]>) => <dl className="av3-rows av3-rows--wide">{items.filter(([, value]) => value !== '' && value != null).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>

  return <main className="av3-page">
    <header className="av3-company">
      <span className="av3-company__logo" aria-hidden="true">{initials(agency.agency_name)}</span>
      <div>
        <h1 className="av3-h1">{agency.agency_name}</h1>
        <p className="av3-lead">{[typeLabel, agency.location?.city_province].filter(Boolean).join(' · ')}</p>
      </div>
      <Link href={`/agency/${agencyId}/edit`} className="av3-icon-btn" aria-label="Chỉnh sửa hồ sơ công ty">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" /></svg>
      </Link>
    </header>

    <section className="av3-card av3-card--block">
      <h2>Thông tin công ty</h2>
      {rows([['Mã số thuế', agency.tax_id ?? ''], ['Địa chỉ', address], ['Số nhân viên', agency.team_size != null ? String(agency.team_size) : ''], ['Giới thiệu', <span key="d" className="av3-plain">{agency.description || 'Công ty chưa cập nhật phần giới thiệu.'}</span>]])}
    </section>

    <section className="av3-card av3-card--block">
      <h2>Loại tour &amp; khách thường phục vụ</h2>
      {agency.tour_types && agency.tour_types.length > 0
        ? <ul className="av3-chips">{agency.tour_types.map(type => <li key={type}>{TOUR_LABELS[type] ?? type}</li>)}</ul>
        : <p className="av3-lead">Chưa cập nhật.</p>}
    </section>

    <section className="av3-card av3-card--block">
      <h2>Liên hệ</h2>
      {rows([['Người liên hệ', agency.contact?.contact_person_name ?? ''], ['Điện thoại', agency.contact?.phone_number ?? ''], ['Email công việc', agency.contact?.business_email ?? '']])}
    </section>
  </main>
}
