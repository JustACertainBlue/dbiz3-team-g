'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AI_FAILURE_TEXT, HANDOFF_FAILURE_TEXT, handoffOutcome, matchResultsView, messageOutcome, noMatchView, understoodChips, understoodDateLine, type ApiResult } from './matching-view'
import { RESTRICTED_TEXT } from './ai-matching-access'
import { historyDate, historyTitle } from './history-view'
import { loadTurns, saveTurns, type StorageLike } from './turn-store'
import { conciseExplanation, perGuest, recommendationCardView } from './card-view'
import { additionalSuggestionPrompt } from './suggestion-prompt'
import { useAgencySession } from './agency-name'
import { ArrowUp, Check, ChevronDown, ChevronRight, MessageSquare, Plus, Sparkles } from 'lucide-react'
import CoverImage from '../explore/v3/CoverImage'
import { RESULT_SIZES } from '../explore/v3/image-sizes'
import { vnd } from '../explore/v3/ExperienceCard'
import '../explore/v3/explore-v3.css'
import './ai-matching.css'
import { useHydrated } from '../auth-v3/useHydrated'

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
  recomputed?: boolean // answer rebuilt by re-running the analysis (no memory of the original on this browser)
  retry?: 'reanalyze' | 'resend'
  retryText?: string
}

const browserStorage = (): StorageLike | null => { try { return window.localStorage } catch { return null } }

