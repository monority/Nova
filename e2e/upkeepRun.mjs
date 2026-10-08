/* NOVA Step 08C upkeep E2E — re-baselined for the Step001 money model.
 *
 * Real browser causal proof of the Step001 maintenance/commerce contract:
 *
 *   revenue = 1 tax/inhabitant + 2 commerce per CONNECTED operational Workshop
 *   maintenance = 1 per operational building (vacancy does NOT exempt)
 *   vacant connected Workshop: commerce 2 + tax 1 - maintenance 3 = net 0
 *   under-construction buildings: no commerce, no maintenance
 *   the treasury is uncapped: there is no storage figure or clamp phase
 *   deficit clamps at 0 without deactivation; starvation drains to 0
 *
 * D1 finding (docs/audits/REPOSITORY-AUDIT-2026-10-08.md): the Step001
 * baseline is treasury-neutral at best for a 1-colonist Workshop colony, so
 * "recovery refills to construction" is no longer reachable — the deficit
 * scenario proves the measured no-refill reality instead of recalibrating.
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

/** Real canvas click on an empty cell. Waits for the shared `ready` predicate. */
async function placeAt(page, cell) {
  const pt = await moveTo(page, cell);
  // Re-issue the move while waiting: the running clock can overwrite a single
  // hover with a per-tick causal status.
  let attempt = 0;
  await waitFor(async () => {
    const offset = attempt++ % 2;
    await page.mouse.move(pt.x + offset, pt.y + offset);
    return (await stats(page)).status.includes('ready');
  }, `valid preview at ${cell.x},${cell.y}`);
  const before = Number((await stats(page)).buildings);
  await page.mouse.click(pt.x, pt.y);
  await waitFor(async () => Number((await stats(page)).buildings) === before + 1, `placed at ${cell.x},${cell.y}`);
}

/** Single-cell road through the real 09H road gesture. */
async function placeRoad(page, cell) {
  const pt = await moveTo(page, cell);
  await page.mouse.down();
  let attempt = 0;
  await waitFor(async () => {
    const offset = attempt++ % 2;
    await page.mouse.move(pt.x + offset, pt.y + offset);
    return (await stats(page)).status.includes('ready');
  }, `road preview at ${cell.x},${cell.y}`);
  const before = Number((await stats(page)).roads);
  await page.mouse.up();
  await waitFor(async () => Number((await stats(page)).roads) === before + 1, `road at ${cell.x},${cell.y}`);
}

/** Real canvas click on an occupied cell: selects the building for inspection. */
async function selectAt(page, cell) {
  const pt = await moveTo(page, cell);
  await page.mouse.click(pt.x, pt.y);
  await waitFor(async () => (await page.evaluate(() => window.__nova.selectedBuilding())) !== null, `selected at ${cell.x},${cell.y}`);
  return page.evaluate(() => window.__nova.selectedBuilding());
}

async function selectPalette(page, testid, expectedLabel) {
  // The palette click is the real UI input under test; a stray OS-level
  // pointermove can overwrite the status line right afterwards, so the
  // feedback assertion is retried instead of racing a single read.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.click(`[data-testid="${testid}"]`);
    const s = await stats(page);
    if (s.status.includes(expectedLabel)) return s;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`palette feedback missing for ${testid}: ${JSON.stringify((await stats(page)).status)}`);
}

async function stepUntil(page, pred, label, maxTicks = 60) {
  for (let i = 0; i < maxTicks; i++) {
    const s = await stats(page);
    if (pred(s)) return s;
    await step(page);
  }
  throw new Error(`timeout: ${label}`);
}

async function reload(page) {
  await page.goto(URL, { waitUntil: 'load' });
  await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
}

