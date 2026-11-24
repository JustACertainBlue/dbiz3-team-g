/**
 * Defect D1: Explore home hero background image and overlay.
 * Verifies that screens 01 and 21 (/explore) render the hero background image (.v3x-hero__img)
 * with the ambient gradient overlay (.v3x-hero__shade).
 */
import { existsSync, readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// Ensure React is available on globalThis for server components rendered in node environment
;(globalThis as unknown as { React: typeof React }).React = React

import ExplorePage from '@/app/explore/page'

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

describe('Defect D1: Explore home hero background image', () => {
  it('public/explore-hero.webp exists as an optimized hero image asset', () => {
    expect(existsSync('public/explore-hero.webp'), 'public/explore-hero.webp must exist').toBe(true)
  })

  it('src/app/explore/page.tsx renders the hero image with v3x-hero__img and the shade overlay v3x-hero__shade', async () => {
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
  })

  it('explore-v3.css contains hero image positioning and overlay styling', () => {
    const css = readFileSync('src/app/explore/v3/explore-v3.css', 'utf8')
    expect(css).toContain('.v3x-hero__img')
    expect(css).toContain('.v3x-hero__shade')
  })
})
