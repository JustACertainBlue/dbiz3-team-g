// Removal of media rows that show a clearly visible person (human request 2026-11-21), used by storage:seed-images --faces.
// The rows are found by the SHA-256 of the object bytes, not by file id (file ids differ between DEV and PROD), and compared
// with go-anh-mat-nguoi-final.json before anything is written: any difference stops the run. No function here connects by itself.
import { createHash } from 'node:crypto'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SHA = /^[0-9a-f]{64}$/
const TABLES = ['profile_media', 'provider_version_media']
const refuse = message => { throw new Error(message) }

/** Table, owner and hash of a row (display order and ids are left out on purpose: they differ between environments). */
export function rowKey(row) {
  const owner = row.experience_id ? `e:${row.experience_id}` : row.provider_id ? `p:${row.provider_id}` : row.agency_id ? `a:${row.agency_id}` : 'none'
  return `${row.table}|${owner}|${row.sha256}|${row.table === 'provider_version_media' ? String(row.version_no) : ''}`
}

/** Validates go-anh-mat-nguoi-final.json (version 2) and returns { rows, retained, hashes, totals }. */
export function parseRemovalList(doc) {
  if (!doc || !Array.isArray(doc.rows) || !Array.isArray(doc.giu_lai) || !Array.isArray(doc.hashes) || !doc.tong) refuse('The face-removal list needs rows, giu_lai, hashes and tong.')
  const hashes = new Set(doc.hashes.map(item => item.sha256))
  for (const sha of hashes) if (!SHA.test(sha ?? '')) refuse(`The face-removal list has a bad sha256 in hashes: ${sha}`)
  const check = (row, where) => {
    if (!TABLES.includes(row.table)) refuse(`${where}: unknown table "${row.table}".`)
    if (!SHA.test(row.sha256 ?? '')) refuse(`${where}: bad sha256.`)
    if (!hashes.has(row.sha256)) refuse(`${where}: sha256 ${row.sha256.slice(0, 8)} is not in hashes.`)
    if (row.table === 'profile_media' && !(UUID.test(row.experience_id ?? '') || UUID.test(row.provider_id ?? ''))) refuse(`${where}: profile_media needs experience_id or provider_id.`)
    if (row.table === 'provider_version_media' && (!UUID.test(row.provider_id ?? '') || row.version_no === undefined || row.version_no === null)) refuse(`${where}: provider_version_media needs provider_id and version_no.`)
  }
  doc.rows.forEach((row, index) => check(row, `rows[${index}]`)); doc.giu_lai.forEach((row, index) => check(row, `giu_lai[${index}]`))
  const count = table => doc.rows.filter(row => row.table === table).length
  if (doc.tong.profile_media !== count('profile_media') || doc.tong.provider_version_media !== count('provider_version_media') || doc.tong.giu_lai !== doc.giu_lai.length)
    refuse(`The face-removal list totals do not add up (tong ${JSON.stringify(doc.tong)} against ${count('profile_media')} + ${count('provider_version_media')} rows and ${doc.giu_lai.length} retained).`)
  return { rows: doc.rows, retained: doc.giu_lai, hashes, totals: doc.tong }
}

/**
 * The list limited to the targets this database has (--skip-missing-targets): a row whose experience or provider is not in
 * `existing` is dropped from both the rows to remove and the rows to keep, and a hash used only by dropped rows is no longer
 * required to be found. What is left is compared as strictly as before. Totals are recomputed; `skipped` counts what was dropped.
 * @param {any} parsed @param {{ experiences: Set<string>, providers: Set<string> }} existing
 */
export function restrictRemovalList(parsed, existing) {
  const here = row => row.experience_id ? existing.experiences.has(row.experience_id) : row.provider_id ? existing.providers.has(row.provider_id) : true
  const rows = parsed.rows.filter(here), retained = parsed.retained.filter(here)
  const count = table => rows.filter(row => row.table === table).length
  return {
    rows, retained, hashes: new Set([...rows, ...retained].map(row => row.sha256)),
    totals: { profile_media: count('profile_media'), provider_version_media: count('provider_version_media'), giu_lai: retained.length },
    skipped: { rows: parsed.rows.length - rows.length, retained: parsed.retained.length - retained.length },
  }
}