export default function AiMatchingScreen() {
  const hydrated = useHydrated()
  // Name, role and Agency id come from the server layout: nothing to wait for, no flash of the restricted screen.
  const { name: agencyName, role, agencyId } = useAgencySession()
  const router = useRouter()
  const wanted = useSearchParams().get('session')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  // UI v3 (human decision 2026-11-18 #2): Explore / detail pages open this page with ?prompt=…; the text is filled in
  // the input and never sent automatically.
  useEffect(() => {
    const prompt = new URLSearchParams(window.location.search).get('prompt')
    if (prompt) setInputText(prompt.slice(0, 2000))
  }, [])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [chips, setChips] = useState<string[]>([])
  const [history, setHistory] = useState<{ session_id: string; title: string; last_activity_at: string }[]>([])
  const [chatStatus, setChatStatus] = useState<Record<string, string>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const epochRef = useRef(0) // bumps when another conversation is opened: late answers of the old one are dropped
  const shownRef = useRef<string | null | undefined>(undefined) // session id of the URL the screen shows (null = new)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  // First visit and browser back/forward: the URL (?session=<id>) decides which conversation shows. A click on the rail
  // changes the state itself and the URL with router.push, so this effect finds nothing to do.
  useEffect(() => {
    if (role !== 'Agency' || wanted === shownRef.current) return
    if (shownRef.current === undefined) { shownRef.current = wanted; loadHistory(); if (wanted) resumeSession(wanted) }
    else if (wanted) openSession(wanted, false)
    else startNew(false)
  }, [role, wanted])

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

  // A matching session is created when the first message is sent (not when the page or a new conversation opens).
  const initializeSession = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/ait/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) return null
      const data = await res.json()
      const id = (data.matching_session_id || data.session_id) as string
      setSessionId(id)
      shownRef.current = id
      router.replace(`/ai-matching?session=${id}`, { scroll: false })
      return id
    } catch {
      return null
    }
  }

  const resetConversation = () => {
    epochRef.current += 1
    setMessages([]); setChips([]); setSessionId(null); setChatStatus({}); setInputText('')
    setLoading(false); setReloading(false)
  }
  const openSession = (id: string, push = true) => {
    resetConversation()
    shownRef.current = id
    if (push) router.push(`/ai-matching?session=${id}`, { scroll: false })
    resumeSession(id)
  }
  const startNew = (push = true) => {
    resetConversation()
    shownRef.current = null
    if (push) router.push('/ai-matching', { scroll: false })
  }

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/ait/sessions')
      if (res.ok) setHistory(((await res.json()) as { sessions?: typeof history }).sessions ?? [])
    } catch {
      // The rail stays empty; the screen keeps working.
    }
  }

  // Reopen an earlier conversation. With the memory of this browser every turn shows at once and nothing is analyzed
  // again. Without it (another machine) the stored Agency messages are re-analyzed with retry (adds no message).
  const resumeSession = async (id: string) => {
    const remembered = loadTurns(browserStorage(), agencyId, id)
    if (remembered) {
      setSessionId(id)
      setMessages(remembered.messages as unknown as Message[])
      setChips(remembered.chips)
    }
    try {
      const res = await fetch(`/api/ait/sessions/${id}`)
      if (!res.ok) { startNew(); return }
      if (remembered) return
      const data = await res.json() as { session_id: string; messages: { message_id: string; sender: string; text: string; sent_at: string }[] }
      setSessionId(data.session_id)
      const stored = data.messages.filter(m => m.sender === 'Agency')
      setMessages(stored.map(m => ({ id: m.message_id, sender: 'Agency' as const, text: m.text, sent_at: new Date(m.sent_at).toLocaleTimeString() })))
      if (stored.length === 0) return
      setReloading(true)
      try {
        await analyze({ retry: true }, data.session_id)
        setMessages(prev => {
          const last = prev[prev.length - 1]
          return last && last.sender === 'Assistant' && !last.retry ? [...prev.slice(0, -1), { ...last, recomputed: true }] : prev
        })
      } finally { setReloading(false) }
    } catch {
      if (!remembered) startNew()
    }
  }

  // Keep every answered turn (answer, chips, cards) in this browser, newest 20 sessions per agency.
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (!sessionId || !agencyId || loading || !last || last.sender !== 'Assistant' || last.retry) return
    saveTurns(browserStorage(), agencyId, sessionId, { messages: messages as never, chips })
  }, [messages, chips, loading, sessionId, agencyId])

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
  const analyze = async (body: Record<string, unknown>, idArg: string | null = null) => {
    const epoch = epochRef.current
    setLoading(true)
    try {
      const id = idArg ?? sessionId ?? await initializeSession()
      if (epoch !== epochRef.current) return
      if (!id) { addAssistant({ text: AI_FAILURE_TEXT, retry: 'resend', retryText: typeof body.text === 'string' ? body.text : undefined }); return }
      const result = await postJson(`/api/ait/sessions/${id}/messages`, body)
      if (epoch !== epochRef.current) return
      const outcome = messageOutcome(result)
      // #156: show the date understood so the Agency can correct it.
      if ('body' in result) { const found = understoodChips(result.body); if (found.length > 0) setChips(found) }
      const dateLine = 'body' in result ? understoodDateLine(result.body) ?? undefined : undefined
      if (outcome.kind === 'clarify') {
        addAssistant({ text: outcome.reply ?? 'Mình cần thêm một vài thông tin để tìm trải nghiệm hợp với đoàn của bạn:', clarificationQuestions: outcome.questions, dateLine })
      } else if (outcome.kind === 'match') {
        if (outcome.profiles) {
          for (const item of outcome.profiles) await fetchMatchingResults(item.profile, dateLine, id, item.label)
        } else {
          await fetchMatchingResults(outcome.profile, dateLine, id)
        }
      } else if (outcome.kind === 'answer') {
        addAssistant({ text: outcome.text })
      } else {
        addAssistant({ text: outcome.text, retry: outcome.retry, retryText: typeof body.text === 'string' ? body.text : undefined })
      }
    } finally {
      if (epoch === epochRef.current) setLoading(false)
    }
  }

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText
    if (!textToSend.trim() || loading) return

    setMessages(prev => [...prev, { id: `msg-${Date.now()}`, sender: 'Agency', text: textToSend, sent_at: new Date().toLocaleTimeString() }])
    if (!customPrompt) setInputText('')
    await analyze({ sender: 'Agency', text: textToSend })
    loadHistory()
  }

  /**
   * Calls the real matching pipeline via the server API. A failure shows the #27 message with Retry;
   * no offline or fabricated result is ever shown (FR-003, BR-017).
   */
  const fetchMatchingResults = async (profile: unknown, dateLine?: string, id: string | null = sessionId, craftLabel?: string) => {
    const epoch = epochRef.current
    const result = await postJson('/api/ait/matching', { session_id: id, tour_preference_profile: profile })
    if (epoch !== epochRef.current) return
    if ('networkError' in result || !result.ok) {
      addAssistant({ text: AI_FAILURE_TEXT, retry: 'reanalyze' })
      return
    }
    const { top: topMatches, additional } = matchResultsView(result.body)
    if (topMatches.length > 0) {
      addAssistant({
        text: craftLabel
          ? `Gợi ý riêng cho ${craftLabel}, đối chiếu với các xưởng đã xác minh:`
          : 'Mình đã đối chiếu yêu cầu của đoàn với các xưởng đã xác minh. Đây là các trải nghiệm gợi ý:',
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
        <a className="aim__new" href="/ai-matching" onClick={e => { e.preventDefault(); startNew() }}><Plus aria-hidden="true" />Cuộc ghép tour mới</a>
        {history.length > 0 && <>
          <p className="aim__shead">Gần đây <ChevronDown aria-hidden="true" /></p>
          <ul className="aim__hist">
            {history.map(item => (
              <li key={item.session_id}>
                <a href={`/ai-matching?session=${item.session_id}`} onClick={e => { e.preventDefault(); openSession(item.session_id) }} className={item.session_id === sessionId ? 'aim__cur' : undefined} aria-current={item.session_id === sessionId ? 'page' : undefined}>
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
              <button id="send-message-btn" type="submit" className="aim__send" aria-label="Gửi" disabled={!hydrated || !inputText.trim() || loading}><ArrowUp aria-hidden="true" /></button>
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
                {msg.recomputed && <p className="aim__cap">Gợi ý được tính lại theo giá và lịch hiện tại.</p>}
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

                {/* Result cards (v2 of PR #286): image, heading, facts, why, highlights, price, then Chat / schedule / quote */}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div id="recommendations-container" className="aim__cards">
                    {msg.recommendations.map((rec) => {
                      const view = cardOf(rec)
                      const tags = rec.card?.tags ?? view.tags
                      const metadata = tags.filter((tag: string) =>
                        /^(Tối đa|Đặt trước)\b/.test(tag) || /\d.*(phút|giờ)/i.test(tag)
                      )
                      const takeHome = tags.includes('Mang sản phẩm về')
                      const quoteStatus = chatStatus[rec.experience_id]
                      const providerStatus = chatStatus[rec.provider_id]
                      return (
                        <article key={rec.experience_id} className="v3-card aim__card">
                          {rec.card && (
                            <Link href={view.href} className="aim__card-media" tabIndex={-1} aria-hidden="true">
                              <CoverImage image={rec.card.image} alt="" sizes={RESULT_SIZES} priority="lazy" />
                            </Link>
                          )}
                          <div className="aim__card-main">
                            <header className="aim__card-heading">
                              <h3 className="aim__card-title v3r__name"><Link href={view.href}>{view.name}</Link></h3>
                              <p className="aim__card-location v3r__where">
                                {rec.card
                                  ? <Link href={`/village/${rec.card.villageId}`} className="v3r__village">{rec.card.villageLine}</Link>
                                  : view.where}
                                {view.providerName && <><span className="v3r__dot"> · </span><span>{view.providerName}</span></>}
                              </p>
                              {rec.card?.craft && <p className="aim__card-craft v3r__craft">{rec.card.craft}</p>}
                            </header>

                            {metadata.length > 0 && (
                              <ul className="aim__card-meta" aria-label="Thông tin trải nghiệm">
                                {metadata.map((tag: string) => <li key={tag}>{tag}</li>)}
                              </ul>
                            )}

                            {view.why && (
                              <p className="aim__why">
                                <b>Vì sao hợp:</b> {conciseExplanation(view.why)}
                              </p>
                            )}

                            {rec.card?.highlights?.length > 0 && (
                              <section className="aim__card-highlights" aria-label="Điểm nổi bật">
                                <h4>Điểm nổi bật</h4>
                                <ul className="v3-ben">
                                  {rec.card.highlights.map((text: string) => <li key={text}><Check aria-hidden="true" /><span>{text}</span></li>)}
                                </ul>
                              </section>
                            )}

                            {(rec.card?.price.kind === 'group' || view.pricePerPerson) && (
                              <section className="aim__card-price" aria-label="Giá trải nghiệm">
                                <div className="aim__price-primary">
                                  {rec.card?.price.kind === 'group' ? <>
                                    <span className="aim__price-total"><b className="v3r__total">{vnd(rec.card.price.total)}</b></span>
                                    {perGuest(rec.card.price) !== null && <span className="aim__price-perguest">{vnd(perGuest(rec.card.price)!)}/khách</span>}
                                    <span className="aim__price-guests">{rec.card.price.guests} khách</span>
                                  </> : <>
                                    <span className="aim__price-label">Giá từ</span>
                                    <b className="v3r__total">{view.pricePerPerson}<span className="aim__price-perguest">/khách</span></b>
                                  </>}
                                </div>
                                <div className="aim__price-details">
                                  {rec.card?.price.kind === 'group' && rec.card.price.old !== null && <span className="v3r__old">{vnd(rec.card.price.old)}</span>}
                                  {rec.card?.price.kind === 'group' && rec.card.price.note && <span className={rec.card.price.old !== null ? 'v3r__disc' : 'v3r__nodisc'}>{rec.card.price.note}</span>}
                                  {rec.card?.included && <span className="aim__included">Đã gồm vật liệu và người hướng dẫn</span>}
                                  {takeHome && <span className="aim__included">Mang sản phẩm về</span>}
                                </div>
                              </section>
                            )}

                            <footer className="aim__card-footer">
                              <button
                                id={`chat-btn-${rec.provider_id}`}
                                className="aim__btn aim__btn--s aim__card-action"
                                onClick={() => handleChat(rec.experience_id, rec.provider_id)}
                              >
                                <MessageSquare aria-hidden="true" /><span>Chat</span>
                              </button>
                              <Link className="aim__btn aim__btn--p aim__card-action" href={view.scheduleHref}>
                                Xem lịch trống <ChevronRight aria-hidden="true" />
                              </Link>
                              <button
                                className="aim__btn aim__btn--s aim__card-action"
                                onClick={() => handleRequestQuote(rec.experience_id)}
                              >
                                Xin báo giá
                              </button>
                            </footer>

                            {providerStatus && (
                              <div className="aim__status">
                                {providerStatus === HANDOFF_FAILURE_TEXT ? (
                                  <>{HANDOFF_FAILURE_TEXT}{' '}<button className="handoff-retry-btn" onClick={() => handleChat(rec.experience_id, rec.provider_id)}>Thử lại</button></>
                                ) : providerStatus}
                              </div>
                            )}
                            {quoteStatus && (
                              <div className="aim__status">
                                {quoteStatus === HANDOFF_FAILURE_TEXT ? (
                                  <>{HANDOFF_FAILURE_TEXT}{' '}<button className="handoff-retry-btn" onClick={() => handleRequestQuote(rec.experience_id)}>Thử lại</button></>
                                ) : quoteStatus}
                              </div>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
                {/* "Gợi ý thêm": choosing one sends a follow-up question through the composer path (additionalSuggestionPrompt) */}
                {msg.additionalSuggestions && msg.additionalSuggestions.length > 0 && (
                  <section className="aim__suggestions" aria-label="Gợi ý thêm">
                    <h4>Gợi ý thêm</h4>
                    <ul>
                      {msg.additionalSuggestions.map((rec) => (
                        <li key={rec.experience_id}>
                          <button
                            type="button"
                            className="aim__suggestion"
                            onClick={() => handleSendMessage(additionalSuggestionPrompt(rec))}
                            disabled={loading}
                          >
                            <span>{rec.experience_name || 'Trải nghiệm được gợi ý'}{rec.village_name ? ` · ${rec.village_name}` : ''}</span>
                            <ChevronRight aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="aim__loading"><span className="aim__dot" />{reloading ? 'Đang tải lại gợi ý…' : 'AI đang phân tích yêu cầu và đối chiếu các trải nghiệm đã xác minh…'}</div>
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
            <button id="send-message-btn" type="submit" className="aim__send" aria-label="Gửi" disabled={!hydrated || !inputText.trim() || loading}><ArrowUp aria-hidden="true" /></button>
          </form>
          <p className="aim__note">AI có thể gợi ý chưa đúng. Kiểm tra lịch và giá ở trang trải nghiệm trước khi gửi yêu cầu.</p>
        </div>
        </>)}
      </div>
    </div>
  )
}
