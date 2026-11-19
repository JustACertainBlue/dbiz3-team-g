// scripts/db/dev-load-content.mjs (human decision 2026-11-19, part C): DEV-only load of the reviewed content draft.
// Pure parts plus run() against a fake client: DEV/PROD guard before connecting, migration check, dry run is READ ONLY
// and writes nothing, apply writes one journal and one audit row in one transaction, missing rows roll back, undo restores.
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
// Same list as src/lib/explore/vocabulary.ts SUITABLE_FOR on ui/v3-public (not on main yet).
const SUITABLE_FOR = ['Đoàn học sinh', 'Đoàn gia đình', 'Khách quốc tế', 'Team building', 'Tour nửa ngày', 'Tour văn hoá – di sản',
  'Không cần kinh nghiệm', 'Sản phẩm mang về', 'Chụp ảnh cùng nghệ nhân', 'Xem nghệ nhân làm việc']
import { DEV_PROJECT_REF, PROD_PROJECT_REF, assertDevTarget, parseArgs, plan, readDraft, run, summary, vocabulary } from '../../scripts/db/dev-load-content.mjs'

const url = (ref: string) => `postgresql://postgres.${ref}:test-only@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
const E = '11111111-1111-4111-8111-111111111111', P = '22222222-2222-4222-8222-222222222222', V = '33333333-3333-4333-8333-333333333333'
const A = '44444444-4444-4444-8444-444444444444', U = '55555555-5555-4555-8555-555555555555'
const csv = (rows: Array<Record<string, string>>) => [Object.keys(rows[0]).join(','), ...rows.map(row => Object.values(row).map(v => `"${v.replace(/"/g, '""')}"`).join(','))].join('\n')

function experience(over: Record<string, string> = {}) {
  return { experience_id: E, provider_id: P, village: 'Bát Tràng', provider_name_final: 'Xưởng gốm Lộc Khê', old_name: 'Nặn cốc gốm 1 · Xưởng 1', new_name: 'Nặn bát trên bàn xoay', new_description: 'Mô tả mới.',
    highlights: '[{"title":"Tự tay nặn","sub":"a"}]', inclusions: '{"per_guest":["Đất sét"],"included":["Vật liệu"],"take_home":true,"notes":{}}',
    guide_languages: '["Tiếng Việt"]', child_policy: 'Trẻ từ 6 tuổi.', suitable_for: '["Đoàn học sinh","Sản phẩm mang về"]',
    slots: '[{"label":"Ca sáng","start":"08:30","end":"09:30","weekdays":[1,2,3]}]', ...over }
}
function draftDir(over: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'hab-content-'))
  writeFileSync(join(dir, 'experiences.csv'), csv([experience(over)]))
  writeFileSync(join(dir, 'providers.csv'), csv([{ provider_id: P, village: 'Bát Tràng', old_business_name: 'Xưởng thủ công Bát Tràng', new_business_name: 'Xưởng gốm Lộc Khê', new_description: 'Xưởng gốm gia đình.', founded_year: '1998', parking_note: 'Bãi xe đầu làng.' }]))
  writeFileSync(join(dir, 'villages.csv'), csv([{ village_id: V, name: 'Bát Tràng', editorial_craft: '', distance_km: '13.2', distance_source: 'https://www.openstreetmap.org/directions', description_new: '', visit_notes: '{"trang_phuc":"Đồ dễ giặt."}', tour_suggestion_detail: '{"title":"Hợp cho tour nửa ngày!","lines":[],"extras":[]}', highlights: '[{"title":"Làng gốm","sub":"x"}]' }]))
  writeFileSync(join(dir, 'agencies.csv'), csv([{ agency_id: A, old_company_name: 'Du lịch Di sản 01', new_company_name: 'Công ty Lữ hành Mây Ngàn', new_description: 'Tour làng nghề.' }]))
  writeFileSync(join(dir, 'users.csv'), csv([{ user_id: U, role_code: 'Local_Provider', old_full_name: 'Nghệ nhân mẫu 1', new_full_name: 'Phan Thị Hồng Nhung' }]))
  return dir
}

