/**
 * ADM079 Admin Dashboard — Agency and Provider filter boxes (UI fix requested by linhkhanh-vu, 2026-11-10).
 * - The selected value renders inside the box on one line and is cut with an ellipsis (class `ad9-ellipsis`);
 *   the full value is in its title.
 * - The clear ✕ is a real, focusable <button> (aria-label "Xoá lựa chọn") inside the same box, right after the value.
 * - The trigger can shrink below its text width, so a long value never widens the box over the next filter box.
 * Filter logic, values sent and the Agency-or-Provider switch confirm are not changed (covered by filter-panel tests).
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FilterPanel } from '@/app/components/admin/FilterPanel'

const panel = (filters: Record<string, unknown>) => renderToStaticMarkup(React.createElement(FilterPanel, {
  filters: { preset: 'Last 30 days', villageId: null, ...filters },
  onFilterChange: () => {}, villageOptions: [], isVillageLocked: false, assignedVillageId: null,
}))
const picker = (html: string, kind: 'Agency' | 'Provider') => {
  const start = html.indexOf('<div class="ad9-picker">', html.indexOf(`id="ad9-${kind}-label"`))
  return html.slice(start, html.indexOf('</div>', start))
}
const css = readFileSync('src/app/admin/dashboard-v9.css', 'utf8')
const rule = (selector: string) => {
  const at = css.indexOf(`${selector} {`)
  return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('ADM079 | Agency / Provider filter boxes', () => {
  it('the selected value is inside the box, in an ellipsis span with the full value as its title', () => {
    for (const [kind, filters] of [['Agency', { agencyIds: ['a1'] }], ['Provider', { providerIds: ['p1', 'p2'] }]] as const) {
      const box = picker(panel(filters), kind)
      const value = box.match(/<span id="ad9-[A-Za-z]+-value" class="ad9-ellipsis" title="([^"]+)">([^<]+)<\/span>/)
      expect(value, kind).not.toBeNull()
      expect(value![1]).toBe(value![2])
    }
  })

  it('the ✕ is a focusable <button aria-label="Xoá lựa chọn"> inside the same box, right after the trigger', () => {
    const box = picker(panel({ agencyIds: ['a1'] }), 'Agency')
    expect(box).toMatch(/<\/button><button type="button" class="ad9-clear" aria-label="Xoá lựa chọn">✕<\/button>$/)
    const clear = box.match(/<button type="button" class="ad9-clear"[^>]*>/)![0]
    expect(clear).not.toMatch(/tabindex="-1"|disabled|aria-hidden/)
  })

  it('no ✕ when nothing is selected', () => {
    expect(picker(panel({}), 'Agency')).not.toContain('ad9-clear')
  })

  it('CSS: one-line ellipsis, a trigger that can shrink, and the ✕ in the row after the value', () => {
    expect(rule('.ad9-ellipsis')).toMatch(/overflow: hidden;.*text-overflow: ellipsis;.*white-space: nowrap;/)
    expect(rule('.ad9-picker > .combined-filter-trigger')).toMatch(/flex: 1 1 auto;.*min-width: 0;/)
    expect(rule('.ad9-picker:has(> .ad9-clear)')).toMatch(/border: 1\.5px solid/)
    expect(rule('.ad9-clear')).toMatch(/position: relative;.*flex: none;/)
  })
})
