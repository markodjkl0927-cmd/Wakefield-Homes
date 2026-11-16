#!/usr/bin/env node
/**
 * Screenshot helper for reviewing pages (uses playwright-core with the locally installed Chrome).
 *
 *   node scripts/shot.mjs /our-homes/gallery
 *   node scripts/shot.mjs /owner --as owner --mobile --full
 *   node scripts/shot.mjs /staff/homes/hm_hybla36 --as staff --wait 4000 --out .screenshots/editor.png
 *
 * Options
 *   --as owner|staff|admin|<email>   sign in as a demo account first
 *   --mobile                         390×844 iPhone-like viewport (default 1440×900)
 *   --full                           full-page screenshot
 *   --wait <ms>                      extra wait after load (default 1200)
 *   --click "<css selector>"         click an element before the screenshot
 *   --base <url>                     default http://127.0.0.1:5173 (dev server started from .claude/launch.json)
 *   --out <file>                     default .screenshots/<path>-<desktop|mobile>.png
 * Console errors and failed requests from the app are printed after the screenshot.
 */
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
// Git Bash on Windows rewrites "/owner" into "C:/Program Files/Git/owner" — undo that.
const rawPath = args.find((a) => !a.startsWith('--') && !isOptionValue(a)) ?? '/'
const path = rawPath.replace(/^[A-Za-z]:[\\/](?:Program Files[\\/])?Git(?=[\\/]|$)/i, '').replace(/\\/g, '/') || '/'
function isOptionValue(a) {
  const i = args.indexOf(a)
  return i > 0 && ['--as', '--wait', '--click', '--base', '--out', '--width', '--height'].includes(args[i - 1])
}
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const flag = (name) => args.includes(`--${name}`)

const base = opt('base', 'http://127.0.0.1:5173')
const mobile = flag('mobile')
const full = flag('full')
const wait = Number(opt('wait', '1200'))
const as = opt('as', null)
const click = opt('click', null)
const slug = path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'
const out = opt('out', `.screenshots/${slug}${as ? `-${as.replace(/[^a-z0-9]+/gi, '')}` : ''}-${mobile ? 'mobile' : 'desktop'}.png`)
const accounts = { owner: 'daniel@example.com', homeowner: 'daniel@example.com', staff: 'sarah@wakefieldhomes.test', admin: 'admin@wakefieldhomes.test' }

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const context = await browser.newContext(
  mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: Number(opt('width', '1440')), height: Number(opt('height', '900')) } },
)
const page = await context.newPage()
const problems = []
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console.error: ${m.text().slice(0, 300)}`)
})
page.on('pageerror', (e) => problems.push(`pageerror: ${String(e.message).slice(0, 300)}`))
page.on('requestfailed', (r) => {
  const u = r.url()
  if (!u.includes('wakefieldhomeslc.com')) problems.push(`requestfailed: ${u.slice(0, 160)} ${r.failure()?.errorText ?? ''}`)
})

if (as) {
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__demo, null, { timeout: 15000 })
  const email = accounts[as] ?? as
  const ok = await page.evaluate((e) => window.__demo.loginAs(e), email)
  if (!ok) problems.push(`could not sign in as ${email}`)
}
await page.goto(base + path, { waitUntil: 'domcontentloaded' })
await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
await page.waitForTimeout(wait)
if (click) {
  await page.click(click, { timeout: 5000 }).catch((e) => problems.push(`click failed: ${e.message.split('\n')[0]}`))
  await page.waitForTimeout(800)
}
mkdirSync(dirname(out), { recursive: true })
await page.screenshot({ path: out, fullPage: full })
// Under mobile emulation window.innerWidth grows to fit the content, so compare with the configured width.
const info = await page.evaluate((vw) => ({
  url: location.pathname,
  title: document.title,
  h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()).slice(0, 3),
  overflowX: document.documentElement.scrollWidth > vw + 1,
}), page.viewportSize()?.width ?? 1440)
console.log(`saved ${out}`)
console.log(JSON.stringify(info))
if (problems.length) console.log('PROBLEMS:\n' + [...new Set(problems)].join('\n'))
await browser.close()
