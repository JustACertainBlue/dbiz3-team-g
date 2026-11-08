'use client'

import Link from 'next/link'
import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { SessionContext } from '@/lib/auth/session'
import { readSessionContext } from '@/lib/auth/client-session'
import { renderChatMarkdown } from '@/lib/iac/markdown-utils'
import { composerState } from './composer-state'
import { closedNotice, closeReasonState } from './close-chat'
import { ACCEPT_ATTRIBUTE, ATTACH_ERROR_TEXT, attachState, sizeLabel, typeLabel } from './attach-state'

// Screens COM048 (Tour Agency) and COM065 (Local Provider): F-CHAT-01..05 on /api/iac/chats (spec-IAC FR-001..005);
// the attach dialog is COM125 (Agency) / COM126 (Provider), spec-IAC #49.
type ChatEntry = {
  chat_session_id: string; chat_status: 'Active' | 'Closed'; participant_name: string; organization: string;
  last_message_preview?: string; last_message_at?: string; unread_count: number
}
type Attachment = { attachment_id: string; file_name: string; file_type: string; file_size: number }
type Message = {
  message_id: string; message_kind: string; text: string; sender_name: string; sent_at: string;
  experience_id: string; booking_id: string; attachments: Attachment[]
}
type History = { chat_session_id: string; chat_status: 'Active' | 'Closed'; message_history: Message[]; has_more_messages: boolean; closed_at?: string; closed_by_name?: string }

const formatTime = (value?: string) => value ? new Date(value).toLocaleString('vi-VN') : ''

export default function MessagesPage() {
  return <Suspense fallback={<main className="messages-state"><p>Đang tải hộp thư…</p></main>}><MessagesContent /></Suspense>
}

