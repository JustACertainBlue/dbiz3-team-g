import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? tsxFiles(path) : path.endsWith('.tsx') ? [path] : []
  })
}

const formFiles = tsxFiles('src/app').filter(path => /<form\b/.test(readFileSync(path, 'utf8')))

describe('native form submits throughout the app', () => {
  it('covers the app forms, including booking, messages, matching and admin', () => {
    expect(formFiles.length).toBeGreaterThanOrEqual(25)
    for (const area of ['/bookings/', '/messages/', '/ai-matching/', '/admin/']) {
      expect(formFiles.some(path => path.replaceAll('\\', '/').includes(area))).toBe(true)
    }
  })

  for (const path of formFiles) {
    it(path, () => {
      const source = readFileSync(path, 'utf8')
      for (const match of source.matchAll(/<form\b[^>]*>/g)) {
        const tag = match[0]
        if (/method="get"/i.test(tag)) {
          expect(tag).toMatch(/action=/)
          continue
        }
        expect(tag).toMatch(/method="post"/i)
        const end = source.indexOf('</form>', match.index + tag.length)
        expect(end).toBeGreaterThan(match.index)
        const body = source.slice(match.index + tag.length, end)
        const submits = [...body.matchAll(/<(?:button|Button)\b[^>]*>/gs)]
          .map(item => item[0])
          .filter(button => /type="submit"/.test(button) || !/\btype=/.test(button))
        expect(submits.length).toBeGreaterThan(0)
        for (const button of submits) expect(button).toMatch(/disabled=\{[^}]*(?:!hydrated|!ready)/)
      }
    })
  }
})
