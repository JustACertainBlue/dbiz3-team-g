// Who may read a prf-media file, and whether every Guest may (step 2A, human request 2026-11-20).
// Facts about one file are read by file_id — one SQL query on PostgreSQL — instead of whole tables; the decision is a
// pure function with the same allow/deny results as before (tests/prf/unit/media-access.test.ts compares it with the
// previous logic). Added on purpose: the cover image of an active village (villages.cover_image_id) is public.
import type { SessionContext } from '../auth/session'
import type { SqlExecutor } from '../db/client'
import { AsyncPostgresStore } from '../db/async-store'
import { demoRepository, type ApplicationStore } from '../db/application-store'
import type { DemoRow } from '../demo/types'

interface ProviderLink { provider_id: string, village_id: string | null, provider_exists: boolean }
export interface MediaFacts {
  file: { file_id: string, storage_key: string, file_name: string, media_type: string, file_size_bytes: string, uploaded_by: string | null }
  /** provider_version_documents rows whose provider exists */
  documents: Array<{ provider_id: string, village_id: string | null }>
  /** provider_version_media rows */
  versionMedia: Array<ProviderLink & { provider_public: boolean, published_matches: boolean }>
  /** profile_media rows of an existing Experience */
  experienceMedia: Array<ProviderLink & { archived: boolean, provider_public: boolean }>
  /** villages using the file as cover image */
  covers: Array<{ village_id: string, active: boolean }>
}
export interface MediaDecision { allowed: boolean, public: boolean }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The cache/ETag version of a file: changes when the stored bytes are replaced (refresh scripts update the size).
 * Defined in media-urls.ts so the URLs the UI gets carry the same ?v= the route compares. */
export { mediaVersion } from './media-urls'

export function decideMediaAccess(session: SessionContext, facts: MediaFacts): MediaDecision {
  const image = facts.file.media_type.startsWith('image/')
  const canManage = (link: { provider_id: string, village_id: string | null, provider_exists?: boolean }) =>
    link.provider_exists !== false && session.authenticated && (session.providerId === link.provider_id ||
      (session.role === 'ADMIN' && (session.adminType === 'HDT' || (session.adminType === 'UBND' && session.assignedVillageId === link.village_id))))
  const everyone = image && (facts.versionMedia.some(link => link.provider_public && link.published_matches)
    || facts.experienceMedia.some(link => !link.archived && link.provider_public)
    || facts.covers.some(cover => cover.active))
  const allowed = (session.authenticated && facts.file.uploaded_by === session.userId)
    || facts.documents.some(canManage) || facts.versionMedia.some(canManage) || facts.experienceMedia.some(canManage) || everyone
  return { allowed, public: everyone && facts.documents.length === 0 }
}

const PUBLIC_PROVIDER = `COALESCE(p.verification_status='Verified' AND p.published_version_no IS NOT NULL
  AND EXISTS(SELECT 1 FROM public.provider_profile_versions pv WHERE pv.provider_id=p.provider_id AND pv.version_no=p.published_version_no AND pv.version_status='Verified')
  AND EXISTS(SELECT 1 FROM public.user_accounts u WHERE u.user_id=p.user_id AND u.account_status='Active')
  AND EXISTS(SELECT 1 FROM public.villages pvil WHERE pvil.village_id=p.village_id AND pvil.is_active),false)`

