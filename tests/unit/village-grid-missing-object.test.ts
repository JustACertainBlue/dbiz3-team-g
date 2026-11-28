/**
 * Home "Làng nghề quanh Hà Nội" (human request 2026-11-28, after PROD moved to a new Storage bucket with no objects yet):
 * a village tile whose cover image fails to load KEEPS its tile, with the neutral frame, like the village cards of /villages.
 * It is never dropped, so the section can never end up with a heading and no tiles. This replaces the 2026-11-19/21 rule
 * "a failed image removes its slot" for this grid only.
 */
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const seen: Array<Record<string, unknown>> = []
vi.mock('@/app/explore/v3/CoverImage', () => ({
  default: (props: Record<string, unknown>) => { seen.push(props); return React.createElement('i', { 'data-cover': props.hideEmpty ? 'hide' : 'frame' }) },
}))
import VillageGrid from '@/app/explore/v3/VillageGrid'

;(globalThis as { React?: typeof React }).React = React
const image = (n: number) => ({ url: `/api/prf/media/f${n}`, width: 1280, height: 960 })
const tile = (id: string, n: number) => ({ village_id: id, name: `Làng ${id}`, craft: 'Gốm', area: 'Hà Nội', providers: 2, image: image(n) })

describe('VillageGrid when a cover image cannot be loaded', () => {
  beforeEach(() => { seen.length = 0 })
  it('asks CoverImage for the neutral frame (no hideEmpty) so a failed image still leaves the frame', () => {
    renderToStaticMarkup(React.createElement(VillageGrid, { tiles: [tile('a', 1), tile('b', 2)] }))
    expect(seen).toHaveLength(2)
    for (const props of seen) expect(props.hideEmpty).toBeFalsy()
  })
  it('never lets a failed image remove its tile: no onNone callback is given', () => {
    renderToStaticMarkup(React.createElement(VillageGrid, { tiles: [tile('a', 1), tile('b', 2)] }))
    for (const props of seen) expect(props.onNone).toBeUndefined()
  })
  it('renders every village tile (up to 7) with its name and link, whatever happens to the images', () => {
    const tiles = Array.from({ length: 9 }, (_, index) => tile(`v${index}`, index))
    const out = renderToStaticMarkup(React.createElement(VillageGrid, { tiles }))
    expect((out.match(/class="v3-vtile/g) ?? []).length).toBeGreaterThanOrEqual(7)
    for (let index = 0; index < 7; index += 1) expect(out).toContain(`Làng v${index}`)
    expect(out).not.toContain('Làng v7')
  })
})
