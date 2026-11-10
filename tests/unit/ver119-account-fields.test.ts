/**
 * Issue #225 — VER119 Account Information shows the F-AUTH-21 fields of the reviewed Agency account
 * (screen-spec-VER119.md §3: #2 "Account id | `user_id`", #3 "Role / admin subtype | `role`, `admin_type` … admin_type
 * shown only for ADMIN", #5 "Organization | `organization`"), next to status, created date and last login already shown.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { agencyReviews } from '../../src/lib/auth/agency-review'
import { demoSessionContextFor } from '../../src/lib/auth/session'
import { demoRepository } from '../../src/lib/demo/json-repository'

describe('#225 | VER119 account id, role and organization', () => {
  it('each review with an account carries user_id, role, organization; admin_type only for ADMIN', async () => {
    demoRepository().reset()
    const items = (await agencyReviews((await demoSessionContextFor('hdt')))).filter(item => item.account)
    expect(items.length).toBeGreaterThan(0)
    const repo = demoRepository()
    for (const item of items) {
      const account = item.account!
      const row = repo.find('user_accounts', r => r.user_id === account.user_id)
      expect(row, item.id).toBeTruthy()
      expect(account.role).toBe(row!.role_code)
      expect('admin_type' in account).toBe(row!.role_code === 'ADMIN')
      expect(account.organization, item.id).toBe(repo.find('agency_profiles', p => p.user_id === row!.user_id)?.company_name
        || String((item.fields as Record<string, unknown>).company_name || ''))
    }
  })

  it('the review page labels the new fields', () => {
    const page = readFileSync('src/app/admin/agencies/page.tsx', 'utf8')
    for (const [key, label] of [['user_id', 'Mã tài khoản'], ['role', 'Vai trò'], ['organization', 'Tổ chức']]) {
      expect(page).toContain(`${key}:'${label}'`)
    }
  })
})
