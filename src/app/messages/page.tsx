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

  if (!session) return <main className="messages-state"><p>Đang tải phiên demo…</p></main>
  if (!session.authenticated || (session.role !== 'Tour_Agency' && session.role !== 'Local_Provider')) {
    return <main className="messages-state"><h1>Hộp thư B2B</h1><p>Hãy chọn tài khoản Agency hoặc Provider trên thanh demo để xem hội thoại.</p><Link href="/login">Chọn tài khoản demo</Link></main>
  }
  const isAgency = session.role === 'Tour_Agency'

  return <main className="messages-shell">
    <header className="messages-header"><div><p>HANOI ARTISAN BRIDGE · {isAgency ? 'COM048' : 'COM065'}</p><h1>Chat</h1></div><div><strong>{isAgency ? 'Tour Agency demo' : 'Local Provider demo'}</strong><small>{isAgency ? 'Tour Agency' : 'Local Provider'}</small></div></header>
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
      .messages-shell{min-height:100vh;background:#f4f1e9;color:#203229;padding:28px}.messages-header{max-width:1180px;margin:auto;display:flex;justify-content:space-between;align-items:end;padding:22px 0}.messages-header p,.conversation-header small{font-size:11px;letter-spacing:.14em;color:#a94f2d;font-weight:800}.messages-header h1{margin:4px 0;font-family:Georgia,serif}.messages-header div:last-child{display:grid;text-align:right}.messages-header small{color:#66746d}.messages-layout{max-width:1180px;min-height:650px;margin:auto;display:grid;grid-template-columns:330px 1fr;background:#fff;border:1px solid #ded8cb;border-radius:18px;overflow:hidden}.conversation-list{padding:18px;background:#faf8f2;border-right:1px solid #ded8cb}.conversation-list__title{font-weight:800;margin-bottom:14px}.conversation-list button{width:100%;display:grid;gap:5px;text-align:left;padding:14px;margin-bottom:9px;border:1px solid #ded8cb;border-radius:12px;background:white;cursor:pointer}.conversation-list button.is-selected{border-color:#a94f2d;box-shadow:0 0 0 2px #a94f2d22}.conversation-list span{font-size:12px;color:#a94f2d}.conversation-list small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#66746d}.conversation-panel{display:flex;flex-direction:column}.conversation-header{display:flex;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #eee}.conversation-header h2{margin:4px 0}.conversation-header a{color:#a94f2d}.message-log{flex:1;padding:24px;display:flex;flex-direction:column;gap:13px;overflow:auto;background:#fffdf8}.message{max-width:72%;align-self:flex-start;background:#f0ece2;padding:11px 14px;border-radius:14px}.message--mine{align-self:flex-end;background:#355b49;color:white}.message p{margin:5px 0;line-height:1.5}.message time,.message small{font-size:10px;opacity:.7}.message-composer{display:flex;gap:10px;padding:18px;border-top:1px solid #eee}.message-composer input{flex:1;padding:12px;border:1px solid #ccc;border-radius:999px}.message-composer button{border:0;border-radius:999px;padding:0 22px;background:#a94f2d;color:white;font-weight:800}.messages-state{padding:80px;text-align:center}.messages-error{max-width:1180px;margin:0 auto 12px;color:#9b1c1c}.messages-empty{margin:auto;text-align:center;color:#66746d}.unread-badge{margin-left:8px;padding:1px 8px;border-radius:999px;background:#a94f2d;color:white;font-style:normal;font-size:11px}.conversation-list time{font-size:10px;color:#8a948f}.load-older{align-self:center;border:1px solid #ded8cb;border-radius:999px;background:white;padding:6px 14px;cursor:pointer}.message--system{align-self:center;background:#fff3dc;max-width:85%}.message-file,.message-context{font-size:12px}.message-context{display:flex;gap:10px}.message-context a{color:inherit;font-weight:700}.message-closed{padding:18px;border-top:1px solid #eee;color:#66746d;text-align:center}.message-closed p{margin:0 0 4px;font-weight:700}.messages-notice{max-width:1180px;margin:0 auto 12px;color:#355b49;font-weight:700}.close-chat{align-self:center;border:1px solid #a94f2d;border-radius:999px;background:white;color:#a94f2d;padding:8px 16px;font-weight:800;cursor:pointer}.close-dialog{display:grid;gap:8px;padding:16px 24px;background:#fff3dc;border-bottom:1px solid #eee}.close-dialog label{display:grid;gap:4px;font-size:13px;font-weight:700}.close-dialog textarea{padding:8px;border:1px solid #ccc;border-radius:10px;font:inherit}.close-dialog small{font-size:11px;color:#66746d}.close-dialog small.is-over{color:#9b1c1c;font-weight:800}.close-dialog div{display:flex;gap:10px;justify-content:flex-end}.close-dialog button{border:1px solid #ccc;border-radius:999px;background:white;padding:8px 16px;cursor:pointer}.close-dialog .close-confirm{background:#8a1f11;color:white;border-color:#8a1f11}.close-dialog button:disabled{opacity:.45;cursor:not-allowed}.message-composer textarea{flex:1;padding:12px;border:1px solid #ccc;border-radius:16px;font:inherit;resize:vertical}.message-composer small{align-self:center;font-size:11px;color:#66746d}.message-composer small.is-over{color:#9b1c1c;font-weight:800}.message-composer button:disabled{opacity:.45;cursor:not-allowed}.message-file a{color:inherit;font-weight:700}.attach-dialog{display:grid;gap:8px;padding:16px 24px;background:#eef4ef;border-top:1px solid #eee}.attach-dialog p{margin:0;font-size:13px}.attach-dialog ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}.attach-dialog li{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:8px 10px;background:white;border:1px solid #ded8cb;border-radius:10px;font-size:14px}.attach-dialog li span{font-size:12px;color:#66746d}.attach-dialog li em{grid-column:1/-1;color:#9b1c1c;font-style:normal;font-size:12px;font-weight:700}.attach-dialog li.is-invalid{border-color:#9b1c1c}.attach-message{color:#9b1c1c;font-weight:700}.attach-dialog div{display:flex;gap:10px;justify-content:flex-end}.attach-dialog button{border:1px solid #ccc;border-radius:999px;background:white;padding:8px 16px;cursor:pointer}.attach-dialog .attach-send{background:#355b49;color:white;border-color:#355b49}.attach-dialog button:disabled{opacity:.45;cursor:not-allowed}.message-composer .attach-open{background:white;color:#355b49;border:1px solid #355b49}@media(max-width:760px){.messages-layout{grid-template-columns:1fr}.conversation-list{border-right:0;border-bottom:1px solid #ddd}.messages-header{align-items:start}.messages-shell{padding:14px}}
    `}</style>
  </main>
}
