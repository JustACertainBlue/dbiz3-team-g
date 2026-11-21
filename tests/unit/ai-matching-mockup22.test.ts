/**
 * Screen 22 (AIT121): blocks, order and wording follow hab-mockup-v3 source/GhepTourAI.dc.html.
 * The wording lists below are copied from that file. If the mockup folder is on this machine, they are also checked
 * against it. Accepted differences (human decision): no "Tìm cuộc trò chuyện" in the left rail, quick prompts instead of
 * follow-up chips, no "2 ca liên tiếp" text. 2026-11-21: the three pills (Số khách, Ngày đi, Ngân sách) were removed from the
 * mockup's new-conversation composer, so they are removed here too.
 */
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const code = (file: string) => readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const page = readFileSync('src/app/ai-matching/page.tsx', 'utf8')
const view = code('src/app/ai-matching/matching-view.ts')
const pageCode = code('src/app/ai-matching/page.tsx')
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
  'Nhắn tin cho xưởng',
  'Xem lịch trống',
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

  it('card blocks in mockup order: name, village · workshop, craft, tags, why, highlights, price, message, schedule', () => {
    inOrder(page, ['v3r__media', 'v3r__name', 'v3r__where', 'v3r__craft', 'v3-ftags', 'Vì sao hợp:', 'v3-ben', 'v3r__price', 'v3r__guests', 'v3r__total', 'v3r__old', 'Nhắn tin cho xưởng', 'Xem lịch trống'])
  })

  it('"Yêu cầu báo giá" is not on the card (mockup has no such button)', () => {
    expect(page).not.toContain('Yêu cầu báo giá')
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
