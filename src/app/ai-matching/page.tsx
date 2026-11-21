'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { readSessionContext } from '@/lib/auth/client-session'
import { AI_FAILURE_TEXT, HANDOFF_FAILURE_TEXT, handoffOutcome, matchResultsView, messageOutcome, noMatchView, understoodChips, understoodDateLine, type ApiResult } from './matching-view'
import { RESTRICTED_TEXT } from './ai-matching-access'
import { historyDate, historyTitle } from './history-view'
import { perGuest, recommendationCardView } from './card-view'
import { useAgencyName } from './agency-name'
import { ArrowUp, Check, ChevronDown, ChevronRight, Clock, MessageSquare, Package, Plus, Sparkles, Users } from 'lucide-react'
import CoverImage from '../explore/v3/CoverImage'
import { RESULT_SIZES } from '../explore/v3/image-sizes'
import { vnd } from '../explore/v3/ExperienceCard'
import '../explore/v3/explore-v3.css'
import './ai-matching.css'

interface Message {
  id: string
  sender: 'Agency' | 'Assistant'
  text: string
  sent_at: string
  dateLine?: string
  clarificationQuestions?: string[]
  recommendations?: any[]
  additionalSuggestions?: any[] // FR-008 (#188): up to 5 after the Top 5
  relaxationLines?: string[]
  retry?: 'reanalyze' | 'resend'
  retryText?: string
}

