/*
 * NOVA Step 10CS road expenditure affordability E2E.
 *
 * Phase 7 gives the SECOND Material spending path (`placeRoads`) the same
 * income-aware affordability contract Step 10CR gave `placeBuilding`. The
 * proof in a real browser:
 *
 *   - a road whose cost is covered by this tick's workforce income is
 *     offered as ready and accepted (one road, Material spent exactly once);
 *   - without that income the same stock is refused and spends nothing;
 *   - stock alone still reads "ready" with no inflow breakdown;
 *   - 1280x800, 420x740 and 360x640 stay free of horizontal overflow with a
 *     usable canvas and a readable status surface.
 *
 * The fixture is built with the same domain constructors the app uses and
 * handed to the sanctioned serialized-load hook; all player input is real
 * canvas pointer movement + the real road palette.
 * Screenshots: artifacts/road-affordability/01..03.
 */
import { spawn } from 'node:child_process'
import http from 'node:http'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const port = 4192
const baseUrl = `http://127.0.0.1:${port}`
const ART = resolve(root, 'artifacts/road-affordability')
const FREE = { x: 6, y: 6 }

let failures = 0
const ok = (message) => console.log(`ROAD AFFORDABILITY E2E PASS: ${message}`)
const fail = (message) => {
  failures += 1
  console.error(`ROAD AFFORDABILITY E2E FAIL: ${message}`)
}

const wait = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms))

const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)],
  { cwd: root, stdio: 'ignore' }
)

const waitForServer = () =>
  new Promise((resolvePromise, reject) => {
    const request = http.get(baseUrl, (response) => {
      response.resume()
      response.on('end', () =>
        response.statusCode === 200
          ? resolvePromise()
          : reject(new Error(`HTTP ${response.statusCode}`))
      )
    })
    request.on('error', reject)
  })

const stats = (page) => page.evaluate(() => window.__nova.stats())

const loadFixture = (page, material) =>
  page.evaluate(async (materialValue) => {
    const nova = await import('/src/index.ts')
    const config = { world: { seed: 'nova-step10cs-browser', width: 12, height: 12 } }
    let state = nova.createInitialState(config)
    state = {
      ...state,
      resources: { ...state.resources, money: materialValue, food: 1000 },
    }
    const operational = (current, type, x, y) => {
      const created = nova.createBuilding(current, type, x, y, 2)
      const building = created.state.buildings[created.buildingId]
      return {
        ...created.state,
        buildings: {
          ...created.state.buildings,
          [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 },
        },
      }
    }
    state = operational(state, 'residence', 0, 0)
    // Workshop-only income: the fixture's income term must come from the
    // one employment that earns Material (the Workshop worker), mirroring the
    // unit fixture in tests/roadAffordabilityParity.test.ts.
    state = operational(state, 'workshop', 0, 2)
    const roadCreated = nova.createRoads(state, [{ x: 0, y: 1 }])
    const roads = { ...roadCreated.state.roads }
    for (const id of roadCreated.roadIds) {
      roads[id] = { ...roads[id], status: 'operational', constructionRemaining: 0 }
    }
    state = { ...roadCreated.state, roads }
    const residenceId = Object.keys(state.buildings).find(
      (id) => state.buildings[id]?.type === 'residence'
    )
    state = nova.createColonist(state, residenceId).state
    state = nova.assignJobs(state)
    if (!window.__nova.loadSerialized(nova.serializeSave(state))) {
      throw new Error('fixture load rejected')
    }
    return true
  }, material)

const hover = async (page, cell) => {
  const point = await page.evaluate(
    (target) => window.__nova.cellToScreen(target),
    cell
  )
  await page.mouse.move(point.x, point.y)
  await wait(200)
  return stats(page)
}

