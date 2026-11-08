import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Pool } from 'pg'
import { databaseConfig } from '../../scripts/db/config.mjs'
import { createDbClient, type DbClient } from '@/lib/db/client'
import { AsyncPostgresStore } from '@/lib/db/async-store'
import { withApplicationStore } from '@/lib/db/application-store'
import { demoSessionContextFor } from '@/lib/auth/session'
import { updateAgencyProfile } from '@/lib/prf/agency-service'
import { reviewAgency } from '@/lib/auth/agency-review'

// Issue #83 on PostgreSQL (opt-in: npm run test:postgres; every change is rolled back). spec-AUT FR-018 allows
// Request More Information on a major Agency change (PRF BR-017); major_change_reviewed_chk requires reviewed_at
// IS NULL for Pending Review / Request More Information and NOT NULL for Approved / Rejected.
const agencyId = '02e568d8-d65e-54b1-a554-b411150d1dcb'
describe.skipIf(process.env.HAB_TEST_POSTGRES !== '1')('Hosted PostgreSQL | HDT decision on a major Agency change (#83)', () => {
  let db: DbClient
  beforeAll(() => { db = createDbClient(new Pool(databaseConfig(process.env))) })
  afterAll(async () => { if (db) await db.close() })
  async function rollback(work: () => Promise<void>) {
    const sentinel = new Error('ROLLBACK_HOSTED_MAJOR_CHANGE_TEST')
    try { await db.transaction(async () => withApplicationStore(new AsyncPostgresStore(db), async () => { await work(); throw sentinel })) }
    catch (error) { if (error !== sentinel) throw error }
  }
  async function decide(decision: string, comment: string) {
    await updateAgencyProfile(agencyId, await demoSessionContextFor('agency'), { company_name: 'Hosted #83 legal name' })
    const row = (await db.query(`SELECT major_change_id FROM public.agency_major_change_requests WHERE agency_id=$1 AND review_status='Pending Review' ORDER BY submitted_at DESC LIMIT 1`, [agencyId])).rows[0]
    expect(row).toBeDefined()
    await reviewAgency(await demoSessionContextFor('hdt'), row.major_change_id, 'change', decision, comment)
    return (await db.query(`SELECT review_status, reviewed_at FROM public.agency_major_change_requests WHERE major_change_id=$1`, [row.major_change_id])).rows[0]
  }

  it('FR-018: Request More Information is stored (status Request More Information, reviewed_at NULL)', async () => rollback(async () => {
    expect(await decide('Request More Information', 'Hosted test: send the renaming licence.')).toMatchObject({ review_status: 'Request More Information', reviewed_at: null })
  }), 30000)

  it('FR-018: Reject is stored with reviewed_at set', async () => rollback(async () => {
    const row = await decide('Reject', 'Hosted test: documents do not match.')
    expect(row.review_status).toBe('Rejected')
    expect(row.reviewed_at).not.toBeNull()
  }), 30000)
})
