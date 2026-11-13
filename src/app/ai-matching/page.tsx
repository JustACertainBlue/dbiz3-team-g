'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { readSessionContext } from '@/lib/auth/client-session'
import { AI_FAILURE_TEXT, HANDOFF_FAILURE_TEXT, handoffOutcome, matchResultsView, messageOutcome, noMatchView, understoodDateLine, type ApiResult } from './matching-view'
import { RESTRICTED_TEXT } from './ai-matching-access'
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
  followUpQuestions?: string[] // hiển thị sau kết quả matching
  usedLlm?: boolean
  modelUsed?: string
}

/** Trả về chuỗi hh:mm:ss dd/mm/yyyy cố định tại thời điểm snapshot (không phải đồng hồ động) */
function nowVN(date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${hh}:${mm}:${ss} ${dd}/${mo}/${yyyy}`
}

/** Chuyển đổi chuỗi prompt tiếng Anh sang thông điệp tiếng Việt thân thiện */
function localizeRelaxationPrompt(prompt: string): string {
  if (!prompt) return 'Chưa tìm được xưởng nghề đáp ứng toàn bộ tiêu chí trên 60/100 điểm.'
  
  // No Experience can take a group of X pax: the largest group an eligible Experience accepts is Y pax. You can split the group or reduce the number of guests.
  const groupMatch = prompt.match(/No Experience can take a group of (\d+) pax: the largest group an eligible Experience accepts is (\d+) pax\./i)
  if (groupMatch) {
    return `Hiện chưa có xưởng nghề nào có sức chứa nhận đoàn ${groupMatch[1]} khách cùng lúc (sức chứa tối đa hiện tại là ${groupMatch[2]} khách). Bạn có thể cân nhắc chia thành 2 nhóm nhỏ hoặc điều chỉnh số lượng khách.`
  }

  // No Experience fits a budget of X VND per person. The lowest price that meets your other requirements is Y VND per person.
  const budgetMatch = prompt.match(/No Experience fits a budget of ([\d,.]+) VND per person\. The lowest price that meets your other requirements is ([\d,.]+) VND per person\./i)
  if (budgetMatch) {
    return `Mức ngân sách ${budgetMatch[1]} đ/khách chưa đủ để tham gia các trải nghiệm phù hợp. Mức chi phí tối thiểu để đáp ứng yêu cầu của bạn là ${budgetMatch[2]} đ/khách.`
  }

  if (prompt.includes('No experiences currently meet all criteria')) {
    return 'Chưa tìm được trải nghiệm nào đáp ứng toàn diện tiêu chí trên 60/100 điểm. Bạn có thể mở rộng ngân sách, khoảng cách di chuyển hoặc điều chỉnh số lượng khách để nhận thêm gợi ý.'
  }

  return prompt
}

/** Dịch các dòng gợi ý nới lỏng sang tiếng Việt */
function localizeRelaxationLine(line: string): string {
  if (line.startsWith('Distance:')) {
    return line.replace(/^Distance:\s*/i, '📍 Khoảng cách: ').replace(/Expand radius by 15km to include outer craft villages/i, 'Mở rộng bán kính thêm 15 km để kết nối các làng nghề ngoại thành')
  }
  if (line.startsWith('Dates:')) {
    return line.replace(/^Dates:\s*/i, '📅 Thời gian: ').replace(/Consider flexible dates \(\+\/- 2 days\)/i, 'Cân nhắc ngày linh hoạt (+/- 2 ngày)')
  }
  if (line.startsWith('Budget:')) {
    return line.replace(/^Budget:\s*/i, '💰 Ngân sách: ').replace(/per person/i, '/ khách')
  }
  return line
}

/** Render văn bản Markdown (định dạng in đậm) */
function renderInlineText(text: string): React.ReactNode {
  if (!text || !text.includes('**')) return text
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#0F172A', fontWeight: 650 }}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

/** Render nội dung tin nhắn Markdown chuyên nghiệp (bảng, danh sách, in đậm) */
function renderFormattedContent(text: string): React.ReactNode {
  if (!text) return null

  // 1. Nếu có bảng Markdown (| Cột 1 | Cột 2 | ...)
  if (text.includes('|') && text.includes('---')) {
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let tableLines: string[] = []
    let inTable = false

    const flushTable = (keyIdx: number) => {
      if (tableLines.length >= 2) {
        const headerCells = tableLines[0].split('|').map(c => c.trim()).filter(Boolean)
        const rowLines = tableLines.slice(2)
        elements.push(
          <div key={`table-${keyIdx}`} className="ait-table-wrap">
            <table className="ait-markdown-table">
              <thead>
                <tr>
                  {headerCells.map((h, i) => <th key={i}>{renderInlineText(h)}</th>)}
                </tr>
              </thead>
              <tbody>
                {rowLines.map((row, rIdx) => {
                  const cells = row.split('|').map(c => c.trim()).filter(Boolean)
                  if (cells.length === 0) return null
                  return (
                    <tr key={rIdx}>
                      {cells.map((c, cIdx) => <td key={cIdx}>{renderInlineText(c)}</td>)}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      }
      tableLines = []
      inTable = false
    }

    lines.forEach((line, idx) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true
        tableLines.push(trimmed)
      } else {
        if (inTable) flushTable(idx)
        if (trimmed) {
          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            elements.push(
              <div key={`b-${idx}`} className="ait-bullet-line">
                <span className="ait-bullet-dot">•</span>
                <span>{renderInlineText(trimmed.slice(2))}</span>
              </div>
            )
          } else {
            elements.push(
              <p key={`p-${idx}`} className="ait-msg-paragraph">
                {renderInlineText(trimmed)}
              </p>
            )
          }
        }
      }
    })
    if (inTable) flushTable(lines.length)

    return <div className="ait-formatted-body">{elements}</div>
  }

  // 2. Nội dung text thông thường với danh sách và in đậm
  const paragraphs = text.split('\n\n')
  return (
    <div className="ait-formatted-body">
      {paragraphs.map((p, pIdx) => {
        const lines = p.split('\n')
        return (
          <div key={pIdx} className="ait-msg-paragraph">
            {lines.map((l, lIdx) => {
              const trimmed = l.trim()
              if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                return (
                  <div key={lIdx} className="ait-bullet-line">
                    <span className="ait-bullet-dot">•</span>
                    <span>{renderInlineText(trimmed.slice(2))}</span>
                  </div>
                )
              }
              const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/)
              if (numMatch) {
                return (
                  <div key={lIdx} className="ait-bullet-line">
                    <span className="ait-bullet-num">{numMatch[1]}.</span>
                    <span>{renderInlineText(numMatch[2])}</span>
                  </div>
                )
              }
              return (
                <div key={lIdx} style={{ marginBottom: lIdx < lines.length - 1 ? '4px' : '0' }}>
                  {renderInlineText(l)}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

export default function AiMatchingScreen() {
  const router = useRouter()
  const [role, setRole] = useState<'Agency' | 'Guest'>('Guest')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [agencyId, setAgencyId] = useState<string>('')
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingDots, setLoadingDots] = useState('')
  const [quoteStatus, setQuoteStatus] = useState<Record<string, string>>({})
  const [chatStatus, setChatStatus] = useState<Record<string, string>>({})
  const [quotaInfo, setQuotaInfo] = useState<{ in_cooldown: boolean; remaining_seconds?: number } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sessionInitializationRef = useRef(false)

  // Animated loading dots để user biết hệ thống đang hoạt động
  useEffect(() => {
    if (!loading) { setLoadingDots(''); return }
    const frames = ['', '.', '..', '...']
    let i = 0
    const id = setInterval(() => { i = (i + 1) % frames.length; setLoadingDots(frames[i]) }, 500)
    return () => clearInterval(id)
  }, [loading])

  useEffect(() => {
    fetch('/api/ait/quota')
      .then(res => res.json())
      .then(data => { if (data.in_cooldown) setQuotaInfo(data) })
      .catch(() => {})
  }, [])

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
      initializeSession()
    }
  }, [role, agencyId])

  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (lastMsg && lastMsg.sender === 'Assistant' && lastMsg.recommendations && lastMsg.recommendations.length > 0) {
      // UX Fix: Khi có kết quả matching, cuộn đến đầu tin nhắn AI để hiện ngay Đề xuất #1, không bị trôi xuống đáy
      const timer = setTimeout(() => {
        const el = document.getElementById(lastMsg.id)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 50)
      return () => clearTimeout(timer)
    }
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
        setMessages([
          {
            id: 'welcome',
            sender: 'Assistant',
            text: 'Xin chào! Tôi là trợ lý ghép tour AI của Hanoi Artisan Bridge.\n\nHãy mô tả yêu cầu đoàn — số khách, ngày khởi hành, loại trải nghiệm thủ công, ngân sách — tôi sẽ ngay lập tức phân tích và đề xuất các xưởng nghề được xác minh phù hợp nhất.',
            sent_at: nowVN(),
          },
        ])
      }
    } catch {
      setSessionId(`session-local-${Date.now()}`)
    }
  }

  // Guest Access Guard (BR-001, BR-002)
  if (role === 'Guest') {
    return (
      <div
        id="guest-access-denied"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          background: '#0F172A',
          color: '#F8FAFC',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '460px',
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '36px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', margin: '0 0 12px 0' }}>
            Chỉ dành cho Công ty Lữ hành
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            {RESTRICTED_TEXT}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <a
              id="switch-to-agency-btn"
              href="/login?next=/ai-matching"
              style={{
                backgroundColor: '#D97706',
                color: '#FFF',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              Đăng nhập với tư cách Lữ hành
            </a>
          </div>
        </div>
      </div>
    )
  }

  const addAssistant = (message: Omit<Message, 'id' | 'sender' | 'sent_at'>) =>
    setMessages(prev => [
      ...prev,
      { id: `assistant-${Date.now()}-${prev.length}`, sender: 'Assistant', sent_at: nowVN(), ...message },
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
  const analyze = async (body: Record<string, unknown>) => {
    if (!sessionId) return
    setLoading(true)
    try {
      const result = await postJson(`/api/ait/sessions/${sessionId}/messages`, body)
      const outcome = messageOutcome(result)
      // #156: show the date understood so the Agency can correct it.
      const dateLine = 'body' in result ? understoodDateLine(result.body) ?? undefined : undefined
      // conversational_reply is inside extraction (not top-level body)
      const conversationalReply = 'body' in result && result.body?.extraction?.conversational_reply
        ? String(result.body.extraction.conversational_reply)
        : undefined
      const usedLlm = Boolean('body' in result && result.body?.extraction?.usedLlm)
      if (outcome.kind === 'guidance') {
        addAssistant({ text: outcome.reply, usedLlm })
      } else if (outcome.kind === 'clarify') {
        addAssistant({
          text: conversationalReply || 'Vui lòng cung cấp thêm thông tin để tôi tìm xưởng nghề phù hợp nhất:',
          clarificationQuestions: outcome.questions,
          dateLine,
          usedLlm,
        })
      } else if (outcome.kind === 'match') {
        await fetchMatchingResults(outcome.profile, dateLine, conversationalReply, outcome.followUps, usedLlm)
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

    setMessages(prev => [...prev, { id: `msg-${Date.now()}`, sender: 'Agency', text: textToSend, sent_at: nowVN() }])
    if (!customPrompt) setInputText('')
    await analyze({ sender: 'Agency', text: textToSend })
  }

  /**
   * Calls the real matching pipeline via the server API. A failure shows the #27 message with Retry;
   * no offline or fabricated result is ever shown (FR-003, BR-017).
   */
  const fetchMatchingResults = async (profile: unknown, dateLine?: string, customIntro?: string, followUps?: string[], usedLlm?: boolean) => {
    const result = await postJson('/api/ait/matching', { session_id: sessionId, tour_preference_profile: profile })
    if ('networkError' in result || !result.ok) {
      addAssistant({ text: AI_FAILURE_TEXT, retry: 'reanalyze' })
      return
    }
    const { top: topMatches, additional } = matchResultsView(result.body)
    if (topMatches.length > 0) {
      addAssistant({
        text: customIntro || 'Tôi đã phân tích yêu cầu tour và đối soát với các xưởng nghề được xác minh. Đây là các đề xuất phù hợp nhất:',
        dateLine,
        recommendations: topMatches,
        additionalSuggestions: additional,
        followUpQuestions: followUps,
        usedLlm,
      })
    } else {
      // No candidate reaches the constraints or 60/100 → relaxation suggestions (BR-011, FR-012)
      const view = noMatchView(result.body)
      const relaxationAdvice = localizeRelaxationPrompt(view.prompt)
      // Ưu tiên phản hồi tự nhiên từ AI, ghép với lời khuyên nới lỏng tiêu chí nếu có
      const textToDisplay = customIntro
        ? `${customIntro}\n\n💡 Lưu ý điều phối: ${relaxationAdvice}`
        : relaxationAdvice
      addAssistant({ text: textToDisplay, relaxationLines: view.lines, dateLine, followUpQuestions: followUps, usedLlm })
    }
  }

  // Request Quote / Chat: open Messages (COM048) with the Chat selected only after success (#31).
  const runHandoff = async (kind: 'quote' | 'chat', experienceId: string, statusKey: string) => {
    if (!sessionId) return
    const setStatus = kind === 'quote' ? setQuoteStatus : setChatStatus
    setStatus(prev => ({ ...prev, [statusKey]: kind === 'quote' ? 'Đang kiểm tra suất trống…' : 'Đang mở chat…' }))
    const outcome = handoffOutcome(await postJson(`/api/ait/sessions/${sessionId}/${kind}`, { experience_id: experienceId }))
    if (outcome.kind === 'success') router.push(outcome.navigateTo)
    else setStatus(prev => ({ ...prev, [statusKey]: outcome.text }))
  }

  const handleRequestQuote = (experienceId: string) => runHandoff('quote', experienceId, experienceId)
  const handleChat = (experienceId: string, providerId: string) => runHandoff('chat', experienceId, providerId)

  return (
    <div className="ait-container">
      {/* SIDEBAR BÊN TRÁI: LỊCH SỬ YÊU CẦU TOUR (Ảnh 2) */}
      <aside className="ait-sidebar">
        <button
          type="button"
          className="ait-btn-new-tour"
          onClick={() => {
            setMessages([
              {
                id: `welcome-${Date.now()}`,
                sender: 'Assistant',
                text: 'Xin chào đội điều phối tour. Hãy mô tả đoàn dự kiến, sở thích văn hoá, ngân sách hoặc lịch trình. Tôi sẽ phân tích lịch trống của các xưởng bậc thầy đã xác minh, lộ trình di chuyển và hạn mức nghệ nhân chứng nhận theo thời gian thực.',
                sent_at: nowVN(),
              },
            ])
            setInputText('')
          }}
        >
          <span>+ Yêu cầu tour mới</span>
        </button>

        <div className="ait-search-wrap">
          <span className="ait-search-icon">🔍</span>
          <input
            type="text"
            className="ait-search-input"
            placeholder="Tìm lịch sử yêu cầu..."
          />
        </div>

        <div className="ait-sidebar-history">
          <div className="ait-history-group">
            <div className="ait-history-label">HÔM NAY</div>
            <div className="ait-history-list">
              <div className="ait-history-item active">
                <div className="ait-history-item-title">
                  <span>Đoàn Pháp 14 khách</span>
                  <span className="ait-status-dot" />
                </div>
                <div className="ait-history-item-sub">Gốm & lụa · 09:15 · #AIM-8409</div>
              </div>
              <div className="ait-history-item">
                <div className="ait-history-item-title">
                  <span>Eco-tour VIP Thụy Sĩ 8 khách</span>
                </div>
                <div className="ait-history-item-sub">Sơn mài & mây tự nhiên Hạ Thái · 08:10</div>
              </div>
            </div>
          </div>

          <div className="ait-history-group">
            <div className="ait-history-label">7 NGÀY TRƯỚC</div>
            <div className="ait-history-list">
              <div className="ait-history-item">
                <div className="ait-history-item-title">
                  <span>Đoàn học sinh 25 khách</span>
                </div>
                <div className="ait-history-item-sub">Lò gốm Bát Tràng · Nặn đất sét</div>
              </div>
              <div className="ait-history-item">
                <div className="ait-history-item-title">
                  <span>Hội kiến trúc Đức 18 khách</span>
                </div>
                <div className="ait-history-item-sub">Mộc truyền thống · Chàng Sơn</div>
              </div>
              <div className="ait-history-item">
                <div className="ait-history-item-title">
                  <span>Đầu bếp Michelin 6 khách</span>
                </div>
                <div className="ait-history-item-sub">Lụa Vạn Phúc & bún Cự Đà</div>
              </div>
            </div>
          </div>

          <div className="ait-history-group">
            <div className="ait-history-label">30 NGÀY TRƯỚC</div>
            <div className="ait-history-list">
              <div className="ait-history-item">
                <div className="ait-history-item-title">
                  <span>Triển lãm thiết kế Tokyo 4 khách</span>
                </div>
                <div className="ait-history-item-sub">Bạc chạm Định Công</div>
              </div>
              <div className="ait-history-item">
                <div className="ait-history-item-title">
                  <span>Hội đồng Anh 12 khách</span>
                </div>
                <div className="ait-history-item-sub">Mây tre đan Phú Vinh</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* KHUNG CHAT & ĐỀ XUẤT MATCHING BÊN PHẢI (FULL WIDTH) */}
      <section className="ait-main-chat">
        {/* HEADER KHUNG CHAT */}
        <header className="ait-chat-header">
          <div>
            <div className="ait-header-title-row">
              <h1 className="ait-header-h1">AI Tour Matching</h1>
              <span className="ait-badge-pill ait-badge-session">Phiên AIM-8409</span>
              <span className="ait-badge-pill ait-badge-tool">Phân tích ý định nghề v4.2</span>
              {quotaInfo?.in_cooldown && (
                <span className="ait-badge-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>
                  🛡️ Bảo vệ hạn ngạch (Rule-based)
                </span>
              )}
            </div>
            <p className="ait-header-sub">
              Ghép bằng ngôn ngữ tự nhiên đang bật · Hạn mức xưởng chứng nhận đã đồng bộ
            </p>
          </div>
        </header>

        {/* VÙNG DANH SÁCH TIN NHẮN */}
        <main className="ait-messages-stream">
          {messages.map(msg => (
            <div
              key={msg.id}
              id={msg.id}
              className={msg.sender === 'Agency' ? 'ait-msg-agency' : 'ait-msg-assistant'}
            >
              {msg.sender === 'Assistant' ? (
                <>
                  <div className="ait-assistant-header">
                    <span className="ait-assistant-avatar">AI</span>
                    <span className="ait-assistant-name">TRỢ LÝ HANOI ARTISAN · {msg.sent_at}</span>
                    {msg.usedLlm && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          backgroundColor: '#DCFCE7',
                          color: '#15803D',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid #86EFAC',
                        }}
                      >
                        ⚡ Cloudflare Workers AI
                      </span>
                    )}
                  </div>
                  <div className="ait-assistant-bubble">
                    {renderFormattedContent(msg.text)}

                    {/* #156: Ngày được trợ lý nhận diện */}
                    {msg.dateLine && (
                      <div id="understood-date" style={{ marginTop: '8px', fontSize: '13px', color: '#166534', fontWeight: 600 }}>
                        {msg.dateLine.replace(/^Tour date understood: ([^.]+)\. If this is wrong, send the correct date with the year\./i, '📅 Ngày tour được ghi nhận: $1. Nếu sai, bạn có thể gửi lại ngày kèm năm để điều chỉnh.')}
                      </div>
                    )}

                    {/* Gợi ý nới lỏng tiêu chí khi no-match */}
                    {msg.relaxationLines && msg.relaxationLines.length > 0 && (
                      <ul id="relaxation-suggestions" style={{ margin: '10px 0 0 0', paddingLeft: '18px', fontSize: '13px', color: '#B45309' }}>
                        {msg.relaxationLines.map(line => <li key={line}>{localizeRelaxationLine(line)}</li>)}
                      </ul>
                    )}

                    {/* Nút Retry khi AI tạm gián đoạn */}
                    {msg.retry && (
                      <button
                        id="retry-analysis-btn"
                        onClick={() => analyze(msg.retry === 'resend' && msg.retryText ? { sender: 'Agency', text: msg.retryText } : { retry: true })}
                        disabled={loading}
                        className="ait-btn-primary"
                        style={{ marginTop: '10px' }}
                      >
                        Thử lại
                      </button>
                    )}

                    {/* Hộp câu hỏi làm rõ (khi chưa có kết quả) */}
                    {msg.clarificationQuestions && msg.clarificationQuestions.length > 0 && (
                      <div
                        id="clarification-box"
                        style={{
                          marginTop: '12px',
                          padding: '12px 14px',
                          backgroundColor: '#FFFBEB',
                          borderLeft: '3px solid #D97706',
                          borderRadius: '6px',
                        }}
                      >
                        <strong style={{ color: '#92400E', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                          Vui lòng bổ sung để tôi tìm chính xác hơn:
                        </strong>
                        <ul style={{ margin: 0, paddingLeft: '18px', color: '#78350F', fontSize: '13px' }}>
                          {msg.clarificationQuestions.map((q, idx) => (
                            <li key={idx} style={{ marginBottom: '4px' }}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* DANH SÁCH THẺ ĐỀ XUẤT */}
                    {msg.recommendations && msg.recommendations.length > 0 && (
                      <div id="recommendations-container" style={{ marginTop: '16px' }}>
                        {[...msg.recommendations, ...(msg.additionalSuggestions ?? [])].map((rec, index) => (
                          <React.Fragment key={rec.experience_id}>
                            {index === msg.recommendations!.length && (
                              <h4 style={{ margin: '16px 0 8px', fontSize: '14px', color: '#4B5563', fontWeight: 700 }}>
                                Gợi ý thêm
                              </h4>
                            )}
                            <div className="rec-card">
                              <div className="rec-card-header">
                                <div className="rec-card-badges">
                                  <span className="rec-badge-score">{rec.match_score}% PHÙ HỢP</span>
                                  <span className="rec-badge-tag">{index === 0 ? 'ĐỀ XUẤT TỐT NHẤT' : 'GẮN VỚI VĂN HOÁ CAO'}</span>
                                </div>
                                <div className="rec-card-price">
                                  <div className="rec-price-label">GIÁ B2B</div>
                                  <div className="rec-price-value">
                                    {rec.price_per_person?.toLocaleString('vi-VN')} đ <span style={{ fontSize: '12px', fontWeight: 400, color: '#6B7280' }}>/ khách</span>
                                  </div>
                                </div>
                              </div>

                              <h3 className="rec-card-title">{rec.experience_name}</h3>
                              <p className="rec-card-location">
                                📍 Làng {rec.village_name} · {rec.distance_km ? `${rec.distance_km} km` : '13,2 km'} (khoảng 28 phút di chuyển)
                              </p>

                              <div className="rec-card-body">
                                <div className="rec-card-reason-wrap">
                                  <div className="rec-card-reason-title">LÝ DO PHÙ HỢP</div>
                                  <p className="rec-card-reason-text">
                                    {rec.explanation}
                                  </p>
                                </div>
                                <div className="rec-card-thumb">
                                  <span style={{ fontSize: '20px', marginBottom: '4px' }}>🏛️</span>
                                  <span>{rec.village_name}</span>
                                  <span style={{ fontSize: '10px', opacity: 0.8 }}>Không gian xưởng</span>
                                </div>
                              </div>

                              <div className="rec-card-actions">
                                {/* 1. Nút chính: Xin báo giá */}
                                <button
                                  type="button"
                                  id={`quote-btn-${rec.experience_id}`}
                                  className="ait-action-btn ait-action-btn-primary"
                                  onClick={() => handleRequestQuote(rec.experience_id)}
                                  title="Gửi yêu cầu báo giá chính thức cho xưởng"
                                >
                                  <svg className="ait-btn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                  </svg>
                                  Xin báo giá ngay
                                </button>

                                {/* 2. Xem chi tiết xưởng & trải nghiệm */}
                                <Link
                                  href={`/explore/experiences/${rec.experience_id}`}
                                  className="ait-action-btn ait-action-btn-secondary"
                                  title="Xem hình ảnh thực tế, nội dung và đánh giá xưởng"
                                >
                                  <svg className="ait-btn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                  </svg>
                                  Chi tiết xưởng
                                </Link>

                                {/* 3. Xem chi tiết làng nghề */}
                                <Link
                                  href={`/explore?village=${encodeURIComponent(rec.village_name)}`}
                                  className="ait-action-btn ait-action-btn-secondary"
                                  title={`Khám phá toàn bộ xưởng và hoạt động tại Làng ${rec.village_name}`}
                                >
                                  <svg className="ait-btn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="10" r="3"></circle>
                                    <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"></path>
                                  </svg>
                                  Làng {rec.village_name}
                                </Link>

                                {/* 4. Xem lịch trống xưởng (public schedule view) */}
                                <Link
                                  href={`/provider/${rec.provider_id}#schedule`}
                                  className="ait-action-btn ait-action-btn-secondary"
                                  title="Xem các khung giờ còn trống và lịch nghệ nhân"
                                >
                                  <svg className="ait-btn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                  </svg>
                                  Lịch trống xưởng
                                </Link>

                                {/* 5. Chat với xưởng */}
                                <button
                                  type="button"
                                  id={`chat-btn-${rec.provider_id}`}
                                  className="ait-action-btn ait-action-btn-secondary"
                                  onClick={() => handleChat(rec.experience_id, rec.provider_id)}
                                  title="Nhắn tin trực tiếp với nghệ nhân xưởng"
                                >
                                  <svg className="ait-btn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                  </svg>
                                  Chat với xưởng
                                </button>
                              </div>

                              {quoteStatus[rec.experience_id] && (
                                <div style={{ marginTop: '10px', fontSize: '12.5px', color: '#065F46', backgroundColor: '#ECFDF5', padding: '6px 12px', borderRadius: '6px' }}>
                                  {quoteStatus[rec.experience_id] === HANDOFF_FAILURE_TEXT ? (
                                    <>
                                      {HANDOFF_FAILURE_TEXT}{' '}
                                      <button className="handoff-retry-btn" onClick={() => handleRequestQuote(rec.experience_id)}>Thử lại</button>
                                    </>
                                  ) : quoteStatus[rec.experience_id]}
                                </div>
                              )}

                              {chatStatus[rec.provider_id] && (
                                <div style={{ marginTop: '8px', fontSize: '12.5px', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '6px 12px', borderRadius: '6px' }}>
                                  {chatStatus[rec.provider_id] === HANDOFF_FAILURE_TEXT ? (
                                    <>
                                      {HANDOFF_FAILURE_TEXT}{' '}
                                      <button className="handoff-retry-btn" onClick={() => handleChat(rec.experience_id, rec.provider_id)}>Thử lại</button>
                                    </>
                                  ) : chatStatus[rec.provider_id]}
                                </div>
                              )}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    )}

                    {/* Câu hỏi bổ sung hiển thị BÊN DƯỚI kết quả matching */}
                    {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                      <div
                        style={{
                          marginTop: '16px',
                          padding: '12px 14px',
                          backgroundColor: '#F0FDF4',
                          borderLeft: '3px solid #17382B',
                          borderRadius: '6px',
                        }}
                      >
                        <strong style={{ color: '#065F46', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                          💬 Để tinh chỉnh kết quả, bạn có thể bổ sung thêm:
                        </strong>
                        <ul style={{ margin: 0, paddingLeft: '18px', color: '#14532D', fontSize: '13px' }}>
                          {msg.followUpQuestions.map((q, idx) => (
                            <li key={idx} style={{ marginBottom: '4px' }}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="ait-agency-header">
                    {msg.sent_at} · CÔNG TY LỮ HÀNH (ĐIỀU PHỐI)
                  </div>
                  <div className="ait-agency-bubble">
                    {msg.text}
                  </div>
                </>
              )}
            </div>
          ))}

          {loading && (
            <div className="ait-loading-indicator">
              <div className="ait-loading-spinner" />
              <span>Trợ lý AI đang phân tích và đối soát xưởng nghề{loadingDots}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* THAO TÁC NHANH (QUICK CHIPS) */}
        <div className="ait-quick-prompts-bar">
          <span className="ait-quick-label">Thao tác nhanh:</span>
          <button
            type="button"
            className="ait-quick-chip"
            onClick={() =>
              handleSendMessage(
                'Chúng tôi có đoàn văn hoá cao cấp từ Pháp (14 khách gồm 2 trưởng đoàn) tới Hà Nội vào Thứ Năm tuần sau. Họ muốn một buổi sáng thực hành thủ công đích thực cùng nghệ nhân chứng nhận, sau đó là nghi thức trà truyền thống. Ưu tiên gốm hoặc dệt lụa, tổng thời gian di chuyển dưới 45 phút từ phố cổ. Ngân sách khoảng 350.000 – 500.000 đ/khách.'
              )
            }
          >
            Đoàn Pháp 14 khách (Gốm / Lụa)
          </button>
          <button
            type="button"
            className="ait-quick-chip"
            onClick={() => handleSendMessage('Chúng tôi cần tìm xưởng lụa truyền thống tại làng Vạn Phúc')}
          >
            Lụa Vạn Phúc (Làm rõ)
          </button>
          <button
            type="button"
            className="ait-quick-chip"
            onClick={() =>
              handleSendMessage('Đoàn 100 khách muốn tham gia tour làng nghề ngày 25/12 với ngân sách 20.000 đ/khách')
            }
          >
            Ngân sách hẹp (Gợi ý nới lỏng)
          </button>
        </div>

        {/* KHUNG NHẬP LIỆU FOOTER */}
        <footer className="ait-input-footer">
          <form
            onSubmit={e => {
              e.preventDefault()
              handleSendMessage()
            }}
          >
            <div className="ait-input-box">
              <input
                id="matching-prompt-input"
                type="text"
                value={inputText}
                maxLength={2000}
                onChange={e => setInputText(e.target.value)}
                placeholder="Thêm yêu cầu về ăn uống, đi lại hoặc VIP (ví dụ: hướng dẫn viên tiếng Pháp, lối đi xe lăn, không gluten)..."
                className="ait-prompt-input"
              />
              <button
                id="send-message-btn"
                type="submit"
                disabled={!inputText.trim() || loading}
                className="ait-btn-send"
              >
                Gửi
              </button>
            </div>
          </form>
          <div className="ait-footer-hints">
            <span>Trợ lý AI đồng bộ với hạn mức Liên đoàn làng nghề Hà Nội</span>
            <span>Phiên #AIM-8409 · {inputText.length} / 2.000 ký tự</span>
          </div>
        </footer>
      </section>
    </div>
  )
}
