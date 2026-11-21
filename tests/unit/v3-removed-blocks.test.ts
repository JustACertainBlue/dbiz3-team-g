/**
 * Mockup pack 19/11/2026 (README "Thay đổi bản 19/11/2026"): blocks removed from 03 and 04/23 must not appear in the
 * public pages. Guard only: none of them was ever built, so this test passed from the start.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const files = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? files(path) : /\.(tsx?|css)$/.test(name) ? [path] : []
})
const source = ['src/app/explore', 'src/app/village', 'src/app/villages', 'src/lib/explore'].flatMap(files).map(path => readFileSync(path, 'utf8')).join('\n')

describe('blocks removed in the 19/11 mockup pack', () => {
  it.each(['Rất được đoàn khách ưa thích', 'Xung quanh làng', 'Phí tham quan làng', 'Chỗ đỗ xe khách'])('"%s" is not in the explore or village pages', text => {
    expect(source).not.toContain(text)
  })
})
