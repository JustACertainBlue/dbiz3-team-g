// scripts/db/prod-content-load.mjs (human request 2026-11-21): load the content DEV holds into PROD, modelled on
// storage:catalog-copies. Pure parts plus run()/exportSnapshot() against a fake client with a little state:
// target/ledger guards before any write, dry run writes then rolls back, apply writes the undo file first and commits only
// after the row-count and state checks pass, an already-loaded database gives 0 changes and no write, undo restores.
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import {
  ALLOWED_COLUMNS, DEV_PROJECT_REF, PROD_PROJECT_REF, REQUIRED_MIGRATIONS, assertTarget, checksum, exportSnapshot, parseArgs, run, validateSnapshot,
} from '../../scripts/db/prod-content-load.mjs'

const url = (ref: string) => `postgresql://postgres.${ref}:test-only@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
const E1 = '11111111-1111-4111-8111-111111111111', E2 = '22222222-2222-4222-8222-222222222222'
const P = '33333333-3333-4333-8333-333333333333', V = '44444444-4444-4444-8444-444444444444'
const U = '55555555-5555-4555-8555-555555555555', A = '66666666-6666-4666-8666-666666666666'
const VOCAB = ['Đoàn học sinh', 'Sản phẩm mang về']
const SLOT = { label: 'Ca sáng', start_time: '08:30', end_time: '09:30', weekdays: [1, 2, 3] }

function snapshotContent() {
  const updates = [
    { table: 'experiences', key: { experience_id: E1 }, set: { name: 'Nặn bát trên bàn xoay', description: 'Mô tả mới.', highlights: '[{"title":"a"}]', group_note: null,
      inclusions: '{"included":["x"]}', guide_languages: ['Tiếng Việt'], child_policy: null, suitable_for: ['Đoàn học sinh'] } },
    { table: 'experiences', key: { experience_id: E2 }, set: { name: 'Làm nón', description: 'Mô tả.', highlights: null, group_note: null,
      inclusions: '{"included":[]}', guide_languages: ['Tiếng Việt'], child_policy: null, suitable_for: [] } },
    { table: 'provider_profiles', key: { provider_id: P }, set: { founded_year: 1998, parking_note: 'Bãi xe đầu làng.' } },
    { table: 'provider_profile_versions', key: { provider_id: P }, published: true, set: { business_name: 'Xưởng gốm Lộc Khê', description: 'Xưởng gia đình.' } },
    { table: 'user_accounts', key: { user_id: U }, set: { full_name: 'Phan Thị Hồng Nhung' } },
    { table: 'agency_profiles', key: { agency_id: A }, set: { company_name: 'Công ty Lữ hành Mây Ngàn' } },
    { table: 'villages', key: { village_id: V }, set: { description: 'Làng gốm.', editorial_craft: 'Gốm.', tour_suggestion: 'Nửa ngày.', distance_km: 13.2,
      visit_notes: null, tour_suggestion_detail: null, highlights: '[{"title":"Làng gốm"}]' } },
  ]
  const slots = { [E1]: [SLOT], [E2]: [SLOT, { ...SLOT, label: 'Ca chiều', start_time: '14:00', end_time: '15:00' }] }
  return { updates, slots }
}
const makeSnapshot = (mutate?: (content: ReturnType<typeof snapshotContent>) => void) => {
  const content = snapshotContent()
  mutate?.(content)
  return { kind: 'hab-content-snapshot', version: 1, sourceRef: DEV_PROJECT_REF, createdAt: '2026-11-21T00:00:00.000Z', sha256: checksum(content), ...content }
}

type Opts = { ledger?: string[]; changed?: boolean; leak?: string; slotsInDb?: Record<string, unknown[]>; nonSynthetic?: number }
function fakeDb({ ledger = [...REQUIRED_MIGRATIONS], changed = true, leak, slotsInDb, nonSynthetic = 0 }: Opts = {}) {
  const state = { written: false, log: [] as string[], queries: [] as Array<{ text: string; values?: unknown[] }>,
    counts: { experiences: 2, villages: 1, provider_profiles: 1, provider_profile_versions: 1, audit_logs: 5, user_accounts: 9, agency_profiles: 3 } as Record<string, number>,
    slots: slotsInDb ?? { [E1]: [{ ...SLOT, label: 'Ca cũ' }], [E2]: [SLOT, { ...SLOT, label: 'Ca chiều', start_time: '14:00', end_time: '15:00' }] } as Record<string, unknown[]> }
  let saved: { slots: Record<string, unknown[]>; counts: Record<string, number>; written: boolean } | undefined
  const client = {
    state,
    async connect() {}, async end() {},
    async query(text: string, values?: unknown[]) {
      state.queries.push({ text, values })
      const word = text.split(/\s/)[0]
      if (['BEGIN', 'ROLLBACK', 'COMMIT', 'SET'].includes(word)) {
        state.log.push(text.startsWith('SET') ? 'READONLY' : word)
        if (word === 'BEGIN') saved = structuredClone({ slots: state.slots, counts: state.counts, written: state.written })
        if (word === 'ROLLBACK' && saved) Object.assign(state, structuredClone(saved)) // a rolled-back transaction leaves no trace
        return { rows: [] }
      }
      if (text.includes('hab_internal.migrations')) return { rows: ledger.map(name => ({ name })) }
      if (text.includes('information_schema.columns')) { const rows = []; for (let i = 0; i < (values?.length ?? 0); i += 2) rows.push({ table_name: values![i], column_name: values![i + 1] }); return { rows } }
      if (text.includes('NOT LIKE')) return { rows: [{ n: nonSynthetic }] }
      const count = text.match(/^SELECT count\(\*\)::int AS n FROM public\.(\w+)/)
      if (count) return { rows: [{ n: count[1] === 'experience_slots' ? Object.values(state.slots).reduce((n, list) => n + list.length, 0) : state.counts[count[1]] }] }
      if (text.includes(' AS changed ')) return { rows: [{ changed: !state.written && changed }] }
      if (text.startsWith('SELECT label')) return { rows: state.slots[String(values![0])] ?? [] }
      if (text.startsWith('SELECT ')) {
        const columns = text.slice(7, text.indexOf(' FROM ')).split(', ').map(part => part.split(' AS ').pop()!)
        return { rows: [Object.fromEntries(columns.map(column => [column, column === 'founded_year' ? 1900 : column === 'distance_km' ? 1 : 'old']))] }
      }
      if (text.startsWith('UPDATE ')) { state.written = true; state.log.push('UPDATE'); if (leak) state.counts[leak] += 1; return { rowCount: 1, rows: [] } }
      if (text.startsWith('DELETE FROM experience_slots')) { state.written = true; state.log.push('DELETE'); state.slots[String(values![0])] = []; return { rowCount: 1, rows: [] } }
      if (text.startsWith('INSERT INTO experience_slots')) { state.log.push('INSERT'); const [id, label, start_time, end_time, weekdays] = values as any[]; state.slots[id].push({ label, start_time, end_time, weekdays }); return { rowCount: 1, rows: [] } }
      if (text.startsWith('INSERT INTO audit_logs')) { state.log.push('AUDIT'); state.counts.audit_logs += 1; return { rowCount: 1, rows: [] } }
      throw new Error(`unexpected query: ${text}`)
    },
  }
  return client
}
const quiet = () => { const lines: string[] = []; return { lines, log: (line: string) => { lines.push(String(line)) } } }
const dir = () => mkdtempSync(join(tmpdir(), 'hab-prod-content-'))
const setup = (over: Partial<{ apply: boolean; undo: string; targetProd: boolean }> = {}, db: Opts = {}, snapshot = makeSnapshot()) => {
  const client = fakeDb(db), out = dir(), log = quiet()
  const options = { apply: false, targetProd: false, ...over }
  return { client, out, log, options, deps: { client, snapshot, vocab: VOCAB, outDir: out, now: new Date('2026-11-21T10:00:00Z'), projectRef: DEV_PROJECT_REF, log } }
}
const writes = (client: ReturnType<typeof fakeDb>) => client.state.log.filter(entry => ['UPDATE', 'DELETE', 'INSERT', 'AUDIT'].includes(entry))

describe('parseArgs', () => {
  it('defaults to a dry run on DEV with the default snapshot', () => {
    expect(parseArgs([])).toMatchObject({ apply: false, targetProd: false, export: false, undo: undefined })
  })
  it('accepts --apply, --target-prod, --snapshot and --undo', () => {
    expect(parseArgs(['--apply', '--target-prod', '--snapshot', 'a.json'])).toMatchObject({ apply: true, targetProd: true, snapshot: 'a.json' })
    expect(parseArgs(['--undo', 'u.json'])).toMatchObject({ undo: 'u.json', apply: true })
    expect(parseArgs(['--undo', 'u.json', '--dry-run'])).toMatchObject({ undo: 'u.json', apply: false })
  })
  it('refuses contradictory or unknown options', () => {
    expect(() => parseArgs(['--apply', '--dry-run'])).toThrow(/either/)
    expect(() => parseArgs(['--undo', 'u.json', '--apply'])).toThrow(/--undo/)
    expect(() => parseArgs(['--export', '--apply'])).toThrow(/--export/)
    expect(() => parseArgs(['--export', '--target-prod'])).toThrow(/--export/)
    expect(() => parseArgs(['--force'])).toThrow(/Unknown option/)
    expect(() => parseArgs(['--undo'])).toThrow(/needs/)
  })
})

describe('assertTarget (runs before any connection)', () => {
  it('without --target-prod only DEV is allowed; PROD is refused', () => {
    expect(assertTarget({ DATABASE_URL: url(DEV_PROJECT_REF) }, { targetProd: false })).toBe(DEV_PROJECT_REF)
    expect(() => assertTarget({ DATABASE_URL: url(PROD_PROJECT_REF) }, { targetProd: false })).toThrow(/not the DEV project/)
    expect(() => assertTarget({}, { targetProd: false })).toThrow(/DATABASE_URL/)
  })
  it('--target-prod needs CONFIRM_PROJECT_REF equal to the PROD ref and a PROD DATABASE_URL', () => {
    const prod = { DATABASE_URL: url(PROD_PROJECT_REF), CONFIRM_PROJECT_REF: PROD_PROJECT_REF }
    expect(assertTarget(prod, { targetProd: true })).toBe(PROD_PROJECT_REF)
    expect(() => assertTarget({ ...prod, CONFIRM_PROJECT_REF: undefined }, { targetProd: true })).toThrow(/CONFIRM_PROJECT_REF/)
    expect(() => assertTarget({ ...prod, CONFIRM_PROJECT_REF: DEV_PROJECT_REF }, { targetProd: true })).toThrow(/CONFIRM_PROJECT_REF/)
    expect(() => assertTarget({ DATABASE_URL: url(DEV_PROJECT_REF), CONFIRM_PROJECT_REF: PROD_PROJECT_REF }, { targetProd: true })).toThrow(/not the confirmed PROD/)
  })
})

describe('validateSnapshot', () => {
  it('accepts a well-formed snapshot and counts rows', () => {
    const { updates, slots } = validateSnapshot(makeSnapshot(), VOCAB)
    expect(updates).toHaveLength(7)
    expect(Object.values(slots).flat()).toHaveLength(3)
  })
  it('refuses a wrong checksum, kind or version', () => {
    expect(() => validateSnapshot({ ...makeSnapshot(), sha256: 'x' }, VOCAB)).toThrow(/checksum/)
    expect(() => validateSnapshot({ ...makeSnapshot(), kind: 'other' }, VOCAB)).toThrow(/snapshot/)
  })
  it('refuses tables and columns outside the allowlist; of the accounts only the two display names can be written', () => {
    const table = makeSnapshot(c => { c.updates.push({ table: 'sessions', key: { session_id: E1 }, set: { x: 'x' } } as never) })
    expect(() => validateSnapshot(table, VOCAB)).toThrow(/sessions/)
    for (const column of ['email', 'password_hash', 'role_code', 'account_status', 'phone', 'must_change_password']) {
      const bad = makeSnapshot(c => { (c.updates.find(u => u.table === 'user_accounts')!.set as Record<string, unknown>)[column] = 'x' })
      expect(() => validateSnapshot(bad, VOCAB)).toThrow(new RegExp(column))
    }
    const agencyColumn = makeSnapshot(c => { (c.updates.find(u => u.table === 'agency_profiles')!.set as Record<string, unknown>).status = 'x' })
    expect(() => validateSnapshot(agencyColumn, VOCAB)).toThrow(/status/)
    const column = makeSnapshot(c => { (c.updates[0].set as Record<string, unknown>).status = 'x' })
    expect(() => validateSnapshot(column, VOCAB)).toThrow(/status/)
    expect(ALLOWED_COLUMNS.user_accounts.columns).toEqual(['full_name'])
    expect(ALLOWED_COLUMNS.agency_profiles.columns).toEqual(['company_name'])
  })
  it('refuses a [DEMO] tag in a user full_name or an agency company_name', () => {
    expect(() => validateSnapshot(makeSnapshot(c => { (c.updates.find(u => u.table === 'user_accounts')!.set as Record<string, unknown>).full_name = '[DEMO] Nhung' }), VOCAB)).toThrow(/\[DEMO\]/)
    expect(() => validateSnapshot(makeSnapshot(c => { (c.updates.find(u => u.table === 'agency_profiles')!.set as Record<string, unknown>).company_name = '[DEMO] Mây' }), VOCAB)).toThrow(/\[DEMO\]/)
  })
  it('refuses a leftover [DEMO] tag, a duplicate row, a bad uuid and a suitable_for term outside the vocabulary', () => {
    expect(() => validateSnapshot(makeSnapshot(c => { (c.updates[0].set as Record<string, unknown>).name = '[DEMO] Nặn bát' }), VOCAB)).toThrow(/\[DEMO\]/)
    expect(() => validateSnapshot(makeSnapshot(c => { c.updates.push(c.updates[2]) }), VOCAB)).toThrow(/Duplicate/)
    expect(() => validateSnapshot(makeSnapshot(c => { c.updates[2].key = { provider_id: 'nope' } }), VOCAB)).toThrow(/uuid/)
    expect(() => validateSnapshot(makeSnapshot(c => { (c.updates[0].set as Record<string, unknown>).suitable_for = ['Lạ'] }), VOCAB)).toThrow(/vocabulary/)
  })
  it('refuses an invalid slot', () => {
    expect(() => validateSnapshot(makeSnapshot(c => { c.slots[E1] = [{ ...SLOT, end_time: '08:00' }] }), VOCAB)).toThrow(/slot/)
  })
})

describe('run: guards before any write', () => {
  it('refuses when a required migration is missing from the ledger, with no write', async () => {
    const { client, options, deps } = setup({ apply: true }, { ledger: REQUIRED_MIGRATIONS.slice(1) })
    await expect(run(options, deps)).rejects.toThrow(/ledger/)
    expect(writes(client)).toEqual([])
    expect(client.state.log).not.toContain('COMMIT')
  })
  it('refuses when a target row does not exist', async () => {
    const { client, options, deps } = setup({ apply: true })
    const original = client.query.bind(client)
    client.query = async (text: string, values?: unknown[]) => text.startsWith('SELECT ') && text.includes('FROM villages') ? { rows: [] } : original(text, values)
    await expect(run(options, deps)).rejects.toThrow(/not found/)
    expect(writes(client)).toEqual([])
  })
})

describe('run: only synthetic accounts are renamed', () => {
  it('refuses when a target user_accounts row has a real (non example.invalid) e-mail, with no write', async () => {
    const { client, options, deps } = setup({ apply: true }, { nonSynthetic: 1 })
    await expect(run(options, deps)).rejects.toThrow(/not synthetic/)
    expect(writes(client)).toEqual([])
    expect(client.state.log).not.toContain('COMMIT')
  })
})

describe('run: dry run', () => {
  it('writes inside the transaction, verifies, then rolls back; no undo file, no COMMIT', async () => {
    const { client, options, deps, out, log } = setup()
    const report = await run(options, deps)
    expect(client.state.log[0]).toBe('BEGIN')
    expect(writes(client).length).toBeGreaterThan(0)
    expect(client.state.log.at(-1)).toBe('ROLLBACK')
    expect(client.state.log).not.toContain('COMMIT')
    expect(existsSync(join(out, 'undo.json'))).toBe(false)
    expect(report).toMatchObject({ applied: false, changedRows: 7, slotExperiencesChanged: 1 })
    expect(log.lines.join('\n')).toMatch(/rolled back/)
  })
})

describe('run: apply', () => {
  it('writes the undo file before the first write, commits once, adds one audit row and keeps every other count', async () => {
    const { client, options, deps, out } = setup({ apply: true })
    const before = { ...client.state.counts }
    let undoExistedAtFirstWrite: boolean | undefined
    const original = client.query.bind(client)
    client.query = async (text: string, values?: unknown[]) => {
      if (undoExistedAtFirstWrite === undefined && /^(UPDATE|DELETE)/.test(text)) undoExistedAtFirstWrite = readdirOut(out)
      return original(text, values)
    }
    const report = await run(options, deps)
    expect(undoExistedAtFirstWrite).toBe(true)
    expect(client.state.log.at(-1)).toBe('COMMIT')
    expect(client.state.log.filter(entry => entry === 'AUDIT')).toHaveLength(1)
    expect(client.state.counts).toEqual({ ...before, audit_logs: before.audit_logs + 1 })
    expect(Object.values(client.state.slots).flat()).toHaveLength(3)
    const undo = JSON.parse(readFileSync(report.undoFile, 'utf8'))
    expect(undo).toMatchObject({ kind: 'hab-content-load-undo', version: 1, projectRef: DEV_PROJECT_REF })
    expect(undo.before).toHaveLength(7)
    expect(undo.slotsBefore[E1]).toHaveLength(1)
  })
  it('rolls back and throws when a table count changes unexpectedly (here a leaked agency_profiles row)', async () => {
    const { client, options, deps } = setup({ apply: true }, { leak: 'agency_profiles' })
    await expect(run(options, deps)).rejects.toThrow(/agency_profiles/)
    expect(client.state.log).not.toContain('COMMIT')
    expect(client.state.log.at(-1)).toBe('ROLLBACK')
  })
  it('on a database that already holds the content: 0 changes, no write, no undo file, rolled back', async () => {
    const same = { [E1]: [SLOT], [E2]: [SLOT, { ...SLOT, label: 'Ca chiều', start_time: '14:00', end_time: '15:00' }] }
    const { client, options, deps, out, log } = setup({ apply: true }, { changed: false, slotsInDb: same })
    const report = await run(options, deps)
    expect(report).toMatchObject({ changedRows: 0, slotExperiencesChanged: 0, applied: false })
    expect(writes(client)).toEqual([])
    expect(client.state.log).not.toContain('COMMIT')
    expect(readdirOut(out)).toBe(false)
    expect(log.lines.join('\n')).toMatch(/0 of 7 row\(s\) would change/)
  })
})

describe('run: undo', () => {
  async function applied() {
    const first = setup({ apply: true })
    const report = await run(first.options, first.deps)
    return { file: report.undoFile as string, client: first.client, out: first.out }
  }
  it('dry run previews and rolls back; apply restores the saved values and slots and commits', async () => {
    const { file, client } = await applied()
    client.state.log.length = 0
    client.state.written = true // current rows hold the loaded content
    const dry = await run({ apply: false, undo: file, targetProd: false }, { client, vocab: VOCAB, outDir: dir(), now: new Date(), projectRef: DEV_PROJECT_REF, log: quiet() })
    expect(dry).toMatchObject({ restorable: 7, applied: false })
    expect(client.state.log.at(-1)).toBe('ROLLBACK')
    client.state.log.length = 0
    const real = await run({ apply: true, undo: file, targetProd: false }, { client, vocab: VOCAB, outDir: dir(), now: new Date(), projectRef: DEV_PROJECT_REF, log: quiet() })
    expect(real).toMatchObject({ restored: 7 })
    expect(client.state.log.at(-1)).toBe('COMMIT')
    expect(client.state.slots[E1]).toEqual([{ ...SLOT, label: 'Ca cũ' }])
  })
  it('refuses an undo file from another project', async () => {
    const { file, client } = await applied()
    await expect(run({ apply: true, undo: file, targetProd: false }, { client, vocab: VOCAB, outDir: dir(), now: new Date(), projectRef: PROD_PROJECT_REF, log: quiet() })).rejects.toThrow(/not made on this project/)
  })
  it('refuses to restore when a row no longer holds the loaded values', async () => {
    const { file, client } = await applied()
    client.state.written = false // rows differ from the loaded content
    client.state.log.length = 0
    await expect(run({ apply: true, undo: file, targetProd: false }, { client, vocab: VOCAB, outDir: dir(), now: new Date(), projectRef: DEV_PROJECT_REF, log: quiet() })).rejects.toThrow(/no longer hold/)
    expect(client.state.log).not.toContain('COMMIT')
  })
})

describe('exportSnapshot (DEV, read only)', () => {
  it('reads only the allowlisted columns of the given seed ids and returns a checksummed snapshot', async () => {
    const seen: string[] = []
    const client = {
      async query(text: string) {
        seen.push(text)
        if (text.startsWith('SELECT label')) return { rows: [SLOT] }
        if (text.includes('FROM user_accounts')) return { rows: [{ id: U, ...snapshotContent().updates[4].set }] }
        if (text.includes('FROM agency_profiles')) return { rows: [{ id: A, ...snapshotContent().updates[5].set }] }
        if (text.includes('FROM experiences')) return { rows: [{ id: E1, ...snapshotContent().updates[0].set }] }
        if (text.includes('FROM provider_profile_versions')) return { rows: [{ id: P, ...snapshotContent().updates[3].set }] }
        if (text.includes('FROM provider_profiles')) return { rows: [{ id: P, ...snapshotContent().updates[2].set }] }
        if (text.includes('FROM villages')) return { rows: [{ id: V, ...snapshotContent().updates[6].set }] }
        throw new Error(`unexpected ${text}`)
      },
    }
    const snapshot = await exportSnapshot(client, { ids: { experiences: [E1], provider_profiles: [P], villages: [V], user_accounts: [U], agency_profiles: [A] }, projectRef: DEV_PROJECT_REF, now: new Date('2026-11-21T00:00:00Z') })
    expect(snapshot.updates.map((u: { table: string }) => u.table).sort()).toEqual(['agency_profiles', 'experiences', 'provider_profile_versions', 'provider_profiles', 'user_accounts', 'villages'])
    expect(snapshot.slots[E1]).toHaveLength(1)
    expect(snapshot.sha256).toBe(checksum({ updates: snapshot.updates, slots: snapshot.slots }))
    const accountSql = seen.filter(text => text.includes('FROM user_accounts')).join('\n')
    expect(accountSql).toMatch(/SELECT user_id AS id, full_name FROM user_accounts/)
    expect(accountSql).toMatch(/example\.invalid/) // only synthetic accounts are ever exported
    expect(seen.join('\n')).not.toMatch(/password|phone|avatar/)
    validateSnapshot(snapshot, VOCAB)
  })
})

function readdirOut(out: string) {
  try { return require('node:fs').readdirSync(out).some((name: string) => name.startsWith('content-load-undo-')) } catch { return false }
}