/** Residence -> contact roads -> Well. */
async function placeWellBootstrap(page, { residence, roads, well }) {
  await selectPalette(page, 'build-residence', 'Residence selected');
  await placeAt(page, residence);
  await stepUntil(page, (v) => v.colonists === '1', 'first colonist', 10);
  await selectPalette(page, 'build-road', 'Road selected');
  for (const cell of roads) await placeRoad(page, cell);
  await stepUntil(page, (v) => v.operationalRoads === String(roads.length), 'roads operational', 10);
  await selectPalette(page, 'build-well', 'Well selected');
  await placeAt(page, well);
  return stepUntil(page, (v) => v.waterProduction === '2', 'Well staffed and producing', 10);
}

/**
 * Scenario 1 — a VACANT connected operational Workshop earns commerce and
 * pays maintenance (Step001: revenue is connection-based, maintenance is per
 * operational building). The Well is the nearer workplace, so the colonist
 * staffs it and the Workshop stays vacant.
 * Layout: Residence (2,2), road (3,2) contact, Well (4,2), Workshop (4,3)
 * (1 road step farther), connecting road (3,3).
 */
async function scenarioVacantWorkshop(page, shot) {
  await reload(page);
  ok('load, app ready');
  let s = await stats(page);
  if (s.tick !== '0' || s.money !== '100' || s.maintenance !== '0' || s.netMoney !== '0') {
    fail(`A fresh bad: ${JSON.stringify(s)}`);
  } else ok(`A fresh: money 100, maintenance ${s.maintenance}, net ${s.netMoney}`);
  await shot('01-fresh.png');

  await selectPalette(page, 'build-residence', 'Residence selected');
  await placeAt(page, { x: 2, y: 2 });
  await stepUntil(page, (v) => v.colonists === '1', 'first colonist', 10);
  await selectPalette(page, 'build-road', 'Road selected');
  await placeRoad(page, { x: 3, y: 2 });
  await placeRoad(page, { x: 3, y: 3 });
  await stepUntil(page, (v) => v.operationalRoads === '2', 'roads operational', 10);
  await selectPalette(page, 'build-well', 'Well selected');
  await placeAt(page, { x: 4, y: 2 });
  s = await stepUntil(page, (v) => v.waterProduction === '2', 'Well staffed', 10);
  ok(`A bootstrap: colonist ${s.colonists}, water production ${s.waterProduction}, money ${s.money}`);

  // J. Under construction: no commerce, no maintenance from the site. The
  // rest of the colony runs revenue 1 (tax) against maintenance 2.
  s = await stepUntil(page, (v) => Number(v.water) >= 1, 'water buffer', 10);
  await selectPalette(page, 'build-workshop', 'Workshop selected');
  await placeAt(page, { x: 4, y: 3 });
  s = await stats(page);
  if (s.commerce !== '0' || s.maintenance !== '2' || s.revenue !== '1') {
    fail(`J under-construction bad: ${JSON.stringify(s)}`);
  } else ok('J under construction: commerce 0, maintenance 2, revenue 1 (no flows from the site)');
  await step(page); // Step 10Y: 1 construction tick left
  s = await step(page); // operational, vacant
  if (s.commerce !== '2' || s.maintenance !== '3' || s.netMoney !== '0') {
    fail(`B vacant bad: ${JSON.stringify(s)}`);
  } else ok(`B vacant workshop: commerce 2, maintenance 3, net 0 (revenue 3 - maintenance 3), money ${s.money}`);
  await selectAt(page, { x: 4, y: 3 });
  const vacantInspection = await inspectionText(page);
  if (!vacantInspection.includes('maintenance 1/tick')) {
    fail(`B inspection missing vacant maintenance: ${JSON.stringify(vacantInspection)}`);
  } else ok(`B inspection: "${vacantInspection}"`);
  await shot('02-vacant.png');

  // B-sustain: the vacant Workshop still earns commerce (connection-based)
  // and still pays maintenance, so the treasury is exactly flat.
  let prev = Number(s.money);
  for (let i = 0; i < 5; i++) {
    s = await step(page);
    if (Number(s.money) !== prev || s.netMoney !== '0' || s.commerce !== '2') {
      fail(`B vacant sustain tick ${i + 1}: ${JSON.stringify(s)}`);
    }
    prev = Number(s.money);
  }
  ok(`B vacant Workshop is treasury-neutral across 5 ticks (tax 1 + commerce 2 - maintenance 3 = 0), money held at ${prev}`);
}