function fakeClient({ migrated = true, found = true }: { migrated?: boolean; found?: boolean } = {}) {
  const queries: Array<{ text: string; values?: unknown[] }> = []
  let connected = false
  return {
    queries, get connected() { return connected },
    async connect() { connected = true }, async end() {},
    async query(text: string, values?: unknown[]) {
      queries.push({ text, values })
      if (text.includes('information_schema.columns')) return { rows: migrated ? [1, 2, 3, 4].map(n => ({ n })) : [] }
      if (text.includes('to_regclass')) return { rows: [{ present: migrated }] }
      if (text.startsWith('SELECT label')) return { rows: [{ label: 'Ca cũ', start_time: '10:00', end_time: '11:00', weekdays: [1] }] }
      if (text.startsWith('SELECT ')) return { rows: found ? [{ old: 'value' }] : [] }
      if (text.startsWith('UPDATE ')) return { rowCount: 1, rows: [] }
      return { rows: [], rowCount: 1 }
    },
  }
}
const quiet = { log: () => {} }
const env = { DATABASE_URL: url(DEV_PROJECT_REF) }
const writes = (client: ReturnType<typeof fakeClient>) => client.queries.filter(q => /^(UPDATE|INSERT|DELETE)/.test(q.text))

describe('parseArgs / assertDevTarget / vocabulary', () => {
  it('defaults to a dry run and needs exactly one of --dir or --undo', () => {
    expect(parseArgs(['--dir=x'])).toEqual({ apply: false, dir: 'x', undo: null })
    expect(parseArgs(['--dir=x', '--apply'])).toEqual({ apply: true, dir: 'x', undo: null })
    expect(() => parseArgs(['--dir=x', '--apply', '--dry-run'])).toThrow(/either/)
    expect(() => parseArgs([])).toThrow(/exactly one/)
    expect(() => parseArgs(['--dir=x', '--undo=y'])).toThrow(/exactly one/)
    expect(() => parseArgs(['--dir=x', '--force'])).toThrow(/Unknown option/)
  })
  it('accepts only the DEV project ref', () => {
    expect(assertDevTarget(env)).toBe(DEV_PROJECT_REF)
    expect(() => assertDevTarget({ DATABASE_URL: url(PROD_PROJECT_REF) })).toThrow(/PROD/)
    expect(() => assertDevTarget({ DATABASE_URL: url('abcdefghijklmnopqrst') })).toThrow(/not the DEV project/)
    expect(() => assertDevTarget({})).toThrow(/DATABASE_URL/)
  })
  it('reads the suitable_for vocabulary from the migration CHECK (same as the UI list)', () => {
    expect(vocabulary()).toEqual(SUITABLE_FOR)
  })
})

describe('plan', () => {
  it('turns the draft into one update per row, a published-version update for a renamed workshop, and slots', () => {
    const work = plan(readDraft(draftDir()))
    expect(summary(work)).toEqual({ experiences: 1, provider_profiles: 1, provider_profile_versions: 1, villages: 1, agency_profiles: 1, user_accounts: 1, experience_slots: 1 })
    expect(work.updates[0].set).toMatchObject({ name: 'Nặn bát trên bàn xoay', suitable_for: ['Đoàn học sinh', 'Sản phẩm mang về'], guide_languages: ['Tiếng Việt'] })
    expect(work.updates.find(u => u.table === 'provider_profile_versions')).toMatchObject({ published: true, set: { business_name: 'Xưởng gốm Lộc Khê', description: 'Xưởng gốm gia đình.' } })
    expect(work.updates.find(u => u.table === 'villages')!.set).toMatchObject({ distance_km: 13.2, highlights: '[{"title":"Làng gốm","sub":"x"}]' })
    expect(work.slots[E]).toEqual([{ label: 'Ca sáng', start_time: '08:30', end_time: '09:30', weekdays: [1, 2, 3] }])
  })
  it('keeps the old name and description when the draft leaves them empty', () => {
    const set = plan(readDraft(draftDir({ new_name: '', new_description: '' }))).updates[0].set
    expect(set).not.toHaveProperty('name')
    expect(set).not.toHaveProperty('description')
  })
  it('refuses values the database would reject', () => {
    expect(() => plan(readDraft(draftDir({ suitable_for: '["Đoàn học sinh","Sang chảnh"]' })))).toThrow(/outside the migration vocabulary: Sang chảnh/)
    expect(() => plan(readDraft(draftDir({ experience_id: 'e1' })))).toThrow(/not a uuid/)
    expect(() => plan(readDraft(draftDir({ highlights: JSON.stringify(Array(5).fill({ title: 'x' })) })))).toThrow(/1–4 items/)
    expect(() => plan(readDraft(draftDir({ slots: '[{"label":"Ca sáng","start":"09:30","end":"08:30","weekdays":[1]}]' })))).toThrow(/invalid slot/)
    expect(() => plan(readDraft(draftDir({ inclusions: '[1]' })))).toThrow(/inclusions must be an object/)
  })
})

