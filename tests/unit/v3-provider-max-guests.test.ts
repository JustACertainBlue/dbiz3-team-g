import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
;(globalThis as { React?: typeof React }).React = React
const cookie = vi.hoisted(() => ({ account: 'agency' }))
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => ({ value: cookie.account }) }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }), redirect: () => { throw new Error('redirect') }, notFound: () => { throw new Error('notFound') } }))
import { demoRepository } from '@/lib/demo/json-repository'
import ProviderPage from '@/app/explore/providers/[id]/page'
import { addVillageCovers } from '../helpers/village-covers'

// Screen 24: the request form gets each experience's maximum guests from the stored experiences.max_participants
// (loadExploreRuntime = snapshot of the application store: PostgreSQL in dev and production), not from a constant or the CSV seed.
const PROVIDER = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'

function find(node: unknown, predicate: (props: Record<string, unknown>) => boolean): Record<string, unknown> | null {
  if (!node || typeof node !== 'object') return null
  const element = node as { props?: Record<string, unknown> }
  if (element.props && predicate(element.props)) return element.props
  const children = element.props?.children
  for (const child of Array.isArray(children) ? children : [children]) {
    const hit = find(child, predicate)
    if (hit) return hit
  }
  return null
}

describe('24: guests maximum per experience comes from the stored experience', () => {
  beforeEach(() => { demoRepository().reset(); addVillageCovers(demoRepository()) })
  const experiences = async () => {
    cookie.account = 'agency'
    const tree = await ProviderPage({ params: { id: PROVIDER }, searchParams: {} })
    return (find(tree, props => Array.isArray(props.experiences) && 'basePath' in props)?.experiences ?? []) as { id: string; name: string; max?: number }[]
  }
  it('max equals max_participants of each row, and follows a change of the row', async () => {
    const repo = demoRepository()
    const mine = repo.all('experiences').filter(row => row.provider_id === PROVIDER && !row.archived_at)
    expect(mine.length).toBeGreaterThan(0)
    const before = await experiences()
    for (const item of before) expect(item.max).toBe(Number(mine.find(row => row.experience_id === item.id)!.max_participants))
    repo.update('experiences', row => row.experience_id === before[0].id, { max_participants: '7' })
    expect((await experiences())[0].max).toBe(7)
    repo.update('experiences', row => row.experience_id === before[0].id, { max_participants: '9' })
    expect((await experiences())[0].max).toBe(9)
  })
  it('the page does not use the CSV seed loader or a fixed number for it', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync('src/app/explore/providers/[id]/page.tsx', 'utf8')
    expect(source).toContain('loadExploreRuntime()')
    expect(source).not.toContain('loadExploreSeed')
  })
})