function MessagesContent() {
  const searchParams = useSearchParams()
  const requestedId = searchParams.get('chat_session_id')
  const [session, setSession] = useState<SessionContext | null>(null)
  const [chats, setChats] = useState<ChatEntry[]>([])
  const [selectedId, setSelectedId] = useState(requestedId || '')
  const [history, setHistory] = useState<History | null>(null)
  const [messageText, setMessageText] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [closeOpen, setCloseOpen] = useState(false)
  const [closeReason, setCloseReason] = useState('')
  const [closing, setClosing] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const [attachFiles, setAttachFiles] = useState<File[]>([])
  const [attaching, setAttaching] = useState(false)

  const loadList = useCallback(async () => {
    const [sessionContext, listResponse] = await Promise.all([
      readSessionContext(),
      fetch('/api/iac/chats', { cache: 'no-store' }),
    ])
    setSession(sessionContext)
    const body = await listResponse.json()
    if (!listResponse.ok) {
      if (listResponse.status !== 403) setError(body.error?.message || 'Không thể tải hội thoại')
      return
    }
    setChats(body.data.chat_list)
    setSelectedId(current => current || requestedId || body.data.chat_list[0]?.chat_session_id || '')
  }, [requestedId])

  // First page: latest 50 and the unread reset (BR-015, BR-017, spec-IAC #23).
  const loadHistory = useCallback(async (chatId: string) => {
    if (!chatId) return setHistory(null)
    const response = await fetch(`/api/iac/chats/${encodeURIComponent(chatId)}/messages`, { cache: 'no-store' })
    const body = await response.json()
    if (!response.ok) {
      setHistory(null)
      return setError(body.error?.message || 'Không thể tải lịch sử hội thoại')
    }
    setHistory(body.data)
    setChats(list => list.map(chat => chat.chat_session_id === chatId ? { ...chat, unread_count: 0 } : chat))
  }, [])

  useEffect(() => { loadList().catch(() => setError('Không thể tải hội thoại')) }, [loadList])
  useEffect(() => { loadHistory(selectedId).catch(() => setError('Không thể tải lịch sử hội thoại')) }, [selectedId, loadHistory])

  async function loadOlder() {
    if (!history?.message_history.length) return
    const cursor = history.message_history[0].message_id
    const response = await fetch(`/api/iac/chats/${encodeURIComponent(history.chat_session_id)}/messages?before_cursor=${encodeURIComponent(cursor)}`, { cache: 'no-store' })
    const body = await response.json()
    if (!response.ok) return setError(body.error?.message || 'Không thể tải tin nhắn cũ hơn')
    setHistory(current => current && { ...current, message_history: [...body.data.message_history, ...current.message_history], has_more_messages: body.data.has_more_messages })
  }

  const selected = chats.find(chat => chat.chat_session_id === selectedId)
  const composer = composerState({ text: messageText, pending, chatStatus: history?.chat_status ?? 'Closed' })

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!history || !composer.canSend) return
    setPending(true) // Q8: Send stays disabled until this request ends
    setError('')
    try {
      const response = await fetch(`/api/iac/chats/${encodeURIComponent(history.chat_session_id)}/messages`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message_text: messageText }),
      })
      const body = await response.json()
      if (!response.ok) return setError(body.error?.message || 'Không thể gửi tin nhắn')
      setMessageText('')
      await Promise.all([loadList(), loadHistory(history.chat_session_id)])
    } catch {
      setError('Không thể gửi tin nhắn')
    } finally {
      setPending(false)
    }
  }

  const closeState = closeReasonState({ text: closeReason, pending: closing })
  const closed = history ? closedNotice(history) : null

  // F-CHAT-04 (spec-IAC #33): confirm with an optional reason; Cancel sends nothing.
  async function confirmClose() {
    if (!history || !closeState.canConfirm) return
    setClosing(true)
    setError('')
    try {
      const response = await fetch(`/api/iac/chats/${encodeURIComponent(history.chat_session_id)}/close`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(closeReason.trim() ? { close_reason: closeReason } : {}),
      })
      const body = await response.json()
      if (!response.ok) return setError(body.error?.message || 'Không thể đóng hội thoại')
      setNotice(body.data.success_message)
      setCloseOpen(false)
      setCloseReason('')
      await Promise.all([loadList(), loadHistory(history.chat_session_id)])
    } catch {
      setError('Không thể đóng hội thoại')
    } finally {
      setClosing(false)
    }
  }

  const attach = attachState(attachFiles, attaching)
  const resetAttach = () => { setAttachOpen(false); setAttachFiles([]) }

  // F-CHAT-05 (spec-IAC #39, #45, #49): one multipart request; the server checks every file again.
  async function sendFiles() {
    if (!history || !attach.canSend) return
    setAttaching(true)
    setError('')
    try {
      const form = new FormData()
      for (const file of attachFiles) form.append('files', file)
      const response = await fetch(`/api/iac/chats/${encodeURIComponent(history.chat_session_id)}/attachments`, { method: 'POST', body: form })
      const body = await response.json()
      if (!response.ok) {
        const fileErrors = (body.error?.file_errors ?? []) as { file_name: string; reason: keyof typeof ATTACH_ERROR_TEXT }[]
        return setError(fileErrors.length ? fileErrors.map(item => `${item.file_name}: ${ATTACH_ERROR_TEXT[item.reason] ?? item.reason}`).join('; ') : body.error?.message || 'Không thể gửi tệp')
      }
      resetAttach()
      await Promise.all([loadList(), loadHistory(history.chat_session_id)])
    } catch {
      setError('Không thể gửi tệp')
    } finally {
      setAttaching(false)
    }
  }

  if (!session) return <main className="messages-state"><p>Đang tải hộp thư…</p></main>
  if (!session.authenticated || (session.role !== 'Tour_Agency' && session.role !== 'Local_Provider')) {
    return <main className="messages-state"><h1>Hộp thư B2B</h1><p>Đăng nhập bằng tài khoản Agency hoặc Provider để xem hội thoại.</p><Link href="/login">Đăng nhập</Link></main>
  }
  const isAgency = session.role === 'Tour_Agency'

  return <main className="messages-shell">
    <header className="messages-header"><div><p>HANOI ARTISAN BRIDGE</p><h1>Chat</h1></div><div><strong>{isAgency ? 'Không gian công ty du lịch' : 'Không gian chủ xưởng'}</strong><small>{isAgency ? 'Công ty du lịch' : 'Chủ xưởng'}</small></div></header>
    {error && <p className="messages-error" role="alert">{error}</p>}
    {notice && <p className="messages-notice" role="status">{notice}</p>}
    <div className="messages-layout">
      <aside className="conversation-list"><div className="conversation-list__title">Hội thoại ({chats.length})</div>
        {chats.length === 0 && <p>Chưa có hội thoại. {isAgency ? 'Agency có thể bắt đầu từ Explore hoặc AI Tour Matching.' : 'Mở Chat từ một Booking.'}</p>}
        {chats.map(chat => <button key={chat.chat_session_id} className={chat.chat_session_id === selectedId ? 'is-selected' : ''} onClick={() => { setSelectedId(chat.chat_session_id); setCloseOpen(false); setCloseReason(''); setNotice(''); resetAttach() }}>
          <strong>{chat.organization}{chat.unread_count > 0 && <em className="unread-badge" aria-label={`${chat.unread_count} tin chưa đọc`}>{chat.unread_count}</em>}</strong>
          <span>{chat.participant_name} · {chat.chat_status}</span>
          <small>{chat.last_message_preview || 'Hội thoại mới'}</small>
          <time>{formatTime(chat.last_message_at)}</time>
        </button>)}
      </aside>
      <section className="conversation-panel">
        {!selected || !history ? <div className="messages-empty"><h2>Chọn một hội thoại</h2><p>Mỗi cặp Agency–Provider có một hội thoại đang mở; Experience, Quote và Booking là ngữ cảnh trong cùng hội thoại.</p></div> : <>
          <header className="conversation-header"><div><small>{history.chat_status === 'Active' ? 'ACTIVE' : 'CLOSED'}</small><h2>{selected.organization}</h2><p>{selected.participant_name}</p></div>
            {history.chat_status === 'Active' && <button type="button" className="close-chat" onClick={() => { setCloseOpen(true); setNotice('') }}>Đóng hội thoại</button>}</header>
          {closeOpen && history.chat_status === 'Active' && <div className="close-dialog" role="dialog" aria-label="Đóng hội thoại">
            <p><strong>Đóng hội thoại này?</strong> Lịch sử vẫn được giữ; hội thoại đã đóng không mở lại được.</p>
            <label>Lý do (không bắt buộc)<textarea value={closeReason} onChange={event => setCloseReason(event.target.value)} rows={2} /></label>
            <small className={closeState.canConfirm || closing ? '' : 'is-over'}>{closeState.counter}</small>
            <div><button type="button" onClick={() => { setCloseOpen(false); setCloseReason('') }}>Hủy</button>
              <button type="button" className="close-confirm" disabled={!closeState.canConfirm} onClick={confirmClose}>{closing ? 'Đang đóng…' : 'Đóng hội thoại'}</button></div>
          </div>}
          <div className="message-log">
            {history.has_more_messages && <button type="button" className="load-older" onClick={loadOlder}>Tải tin nhắn cũ hơn</button>}
            {history.message_history.length === 0 && <p className="messages-empty">Chưa có tin nhắn.</p>}
            {history.message_history.map(message => {
              // A message is the reader's own when it is not from the counterpart (participant_name, #22) or the system.
              const mine = message.message_kind !== 'Booking Update' && message.sender_name !== selected.participant_name
              return <article key={message.message_id} className={message.message_kind === 'Booking Update' ? 'message message--system' : mine ? 'message message--mine' : 'message'}>
                <small>{message.sender_name}{message.message_kind !== 'User Text' ? ` · ${message.message_kind}` : ''}</small>
                {message.text && <p dangerouslySetInnerHTML={{ __html: renderChatMarkdown(message.text) }} />}
                {message.attachments.map(file => <p key={file.attachment_id} className="message-file">📎 <a href={`/api/iac/chats/${encodeURIComponent(history.chat_session_id)}/attachments/${encodeURIComponent(file.attachment_id)}`} download={file.file_name}>{file.file_name}</a> · {typeLabel(file.file_name)} · {sizeLabel(file.file_size)}</p>)}
                {(message.experience_id || message.booking_id) && <p className="message-context">
                  {message.experience_id && <Link href={`/explore/experiences/${message.experience_id}`}>Experience</Link>}
                  {message.booking_id && <Link href={isAgency ? `/agency/${session.agencyId}/bookings/${message.booking_id}` : `/provider/${session.providerId}/bookings/${message.booking_id}`}>Booking</Link>}
                </p>}
                <time>{formatTime(message.sent_at)}</time>
              </article>
            })}
          </div>
          {attachOpen && history.chat_status === 'Active' && <div className="attach-dialog" role="dialog" aria-label="Đính kèm tài liệu">
            <p><strong>Đính kèm tài liệu</strong> 1–5 tệp PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG; tối đa 10 MB mỗi tệp.</p>
            <input type="file" multiple accept={ACCEPT_ATTRIBUTE} aria-label="Chọn tệp" onChange={event => setAttachFiles(Array.from(event.target.files ?? []))} />
            {attach.rows.length > 0 && <ul>{attach.rows.map((row, index) => <li key={`${row.name}-${index}`} className={row.error ? 'is-invalid' : ''}>
              <strong>{row.name}</strong><span>{row.typeLabel} · {row.sizeLabel}</span>{row.error && <em>{row.error}</em>}
            </li>)}</ul>}
            {attach.message && <p className="attach-message">{attach.message}</p>}
            <div><button type="button" onClick={resetAttach}>Hủy</button>
              <button type="button" className="attach-send" disabled={!attach.canSend} onClick={sendFiles}>{attaching ? 'Đang gửi tệp…' : 'Gửi tệp'}</button></div>
          </div>}
          {composer.readOnly
            ? <div className="message-closed"><p>{closed?.title ?? 'Hội thoại đã đóng — chỉ xem.'}</p><small>{closed?.hint}</small></div>
            : <form className="message-composer" onSubmit={submit}>
              <textarea value={messageText} onChange={event => setMessageText(event.target.value)} placeholder="Nhập nội dung trao đổi… (**đậm**, *nghiêng*)" rows={2} />
              <small className={composer.canSend || !messageText.trim() ? '' : 'is-over'}>{composer.counter}</small>
              <button type="button" className="attach-open" onClick={() => setAttachOpen(true)}>Đính kèm</button>
              <button type="submit" disabled={!composer.canSend}>{pending ? 'Đang gửi…' : 'Gửi tin nhắn'}</button>
            </form>}
        </>}
      </section>
    </div>
    <style jsx>{`
      .messages-shell{min-height:100vh;background:var(--palette-gray-94);color:var(--palette-teal-16-2);padding:var(--space-28)}.messages-header{max-width:1180px;margin:auto;display:flex;justify-content:space-between;align-items:end;padding:var(--space-22) 0}.messages-header p,.conversation-header small{font-size:var(--font-size-11);letter-spacing:.14em;color:var(--palette-orange-42);font-weight:800}.messages-header h1{margin:var(--space-4) 0;font-family:Georgia,serif}.messages-header div:last-child{display:grid;text-align:right}.messages-header small{color:var(--palette-gray-43-2)}.messages-layout{max-width:1180px;min-height:650px;margin:auto;display:grid;grid-template-columns:330px 1fr;background:var(--palette-white);border:var(--border-width-1) solid var(--palette-amber-83);border-radius:var(--radius-lg);overflow:hidden}.conversation-list{padding:var(--space-18);background:var(--palette-gray-96-3);border-right:var(--border-width-1) solid var(--palette-amber-83)}.conversation-list__title{font-weight:800;margin-bottom:var(--space-14)}.conversation-list button{width:100%;display:grid;gap:var(--space-5);text-align:left;padding:var(--space-14);margin-bottom:var(--space-9);border:var(--border-width-1) solid var(--palette-amber-83);border-radius:var(--radius-md);background:white;cursor:pointer}.conversation-list button.is-selected{border-color:var(--palette-orange-42);box-shadow:0 0 0 2px var(--alpha-orange-42-13p3)}.conversation-list span{font-size:var(--font-size-12);color:var(--palette-orange-42)}.conversation-list small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--palette-gray-43-2)}.conversation-panel{display:flex;flex-direction:column}.conversation-header{display:flex;justify-content:space-between;padding:var(--space-20) var(--space-24);border-bottom:var(--border-width-1) solid var(--palette-gray-93-2)}.conversation-header h2{margin:var(--space-4) 0}.conversation-header a{color:var(--palette-orange-42)}.message-log{flex:1;padding:var(--space-24);display:flex;flex-direction:column;gap:var(--space-13);overflow:auto;background:var(--palette-gray-99)}.message{max-width:72%;align-self:flex-start;background:var(--palette-amber-91);padding:var(--space-11) var(--space-14);border-radius:var(--radius-14)}.message--mine{align-self:flex-end;background:var(--palette-teal-28);color:white}.message p{margin:var(--space-5) 0;line-height:1.5}.message time,.message small{font-size:var(--font-size-10);opacity:.7}.message-composer{display:flex;gap:var(--space-10);padding:var(--space-18);border-top:var(--border-width-1) solid var(--palette-gray-93-2)}.message-composer input{flex:1;padding:var(--space-12);border:var(--border-width-1) solid var(--palette-gray-80);border-radius:var(--radius-999)}.message-composer button{border:0;border-radius:var(--radius-999);padding:0 var(--space-22);background:var(--palette-orange-42);color:white;font-weight:800}.messages-state{padding:var(--space-80);text-align:center}.messages-error{max-width:1180px;margin:0 auto var(--space-12);color:var(--palette-red-36)}.messages-empty{margin:auto;text-align:center;color:var(--palette-gray-43-2)}.unread-badge{margin-left:var(--space-8);padding:var(--space-1) var(--space-8);border-radius:var(--radius-999);background:var(--palette-orange-42);color:white;font-style:normal;font-size:var(--font-size-11)}.conversation-list time{font-size:var(--font-size-10);color:var(--palette-gray-56)}.load-older{align-self:center;border:var(--border-width-1) solid var(--palette-amber-83);border-radius:var(--radius-999);background:white;padding:var(--space-6) var(--space-14);cursor:pointer}.message--system{align-self:center;background:var(--palette-orange-93-4);max-width:85%}.message-file,.message-context{font-size:var(--font-size-12)}.message-context{display:flex;gap:var(--space-10)}.message-context a{color:inherit;font-weight:700}.message-closed{padding:var(--space-18);border-top:var(--border-width-1) solid var(--palette-gray-93-2);color:var(--palette-gray-43-2);text-align:center}.message-closed p{margin:0 0 var(--space-4);font-weight:700}.messages-notice{max-width:1180px;margin:0 auto var(--space-12);color:var(--palette-teal-28);font-weight:700}.close-chat{align-self:center;border:var(--border-width-1) solid var(--palette-orange-42);border-radius:var(--radius-999);background:white;color:var(--palette-orange-42);padding:var(--space-8) var(--space-16);font-weight:800;cursor:pointer}.close-dialog{display:grid;gap:var(--space-8);padding:var(--space-16) var(--space-24);background:var(--palette-orange-93-4);border-bottom:var(--border-width-1) solid var(--palette-gray-93-2)}.close-dialog label{display:grid;gap:var(--space-4);font-size:var(--font-size-13);font-weight:700}.close-dialog textarea{padding:var(--space-8);border:var(--border-width-1) solid var(--palette-gray-80);border-radius:var(--radius-10);font:inherit}.close-dialog small{font-size:var(--font-size-11);color:var(--palette-gray-43-2)}.close-dialog small.is-over{color:var(--palette-red-36);font-weight:800}.close-dialog div{display:flex;gap:var(--space-10);justify-content:flex-end}.close-dialog button{border:var(--border-width-1) solid var(--palette-gray-80);border-radius:var(--radius-999);background:white;padding:var(--space-8) var(--space-16);cursor:pointer}.close-dialog .close-confirm{background:var(--palette-red-30-2);color:white;border-color:var(--palette-red-30-2)}.close-dialog button:disabled{opacity:.45;cursor:not-allowed}.message-composer textarea{flex:1;padding:var(--space-12);border:var(--border-width-1) solid var(--palette-gray-80);border-radius:var(--radius-16);font:inherit;resize:vertical}.message-composer small{align-self:center;font-size:var(--font-size-11);color:var(--palette-gray-43-2)}.message-composer small.is-over{color:var(--palette-red-36);font-weight:800}.message-composer button:disabled{opacity:.45;cursor:not-allowed}.message-file a{color:inherit;font-weight:700}.attach-dialog{display:grid;gap:var(--space-8);padding:var(--space-16) var(--space-24);background:var(--palette-gray-95-2);border-top:var(--border-width-1) solid var(--palette-gray-93-2)}.attach-dialog p{margin:0;font-size:var(--font-size-13)}.attach-dialog ul{list-style:none;margin:0;padding:0;display:grid;gap:var(--space-6)}.attach-dialog li{display:grid;grid-template-columns:1fr auto;gap:var(--space-2) var(--space-10);padding:var(--space-8) var(--space-10);background:white;border:var(--border-width-1) solid var(--palette-amber-83);border-radius:var(--radius-10);font-size:var(--font-size-14)}.attach-dialog li span{font-size:var(--font-size-12);color:var(--palette-gray-43-2)}.attach-dialog li em{grid-column:1/-1;color:var(--palette-red-36);font-style:normal;font-size:var(--font-size-12);font-weight:700}.attach-dialog li.is-invalid{border-color:var(--palette-red-36)}.attach-message{color:var(--palette-red-36);font-weight:700}.attach-dialog div{display:flex;gap:var(--space-10);justify-content:flex-end}.attach-dialog button{border:var(--border-width-1) solid var(--palette-gray-80);border-radius:var(--radius-999);background:white;padding:var(--space-8) var(--space-16);cursor:pointer}.attach-dialog .attach-send{background:var(--palette-teal-28);color:white;border-color:var(--palette-teal-28)}.attach-dialog button:disabled{opacity:.45;cursor:not-allowed}.message-composer .attach-open{background:white;color:var(--palette-teal-28);border:var(--border-width-1) solid var(--palette-teal-28)}@media(max-width:760px){.messages-layout{grid-template-columns:1fr}.conversation-list{border-right:0;border-bottom:var(--border-width-1) solid var(--palette-gray-87)}.messages-header{align-items:start}.messages-shell{padding:var(--space-14)}}
    `}</style>
  </main>
}
