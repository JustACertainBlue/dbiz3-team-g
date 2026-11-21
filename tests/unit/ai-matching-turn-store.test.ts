/** Screen 22: every answered turn is kept in the browser (localStorage, per agency + session), no migration. */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { loadTurns, saveTurns, turnKey, MAX_STORED_SESSIONS, type StorageLike } from '@/app/ai-matching/turn-store'

class FakeStorage implements StorageLike {
  data = new Map<string, string>()
  get length() { return this.data.size }
  key(i: number) { return [...this.data.keys()][i] ?? null }
  getItem(k: string) { return this.data.get(k) ?? null }
  setItem(k: string, v: string) { this.data.set(k, v) }
  removeItem(k: string) { this.data.delete(k) }
}
const turns = (n: number) => ({
  chips: ['20 khách'],
  messages: Array.from({ length: n }, (_, i) => [
    { id: `a${i}`, sender: 'Agency' as const, text: `${20 + i * 5} khách`, sent_at: '09:00' },
    { id: `s${i}`, sender: 'Assistant' as const, text: 'Gợi ý', sent_at: '09:01', recommendations: [{ experience_id: `e${i}`, card: { name: 'Gốm', price: { kind: 'group', guests: 20 + i * 5, total: 1 } } }] },
  ]).flat(),
})

describe('turn store', () => {
  it('the key holds the agency id and the session id', () => {
    expect(turnKey('AG', 'S1')).toContain('AG')
    expect(turnKey('AG', 'S1')).toContain('S1')
  })
  it('round-trips every turn with its cards (20 khách, then 25 khách)', () => {
    const storage = new FakeStorage()
    saveTurns(storage, 'AG', 'S1', turns(2), new Date('2026-11-21T09:00:00Z'))
    const back = loadTurns(storage, 'AG', 'S1')
    expect(back?.messages.map(m => m.text).filter(t => t.includes('khách'))).toEqual(['20 khách', '25 khách'])
    expect((back?.messages[3] as any).recommendations[0].card.price.guests).toBe(25)
    expect(back?.chips).toEqual(['20 khách'])
  })
  it('another agency or another session reads nothing', () => {
    const storage = new FakeStorage()
    saveTurns(storage, 'AG', 'S1', turns(1))
    expect(loadTurns(storage, 'OTHER', 'S1')).toBeNull()
    expect(loadTurns(storage, 'AG', 'S2')).toBeNull()
  })
  it('keeps at most 20 sessions per agency and drops the oldest; other agencies are untouched', () => {
    const storage = new FakeStorage()
    saveTurns(storage, 'OTHER', 'X', turns(1), new Date('2026-01-01T00:00:00Z'))
    for (let i = 0; i < MAX_STORED_SESSIONS + 3; i += 1) saveTurns(storage, 'AG', `S${i}`, turns(1), new Date(Date.UTC(2026, 10, 1, 0, i)))
    expect(loadTurns(storage, 'AG', 'S0')).toBeNull()
    expect(loadTurns(storage, 'AG', 'S2')).toBeNull()
    expect(loadTurns(storage, 'AG', 'S3')).not.toBeNull()
    expect(loadTurns(storage, 'AG', `S${MAX_STORED_SESSIONS + 2}`)).not.toBeNull()
    expect(loadTurns(storage, 'OTHER', 'X')).not.toBeNull()
  })
  it('never throws: broken JSON, a throwing storage, or no storage', () => {
    const storage = new FakeStorage()
    storage.setItem(turnKey('AG', 'S1'), '{broken')
    expect(loadTurns(storage, 'AG', 'S1')).toBeNull()
    const bad: StorageLike = { length: 0, key: () => null, getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('full') }, removeItem: () => { throw new Error('x') } }
    expect(loadTurns(bad, 'AG', 'S1')).toBeNull()
    expect(() => saveTurns(bad, 'AG', 'S1', turns(1))).not.toThrow()
    expect(loadTurns(null, 'AG', 'S1')).toBeNull()
    expect(() => saveTurns(null, 'AG', 'S1', turns(1))).not.toThrow()
  })
})

describe('screen wiring', () => {
  const page = readFileSync('src/app/ai-matching/page.tsx', 'utf8')
  it('reopening checks the memory first and only re-runs the analysis without it', () => {
    const resume = page.slice(page.indexOf('const resumeSession'), page.indexOf('// Guest Access Guard') > 0 ? page.indexOf('// Guest Access Guard') : undefined)
    expect(resume.indexOf('loadTurns(')).toBeGreaterThan(-1)
    expect(resume.indexOf('loadTurns(')).toBeLessThan(resume.indexOf('analyze('))
    expect(resume).toMatch(/if \(remembered\)/)
  })
  it('the re-run shows "Đang tải lại gợi ý…" while waiting and the .cap line under the answer afterwards', () => {
    expect(page).toContain('Đang tải lại gợi ý…')
    expect(page).toMatch(/className="aim__cap"[^>]*>[^<]*Gợi ý được tính lại theo giá và lịch hiện tại\./)
  })
  it('turns are saved after an answered turn', () => {
    expect(page).toContain('saveTurns(')
  })
})
