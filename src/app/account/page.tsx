'use client'

// Screens 19 and 19a (mockup v3 png/19, png/19a). Same requests as before: GET/PATCH /api/auth/account,
// POST/DELETE /api/auth/account/avatar. The account menu (png/20) and the logout popup (png/20a) are in the shared header.
import { useEffect, useState } from 'react'
import AccountView, { type Account } from '../auth-v3/AccountView'


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

  return <AccountView account={account} editing={editing} error={error} saving={saving} saved={saved} avatarVersion={avatarVersion} avatarFailed={avatarFailed}
    onEdit={() => { setEditing(true); setSaved(false) }} onCancel={() => setEditing(false)} onSubmit={submit} onAvatar={file => void avatar(file)} onAvatarError={() => setAvatarFailed(true)} />
}
