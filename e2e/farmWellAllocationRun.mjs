/* Step 10BT1 - Farm/Well allocation expression browser validation. */
import { spawn } from 'node:child_process'
import http from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const port = 4191
const url = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], { cwd: root, stdio: 'ignore' })
const wait = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const waitForServer = () => new Promise((resolvePromise, reject) => {
  const request = http.get(url, (response) => {
    response.resume()
    response.on('end', () => response.statusCode === 200 ? resolvePromise() : reject(new Error(`HTTP ${response.statusCode}`)))
  })
  request.on('error', reject)
})

let browser
try {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { await waitForServer(); break } catch { await wait(250) }
    if (attempt === 39) throw new Error('dev server did not start')
  }
  browser = await chromium.launch({ headless: false })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error' && !/favicon|404|failed to load resource/i.test(message.text())) errors.push(message.text())
  })
  await page.goto(url)
  await page.waitForFunction(() => window.__nova?.ready === true)
  await page.evaluate(async () => {
    const nova = await import('/src/index.ts')
    const config = { world: { seed: 'nova-step10bt1-browser', width: 20, height: 8 } }
    let state = nova.createInitialState(config)
    state = { ...state, resources: { construction: 1000, food: 1000, water: 1000 } }
    const op = (current, type, x, y) => {
      const created = nova.createBuilding(current, type, x, y, 2)
      const building = created.state.buildings[created.buildingId]
      return { ...created.state, buildings: { ...created.state.buildings, [created.buildingId]: { ...building, status: 'operational', constructionRemaining: 0 } } }
    }
    const road = (current, x) => {
      const created = nova.createRoads(current, [{ x, y: 1 }])
      const id = created.roadIds[0]
      const value = created.state.roads[id]
      return { ...created.state, roads: { ...created.state.roads, [id]: { ...value, status: 'operational', constructionRemaining: 0 } } }
    }
    for (let index = 0; index < 5; index += 1) state = op(state, 'residence', 1 + index * 2, 0)
    for (let x = 0; x <= 12; x += 1) state = road(state, x)
    for (const [index, type] of ['well', 'well', 'well', 'farm', 'farm', 'farm'].entries()) state = op(state, type, 1 + index * 2, 2)
    for (let index = 0; index < 5; index += 1) state = nova.createColonist(state, `building-${index + 1}`).state
    state = nova.assignJobs(state)
    if (!window.__nova.loadSerialized(nova.serializeSave(state))) throw new Error('fixture rejected')
  })
  await wait(150)
  const clickCell = async (x, y) => {
    const point = await page.evaluate(({ x: cellX, y: cellY }) => window.__nova.cellToScreen({ x: cellX, y: cellY }), { x, y })
    await page.mouse.click(point.x, point.y)
  }
  const allocation = () => page.getByTestId('stat-allocation').textContent()
  const farmInspection = async (x, y) => { await clickCell(x, y); return page.getByTestId('inspection-worker').textContent() }
  const initial = await allocation()
  assert(initial?.includes('Farms 2/3') && initial.includes('Wells 3/3'), `unexpected initial allocation: ${initial}`)
  const farmText = await farmInspection(1, 2)
  assert(farmText?.includes('Worker'), `farm inspection missing worker state: ${farmText}`)
  const wellText = await farmInspection(1, 2)
  assert(wellText?.includes('Worker'), `well inspection missing worker state: ${wellText}`)
  const well = await page.evaluate(() => window.__nova.serialize())
  const parsed = JSON.parse(well).state.buildings
  const wellId = Object.values(parsed).find((building) => building.type === 'well' && building.status === 'operational').id
  const farmId = Object.values(parsed).find((building) => building.type === 'farm' && building.status === 'operational' && !Object.values(JSON.parse(well).state.colonists).some((colonist) => colonist.workplaceId === building.id)).id
  await clickCell(1, 2)
  await page.getByTestId('reassign-target').selectOption(farmId)
  await page.getByTestId('reassign-confirm').click()
  await wait(80)
  const changed = await allocation()
  assert(changed?.includes('Farms 3/3') && changed.includes('Wells 2/3'), `manual move did not update allocation: ${changed}`)
  const viewports = []
  for (const viewport of [{ width: 1280, height: 800 }, { width: 420, height: 740 }, { width: 360, height: 640 }]) {
    await page.setViewportSize(viewport)
    await wait(60)
    viewports.push({ ...viewport, bodyOverflow: await page.evaluate(() => document.body.scrollWidth > window.innerWidth), panelOverflow: await page.evaluate(() => { const panel = document.querySelector('#nova-ui'); return panel !== null && panel.scrollWidth > panel.clientWidth }) })
  }
  assert(viewports.every((entry) => !entry.bodyOverflow && !entry.panelOverflow), `responsive overflow: ${JSON.stringify(viewports)}`)
  assert(errors.length === 0, errors.join('; '))
  console.log('STEP 10BT1 E2E PASS')
  console.log(JSON.stringify({ initial, changed, viewports }))
} catch (error) {
  console.error(error.stack ?? error)
  process.exitCode = 1
} finally {
  if (browser !== undefined) await browser.close()
  server.kill()
}