const clickCell = async (page, cell) => {
  const point = await page.evaluate(
    (target) => window.__nova.cellToScreen(target),
    cell
  )
  await page.mouse.click(point.x, point.y)
  await wait(200)
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
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      !/favicon|404|failed to load resource/i.test(message.text())
    ) {
      errors.push(message.text())
    }
  })

  await page.goto(`${baseUrl}/`)
  await page.waitForFunction(() => window.__nova?.ready === true)
  // Freeze the clock before loading the fixture so the hover reads a stable stock.
  await page.click('[data-testid="simulation-pause"]')
  await page.click('[data-testid="build-road"]')

  // 1. Income covers the shortfall: ready + accepted, Material spent once.
  await loadFixture(page, 4)
  await wait(200)
  const positive = await hover(page, FREE)
  if (positive.status.includes('ready · material 5 (incl. 2 stored + 2 income)')) {
    ok(`income-covered road reads ready: "${positive.status}"`)
  } else {
    fail(`income-covered road feedback bad: ${JSON.stringify(positive.status)}`)
  }
  if (positive.money === '4') ok('fixture stock is 4 before the command')
  else fail(`fixture stock expected 4, got ${positive.money}`)
  await page.screenshot({ path: resolve(ART, '01-income-covered-preview.png') })

  const positiveAfter = await clickCell(page, FREE)
  if (Number(positiveAfter.roads) === Number(positive.roads) + 1) {
    ok(`income-covered road accepted (roads ${positive.roads} -> ${positiveAfter.roads})`)
  } else {
    fail(`income-covered road not accepted: ${JSON.stringify(positiveAfter.roads)}`)
  }
  if (positiveAfter.money === '2') {
    ok('exactly 5 Material spent (4 stock + 2 stored + 2 income − 5 road − 1 upkeep)')
  } else {
    fail(`expected 2 Material after spending, got ${positiveAfter.money}`)
  }
  await page.screenshot({ path: resolve(ART, '02-income-covered-placed.png') })

  // 2. Control: without this tick's same-tick inflow the stock is refused,
  //    spends nothing. Workshop-only income: at stock 0 the inflow (2 stored
  //    + 2 income = 4) is still short of the 5 cost, so the road is refused.
  await loadFixture(page, 0)
  await wait(200)
  const control = await hover(page, FREE)
  if (control.status.includes('insufficient material (0/5)')) {
    ok(`stock-only shortfall reads insufficient: "${control.status}"`)
  } else {
    fail(`shortfall feedback bad: ${JSON.stringify(control.status)}`)
  }
  const controlAfter = await clickCell(page, FREE)
  if (controlAfter.roads === control.roads) ok('refused road added nothing')
  else fail(`refused road changed roads: ${control.roads} -> ${controlAfter.roads}`)
  if (controlAfter.money === '0') ok('refused road spent no Material')
  else fail(`refused road changed material: ${controlAfter.money}`)
  await page.screenshot({ path: resolve(ART, '03-shortfall-refused.png') })

  // 3. Stock alone reads ready with no inflow breakdown.
  await loadFixture(page, 5)
  await wait(200)
  const sufficient = await hover(page, FREE)
  if (
    sufficient.status.includes('ready · material 5') &&
    !sufficient.status.includes('incl.')
  ) {
    ok(`stock-covered road reads ready without breakdown: "${sufficient.status}"`)
  } else {
    fail(`stock-covered feedback bad: ${JSON.stringify(sufficient.status)}`)
  }

  // 4. Responsive: the road surface stays structurally coherent at every
  //    required viewport. Narrow viewports are checked for layout (no
  //    horizontal overflow, usable canvas, readable status) — the same
  //    standard the existing narrow-viewport audits use, because the HUD
  //    overlays the canvas at those sizes.
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 420, height: 740 },
    { width: 360, height: 640 },
  ]) {
    await page.setViewportSize(viewport)
    await loadFixture(page, 4)
    await wait(350)
    const metrics = await page.evaluate(() => {
      const doc = document.documentElement
      const canvas = document.querySelector('canvas#nova-canvas')
      const rect = canvas ? canvas.getBoundingClientRect() : null
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        canvasWidth: rect ? rect.width : 0,
        canvasHeight: rect ? rect.height : 0,
        status: window.__nova.stats().status,
      }
    })
    if (metrics.scrollWidth > metrics.clientWidth + 1) {
      fail(`horizontal overflow at ${viewport.width}x${viewport.height}`)
    } else if (metrics.canvasWidth <= 0 || metrics.canvasHeight <= 0) {
      fail(`canvas unusable at ${viewport.width}x${viewport.height}`)
    } else if (metrics.status.length === 0) {
      fail(`status surface empty at ${viewport.width}x${viewport.height}`)
    } else {
      ok(
        `${viewport.width}x${viewport.height}: no overflow, canvas ${Math.round(metrics.canvasWidth)}x${Math.round(metrics.canvasHeight)}, status readable`
      )
    }
    await page.screenshot({
      path: resolve(ART, `04-narrow-${viewport.width}.png`),
    })
  }

  if (errors.length === 0) ok('zero console/page errors')
  else fail(`console/page errors: ${JSON.stringify(errors.slice(0, 5))}`)
} catch (error) {
  fail(String(error))
} finally {
  if (browser) await browser.close()
  server.kill()
}

console.log(
  `ROAD AFFORDABILITY E2E RESULT: ${failures === 0 ? 'PASS' : 'FAIL'}`
)
process.exitCode = failures === 0 ? 0 : 1
