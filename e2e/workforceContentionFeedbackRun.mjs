/* NOVA Step 10BQ workforce contention feedback E2E. */

import { spawn } from 'node:child_process'
import http from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const port = 4190
const baseUrl = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], {
  cwd: root,
  stdio: 'ignore',
})

const wait = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const waitForServer = () => new Promise((resolvePromise, reject) => {
  const request = http.get(baseUrl, (response) => {
    response.resume()
    response.on('end', () => response.statusCode === 200 ? resolvePromise() : reject(new Error(`HTTP ${response.statusCode}`)))
  })
  request.on('error', reject)
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
  browser = await chromium.launch({ headless: false })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error' && !/favicon|404|failed to load resource/i.test(message.text())) errors.push(message.text())
  })

  await page.goto(`${baseUrl}/`)
  await page.waitForFunction(() => window.__nova?.ready === true)
  await page.evaluate(async () => {
    const nova = await import('/src/index.ts')
    const config = { world: { seed: 'nova-step10bq-browser', width: 16, height: 8 } }
    let state = nova.createInitialState(config)
    state = { ...state, resources: { construction: 1000, food: 1000, water: 1000 } }
    const operational = (current, type, x, y) => {
      const created = nova.createBuilding(current, type, x, y, 2)
      const building = created.state.buildings[created.buildingId]
      return {
        ...created.state,
        buildings: { ...created.state.buildings, [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 } },
      }
    }
    const road = (current, x) => {
      const created = nova.createRoads(current, [{ x, y: 1 }])
      const id = created.roadIds[0]
      const createdRoad = created.state.roads[id]
      return { ...created.state, roads: { ...created.state.roads, [id]: { ...createdRoad, status: 'operational', constructionRemaining: 0 } } }
    }
    for (let index = 0; index < 3; index += 1) state = operational(state, 'residence', 1 + index * 2, 0)
    for (let x = 0; x <= 10; x += 1) state = road(state, x)
    state = operational(state, 'farm', 1, 2)
    state = operational(state, 'farm', 3, 2)
    state = operational(state, 'well', 7, 2)
    state = operational(state, 'well', 9, 2)
    for (let index = 0; index < 3; index += 1) state = nova.createColonist(state, `building-${index + 1}`).state
    state = nova.assignJobs(state)
    if (!window.__nova.loadSerialized(nova.serializeSave(state))) throw new Error('fixture load rejected')
  })
  await wait(250)

  const clickCell = async (x, y) => {
    const point = await page.evaluate(({ x: cellX, y: cellY }) => window.__nova.cellToScreen({ x: cellX, y: cellY }), { x, y })
    await page.mouse.click(point.x, point.y)
  }
  // The fixture is already the 10BO contention state.
  await wait(250)

  const snapshot = await page.evaluate(() => ({
    stats: window.__nova.stats(),
    buildings: JSON.parse(window.__nova.serialize()).state.buildings,
  }))
  const workplaces = Object.values(snapshot.buildings)
    .filter((building) => (building.type === 'farm' || building.type === 'well') && building.status === 'operational')
    .sort((a, b) => a.id.localeCompare(b.id))
  assert(snapshot.stats.colonists === '3', `expected 3 colonists, got ${snapshot.stats.colonists}`)
  assert(snapshot.stats.jobs === '3 / 4', `expected 3 / 4 jobs, got ${snapshot.stats.jobs}`)

  const workplaceViews = []
  for (const workplace of workplaces) {
    await clickCell(workplace.x, workplace.y)
    await wait(30)
    workplaceViews.push({
      id: workplace.id,
      type: workplace.type,
      text: await page.getByTestId('inspection-worker').textContent(),
    })
  }
  const contention = workplaceViews.find((view) => view.text.includes('no worker available'))
  assert(contention !== undefined, `no contention feedback found: ${JSON.stringify(workplaceViews)}`)

  const staffed = workplaceViews.find((view) => view.text.includes('automatic assignment'))
  assert(staffed !== undefined, `no staffed workplace found: ${JSON.stringify(workplaceViews)}`)
  const staffedState = Object.values(snapshot.buildings).find((building) => building.id === staffed.id)
  await clickCell(staffedState.x, staffedState.y)
  await page.getByTestId('reassign-target').selectOption(contention.id)
  await page.getByTestId('reassign-confirm').click()
  await wait(100)
  await clickCell(contentionState(snapshot, contention.id).x, contentionState(snapshot, contention.id).y)
  assert(!(await page.getByTestId('inspection-worker').textContent()).includes('no worker available'), 'contention remained after manual reassignment')

  const viewportResults = []
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 420, height: 740 },
    { width: 360, height: 640 },
  ]) {
    await page.setViewportSize(viewport)
    await wait(80)
    viewportResults.push({
      ...viewport,
      bodyOverflow: await page.evaluate(() => document.body.scrollWidth > window.innerWidth),
      panelOverflow: await page.evaluate(() => {
        const panel = document.querySelector('#nova-ui')
        return panel !== null && panel.scrollWidth > panel.clientWidth
      }),
    })
  }
  assert(viewportResults.every((result) => !result.bodyOverflow && !result.panelOverflow), `viewport overflow: ${JSON.stringify(viewportResults)}`)
  assert(errors.length === 0, `browser errors: ${errors.join('; ')}`)
  console.log('STEP 10BQ E2E PASS')
  console.log(JSON.stringify({ workplaces: workplaceViews, viewportResults }, null, 2))
} catch (error) {
  console.error(error.stack ?? error)
  process.exitCode = 1
} finally {
  if (browser !== undefined) await browser.close()
  server.kill()
}

function contentionState(snapshot, id) {
  return Object.values(snapshot.buildings).find((building) => building.id === id)
}