/**
 * Scenario 2 — the staffed-Workshop contract. The Workshop is the nearer
 * workplace, so the colonist staffs it; revenue is identical to the vacant
 * case (Step001: commerce does not care about staffing).
 * Layout: Residence (2,2), roads (3,2)+(4,2), Well (5,2) (1 road step),
 * Workshop (3,3) (contact road 3,2).
 */
async function scenarioStaffedWorkshop(page, shot) {
  await reload(page);
  let s = await placeWellBootstrap(page, {
    residence: { x: 2, y: 2 },
    roads: [{ x: 3, y: 2 }, { x: 4, y: 2 }],
    well: { x: 5, y: 2 },
  });
  s = await stepUntil(page, (v) => Number(v.water) >= 1, 'water buffer', 10);
  await selectPalette(page, 'build-workshop', 'Workshop selected');
  await placeAt(page, { x: 3, y: 3 });
  s = await stats(page);
  if (s.commerce !== '0' || s.maintenance !== '2' || s.revenue !== '1') {
    fail(`J under-construction flows bad: ${JSON.stringify(s)}`);
  } else ok('J under construction: commerce 0, maintenance 2, revenue 1');
  s = await stepUntil(page, (v) => v.commerce === '2', 'workshop operational', 10);

  // C. Workshop staffed (the Well is farther): revenue 3, maintenance 3,
  // net 0 — identical to the vacant case, which is the Step001 point.
  s = await stepUntil(page, (v) => v.employed === '1' && v.staffedWorkshopIds !== '', 'staffed workshop', 10);
  if (s.employed !== '1' || s.revenue !== '3' || s.maintenance !== '3' || s.netMoney !== '0') {
    fail(`C staffed bad: ${JSON.stringify(s)}`);
  } else ok(`C 1 worker: employed ${s.employed}, revenue ${s.revenue}, maintenance ${s.maintenance}, net ${s.netMoney}, money ${s.money}`);
  s = await step(page);
  const causal = await statusText(page);
  if (!causal.includes('treasury +3 (taxes 1 + commerce 2)') || !causal.includes('maintenance 3')) {
    fail(`C causal text bad: ${JSON.stringify(causal)}`);
  } else ok(`C status: "${causal}"`);
  await selectAt(page, { x: 3, y: 3 });
  const staffedInspection = await inspectionText(page);
  if (!staffedInspection.includes('maintenance 1/tick')) {
    fail(`C inspection missing staffed maintenance: ${JSON.stringify(staffedInspection)}`);
  } else ok(`C inspection: "${staffedInspection}"`);
  await shot('03-staffed.png');

  // C-sustain (Step001 exact invariant): every tick is revenue 3 - maintenance
  // 3 = 0. There is no storage cap and no stored production: the treasury is
  // uncapped and here exactly flat.
  let prev = Number(s.money);
  for (let i = 0; i < 6; i++) {
    s = await step(page);
    const delta = Number(s.money) - prev;
    if (delta !== 0 || s.netMoney !== '0' || s.revenue !== '3' || s.maintenance !== '3') {
      fail(`C sustain tick ${i + 1}: delta ${delta} expected 0, ${JSON.stringify(s)}`);
    }
    prev = Number(s.money);
  }
  ok(`C treasury-neutral sustain (revenue 3 - maintenance 3 = 0 across 6 ticks), money now ${prev}`);

  // L. Construction beyond the day-0 buffer is NOT funded (D1 finding): the
  // treasury rests below the 25 cost forever, the hover says so, and a click
  // is rejected without changing state.
  const beforeBuildings = (await stats(page)).buildings;
  const beforeMoney = (await stats(page)).money;
  const rejectPt = await moveTo(page, { x: 6, y: 3 });
  await waitFor(
    async () => (await stats(page)).status.includes('insufficient funds'),
    'insufficient preview below cost'
  );
  await page.mouse.click(rejectPt.x, rejectPt.y);
  await new Promise((r) => setTimeout(r, 300));
  s = await stats(page);
  if (s.buildings !== beforeBuildings || s.money !== beforeMoney) {
    fail(`L rejection changed state: ${JSON.stringify(s)}`);
  } else ok(`L rejected build keeps money ${s.money}, buildings ${s.buildings}, status "${s.status}"`);
  await selectAt(page, { x: 3, y: 3 });
  const floorInspection = await inspectionText(page);
  if (!floorInspection.includes('maintenance 1/tick')) {
    fail(`L workshop inspection bad: ${JSON.stringify(floorInspection)}`);
  } else ok(`L inspection: "${floorInspection}"`);
  await shot('09-construction.png');
}

