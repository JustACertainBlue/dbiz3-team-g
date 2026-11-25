'use client'
// ADM095 Quản lý tài khoản, mockup v3 screen 39 (png/39): the on/off switch sits in the Trạng thái column; no action
// column and no "create account" button. The switch asks for confirmation first (screen-spec-ADM118 reason, optional).
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { filterAdminUsers, roleOptions } from '@/lib/auth/admin-user-filter'
import { accountStatusView, filterByStatusGroup, formatLastLogin, roleLabel, switchAction, type StatusGroup } from '@/lib/adm/v3-accounts'
import { Button, Container, Modal, Pagination, Select, StatusPill, Switch } from '@/app/components/ui'
import { accountActionBody } from './account-action'
import '../_v3/admin-v3.css'

type User = { user_id: string; name: string; email: string; organization: string; role: string; admin_type: string; status: string; last_login: string | null; created_date: string; provider_id?: string; agency_id?: string }
const PAGE = 20

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('')
  const [group, setGroup] = useState<StatusGroup | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [target, setTarget] = useState<User | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const response = await fetch('/api/auth/users'); const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setUsers(body.data); setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được dữ liệu.') } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  useEffect(() => { setPage(1) }, [query, role, group, dateFrom])

  async function confirm() {
    if (!target) return
    setBusy(true)
    try {
      const response = await fetch('/api/auth/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(accountActionBody(target, reason)) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setTarget(null); setReason(''); await load()
    } catch (cause) { setTarget(null); setError(cause instanceof Error ? cause.message : 'Không thể lưu.') } finally { setBusy(false) }
  }

  const filtered = useMemo(() => filterByStatusGroup(filterAdminUsers(users, { query, status: '', role, organization: '', dateFrom, dateTo: '' }), group), [users, query, role, group, dateFrom])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * PAGE, current * PAGE)
  const turningOff = target ? switchAction(target.status) === 'disable' : false
  const profileHref = (u: User) => u.provider_id ? `/admin/providers/${u.provider_id}` : `/admin/agencies?q=${encodeURIComponent(u.organization)}`

  return <Container as="main" className="av3">
    <h1>Quản lý tài khoản</h1>
    <p className="av3-lead">Bạn thấy mọi tài khoản trên nền tảng. Quản trị viên chỉ bật/tắt tài khoản, không sửa nội dung hồ sơ.</p>

    <section className="av3-card av3-filters" aria-label="Bộ lọc tài khoản" style={{ padding: 24 }}>
      <label className="av3-field">Tìm<input type="search" placeholder="Tên, email hoặc tổ chức" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <label className="av3-field">Vai trò<Select value={role} onChange={e => setRole(e.target.value)}><option value="">Tất cả</option>{roleOptions(users).map(o => <option key={o.value} value={o.value}>{roleLabel(o.value.split(':')[0], o.value.split(':')[1])}</option>)}</Select></label>
      <label className="av3-field">Trạng thái<Select value={group} onChange={e => setGroup(e.target.value as StatusGroup | '')}><option value="">Tất cả</option><option value="active">Đang hoạt động</option><option value="off">Đã tắt</option><option value="pending">Chờ duyệt</option><option value="rejected">Bị từ chối</option></Select></label>
      <label className="av3-field">Tạo từ ngày<input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></label>
    </section>

    {error && <p className="av3-alert" role="alert">{error}</p>}
    <p className="av3-hint"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>Gạt công tắc ở cột Trạng thái để tắt hoặc bật lại tài khoản. Hệ thống sẽ hỏi lại trước khi thay đổi.</p>

    <div className="av3-table-wrap">
      {loading ? <p className="av3-empty" style={{ padding: 24 }}>Đang tải…</p> : <table className="av3-table av3-table--stack"><thead><tr><th>Người dùng</th><th>Tổ chức</th><th>Vai trò</th><th>Trạng thái</th><th>Đăng nhập gần nhất</th></tr></thead>
        <tbody>{rows.map(u => { const v = accountStatusView(u.status); return <tr key={u.user_id}>
          <td data-label="Người dùng"><Link className="av3-name" href={`/admin/users/${u.user_id}`}>{u.name}</Link><small>{u.email}</small></td>
          <td data-label="Tổ chức">{u.organization}</td><td data-label="Vai trò">{roleLabel(u.role, u.admin_type)}</td>
          <td data-label="Trạng thái">{v.switchable ? <Switch checked={v.on} label={v.label} disabled={busy} onChange={() => { setReason(''); setTarget(u) }} />
            : <span className="av3-status"><StatusPill tone={v.group === 'rejected' ? 'danger' : 'warn'}>{v.label}</StatusPill>{v.group === 'pending' && <Link href={profileHref(u)} className="av3-ul" style={{ padding: 0 }}>Xem hồ sơ</Link>}</span>}</td>
          <td data-label="Đăng nhập gần nhất">{formatLastLogin(u.last_login)}</td></tr> })}</tbody></table>}
      {!loading && filtered.length === 0 && <p className="av3-empty" style={{ padding: 24 }}>Không có tài khoản phù hợp.</p>}
    </div>

    <Pagination loading={loading} from={(current - 1) * PAGE + 1} to={(current - 1) * PAGE + rows.length} total={filtered.length} unit="tài khoản"
      prev={current > 1 ? { onClick: () => setPage(current - 1) } : undefined} next={current < pages ? { onClick: () => setPage(current + 1) } : undefined} />

    <Modal open={target !== null} onClose={() => setTarget(null)} closeDisabled={busy} tone={turningOff ? 'danger' : 'default'} width={500}
      title={turningOff ? 'Tắt tài khoản này?' : 'Bật lại tài khoản này?'}
      actions={<><Button variant="secondary" onClick={() => setTarget(null)} disabled={busy}>Giữ nguyên</Button><Button variant={turningOff ? 'danger' : 'primary'} onClick={confirm} disabled={busy} data-autofocus>{busy ? 'Đang lưu…' : turningOff ? 'Tắt tài khoản' : 'Bật tài khoản'}</Button></>}>
      <p>{target?.name} ({target?.organization}). {turningOff ? 'Người này sẽ bị đăng xuất và không đăng nhập được cho đến khi bật lại.' : 'Tài khoản trở về trạng thái trước khi tắt.'}</p>
      {turningOff && <label className="av3-field" style={{ marginTop: 12, fontWeight: 400 }}>Lý do (không bắt buộc)<textarea id="disable-reason" rows={3} value={reason} onChange={e => setReason(e.target.value)} style={{ padding: 10, border: '1px solid var(--c-input-border)', borderRadius: 6, font: '400 16px var(--font-body)' }} /></label>}
    </Modal>
  </Container>
}
