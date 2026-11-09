'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { filterAdminUsers, roleOptions } from '@/lib/auth/admin-user-filter'
import StatusBadge from '@/app/components/StatusBadge'
import { accountActionBody } from './account-action'
type User = { user_id: string; name: string; email: string; organization: string; role: string; admin_type: string; status: string; last_login: string; created_date: string; provider_id?: string; agency_id?: string }
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [role, setRole] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [organization, setOrganization] = useState('')
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [query, status, role, dateFrom, dateTo, organization])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<User | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [reason, setReason] = useState('')
  // #160: a new account starts with an empty reason.
  useEffect(() => { setReason('') }, [selected?.user_id])
  async function load() { setLoading(true); try { const response = await fetch('/api/auth/users'); const body = await response.json(); if (!response.ok) throw new Error(body.error); setUsers(body.data) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được dữ liệu.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  async function resetPassword() {
    if (!selected || !window.confirm('Gửi mật khẩu tạm và kết thúc các phiên hiện tại?')) return
    setBusy(true); setError('')
    try { const response = await fetch('/api/auth/users', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({user_id:selected.user_id,action:'reset_password'}) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setSelected(null); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể reset mật khẩu.') } finally { setBusy(false) }
  }
  async function act() {
    if (!selected) return
    setBusy(true); setError('')
    try { const response = await fetch('/api/auth/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(accountActionBody(selected, reason)) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setSelected({ ...selected, status: body.data.account_status }); setConfirm(false); setReason(''); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu.') } finally { setBusy(false) }
  }
  const filtered = filterAdminUsers(users, { query, status, role, organization, dateFrom, dateTo })
  const pages = Math.max(1, Math.ceil(filtered.length / 20))
  const rows = filtered.slice((Math.min(page, pages) - 1) * 20, Math.min(page, pages) * 20)
  return <section className="users-page"><p>QUẢN TRỊ</p><h1>Quản lý tài khoản</h1><p><Link href="/admin/create-account">Tạo tài khoản mới →</Link></p><p>Danh sách được giới hạn theo quyền và làng nghề được phân công.</p>
    {error && <p role="alert">{error}</p>}
    <div className="filters"><label>Tổ chức<select value={organization} onChange={e => setOrganization(e.target.value)}><option value="">Tất cả</option>{[...new Set(users.map(user => user.organization))].sort().map(name => <option key={name}>{name}</option>)}</select></label><label>Ngày tạo từ<input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}/></label><label>Đến ngày<input type="date" min={dateFrom} value={dateTo} onChange={e => setDateTo(e.target.value)}/></label><button onClick={() => { setQuery(''); setStatus(''); setRole(''); setOrganization(''); setDateFrom(''); setDateTo('') }}>Xóa bộ lọc</button></div>
    <div className="filters"><label>Tìm tên, email, tổ chức<input value={query} onChange={e => setQuery(e.target.value)}/></label><label>Trạng thái<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả</option>{['Approved','Active','Pending Approval','Rejected','Disabled'].map(value => <option key={value}>{value}</option>)}</select></label><label>Vai trò<select value={role} onChange={e => setRole(e.target.value)}><option value="">Tất cả</option>{roleOptions(users).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
    {loading ? <p>Đang tải…</p> : <div className="table-wrap"><table><thead><tr><th>Họ tên / Email</th><th>Tổ chức</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{rows.map(user => <tr key={user.user_id}><td>{user.name}<small>{user.email}</small></td><td>{user.organization}</td><td>{user.role} {user.admin_type}</td><td><StatusBadge family={user.status === 'Active' ? 'account' : 'agency'} status={user.status} /></td><td><button onClick={() => { setSelected(user); setConfirm(false); setError('') }}>Xem tài khoản</button></td></tr>)}</tbody></table>{!filtered.length && <p>Không có tài khoản phù hợp.</p>}</div>}
    <nav aria-label="Phân trang tài khoản"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>← Trước</button><span>Trang {Math.min(page, pages)} / {pages} · {filtered.length} tài khoản</span><button disabled={page >= pages} onClick={() => setPage(value => value + 1)}>Sau →</button></nav>
    {selected && <div className="overlay" role="dialog" aria-modal="true" aria-label="Chi tiết tài khoản" onClick={e => { if (e.target === e.currentTarget) { setSelected(null); setConfirm(false); setReason('') } }}><section className="detail"><button className="detail-close" aria-label="Đóng" disabled={busy} onClick={() => { setSelected(null); setConfirm(false); setReason('') }}>✕</button><h2>{selected.name}</h2><dl><dt>Email</dt><dd>{selected.email}</dd><dt>Tổ chức</dt><dd>{selected.organization}</dd><dt>Trạng thái</dt><dd><StatusBadge family={selected.status === 'Active' ? 'account' : 'agency'} status={selected.status} /></dd><dt>Ngày tạo</dt><dd>{selected.created_date}</dd><dt>Đăng nhập gần nhất</dt><dd>{selected.last_login || 'Chưa đăng nhập'}</dd></dl>
      {selected.provider_id && <p><Link href={`/admin/providers/${selected.provider_id}`}>Xem hồ sơ và thẩm định Provider →</Link></p>}
      <p>Đặt lại mật khẩu và gửi thông tin đăng nhập cần dịch vụ email được cấu hình.</p><button disabled={busy} onClick={resetPassword}>Đặt lại mật khẩu</button>
      {confirm ? <div><p>{selected.status === 'Disabled' ? 'Mở lại tài khoản về trạng thái trước khi khóa?' : 'Khóa tài khoản và kết thúc các phiên đăng nhập?'}</p>{selected.status !== 'Disabled' && <label htmlFor="disable-reason">Lý do (không bắt buộc)<textarea id="disable-reason" value={reason} onChange={e => setReason(e.target.value)} rows={3} /></label>}<button disabled={busy} onClick={act}>{busy ? 'Đang lưu…' : 'Xác nhận'}</button><button disabled={busy} onClick={() => { setConfirm(false); setReason('') }}>Hủy</button></div> : <button onClick={() => setConfirm(true)}>{selected.status === 'Disabled' ? 'Mở lại tài khoản' : 'Khóa tài khoản'}</button>}
      <button disabled={busy} onClick={() => { setSelected(null); setConfirm(false); setReason('') }}>Đóng</button></section></div>}
    <style jsx>{`.users-page{max-width:1200px;margin:auto;padding:32px 20px;color:#203229}.users-page h1{font:700 36px Georgia,serif;margin:10px 0}.filters{display:flex;gap:16px;flex-wrap:wrap;margin:24px 0}label{display:grid;gap:8px}input,select,textarea,button{font:inherit;border:1px solid #b8c3b9;border-radius:8px;padding:10px;background:#fffdf8;color:#203229}button{cursor:pointer;margin:8px 8px 8px 0}button:disabled{opacity:.6}.table-wrap{overflow:auto;border:1px solid #ded8cb;border-radius:14px;background:#fffdf8}table{border-collapse:collapse;width:100%;min-width:750px}th,td{padding:14px;text-align:left;border-bottom:1px solid #ded8cb;font-size:14px}th{background:#eef2e9}small{display:block;color:#66746d}.overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px}.detail{position:relative;max-width:620px;width:100%;max-height:90vh;overflow-y:auto;padding:32px;background:#fffdf8;border-radius:16px;border:1px solid #ded8cb;box-shadow:0 8px 40px rgba(0,0,0,.18)}.detail-close{position:absolute;top:16px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:#66746d;padding:4px 8px;border-radius:6px;line-height:1}.detail-close:hover{background:#eef2e9}dl{display:grid;grid-template-columns:160px 1fr;gap:10px;margin:20px 0}dd{overflow-wrap:anywhere}[role=alert]{color:#a51f30}`}</style>
  </section>
}