/**
 * Scenario 3 — below cost, no recovery. The Step001 net flow for this colony
 * is exactly 0, so a below-cost treasury never refills: the measured reality
 * is recorded (D1 finding) instead of recalibrated.
 */
async function scenarioDeficitRecovery(page, shot) {
  await reload(page);
  await placeWellBootstrap(page, {
    residence: { x: 2, y: 2 },
    roads: [{ x: 3, y: 2 }, { x: 4, y: 2 }],
    well: { x: 5, y: 2 },
  });
  let s = await stepUntil(page, (v) => Number(v.water) >= 1, 'water buffer', 10);
  await selectPalette(page, 'build-workshop', 'Workshop selected');
  await placeAt(page, { x: 3, y: 3 });
  s = await stepUntil(page, (v) => v.employed === '1' && v.staffedWorkshopIds !== '', 'staffed workshop', 10);
  s = await stats(page);
  if (Number(s.money) >= 25 || Number(s.money) < 0) {
    fail(`E bootstrap stock bad: ${JSON.stringify(s)}`);
  } else ok(`E below cost after the bootstrap: money ${s.money}, net ${s.netMoney} (never negative)`);
  await shot('05-drained.png');

  // The rest stock is below cost and the net flow is exactly 0: no tick ever
  // makes the placement affordable again (Step001 D1 finding — recorded, not
  // recalibrated). A click below cost is rejected and changes nothing.
  const drainedStock = (await stats(page)).money;
  const drainedBuildings = (await stats(page)).buildings;
  const rejectPt = await moveTo(page, { x: 5, y: 5 });
  await waitFor(async () => (await stats(page)).status.includes('insufficient funds'), 'insufficient preview below cost');
  await page.mouse.click(rejectPt.x, rejectPt.y);
  await new Promise((r) => setTimeout(r, 300));
  s = await stats(page);
  if (s.buildings !== drainedBuildings || s.money !== drainedStock) {
    fail(`E rejection changed state: ${JSON.stringify(s)}`);
  } else ok(`E rejected build keeps money ${s.money}, status "${s.status}"`);

  // F. No recovery: 10 more ticks leave the treasury exactly where it was.
  for (let i = 0; i < 10; i++) {
    s = await step(page);
    if (s.money !== drainedStock || s.netMoney !== '0') {
      fail(`F no-recovery tick ${i + 1}: ${JSON.stringify(s)}`);
    }
  }
  ok(`F treasury-neutral: money held at ${s.money} across 10 ticks (revenue 3 - maintenance 3 = 0) — further construction is not self-funded under the Step001 baseline`);
  await shot('06-recovered.png');
}

/** Scenario 4 — zero workers: idle ticks leak nothing. */
async function scenarioIdle(page) {
  await reload(page);
  await step(page);
  await step(page);
  await step(page);
  let s = await stats(page);
  if (s.money !== '100' || s.maintenance !== '0' || s.netMoney !== '0') {
    fail(`G idle bad: ${JSON.stringify(s)}`);
  } else ok('G idle 3 ticks: money still 100, maintenance 0, net 0');
  await selectPalette(page, 'build-residence', 'Residence selected');
  await placeAt(page, { x: 6, y: 6 });
  await step(page);
  await step(page);
  s = await stats(page);
  if (s.colonists !== '1') fail(`G admission bad: ${JSON.stringify(s)}`);
  else ok(`G admission still works after idle: colonists ${s.colonists}`);
}

