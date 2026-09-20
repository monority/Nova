/* NOVA Step 08C upkeep E2E — re-baselined for Step 09F (road access) and
 * Step 10E (farm employment). Plain Node, playwright core only.
 *
 * Real browser causal proof of operational upkeep:
 *   1 worker -> +2 production, 1 upkeep, net +1/tick below capacity
 *   2 workers -> +4 production, 2 upkeep, net +2/tick below capacity
 *   vacant/non-workshops pay 0, deficit clamps without deactivation,
 *   recovery refills to affordable construction.
 *
 * Two rule changes since this suite was written are now part of the proof:
 *   - Step 09F: Material production needs operational road access, so every
 *     staffed Workshop here is road-connected through the real 09H road
 *     palette (the old "deferred: no road palette" guard is obsolete).
 *   - Step 10E: a Farm produces Food only while staffed, so farms are no
 *     longer a free food source; material drains in this suite therefore use
 *     ROADS (5 each, no upkeep, no food effect) instead of idle farms.
 *
 * All state changes come from real palette clicks on the canvas and real
 * STEP controls. window.__nova is only read (never mutated); causal texts
 * are asserted on the real DOM. Screenshots: artifacts/upkeep/01..09.
 * Mode: headed by default, override NOVA_UPKEEP_MODE=headless.
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

const PORT = 4181;
const URL = `http://localhost:${PORT}/`;
const ART = 'artifacts/upkeep';
const MODE = (process.env.NOVA_UPKEEP_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';

const fail = (msg) => {
  console.error(`UPKEEP E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`UPKEEP E2E PASS: ${msg}`);

async function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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
const statusText = (page) => page.locator('[data-testid="ui-status"]').textContent();
const inspectionText = (page) => page.locator('[data-testid="inspection-housing"]').textContent();

async function step(page) {
  const before = Number((await stats(page)).tick);
  await page.click('[data-testid="simulation-step"]');
  await waitFor(async () => Number((await stats(page)).tick) === before + 1, `tick ${before + 1}`);
  return stats(page);
}

async function moveTo(page, cell) {
  const pt = await page.evaluate((c) => window.__nova.cellToScreen(c), cell);
  if (!pt) throw new Error(`cellToScreen null for ${cell.x},${cell.y}`);
  await page.mouse.move(pt.x, pt.y);
  return pt;
}

/** Real canvas click on an empty cell: places the currently selected type. */
async function placeAt(page, cell) {
  const pt = await moveTo(page, cell);
  await waitFor(async () => (await stats(page)).status.includes('ready'), `valid preview at ${cell.x},${cell.y}`);
  const before = Number((await stats(page)).buildings);
  await page.mouse.click(pt.x, pt.y);
  await waitFor(async () => Number((await stats(page)).buildings) === before + 1, `placed at ${cell.x},${cell.y}`);
}

/** Single-cell road through the real 09H road gesture. */
async function placeRoad(page, cell) {
  const pt = await moveTo(page, cell);
  await page.mouse.down();
  await page.mouse.move(pt.x, pt.y, { steps: 2 });
  await waitFor(async () => (await stats(page)).status.includes('ready'), `road preview at ${cell.x},${cell.y}`);
  const before = Number((await stats(page)).roads);
  await page.mouse.up();
  await waitFor(async () => Number((await stats(page)).roads) === before + 1, `road at ${cell.x},${cell.y}`);
}

/** Real canvas click through an "insufficient" hover (Step 08G): the rest
 * stock is below cost, but this tick's stored production covers the
 * shortfall, so the domain accepts the transaction mid-tick. */
async function placeThroughShortfall(page, cell) {
  const pt = await moveTo(page, cell);
  await waitFor(async () => (await stats(page)).status.includes('insufficient material'), `shortfall preview at ${cell.x},${cell.y}`);
  const before = Number((await stats(page)).buildings);
  await page.mouse.click(pt.x, pt.y);
  await waitFor(async () => Number((await stats(page)).buildings) === before + 1, `gate-covered placement at ${cell.x},${cell.y}`);
}

/** Real canvas click on an occupied cell: selects the building for inspection. */
async function selectAt(page, cell) {
  const pt = await moveTo(page, cell);
  await page.mouse.click(pt.x, pt.y);
  await waitFor(async () => (await page.evaluate(() => window.__nova.selectedBuilding())) !== null, `selected at ${cell.x},${cell.y}`);
  return page.evaluate(() => window.__nova.selectedBuilding());
}

