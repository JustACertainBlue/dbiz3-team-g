'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { readSessionContext } from '@/lib/auth/client-session'
import { AI_FAILURE_TEXT, HANDOFF_FAILURE_TEXT, handoffOutcome, localizeExplanation, matchResultsView, messageOutcome, noMatchView, understoodDateLine, type ApiResult } from './matching-view'
import { RESTRICTED_TEXT } from './ai-matching-access'
import './ai-matching.css'

interface ActivityCardData {
  experience_id: string
  provider_id: string
  provider_name: string
  village_id: string
  village_name: string
  name: string
  description: string
  category: string
  duration_minutes: number
  price_per_person: number
  max_participants: number
  image_url: string
  is_verified?: boolean
}

interface VillageCardData {
  village_id: string
  name: string
  craft: string
  district: string
  image_url: string
  description: string
}

interface ProviderActivity {
  experience_id: string
  name: string
  price?: number
  duration_minutes?: number
}

interface ProviderCardData {
  provider_id: string
  village_id: string
  village_name: string
  business_name: string
  artisan_name?: string
  craft_type: string
  location_address: string
  description: string
  activities: ProviderActivity[]
  image_url: string
  primary_experience_id: string
  is_verified?: boolean
}

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
  activityCards?: ActivityCardData[]
  villageCards?: VillageCardData[]
  providerCards?: ProviderCardData[]
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

