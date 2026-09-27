/*
 * NOVA Step G1.1 — demand-driven settlement growth E2E.
 *
 * Proves the causal chain in a real browser, without poking internal state:
 *
 *   Town fixture (two road networks, Water headroom, 6 occupied Residences)
 *     -> derived growth demand (stats)
 *     -> STEP: one deterministic autonomous Residence on network A at (0,1)
 *     -> normal construction lifecycle (under construction -> operational)
 *     -> bounded growth (anti-treadmill), never unbounded
 *
 * The fixture is assembled with the same domain constructors the app uses and
 * handed to the sanctioned serialized-load hook. All interaction is the real
 * simulation controls.
 * Screenshots: artifacts/growth/.
 */
import { spawn } from 'node:child_process'
import http from 'node:http'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const port = 4195
const baseUrl = `http://127.0.0.1:${port}`
const ART = resolve(root, 'artifacts/growth')

let failures = 0
const ok = (m) => console.log(`GROWTH E2E PASS: ${m}`)
const fail = (m) => {
  failures += 1
  console.error(`GROWTH E2E FAIL: ${m}`)
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

const step = async (page) => {
  const before = Number((await stats(page)).tick)
  await page.click('[data-testid="simulation-step"]')
  for (let i = 0; i < 60; i += 1) {
    if (Number((await stats(page)).tick) === before + 1) return
    await wait(100)
  }
  throw new Error(`tick ${before + 1} did not advance`)
}

const loadTownFixture = (page) =>
  page.evaluate(async () => {
    const nova = await import('/src/index.ts')
    const config = { world: { seed: 'nova-g1-1-browser', width: 16, height: 12 } }
    let state = nova.createInitialState(config)
    state = {
      ...state,
      resources: { ...state.resources, food: 1_000_000, water: 1_000_000, construction: 100_000 },
    }
    const op = (current, type, x, y) => {
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
    const road = (current, x, y) => {
      const created = nova.createRoads(current, [{ x, y }])
      const id = created.roadIds[0]
      const r = created.state.roads[id]
      return {
        ...created.state,
        roads: {
          ...created.state.roads,
          [id]: { ...r, status: 'operational', constructionRemaining: 0 },
        },
      }
    }
    for (const x of [1, 2, 3]) state = road(state, x, 1)
    state = op(state, 'residence', 1, 0)
    state = op(state, 'residence', 3, 0)
    state = op(state, 'well', 1, 2)
    state = op(state, 'well', 3, 2)
    for (const x of [5, 6, 7, 8, 9, 10, 11, 12]) state = road(state, x, 1)
    for (const x of [6, 8, 10, 12]) state = op(state, 'residence', x, 0)
    for (const x of [6, 8, 10]) state = op(state, 'farm', x, 2)
    state = op(state, 'workshop', 12, 2)
    const residences = Object.values(state.buildings)
      .filter((b) => b.type === 'residence')
      .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x))
    for (let i = 0; i < 6; i += 1) state = nova.createColonist(state, residences[i].id).state
    state = nova.assignJobs(state)
    if (!window.__nova.loadSerialized(nova.serializeSave(state))) {
      throw new Error('fixture load rejected')
    }
    return true
  })

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

  // 1. Growth is inactive before Town (default free play).
  const fresh = await stats(page)
  if (fresh.growthActive === 'false' && fresh.growthDemand === 'false') {
    ok('growth inactive before Town (default settlement)')
  } else {
    fail(`growth should be inactive before Town: ${JSON.stringify(fresh.growthActive)}/${fresh.growthDemand}`)
  }

  // 2. Town fixture → derived demand + deterministic cell.
  await loadTownFixture(page)
  await wait(300)
  const loaded = await stats(page)
  if (loaded.growthActive === 'true' && loaded.growthDemand === 'true') {
    ok(`Town growth demand derived (active ${loaded.growthActive}, demand ${loaded.growthDemand})`)
  } else {
    fail(`expected Town growth demand: ${JSON.stringify({ active: loaded.growthActive, demand: loaded.growthDemand })}`)
  }
  if (loaded.growthCell === '0,1') ok(`deterministic growth cell ${loaded.growthCell}`)
  else fail(`expected growth cell 0,1, got ${JSON.stringify(loaded.growthCell)}`)
  if (loaded.growthAffordable === 'true') ok('growth is affordable from the main stock')
  else fail(`expected affordable growth, got ${loaded.growthAffordable}`)

  const buildingsBefore = Number(loaded.buildings)
  const materialBefore = Number(loaded.construction)
  await page.screenshot({ path: resolve(ART, '01-town-demand.png') })

  // 3. One STEP → exactly one autonomous Residence, under construction.
  await step(page)
  const afterOne = await stats(page)
  if (Number(afterOne.buildings) === buildingsBefore + 1) {
    ok(`one autonomous Residence per tick (${buildingsBefore} -> ${afterOne.buildings})`)
  } else {
    fail(`expected exactly one new building, got ${buildingsBefore} -> ${afterOne.buildings}`)
  }
  if (Number(afterOne.construction) < materialBefore) {
    ok(`growth spent Material (${materialBefore} -> ${afterOne.construction})`)
  } else {
    fail(`expected Material to be spent, got ${materialBefore} -> ${afterOne.construction}`)
  }
  const grown = await page.evaluate(() => window.__nova.buildingAt({ x: 0, y: 1 }))
  if (grown !== null && grown.type === 'residence') {
    ok(`autonomous Residence at 0,1 (${grown.status ?? 'under construction'})`)
  } else {
    fail(`expected a Residence at 0,1, got ${JSON.stringify(grown)}`)
  }
  await page.screenshot({ path: resolve(ART, '02-growth-started.png') })

  // 4. Normal construction lifecycle: 2 ticks to operational.
  await step(page)
  await step(page)
  const afterBuild = await stats(page)
  const operationalGrown = await page.evaluate(() => window.__nova.buildingAt({ x: 0, y: 1 }))
  if (operationalGrown?.status === 'operational') {
    ok(`autonomous Residence completed through the normal lifecycle (${afterBuild.operational} operational)`)
  } else {
    fail(`expected the grown Residence operational, got ${JSON.stringify(operationalGrown?.status)}`)
  }

  // 5. Bounded growth (anti-treadmill): network A has only a few eligible
  //    cells and Water capacity bounds served population, so growth must stop.
  for (let i = 0; i < 30; i += 1) await step(page)
  const settled = await stats(page)
  const buildingsGrown = Number(settled.buildings)
  if (buildingsGrown <= 16) {
    ok(`growth is bounded (${buildingsGrown} buildings after 33 ticks, demand ${settled.growthDemand})`)
  } else {
    fail(`growth ran unbounded: ${buildingsGrown} buildings`)
  }
  for (let i = 0; i < 5; i += 1) await step(page)
  const stable = await stats(page)
  if (Number(stable.buildings) === buildingsGrown) {
    ok(`growth has stopped (${buildingsGrown} buildings held over 5 further ticks)`)
  } else {
    fail(`growth still running: ${buildingsGrown} -> ${stable.buildings}`)
  }
  await page.screenshot({ path: resolve(ART, '03-growth-bounded.png') })

  // 6. The player-controlled Residence path still works.
  await page.selectOption('[data-testid="scenario-select"]', 'default')
  await wait(300)
  await page.click('[data-testid="simulation-pause"]')
  await page.click('[data-testid="build-residence"]')
  const point = await page.evaluate(() => window.__nova.cellToScreen({ x: 6, y: 6 }))
  await page.mouse.move(point.x, point.y)
  await wait(200)
  await page.mouse.click(point.x, point.y)
  await wait(300)
  const playerBuilt = await page.evaluate(() => window.__nova.buildingAt({ x: 6, y: 6 }))
  if (playerBuilt !== null && playerBuilt.type === 'residence') {
    ok('player-controlled Residence placement still works')
  } else {
    fail(`player placement broke: ${JSON.stringify(playerBuilt)}`)
  }

  if (errors.length === 0) ok('zero console/page errors')
  else fail(`console/page errors: ${JSON.stringify(errors.slice(0, 5))}`)
} catch (error) {
  fail(String(error))
} finally {
  if (browser) await browser.close()
  server.kill()
}

console.log(`GROWTH E2E RESULT: ${failures === 0 ? 'PASS' : 'FAIL'}`)
process.exitCode = failures === 0 ? 0 : 1
