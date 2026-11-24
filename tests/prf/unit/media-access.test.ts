// Step 2A (human request 2026-11-20): the media permission check reads facts for one file_id instead of whole tables.
// Allow/deny results must stay exactly as before: the previous logic is kept here verbatim (legacyAllowed) and compared
// with decideMediaAccess on every stored file of the fixtures, for every kind of session, before and after the policy
// fixtures used by the existing tests. The one deliberate addition is the village cover image (villages.cover_image_id),
// which the old logic refused for everyone although the UI shows it publicly.
import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository as jsonRepository } from '@/lib/demo/json-repository'
import { demoRepository } from '@/lib/db/application-store'
import { toSessionContext, type SessionContext } from '@/lib/auth/session'
import { decideMediaAccess, loadMediaFacts, loadMediaFactsFromSql } from '@/lib/prf/media-access'
import { agencyOwnerSession, guestSession, hdtSession, providerSession, ubndSession, SEED_IDS } from '../helpers/mockSession'

const repo = jsonRepository()
// On DEV and PROD every seed file lives at prf-media/<file_id> (storage:catalog); the CSV fixtures still say seed/…
const liveKeys = () => { for (const file of repo.all('stored_files')) repo.update('stored_files', row => row.file_id === file.file_id, { storage_key: `prf-media/${file.file_id}` }) }
beforeEach(() => { repo.reset(); liveKeys() })

/** The permission part of readProfileMedia before step 2A, unchanged except that it returns the decision. */
async function legacyAllowed(session: SessionContext, id: string) {
  const repo = demoRepository(), file = (await repo.find('stored_files', row => row.file_id === id))
  if (!file || file.storage_key !== `prf-media/${id}`) return 'missing'
  let allowed = session.authenticated && file.uploaded_by === session.userId
  const canManage = async (providerId: string) => {
    const provider = (await repo.find('provider_profiles', row => row.provider_id === providerId))
    return Boolean(provider && session.authenticated && (session.providerId === providerId || (session.role === 'ADMIN' && (session.adminType === 'HDT' || session.adminType === 'UBND' && session.assignedVillageId === provider.village_id))))
  }
  const isPublicProvider = async (provider: Awaited<ReturnType<typeof repo.find>>) => Boolean(provider && provider.verification_status === 'Verified' && provider.published_version_no && (await repo.find('provider_profile_versions', row => row.provider_id === provider.provider_id && row.version_no === provider.published_version_no && row.version_status === 'Verified')) && (await repo.find('user_accounts', row => row.user_id === provider.user_id && row.account_status === 'Active')) && (await repo.find('villages', row => row.village_id === provider.village_id && row.is_active === 'true')))
  for (const version of (await repo.all('provider_version_documents')).filter(row => row.file_id === id)) if ((await canManage(version.provider_id))) allowed = true
  for (const media of (await repo.all('provider_version_media')).filter(row => row.file_id === id)) {
    const provider = (await repo.find('provider_profiles', row => row.provider_id === media.provider_id))
    if ((await canManage(media.provider_id)) || file.media_type.startsWith('image/') && (await isPublicProvider(provider)) && provider!.published_version_no === media.version_no) allowed = true
  }
  for (const media of (await repo.all('profile_media')).filter(row => row.file_id === id && row.experience_id)) {
    const exp = (await repo.find('experiences', row => row.experience_id === media.experience_id))
    const provider = exp && (await repo.find('provider_profiles', row => row.provider_id === exp.provider_id))
    if (exp && ((await canManage(exp.provider_id)) || file.media_type.startsWith('image/') && !exp.archived_at && (await isPublicProvider(provider)))) allowed = true
  }
  return allowed ? 'allowed' : 'denied'
}

async function newDecision(session: SessionContext, id: string) {
  const facts = await loadMediaFacts(id)
  if (!facts) return 'missing'
  return decideMediaAccess(session, facts).allowed ? 'allowed' : 'denied'
}

