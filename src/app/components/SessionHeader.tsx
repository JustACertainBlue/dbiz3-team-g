'use client'

// Loads the session, the account summary and the unread chat count, then renders the shared v3 header
// (components/header/AppHeader.tsx). AUT009 Login and REG115 OTP keep their own full-screen layout (png/15).
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import type { SessionContext } from '@/lib/auth/session'
import AppHeader, { type HeaderAccount } from './header/AppHeader'
import SimpleAuthBar, { usesSimpleAuthBar } from './header/SimpleAuthBar'

export default function SessionHeader() {
  const [session, setSession] = useState<SessionContext | null>(null)
  const [account, setAccount] = useState<HeaderAccount>({})
  const [unread, setUnread] = useState(0)
  const pathname = usePathname()

  useEffect(() => {
    let alive = true
    fetch('/api/auth/session', { cache: 'no-store' }).then(r => r.json()).then(p => { if (alive) setSession(p.data.session) }).catch(() => { if (alive) setSession(null) })
    return () => { alive = false }
  }, [pathname])

  useEffect(() => {
    if (!session?.authenticated) { setAccount({}); setUnread(0); return }
    let alive = true
    fetch('/api/auth/account', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(p => { if (alive && p?.data) setAccount(p.data) }).catch(() => {})
    if (session.role === 'Tour_Agency' || session.role === 'Local_Provider') {
      fetch('/api/iac/chats', { cache: 'no-store' }).then(r => r.ok ? r.json() : null)
        .then(p => { if (alive && p?.data?.chat_list) setUnread((p.data.chat_list as Array<{ unread_count?: number }>).reduce((sum, chat) => sum + Number(chat.unread_count || 0), 0)) })
        .catch(() => {})
    }
    return () => { alive = false }
  }, [session, pathname])

  if (usesSimpleAuthBar(pathname) && !session?.authenticated) return <SimpleAuthBar />
  if (!session) return null
  if (pathname === '/login' || pathname === '/register/otp') return null
  return <AppHeader session={session} pathname={pathname} account={account} unread={unread} />
}
