'use client'

import Link from 'next/link'
import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { DemoSession } from '@/lib/auth/demo-session'

type Message = { message_id: string; sender_user_id: string; text: string; message_kind: string; sent_at: string }
type Conversation = {
  chat_session_id: string; agency_id: string; provider_id: string; experience_id: string; quote_request_id: string;
  experience_name: string; provider_name: string; agency_name: string; status: string; last_message_at: string; messages: Message[]
}

export default function MessagesPage() {
  return <Suspense fallback={<main className="messages-state"><p>Đang tải hộp thư…</p></main>}><MessagesContent /></Suspense>
}

function MessagesContent() {
  const searchParams = useSearchParams()
  const requestedId = searchParams.get('chat_session_id')
  const [session, setSession] = useState<DemoSession | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState(requestedId || '')
  const [messageText, setMessageText] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [sessionResponse, conversationResponse] = await Promise.all([
      fetch('/api/demo/session', { cache: 'no-store' }),
      fetch('/api/demo/conversations', { cache: 'no-store' }),
    ])
    const sessionBody = await sessionResponse.json()
    setSession(sessionBody.session)
    const conversationBody = await conversationResponse.json()
    if (!conversationResponse.ok) {
      setError(conversationBody.error?.message || 'Không thể tải hội thoại')
      return
    }
    setConversations(conversationBody.data)
    setSelectedId(current => current || requestedId || conversationBody.data[0]?.chat_session_id || '')
  }, [requestedId])

  useEffect(() => { load().catch(() => setError('Không thể tải hội thoại')) }, [load])
  const selected = conversations.find(item => item.chat_session_id === selectedId)
  const isAgency = session?.role === 'TourAgency'

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!selected || !messageText.trim()) return
    const response = await fetch(`/api/demo/conversations/${selected.chat_session_id}/messages`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: messageText }),
    })
    const body = await response.json()
    if (!response.ok) {
      setError(body.error?.message || 'Không thể gửi tin nhắn')
      return
    }
    setMessageText('')
    await load()
  }

  if (!session) return <main className="messages-state"><p>Đang tải phiên demo…</p></main>
  if (!session.authenticated || (session.role !== 'TourAgency' && session.role !== 'LocalProvider')) {
    return <main className="messages-state"><h1>Hộp thư B2B</h1><p>Hãy chọn tài khoản Agency hoặc Provider trên thanh demo để xem hội thoại.</p><Link href="/login">Chọn tài khoản demo</Link></main>
  }

  return <main className="messages-shell">
    <header className="messages-header"><div><p>HANOI ARTISAN BRIDGE</p><h1>Hộp thư hợp tác B2B</h1></div><div><strong>{session.displayName}</strong><small>{isAgency ? 'Tour Agency' : 'Local Provider'}</small></div></header>
    {error && <p className="messages-error" role="alert">{error}</p>}
    <div className="messages-layout">
      <aside className="conversation-list"><div className="conversation-list__title">Hội thoại ({conversations.length})</div>
        {conversations.length === 0 && <p>Chưa có hội thoại. Agency có thể bắt đầu từ trang Explore.</p>}
        {conversations.map(item => <button key={item.chat_session_id} className={item.chat_session_id === selectedId ? 'is-selected' : ''} onClick={() => setSelectedId(item.chat_session_id)}>
          <strong>{isAgency ? item.provider_name : item.agency_name}</strong><span>{item.experience_name}</span><small>{item.messages.at(-1)?.text || 'Hội thoại mới'}</small>
        </button>)}
      </aside>
      <section className="conversation-panel">
        {!selected ? <div className="messages-empty"><h2>Chọn một hội thoại</h2><p>Thông tin Quote và Experience sẽ được giữ xuyên suốt cuộc trao đổi.</p></div> : <>
          <header className="conversation-header"><div><small>{selected.quote_request_id ? 'QUOTE REQUEST · ' : ''}{selected.status}</small><h2>{isAgency ? selected.provider_name : selected.agency_name}</h2><p>Context: <Link href={`/explore/experiences/${selected.experience_id}`}>{selected.experience_name}</Link></p></div>
            <Link href={isAgency ? `/explore/providers/${selected.provider_id}` : `/agency/${selected.agency_id}`}>Xem hồ sơ đối tác →</Link></header>
          <div className="message-log">{selected.messages.map(message => {
            const mine = message.sender_user_id === session.userId
            return <article key={message.message_id} className={mine ? 'message message--mine' : 'message'}><small>{mine ? session.displayName : isAgency ? selected.provider_name : selected.agency_name}</small><p>{message.text}</p><time>{new Date(message.sent_at).toLocaleString('vi-VN')}</time></article>
          })}</div>
          <form className="message-composer" onSubmit={submit}><input value={messageText} onChange={event => setMessageText(event.target.value)} placeholder="Nhập nội dung trao đổi…"/><button type="submit">Gửi tin nhắn</button></form>
        </>}
      </section>
    </div>
    <style jsx>{`
      .messages-shell{min-height:100vh;background:#f4f1e9;color:#203229;padding:28px}.messages-header{max-width:1180px;margin:auto;display:flex;justify-content:space-between;align-items:end;padding:22px 0}.messages-header p,.conversation-header small{font-size:11px;letter-spacing:.14em;color:#a94f2d;font-weight:800}.messages-header h1{margin:4px 0;font-family:Georgia,serif}.messages-header div:last-child{display:grid;text-align:right}.messages-header small{color:#66746d}.messages-layout{max-width:1180px;min-height:650px;margin:auto;display:grid;grid-template-columns:330px 1fr;background:#fff;border:1px solid #ded8cb;border-radius:18px;overflow:hidden}.conversation-list{padding:18px;background:#faf8f2;border-right:1px solid #ded8cb}.conversation-list__title{font-weight:800;margin-bottom:14px}.conversation-list button{width:100%;display:grid;gap:5px;text-align:left;padding:14px;margin-bottom:9px;border:1px solid #ded8cb;border-radius:12px;background:white;cursor:pointer}.conversation-list button.is-selected{border-color:#a94f2d;box-shadow:0 0 0 2px #a94f2d22}.conversation-list span{font-size:12px;color:#a94f2d}.conversation-list small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#66746d}.conversation-panel{display:flex;flex-direction:column}.conversation-header{display:flex;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #eee}.conversation-header h2{margin:4px 0}.conversation-header a{color:#a94f2d}.message-log{flex:1;padding:24px;display:flex;flex-direction:column;gap:13px;overflow:auto;background:#fffdf8}.message{max-width:72%;align-self:flex-start;background:#f0ece2;padding:11px 14px;border-radius:14px}.message--mine{align-self:flex-end;background:#355b49;color:white}.message p{margin:5px 0;line-height:1.5}.message time,.message small{font-size:10px;opacity:.7}.message-composer{display:flex;gap:10px;padding:18px;border-top:1px solid #eee}.message-composer input{flex:1;padding:12px;border:1px solid #ccc;border-radius:999px}.message-composer button{border:0;border-radius:999px;padding:0 22px;background:#a94f2d;color:white;font-weight:800}.messages-state{padding:80px;text-align:center}.messages-error{max-width:1180px;margin:0 auto 12px;color:#9b1c1c}.messages-empty{margin:auto;text-align:center;color:#66746d}@media(max-width:760px){.messages-layout{grid-template-columns:1fr}.conversation-list{border-right:0;border-bottom:1px solid #ddd}.messages-header{align-items:start}.messages-shell{padding:14px}}
    `}</style>
  </main>
}
