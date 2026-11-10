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
    // spec đổi → kỳ vọng đổi (ADM079 filter-box fix: ✕ label "Xoá lựa chọn", ✕ in the row right after the value; approved by linhkhanh-vu 2026-11-10)
    expect(picker).toMatch(/<\/button><button type="button" class="ad9-clear" aria-label="Xoá lựa chọn">✕<\/button>$/)
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

  it('the page redirects from an effect, never during render', () => {
    const page = readFileSync('src/app/admin/page.tsx', 'utf8')
    expect(page).not.toContain('window.location.replace')
    expect(page).toMatch(/const target = adminGuestRedirect\(session\)\s*\n\s*if \(target\) \{ router\.replace\(target\); return \}/)
  })
})

describe('#242 | detail as a modal dialog', () => {
  for (const [file, label] of [['src/app/admin/users/page.tsx', 'Chi tiết tài khoản'], ['src/app/admin/agencies/page.tsx', 'Chi tiết hồ sơ']] as const) {
    it(`${file}: the detail is a role="dialog" aria-modal overlay that Escape and the backdrop close`, () => {
      const page = readFileSync(file, 'utf8')
      expect(page).toContain(`<div className="overlay" role="dialog" aria-modal="true" aria-label="${label}"`)
      expect(page).toMatch(/onClick=\{e => \{ if \(e\.target === e\.currentTarget/)
      expect(page).toMatch(/event\.key === 'Escape'/)
    })
  }

  it('the Agency review list is a table of all records and has no unused STATUS_LABEL map', () => {
    const page = readFileSync('src/app/admin/agencies/page.tsx', 'utf8')
    expect(page).toContain('<table className="review-table">')
    expect(page).not.toContain('Hiển thị cả hồ sơ đã xử lý')
    expect(page).not.toContain('STATUS_LABEL')
  })
})
