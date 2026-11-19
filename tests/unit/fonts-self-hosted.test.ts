/**
 * CI macOS build failed because next/font/google could not reach Google Fonts (human request 2026-11-19): every font is
 * self-hosted with next/font/local, each woff2 next to its OFL licence, same CSS variables and display: swap, so the
 * build needs no network and the page looks the same.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync('src/app/fonts.ts', 'utf8')
const files = (dir: string): string[] => readdirSync(dir).flatMap(name => statSync(join(dir, name)).isDirectory() ? files(join(dir, name)) : [join(dir, name)])
const FONTS = [
  { variable: '--font-inter', file: 'src/app/fonts/inter/Inter-Variable.woff2', weight: '100 900' },
  { variable: '--font-pacifico', file: 'src/app/fonts/pacifico/Pacifico-Regular.woff2', weight: '400' },
]

describe('self-hosted fonts', () => {
  it('no source file imports next/font/google', () => {
    expect(files('src').filter(path => /\.(tsx?|mjs|js)$/.test(path) && readFileSync(path, 'utf8').includes('next/font/google'))).toEqual([])
    expect(source).toContain("import localFont from 'next/font/local'")
  })
  it.each(FONTS)('$variable: woff2 in the repo with its OFL licence beside it, same variable and display swap', ({ variable, file, weight }) => {
    const bytes = readFileSync(file)
    expect(bytes.subarray(0, 4).toString('latin1')).toBe('wOF2')
    expect(existsSync(join(file, '..', 'OFL.txt'))).toBe(true)
    expect(readFileSync(join(file, '..', 'OFL.txt'), 'utf8')).toContain('SIL OPEN FONT LICENSE Version 1.1')
    const call = source.match(new RegExp(`localFont\\(\\{[^}]*variable: '${variable}'[^}]*\\}\\)`))?.[0] ?? ''
    expect(call).toContain(`src: './${file.replace('src/app/', '')}'`)
    expect(call).toContain(`weight: '${weight}'`)
    expect(call).toContain("display: 'swap'")
  })
  it('keeps the exported names used by the layout', () => {
    // UI v3 (human decision 2026-11-19): one sans family, Lora removed with its files; Pacifico stays for the Explore hero
    // script line (.xv-script) while that line exists.
    expect(source).toMatch(/export const fontVariables = `\$\{inter\.variable\} \$\{pacifico\.variable\}`/)
    expect(existsSync('src/app/fonts/lora')).toBe(false)
  })
})

// Human decision 2026-11-19: one file per family, cut to Latin + Latin Extended + Vietnamese with pyftsubset (fonttools on
// the machine, not a repo dependency), kerning/GPOS and the Inter wght axis kept; the command is recorded next to the fonts.
describe('subset fonts', () => {
  const readme = readFileSync('src/app/fonts/README.md', 'utf8')
  it('records the pyftsubset command with the Vietnamese ranges and all layout features', () => {
    expect(readme).toContain('pyftsubset')
    for (const range of ['U+0300-036F', 'U+1EA0-1EF9', 'U+20AB']) expect(readme).toContain(range)
    expect(readme).toContain("--layout-features='*'")
  })
  it('is smaller than the full fonts (Inter 236 480, Pacifico 105 168 bytes)', () => {
    expect(statSync('src/app/fonts/inter/Inter-Variable.woff2').size).toBeLessThan(236480)
    expect(statSync('src/app/fonts/pacifico/Pacifico-Regular.woff2').size).toBeLessThan(105168)
  })
})
