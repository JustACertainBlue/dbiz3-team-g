/**
 * Human review 2026-11-19: no horizontal overflow at 390 px. The AI request row (01/21/03/04) overflowed by 22 px because
 * its flex input box kept the input's intrinsic width; flex children that hold inputs need min-width: 0.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/app/explore/v3/explore-v3.css', 'utf8')
const rule = (selector: string) => css.match(new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`, 'm'))?.[1] ?? ''

describe('narrow layout', () => {
  it('the AI request box can shrink below its input width', () => {
    expect(rule('.v3-aiin')).toMatch(/min-width: 0;/)
  })
  it('the price and booking button beside the 04/23 title wrap instead of overflowing', () => {
    expect(rule('.v3d-titleside')).toMatch(/flex-wrap: wrap;/)
  })
})
