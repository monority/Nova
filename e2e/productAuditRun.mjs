/*
 * NOVA Step 10CY — Player experience & product gap audit (walkthrough).
 *
 * Real headed-browser walkthrough of representative scenarios through the
 * actual UI: scenario selection, objective comprehension, canvas interaction
 * (hover feedback + placement + inspection), HUD controls, and responsive
 * behavior at 1280x800 / 420x740 / 360x640.
 *
 * Audit only: it reads window.__nova and drives real DOM/canvas input. It
 * asserts only robust product facts (objective visible, feedback produced, no
 * horizontal overflow, usable canvas, zero console/page errors) and prints
 * AUDIT observations for the report.
 *
 * Screenshots: artifacts/product-audit/.
 */
import { spawn } from 'node:child_process'
import http from 'node:http'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const port = 4194
const baseUrl = `http://127.0.0.1:${port}`
const ART = resolve(root, 'artifacts/product-audit')

let failures = 0
const ok = (m) => console.log(`PRODUCT AUDIT PASS: ${m}`)
const note = (m) => console.log(`PRODUCT AUDIT NOTE: ${m}`)
const fail = (m) => {
  failures += 1
  console.error(`PRODUCT AUDIT FAIL: ${m}`)
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)],
  { cwd: root, stdio: 'ignore' }
)

const waitForServer = () =>
  new Promise((res, rej) => {
    const req = http.get(baseUrl, (r) => {
      r.resume()
      r.on('end', () => (r.statusCode === 200 ? res() : rej(new Error(`HTTP ${r.statusCode}`))))
    })
    req.on('error', rej)
  })

const stats = (page) => page.evaluate(() => window.__nova.stats())
const text = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent ?? '', sel)

const selectScenario = async (page, id) => {
  await page.selectOption('[data-testid="scenario-select"]', id)
  await wait(350)
  return page.evaluate(() => window.__nova.scenario())
}

/** Move the mouse to a cell and return the status line (retrying past causal messages). */
const hoverCell = async (page, cell) => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const pt = await page.evaluate((c) => window.__nova.cellToScreen(c), cell)
    if (pt === null) break
    await page.mouse.move(pt.x + (attempt % 2), pt.y + (attempt % 2))
    await wait(160)
    const s = await stats(page)
    if (s.status.length > 0) return s
  }
  return stats(page)
}

const clickCell = async (page, cell) => {
  const pt = await page.evaluate((c) => window.__nova.cellToScreen(c), cell)
  await page.mouse.click(pt.x, pt.y)
  await wait(250)
  return stats(page)
}

