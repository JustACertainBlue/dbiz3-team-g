/**
 * Screen 22 history ("Gần đây"): read-only API over matching_sessions + matching_messages (no migration).
 * Access follows /api/ait/matching: 401 Guest, 403 not a Tour_Agency, 403 another company's session.
 */
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { GET as list } from '@/app/api/ait/sessions/route'
import { GET as one } from '@/app/api/ait/sessions/[id]/route'
import { addMessage, createMatchingSession } from '@/lib/matching/session-service'
import { demoRepository } from '@/lib/demo/json-repository'
import { historyDate, historyTitle } from '@/app/ai-matching/history-view'

const AGENCY = '02e568d8-d65e-54b1-a554-b411150d1dcb'
const OTHER_AGENCY = '14390b41-4e6c-5b8d-be3a-05e7c5e761bd'
const request = (path: string, account?: string) => new Request(`http://localhost:3000${path}`, { headers: account ? { cookie: `hab_demo_account=${account}` } : {} })
const ctx = (id: string) => ({ params: { id } })

async function conversation(agencyId: string, texts: string[], activity?: string) {
  const session = await createMatchingSession({ agencyId })
  for (const text of texts) await addMessage(session.session_id, 'Agency', text)
  if (activity) await demoRepository().update('matching_sessions', row => row.matching_session_id === session.session_id, { last_activity_at: activity })
  return session.session_id
}

beforeEach(() => { demoRepository().reset() })

describe('GET /api/ait/sessions (own history)', () => {
  it('401 for a Guest, 403 for a Local Provider', async () => {
    expect((await list(request('/api/ait/sessions'))).status).toBe(401)
    expect((await list(request('/api/ait/sessions', 'provider'))).status).toBe(403)
  })

  it('lists only the signed-in company, newest first, at most 20, skipping sessions with no Agency message', async () => {
    const old = await conversation(AGENCY, ['Khách Hàn Quốc 15 người', 'dưới 300.000 ₫/khách'], '2026-11-01T09:00:00.000Z')
    const recent = await conversation(AGENCY, ['Đoàn 25 học sinh lớp 6'], '2026-11-20T09:00:00.000Z')
    await createMatchingSession({ agencyId: AGENCY }) // opened the page, wrote nothing
    await conversation(OTHER_AGENCY, ['Việc của công ty khác'])
    const body = await (await list(request('/api/ait/sessions', 'agency'))).json()
    // The seed already holds older sessions for this company; ours must come first, then only that company's.
    expect(body.sessions.slice(0, 2).map((s: any) => s.session_id)).toEqual([recent, old])
    expect(body.sessions.length).toBeLessThanOrEqual(20)
    expect(body.sessions[1].title).toBe('Khách Hàn Quốc 15 người')
    expect(JSON.stringify(body)).not.toContain('Việc của công ty khác')
  })

  it('returns at most 20 sessions', async () => {
    for (let i = 0; i < 23; i += 1) await conversation(AGENCY, [`Đoàn số ${i}`])
    const body = await (await list(request('/api/ait/sessions', 'agency'))).json()
    expect(body.sessions).toHaveLength(20)
  })
})

describe('GET /api/ait/sessions/[id] (load one)', () => {
  it('401 for a Guest, 403 for a Local Provider, 403 for another company\'s session', async () => {
    const mine = await conversation(AGENCY, ['Đoàn của tôi'])
    const theirs = await conversation(OTHER_AGENCY, ['Đoàn của họ'])
    expect((await one(request(`/api/ait/sessions/${mine}`), ctx(mine))).status).toBe(401)
    expect((await one(request(`/api/ait/sessions/${mine}`, 'provider'), ctx(mine))).status).toBe(403)
    const denied = await one(request(`/api/ait/sessions/${theirs}`, 'agency'), ctx(theirs))
    expect(denied.status).toBe(403)
    expect(JSON.stringify(await denied.json())).not.toContain('Đoàn của họ')
  })

  it('403 for an unknown id', async () => {
    expect((await one(request('/api/ait/sessions/nope', 'agency'), ctx('nope'))).status).toBe(403)
  })

  it('returns the stored messages in order so the conversation can continue with the same session_id', async () => {
    const id = await conversation(AGENCY, ['Đoàn 25 học sinh', 'đi ngày 25/11'])
    const body = await (await one(request(`/api/ait/sessions/${id}`, 'agency'), ctx(id))).json()
    expect(body.session_id).toBe(id)
    expect(body.messages.map((m: any) => m.text)).toEqual(['Đoàn 25 học sinh', 'đi ngày 25/11'])
  })
})

describe('sidebar wording helpers', () => {
  it('cuts a long first message and keeps short ones whole', () => {
    expect(historyTitle('Đoàn 25 học sinh lớp 6')).toBe('Đoàn 25 học sinh lớp 6')
    const cut = historyTitle('Đoàn 25 học sinh lớp 6 muốn tự làm gốm và xem làng nghề buổi sáng, ngân sách vừa phải')
    expect(cut.length).toBeLessThanOrEqual(42)
    expect(cut.endsWith('…')).toBe(true)
  })
  it('shows "Hôm nay" for today and dd/mm otherwise (Hanoi time)', () => {
    const now = new Date('2026-11-21T05:00:00.000Z')
    expect(historyDate('2026-11-21T01:00:00.000Z', now)).toBe('Hôm nay')
    expect(historyDate('2026-11-12T03:00:00.000Z', now)).toBe('12/11')
  })
})

describe('screen wiring', () => {
  const page = readFileSync('src/app/ai-matching/page.tsx', 'utf8')
  it('the three quick-entry pills are gone from the new-conversation composer (mockup change)', () => {
    for (const text of ['Số khách', 'Ngày đi', 'Ngân sách', 'aim__pill', 'addHint']) expect(page, text).not.toContain(text)
  })
  it('the rail lists "Gần đây" and opens a chat with ?session=; "Cuộc ghép tour mới" keeps a real href (open in new tab) and starts a new chat', () => {
    expect(page).toContain('Gần đây')
    expect(page).toContain('/api/ait/sessions')
    expect(page).toMatch(/\?session=/)
    expect(page).toContain('href="/ai-matching" onClick')
    expect(page).not.toContain('Tìm cuộc trò chuyện')
  })
  it('opening an old chat replays the stored conversation without writing a message (retry analysis)', () => {
    expect(page).toMatch(/retry:\s*true/)
  })
})