/** Loại bỏ các đoạn debug kỹ thuật như "Extracted Context:" nếu LLM lỡ sinh ra trong phản hồi */
function stripExtractedContext(text: string): string {
  if (!text) return ''
  return text
    .replace(/(?:(?:\*{1,2})?(?:extracted\s+context|thông tin trích xuất)(?:\*{1,2})?:?[\s\S]*?(?=(?:\n\s*\n\s*[A-ZÀ-Ỹ0-9])|$))/gi, '')
    .replace(/^[\s•\-\*]*`?(?:craft_preference|origin|experience_types|group_size|target_date|budget_per_person)`?\s*:.*$/gim, '')
    .replace(/^[\s•\-\*]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Render nội dung tin nhắn Markdown chuyên nghiệp (bảng, danh sách, in đậm) */
function renderFormattedContent(rawText: string): React.ReactNode {
  if (!rawText) return null
  const text = stripExtractedContext(rawText)
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

interface StoredSession {
  sessionId: string
  title: string
  subTitle: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  lastPinnedMessageId?: string
}

export default function AiMatchingScreen() {
  const [role, setRole] = useState<'Agency' | 'Guest'>('Guest')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [agencyId, setAgencyId] = useState<string>('')
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [savedSessions, setSavedSessions] = useState<StoredSession[]>([])
  const [searchQuery, setSearchQuery] = useState('')
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

  // Load saved sessions on mount / agencyId ready
  useEffect(() => {
    if (agencyId) {
      try {
        const listKey = `hab_ait_sessions_list_${agencyId}`
        const rawList = localStorage.getItem(listKey)
        if (rawList) {
          const parsed: StoredSession[] = JSON.parse(rawList)
          // Xóa các chat rỗng: chỉ giữ lại session có ít nhất 1 tin nhắn từ Agency
          const valid = parsed.filter(s => s && s.messages && s.messages.some(m => m.sender === 'Agency'))
          setSavedSessions(valid)
          if (valid.length !== parsed.length) {
            localStorage.setItem(listKey, JSON.stringify(valid))
          }
        }
      } catch (e) {
        console.warn('Could not load saved sessions', e)
      }
    }
  }, [agencyId])

  // Sync current active session to savedSessions list when messages change
  useEffect(() => {
    if (!sessionId || !agencyId) return

    // Chỉ lưu vào danh sách lịch sử khi người dùng đã gửi ít nhất 1 tin nhắn (loại bỏ hoàn toàn chat rỗng)
    const hasAgencyMsg = messages.some(m => m.sender === 'Agency')
    if (!hasAgencyMsg) return

    try {
      const firstUserMsg = messages.find(m => m.sender === 'Agency')
      const rawText = firstUserMsg?.text || 'Yêu cầu tour'
      const title = rawText.length > 28 ? rawText.slice(0, 28) + '…' : rawText
      const lastMsg = messages[messages.length - 1]
      const now = new Date()
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

      const lower = rawText.toLowerCase()
      const craftTag = lower.includes('gốm') ? 'Gốm Bát Tràng'
        : lower.includes('lụa') ? 'Lụa Vạn Phúc'
        : lower.includes('mộc') ? 'Mộc Chàng Sơn'
        : lower.includes('mây') ? 'Mây tre Phú Vinh'
        : lower.includes('sơn mài') ? 'Sơn mài Hạ Thái'
        : lower.includes('đồng') ? 'Đồng Đại Bái'
        : lower.includes('nón') ? 'Nón Chuông'
        : 'Yêu cầu tour'

      const subTitle = `${craftTag} · ${timeStr} · #${sessionId.slice(0, 8)}`

      setSavedSessions(prev => {
        const existingIdx = prev.findIndex(s => s.sessionId === sessionId)
        const updatedSession: StoredSession = {
          sessionId,
          title: existingIdx >= 0 ? prev[existingIdx].title : title,
          subTitle,
          messages,
          createdAt: existingIdx >= 0 ? prev[existingIdx].createdAt : Date.now(),
          updatedAt: Date.now(),
          lastPinnedMessageId: lastMsg?.id,
        }

        let nextList: StoredSession[]
        if (existingIdx >= 0) {
          nextList = [...prev]
          nextList[existingIdx] = updatedSession
        } else {
          nextList = [updatedSession, ...prev]
        }

        nextList = nextList.filter(s => s.messages && s.messages.some(m => m.sender === 'Agency'))

        try {
          localStorage.setItem(`hab_ait_sessions_list_${agencyId}`, JSON.stringify(nextList))
          localStorage.setItem(`hab_ait_active_id_${agencyId}`, sessionId)
        } catch {}

        return nextList
      })
    } catch (e) {
      console.warn('Could not sync session', e)
    }
  }, [sessionId, messages, agencyId])

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
    if (lastMsg && lastMsg.sender === 'Assistant') {
      // UX Fix: Giữ màn ở ngay đầu câu trả lời của AI để tiện cho người dùng đọc
      const timer = setTimeout(() => {
        const el = document.getElementById(lastMsg.id)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
      return () => clearTimeout(timer)
    } else if (lastMsg && lastMsg.sender === 'Agency') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const initializeSession = async (forceNew = false) => {
    if (!forceNew) {
      try {
        const listKey = `hab_ait_sessions_list_${agencyId || 'default'}`
        const rawList = localStorage.getItem(listKey)
        if (rawList) {
          const parsed: StoredSession[] = JSON.parse(rawList)
          const valid = parsed.filter(s => s && s.messages && s.messages.some(m => m.sender === 'Agency'))
          if (valid.length > 0) {
            setSavedSessions(valid)
            const activeId = localStorage.getItem(`hab_ait_active_id_${agencyId || 'default'}`)
            const target = valid.find(s => s.sessionId === activeId) || valid[0]
            setSessionId(target.sessionId)
            setMessages(target.messages)
            if (target.lastPinnedMessageId) {
              setTimeout(() => {
                const el = document.getElementById(target.lastPinnedMessageId!)
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }, 200)
            }
            return
          }
        }
      } catch (e) {
        console.warn('Could not restore matching state', e)
      }
    }

    try {
      const res = await fetch('/api/ait/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const data = await res.json()
        const newSessionId = data.matching_session_id || data.session_id
        const initialMessages: Message[] = [
          {
            id: 'welcome',
            sender: 'Assistant',
            text: 'Xin chào! Tôi là trợ lý ghép tour AI của Hanoi Artisan Bridge.\n\nHãy mô tả yêu cầu đoàn — số khách, ngày khởi hành, loại trải nghiệm thủ công, ngân sách — tôi sẽ ngay lập tức phân tích và đề xuất các xưởng nghề được xác minh phù hợp nhất.',
            sent_at: nowVN(),
          },
        ]
        setSessionId(newSessionId)
        setMessages(initialMessages)
        try {
          localStorage.setItem(`hab_ait_active_id_${agencyId || 'default'}`, newSessionId)
        } catch {}
      }
    } catch {
      const fallbackId = `session-local-${Date.now()}`
      setSessionId(fallbackId)
      setMessages([
        {
          id: 'welcome',
          sender: 'Assistant',
          text: 'Xin chào! Tôi là trợ lý ghép tour AI của Hanoi Artisan Bridge.\n\nHãy mô tả yêu cầu đoàn — số khách, ngày khởi hành, loại trải nghiệm thủ công, ngân sách — tôi sẽ ngay lập tức phân tích và đề xuất các xưởng nghề được xác minh phù hợp nhất.',
          sent_at: nowVN(),
        },
      ])
    }
  }

  const handleSelectSession = (target: StoredSession) => {
    if (target.sessionId === sessionId) return
    setSessionId(target.sessionId)
    setMessages(target.messages)
    try {
      localStorage.setItem(`hab_ait_active_id_${agencyId || 'default'}`, target.sessionId)
    } catch {}
    if (target.lastPinnedMessageId) {
      setTimeout(() => {
        const el = document.getElementById(target.lastPinnedMessageId!)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
    }
  }

  const handleDeleteSession = (e: React.MouseEvent, targetSessionId: string) => {
    e.stopPropagation()
    const updated = savedSessions.filter(s => s.sessionId !== targetSessionId)
    setSavedSessions(updated)
    try {
      localStorage.setItem(`hab_ait_sessions_list_${agencyId || 'default'}`, JSON.stringify(updated))
    } catch {}

    if (sessionId === targetSessionId) {
      if (updated.length > 0) {
        handleSelectSession(updated[0])
      } else {
        initializeSession(true)
      }
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
      // Rich card data resolved on the server
      const activityCards: ActivityCardData[] = ('body' in result && Array.isArray(result.body?.activity_cards)) ? result.body.activity_cards : []
      const villageCards: VillageCardData[] = ('body' in result && Array.isArray(result.body?.village_cards)) ? result.body.village_cards : []
      const providerCards: ProviderCardData[] = ('body' in result && Array.isArray(result.body?.provider_cards)) ? result.body.provider_cards : []
      if (outcome.kind === 'guidance') {
        addAssistant({ text: outcome.reply, usedLlm, activityCards, villageCards, providerCards })
      } else if (outcome.kind === 'clarify') {
        addAssistant({
          text: conversationalReply || 'Vui lòng cung cấp thêm thông tin để tôi tìm xưởng nghề phù hợp nhất:',
          clarificationQuestions: outcome.questions,
          dateLine,
          usedLlm,
          activityCards,
          villageCards,
          providerCards,
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

  // Request Quote / Chat: tự động chuyển sang màn hình tin nhắn của hội thoại tương ứng
  const runHandoff = async (kind: 'quote' | 'chat', experienceId: string, statusKey: string, isVerified = true) => {
    if (!sessionId) return

    // Quy tắc BR-003: Chỉ xưởng đã xác minh mới mở cổng chat và nhận báo giá thương mại
    if (!isVerified) {
      const setStatus = kind === 'quote' ? setQuoteStatus : setChatStatus
      setStatus(prev => ({
        ...prev,
        [statusKey]: '⚠️ Xưởng này đang trong quá trình xét duyệt hồ sơ xác minh của UBND/Hội đồng thôn (chưa đạt trạng thái Verified theo BR-003), nên chưa thể mở cổng chat và gửi báo giá. Vui lòng liên hệ xưởng đã xác minh (Bát Tràng, Vạn Phúc, Phú Vinh, Chuông, Quất Động).'
      }))
      return
    }

    // Mở trước tab mới đồng bộ trong sự kiện click để không bị trình duyệt chặn popup
    const newTab = window.open('about:blank', '_blank')
    const setStatus = kind === 'quote' ? setQuoteStatus : setChatStatus
    setStatus(prev => ({ ...prev, [statusKey]: kind === 'quote' ? 'Đang gửi yêu cầu báo giá…' : 'Đang mở hội thoại…' }))
    try {
      const apiRes = await postJson(`/api/ait/sessions/${sessionId}/${kind}`, { experience_id: experienceId })
      const outcome = handoffOutcome(apiRes)
      if (outcome.kind === 'success') {
        if (newTab) {
          newTab.location.href = outcome.navigateTo
        } else {
          window.location.href = outcome.navigateTo
        }
        setStatus(prev => ({ ...prev, [statusKey]: 'Đã chuyển sang màn hình tin nhắn.' }))
      } else {
        if (newTab) newTab.close()
        const errorMsg = 'body' in apiRes && apiRes.body?.error === 'Provider is not available'
          ? '⚠️ Xưởng này đang trong quá trình xét duyệt hồ sơ xác minh của UBND/Hội đồng thôn (chưa đạt trạng thái Verified theo BR-003), nên chưa thể mở cổng chat và gửi báo giá. Vui lòng liên hệ xưởng đã xác minh (Bát Tràng, Vạn Phúc, Phú Vinh, Chuông, Quất Động).'
          : outcome.text
        setStatus(prev => ({ ...prev, [statusKey]: errorMsg }))
      }
    } catch {
      if (newTab) newTab.close()
      setStatus(prev => ({ ...prev, [statusKey]: 'Không thể kết nối máy chủ.' }))
    }
  }

  const handleRequestQuote = (experienceId: string, isVerified = true) => runHandoff('quote', experienceId, experienceId, isVerified)
  const handleChat = (experienceId: string, providerId: string, isVerified = true) => runHandoff('chat', experienceId, providerId, isVerified)

  return (
    <div className="ait-container">
      {/* SIDEBAR BÊN TRÁI: LỊCH SỬ YÊU CẦU TOUR */}
      <aside className="ait-sidebar">
        <button
          type="button"
          className="ait-btn-new-tour"
          onClick={() => {
            initializeSession(true)
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
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="ait-sidebar-history">
          {(() => {
            const now = Date.now()
            const oneDayMs = 24 * 60 * 60 * 1000
            const sevenDaysMs = 7 * oneDayMs

            const filtered = savedSessions.filter(s =>
              !searchQuery.trim() ||
              s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              s.messages.some(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
            )

            if (filtered.length === 0) {
              return (
                <div style={{ padding: '32px 14px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px', lineHeight: 1.6 }}>
                  {savedSessions.length === 0
                    ? 'Chưa có yêu cầu tour nào được lưu. Hãy gõ yêu cầu đầu tiên!'
                    : 'Không tìm thấy yêu cầu khớp với từ khóa tìm kiếm.'}
                </div>
              )
            }

            const today = filtered.filter(s => (now - s.updatedAt) <= oneDayMs)
            const week = filtered.filter(s => (now - s.updatedAt) > oneDayMs && (now - s.updatedAt) <= sevenDaysMs)
            const older = filtered.filter(s => (now - s.updatedAt) > sevenDaysMs)

            const renderItem = (item: StoredSession) => {
              const isActive = item.sessionId === sessionId
              return (
                <div
                  key={item.sessionId}
                  className={`ait-history-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectSession(item)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="ait-history-item-title">
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                      {item.title}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isActive && <span className="ait-status-dot" />}
                      <button
                        type="button"
                        className="ait-history-del-btn"
                        title="Xóa phiên này"
                        onClick={(e) => handleDeleteSession(e, item.sessionId)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="ait-history-item-sub">{item.subTitle}</div>
                </div>
              )
            }

            return (
              <>
                {today.length > 0 && (
                  <div className="ait-history-group">
                    <div className="ait-history-label">HÔM NAY ({today.length})</div>
                    <div className="ait-history-list">{today.map(renderItem)}</div>
                  </div>
                )}
                {week.length > 0 && (
                  <div className="ait-history-group">
                    <div className="ait-history-label">7 NGÀY QUA ({week.length})</div>
                    <div className="ait-history-list">{week.map(renderItem)}</div>
                  </div>
                )}
                {older.length > 0 && (
                  <div className="ait-history-group">
                    <div className="ait-history-label">CŨ HƠN ({older.length})</div>
                    <div className="ait-history-list">{older.map(renderItem)}</div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      </aside>

      {/* KHUNG CHAT & ĐỀ XUẤT MATCHING BÊN PHẢI (FULL WIDTH) */}
      <section className="ait-main-chat">
        {/* HEADER KHUNG CHAT */}
        <header className="ait-chat-header">
          <div>
            <div className="ait-header-title-row">
              <h1 className="ait-header-h1">AI Tour Matching</h1>
              <span className="ait-badge-pill ait-badge-session">
                Phiên #{sessionId ? sessionId.slice(0, 8) : 'Mới'}
              </span>
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
                        ⚡ AI
                      </span>
                    )}
                  </div>
                  <div className="ait-assistant-bubble">
                    {renderFormattedContent(
                      msg.text === AI_FAILURE_TEXT
                        ? 'Hệ thống AI tạm thời gián đoạn — chúng tôi chưa thể xử lý yêu cầu lúc này. Hội thoại của bạn đã được lưu lại an toàn.'
                        : msg.text
                    )}

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
                              {/* Ảnh banner đầy đầu card */}
                              <div className="rec-card-img-wrap">
                                {(() => {
                                  const craftImgMap: Record<string, string> = {
                                    'Vạn Phúc': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/Van_Phuc_weaver_at_Jacquard_loom.jpg/1280px-Van_Phuc_weaver_at_Jacquard_loom.jpg',
                                    'Bát Tràng': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Bat-Trang-Ceramic-Village11.jpg/1280px-Bat-Trang-Ceramic-Village11.jpg',
                                    'Phú Vinh': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/Handicraft_products_in_Phu_Vinh_bamboo_and_rattan_village%2CVietNam.jpg/1280px-Handicraft_products_in_Phu_Vinh_bamboo_and_rattan_village%2CVietNam.jpg',
                                    'Chuông': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Hatter_Vietnam.jpg/1280px-Hatter_Vietnam.jpg',
                                    'Quất Động': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/02/Silk_embroidery_with_Tree_of_Life_motif_from_Vietnam.JPG/1280px-Silk_embroidery_with_Tree_of_Life_motif_from_Vietnam.JPG',
                                    'Sơn Đồng': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/B%C3%ACnh_Phong_g%E1%BB%97.jpg/1280px-B%C3%ACnh_Phong_g%E1%BB%97.jpg',
                                    'Hạ Thái': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/Four_seasons%2C_lacquer_engraving_-_Vietnam_National_Museum_of_Fine_Arts_-_Hanoi%2C_Vietnam_-_DSC05121.JPG/1280px-Four_seasons%2C_lacquer_engraving_-_Vietnam_National_Museum_of_Fine_Arts_-_Hanoi%2C_Vietnam_-_DSC05121.JPG',
                                    'Đào Thục': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/Hanoi_Vietnam_Thang-Long-Water-Puppet-Theatre-01.jpg/1280px-Hanoi_Vietnam_Thang-Long-Water-Puppet-Theatre-01.jpg',
                                  }
                                  const imgSrc = craftImgMap[rec.village_name]
                                  return imgSrc ? (
                                    <img src={imgSrc} alt={rec.village_name} className="rec-card-img" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                  ) : (
                                    <div className="rec-card-img-placeholder">🏛️ {rec.village_name}</div>
                                  )
                                })()}
                                {/* Badge nổi trên ảnh */}
                                <div className="rec-card-img-badges">
                                  <span className="rec-badge-score">{rec.match_score}% PHÙ HỢP</span>
                                  <span className="rec-badge-tag">{index === 0 ? 'ĐỀ XUẤT TỐT NHẤT' : 'GẮN VỚI VĂN HOÁ CAO'}</span>
                                </div>
                                <div className="rec-card-img-price">
                                  <span className="rec-price-label-sm">GIÁ B2B</span>
                                  <span className="rec-price-value-sm">{rec.price_per_person?.toLocaleString('vi-VN')} đ <span style={{ fontWeight: 400, opacity: 0.8 }}>/ khách</span></span>
                                </div>
                              </div>

                              <div className="rec-card-body-new">
                                <h3 className="rec-card-title">{rec.experience_name}</h3>
                                <p className="rec-card-location">
                                  📍 Làng {rec.village_name} · {rec.distance_km ? `${rec.distance_km} km` : '13,2 km'} (khoảng 28 phút di chuyển)
                                </p>

                                <div className="rec-card-reason-wrap">
                                  <div className="rec-card-reason-title">LÝ DO PHÙ HỢP</div>
                                  <p className="rec-card-reason-text">
                                    {localizeExplanation(rec.explanation)}
                                  </p>
                                </div>
                              </div>

                              <div className="rec-card-actions">
                                {/* 1. Nút chính: Xin báo giá - chuyển hướng sang màn hình tin nhắn */}
                                <button
                                  type="button"
                                  id={`quote-btn-${rec.experience_id}`}
                                  className="ait-action-btn ait-action-btn-primary"
                                  onClick={() => handleRequestQuote(rec.experience_id)}
                                  title="Gửi yêu cầu báo giá và mở màn hình tin nhắn với xưởng"
                                >
                                  <svg className="ait-btn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                  </svg>
                                  Xin báo giá ngay
                                </button>

                                {/* 2. Xem chi tiết trải nghiệm */}
                                <Link
                                  href={`/explore/experiences/${rec.experience_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ait-action-btn ait-action-btn-secondary"
                                  title="Xem hình ảnh thực tế, nội dung và đánh giá xưởng"
                                >
                                  <svg className="ait-btn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                  </svg>
                                  Chi tiết
                                </Link>

                                {/* 3. Xem chi tiết làng nghề */}
                                <Link
                                  href={`/village/${(() => {
                                    const villageIdMap: Record<string, string> = {
                                      'Vạn Phúc': 'c0d0d95f-d59c-5c35-946a-f397e380dd14',
                                      'Bát Tràng': '20896522-6235-5699-aeaf-f48b8150d895',
                                      'Phú Vinh': 'e482884e-7190-56cf-bc03-4e69614b1fe5',
                                      'Chuông': '688d408b-9d98-5b66-bfa7-659a67462108',
                                      'Quất Động': 'b1017646-ec89-58d1-aaa9-df783b1c2506',
                                      'Sơn Đồng': '85ec7215-3ec1-5792-afcc-a72d89a3a214',
                                      'Hạ Thái': '6dfbb5e9-f92e-58a0-b090-d67cea160f62',
                                      'Đào Thục': '3527fadf-18ef-58d0-95c6-dc3729650f6a',
                                    }
                                    return villageIdMap[rec.village_name] ?? encodeURIComponent(rec.village_name)
                                  })()}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ait-action-btn ait-action-btn-secondary"
                                  title={`Khám phá toàn bộ xưởng và hoạt động tại Làng ${rec.village_name}`}
                                >
                                  <svg className="ait-btn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="10" r="3"></circle>
                                    <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"></path>
                                  </svg>
                                  Làng {rec.village_name}
                                </Link>

                                {/* 4. Lịch trống xưởng */}
                                <Link
                                  href={`/explore/providers/${rec.provider_id}/schedule`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ait-action-btn ait-action-btn-secondary"
                                  title="Xem các khung giờ còn trống và lịch nghệ nhân"
                                >
                                  <svg className="ait-btn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                  </svg>
                                  Lịch trống
                                </Link>

                                {/* 5. Chat với xưởng - round circle icon button */}
                                <button
                                  type="button"
                                  id={`chat-btn-${rec.provider_id}`}
                                  className="ait-action-btn-circle"
                                  onClick={() => handleChat(rec.experience_id, rec.provider_id)}
                                  title="Nhắn tin trực tiếp với nghệ nhân xưởng"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                  </svg>
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

                    {/* ACTIVITY CARDS (HOẠT ĐỘNG / TRẢI NGHIỆM CỤ THỂ) */}
                    {msg.activityCards && msg.activityCards.length > 0 && (
                      <div className="ait-card-section">
                        <div className="ait-card-section-title">
                          <span>🎨 Hoạt động trải nghiệm thủ công</span>
                          <span className="ait-section-count">{msg.activityCards.length} hoạt động</span>
                        </div>
                        <div className="ait-cards-grid">
                          {msg.activityCards.map(act => (
                            <div key={act.experience_id} className="ait-activity-card">
                              <div className="ait-card-banner-wrap">
                                <img
                                  src={act.image_url}
                                  alt={act.name}
                                  className="ait-card-banner"
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                                <span className="ait-card-tag-badge">{act.category}</span>
                              </div>
                              <div className="ait-card-content">
                                <h3 className="ait-card-title">{act.name}</h3>
                                <div className="ait-card-sub">
                                  <span>🏛️ Làng {act.village_name}</span>
                                  <span>· {act.provider_name}</span>
                                </div>
                                <div className="ait-card-facts">
                                  <span>⏱️ {act.duration_minutes} phút</span>
                                  <span>👥 Tối đa {act.max_participants} khách</span>
                                </div>
                                <p className="ait-card-desc">{act.description}</p>
                                <div className="ait-card-price-row">
                                  <span className="ait-card-price-label">Giá B2B</span>
                                  <span className="ait-card-price-val">{act.price_per_person.toLocaleString('vi-VN')} đ <small>/ khách</small></span>
                                </div>
                                <div className="rec-card-actions" style={{ gap: '8px' }}>
                                  <Link
                                    href={`/explore/experiences/${act.experience_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ait-action-btn ait-action-btn-primary"
                                  >
                                    Chi tiết
                                  </Link>
                                  <button
                                    type="button"
                                    className="ait-action-btn ait-action-btn-secondary"
                                    onClick={() => handleRequestQuote(act.experience_id, act.is_verified ?? true)}
                                  >
                                    Báo giá
                                  </button>
                                  <Link
                                    href={`/village/${act.village_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ait-action-btn ait-action-btn-secondary"
                                  >
                                    Làng {act.village_name}
                                  </Link>
                                  <button
                                    type="button"
                                    className="ait-action-btn-circle"
                                    onClick={() => handleChat(act.experience_id, act.provider_id, act.is_verified ?? true)}
                                    title={act.is_verified === false ? "Xưởng đang chờ duyệt hồ sơ xác minh" : "Chat trực tiếp với xưởng"}
                                  >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                  </button>
                                </div>
                                {quoteStatus[act.experience_id] && (
                                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '6px 10px', borderRadius: '6px', lineHeight: 1.4 }}>
                                    {quoteStatus[act.experience_id]}
                                  </div>
                                )}
                                {chatStatus[act.provider_id] && (
                                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '6px 10px', borderRadius: '6px', lineHeight: 1.4 }}>
                                    {chatStatus[act.provider_id]}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* VILLAGE CARDS (LÀNG NGHỀ TRUYỀN THỐNG) */}
                    {msg.villageCards && msg.villageCards.length > 0 && (
                      <div className="ait-card-section">
                        <div className="ait-card-section-title">
                          <span>🏛️ Làng nghề truyền thống đã xác minh</span>
                          <span className="ait-section-count">{msg.villageCards.length} làng nghề</span>
                        </div>
                        <div className="ait-cards-grid">
                          {msg.villageCards.map(village => (
                            <div key={village.village_id} className="ait-village-card">
                              <div className="ait-card-banner-wrap">
                                <img
                                  src={village.image_url}
                                  alt={village.name}
                                  className="ait-card-banner"
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                                <span className="ait-card-tag-badge">Làng nghề</span>
                              </div>
                              <div className="ait-card-content">
                                <h3 className="ait-card-title">{village.name}</h3>
                                <div className="ait-card-sub">
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                  {village.craft}
                                </div>
                                <p className="ait-card-location">
                                  📍 {village.district}
                                </p>
                                <p className="ait-card-desc">{village.description}</p>
                                <div className="rec-card-actions" style={{ gap: '8px' }}>
                                  <Link
                                    href={`/village/${village.village_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ait-action-btn ait-action-btn-primary"
                                  >
                                    Xem chi tiết làng
                                  </Link>
                                  <button
                                    type="button"
                                    className="ait-action-btn ait-action-btn-secondary"
                                    onClick={() => handleSendMessage(`Xem danh sách xưởng tại làng ${village.name}`)}
                                  >
                                    Xem danh sách xưởng
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PROVIDER CARDS (LOCAL PROVIDER / XƯỞNG THỦ CÔNG) */}
                    {msg.providerCards && msg.providerCards.length > 0 && (
                      <div className="ait-card-section">
                        <div className="ait-card-section-title">
                          <span>🏠 Xưởng thủ công & nghệ nhân (Local Provider)</span>
                          <span className="ait-section-count">{msg.providerCards.length} xưởng</span>
                        </div>
                        <div className="ait-cards-grid">
                          {msg.providerCards.map(provider => (
                            <div key={provider.provider_id} className="ait-provider-card">
                              <div className="ait-card-banner-wrap">
                                <img
                                  src={provider.image_url}
                                  alt={provider.business_name}
                                  className="ait-card-banner"
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                                <span className="ait-card-tag-badge">
                                  {provider.is_verified === false ? 'Chờ duyệt hồ sơ' : 'Xưởng chứng nhận'}
                                </span>
                              </div>
                              <div className="ait-card-content">
                                <div className="ait-card-header-row">
                                  <div>
                                    <h3 className="ait-card-title">{provider.business_name}</h3>
                                    <div className="ait-card-sub">
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                      {provider.village_name} · {provider.craft_type}
                                    </div>
                                  </div>
                                  {provider.artisan_name && (
                                    <span style={{ fontSize: '12px', color: '#64748B', textAlign: 'right', flexShrink: 0 }}>
                                      👤 {provider.artisan_name}
                                    </span>
                                  )}
                                </div>
                                <p className="ait-card-location">📍 {provider.location_address}</p>
                                <p className="ait-card-desc">{provider.description}</p>

                                <div className="rec-card-actions" style={{ gap: '8px', alignItems: 'center' }}>
                                  <Link
                                    href={`/explore/providers/${provider.provider_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ait-action-btn ait-action-btn-primary"
                                  >
                                    Xem chi tiết xưởng
                                  </Link>
                                  <Link
                                    href={`/explore/providers/${provider.provider_id}/schedule`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ait-action-btn ait-action-btn-secondary"
                                  >
                                    Lịch trống
                                  </Link>
                                  <button
                                    type="button"
                                    id={`chat-btn-${provider.provider_id}`}
                                    className="ait-action-btn-circle"
                                    onClick={() => handleChat(provider.primary_experience_id, provider.provider_id, provider.is_verified ?? true)}
                                    title={provider.is_verified === false ? "Xưởng đang chờ duyệt hồ sơ xác minh" : "Chat trực tiếp với xưởng"}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                  </button>
                                </div>

                                {chatStatus[provider.provider_id] && (
                                  <div style={{ marginTop: '8px', fontSize: '12.5px', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '6px 12px', borderRadius: '6px' }}>
                                    {chatStatus[provider.provider_id] === HANDOFF_FAILURE_TEXT ? (
                                      <>
                                        {HANDOFF_FAILURE_TEXT}{' '}
                                        <button className="handoff-retry-btn" onClick={() => handleChat(provider.primary_experience_id, provider.provider_id, provider.is_verified ?? true)}>Thử lại</button>
                                      </>
                                    ) : chatStatus[provider.provider_id]}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
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
