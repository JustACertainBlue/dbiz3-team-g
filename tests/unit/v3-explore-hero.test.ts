/**
 * Defect D1: Explore home hero background image and overlay.
 * Verifies that screens 01 and 21 (/explore) render the hero background image (.v3x-hero__img)
 * with the ambient gradient overlay (.v3x-hero__shade) and CSS background fallback.
 */
import { existsSync, readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// Ensure React is available on globalThis for server components rendered in node environment
;(globalThis as unknown as { React: typeof React }).React = React

let mockSession: {
  authenticated: boolean
  role: string
  agencyId?: string
  userId?: string
} = { authenticated: false, role: 'Guest' }

vi.mock('@/lib/auth/server-session', () => ({
  currentServerSession: async () => mockSession,
}))

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: () => undefined,
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/app/explore/ExploreTracker', () => ({
  default: () => null,
}))

import ExplorePage from '@/app/explore/page'

describe('Defect D1: Explore home hero background image', () => {
  it('public/explore-hero.webp exists as an optimized hero image asset', () => {
    expect(existsSync('public/explore-hero.webp'), 'public/explore-hero.webp must exist').toBe(true)
  })

  it('Screen 01 (Guest): src/app/explore/page.tsx renders hero image with v3x-hero__img and shade overlay v3x-hero__shade', async () => {
    mockSession = { authenticated: false, role: 'Guest' }
    const pageJsx = await ExplorePage({ searchParams: {} })
    const html = renderToStaticMarkup(pageJsx)

    // Verify hero section is present
    expect(html).toContain('v3x-hero')

    // Verify hero image is rendered with correct class and source
    expect(html).toContain('class="v3x-hero__img"')
    expect(html).toContain('src="/explore-hero.webp"')
    expect(html).toContain('alt="Không gian làng nghề đan lát truyền thống Hà Nội"')

    // Verify shade overlay is rendered
    expect(html).toContain('class="v3x-hero__shade"')

    // Verify Guest heading
    expect(html).toContain('Tự tay làm nghề')
  })

  it('Screen 21 (Tour Agency): src/app/explore/page.tsx renders hero image with v3x-hero__img and shade overlay v3x-hero__shade', async () => {
    mockSession = {
      authenticated: true,
      role: 'Tour_Agency',
      agencyId: '02e568d8-d65e-54b1-a554-b411150d1dcb',
      userId: 'ac233721-7dd3-5466-941b-dc7d5d1b0bfa',
    }
    const pageJsx = await ExplorePage({ searchParams: {} })
    const html = renderToStaticMarkup(pageJsx)

    // Verify hero section is present
    expect(html).toContain('v3x-hero')

    // Verify hero image is rendered with correct class and source
    expect(html).toContain('class="v3x-hero__img"')
    expect(html).toContain('src="/explore-hero.webp"')
    expect(html).toContain('alt="Không gian làng nghề đan lát truyền thống Hà Nội"')

    // Verify shade overlay is rendered
    expect(html).toContain('class="v3x-hero__shade"')

    // Verify Tour Agency heading
    expect(html).toContain('Đoàn tiếp theo của bạn')
  })

  it('explore-v3.css contains hero image positioning, CSS background fallback, and overlay styling', () => {
    const css = readFileSync('src/app/explore/v3/explore-v3.css', 'utf8')
    expect(css).toContain('.v3x-hero')
    expect(css).toContain("url('/explore-hero.webp')")
    expect(css).toContain('.v3x-hero__img')
    expect(css).toContain('.v3x-hero__shade')
  })
})
