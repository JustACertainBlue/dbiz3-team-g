// Dev helper: sign in by hand once, keep the browser session outside the repo.
// Usage: node scripts/dev/save-session.mjs <name>   (e.g. hdt, ubnd)
// Opens http://localhost:3204/login (headed), waits until the URL starts with /admin, then writes
// ~/.dbiz3-auth/<name>.json (Playwright storageState). Cookies are never printed.
// Playwright is installed outside the repo: npm i --prefix ~/.dbiz3-auth/pw playwright@1.48.2
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdirSync, chmodSync } from 'node:fs'

const name = process.argv[2]
if (!name || !/^[a-z0-9_-]+$/i.test(name)) { console.error('Usage: node scripts/dev/save-session.mjs <name>'); process.exit(1) }
const base = process.env.DEV_BASE_URL || 'http://localhost:3204'
const dir = join(homedir(), '.dbiz3-auth')
const require = createRequire(join(dir, 'pw', 'noop.js'))
let chromium
try { ({ chromium } = require('playwright')) } catch { console.error(`Playwright not found. Run: npm i --prefix ${join(dir, 'pw')} playwright@1.48.2`); process.exit(1) }

mkdirSync(dir, { recursive: true, mode: 0o700 })
const browser = await chromium.launch({ headless: false })
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await context.newPage()
await page.goto(`${base}/login`)
console.log(`Sign in as "${name}" in the browser window. Waiting for a URL that starts with /admin ...`)
await page.waitForURL(url => new URL(url).pathname.startsWith('/admin'), { timeout: 10 * 60 * 1000 })
const file = join(dir, `${name}.json`)
await context.storageState({ path: file })
chromium && chmodSync(file, 0o600)
console.log(`Saved ${file}`)
await browser.close()
