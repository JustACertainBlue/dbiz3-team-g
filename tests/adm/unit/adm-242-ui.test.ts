/**
 * #242 adopted: admin UI pieces taken from nguyenthu-0505's PR, with the review fixes.
 * - ADM118 (screen-spec-ADM118 §8) and VER146/VER119 detail open as a modal dialog over the list (role="dialog",
 *   aria-modal, Escape and the backdrop close it) instead of a panel at the bottom of the page.
 * - ADM079 §3 #17 "Apply filters" sits inside the filter box (FilterPanel `onApply`).
 * - The ✕ that clears an Agency/Provider selection is a real, focusable <button> next to (not inside) the trigger button.
 * - /admin sends a signed-out visitor to /login?next=/admin from an effect (no navigation during render).
 * - The Agency review list is a table (all records); the unused STATUS_LABEL map is not added.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FilterPanel } from '@/app/components/admin/FilterPanel'
import { adminGuestRedirect } from '@/app/admin/admin-page-access'

const panel = (extra: Record<string, unknown>) => renderToStaticMarkup(React.createElement(FilterPanel, {
  filters: { preset: 'Last 30 days', villageId: null, ...((extra.filters as object) ?? {}) },
  onFilterChange: () => {}, villageOptions: [], isVillageLocked: false, assignedVillageId: null, ...extra,
}))

describe('#242 | ADM079 filter box', () => {
  it('renders "Áp dụng bộ lọc" inside the filter box, disabled when nothing changed', () => {
    const html = panel({ onApply: () => {}, applyDisabled: true })
    const box = html.slice(html.indexOf('class="ad9-filters'))
    expect(box).toMatch(/<div class="ad9-field ad9-field--apply"><button type="button" class="ad9-btn ad9-btn--primary" disabled="">Áp dụng bộ lọc<\/button><\/div>/)
  })

  it('without onApply there is no Apply button in the box', () => {
    expect(panel({})).not.toContain('Áp dụng bộ lọc')
  })

  it('the ✕ clear control is its own <button>, after (not inside) the trigger button', () => {
    const html = panel({ filters: { agencyIds: ['a1'] } })
    const picker = html.match(/<div class="ad9-picker">([\s\S]*?)<\/div>/)![1]
    const trigger = picker.match(/<button[^>]*combined-filter-trigger[\s\S]*?<\/button>/)![0]
    expect(trigger).not.toContain('✕')
    // spec đổi → kỳ vọng đổi (ADM079 filter-box fix: ✕ label "Xoá lựa chọn Agency" / "Xoá lựa chọn Provider", ✕ in the row right after the value; approved by linhkhanh-vu 2026-11-10)
    expect(picker).toMatch(/<\/button><button type="button" class="ad9-clear" aria-label="Xoá lựa chọn Agency">✕<\/button>$/)
    const css = readFileSync('src/app/admin/dashboard-v9.css', 'utf8')
    expect(css).toMatch(/\.ad9-picker \{ position: relative;/)
    expect(css).toMatch(/\.ad9-clear \{ position: relative;/)
  })
})

describe('#242 | /admin guest redirect', () => {
  it('signed-out → /login?next=/admin; signed-in non-admin → no redirect (restricted page)', () => {
    expect(adminGuestRedirect({ authenticated: false } as never)).toBe('/login?next=/admin')
    expect(adminGuestRedirect({ authenticated: true, role: 'Tour_Agency' } as never)).toBeNull()
  })

  // v3 screen 38 is a Server Component: the redirect is the server `redirect()` call before any render output.
  it('the v3 page redirects on the server, never with window.location during render', () => {
    const page = readFileSync('src/app/admin/page.tsx', 'utf8')
    expect(page).not.toContain('window.location.replace')
    expect(page).toMatch(/const guest = adminGuestRedirect\(session\)\s*\n\s*if \(guest\) redirect\(guest\)/)
  })
})

// v3 (png/40, png/41, png/41a): account info and the profile review are their own pages, not modal dialogs; the list
// asks for confirmation before switching an account (Modal from components/ui: role="dialog", aria-modal, Escape closes).
describe('#242 | v3 detail pages and confirmation dialog', () => {
  it('the account list confirms the switch in the shared Modal', () => {
    const page = readFileSync('src/app/admin/users/page.tsx', 'utf8')
    expect(page).toContain('<Modal open={target !== null}')
    const modal = readFileSync('src/app/components/ui/Modal.tsx', 'utf8')
    expect(modal).toContain('role="dialog" aria-modal="true"')
    expect(modal).toMatch(/event\.key === 'Escape'/)
  })

  it('the review list is a table of all records (pending and processed tabs) with no STATUS_LABEL map', () => {
    const page = readFileSync('src/app/admin/_v3/ReviewList.tsx', 'utf8')
    expect(page).toContain('<table className="av3-table av3-table--review av3-table--stack">')
    expect(page).toContain('Đã xử lý (')
    expect(page).not.toContain('STATUS_LABEL')
  })
})