let browser
try {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await waitForServer()
      break
    } catch {
      await wait(250)
    }
    if (attempt === 39) throw new Error('dev server did not start')
  }
  mkdirSync(ART, { recursive: true })
  browser = await chromium.launch({ headless: false })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|404|failed to load resource/i.test(m.text())) {
      errors.push(m.text())
    }
  })
  await page.goto(`${baseUrl}/`)
  await page.waitForFunction(() => window.__nova?.ready === true)
  await page.click('[data-testid="simulation-pause"]')

  // --- 1. Player journey: representative scenarios ---------------------------
  const scenarios = [
    { id: 'first-settlement', kind: 'simple opening' },
    { id: 'water-constraint', kind: 'Food/Water pressure' },
    { id: 'recovery', kind: 'road/access recovery' },
    { id: 'town-threshold', kind: 'Town objective' },
  ]
  for (const scenario of scenarios) {
    const applied = await selectScenario(page, scenario.id)
    const objective = await text(page, '[data-testid="progression-objective"]')
    const objectiveStatus = await text(page, '[data-testid="progression-objective-status"]')
    const stage = await text(page, '[data-testid="progression-stage"]')
    if (applied.id !== scenario.id || objective.length === 0) {
      fail(`${scenario.id}: objective not visible (id=${applied.id}, objective=${JSON.stringify(objective)})`)
      continue
    }
    // Hover feedback: the residence tool is the default selection after a load.
    const hover = await hoverCell(page, { x: 6, y: 6 })
    if (hover.status.length === 0) fail(`${scenario.id}: no placement feedback on hover`)
    // Attempt a placement and an inspection click.
    const before = await stats(page)
    const after = await clickCell(page, { x: 6, y: 6 })
    const inspection = await clickCell(page, { x: 6, y: 6 })
    const insType = await text(page, '[data-testid="inspection-type"]')
    const placed = Number(after.buildings) > Number(before.buildings)
    note(
      `${scenario.id} [${scenario.kind}] objective=${JSON.stringify(objective)} status=${JSON.stringify(objectiveStatus)} stage=${stage} hover=${JSON.stringify(hover.status)} placed=${placed} inspection=${JSON.stringify(insType)}`
    )
    if (inspection.buildings === '0' && placed) fail(`${scenario.id}: placed building not visible in stats`)
    if (objectiveStatus.length === 0) note(`${scenario.id}: objective status empty (possible for free play only)`)
    await page.screenshot({ path: resolve(ART, `01-${scenario.id}.png`) })
  }

  // --- 2. Responsive behavior at the required viewports ----------------------
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 420, height: 740 },
    { width: 360, height: 640 },
  ]) {
    await page.setViewportSize(viewport)
    await selectScenario(page, 'first-settlement')
    await wait(350)
    const metrics = await page.evaluate(() => {
      const doc = document.documentElement
      const canvas = document.querySelector('canvas#nova-canvas')
      const rect = canvas ? canvas.getBoundingClientRect() : null
      const objective = document.querySelector('[data-testid="progression-objective"]')
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      for (let x = 0; x < 12; x += 1) {
        for (let y = 0; y < 12; y += 1) {
          const p = window.__nova.cellToScreen({ x, y })
          if (p === null) continue
          minX = Math.min(minX, p.x)
          maxX = Math.max(maxX, p.x)
          minY = Math.min(minY, p.y)
          maxY = Math.max(maxY, p.y)
        }
      }
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        canvasWidth: rect ? rect.width : 0,
        canvasHeight: rect ? rect.height : 0,
        objective: objective?.textContent?.length ?? 0,
        hudExpanded: !document.querySelector('#nova-ui')?.classList.contains('collapsed'),
        board: { minX: Math.round(minX), maxX: Math.round(maxX), minY: Math.round(minY), maxY: Math.round(maxY) },
      }
    })
    note(`${viewport.width}x${viewport.height} board bounds: ${JSON.stringify(metrics.board)} hudExpanded=${metrics.hudExpanded}`)
    if (metrics.scrollWidth > metrics.clientWidth + 1) {
      fail(`horizontal overflow at ${viewport.width}x${viewport.height}`)
    } else if (metrics.canvasWidth <= 0 || metrics.canvasHeight <= 0) {
      fail(`canvas unusable at ${viewport.width}x${viewport.height}`)
    } else if (metrics.objective === 0) {
      fail(`objective invisible at ${viewport.width}x${viewport.height}`)
    } else {
      // Controls remain usable without collapsing: the default layout fits the
      // panel into the board margin, so the palette is reachable (Playwright
      // scrolls it into view when the panel is capped).
      await page.click('[data-testid="build-farm"]')
      const pressed = await page.getAttribute('[data-testid="build-farm"]', 'aria-pressed')
      if (pressed !== 'true') fail(`palette not usable at ${viewport.width}x${viewport.height}`)
      else if (!metrics.hudExpanded) fail(`default HUD collapsed at ${viewport.width}x${viewport.height}`)
      else
        ok(
          `${viewport.width}x${viewport.height}: no overflow, canvas ${Math.round(metrics.canvasWidth)}x${Math.round(metrics.canvasHeight)}, objective + palette usable, HUD default open`
        )
    }
    // HUD occlusion: board cells whose projected centre falls under the open
    // HUD panel cannot receive a canvas pointer event until the player hides it.
    const occlusion = await page.evaluate(() => {
      const panel = document.querySelector('#nova-ui')?.getBoundingClientRect()
      if (!panel) return { width: 0, covered: [] }
      const covered = []
      for (let x = 0; x < 12; x += 1) {
        for (let y = 0; y < 12; y += 1) {
          const p = window.__nova.cellToScreen({ x, y })
          if (p === null) continue
          if (
            p.x >= panel.left &&
            p.x <= panel.right &&
            p.y >= panel.top &&
            p.y <= panel.bottom
          ) {
            covered.push(`${x},${y}`)
          }
        }
      }
      return { width: Math.round(panel.width), covered }
    })
    note(
      `HUD default panel ${occlusion.width}px covers ${occlusion.covered.length} board cells at ${viewport.width}x${viewport.height}`
    )
    if (occlusion.covered.length > 0) {
      fail(
        `default HUD covers playable cells at ${viewport.width}x${viewport.height}: ${JSON.stringify(occlusion.covered)}`
      )
    } else {
      ok(`${viewport.width}x${viewport.height}: default HUD covers 0 playable cells`)
    }
    await page.screenshot({ path: resolve(ART, `02-${viewport.width}.png`) })
  }

  // --- 3. Objective completion observability (Town scenario) -----------------
  await selectScenario(page, 'town-threshold')
  const townObjective = await text(page, '[data-testid="progression-objective-status"]')
  note(`town-threshold initial objective status=${JSON.stringify(townObjective)}`)
  note(`town capability=${JSON.stringify(await text(page, '[data-testid="town-capability"]'))}`)

  if (errors.length === 0) ok('zero console/page errors')
  else fail(`console/page errors: ${JSON.stringify(errors.slice(0, 5))}`)
} catch (error) {
  fail(String(error))
} finally {
  if (browser) await browser.close()
  server.kill()
}

console.log(`PRODUCT AUDIT RESULT: ${failures === 0 ? 'PASS' : 'FAIL'}`)
process.exitCode = failures === 0 ? 0 : 1