/** Scenario 5 — starvation: 4 residences, no farm/Well -> population hits 0. */
async function scenarioStarvation(page, shot) {
  await reload(page);
  await selectPalette(page, 'build-residence', 'Residence selected');
  const starveCells = [{ x: 1, y: 1 }, { x: 1, y: 6 }, { x: 6, y: 1 }, { x: 6, y: 6 }];
  for (const cell of starveCells) {
    await placeAt(page, cell);
  }
  let s = await stepUntil(page, (v) => v.colonists === '4', 'four colonists', 20);
  ok(`H four colonists admitted, food ${s.food}`);
  s = await stepUntil(page, (v) => v.colonists === '0', 'starvation', 200);
  if (s.revenue !== '0' || s.maintenance !== '4') {
    fail(`H starvation flows bad: ${JSON.stringify(s)}`);
  } else ok(`H starvation: workers 0, revenue 0, maintenance 4 (residences stay operational), money ${s.money}`);
  // Step001: maintenance keeps being due for the standing residences, so the
  // treasury drains (clamped at 0, never negative) and then stays frozen.
  s = await stepUntil(page, (v) => v.money === '0', 'treasury clamped at 0', 60);
  await step(page);
  await step(page);
  await step(page);
  s = await stats(page);
  if (Number(s.money) !== 0 || s.revenue !== '0' || s.maintenance !== '4') {
    fail(`H post-starvation drift: ${JSON.stringify(s)}`);
  } else ok(`H post-starvation stable: money 0 (clamped, never negative), revenue 0, maintenance 4`);
  await shot('07-starvation.png');
}

/**
 * Scenario 6 — excess workers: 2 colonists but one workplace. With the Step001
 * economy the only affordable single job is the Well (a Workshop would need
 * Water and therefore a second served colonist slot), so the excess-worker
 * contract is proven on the Well job: 1 employed, 1 unemployed.
 */
async function scenarioExcessWorkers(page, shot) {
  await reload(page);
  await selectPalette(page, 'build-residence', 'Residence selected');
  await placeAt(page, { x: 1, y: 1 });
  await placeAt(page, { x: 1, y: 3 });
  let s = await stepUntil(page, (v) => v.colonists === '2', 'two colonists', 20);
  ok(`I two colonists admitted, money ${s.money}`);
  await selectPalette(page, 'build-road', 'Road selected');
  await placeRoad(page, { x: 2, y: 1 });
  await placeRoad(page, { x: 2, y: 2 });
  await placeRoad(page, { x: 2, y: 3 });
  await stepUntil(page, (v) => v.operationalRoads === '3', 'roads operational', 10);
  await selectPalette(page, 'build-well', 'Well selected');
  await placeAt(page, { x: 3, y: 2 });
  s = await stepUntil(page, (v) => v.waterProduction === '2', 'Well staffed', 10);
  if (s.employed !== '1' || s.unemployed !== '1' || s.jobCapacity !== '1') {
    fail(`I excess flows bad: ${JSON.stringify(s)}`);
  } else ok(`I excess: employed ${s.employed}, unemployed ${s.unemployed}, jobCapacity ${s.jobCapacity}, water ${s.waterProduction}/tick`);
  s = await step(page);
  await selectAt(page, { x: 3, y: 2 });
  const wellInspection = await inspectionText(page);
  if (!wellInspection.includes('producing +2/tick (staffed)')) {
    fail(`I Well inspection bad: ${JSON.stringify(wellInspection)}`);
  } else ok(`I well inspection: "${wellInspection}"`);
  await shot('08-excess.png');
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

    await scenarioVacantWorkshop(page, shot);
    await scenarioStaffedWorkshop(page, shot);
    await scenarioDeficitRecovery(page, shot);
    await scenarioIdle(page);
    await scenarioStarvation(page, shot);
    await scenarioExcessWorkers(page, shot);

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