describe('run', () => {
  it('refuses PROD before connecting', async () => {
    const client = fakeClient()
    await expect(run({ argv: [`--dir=${draftDir()}`], env: { DATABASE_URL: url(PROD_PROJECT_REF) }, connect: () => client, log: quiet })).rejects.toThrow(/PROD/)
    expect(client.connected).toBe(false)
  })
  it('stops when the content migration is not applied', async () => {
    const client = fakeClient({ migrated: false })
    await expect(run({ argv: [`--dir=${draftDir()}`], env, connect: () => client, log: quiet })).rejects.toThrow(/not applied/)
    expect(writes(client)).toEqual([])
  })
  it('dry run: READ ONLY, reads every target row, writes nothing, no journal', async () => {
    const client = fakeClient(), journalDir = mkdtempSync(join(tmpdir(), 'hab-journal-'))
    expect(await run({ argv: [`--dir=${draftDir()}`], env, connect: () => client, log: quiet, journalDir })).toEqual({ updated: 0, planned: 6 })
    expect(client.queries.map(q => q.text).slice(0, 2)).toEqual(['BEGIN', 'SET TRANSACTION READ ONLY'])
    expect(client.queries.at(-1)!.text).toBe('ROLLBACK')
    expect(writes(client)).toEqual([])
    expect(readdirSync(journalDir)).toEqual([])
  })
  it('apply: journal first, then updates, slots and one audit row in one transaction', async () => {
    const client = fakeClient(), journalDir = mkdtempSync(join(tmpdir(), 'hab-journal-'))
    const result = await run({ argv: [`--dir=${draftDir()}`, '--apply'], env, connect: () => client, log: quiet, journalDir, now: () => new Date('2026-11-19T10:00:00Z') })
    expect(result.updated).toBe(6)
    const texts = client.queries.map(q => q.text)
    expect(texts).not.toContain('SET TRANSACTION READ ONLY')
    expect(texts.filter(t => t.startsWith('UPDATE '))).toHaveLength(6)
    expect(texts.find(t => t.startsWith('UPDATE provider_profile_versions'))).toMatch(/version_no = \(SELECT published_version_no FROM provider_profiles WHERE provider_id = \$1\)/)
    expect(texts.filter(t => t.startsWith('DELETE FROM experience_slots'))).toHaveLength(1)
    expect(texts.filter(t => t.startsWith('INSERT INTO experience_slots'))).toHaveLength(1)
    expect(texts.filter(t => t.includes("'SEED_CONTENT_LOAD'"))).toHaveLength(1)
    expect(texts.at(-1)).toBe('COMMIT')
    const journal = JSON.parse(readFileSync(result.journal!, 'utf8'))
    expect(journal).toMatchObject({ projectRef: DEV_PROJECT_REF, slots: { [E]: [{ label: 'Ca cũ' }] } })
    expect(journal.before).toHaveLength(6)
  })
  it('apply rolls back and writes nothing when a target row is missing', async () => {
    const client = fakeClient({ found: false })
    await expect(run({ argv: [`--dir=${draftDir()}`, '--apply'], env, connect: () => client, log: quiet, journalDir: mkdtempSync(join(tmpdir(), 'hab-journal-')) })).rejects.toThrow(/not found/)
    expect(writes(client)).toEqual([])
    expect(client.queries.at(-1)!.text).toBe('ROLLBACK')
  })
  it('undo --apply restores the saved values and slots; undo without --apply writes nothing', async () => {
    const journalDir = mkdtempSync(join(tmpdir(), 'hab-journal-'))
    const { journal } = await run({ argv: [`--dir=${draftDir()}`, '--apply'], env, connect: () => fakeClient(), log: quiet, journalDir })
    const dry = fakeClient()
    await run({ argv: [`--undo=${journal}`], env, connect: () => dry, log: quiet })
    expect(writes(dry)).toEqual([])
    const client = fakeClient()
    expect(await run({ argv: [`--undo=${journal}`, '--apply'], env, connect: () => client, log: quiet })).toEqual({ restored: 6 })
    expect(client.queries.filter(q => q.text.startsWith('UPDATE '))).toHaveLength(6)
    expect(client.queries.find(q => q.text.startsWith('INSERT INTO experience_slots'))!.values).toEqual([E, 'Ca cũ', '10:00', '11:00', [1]])
    expect(client.queries.at(-1)!.text).toBe('COMMIT')
  })
})
