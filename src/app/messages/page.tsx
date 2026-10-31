'use client'

import Link from 'next/link'
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { DemoSession } from '@/lib/auth/demo-session'
import { renderChatMarkdown } from '@/lib/iac/markdown-utils'

// ---------------------------------------------------------------------------
// Types aligned to /api/iac/ endpoints (FR-001, FR-002, FR-003)
// ---------------------------------------------------------------------------
type IacMessage = {
  message_id: string
  sender_id: string | null
  sender_name: string
  text: string | null
  sent_at: string
}

type IacChatEntry = {
  chat_session_id: string
  chat_status: 'Active' | 'Closed'
  participant_name: string
  organization: string
  last_message_preview: string | null
  last_message_at: string | null
  unread_count: number
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<main className="messages-state"><p>Đang tải hộp thư…</p></main>}>
      <MessagesContent />
    </Suspense>
  )
}

function MessagesContent() {
  const searchParams = useSearchParams()
  const requestedId = searchParams.get('chat_session_id')

  const [session, setSession] = useState<DemoSession | null>(null)
  const [chatList, setChatList] = useState<IacChatEntry[]>([])
  const [selectedId, setSelectedId] = useState(requestedId || '')
  const [messages, setMessages] = useState<IacMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [error, setError] = useState('')
  const messageLogRef = useRef<HTMLDivElement>(null)

  // Fetch the chat list from IAC endpoint (FR-003)
  const loadChatList = useCallback(async () => {
    const [sessionRes, listRes] = await Promise.all([
      fetch('/api/demo/session', { cache: 'no-store' }),
      fetch('/api/iac/sessions', { cache: 'no-store' }),
    ])
    const sessionBody = await sessionRes.json()
    setSession(sessionBody.session)

    if (!listRes.ok) {
      const body = await listRes.json()
      setError(body.error || 'Không thể tải danh sách hội thoại')
      return
    }
    const listBody = await listRes.json()
    const list: IacChatEntry[] = listBody.chat_list ?? []
    setChatList(list)
    setSelectedId(current => current || requestedId || list[0]?.chat_session_id || '')
  }, [requestedId])

  // Fetch messages for the selected session (FR-003)
  const loadMessages = useCallback(async (chatSessionId: string) => {
    if (!chatSessionId) { setMessages([]); return }
    const res = await fetch(`/api/iac/sessions/${chatSessionId}/messages`, { cache: 'no-store' })
    if (!res.ok) {
      const body = await res.json()
      setError(body.error || 'Không thể tải lịch sử tin nhắn')
      return
    }
    const body = await res.json()
    setMessages(body.message_history ?? [])
  }, [])

  useEffect(() => {
    loadChatList().catch(() => setError('Không thể tải hội thoại'))
  }, [loadChatList])

  useEffect(() => {
    loadMessages(selectedId).catch(() => setError('Không thể tải tin nhắn'))
  }, [selectedId, loadMessages])

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messageLogRef.current) {
      messageLogRef.current.scrollTop = messageLogRef.current.scrollHeight
    }
  }, [messages])

  // FR-002: send a message
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!selectedId || !messageText.trim()) return
    setError('')
    const res = await fetch(`/api/iac/sessions/${selectedId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message_text: messageText }),
    })
    const body = await res.json()
    if (!res.ok) {
      setError(body.error || 'Không thể gửi tin nhắn')
      return
    }
    setMessageText('')
    await Promise.all([loadChatList(), loadMessages(selectedId)])
  }

  const isAgency = session?.role === 'TourAgency'
  const selectedEntry = chatList.find(c => c.chat_session_id === selectedId)

  if (!session) return <main className="messages-state"><p>Đang tải phiên demo…</p></main>
  if (!session.authenticated || (session.role !== 'TourAgency' && session.role !== 'LocalProvider')) {
    return (
      <main className="messages-state">
        <h1>Hộp thư B2B</h1>
        <p>Hãy chọn tài khoản Agency hoặc Provider trên thanh demo để xem hội thoại.</p>
        <Link href="/login">Chọn tài khoản demo</Link>
      </main>
    )
  }

  return (
    <main className="messages-shell">
      <header className="messages-header">
        <div>
          <p>HANOI ARTISAN BRIDGE</p>
          <h1>Hộp thư hợp tác B2B</h1>
        </div>
        <div>
          <strong>{session.displayName}</strong>
          <small>{isAgency ? 'Tour Agency' : 'Local Provider'}</small>
        </div>
      </header>

      {error && <p className="messages-error" role="alert">{error}</p>}

      <div className="messages-layout">
        {/* Left panel: conversation list (FR-003, BR-013) */}
        <aside className="conversation-list">
          <div className="conversation-list__title">Hội thoại ({chatList.length})</div>
          {chatList.length === 0 && (
            <p>Chưa có hội thoại. Agency có thể bắt đầu từ trang Explore.</p>
          )}
          {chatList.map(item => (
            <button
              key={item.chat_session_id}
              className={item.chat_session_id === selectedId ? 'is-selected' : ''}
              onClick={() => setSelectedId(item.chat_session_id)}
            >
              <div className="conv-header">
                <strong>{item.participant_name}</strong>
                {/* Unread badge (BR-017) */}
                {item.unread_count > 0 && (
                  <span className="unread-badge">{item.unread_count}</span>
                )}
              </div>
              <span>{item.organization}</span>
              <small>{item.last_message_preview || 'Hội thoại mới'}</small>
            </button>
          ))}
        </aside>

        {/* Right panel: messages */}
        <section className="conversation-panel">
          {!selectedEntry ? (
            <div className="messages-empty">
              <h2>Chọn một hội thoại</h2>
              <p>Thông tin đối tác sẽ được hiển thị khi bạn chọn hội thoại.</p>
            </div>
          ) : (
            <>
              <header className="conversation-header">
                <div>
                  <small>{selectedEntry.chat_status}</small>
                  <h2>{selectedEntry.participant_name}</h2>
                  <p>{selectedEntry.organization}</p>
                </div>
              </header>

              {/* Message log with markdown rendering (FR-002, BR-011) */}
              <div className="message-log" ref={messageLogRef}>
                {messages.map(msg => {
                  const mine = msg.sender_id === session.userId
                  return (
                    <article
                      key={msg.message_id}
                      className={mine ? 'message message--mine' : 'message'}
                    >
                      <small>{msg.sender_name}</small>
                      {/* renderChatMarkdown sanitizes XSS and renders **bold** / *italic* */}
                      <p
                        dangerouslySetInnerHTML={{
                          __html: renderChatMarkdown(msg.text ?? ''),
                        }}
                      />
                      <time>{new Date(msg.sent_at).toLocaleString('vi-VN')}</time>
                    </article>
                  )
                })}
              </div>

              {selectedEntry.chat_status === 'Active' && (
                <form className="message-composer" onSubmit={submit}>
                  <input
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    placeholder="Nhập nội dung trao đổi…"
                    maxLength={4000}
                  />
                  <button type="submit">Gửi tin nhắn</button>
                </form>
              )}
              {selectedEntry.chat_status === 'Closed' && (
                <p className="session-closed-notice">Hội thoại này đã kết thúc.</p>
              )}
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        .messages-shell{min-height:100vh;background:#f4f1e9;color:#203229;padding:28px}
        .messages-header{max-width:1180px;margin:auto;display:flex;justify-content:space-between;align-items:end;padding:22px 0}
        .messages-header p,.conversation-header small{font-size:11px;letter-spacing:.14em;color:#a94f2d;font-weight:800}
        .messages-header h1{margin:4px 0;font-family:Georgia,serif}
        .messages-header div:last-child{display:grid;text-align:right}
        .messages-header small{color:#66746d}
        .messages-layout{max-width:1180px;min-height:650px;margin:auto;display:grid;grid-template-columns:330px 1fr;background:#fff;border:1px solid #ded8cb;border-radius:18px;overflow:hidden}
        .conversation-list{padding:18px;background:#faf8f2;border-right:1px solid #ded8cb}
        .conversation-list__title{font-weight:800;margin-bottom:14px}
        .conversation-list button{width:100%;display:grid;gap:5px;text-align:left;padding:14px;margin-bottom:9px;border:1px solid #ded8cb;border-radius:12px;background:white;cursor:pointer}
        .conversation-list button.is-selected{border-color:#a94f2d;box-shadow:0 0 0 2px #a94f2d22}
        .conv-header{display:flex;justify-content:space-between;align-items:center}
        .unread-badge{background:#a94f2d;color:white;font-size:11px;font-weight:800;padding:2px 7px;border-radius:999px;min-width:20px;text-align:center}
        .conversation-list span{font-size:12px;color:#a94f2d}
        .conversation-list small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#66746d}
        .conversation-panel{display:flex;flex-direction:column}
        .conversation-header{display:flex;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #eee}
        .conversation-header h2{margin:4px 0}
        .message-log{flex:1;padding:24px;display:flex;flex-direction:column;gap:13px;overflow:auto;background:#fffdf8}
        .message{max-width:72%;align-self:flex-start;background:#f0ece2;padding:11px 14px;border-radius:14px}
        .message--mine{align-self:flex-end;background:#355b49;color:white}
        .message p{margin:5px 0;line-height:1.5}
        .message time,.message small{font-size:10px;opacity:.7}
        .message-composer{display:flex;gap:10px;padding:18px;border-top:1px solid #eee}
        .message-composer input{flex:1;padding:12px;border:1px solid #ccc;border-radius:999px}
        .message-composer button{border:0;border-radius:999px;padding:0 22px;background:#a94f2d;color:white;font-weight:800}
        .session-closed-notice{padding:14px 24px;text-align:center;color:#66746d;border-top:1px solid #eee;font-style:italic}
        .messages-state{padding:80px;text-align:center}
        .messages-error{max-width:1180px;margin:0 auto 12px;color:#9b1c1c}
        .messages-empty{margin:auto;text-align:center;color:#66746d;padding:48px}
        @media(max-width:760px){.messages-layout{grid-template-columns:1fr}.conversation-list{border-right:0;border-bottom:1px solid #ddd}.messages-header{align-items:start}.messages-shell{padding:14px}}
      `}</style>
    </main>
  )
}
