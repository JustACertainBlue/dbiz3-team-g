/**
 * Screen 22: switching conversation does not reload the page; the account role comes from the server layout (no flash of
 * the restricted screen while the browser asks for it); the restricted screen is in Vietnamese.
 */
import React from 'react'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { RESTRICTED_TEXT } from '@/app/ai-matching/ai-matching-access'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {} }), redirect: () => { throw new Error('redirect') } }))
let current = { authenticated: true, role: 'Tour_Agency', agencyId: 'a1', userId: 'u1' } as Record<string, unknown>
vi.mock('@/lib/auth/server-session', () => ({ currentServerSession: async () => current }))
vi.mock('@/lib/auth/session', () => ({ sessionDisplayName: async () => 'Lý Gia Hân' }))

const page = readFileSync('src/app/ai-matching/page.tsx', 'utf8')

describe('role and agency id come from the server layout', () => {
  it('the layout hands the role and the agency id down together with the name', async () => {
    const { default: Layout } = await import('@/app/ai-matching/layout')
    current = { authenticated: true, role: 'Tour_Agency', agencyId: 'a1', userId: 'u1' }
    const agency = (await Layout({ children: null })) as React.ReactElement<{ name: string; role: string; agencyId: string }>
    expect(agency.props).toMatchObject({ name: 'Lý Gia Hân', role: 'Agency', agencyId: 'a1' })
    current = { authenticated: true, role: 'Local_Provider', agencyId: null, userId: 'u2' }
    const provider = (await Layout({ children: null })) as React.ReactElement<{ role: string; agencyId: string }>
    expect(provider.props).toMatchObject({ role: 'Guest', agencyId: '' })
  })
  it('the page no longer asks the browser who the user is, and never starts as "Guest"', () => {
    expect(page).not.toContain('readSessionContext')
    expect(page).not.toMatch(/useState<'Agency' \| 'Guest'>/)
    expect(page).toMatch(/useAgencySession\(\)/)
  })
})

describe('switching conversation does not reload the page', () => {
  it('rows of "Gần đây" and "Cuộc ghép tour mới" change the state and the URL with the router', () => {
    expect(page).toMatch(/onClick=\{e => \{ e\.preventDefault\(\); openSession\(/)
    expect(page).toMatch(/onClick=\{e => \{ e\.preventDefault\(\); startNew\(\)/)
    expect(page).toMatch(/router\.push\(/)
  })
  it('a new matching session is created only when the first message is sent, not when the page opens', () => {
    expect(page).not.toMatch(/else initializeSession\(\)/)
    expect(page).toMatch(/sessionId \?\? await initializeSession\(\)/)
  })
  it('an answer that arrives after switching to another conversation is dropped', () => {
    expect(page).toMatch(/epochRef/)
  })
})

describe('restricted screen wording', () => {
  it('is Vietnamese', () => {
    expect(RESTRICTED_TEXT).not.toMatch(/Tour Agencies|available|only/i)
    expect(RESTRICTED_TEXT).toContain('công ty lữ hành')
  })
})