async function sessions() {
  const otherProvider = repo.all('provider_profiles').find(row => row.provider_id !== SEED_IDS.provider1Verified)!
  const uploader = repo.all('stored_files').find(row => row.uploaded_by)?.uploaded_by
  const list: Array<[string, SessionContext]> = [
    ['guest', await toSessionContext(guestSession())],
    ['owner provider', await toSessionContext(providerSession())],
    ['other provider', { ...(await toSessionContext(providerSession())), providerId: otherProvider.provider_id, userId: otherProvider.user_id }],
    ['agency', await toSessionContext(agencyOwnerSession())],
    ['HDT', await toSessionContext(hdtSession())],
    ['UBND village 1', await toSessionContext(ubndSession())],
    ['UBND village 2', await toSessionContext(ubndSession(SEED_IDS.village2))],
  ]
  if (uploader) list.push(['uploader', { ...(await toSessionContext(guestSession())), authenticated: true, userId: uploader } as SessionContext])
  return list
}

async function compareAll() {
  const ids = [...repo.all('stored_files').map(row => row.file_id), '00000000-0000-4000-8000-000000000000']
  const differences: string[] = []
  let checked = 0
  for (const [label, session] of await sessions()) for (const id of ids) {
    const before = await legacyAllowed(session, id), after = await newDecision(session, id)
    checked += 1
    if (before !== after) differences.push(`${label} ${id}: ${before} → ${after}`)
  }
  return { differences, checked }
}

describe('decideMediaAccess keeps every previous allow/deny result', () => {
  it('on the seed fixtures, for every stored file and every kind of session', async () => {
    const { differences, checked } = await compareAll()
    expect(checked).toBeGreaterThan(100)
    expect(differences).toEqual([])
  })
  it('after the policy changes the existing tests use (version, account, village, archive, documents)', async () => {
    const provider = repo.find('provider_profiles', row => row.provider_id === SEED_IDS.provider1Verified)!
    const image = repo.all('provider_version_media').find(row => row.provider_id === provider.provider_id)
    const experienceMedia = repo.all('profile_media').find(row => row.experience_id)
    const scenarios: Array<[string, () => void]> = [
      ['older version media', () => image && repo.update('provider_version_media', row => row.file_id === image.file_id, { version_no: '999' })],
      ['suspended account', () => repo.update('user_accounts', row => row.user_id === provider.user_id, { account_status: 'Suspended' })],
      ['inactive village', () => repo.update('villages', row => row.village_id === provider.village_id, { is_active: 'false' })],
      ['archived experience', () => experienceMedia && repo.update('experiences', row => row.experience_id === experienceMedia.experience_id, { archived_at: '2026-11-20T00:00:00Z' })],
      ['unverified provider', () => repo.update('provider_profiles', row => row.provider_id === provider.provider_id, { verification_status: 'Pending' })],
      ['document linked as media too', () => image && repo.insert('provider_version_documents', { provider_id: provider.provider_id, version_no: '1', file_id: image.file_id, document_type: 'Business Registration Certificate' })],
      ['pdf media type', () => image && repo.update('stored_files', row => row.file_id === image.file_id, { media_type: 'application/pdf' })],
    ]
    for (const [name, change] of scenarios) {
      repo.reset(); liveKeys(); change()
      const { differences } = await compareAll()
      expect({ name, differences }).toEqual({ name, differences: [] })
    }
  })
})