/** One query keyed by file_id (indexes: 20261120100000_hab_media_file_indexes.sql). */
export async function loadMediaFactsFromSql(db: SqlExecutor, id: string): Promise<MediaFacts | null> {
  if (!UUID.test(id)) return null
  const result = await db.query(`SELECT f.file_id::text AS file_id,f.storage_key,f.file_name,f.media_type,f.file_size_bytes::text AS file_size_bytes,f.uploaded_by::text AS uploaded_by,
    COALESCE((SELECT json_agg(json_build_object('provider_id',d.provider_id,'village_id',p.village_id))
      FROM public.provider_version_documents d JOIN public.provider_profiles p ON p.provider_id=d.provider_id WHERE d.file_id=f.file_id),'[]'::json) AS documents,
    COALESCE((SELECT json_agg(json_build_object('provider_id',m.provider_id,'village_id',p.village_id,'provider_exists',p.provider_id IS NOT NULL,
        'provider_public',${PUBLIC_PROVIDER},'published_matches',COALESCE(p.published_version_no=m.version_no,false)))
      FROM public.provider_version_media m LEFT JOIN public.provider_profiles p ON p.provider_id=m.provider_id WHERE m.file_id=f.file_id),'[]'::json) AS version_media,
    COALESCE((SELECT json_agg(json_build_object('provider_id',e.provider_id,'village_id',p.village_id,'provider_exists',p.provider_id IS NOT NULL,
        'archived',e.archived_at IS NOT NULL,'provider_public',${PUBLIC_PROVIDER}))
      FROM public.profile_media pm JOIN public.experiences e ON e.experience_id=pm.experience_id
      LEFT JOIN public.provider_profiles p ON p.provider_id=e.provider_id WHERE pm.file_id=f.file_id),'[]'::json) AS experience_media,
    COALESCE((SELECT json_agg(json_build_object('village_id',v.village_id,'active',v.is_active)) FROM public.villages v WHERE v.cover_image_id=f.file_id),'[]'::json) AS covers
    FROM public.stored_files f WHERE f.file_id=$1::uuid`, [id])
  const row = result.rows[0]
  const isMediaKey = row && (row.storage_key === `prf-media/${id}` || row.storage_key.startsWith('seed/'))
  if (!isMediaKey) return null
  return {
    file: { file_id: row.file_id, storage_key: row.storage_key, file_name: row.file_name, media_type: row.media_type, file_size_bytes: row.file_size_bytes, uploaded_by: row.uploaded_by ?? null },
    documents: row.documents, versionMedia: row.version_media, experienceMedia: row.experience_media, covers: row.covers,
  }
}

/** Automated-test fixtures (JSON rows, string values): same facts, read from the in-memory tables. */
async function loadMediaFactsFromStore(repo: ApplicationStore, id: string): Promise<MediaFacts | null> {
  const file = await repo.find('stored_files', row => row.file_id === id)
  const isMediaKey = file && (file.storage_key === `prf-media/${id}` || file.storage_key.startsWith('seed/'))
  if (!isMediaKey) return null
  const [providers, versions, users, villages, documents, versionMedia, profileMedia, experiences] = await Promise.all(
    ['provider_profiles', 'provider_profile_versions', 'user_accounts', 'villages', 'provider_version_documents', 'provider_version_media', 'profile_media', 'experiences'].map(name => repo.all(name)))
  const provider = (id: string) => providers.find(row => row.provider_id === id)
  const isPublic = (p: DemoRow | undefined) => Boolean(p && p.verification_status === 'Verified' && p.published_version_no
    && versions.some(row => row.provider_id === p.provider_id && row.version_no === p.published_version_no && row.version_status === 'Verified')
    && users.some(row => row.user_id === p.user_id && row.account_status === 'Active')
    && villages.some(row => row.village_id === p.village_id && row.is_active === 'true'))
  return {
    file: { file_id: file.file_id, storage_key: file.storage_key, file_name: file.file_name, media_type: file.media_type, file_size_bytes: file.file_size_bytes, uploaded_by: file.uploaded_by || null },
    documents: documents.filter(row => row.file_id === id).flatMap(row => { const p = provider(row.provider_id); return p ? [{ provider_id: row.provider_id, village_id: p.village_id }] : [] }),
    versionMedia: versionMedia.filter(row => row.file_id === id).map(row => {
      const p = provider(row.provider_id)
      return { provider_id: row.provider_id, village_id: p?.village_id ?? null, provider_exists: Boolean(p), provider_public: isPublic(p), published_matches: Boolean(p) && p!.published_version_no === row.version_no }
    }),
    experienceMedia: profileMedia.filter(row => row.file_id === id && row.experience_id).flatMap(row => {
      const experience = experiences.find(exp => exp.experience_id === row.experience_id)
      if (!experience) return []
      const p = provider(experience.provider_id)
      return [{ provider_id: experience.provider_id, village_id: p?.village_id ?? null, provider_exists: Boolean(p), archived: Boolean(experience.archived_at), provider_public: isPublic(p) }]
    }),
    covers: villages.filter(row => row.cover_image_id === id).map(row => ({ village_id: row.village_id, active: row.is_active === 'true' })),
  }
}

export async function loadMediaFacts(id: string): Promise<MediaFacts | null> {
  if (!UUID.test(id)) return null
  const repo = demoRepository()
  return repo instanceof AsyncPostgresStore ? loadMediaFactsFromSql(repo.executor(), id) : loadMediaFactsFromStore(repo, id)
}
