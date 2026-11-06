'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Account = { full_name: string; title: string; phone: string; email: string; role: string; admin_type: string | null; data_scope: string; organization: string; business_href: string | null }
export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [avatarVersion, setAvatarVersion] = useState(0)
  const [avatarFailed, setAvatarFailed] = useState(false)
  async function avatar(file?: File) {
    setSaving(true); setError('')
    try {
      const form = new FormData(); if (file) form.set('avatar', file)
      const response = await fetch('/api/auth/account/avatar', { method: file ? 'POST' : 'DELETE', ...(file ? { body: form } : {}) })
      if (!response.ok) throw new Error('Không thể cập nhật ảnh. Chọn JPG/PNG tối đa 2 MB.')
      setAvatarVersion(value => value + 1); setAvatarFailed(!file); setSaved(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể cập nhật ảnh.') } finally { setSaving(false) }
  }
  useEffect(() => { fetch('/api/auth/account').then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error); setAccount(body.data) }).catch(error => setError(error.message)) }, [])
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setSaved(false)
    const fields = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/auth/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(fields)) })
      const body = await response.json(); if (!response.ok) throw new Error(body.error)
      setAccount(body.data); setEditing(false); setSaved(true)
    } catch (error) { setError(error instanceof Error ? error.message : 'Không thể lưu. Vui lòng thử lại.') }
    finally { setSaving(false) }
  }
  return <section className="account-page"><p>TÀI KHOẢN CÁ NHÂN</p><p><Link href="/account/change-password">Đổi mật khẩu</Link></p><h1>{editing ? 'Chỉnh sửa tài khoản' : 'Tài khoản của tôi'}</h1>
    {account && <div style={{margin:'20px 0'}}>{!avatarFailed && <img src={`/api/auth/account/avatar?v=${avatarVersion}`} alt="Ảnh đại diện" width={80} height={80} style={{borderRadius:'50%',objectFit:'cover'}} onError={() => setAvatarFailed(true)}/>}<label>Ảnh đại diện — JPG/PNG, tối đa 2 MB<input type="file" accept="image/jpeg,image/png" disabled={saving} onChange={event => { const file = event.target.files?.[0]; if(file) void avatar(file); event.target.value = '' }}/></label><button type="button" disabled={saving} onClick={() => avatar()}>Gỡ ảnh đại diện</button></div>}
    {error && <p role="alert">{error} {!account && <Link href="/login">Đăng nhập</Link>}</p>}{saved && <p role="status">Đã lưu thông tin.</p>}
    {!account && !error && <p>Đang tải tài khoản…</p>}
    {account && <><div className="account-meta"><strong>{account.email}</strong><p>{account.role} {account.admin_type} · {account.data_scope}</p><p>Email, vai trò và quyền được quản lý bởi hệ thống.</p>{account.business_href && <p><Link href={account.business_href}>Hồ sơ doanh nghiệp: {account.organization || 'Xem hồ sơ'} →</Link></p>}</div>
    {editing ? <form onSubmit={submit}><label>Họ tên<input name="full_name" defaultValue={account.full_name} required maxLength={100}/></label><label>Chức danh<input name="title" defaultValue={account.title} required/></label><label>Số điện thoại<input name="phone" defaultValue={account.phone} required pattern="\+?[0-9]{10,15}"/></label><div><button disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button><button type="button" disabled={saving} onClick={() => setEditing(false)}>Hủy</button></div></form> : <><dl><dt>Họ tên</dt><dd>{account.full_name}</dd><dt>Chức danh</dt><dd>{account.title}</dd><dt>Điện thoại</dt><dd>{account.phone}</dd></dl><button onClick={() => { setEditing(true); setSaved(false) }}>Chỉnh sửa thông tin</button></>}
    </>}
    <style jsx>{`.account-page{max-width:740px;margin:40px auto;padding:28px;background:#fffdf8;border:1px solid #ded8cb;border-radius:18px;color:#203229}.account-page h1{font:700 34px Georgia,serif;margin:12px 0 24px}.account-meta{padding:18px;background:#eef2e9;border-radius:12px;margin-bottom:24px;overflow-wrap:anywhere}dl{display:grid;grid-template-columns:130px 1fr;gap:14px;margin:20px 0}dt{color:#66746d}label{display:grid;gap:8px;margin-bottom:18px}input{padding:12px;border:1px solid #b8c3b9;border-radius:8px;font:inherit}button{padding:11px 18px;border:1px solid #203229;border-radius:8px;background:#203229;color:white;margin-right:10px;cursor:pointer}button:disabled{opacity:.6;cursor:wait}@media(max-width:600px){.account-page{margin:18px 12px;padding:20px}dl{grid-template-columns:1fr}}`}</style>
  </section>
}