async function selectPalette(page, testid, expectedLabel) {
  await page.click(`[data-testid="${testid}"]`);
  const s = await stats(page);
  if (!s.status.includes(expectedLabel)) throw new Error(`palette feedback missing for ${testid}: ${JSON.stringify(s.status)}`);
  return s;
}

async function stepUntil(page, pred, label, maxTicks = 40) {
  for (let i = 0; i < maxTicks; i++) {
    const s = await stats(page);
    if (pred(s)) return s;
    await step(page);
  }
  throw new Error(`timeout: ${label}`);
}

async function refill(page, maxTicks = 60) {
  for (let i = 0; i < maxTicks; i++) {
    const s = await stats(page);
    if (Number(s.construction) >= 25) return s;
    await step(page);
  }
  throw new Error('refill never reached 25');
}

async function reload(page) {
  await page.goto(URL, { waitUntil: 'load' });
  await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
}

async function main() {
  const preview = spawn(process.execPath, [VITE_BIN, 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'pipe',
    shell: false,
  });
  let up = false;
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(URL);
      if (res.ok) { up = true; break; }
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
    if (i === 99) throw new Error('preview start timeout');
  }
  if (!up) throw new Error('server did not become reachable');
  ok(`server reachable at ${URL}`);

  let browser;
  const errors = [];
  try {
    mkdirSync(ART, { recursive: true });
    browser = await chromium.launch({ headless: HEADLESS });
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

    // ---------------------------------------------------------------------
    // A/B/J/C/K/L — one staffed workshop, capacity band, deficit clamp
    // Layout: Workshop (4,4), contact road (5,4), Residence (6,4).
    // ---------------------------------------------------------------------
    await reload(page);
    ok('load, app ready');
    let s = await stats(page);
    if (s.tick !== '0' || s.construction !== '100' || s.materialUpkeep !== '0' || s.netMaterial !== '0') {
      fail(`A fresh bad: ${JSON.stringify(s)}`);
    } else ok(`A fresh: material 100, upkeep ${s.materialUpkeep}, net ${s.netMaterial}`);
    await shot('01-fresh.png');

    // B. Workshop first: operational but vacant -> upkeep 0, no leak. (A
    // vacant workshop needs no road access because nobody travels to it.)
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 4, y: 4 });
    // J. Under construction: no capacity/production/upkeep.
    s = await stats(page);
    if (s.storageCapacity !== '0' || s.materialProduction !== '0' || s.materialUpkeep !== '0' || s.construction !== '75') {
      fail(`J under-construction bad: ${JSON.stringify(s)}`);
    } else ok('J under construction: capacity 0, production 0, upkeep 0');
    s = await step(page); // t2: operational, vacant
    if (s.materialUpkeep !== '0' || s.netMaterial !== '0' || s.construction !== '75' || s.tick !== '2' || s.storageCapacity !== '25') {
      fail(`B vacant bad: ${JSON.stringify(s)}`);
    } else ok(`B vacant workshop: upkeep 0, net 0, material ${s.construction}, capacity ${s.storageCapacity} (no leak)`);
    await selectAt(page, { x: 4, y: 4 });
    const vacantInspection = await inspectionText(page);
    if (!vacantInspection.includes('upkeep 0 (vacant)')) {
      fail(`B inspection missing vacant upkeep: ${JSON.stringify(vacantInspection)}`);
    } else ok(`B inspection: "${vacantInspection}"`);
    await shot('02-vacant.png');

    // C. Road + Residence -> colonist staffs the Workshop: upkeep 1, capacity
    // 25 still below the bootstrap stock, so stored production is 0 and the
    // column drains -1/tick (Step 08F).
    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 5, y: 4 }); // t3
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 6, y: 4 }); // t4
    s = await step(page); // t5: road + residence operational, colonist staffed
    if (s.colonists !== '1' || s.materialUpkeep !== '1' || s.storageCapacity !== '25' || s.employed !== '1') {
      fail(`C staffed bad: ${JSON.stringify(s)}`);
    } else ok(`C 1 worker: employed ${s.employed}, upkeep ${s.materialUpkeep}, net ${s.netMaterial} (capacity ${s.storageCapacity}), material ${s.construction}`);
    s = await step(page); // t6: no newcomer, production/upkeep readout visible
    const causal = await statusText(page);
    if (!causal.includes('1 worker produced 2 material') || !causal.includes('upkeep 1')) {
      fail(`C causal text bad: ${JSON.stringify(causal)}`);
    } else ok(`C status: "${causal}"`);
    await selectAt(page, { x: 4, y: 4 });
    const staffedInspection = await inspectionText(page);
    if (!staffedInspection.includes('upkeep 1/tick')) {
      fail(`C inspection missing staffed upkeep: ${JSON.stringify(staffedInspection)}`);
    } else ok(`C inspection: "${staffedInspection}"`);
    await shot('03-staffed.png');

    // C-sustain: above capacity, stored production is 0, so upkeep alone
    // drains -1/tick. Material never goes negative.
    let prev = Number((await stats(page)).construction);
    let peak = prev;
    for (let i = 0; i < 10; i++) {
      s = await step(page);
      const delta = Number(s.construction) - prev;
      peak = Math.max(peak, Number(s.construction));
      if (delta !== -1 || s.materialUpkeep !== '1' || Number(s.construction) < 0 || Number(s.storageCapacity) !== 25) {
        fail(`C sustain tick ${i + 1}: delta ${delta}, ${JSON.stringify(s)}`);
      }
      prev = Number(s.construction);
    }
    ok(`C over-capacity drains -1/tick (stored 0), material now ${prev}, peak ${peak}`);

    // K. Equilibrium: drain to the 24 floor; the freed space stores +1/tick.
    s = await stepUntil(page, (v) => v.construction === '24', 'storage equilibrium', 60);
    s = await stats(page);
    if (s.storageCapacity !== '25' || s.storedProduction !== '1' || s.materialUpkeep !== '1') {
      fail(`K equilibrium bad: ${JSON.stringify(s)}`);
    } else ok(`K equilibrium: material 24 = capacity 25 − upkeep 1, stored ${s.storedProduction}`);
    await shot('04-equilibrium.png');

    // L. Construction from the 24 floor (08G §18): rest stock 24 never
    // reaches cost at rest, but this tick stores +1, so the click dispatches
    // through the shortfall hover: 24 + 1 stored − 25 = 0, then upkeep due 1
    // clamps to 0 (no debt, no deactivation).
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeThroughShortfall(page, { x: 6, y: 3 });
    s = await stats(page);
    if (s.buildings !== '3' || Number(s.construction) !== 0 || s.workshops !== '1' || s.materialUpkeep !== '1' || s.colonists !== '1') {
      fail(`L construction-from-floor bad: ${JSON.stringify(s)}`);
    } else ok(`L 24 + 1 stored -> residence built, material 0, upkeep ${s.materialUpkeep} (clamped, no debt)`);
    const floorCausal = await statusText(page);
    if (!floorCausal.includes('Residence placed at 6,3 — under construction')) {
      fail(`L placement message bad: ${JSON.stringify(floorCausal)}`);
    } else ok(`L status: "${floorCausal}"`);
    await selectAt(page, { x: 4, y: 4 });
    const floorInspection = await inspectionText(page);
    if (!floorInspection.includes('upkeep 1/tick')) {
      fail(`L workshop inspection bad: ${JSON.stringify(floorInspection)}`);
    } else ok(`L inspection: "${floorInspection}"`);
    await shot('09-construction.png');

    // ---------------------------------------------------------------------
    // D — two workers: R -> road -> WS -> road -> WS -> refill -> R
    // Layout: Residence (2,2), roads (3,2)+(3,3), Workshops (4,2)+(4,3).
    // ---------------------------------------------------------------------
    await reload(page);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 2, y: 2 });
    s = await stepUntil(page, (v) => v.colonists === '1', 'first colonist', 10);
    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 3, y: 2 });
    s = await step(page); // road operational
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 4, y: 2 });
    s = await stepUntil(page, (v) => v.materialUpkeep === '1', 'first staffed workshop', 10);
    ok(`D first workshop staffed, material ${s.construction}, capacity ${s.storageCapacity}`);
    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 3, y: 3 });
    s = await step(page); // road operational
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 4, y: 3 });
    s = await stepUntil(page, (v) => v.storageCapacity === '50', 'second workshop operational', 10);
    ok(`D second workshop operational, capacity ${s.storageCapacity}`);
    await selectPalette(page, 'build-residence', 'Residence selected');
    s = await stepUntil(page, (v) => Number(v.construction) >= 25, 'second residence funds', 60);
    await placeAt(page, { x: 2, y: 3 }); // adjacent to the (3,3) road cell
    s = await stepUntil(page, (v) => v.colonists === '2', 'second colonist', 10);
    ok('D second colonist admitted');
    s = await stepUntil(page, (v) => v.materialUpkeep === '2', 'two staffed workshops', 10);
    s = await stats(page);
    if (s.materialProduction !== '4' || s.netMaterial !== '2' || s.storageCapacity !== '50') {
      fail(`D flows bad: ${JSON.stringify(s)}`);
    } else ok(`D 2 workers: production ${s.materialProduction}, upkeep ${s.materialUpkeep}, net +${s.netMaterial}, capacity ${s.storageCapacity}`);
    await page.mouse.move(20, 20); // off-canvas: STEP click must not cross hover cells
    s = await step(page); // steady tick: admission message clears, flow readout visible
    const causalD = await statusText(page);
    if (!causalD.includes('upkeep 2')) {
      fail(`D causal text bad: ${JSON.stringify(causalD)}`);
    } else ok(`D status: "${causalD}"`);
    prev = Number(s.construction);
    for (let i = 0; i < 5; i++) {
      s = await step(page);
      const delta = Number(s.construction) - prev;
      if (delta !== 2) fail(`D sustain tick ${i + 1}: delta ${delta}, ${JSON.stringify(s)}`);
      prev = Number(s.construction);
    }
    ok(`D sustained 5 ticks at net +2/tick, material now ${prev}`);
    await shot('04-two-workshops.png');

    // ---------------------------------------------------------------------
    // E/F — below cost: rejection, the 08G gate, then recovery
    // ---------------------------------------------------------------------
    // D's spending already brought the stock below the 25 cost.
    s = await stats(page);
    if (Number(s.construction) >= 25) {
      // Road drains are cheap (5), carry no upkeep and cannot feed anyone, so
      // they safely push the stock under cost (10E: idle farms no longer do).
      const drainCells = [{ x: 0, y: 0 }, { x: 0, y: 2 }, { x: 10, y: 10 }, { x: 10, y: 8 }, { x: 0, y: 10 }, { x: 10, y: 0 }];
      await selectPalette(page, 'build-road', 'Road selected');
      for (const cell of drainCells) {
        s = await stats(page);
        if (Number(s.construction) < 25) break;
        await placeRoad(page, cell);
        s = await stats(page);
        if (Number(s.construction) < 0) fail(`E negative material after drain: ${JSON.stringify(s)}`);
      }
    }
    s = await stats(page);
    if (Number(s.construction) >= 25 || Number(s.construction) < 0) {
      fail(`E drain bad: ${JSON.stringify(s)}`);
    } else ok(`E drained below cost: material ${s.construction}, upkeep ${s.materialUpkeep} (never negative)`);
    await shot('05-drained.png');

    // A plain click below cost is rejected and changes nothing.
    const drainedStock = s.construction;
    const drainedBuildings = s.buildings;
    await selectPalette(page, 'build-residence', 'Residence selected');
    const rejectPt = await moveTo(page, { x: 5, y: 5 });
    await waitFor(async () => (await stats(page)).status.includes('insufficient material'), 'insufficient preview below cost');
    await page.mouse.click(rejectPt.x, rejectPt.y);
    await new Promise((r) => setTimeout(r, 300));
    s = await stats(page);
    if (s.buildings !== drainedBuildings || s.construction !== drainedStock) {
      fail(`E rejection changed state: ${JSON.stringify(s)}`);
    } else ok(`E rejected build keeps stock ${s.construction}, status "${s.status}"`);

    // E-gate (08G): rest stock below cost is buildable while this tick's
    // stored production covers the shortfall.
    s = await stepUntil(page, (v) => Number(v.construction) + Number(v.storedProduction) >= 25, 'gate-covered stock', 40);
    ok(`E gate reachable: rest ${s.construction} + stored ${s.storedProduction}`);
    await placeThroughShortfall(page, { x: 5, y: 5 });
    s = await stats(page);
    if (Number(s.construction) < 0) fail(`E gate-covered build negative: ${JSON.stringify(s)}`);
    else ok(`E gate-covered build accepted, material ${s.construction}`);

    // F. Recovery: net +2/tick refills until construction is possible again.
    await refill(page, 60);
    s = await stats(page);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 5, y: 6 });
    s = await stats(page);
    if (Number(s.construction) < 0) fail(`F negative after recovery build: ${JSON.stringify(s)}`);
    else ok(`F recovery: rebuilt at material ${s.construction}, upkeep ${s.materialUpkeep}`);
    await shot('06-recovered.png');

    // ---------------------------------------------------------------------
    // G — zero workers: idle ticks leak nothing, upkeep 0
    // ---------------------------------------------------------------------
    await reload(page);
    await step(page);
    await step(page);
    await step(page);
    s = await stats(page);
    if (s.construction !== '100' || s.materialUpkeep !== '0' || s.netMaterial !== '0') {
      fail(`G idle bad: ${JSON.stringify(s)}`);
    } else ok('G idle 3 ticks: material still 100, upkeep 0');
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 6, y: 6 });
    await step(page);
    await step(page);
    s = await stats(page);
    if (s.colonists !== '1') fail(`G admission bad: ${JSON.stringify(s)}`);
    else ok(`G admission still works after idle: colonists ${s.colonists}`);

    // ---------------------------------------------------------------------
    // H — starvation: 4 residences, no farm -> population hits zero
    // ---------------------------------------------------------------------
    await reload(page);
    await selectPalette(page, 'build-residence', 'Residence selected');
    const starveCells = [{ x: 1, y: 1 }, { x: 1, y: 6 }, { x: 6, y: 1 }, { x: 6, y: 6 }];
    for (const cell of starveCells) {
      await placeAt(page, cell);
    }
    s = await stepUntil(page, (v) => v.colonists === '4', 'four colonists', 20);
    ok(`H four colonists admitted, food ${s.food}`);
    s = await stepUntil(page, (v) => v.colonists === '0', 'starvation', 120);
    if (s.materialUpkeep !== '0' || s.netMaterial !== '0' || s.materialProduction !== '0') {
      fail(`H starvation upkeep bad: ${JSON.stringify(s)}`);
    } else ok(`H starvation: workers 0, upkeep 0, net 0, food ${s.food}`);
    const frozen = Number(s.construction);
    await step(page);
    await step(page);
    await step(page);
    s = await stats(page);
    if (Number(s.construction) !== frozen || s.materialUpkeep !== '0') {
      fail(`H post-starvation drift: ${JSON.stringify(s)}`);
    } else ok(`H post-starvation stable: material ${s.construction}, upkeep 0`);
    await shot('07-starvation.png');

    // ---------------------------------------------------------------------
    // I — excess workers: 2 colonists, 1 workshop, net +1/tick
    // Layout: Residences (1,1)+(1,3), roads (2,1..3), Workshop (3,2).
    // ---------------------------------------------------------------------
    await reload(page);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 1, y: 1 });
    await placeAt(page, { x: 1, y: 3 });
    s = await stepUntil(page, (v) => v.colonists === '2', 'two colonists', 20);
    ok(`I two colonists admitted, material ${s.construction}`);
    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 2, y: 1 });
    await placeRoad(page, { x: 2, y: 2 });
    await placeRoad(page, { x: 2, y: 3 });
    await step(page); // roads operational
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 3, y: 2 });
    // J. Under construction: no production, no upkeep.
    s = await stats(page);
    if (s.materialProduction !== '0' || s.materialUpkeep !== '0') {
      fail(`J under-construction flows bad: ${JSON.stringify(s)}`);
    } else ok('J under construction: production 0, upkeep 0');
    s = await stepUntil(page, (v) => v.materialUpkeep === '1', 'staffed workshop', 10);
    s = await stats(page);
    if (s.materialProduction !== '2' || s.netMaterial !== '1' || s.employed !== '1' || s.unemployed !== '1') {
      fail(`I excess flows bad: ${JSON.stringify(s)}`);
    } else ok(`I excess: production ${s.materialProduction}, upkeep ${s.materialUpkeep}, net +${s.netMaterial} (employed ${s.employed}, unemployed ${s.unemployed})`);
    s = await step(page); // steady tick: causal readout names productive workers
    const excessCausal = await statusText(page);
    if (!excessCausal.includes('1 worker produced 2 material') || !excessCausal.includes('upkeep 1')) {
      fail(`I causal text bad (X must be productive, not population): ${JSON.stringify(excessCausal)}`);
    } else ok(`I status: "${excessCausal}"`);
    await shot('08-excess.png');

    const realErrors = errors.filter((e) => !e.includes('favicon'));
    if (realErrors.length > 0) fail(`browser errors: ${realErrors.join(' | ')}`);
    else ok('zero console/page errors');
  } catch (e) {
    if (!process.exitCode) {
      console.error(`UPKEEP E2E FAIL: ${e.message}`);
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('UPKEEP E2E RESULT: FAIL');
  else console.log('UPKEEP E2E RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`UPKEEP E2E FAIL: ${e.message}`);
  process.exitCode = 1;
});
