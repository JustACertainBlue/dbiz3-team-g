/**
 * Issue #160 — ADM118 disable confirmation has an optional Reason (screen-spec-ADM118.md:30 element #4;
 * spec-AUT FR-022 input "reason (Text; Optional — for disable)"). The reason reaches
 * account_status_history.reason; an empty field keeps the default text (decision 09/11).
 */
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { accountAction } from '@/lib/auth/admin-accounts'
import { demoSessionContextFor } from '@/lib/auth/session'
import { demoRepository } from '@/lib/demo/json-repository'
import { PATCH as usersRoute } from '@/app/api/auth/users/route'
import { DEFAULT_DISABLE_REASON, accountActionBody } from '@/app/admin/users/account-action'

async function latestReason(userId: string) {
  const rows = demoRepository().all('account_status_history').filter(row => row.user_id === userId)
  return rows.sort((a, b) => a.changed_at.localeCompare(b.changed_at)).at(-1)?.reason
}

async function setup() {
  const actor = await demoSessionContextFor('hdt')
  const target = (await demoSessionContextFor('agency')).userId!
  return { actor, target }
}

// Each test leaves the shared fixture account enabled again, also when an assertion fails.
afterEach(async () => {
  const { actor, target } = await setup()
  if (demoRepository().find('user_accounts', row => row.user_id === target)!.account_status === 'Disabled') await accountAction(actor, target, 'enable')
})

describe('#160 | the disable reason is stored', () => {
  it('a typed reason is stored (trimmed)', async () => {
    const { actor, target } = await setup()
    await accountAction(actor, target, 'disable', '  Tài khoản thử nghiệm, khoá theo yêu cầu  ')
    expect(await latestReason(target)).toBe('Tài khoản thử nghiệm, khoá theo yêu cầu')
    await accountAction(actor, target, 'enable')
  })

  it.each([['no reason', undefined], ['empty', ''], ['spaces only', '   ']])('%s → the default text', async (_label, reason) => {
    const { actor, target } = await setup()
    await accountAction(actor, target, 'disable', reason)
    expect(await latestReason(target)).toBe('Disabled by administrator')
    await accountAction(actor, target, 'enable')
  })

  it('enable ignores a reason (reason is for disable only)', async () => {
    const { actor, target } = await setup()
    await accountAction(actor, target, 'disable', 'x')
    await accountAction(actor, target, 'enable', 'should not be stored')
    expect(await latestReason(target)).toBe('Restored previous status')
  })

  it('a reason that is not text is refused and nothing changes', async () => {
    const { actor, target } = await setup()
    const before = demoRepository().find('user_accounts', row => row.user_id === target)!.account_status
    await expect(accountAction(actor, target, 'disable', 42)).rejects.toThrow('INVALID_REASON')
    expect(demoRepository().find('user_accounts', row => row.user_id === target)!.account_status).toBe(before)
  })
})

describe('#160 | PATCH /api/auth/users passes the reason', () => {
  it('stores the reason sent by the screen', async () => {
    const { target } = await setup()
    const call = (body: unknown) => usersRoute(new Request('http://localhost/api/auth/users', {
      method: 'PATCH', headers: { 'content-type': 'application/json', cookie: 'hab_demo_account=hdt' }, body: JSON.stringify(body),
    }))
    const response = await call({ user_id: target, action: 'disable', reason: 'Lý do từ màn ADM118' })
    expect(response.status).toBe(200)
    expect(await latestReason(target)).toBe('Lý do từ màn ADM118')
    expect((await call({ user_id: target, action: 'enable' })).status).toBe(200)
  })
})

describe('#160 | ADM118 screen', () => {
  it('the default text is the one the server stores', () => {
    expect(DEFAULT_DISABLE_REASON).toBe('Disabled by administrator')
  })

  it('disable sends the typed reason; an empty field sends none', () => {
    const active = { user_id: 'u1', status: 'Approved' }
    expect(accountActionBody(active, ' Vi phạm ')).toEqual({ user_id: 'u1', action: 'disable', reason: 'Vi phạm' })
    expect(accountActionBody(active, '  ')).toEqual({ user_id: 'u1', action: 'disable' })
  })

  it('enable never sends a reason', () => {
    expect(accountActionBody({ user_id: 'u1', status: 'Disabled' }, 'x')).toEqual({ user_id: 'u1', action: 'enable' })
  })

  it('the disable confirmation shows an optional Reason field and uses accountActionBody', () => {
    const page = readFileSync('src/app/admin/users/page.tsx', 'utf8')
    expect(page).toMatch(/id="disable-reason"/)
    expect(page).toMatch(/Lý do \(không bắt buộc\)/)
    expect(page).toMatch(/accountActionBody\(/)
  })
})
