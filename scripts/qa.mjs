#!/usr/bin/env node
/**
 * Automated QA sweep: visits every route (desktop + mobile), signed in as the right role, and reports
 *  - console errors / page errors
 *  - number of <h1> elements (should be exactly 1)
 *  - horizontal overflow
 *  - axe-core WCAG 2 A/AA violations
 *  - internal links that land on the "Page not found" screen
 *
 *   node scripts/qa.mjs                 # all routes, desktop + mobile
 *   node scripts/qa.mjs --only /owner   # routes starting with a prefix
 *   node scripts/qa.mjs --no-axe        # skip accessibility scan
 * Writes .screenshots/qa/report.json and prints a summary.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { chromium } from 'playwright-core'

const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const args = process.argv.slice(2)
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://127.0.0.1:5173'
const onlyRaw = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const only = onlyRaw ? onlyRaw.replace(/^[A-Za-z]:[\\/](?:Program Files[\\/])?Git(?=[\\/]|$)/i, '') : null
const runAxe = !args.includes('--no-axe')

const accounts = { owner: 'daniel@example.com', staff: 'sarah@wakefieldhomes.test', admin: 'admin@wakefieldhomes.test' }
const routes = [
  ...[
    '/', '/move-in-ready', '/homes/hybla-valley-farms-lot-36', '/homes/burke-drive-river-front', '/our-homes', '/our-homes/gallery', '/our-homes/models/stockton',
    '/our-homes/models/plymouth', '/view-my-home', '/build-on-your-lot', '/build-on-your-lot/features', '/build-on-your-lot/price-list', '/communities',
    '/communities/hybla-valley-farms', '/communities/hunter-station', '/finance', '/finance/home-purchase', '/finance/build-on-your-lot', '/vpdes', '/about', '/about/awards',
    '/about/memberships', '/about/licenses', '/about/news', '/reviews', '/contact', '/access', '/access/homeowners', '/access/staff', '/this-page-does-not-exist',
  ].map((path) => ({ path, as: null })),
  ...['/owner', '/owner/agreements', '/owner/agreements/agr_ellis_co3', '/owner/homes', '/owner/homes/hm_ellis_stockton', '/owner/homes/hm_ellis_hamilton', '/owner/appointments', '/owner/maintenance', '/owner/maintenance/req_1041', '/owner/profile'].map((path) => ({ path, as: 'owner' })),
  ...['/staff', '/staff/appointments', '/staff/requests', '/staff/requests/req_1042', '/staff/homes', '/staff/homes/hm_hybla36', '/staff/homes/new', '/staff/agreements', '/staff/agreements/agr_ellis_co3', '/staff/agreements/new', '/staff/homeowners', '/staff/leads', '/staff/market', '/staff/homes/hm_oronoco_1007'].map((path) => ({ path, as: 'staff' })),
  ...['/admin', '/admin/users', '/admin/roles', '/admin/settings', '/admin/activity'].map((path) => ({ path, as: 'admin' })),
].filter((r) => !only || r.path.startsWith(only))

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})

const report = []
const linkSet = new Map() // path -> first page that linked it

async function visit(route, device) {
  const context = await browser.newContext(
    device === 'mobile' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } },
  )
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 240)))
  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e.message).slice(0, 240)}`))
  try {
    if (route.as) {
      await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => window.__demo, null, { timeout: 15000 })
      await page.evaluate((e) => window.__demo.loginAs(e), accounts[route.as])
    }
    await page.goto(base + route.path, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
    // Lazy route chunks can take a while on a busy dev server: wait for the page heading, not a fixed delay.
    await page.waitForSelector('h1', { timeout: 25000 }).catch(() => {})
    await page.waitForTimeout(800)
    const viewportWidth = device === 'mobile' ? 390 : 1440
    const info = await page.evaluate((vw) => ({
      finalPath: location.pathname,
      title: document.title,
      h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim().slice(0, 60)),
      overflowX: document.documentElement.scrollWidth > vw + 1,
      overflowBy: document.documentElement.scrollWidth - vw,
      links: [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')),
      notFound: /page not found/i.test(document.title) || /page not found/i.test(document.querySelector('h1')?.textContent ?? ''),
    }), viewportWidth)
    let axe = []
    if (runAxe) {
      await page.addScriptTag({ content: axeSource })
      axe = await page.evaluate(async () => {
        const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] })
        return r.violations.map((v) => ({ id: v.id, impact: v.impact, count: v.nodes.length, help: v.help, sample: v.nodes.slice(0, 3).map((n) => `${n.target.join(' ')} :: ${n.failureSummary?.split('\n')[1]?.trim() ?? ''}`.slice(0, 220)) }))
      })
    }
    if (device === 'desktop') for (const l of info.links) if (!linkSet.has(l.split('#')[0].split('?')[0])) linkSet.set(l.split('#')[0].split('?')[0], { from: route.path, as: route.as })
    return { ...route, device, ...info, links: undefined, linkCount: info.links.length, errors: [...new Set(errors)], axe }
  } catch (e) {
    return { ...route, device, crash: String(e.message).slice(0, 300), errors }
  } finally {
    await context.close()
  }
}

for (const route of routes) {
  for (const device of ['desktop', 'mobile']) {
    const r = await visit(route, device)
    report.push(r)
    const flags = [
      r.crash && 'CRASH',
      r.errors?.length && `${r.errors.length} console errors`,
      r.h1 && r.h1.length !== 1 && `${r.h1.length} h1`,
      r.overflowX && `overflow ${r.overflowBy}px`,
      r.axe?.length && `axe: ${r.axe.map((a) => `${a.id}(${a.count})`).join(', ')}`,
      r.notFound && route.path !== '/this-page-does-not-exist' && 'NOT FOUND',
    ].filter(Boolean)
    console.log(`${flags.length ? '✗' : '✓'} ${device.padEnd(7)} ${route.as ? `[${route.as}] ` : ''}${route.path}${flags.length ? '  — ' + flags.join(' | ') : ''}`)
  }
}

// Link check: every internal link found on desktop pages must not land on the 404 page.
const broken = []
const visited = new Set(routes.map((r) => r.path))
for (const [path, src] of linkSet) {
  if (visited.has(path)) {
    const known = report.find((r) => r.path === path && r.device === 'desktop')
    if (known?.notFound && path !== '/this-page-does-not-exist') broken.push({ path, from: src.from })
    continue
  }
  const context = await browser.newContext()
  const page = await context.newPage()
  try {
    if (src.as) {
      await page.goto(base + '/', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => window.__demo, null, { timeout: 15000 })
      await page.evaluate((e) => window.__demo.loginAs(e), accounts[src.as])
    }
    await page.goto(base + path, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(900)
    const nf = await page.evaluate(() => /page not found/i.test(document.title) || /page not found/i.test(document.querySelector('h1')?.textContent ?? ''))
    if (nf) broken.push({ path, from: src.from })
  } finally {
    await context.close()
  }
}

mkdirSync('.screenshots/qa', { recursive: true })
writeFileSync('.screenshots/qa/report.json', JSON.stringify({ report, brokenLinks: broken, checkedLinks: linkSet.size }, null, 1))
const axeTotals = {}
for (const r of report) for (const a of r.axe ?? []) axeTotals[a.id] = (axeTotals[a.id] ?? 0) + a.count
console.log(`\nRoutes: ${routes.length} × 2 devices · internal links checked: ${linkSet.size}`)
console.log(`Broken internal links: ${broken.length ? broken.map((b) => `${b.path} (from ${b.from})`).join(', ') : 'none'}`)
console.log(`Pages with console errors: ${report.filter((r) => r.errors?.length).length}`)
console.log(`Pages with wrong h1 count: ${report.filter((r) => r.h1 && r.h1.length !== 1).length}`)
console.log(`Pages with horizontal overflow: ${report.filter((r) => r.overflowX).length}`)
console.log(`Axe violations by rule: ${Object.keys(axeTotals).length ? JSON.stringify(axeTotals) : 'none'}`)
await browser.close()
