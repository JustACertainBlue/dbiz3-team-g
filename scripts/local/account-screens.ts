/**
 * Local screenshots of the account screens with a real sign-in. NOT run by CI, NOT part of the app.
 *
 *   E2E_EMAIL=... E2E_PASSWORD=... npx -y tsx scripts/local/account-screens.ts
 *
 * Needs Playwright without touching package.json (one time):
 *   npm i --no-save playwright && npx playwright install chromium
 *
 * The dev server must be running on http://localhost:3201. The email and password are read from the environment only;
 * they are never printed or written. Pictures go to .local-shots/account/ (git-ignored).
 * Shots: /account, /agency/<id>, header account menu (png/20) and logout popup (png/20a) at 1440 and 390.
 * The logout popup is opened but never confirmed.
 */
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3201'
const OUT = '.local-shots/account'
const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD
if (!email || !password) {
  console.error('Missing E2E_EMAIL and/or E2E_PASSWORD. Set both in the environment, then run again. Nothing was done.')
  process.exit(1)
}

async function main() {
  // Loaded by a variable name so that type checking does not need Playwright installed.
  const moduleName = 'playwright'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let playwright: any
  try { playwright = await import(moduleName) }
  catch { console.error('Playwright is not installed. Run once: npm i --no-save playwright && npx playwright install chromium'); process.exit(1) }

  mkdirSync(OUT, { recursive: true })
  const browser = await playwright.chromium.launch()
  try {
    const sizes = [{ name: '1440', width: 1440, height: 900 }, { name: '390', width: 390, height: 844 }]
    for (const size of sizes) {
      const context = await browser.newContext({ viewport: { width: size.width, height: size.height } })
      const page = await context.newPage()

      await page.goto(`${BASE}/login`)
      await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('form button[type=submit]')?.disabled)
      await page.fill('#login-email', email!)
      await page.fill('#login-password', password!)
      await page.click('form button[type=submit]')
      try { await page.waitForURL((url: URL) => !url.pathname.startsWith('/login'), { timeout: 20000 }) }
      catch {
        // Say why, from what the page shows (never the credentials): the error alert, or the registration status popup title.
        const shown = (await page.locator('.av3-alert, .hab-modal__title').first().textContent({ timeout: 2000 }).catch(() => null))?.trim()
        console.error(`Sign-in did not leave /login. The page says: ${shown ? `"${shown}"` : 'nothing (is the dev server on 3201 up?)'}. Stopping.`)
        process.exit(1)
      }

      const session = await (await context.request.get(`${BASE}/api/auth/session`)).json() as { data?: { session?: { agencyId?: string | null } } }
      const agencyId = session.data?.session?.agencyId

      await page.goto(`${BASE}/account`)
      await page.waitForSelector('.av3-profile')
      await page.screenshot({ path: `${OUT}/account-${size.name}.png`, fullPage: true })

      if (agencyId) {
        await page.goto(`${BASE}/agency/${agencyId}`)
        await page.waitForSelector('.av3-company')
        await page.screenshot({ path: `${OUT}/agency-${size.name}.png`, fullPage: true })
      } else console.warn('This account has no agency profile: /agency/[id] skipped.')

      // Header: png/20 account menu and png/20a logout popup. On a phone the menu is behind the burger.
      await page.goto(`${BASE}/explore`)
      if (size.width >= 768) {
        await page.click('.hab-chip, .hab-nav__org')
        await page.waitForSelector('.hab-account__menu')
        await page.screenshot({ path: `${OUT}/header-menu-${size.name}.png` })
        await page.click('.hab-account__item--danger')
      } else {
        await page.click('.hab-nav__burger')
        await page.waitForSelector('.hab-menu')
        await page.screenshot({ path: `${OUT}/header-menu-${size.name}.png` })
        await page.click('.hab-menu__logout')
      }
      await page.waitForSelector('.hab-modal')
      await page.screenshot({ path: `${OUT}/header-logout-${size.name}.png` })
      await context.close()
    }
    console.log(`Done. Pictures are in ${OUT}/`)
  } finally { await browser.close() }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Unexpected error'); process.exit(1) })
