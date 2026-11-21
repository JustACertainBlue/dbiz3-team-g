// Screens 19 and 19a (png/19, png/19a): the page body as a plain view, so it can be rendered and tested without a sign-in.
import Link from 'next/link'
import React from 'react'
import AccountSidebar from './AccountSidebar'
import { formatViDate, formatViDateTime } from './rules'
import { useHydrated } from './useHydrated'
import './auth-v3.css'

export type Account = { full_name: string; title: string; phone: string; email: string; account_status?: string; created_at?: string; role: string; admin_type: string | null; data_scope: string; organization: string; business_href: string | null }
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join('').toUpperCase() || '?'

export type AccountViewProps = {
  account: Account | null; editing: boolean; error: string; saving: boolean; saved: boolean; avatarVersion: number; avatarFailed: boolean
  onEdit: () => void; onCancel: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onAvatar: (file?: File) => void; onAvatarError: () => void
}

export default function AccountView({ account, editing, error, saving, saved, avatarVersion, avatarFailed, onEdit, onCancel, onSubmit, onAvatar, onAvatarError }: AccountViewProps) {
  const hydrated = useHydrated()
  const pending = account?.account_status === 'Pending Approval'
  const statusText = !account ? '' : pending ? 'Chờ Sở Du lịch duyệt' : account.account_status === 'Active' ? 'Đang hoạt động' : account.account_status === 'Disabled' ? 'Đã khoá' : account.account_status || ''
  const subtitle = account ? [account.organization, account.title].filter(Boolean).join(' · ') : ''

  return <main className="av3-page">
    <h1 className="av3-h1">Tài khoản của tôi</h1>
    <div className="av3-account">
      <AccountSidebar active="info" businessHref={account?.business_href} pending={pending} />
      <div className="av3-account__main">
        {error && <div className="av3-alert av3-alert--danger" role="alert"><strong>{error}</strong>{!account && <p><Link href="/login" className="av3-link">Đăng nhập</Link></p>}</div>}
        {saved && <div className="av3-alert av3-alert--success" role="status"><strong>Đã lưu thông tin.</strong></div>}
        {!account && !error && <p>Đang tải tài khoản…</p>}
        {account && pending && <div className="av3-banner av3-banner--warn av3-banner--row">
          <div><h2>Đang chờ Sở Du lịch Hà Nội duyệt</h2><p>Thường có kết quả trong 2 ngày làm việc. Trong lúc chờ, bạn chưa đặt chỗ được.</p></div>
          <Link href="/register/status" className="av3-btn av3-btn--primary">Theo dõi trạng thái hồ sơ</Link>
        </div>}
        {account && <section className="av3-card av3-card--account">
          <div className="av3-profile">
            <span className="av3-avatar" aria-hidden={avatarFailed ? undefined : true}>
              {!avatarFailed ? <img src={`/api/auth/account/avatar?v=${avatarVersion}`} alt="Ảnh đại diện" width={72} height={72} onError={onAvatarError} /> : initials(account.full_name)}
            </span>
            <div className="av3-profile__who">
              <h2>{account.full_name} <span className={`av3-pill ${pending ? 'av3-pill--warn' : 'av3-pill--ok'}`}>{pending ? 'Chờ duyệt' : '✓ Đã xác minh'}</span></h2>
              <p>{subtitle}</p>
            </div>
            {!editing && <button type="button" className="av3-icon-btn" aria-label="Chỉnh sửa thông tin" onClick={onEdit}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" /></svg>
            </button>}
          </div>
          {editing ? <form method="post" onSubmit={onSubmit} className="av3-form av3-form--edit">
            <h3 className="av3-sub">Sửa thông tin cá nhân</h3>
            <div className="av3-avatar-actions">
              <label className="av3-btn av3-btn--secondary av3-btn--sm">Đổi ảnh đại diện<input type="file" accept="image/jpeg,image/png" className="av3-sr" disabled={saving} onChange={event => { const file = event.target.files?.[0]; if (file) onAvatar(file); event.target.value = '' }} /></label>
              <button type="button" className="av3-link av3-link-button" disabled={saving} onClick={() => onAvatar()}>Gỡ ảnh đại diện</button>
              <small>JPG/PNG, tối đa 2 MB</small>
            </div>
            <div className="av3-field"><label htmlFor="acc-name">Họ và tên</label><input id="acc-name" name="full_name" defaultValue={account.full_name} required maxLength={100} /></div>
            <div className="av3-field"><label htmlFor="acc-title">Chức danh</label><input id="acc-title" name="title" defaultValue={account.title} required /></div>
            <div className="av3-field"><label htmlFor="acc-phone">Số điện thoại</label><input id="acc-phone" name="phone" defaultValue={account.phone} required pattern="\+?[0-9]{10,15}" /></div>
            <div className="av3-field"><label htmlFor="acc-email">Email đăng nhập</label><input id="acc-email" value={account.email} readOnly disabled /><span className="av3-field__hint">Không đổi được email đăng nhập. Thông tin công ty sửa ở mục Doanh nghiệp của tôi.</span></div>
            <div className="av3-actions">
              <button type="button" className="av3-btn av3-btn--secondary" disabled={saving} onClick={onCancel}>Huỷ</button>
              <button className="av3-btn av3-btn--primary" disabled={!hydrated || saving}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
            </div>
          </form> : <dl className="av3-rows av3-rows--wide">
            <div><dt>Email đăng nhập</dt><dd>{account.email}</dd></div>
            <div><dt>Số điện thoại</dt><dd>{account.phone}</dd></div>
            {account.organization && <div><dt>Doanh nghiệp</dt><dd>{account.business_href ? <Link href={account.business_href} className="av3-link">{account.organization}</Link> : account.organization}</dd></div>}
            {statusText && <div><dt>Trạng thái</dt><dd className={pending ? 'av3-warn-text' : 'av3-ok-text'}>{statusText}</dd></div>}
            {account.created_at && <div><dt>Ngày tạo</dt><dd title={formatViDateTime(account.created_at)}>{formatViDate(account.created_at)}</dd></div>}
          </dl>}
        </section>}
      </div>
    </div>
  </main>
}
