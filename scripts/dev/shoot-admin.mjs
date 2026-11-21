// Dev helper: screenshots of admin screens with a saved session (see save-session.mjs). Output goes outside the repo.
// Usage: node scripts/dev/shoot-admin.mjs <name> <outDir> <path>...
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'

const [name, out, ...paths] = process.argv.slice(2)
const base = process.env.DEV_BASE_URL || 'http://localhost:3204'
const dir = join(homedir(), '.dbiz3-auth')
const { chromium } = createRequire(join(dir, 'pw', 'noop.js'))('playwright')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
for (const [label, width, height] of [['1440', 1440, 900], ['390', 390, 844]]) {
  const context = await browser.newContext({ storageState: join(dir, `${name}.json`), viewport: { width, height } })
  const page = await context.newPage()
  for (const p of paths) {
    await page.goto(`${base}${p}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    await page.screenshot({ path: join(out, `${name}-${label}-${p.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root'}.png`), fullPage: true })
  }
  await context.close()
}
await browser.close()
