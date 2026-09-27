/*
 * NOVA Step 10CT reserve-aware building affordability E2E.
 *
 * Step 10BJ releases Material above the protected Storage floor (15) to fund a
 * valid `placeBuilding` transaction. The affordability query did not mirror
 * that release, so the hover/commit gate refused a building the deterministic
 * simulation would build. The proof in a real browser:
 *
 *   - main stock 0 + Storage 40 offers the Residence as ready, names the
 *     25 units of reserve, and is accepted (Storage ends at the 15 floor);
 *   - the same stock with Storage at the floor is refused and spends nothing;
 *   - the layout stays coherent at 1280x800, 420x740 and 360x640.
 *
 * The fixture is built with the same domain constructors the app uses and
 * handed to the sanctioned serialized-load hook; all input is real canvas
 * pointer movement + the real building palette.
 * Screenshots: artifacts/reserve-affordability/01..03.
 */
import { spawn } from 'node:child_process'
import http from 'node:http'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const port = 4193
const baseUrl = `http://127.0.0.1:${port}`
const ART = resolve(root, 'artifacts/reserve-affordability')
const FREE = { x: 6, y: 6 }

let failures = 0
const ok = (message) => console.log(`RESERVE AFFORDABILITY E2E PASS: ${message}`)
const fail = (message) => {
  failures += 1
  console.error(`RESERVE AFFORDABILITY E2E FAIL: ${message}`)
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

const loadFixture = (page, storageMaterial) =>
  page.evaluate(async (reserve) => {
    const nova = await import('/src/index.ts')
    const config = { world: { seed: 'nova-step10ct-browser', width: 12, height: 12 } }
    let state = nova.createInitialState(config)
    state = {
      ...state,
      resources: { ...state.resources, construction: 0, food: 1000 },
      storage: { ...state.storage, material: reserve },
    }
    if (!window.__nova.loadSerialized(nova.serializeSave(state))) {
      throw new Error('fixture load rejected')
    }
    return true
  }, storageMaterial)

const hover = async (page, cell, predicate) => {
  const points = await page.evaluate(
    (target) => {
      const point = window.__nova.cellToScreen(target)
      return point === null
        ? []
        : [
            point,
            { x: point.x + 2, y: point.y + 2 },
            { x: point.x - 2, y: point.y - 2 },
          ]
    },
    cell
  )
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const point = points[attempt % points.length]
    if (point === undefined) break
    await page.mouse.move(point.x, point.y)
    await wait(150)
    const snapshot = await stats(page)
    if (predicate(snapshot)) return snapshot
  }
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
  await page.click('[data-testid="simulation-pause"]')
  await page.click('[data-testid="build-residence"]')

  // 1. The protected reserve completes the building.
  await loadFixture(page, 40)
  await wait(250)
  const ready = await hover(
    page,
    FREE,
    (snapshot) => snapshot.status.includes('incl. 25 reserve')
  )
  if (ready.status.includes('ready · material 25 (incl. 25 reserve)')) {
    ok(`reserve-funded building reads ready: "${ready.status}"`)
  } else {
    fail(`reserve-funded feedback bad: ${JSON.stringify(ready.status)}`)
  }
  if (ready.buildings === '0' && ready.construction === '0') {
    ok('fixture starts with no buildings and 0 main Material')
  } else {
    fail(`fixture unexpected: buildings ${ready.buildings}, material ${ready.construction}`)
  }
  await page.screenshot({ path: resolve(ART, '01-reserve-preview.png') })

  const placed = await clickCell(page, FREE)
  if (placed.buildings === '1') ok('reserve-funded building accepted')
  else fail(`building not placed: buildings ${placed.buildings}`)
  if (placed.storageMaterial.startsWith('15')) {
    ok(`Storage dropped to the protected floor: "${placed.storageMaterial}"`)
  } else {
    fail(`Storage not at the floor: ${JSON.stringify(placed.storageMaterial)}`)
  }
  await page.screenshot({ path: resolve(ART, '02-reserve-placed.png') })

  // 2. Control: at the protected floor the same stock is refused, spends nothing.
  await loadFixture(page, 15)
  await wait(250)
  const refused = await hover(
    page,
    FREE,
    (snapshot) => snapshot.status.includes('insufficient material (0/25)')
  )
  if (refused.status.includes('insufficient material (0/25)')) {
    ok(`floor-protected refusal: "${refused.status}"`)
  } else {
    fail(`floor-protected feedback bad: ${JSON.stringify(refused.status)}`)
  }
  const refusedAfter = await clickCell(page, FREE)
  if (refusedAfter.buildings === '0') ok('refused building added nothing')
  else fail(`refused building changed buildings: ${refusedAfter.buildings}`)
  if (refusedAfter.storageMaterial.startsWith('15')) ok('refused building kept the reserve')
  else fail(`refused building changed Storage: ${refusedAfter.storageMaterial}`)
  await page.screenshot({ path: resolve(ART, '03-floor-refused.png') })

  // 3. Responsive: no horizontal overflow, usable canvas, readable status.
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 420, height: 740 },
    { width: 360, height: 640 },
  ]) {
    await page.setViewportSize(viewport)
    await loadFixture(page, 40)
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

console.log(`RESERVE AFFORDABILITY E2E RESULT: ${failures === 0 ? 'PASS' : 'FAIL'}`)
process.exitCode = failures === 0 ? 0 : 1