const tally = keys => { const map = new Map(); for (const key of keys) map.set(key, (map.get(key) ?? 0) + 1); return map }

/**
 * Rows found in this database against the list (rows to remove plus rows kept on purpose). Every listed hash must exist here.
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function compareRemoval(foundRows, hashesFound, parsed) {
  const problems = []
  for (const sha of parsed.hashes) if (!hashesFound.has(sha)) problems.push(`hash ${sha.slice(0, 12)} not found in this database`)
  const expected = tally([...parsed.rows, ...parsed.retained].map(rowKey)), found = tally(foundRows.map(rowKey))
  for (const [key, n] of expected) if ((found.get(key) ?? 0) < n) problems.push(`missing ${n - (found.get(key) ?? 0)} × ${key}`)
  for (const [key, n] of found) if (n > (expected.get(key) ?? 0)) problems.push(`unexpected ${n - (expected.get(key) ?? 0)} × ${key}`)
  return { ok: problems.length === 0, problems }
}

/** Reads (SELECT only): hashes every image object that a media row or a village cover uses and returns the media rows that use a listed hash. */
export async function findFaceRows(client, storage, parsed, { concurrency = 6 } = {}) {
  const { rows: candidates } = await client.query(`SELECT DISTINCT m.file_id::text AS file_id
    FROM (SELECT file_id FROM public.profile_media UNION SELECT file_id FROM public.provider_version_media
      UNION SELECT cover_image_id FROM public.villages WHERE cover_image_id IS NOT NULL) m
    JOIN public.stored_files f ON f.file_id = m.file_id WHERE f.media_type LIKE 'image/%'`)
  const hashOf = new Map()
  let next = 0
  const worker = async () => {
    while (next < candidates.length) {
      const { file_id } = candidates[next++]
      const bytes = await storage.read(`prf-media/${file_id}`)
      if (bytes) { const sha = createHash('sha256').update(bytes).digest('hex'); if (parsed.hashes.has(sha)) hashOf.set(file_id, sha) }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length) }, worker))
  const ids = [...hashOf.keys()], rows = []
  if (ids.length) {
    const pm = await client.query(`SELECT profile_media_id::text, file_id::text, experience_id::text, provider_id::text, agency_id::text, category, display_order
      FROM public.profile_media WHERE file_id = ANY($1::uuid[])`, [ids])
    for (const row of pm.rows) rows.push({ table: 'profile_media', sha256: hashOf.get(row.file_id), ...row })
    const pvm = await client.query(`SELECT provider_id::text, version_no, file_id::text, category, display_order
      FROM public.provider_version_media WHERE file_id = ANY($1::uuid[])`, [ids])
    for (const row of pvm.rows) rows.push({ table: 'provider_version_media', sha256: hashOf.get(row.file_id), ...row, version_no: String(row.version_no) })
  }
  return { rows, hashesFound: new Set(hashOf.values()), filesByHash: ids.reduce((map, id) => map.set(hashOf.get(id), [...(map.get(hashOf.get(id)) ?? []), id]), new Map()) }
}

/** Deletes the found rows except the retained ones; returns the rows that were really deleted (full rows, for the undo file). */
export async function removeFaceRows(client, foundRows, parsed) {
  const keep = tally(parsed.retained.map(rowKey)), retained = [], doomed = []
  for (const row of foundRows) {
    const key = rowKey(row)
    if ((keep.get(key) ?? 0) > 0) { keep.set(key, keep.get(key) - 1); retained.push(row) } else doomed.push(row)
  }
  const pm = doomed.filter(row => row.table === 'profile_media'), pvm = doomed.filter(row => row.table === 'provider_version_media')
  const removed = { profile_media: [], provider_version_media: [], retained }
  if (pm.length) removed.profile_media = (await client.query('DELETE FROM public.profile_media WHERE profile_media_id = ANY($1::uuid[]) RETURNING *', [pm.map(row => row.profile_media_id)])).rows
  if (pvm.length) removed.provider_version_media = (await client.query(
    'DELETE FROM public.provider_version_media WHERE (file_id, provider_id, version_no) IN (SELECT * FROM unnest($1::uuid[], $2::uuid[], $3::int[])) RETURNING *',
    [pvm.map(row => row.file_id), pvm.map(row => row.provider_id), pvm.map(row => Number(row.version_no))])).rows
  return removed
}