export default function AiMatchingScreen() {
  const agencyName = useAgencyName()
  const router = useRouter()
  const [role, setRole] = useState<'Agency' | 'Guest'>('Guest')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [agencyId, setAgencyId] = useState<string>('')
  const [inputText, setInputText] = useState('')
  // UI v3 (human decision 2026-11-18 #2): Explore / detail pages open this page with ?prompt=…; the text is filled in
  // the input and never sent automatically.
  useEffect(() => {
    const prompt = new URLSearchParams(window.location.search).get('prompt')
    if (prompt) setInputText(prompt.slice(0, 2000))
  }, [])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [chips, setChips] = useState<string[]>([])
  const [history, setHistory] = useState<{ session_id: string; title: string; last_activity_at: string }[]>([])
  const [chatStatus, setChatStatus] = useState<Record<string, string>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sessionInitializationRef = useRef(false)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    readSessionContext()
      .then(session => {
        if (session.role === 'Tour_Agency' && session.agencyId) {
          setAgencyId(session.agencyId)
          setRole('Agency')
        } else {
          setRole('Guest')
        }
      })
      .catch(() => setRole('Guest'))
  }, [])

  // Create a matching session only after the shared cookie session identifies an Agency.
  useEffect(() => {
    if (role === 'Agency' && agencyId) {
      if (sessionInitializationRef.current) return
      sessionInitializationRef.current = true
      // "Gần đây": ?session=<id> reopens an earlier conversation; otherwise a new session starts.
      const resume = new URLSearchParams(window.location.search).get('session')
      if (resume) resumeSession(resume)
      else initializeSession()
      loadHistory()
    }
  }, [role, agencyId])

  // Chat composer: one line that grows with the text (phone), back to one line after sending.
  useEffect(() => {
    const el = chatInputRef.current
    if (!el) return
    el.style.height = 'auto'
    if (inputText) el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [inputText])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const initializeSession = async () => {
    try {
      const res = await fetch('/api/ait/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const data = await res.json()
        setSessionId(data.matching_session_id || data.session_id)
      }
    } catch {
      // Offline fallback for preview
      setSessionId(`session-local-${Date.now()}`)
    }
  }

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/ait/sessions')
      if (res.ok) setHistory(((await res.json()) as { sessions?: typeof history }).sessions ?? [])
    } catch {
      // The rail stays empty; the screen keeps working.
    }
  }

  // Reopen an earlier conversation: show the stored Agency messages, then re-analyze them with retry (adds no message).
  const resumeSession = async (id: string) => {
    try {
      const res = await fetch(`/api/ait/sessions/${id}`)
      if (!res.ok) return initializeSession()
      const data = await res.json() as { session_id: string; messages: { message_id: string; sender: string; text: string; sent_at: string }[] }
      setSessionId(data.session_id)
      const stored = data.messages.filter(m => m.sender === 'Agency')
      setMessages(stored.map(m => ({ id: m.message_id, sender: 'Agency' as const, text: m.text, sent_at: new Date(m.sent_at).toLocaleTimeString() })))
      if (stored.length > 0) await analyze({ retry: true }, data.session_id)
    } catch {
      await initializeSession()
    }
  }

  // Guest Access Guard (BR-001, BR-002)
  if (role === 'Guest') {
    return (
      <div id="guest-access-denied" className="aim aim__guest">
        <div>
          <h2>Chỉ dành cho công ty lữ hành</h2>
          <p>{RESTRICTED_TEXT}</p>
          <a id="switch-to-agency-btn" href="/login?next=/ai-matching" className="aim__btn aim__btn--p">Đăng nhập công ty lữ hành</a>
        </div>
      </div>
    )
  }

  const addAssistant = (message: Omit<Message, 'id' | 'sender' | 'sent_at'>) =>
    setMessages(prev => [
      ...prev,
      { id: `assistant-${Date.now()}-${prev.length}`, sender: 'Assistant', sent_at: new Date().toLocaleTimeString(), ...message },
    ])

  const postJson = async (url: string, body: unknown): Promise<ApiResult> => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) }
    } catch {
      return { networkError: true }
    }
  }

  // Analyze a new Agency message, or on Retry the stored conversation without adding a message (#33).
  const analyze = async (body: Record<string, unknown>, id: string | null = sessionId) => {
    if (!id) return
    setLoading(true)
    try {
      const result = await postJson(`/api/ait/sessions/${id}/messages`, body)
      const outcome = messageOutcome(result)
      // #156: show the date understood so the Agency can correct it.
      if ('body' in result) { const found = understoodChips(result.body); if (found.length > 0) setChips(found) }
      const dateLine = 'body' in result ? understoodDateLine(result.body) ?? undefined : undefined
      if (outcome.kind === 'clarify') {
        addAssistant({ text: 'Mình cần thêm một vài thông tin để tìm trải nghiệm hợp với đoàn của bạn:', clarificationQuestions: outcome.questions, dateLine })
      } else if (outcome.kind === 'match') {
        await fetchMatchingResults(outcome.profile, dateLine, id)
      } else {
        addAssistant({ text: outcome.text, retry: outcome.retry, retryText: typeof body.text === 'string' ? body.text : undefined })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText
    if (!textToSend.trim() || !sessionId) return

    setMessages(prev => [...prev, { id: `msg-${Date.now()}`, sender: 'Agency', text: textToSend, sent_at: new Date().toLocaleTimeString() }])
    if (!customPrompt) setInputText('')
    await analyze({ sender: 'Agency', text: textToSend })
    loadHistory()
  }

  /**
   * Calls the real matching pipeline via the server API. A failure shows the #27 message with Retry;
   * no offline or fabricated result is ever shown (FR-003, BR-017).
   */
  const fetchMatchingResults = async (profile: unknown, dateLine?: string, id: string | null = sessionId) => {
    const result = await postJson('/api/ait/matching', { session_id: id, tour_preference_profile: profile })
    if ('networkError' in result || !result.ok) {
      addAssistant({ text: AI_FAILURE_TEXT, retry: 'reanalyze' })
      return
    }
    const { top: topMatches, additional } = matchResultsView(result.body)
    if (topMatches.length > 0) {
      addAssistant({
        text: 'Mình đã đối chiếu yêu cầu của đoàn với các xưởng đã xác minh. Đây là các trải nghiệm gợi ý:',
        dateLine,
        recommendations: topMatches,
        additionalSuggestions: additional,
      })
    } else {
      // No candidate reaches the constraints or 60/100 → relaxation suggestions (BR-011, FR-012)
      const view = noMatchView(result.body)
      addAssistant({ text: view.prompt, relaxationLines: view.lines, dateLine })
    }
  }

  // Request Quote / Chat: open Messages (COM048) with the Chat selected only after success (#31).
  const runHandoff = async (kind: 'quote' | 'chat', experienceId: string, statusKey: string) => {
    if (!sessionId) return
    const setStatus = setChatStatus
    setStatus(prev => ({ ...prev, [statusKey]: kind === 'quote' ? 'Đang gửi yêu cầu báo giá…' : 'Đang mở cuộc trò chuyện…' }))
    const outcome = handoffOutcome(await postJson(`/api/ait/sessions/${sessionId}/${kind}`, { experience_id: experienceId }))
    if (outcome.kind === 'success') router.push(outcome.navigateTo)
    else setStatus(prev => ({ ...prev, [statusKey]: outcome.text }))
  }

  const handleRequestQuote = (experienceId: string) => runHandoff('quote', experienceId, experienceId)
  const handleChat = (experienceId: string, providerId: string) => runHandoff('chat', experienceId, providerId)

  const cardOf = recommendationCardView
  const isNew = messages.length === 0 && !loading
  const spark = <span className="aim__av" aria-hidden="true"><Sparkles /></span>

  return (
    <div className="aim">
      <aside className="aim__side" aria-label="Các cuộc ghép tour">
        <a className="aim__new" href="/ai-matching"><Plus aria-hidden="true" />Cuộc ghép tour mới</a>
        {history.length > 0 && <>
          <p className="aim__shead">Gần đây <ChevronDown aria-hidden="true" /></p>
          <ul className="aim__hist">
            {history.map(item => (
              <li key={item.session_id}>
                <a href={`/ai-matching?session=${item.session_id}`} className={item.session_id === sessionId ? 'aim__cur' : undefined} aria-current={item.session_id === sessionId ? 'page' : undefined}>
                  {historyTitle(item.title)}<span>{historyDate(item.last_activity_at)}</span>
                </a>
              </li>
            ))}
          </ul>
        </>}
      </aside>

      <div className="aim__pane">
        {isNew ? (
        <div className="aim__col aim__empty">
          <h1 className="aim__hello"><Sparkles aria-hidden="true" />Chào {agencyName || 'bạn'}, đoàn tiếp theo cần gì?</h1>
          <form className="aim__comp" method="post" onSubmit={e => { e.preventDefault(); handleSendMessage() }}>
            <label className="v3-sr" htmlFor="matching-prompt-input">Tin nhắn cho Ghép tour AI</label>
            <textarea
              id="matching-prompt-input"
              value={inputText}
              maxLength={2000}
              rows={2}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
              placeholder="Kể về đoàn của bạn: bao nhiêu khách, đi ngày nào, ngân sách, muốn làm gì…"
            />
            <div className="aim__cbar">
              <button id="send-message-btn" type="submit" className="aim__send" aria-label="Gửi" disabled={!inputText.trim() || loading}><ArrowUp aria-hidden="true" /></button>
            </div>
          </form>
          <div className="aim__sugg">
            {/* Mockup 22 examples: they fill the input and are never sent automatically. */}
            {['25 học sinh, muốn tự làm sản phẩm', 'Khách Hàn Quốc 15 người', 'Team building 30 người', 'Tour nửa ngày, dưới 200.000 ₫/khách'].map(text => <button key={text} type="button" className="aim__sg" onClick={() => setInputText(text)}><Sparkles aria-hidden="true" />{text}</button>)}
          </div>
          <p className="aim__note">AI chỉ gợi ý trải nghiệm và ngày còn trống. Bạn tự chọn và gửi yêu cầu đặt chỗ cho xưởng.</p>
        </div>
        ) : (<>
        {/* #188, screen-spec-AIT121 §3 #1: the screen heading; brand, navigation and account come from the shared shell. */}
        <div className="aim__top"><div className="aim__col aim__topin">
          <h1 className="aim__h1">Ghép tour AI</h1>
          {chips.length > 0 && <><span className="aim__sub">AI đã hiểu:</span>{chips.map(chip => <span key={chip} className="aim__chip">{chip}</span>)}</>}
        </div></div>

        <section className="aim__col aim__stream" aria-label="Cuộc trò chuyện với AI">
          {messages.map(msg => msg.sender === 'Agency' ? (
            <div key={msg.id} className="aim__me">{msg.text}</div>
          ) : (
            <div key={msg.id} className="aim__ai" style={msg.recommendations?.length ? { width: '100%' } : undefined}>
              {spark}
              <div className="aim__b">
                <p>{msg.text}</p>
                <div className="aim__meta">Trợ lý AI • {msg.sent_at}</div>

                {/* #156: the date the assistant understood, so the Agency can correct it */}
                {msg.dateLine && <p id="understood-date" className="aim__date">{msg.dateLine}</p>}

                {/* Relaxation suggestions (BR-011, FR-012, #23, #24) */}
                {msg.relaxationLines && msg.relaxationLines.length > 0 && (
                  <ul id="relaxation-suggestions" className="aim__list">
                    {msg.relaxationLines.map(line => <li key={line}>{line}</li>)}
                  </ul>
                )}

                {/* Temporary AI Failure: Retry re-analyzes the saved conversation (#33) or resends an unsent message (#36) */}
                {msg.retry && (
                  <button
                    id="retry-analysis-btn"
                    className="aim__btn aim__btn--p aim__retry"
                    onClick={() => analyze(msg.retry === 'resend' && msg.retryText ? { sender: 'Agency', text: msg.retryText } : { retry: true })}
                    disabled={loading}
                  >
                    Thử lại
                  </button>
                )}

                {/* Clarification questions follow-up list */}
                {msg.clarificationQuestions && msg.clarificationQuestions.length > 0 && (
                  <div id="clarification-box" className="aim__clar">
                    <strong>Cần làm rõ thêm:</strong>
                    <ul>{msg.clarificationQuestions.map((q, idx) => <li key={idx}>{q}</li>)}</ul>
                  </div>
                )}

                {/* Recommendation cards: the card of screen 02 (mockup 22) */}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div id="recommendations-container" className="aim__cards">
                    {[...msg.recommendations, ...(msg.additionalSuggestions ?? [])].map((rec, index) => (
                      <React.Fragment key={rec.experience_id}>
                      {index === msg.recommendations!.length && <h4 className="aim__more">Gợi ý thêm</h4>}
                      <article className="v3-card v3r aim__card">
                        {rec.card && <Link href={cardOf(rec).href} className="v3r__media" tabIndex={-1} aria-hidden="true"><CoverImage image={rec.card.image} alt="" sizes={RESULT_SIZES} priority="lazy" /></Link>}
                        <div className="v3r__main">
                          <div className="v3r__top">
                            <div className="v3r__titles">
                              <h3 className="v3r__name"><Link href={cardOf(rec).href}>{cardOf(rec).name}</Link></h3>
                              <p className="v3r__where">
                                {rec.card
                                  ? <Link href={`/village/${rec.card.villageId}`} className="v3r__village">{rec.card.villageLine}</Link>
                                  : cardOf(rec).where}
                                {cardOf(rec).providerName && <><span className="v3r__dot"> · </span><span>{cardOf(rec).providerName}</span></>}
                              </p>
                            </div>
                            {rec.card?.craft && <span className="v3r__craft">{rec.card.craft}</span>}
                          </div>
                          {(rec.card?.tags ?? cardOf(rec).tags).length > 0 && <div className="v3-ftags">{(rec.card?.tags ?? cardOf(rec).tags).map((tag: string) => <span key={tag} className="v3-ftag">{tag.startsWith('Tối đa') ? <Users aria-hidden="true" /> : tag === 'Mang sản phẩm về' ? <Package aria-hidden="true" /> : <Clock aria-hidden="true" />}{tag}</span>)}</div>}
                          {cardOf(rec).why && <p className="aim__why"><Sparkles aria-hidden="true" /><span><b>Vì sao hợp:</b> {cardOf(rec).why}</span></p>}
                          <div className="v3r__cols">
                            <div className="v3r__left">
                              {rec.card && rec.card.highlights.length > 0 && <ul className="v3-ben" aria-label="Điểm nổi bật">{rec.card.highlights.map((text: string) => <li key={text}><Check aria-hidden="true" /><span>{text}</span></li>)}</ul>}
                            </div>
                            <div className="v3r__price">
                              {rec.card?.price.kind === 'group' ? <>
                                <p className="v3r__guests">{rec.card.price.guests} khách</p>
                                <b className="v3r__total">{vnd(rec.card.price.total)}</b>
                                {perGuest(rec.card.price) !== null && <span className="v3-cap v3r__perguest">{vnd(perGuest(rec.card.price)!)}/khách</span>}
                                {rec.card.price.old !== null && <span className="v3r__old">{vnd(rec.card.price.old)}</span>}
                                {rec.card.price.note && <span className={rec.card.price.old !== null ? 'v3r__disc' : 'v3r__nodisc'}>{rec.card.price.note}</span>}
                              </> : cardOf(rec).pricePerPerson && <><span className="v3-cap">Giá từ</span><b className="v3r__total">{cardOf(rec).pricePerPerson}<span className="v3-cap"> /khách</span></b></>}
                              {rec.card?.included && <p className="v3-cap v3r__incl">Đã gồm vật liệu và người hướng dẫn</p>}
                              <div className="aim__acts">
                                <button
                                  id={`chat-btn-${rec.provider_id}`}
                                  className="aim__btn aim__btn--s aim__btn--icon"
                                  aria-label="Nhắn tin cho xưởng"
                                  title="Nhắn tin cho xưởng"
                                  onClick={() => handleChat(rec.experience_id, rec.provider_id)}
                                >
                                  <MessageSquare aria-hidden="true" />
                                </button>
                                <Link className="aim__btn aim__btn--p" href={cardOf(rec).scheduleHref}>Xem lịch trống <ChevronRight aria-hidden="true" /></Link>
                              </div>
                            </div>
                          </div>

                          {chatStatus[rec.provider_id] && (
                            <div className="aim__status">
                              {chatStatus[rec.provider_id] === HANDOFF_FAILURE_TEXT ? (
                                <>{HANDOFF_FAILURE_TEXT}{' '}<button className="handoff-retry-btn" onClick={() => handleChat(rec.experience_id, rec.provider_id)}>Thử lại</button></>
                              ) : chatStatus[rec.provider_id]}
                            </div>
                          )}
                        </div>
                      </article>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="aim__loading"><span className="aim__dot" />AI đang phân tích yêu cầu và đối chiếu các trải nghiệm đã xác minh…</div>
          )}

          <div ref={messagesEndRef} />
        </section>

        <div className="aim__col aim__dock">
          <form
            className="aim__comp"
            method="post"
            onSubmit={e => {
              e.preventDefault()
              handleSendMessage()
            }}
          >
            <textarea
              id="matching-prompt-input"
              value={inputText}
              maxLength={2000}
              rows={1}
              ref={chatInputRef}
              aria-label="Tin nhắn cho Ghép tour AI"
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
              placeholder="Hỏi thêm hoặc sửa yêu cầu…"
            />
            <button id="send-message-btn" type="submit" className="aim__send" aria-label="Gửi" disabled={!inputText.trim() || loading}><ArrowUp aria-hidden="true" /></button>
          </form>
          <p className="aim__note">AI có thể gợi ý chưa đúng. Kiểm tra lịch và giá ở trang trải nghiệm trước khi gửi yêu cầu.</p>
        </div>
        </>)}
      </div>
    </div>
  )
}
