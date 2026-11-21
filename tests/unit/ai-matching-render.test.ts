/**
 * Screen 22 must render in the real app: the layout (server) may only hand client components valid component
 * types and a plain string name. Bug: layout.tsx rendered `AgencyNameContext.Provider` (an object, not a component)
 * exported from a 'use client' file → "Element type is invalid. Received a promise that resolves to: [object Object]".
 */
import React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// Server-side render never runs effects, so the role stays 'Guest'; start as Agency to render the new-conversation state.
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>()
  const useState = ((initial: unknown) => actual.useState(initial === 'Guest' ? 'Agency' : initial)) as typeof actual.useState
  return { ...actual, default: { ...actual, useState }, useState }
})
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {} }), redirect: () => { throw new Error('redirect') } }))
vi.mock('@/lib/auth/server-session', () => ({ currentServerSession: async () => ({ authenticated: true, role: 'Tour_Agency', agencyId: 'a1', userId: 'u1' }) }))
vi.mock('@/lib/auth/session', () => ({ sessionDisplayName: async () => 'Lý Gia Hân' }))

const text = (html: string) => html.replace(/<!-- -->/g, '')

describe('screen 22 layout (server) → client boundary', () => {
  it('the layout wraps children in a valid component type (a function), with the name as a string prop', async () => {
    const { default: Layout } = await import('@/app/ai-matching/layout')
    const element = (await Layout({ children: null })) as React.ReactElement<{ name: string }>
    expect(typeof element.type).toBe('function')
    expect(element.props.name).toBe('Lý Gia Hân')
  })
})

describe('screen 22 new-conversation state renders', () => {
  it('greets the Agency contact by name', async () => {
    const { AgencyNameProvider } = await import('@/app/ai-matching/agency-name')
    const { default: Screen } = await import('@/app/ai-matching/page')
    const html = text(renderToString(React.createElement(AgencyNameProvider as React.ComponentType<any>, { name: 'Lý Gia Hân' }, React.createElement(Screen))))
    expect(html).toContain('Chào Lý Gia Hân, đoàn tiếp theo cần gì?')
    expect(html).toContain('Kể về đoàn của bạn')
  })

  it('without a name the greeting is "Chào bạn, đoàn tiếp theo cần gì?"', async () => {
    const { AgencyNameProvider } = await import('@/app/ai-matching/agency-name')
    const { default: Screen } = await import('@/app/ai-matching/page')
    expect(text(renderToString(React.createElement(AgencyNameProvider as React.ComponentType<any>, { name: '' }, React.createElement(Screen))))).toContain('Chào bạn, đoàn tiếp theo cần gì?')
    expect(text(renderToString(React.createElement(Screen)))).toContain('Chào bạn, đoàn tiếp theo cần gì?')
  })
})