describe('public (cacheable) images', () => {
  it('marks only images every guest may see as public; documents and PDFs never', async () => {
    const guest = await toSessionContext(guestSession())
    for (const file of repo.all('stored_files')) {
      const facts = (await loadMediaFacts(file.file_id))!
      const decision = decideMediaAccess(guest, facts)
      if (decision.public) {
        expect(decision.allowed).toBe(true)
        expect(file.media_type.startsWith('image/')).toBe(true)
        expect(repo.all('provider_version_documents').some(row => row.file_id === file.file_id)).toBe(false)
      }
    }
    const pdf = repo.all('stored_files').find(row => row.media_type === 'application/pdf')
    if (pdf) expect(decideMediaAccess(guest, (await loadMediaFacts(pdf.file_id))!).public).toBe(false)
  })
  it('a provider document is never public, even when the same file is also linked as published media', async () => {
    const provider = repo.find('provider_profiles', row => row.provider_id === SEED_IDS.provider1Verified)!
    const image = repo.all('provider_version_media').find(row => row.provider_id === provider.provider_id && row.version_no === provider.published_version_no)!
    const facts = (await loadMediaFacts(image.file_id))!
    expect(decideMediaAccess(await toSessionContext(guestSession()), facts).public).toBe(true)
    repo.insert('provider_version_documents', { provider_id: provider.provider_id, version_no: provider.published_version_no, file_id: image.file_id, document_type: 'Business Registration Certificate' })
    const owner = await toSessionContext(providerSession())
    expect(decideMediaAccess(owner, (await loadMediaFacts(image.file_id))!)).toEqual({ allowed: true, public: false })
    expect(decideMediaAccess(await toSessionContext(guestSession()), (await loadMediaFacts(image.file_id))!).public).toBe(false)
  })
  it('registration documents (registration-documents/…) are not served by the media route at all', async () => {
    repo.insert('stored_files', { file_id: '11111111-2222-4333-8444-555555555555', storage_key: 'registration-documents/11111111-2222-4333-8444-555555555555', file_name: 'r.pdf', media_type: 'image/jpeg', file_size_bytes: '10', width_px: '', height_px: '', uploaded_by: '', created_at: '2026-11-20T00:00:00Z' })
    expect(await loadMediaFacts('11111111-2222-4333-8444-555555555555')).toBeNull()
  })
  it('a village cover image of an active village is public (new: the old logic refused it)', async () => {
    const image = repo.all('stored_files').find(row => row.media_type.startsWith('image/') && row.storage_key === `prf-media/${row.file_id}`)!
    const village = repo.all('villages').find(row => row.is_active === 'true')!
    const unlinked = '22222222-3333-4444-8555-666666666666'
    repo.insert('stored_files', { ...image, file_id: unlinked, storage_key: `prf-media/${unlinked}`, uploaded_by: '' })
    const guest = await toSessionContext(guestSession())
    expect(decideMediaAccess(guest, (await loadMediaFacts(unlinked))!)).toEqual({ allowed: false, public: false })
    repo.update('villages', row => row.village_id === village.village_id, { cover_image_id: unlinked })
    expect(decideMediaAccess(guest, (await loadMediaFacts(unlinked))!)).toEqual({ allowed: true, public: true })
    repo.update('villages', row => row.village_id === village.village_id, { is_active: 'false' })
    expect(decideMediaAccess(guest, (await loadMediaFacts(unlinked))!)).toEqual({ allowed: false, public: false })
  })
})

describe('loadMediaFactsFromSql', () => {
  it('reads the facts of one file with a single query keyed by file_id (no whole-table read)', async () => {
    const calls: Array<{ sql: string, params?: unknown[] }> = []
    const db = { query: async (sql: string, params?: unknown[]) => { calls.push({ sql, params }); return { rows: [], rowCount: 0 } } }
    expect(await loadMediaFactsFromSql(db, '0c22e70d-91d7-5347-8c9a-74fa00558912')).toBeNull()
    expect(calls).toHaveLength(1)
    expect(calls[0].params).toEqual(['0c22e70d-91d7-5347-8c9a-74fa00558912'])
    expect(calls[0].sql).toMatch(/WHERE f\.file_id\s*=\s*\$1/)
    expect(await loadMediaFactsFromSql(db, 'not-a-uuid')).toBeNull()
    expect(calls).toHaveLength(1)
  })
})
