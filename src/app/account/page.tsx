'use client'

// Screens 19 and 19a (mockup v3 png/19, png/19a). Same requests as before: GET/PATCH /api/auth/account,
// POST/DELETE /api/auth/account/avatar. View, personal edit and password change are panels of this page (?tab=password).
// A temporary password is forced: the session says mustChangePassword, the other account API answers as a guest,
// so then only the password panel is shown and the account is not requested.
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AccountView, { type Account } from '../auth-v3/AccountView'
import { choosePanel } from '../auth-v3/rules'

function AccountPanels() {
  const tab = useSearchParams().get('tab')
  const [forced, setForced] = useState<boolean | null>(null)
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
  useEffect(() => {
    let alive = true
    fetch('/api/auth/session', { cache: 'no-store' }).then(r => r.json()).then(async payload => {
      const mustChange = Boolean(payload?.data?.session?.mustChangePassword)
      if (!alive) return
      setForced(mustChange)
      if (mustChange) return
      const response = await fetch('/api/auth/account'); const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      if (alive) setAccount(body.data)
    }).catch(cause => { if (alive) { setForced(false); setError(cause instanceof Error ? cause.message : 'Vui lòng đăng nhập.') } })
    return () => { alive = false }
  }, [])
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

  if (forced === null) return <main className="av3-page"><p>Đang tải tài khoản…</p></main>
  const panel = choosePanel(tab, forced) === 'info' && editing ? 'edit' : choosePanel(tab, forced)
  return <AccountView account={account} panel={panel} forced={forced} error={error} saving={saving} saved={saved} avatarVersion={avatarVersion} avatarFailed={avatarFailed}
    onEdit={() => { setEditing(true); setSaved(false) }} onCancel={() => setEditing(false)} onSubmit={submit} onAvatar={file => void avatar(file)} onAvatarError={() => setAvatarFailed(true)} />
}

export default function AccountPage() {
  return <Suspense fallback={<main className="av3-page"><p>Đang tải tài khoản…</p></main>}><AccountPanels /></Suspense>
}
