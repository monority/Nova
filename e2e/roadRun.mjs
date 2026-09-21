/* NOVA Step 09H road construction E2E — re-baselined for Step 10AD
 * (Workshop = 25 Material + 1 Water, one-off at placement) and Step 10AD-1
 * (shared placement affordability predicate).
 *
 * The subject is unchanged: road placement, road cost, road access and the
 * production consequence.
 *
 *   Residence -> Colonist -> roadless Workshop blocked
 *     -> player constructs the connecting road (real canvas drag)
 *     -> road under construction -> operational
 *     -> building road access -> production resumes
 *
 * Two Step 10AD bootstrap consequences are part of this proof:
 *   - a Workshop now costs 1 Water, so the Water-producing Well and the real
 *     road palette are part of the minimal setup;
 *   - the old "Workshop connected but Residence not" intermediate state
 *     (historical part F) is NOT affordable under the new contract: the
 *     Residence must already share the Well's network for the Water that
 *     pays for the Workshop, so a separate Workshop-side component plus a
 *     bridge road costs 105 Material. The suite therefore keeps the direct
 *     roadless -> connected -> staffed causality (see Step10AD.md).
 *
 * All state changes come from real palette clicks and real canvas pointer
 * gestures; window.__nova is only read (never mutated). Material deltas are
 * asserted against the authoritative stat surface (road cost 5/cell + the
 * unchanged Workshop upkeep), and the derived 09G/09M mobility relation is
 * checked to stay informational.
 * Screenshots: artifacts/road/01..06.
 * Mode: headed by default, override NOVA_ROAD_MODE=headless.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const VITE_DIR = dirname(fileURLToPath(import.meta.resolve('vite/package.json')));
const VITE_BIN = join(VITE_DIR, require('vite/package.json').bin.vite);

const PORT = 4183;
const URL = `http://localhost:${PORT}/`;
const ART = 'artifacts/road';
const MODE = (process.env.NOVA_ROAD_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';
const ROAD_COST = 5;

const fail = (msg) => {
  console.error(`ROAD E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`ROAD E2E PASS: ${msg}`);

async function waitFor(fn, label, timeoutMs = 12000) {
  const start = Date.now();
  for (;;) {
    try {
      const v = await fn();
      if (v) return v;
    } catch { /* retry */ }
    if (Date.now() - start > timeoutMs) throw new Error(`timeout: ${label}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

const stats = (page) => page.evaluate(() => window.__nova.stats());
const num = (s, key) => Number(s[key]);

async function step(page) {
  const before = num(await stats(page), 'tick');
  await page.click('[data-testid="simulation-step"]');
  await waitFor(async () => num(await stats(page), 'tick') === before + 1, `tick ${before + 1}`);
  return stats(page);
}

async function stepUntil(page, pred, label, maxTicks = 60) {
  for (let i = 0; i < maxTicks; i++) {
    const s = await stats(page);
    if (pred(s)) return s;
    await step(page);
  }
  throw new Error(`timeout: ${label}`);
}

async function pointAt(page, cell) {
  const pt = await page.evaluate((c) => window.__nova.cellToScreen(c), cell);
  if (!pt) throw new Error(`cellToScreen null for ${cell.x},${cell.y}`);
  await page.mouse.move(pt.x, pt.y);
  return pt;
}

async function selectPalette(page, testid, expectedLabel) {
  // The palette click is the real UI input under test; a stray OS-level
  // pointermove can overwrite the status line right afterwards, so the
  // feedback assertion is retried instead of racing a single read.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.click(`[data-testid="${testid}"]`);
    const s = await stats(page);
    if (!s.status.includes(expectedLabel)) {
      await new Promise((r) => setTimeout(r, 100));
      continue;
    }
    const pressed = await page.getAttribute(`[data-testid="${testid}"]`, 'aria-pressed');
    if (pressed !== 'true') throw new Error(`${testid} not aria-pressed: ${pressed}`);
    return s;
  }
  throw new Error(`palette feedback missing for ${testid}: ${JSON.stringify((await stats(page)).status)}`);
}

/** Real canvas click placing the selected building tool. The `ready` wait is
 * the shared Step 10AD-1 affordability predicate, never a test-local rule. */
async function placeBuilding(page, cell) {
  const pt = await pointAt(page, cell);
  await waitFor(async () => (await stats(page)).status.includes('ready'), `valid preview at ${cell.x},${cell.y}`);
  const before = num(await stats(page), 'buildings');
  await page.mouse.click(pt.x, pt.y);
  await waitFor(async () => num(await stats(page), 'buildings') === before + 1, `placed at ${cell.x},${cell.y}`);
}

/** Real canvas drag placing the road gesture start -> end. */
async function dragRoads(page, start, end) {
  const from = await pointAt(page, start);
  await page.mouse.down();
  const to = await page.evaluate((c) => window.__nova.cellToScreen(c), end);
  if (!to) throw new Error(`cellToScreen null for ${end.x},${end.y}`);
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await waitFor(async () => (await stats(page)).status.includes('ready'), `road drag preview ${start.x},${start.y}->${end.x},${end.y}`);
  const before = await stats(page);
  await page.mouse.up();
  await waitFor(async () => num(await stats(page), 'roads') > num(before, 'roads'), `road gesture committed`);
  return { before, after: await stats(page) };
}

async function selectAt(page, cell) {
  const pt = await pointAt(page, cell);
  await page.mouse.click(pt.x, pt.y);
  await waitFor(async () => (await page.evaluate(() => window.__nova.selectedBuilding())) !== null, `selected at ${cell.x},${cell.y}`);
  return page.evaluate(() => window.__nova.selectedBuilding());
}

// --- Scenario 1 layout (roadless -> connected Workshop) ---------------------
const RESIDENCE = { x: 8, y: 4 };
const WELL_ROAD_START = { x: 7, y: 4 };
const WELL_ROAD_END = { x: 7, y: 6 };
const WELL = { x: 6, y: 6 };
const WORKSHOP = { x: 6, y: 3 };
const WORKSHOP_ROAD = { x: 6, y: 4 };

// --- Scenario 2 layout (09M nearest-workplace preference through roads) -----
const PREF_RESIDENCE = { x: 3, y: 3 };
const PREF_ROADS = [{ x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }];
const PREF_WELL = { x: 3, y: 5 };
const PREF_FARM = { x: 5, y: 4 };
const PREF_SHORTCUT = { x: 3, y: 4 };

async function main() {
  const preview = spawn(process.execPath, [VITE_BIN, 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'pipe',
    shell: false,
  });
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(URL);
      if (res.ok) break;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
    if (i === 99) throw new Error('preview start timeout');
  }
  ok(`server reachable at ${URL}`);

  let browser;
  const errors = [];
  try {
    mkdirSync(ART, { recursive: true });
    const browserArgs = [];
    if (HEADLESS) browserArgs.push('--headless=new');
    browserArgs.push('--ignore-gpu-blocklist');
    browser = await chromium.launch({ headless: HEADLESS, args: browserArgs });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('Failed to load resource')) {
        errors.push(`console: ${m.text()}`);
      }
    });
    page.on('response', (r) => {
      if (r.status() >= 400 && !/\/favicon\.ico$/i.test(r.url())) {
        errors.push(`http ${r.status()}: ${r.url()}`);
      }
    });
    const shot = (name) => page.screenshot({ path: `${ART}/${name}` });

    // =====================================================================
    // Scenario 1 — roadless Workshop blocked, roads restore production
    // =====================================================================
    // A. Clean deterministic start; the Road tool is player-selectable.
    await page.goto(URL, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
    let s = await stats(page);
    if (s.tick !== '0' || s.roads !== '0' || s.operationalRoads !== '0' || s.construction !== '100') {
      fail(`A fresh state bad: ${JSON.stringify(s)}`);
    } else ok(`A fresh: tick 0, roads 0, material ${s.construction}`);
    await selectPalette(page, 'build-road', 'Road selected');
    const roadLabel = await page.textContent('[data-testid="build-road"]');
    if (!roadLabel.includes(String(ROAD_COST))) fail(`road label missing cost: ${roadLabel}`);
    else ok(`A road tool selected, label "${roadLabel.trim()}"`);

    // B. Preview: valid empty cell vs a building cell (authoritative reasons).
    await pointAt(page, { x: 5, y: 3 });
    s = await stats(page);
    if (!s.status.includes('ready') || !s.status.includes(`material ${ROAD_COST}`)) {
      fail(`B road preview bad: ${JSON.stringify(s.status)}`);
    } else ok(`B valid preview: ${s.status}`);
    await shot('01-road-preview.png');

    // C. Residence -> Colonist -> road network -> Well (the Water producer the
    //    10AD Workshop contract requires) -> roadless Workshop stays idle.
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeBuilding(page, RESIDENCE);
    s = await stepUntil(page, (v) => v.colonists === '1', 'first colonist', 10);
    ok(`C colonist admitted at tick ${s.tick}`);

    await selectPalette(page, 'build-road', 'Road selected');
    const wellDrag = await dragRoads(page, WELL_ROAD_START, WELL_ROAD_END);
    const upkeepAtDrag = num(wellDrag.before, 'materialUpkeep');
    const expectedDrag = num(wellDrag.before, 'construction') - 3 * ROAD_COST - upkeepAtDrag;
    if (num(wellDrag.after, 'construction') !== expectedDrag) {
      fail(`C road drag material cost wrong: ${JSON.stringify({ expectedDrag, got: wellDrag.after.construction })}`);
    } else {
      ok(`C 3-cell drag placed: material ${wellDrag.before.construction} -> ${wellDrag.after.construction} (3 x ${ROAD_COST} + upkeep ${upkeepAtDrag})`);
    }
    if (wellDrag.after.roads !== '3' || wellDrag.after.operationalRoads !== '0') {
      fail(`C roads must start under construction: ${JSON.stringify(wellDrag.after)}`);
    } else ok(`C construction state visible: ${wellDrag.after.roads} roads, ${wellDrag.after.operationalRoads} operational`);
    await shot('02-roads-under-construction.png');

    s = await stepUntil(page, (v) => v.operationalRoads === '3', 'roads operational', 10);
    ok(`C roads operational at tick ${s.tick}`);

    await selectPalette(page, 'build-well', 'Well selected');
    await placeBuilding(page, WELL);
    s = await stepUntil(page, (v) => v.waterProduction === '2', 'staffed Well producing', 10);
    ok(`C Well operational and staffed at tick ${s.tick}: water ${s.water}, production ${s.waterProduction}`);

    await selectPalette(page, 'build-workshop', 'Workshop selected');
    s = await stepUntil(page, (v) => Number(v.water) >= 1, 'water buffer for the Workshop', 10);
    await placeBuilding(page, WORKSHOP); // roadless
    s = await stepUntil(page, (v) => v.workshops === '1' && v.storageCapacity === '25', 'roadless workshop operational', 10);
    if (s.staffedWorkshopIds !== '' || s.materialProduction !== '0' || s.materialUpkeep !== '0') {
      fail(`C roadless workshop must be idle and free: ${JSON.stringify(s)}`);
    } else {
      ok(`C roadless Workshop idle: workers 0, production ${s.materialProduction}, upkeep ${s.materialUpkeep} (mobility-blocked, not a free workplace)`);
    }
    await selectAt(page, WORKSHOP);
    const roadlessText = await page.locator('[data-testid="inspection-housing"]').textContent();
    if (!roadlessText.includes('upkeep 0 (vacant)')) {
      fail(`C roadless workshop inspection bad: ${JSON.stringify(roadlessText)}`);
    } else ok(`C inspection: "${roadlessText}"`);
    await shot('03-roadless-production-blocked.png');

    // D. Invalid gestures never spend Material: building cell + diagonal drag.
    await selectPalette(page, 'build-road', 'Road selected');
    const beforeInvalid = await stats(page);
    const buildingCell = await pointAt(page, WORKSHOP);
    s = await stats(page);
    if (!s.status.includes('occupied by building')) fail(`D building cell preview bad: ${JSON.stringify(s.status)}`);
    await page.mouse.click(buildingCell.x, buildingCell.y);
    s = await stats(page);
    if (num(s, 'roads') !== num(beforeInvalid, 'roads')) fail(`D click on building added a road: ${JSON.stringify(s)}`);
    else ok('D building cell rejected, no road, no Material spent');

    await pointAt(page, { x: 0, y: 0 });
    await page.mouse.down();
    await pointAt(page, { x: 1, y: 1 });
    s = await stats(page);
    if (!s.status.includes('diagonal drag not supported')) fail(`D diagonal drag feedback bad: ${JSON.stringify(s.status)}`);
    await page.mouse.up();
    s = await stats(page);
    if (num(s, 'roads') !== num(beforeInvalid, 'roads')) fail(`D diagonal drag added roads: ${JSON.stringify(s)}`);
    else ok('D diagonal drag rejected by the existing 09C geometry rule');

    // E. Player constructs the Workshop-side road: a single-cell gesture from
    //    the main road to the Workshop contact cell.
    const beforeConnect = await stats(page);
    const connect = await dragRoads(page, WORKSHOP_ROAD, WORKSHOP_ROAD);
    if (num(connect.after, 'roads') !== num(beforeConnect, 'roads') + 1) {
      fail(`E Workshop-side road placement failed: ${JSON.stringify(connect.after)}`);
    } else {
      ok(`E single-cell road placed via the same command path (roads ${connect.after.roads})`);
    }
    await shot('04-workshop-road.png');

    // F. Advancing completes the road: the Workshop now has road access and
    //    becomes the colonist's workplace -> production resumes.
    s = await stepUntil(page, (v) => v.operationalRoads === '4', 'all roads operational', 10);
    if (num(s, 'buildingsWithRoadAccess') < 2) {
      fail(`F Workshop has no road access: ${JSON.stringify(s)}`);
    }
    s = await stepUntil(page, (v) => v.employed === '1' && v.materialProduction === '2', 'workshop staffed and producing', 10);
    if (s.staffedWorkshopIds === '') fail(`F Workshop must be staffed once connected: ${JSON.stringify(s)}`);
    if (s.mobilityConnectedColonists !== '1') {
      fail(`F derived mobility relation missing: ${JSON.stringify(s)}`);
    }
    ok(
      `F mobility connected -> employed ${s.employed}, production ${s.materialProduction}/tick, upkeep ${s.materialUpkeep}, mobilityConnected ${s.mobilityConnectedColonists}`
    );
    await shot('05-roads-operational-production.png');

    // =====================================================================
    // Scenario 2 — 09M: nearest workplace wins through the real road UI,
    // and a road shortcut reassigns the worker.
    // =====================================================================
    await page.goto(URL, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');

    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeBuilding(page, PREF_RESIDENCE);
    await stepUntil(page, (v) => v.colonists === '1', 'preference scenario colonist', 10);

    // FARTHER workplace first -> lower id. The Well contacts (4,5): 2 road
    // steps from the Residence's (4,3) contact.
    await selectPalette(page, 'build-well', 'Well selected');
    await placeBuilding(page, PREF_WELL);
    await stepUntil(page, (v) => v.hasOperationalWell === 'true', 'preference Well operational', 10);

    // NEARER workplace second -> higher id. The Farm contacts (4,4): 1 road
    // step away, so a lowest-id rule would pick the wrong one.
    await selectPalette(page, 'build-farm', 'Farm selected');
    await placeBuilding(page, PREF_FARM);
    await stepUntil(page, (v) => v.farms === '1' && v.operational === '3', 'preference Farm operational', 10);

    await selectPalette(page, 'build-road', 'Road selected');
    for (const cell of PREF_ROADS) await dragRoads(page, cell, cell);
    await stepUntil(page, (v) => v.operationalRoads === String(PREF_ROADS.length), 'preference roads operational', 10);
    s = await stepUntil(page, (v) => v.employed === '1', 'exactly one worker placed', 10);
    if (s.staffedFarmIds === '') {
      fail(`H nearest Farm (higher id) must beat the farther Well (lower id): ${JSON.stringify(s)}`);
    } else {
      ok(`H nearest workplace staffed: Farm (nearer, higher id) beats the farther Well (lower id); water production ${s.waterProduction}`);
    }
    await shot('06-nearest-workplace-selected.png');

    // I. The shortcut (3,4) is a contact of BOTH the Residence and the Well,
    //    so the Well's distance drops to 0 and the worker must move there.
    await dragRoads(page, PREF_SHORTCUT, PREF_SHORTCUT);
    s = await stepUntil(page, (v) => v.waterProduction === '2', 'worker reassigned to the Well', 10);
    if (s.staffedFarmIds !== '') {
      fail(`I shortcut must reassign the worker to the Well: farms "${s.staffedFarmIds}"`);
    } else {
      ok(`I shortcut reassigned the worker to the Well (now at distance 0); Farm vacancy restored`);
    }
    await shot('07-preference-reassigned.png');

    const realErrors = errors.filter((e) => !e.includes('favicon'));
    if (realErrors.length > 0) fail(`browser errors: ${realErrors.join(' | ')}`);
    else ok('zero console/page errors');
  } catch (e) {
    if (!process.exitCode) {
      console.error(`ROAD E2E FAIL: ${e.message}`);
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('ROAD E2E RESULT: FAIL');
  else console.log('ROAD E2E RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`ROAD E2E FAIL: ${e.message}`);
  process.exitCode = 1;
});
