/**
 * Screen 22 (AIT121): preserve its core content while applying the compact result-card and CTA refinements.
 * The static wording checks remain aligned with the mockup where the requested UI changes do not replace them.
 */
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const code = (file: string) => readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const page = readFileSync('src/app/ai-matching/page.tsx', 'utf8')
const view = code('src/app/ai-matching/matching-view.ts')
const pageCode = code('src/app/ai-matching/page.tsx')
const screenCss = readFileSync('src/app/ai-matching/ai-matching.css', 'utf8')
const mockupFile = join(homedir(), 'Desktop/hab-mockup-v3/source/GhepTourAI.dc.html')

const SIDEBAR = ['Các cuộc ghép tour', 'Cuộc ghép tour mới', 'Gần đây']
const EMPTY_STATE = [
  'đoàn tiếp theo cần gì?',
  'Tin nhắn cho Ghép tour AI',
  'Kể về đoàn của bạn: bao nhiêu khách, đi ngày nào, ngân sách, muốn làm gì…',
  'Gửi',
  '25 học sinh, muốn tự làm sản phẩm', 'Khách Hàn Quốc 15 người', 'Team building 30 người', 'Tour nửa ngày, dưới 200.000 ₫/khách',
  'AI chỉ gợi ý trải nghiệm và ngày còn trống. Bạn tự chọn và gửi yêu cầu đặt chỗ cho xưởng.',
]
const CHAT_STATE = [
  'AI đã hiểu:',
  'Cuộc trò chuyện với AI',
  'Vì sao hợp:',
  'Điểm nổi bật',
  'Chat',
  'Xem lịch trống',
  'Xin báo giá',
  'Tin nhắn cho Ghép tour AI',
  'Hỏi thêm hoặc sửa yêu cầu…',
  'Gửi',
  'AI có thể gợi ý chưa đúng. Kiểm tra lịch và giá ở trang trải nghiệm trước khi gửi yêu cầu.',
]

function inOrder(source: string, texts: string[], from = 0) {
  let at = from
  for (const text of texts) {
    const found = source.indexOf(text, at)
    expect(found, `"${text}" missing or out of order`).toBeGreaterThanOrEqual(at)
    at = found
  }
  return at
}

describe('screen 22 follows mockup GhepTourAI.dc.html', () => {
  it('left rail, then the new-conversation state, then the chat state, in the mockup order', () => {
    const side = inOrder(page, SIDEBAR)
    const empty = inOrder(page, EMPTY_STATE, side)
    inOrder(page, CHAT_STATE, empty)
  })

  it('the new-conversation state shows the greeting with the Agency contact name and the h1 role', () => {
    expect(page).toMatch(/<h1 className="aim__hello">[\s\S]*Chào \{[^}]+\}, đoàn tiếp theo cần gì\?/)
  })

  it('chat state: heading, "AI đã hiểu" chips bar, then conversation, then composer', () => {
    expect(page).toMatch(/<h1 className="aim__h1">Ghép tour AI<\/h1>/)
    inOrder(page, ['aim__top', 'AI đã hiểu:', 'aim__stream', 'aim__dock', 'aim__comp'])
  })

  it('result cards use the new hierarchy and keep the three actions in the requested order', () => {
    inOrder(page, ['aim__card-media', 'aim__card-heading', 'v3r__name', 'v3r__where', 'v3r__craft', 'aim__card-meta', 'Vì sao hợp:', 'aim__card-highlights', 'aim__card-price', 'v3r__total', 'aim__price-perguest', 'aim__price-guests', 'v3r__old', 'aim__card-footer', '<span>Chat</span>', 'Xem lịch trống', 'Xin báo giá'])
    const footer = page.slice(page.indexOf('className="aim__card-footer"'), page.indexOf('</footer>'))
    inOrder(footer, ['<span>Chat</span>', 'Xem lịch trống', 'Xin báo giá'])
  })

  it('keeps the existing quote handoff and does not add a new quotation flow', () => {
    expect(page).toContain('handleRequestQuote(rec.experience_id)')
    expect(page).toContain("runHandoff('quote'")
  })

  it('lets long titles and explanations wrap and renders every available highlight', () => {
    expect(screenCss).toMatch(/\.aim__card-title\s*\{[^}]*overflow-wrap:\s*anywhere/)
    expect(screenCss).toMatch(/\.aim__card-location\s*\{[^}]*overflow-wrap:\s*anywhere/)
    expect(screenCss).not.toMatch(/\.aim__card-title[^}]*line-clamp/)
    expect(screenCss).not.toMatch(/\.aim__why[^}]*line-clamp/)
    expect(page).toMatch(/rec\.card\.highlights\.map\(/)
  })

  it('no English left in the visible texts of the page and the view', () => {
    for (const text of ['Retry', 'Rank #', 'Match Score', 'Quick Prompts', 'AI Tour Matching', 'Required Clarifications', 'Press Enter']) {
      expect(pageCode + view, text).not.toContain(text)
    }
  })

  it.skipIf(!existsSync(mockupFile))('every expected text exists in the mockup file', () => {
    const mockup = readFileSync(mockupFile, 'utf8')
    for (const text of [...SIDEBAR.slice(1), ...EMPTY_STATE, ...CHAT_STATE.filter(t => t !== 'Hỏi thêm hoặc sửa yêu cầu…' || true)]) {
      if (text === 'Các cuộc ghép tour') continue
      expect(mockup, text).toContain(text)
    }
  })
})
