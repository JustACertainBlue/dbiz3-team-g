'use client'

import Link from 'next/link'
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { SessionContext } from '@/lib/auth/session'
import { readSessionContext } from '@/lib/auth/client-session'
import { renderChatMarkdown } from '@/lib/iac/markdown-utils'
import { bookingUpdateCopy } from './booking-update-copy'
import { composerState } from './composer-state'
import { closedNotice, closeReasonState } from './close-chat'
import { ACCEPT_ATTRIBUTE, ATTACH_ERROR_TEXT, attachState, typeLabel } from './attach-state'
import { ChevronLeft, Paperclip } from 'lucide-react'
import { hanoiClock } from '@/lib/time/hanoi-time'
import { attachmentLine, chatActions, chatStatusLine, groupByDay, initials, listTime, mergeLatestPage } from './chat-view'
import { usePolling } from '@/lib/client/use-polling'
import './chat-v9.css'

// Screens COM048 (Tour Agency) and COM065 (Local Provider): F-CHAT-01..05 on /api/iac/chats (spec-IAC FR-001..005);
// the attach dialog is COM125 (Agency) / COM126 (Provider), spec-IAC #49.
// Design wave 4 screen 4: Figma "Màn 4" layout; content per the screen specs (see chat-view.ts).
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

export default function MessagesPage() {
  return <Suspense fallback={<main className="ch9-state"><p>Đang tải hộp thư…</p></main>}><MessagesContent /></Suspense>
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
  // Phones show the list or one thread (Figma 360); desktop shows both.
  const [threadOpen, setThreadOpen] = useState(Boolean(requestedId))
  const logRef = useRef<HTMLDivElement>(null)
  const lastMessageId = history?.message_history[history.message_history.length - 1]?.message_id
  // Open a thread at its newest message; loading older messages does not move the view.
  useEffect(() => { const log = logRef.current; if (log) log.scrollTop = log.scrollHeight }, [history?.chat_session_id, lastMessageId])

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

  // #158 (spec-IAC FR-002): every 10 s while the tab is visible, refresh the list (previews, unread)
  // and append new messages of the open Chat; older messages the user loaded stay.
  usePolling(async () => {
    await loadList()
    if (!selectedId) return
    const response = await fetch(`/api/iac/chats/${encodeURIComponent(selectedId)}/messages`, { cache: 'no-store' })
    if (!response.ok) return
    const latest: History = (await response.json()).data
    setHistory(current => current?.chat_session_id === latest.chat_session_id ? mergeLatestPage(current, latest) : current)
    setChats(list => list.map(chat => chat.chat_session_id === latest.chat_session_id ? { ...chat, unread_count: 0 } : chat))
  })

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

  if (!session) return <main className="ch9-state"><p>Đang tải hộp thư…</p></main>
  if (!session.authenticated || (session.role !== 'Tour_Agency' && session.role !== 'Local_Provider')) {
    return <main className="ch9-state"><h1>Tin nhắn</h1><p>Đăng nhập bằng tài khoản Agency hoặc Provider để xem hội thoại.</p><Link href="/login">Đăng nhập</Link></main>
  }
  const isAgency = session.role === 'Tour_Agency'
  const now = new Date()
  const actions = history ? chatActions(session, history.chat_status) : []
  const openChat = (chatId: string) => {
    setSelectedId(chatId); setThreadOpen(true); setCloseOpen(false); setCloseReason(''); setNotice(''); resetAttach()
  }

  return <main className={threadOpen ? 'ch9 is-thread' : 'ch9'}>
    <aside className="ch9-list" aria-label="Danh sách hội thoại">
      <h1>Tin nhắn</h1>
      <p className="ch9-count">{chats.length} hội thoại</p>
      {chats.length === 0 && <p className="ch9-empty">Chưa có hội thoại. {isAgency ? 'Chọn một trải nghiệm trong Khám phá để nhắn tin cho xưởng.' : 'Mở một đặt chỗ để nhắn tin cho công ty du lịch.'}</p>}
      <ul>{chats.map(chat => <li key={chat.chat_session_id}>
        <button type="button" className={chat.chat_session_id === selectedId ? 'ch9-item is-selected' : 'ch9-item'} aria-current={chat.chat_session_id === selectedId ? 'true' : undefined} onClick={() => openChat(chat.chat_session_id)}>
          <span className="ch9-avatar" aria-hidden="true">{initials(chat.organization)}</span>
          <span className="ch9-item__body">
            <span className="ch9-item__top"><strong>{chat.organization}</strong><time>{listTime(chat.last_message_at, now)}</time>
              {chat.unread_count > 0 && <em className="ch9-unread" aria-label={`${chat.unread_count} tin chưa đọc`}>{chat.unread_count}</em>}</span>
            <span className="ch9-item__bottom"><span className="ch9-preview">{chat.last_message_preview || 'Hội thoại mới'}</span>
              <span className={chat.chat_status === 'Active' ? 'ch9-state-text is-active' : 'ch9-state-text'}>{chatStatusLine(chat.chat_status).split(' · ')[0]}</span></span>
          </span>
        </button>
      </li>)}</ul>
    </aside>
    <section className="ch9-thread" aria-label="Hội thoại">
      {error && <p className="ch9-alert" role="alert">{error}</p>}
      {notice && <p className="ch9-notice" role="status">{notice}</p>}
      {!selected || !history ? <div className="ch9-placeholder"><h2>Chọn một hội thoại</h2><p>Chọn từ danh sách để xem tin nhắn.</p></div> : <>
        <header className="ch9-head">
          <button type="button" className="ch9-back" onClick={() => setThreadOpen(false)} aria-label="Quay lại danh sách hội thoại"><ChevronLeft size={22} aria-hidden="true" /></button>
          <span className="ch9-avatar" aria-hidden="true">{initials(selected.organization)}</span>
          <div className="ch9-head__name"><h2>{selected.organization}</h2>
            <p><span className={history.chat_status === 'Active' ? 'ch9-state-text is-active' : 'ch9-state-text'}>{chatStatusLine(history.chat_status)}</span> · {selected.participant_name}</p></div>
          <div className="ch9-actions">{actions.map(action => action.href
            ? <Link key={action.key} href={action.href} className={action.key === 'create_booking' ? 'ch9-btn ch9-btn--primary' : 'ch9-btn'}>{action.label}</Link>
            : <button key={action.key} type="button" className="ch9-btn ch9-btn--danger" onClick={() => { setCloseOpen(true); setNotice('') }}>{action.label}</button>)}</div>
        </header>
        {closeOpen && history.chat_status === 'Active' && <div className="ch9-dialog" role="dialog" aria-label="Đóng hội thoại">
          <p><strong>Đóng hội thoại này?</strong> Lịch sử vẫn được giữ; hội thoại đã đóng không mở lại được.</p>
          <label>Lý do (không bắt buộc)<textarea value={closeReason} onChange={event => setCloseReason(event.target.value)} rows={2} /></label>
          <small className={closeState.canConfirm || closing ? '' : 'is-over'}>{closeState.counter}</small>
          <div><button type="button" className="ch9-btn" onClick={() => { setCloseOpen(false); setCloseReason('') }}>Hủy</button>
            <button type="button" className="ch9-btn ch9-btn--danger" disabled={!closeState.canConfirm} onClick={confirmClose}>{closing ? 'Đang đóng…' : 'Đóng hội thoại'}</button></div>
        </div>}
        <div className="ch9-log" ref={logRef}>
          {history.has_more_messages && <button type="button" className="ch9-older" onClick={loadOlder}>Tải tin nhắn cũ hơn</button>}
          {history.message_history.length === 0 && <p className="ch9-empty">Chưa có tin nhắn.</p>}
          {groupByDay(history.message_history, now).map(group => <div key={`${group.label}-${group.items[0].message_id}`} className="ch9-day">
            <p className="ch9-day__label">{group.label}</p>
            {group.items.map(message => {
              const displayText = message.text && message.experience_id
                ? message.text
                    .replace(/^(Xin chào, tôi quan tâm đến trải nghiệm này: \*\*|Yêu cầu báo giá cho trải nghiệm: )\[DEMO\]\s*/i, '$1')
                    .replace(` (/explore/experiences/${message.experience_id})`, '')
                : message.text
              const system = message.message_kind === 'Booking Update'
              const quote = message.message_kind === 'Quote Request'
              const formattedText = displayText && (system ? bookingUpdateCopy(displayText)
                : quote ? displayText.replace(/^Yêu cầu báo giá(?=\s|[:.!?]|$)/iu, '**Yêu cầu báo giá**') : displayText)
              // A message is the reader's own when it is not from the counterpart (participant_name, #22) or the system.
              const mine = !system && message.sender_name !== selected.participant_name
              return <article key={message.message_id} className={system ? 'ch9-msg ch9-msg--system' : mine ? 'ch9-msg ch9-msg--mine' : 'ch9-msg'}>
                {!system && !mine && <small className="ch9-msg__sender">{message.sender_name}{quote && !formattedText?.startsWith('**Yêu cầu báo giá**') && <> · <strong>Yêu cầu báo giá</strong></>}</small>}
                {formattedText && <p dangerouslySetInnerHTML={{ __html: renderChatMarkdown(formattedText) }} />}
                {message.attachments.map(file => <p key={file.attachment_id} className="ch9-file"><a href={`/api/iac/chats/${encodeURIComponent(history.chat_session_id)}/attachments/${encodeURIComponent(file.attachment_id)}`} download={file.file_name}>{attachmentLine(file)}</a> <span>· {typeLabel(file.file_name)}</span></p>)}
                {(message.experience_id || message.booking_id) && <p className="ch9-context">
                  {message.experience_id && <Link href={`/explore/experiences/${message.experience_id}`}>Xem trải nghiệm</Link>}
                  {message.booking_id && <Link href={isAgency ? `/agency/${session.agencyId}/bookings/${message.booking_id}` : `/provider/${session.providerId}/bookings/${message.booking_id}`}>Xem đặt chỗ</Link>}
                </p>}
                {!system && <time>{hanoiClock(message.sent_at)}</time>}
              </article>
            })}
          </div>)}
        </div>
        {attachOpen && history.chat_status === 'Active' && <div className="ch9-dialog" role="dialog" aria-label="Đính kèm tài liệu">
          <p><strong>Đính kèm tài liệu</strong> 1–5 tệp PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG; tối đa 10 MB mỗi tệp.</p>
          <input type="file" multiple accept={ACCEPT_ATTRIBUTE} aria-label="Chọn tệp" onChange={event => setAttachFiles(Array.from(event.target.files ?? []))} />
          {attach.rows.length > 0 && <ul>{attach.rows.map((row, index) => <li key={`${row.name}-${index}`} className={row.error ? 'is-invalid' : ''}>
            <strong>{row.name}</strong><span>{row.typeLabel} · {row.sizeLabel}</span>{row.error && <em>{row.error}</em>}
          </li>)}</ul>}
          {attach.message && <p className="ch9-attach-message">{attach.message}</p>}
          <div><button type="button" className="ch9-btn" onClick={resetAttach}>Hủy</button>
            <button type="button" className="ch9-btn ch9-btn--primary" disabled={!attach.canSend} onClick={sendFiles}>{attaching ? 'Đang gửi tệp…' : 'Gửi tệp'}</button></div>
        </div>}
        {composer.readOnly
          ? <div className="ch9-closed"><p>{closed?.title ?? 'Hội thoại đã đóng — chỉ xem.'}</p><small>{closed?.hint}</small></div>
          : <form className="ch9-composer" onSubmit={submit}>
            <button type="button" className="ch9-clip" onClick={() => setAttachOpen(true)} aria-label="Đính kèm tệp"><Paperclip size={22} aria-hidden="true" /></button>
            <div className="ch9-input"><textarea value={messageText} onChange={event => setMessageText(event.target.value)} placeholder="Nhập tin nhắn…" title="Hỗ trợ **đậm** và *nghiêng*" rows={1} aria-label="Nội dung tin nhắn" />
              <small className={composer.canSend || !messageText.trim() ? '' : 'is-over'}>{composer.counter}</small></div>
            <button type="submit" className="ch9-btn ch9-btn--primary ch9-send" disabled={!composer.canSend}>{pending ? 'Đang gửi…' : 'Gửi'}</button>
          </form>}
      </>}
    </section>
  </main>
}
