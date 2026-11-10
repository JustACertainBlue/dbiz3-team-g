import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Pool } from 'pg'
import { databaseConfig } from '../../scripts/db/config.mjs'
import { createDbClient, type DbClient } from '@/lib/db/client'
import { AsyncPostgresStore } from '@/lib/db/async-store'
import { withApplicationStore } from '@/lib/db/application-store'
import { demoSessionContextFor } from '@/lib/auth/session'
import { updateAgencyProfile } from '@/lib/prf/agency-service'
import { reviewAgency } from '@/lib/auth/agency-review'

// Issues #83 / #57 on PostgreSQL (opt-in: npm run test:postgres; every change is rolled back). spec-AUT FR-018:
// Request More Information closes a major change like Reject (status Rejected); major_change_reviewed_chk requires
// reviewed_at NOT NULL for Rejected, and agency_one_pending_major_change_uq allows a new Pending Review afterwards.
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

  it('FR-018: Request More Information closes the change (status Rejected, reviewed_at set) and a new change can be submitted', async () => rollback(async () => {
    const row = await decide('Request More Information', 'Hosted test: send the renaming licence.')
    expect(row.review_status).toBe('Rejected')
    expect(row.reviewed_at).not.toBeNull()
    await updateAgencyProfile(agencyId, await demoSessionContextFor('agency'), { company_name: 'Hosted #57 second legal name' })
    const open = (await db.query(`SELECT review_status FROM public.agency_major_change_requests WHERE agency_id=$1 AND review_status IN ('Pending Review','Request More Information')`, [agencyId])).rows
    expect(open).toEqual([{ review_status: 'Pending Review' }])
  }), 30000)

  it('FR-018: Reject is stored with reviewed_at set', async () => rollback(async () => {
    const row = await decide('Reject', 'Hosted test: documents do not match.')
    expect(row.review_status).toBe('Rejected')
    expect(row.reviewed_at).not.toBeNull()
  }), 30000)
})
