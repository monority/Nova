/* NOVA Step 08C upkeep E2E — re-baselined for Step 09F (road access),
 * Step 10E (farm employment) and Step 10AD (Workshop = 25 Material + 1 Water).
 *
 * Real browser causal proof of operational upkeep, kept to the minimum
 * economic setup each assertion needs:
 *
 *   1 worker -> +2 production, 1 upkeep, net +1/tick below capacity
 *   vacant Workshop pays 0 (no leak), capacity is staffing-independent
 *   deficit clamps without deactivation, recovery refills to construction
 *   excess colonists stay unemployed
 *
 * Step 10AD bootstrap consequence (documented in docs/roadmap/Step10AD.md):
 * a Workshop now costs 1 Water, so it can only exist after a staffed,
 * road-connected Well. Every staffed-Workshop scenario therefore pays
 * 25 Residence + 10 roads + 25 Well + 25 Workshop = 85, leaving 15 Material
 * below the 25 storage capacity instead of the historical 44 above it. The
 * old "above capacity, stored 0, drains -1/tick" phase is replaced by the
 * equivalent below-capacity "+1/tick then equilibrium at 24" phase; the
 * deficit-clamp and 08G stored-inflow gate are unchanged and still proven.
 *
 * Deliberately omitted (documented reductions): the historical 2-worker /
 * 2-Workshop scenario needs 2 Residences + 2 Workshops + 1 Well = 125
 * Material with no Water headroom at 2 served colonists, so it cannot be
 * brought under the bootstrap without a new economy rule.
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

/**
 * Real canvas click on an empty cell. The `ready` wait is the shared
 * Step 10AD-1 affordability predicate, so the same-tick stored-Material crest
 * is accepted exactly as the authoritative dispatch gate does — no test-local
 * affordability rule.
 */
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
 * Scenario 1 — a VACANT operational Workshop pays no upkeep and stores a
 * building's worth of Material. The Well is the nearer workplace, so the
 * colonist staffs it and the Workshop stays vacant.
 * Layout: Residence (2,2), road (3,2) contact, Well (4,2), Workshop (4,3)
 * (1 road step farther), connecting road (3,3).
 */
async function scenarioVacantWorkshop(page, shot) {
  await reload(page);
  ok('load, app ready');
  let s = await stats(page);
  if (s.tick !== '0' || s.construction !== '100' || s.materialUpkeep !== '0' || s.netMaterial !== '0') {
    fail(`A fresh bad: ${JSON.stringify(s)}`);
  } else ok(`A fresh: material 100, upkeep ${s.materialUpkeep}, net ${s.netMaterial}`);
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
  ok(`A bootstrap: colonist ${s.colonists}, water production ${s.waterProduction}, material ${s.construction}`);

  // J. Under construction: no capacity/production/upkeep. Step 10CZ: the
  // bootstrap Well is staffed, so Phase 7 income (+1/tick) adds 3 Material
  // before the Workshop placement (15 + 3 = 18).
  s = await stepUntil(page, (v) => Number(v.water) >= 1, 'water buffer', 10);
  await selectPalette(page, 'build-workshop', 'Workshop selected');
  await placeAt(page, { x: 4, y: 3 });
  s = await stats(page);
  if (s.storageCapacity !== '0' || s.materialProduction !== '0' || s.materialUpkeep !== '0' || s.construction !== '18') {
    fail(`J under-construction bad: ${JSON.stringify(s)}`);
  } else ok('J under construction: capacity 0, production 0, upkeep 0, material 18 (15 + Phase 7 Well income)');
  await step(page); // Step 10Y: 1 construction tick left
  s = await step(page); // operational, vacant
  if (s.materialUpkeep !== '0' || s.netMaterial !== '0' || s.construction !== '20' || s.storageCapacity !== '25') {
    fail(`B vacant bad: ${JSON.stringify(s)}`);
  } else ok(`B vacant workshop: upkeep 0, net 0, material ${s.construction}, capacity ${s.storageCapacity} (no leak)`);
  await selectAt(page, { x: 4, y: 3 });
  const vacantInspection = await inspectionText(page);
  if (!vacantInspection.includes('upkeep 0 (vacant)')) {
    fail(`B inspection missing vacant upkeep: ${JSON.stringify(vacantInspection)}`);
  } else ok(`B inspection: "${vacantInspection}"`);
  await shot('02-vacant.png');

  // B-sustain: vacant capacity is real, but with nobody producing there is no
  // upkeep leak. Step 10CZ: the staffed Well still earns Phase 7 income
  // (+1/tick), so the stock climbs by exactly the workforce income.
  let prev = Number(s.construction);
  for (let i = 0; i < 5; i++) {
    s = await step(page);
    if (Number(s.construction) !== prev + 1 || s.materialUpkeep !== '0' || s.materialProduction !== '0') {
      fail(`B vacant sustain tick ${i + 1}: ${JSON.stringify(s)}`);
    }
    prev = Number(s.construction);
  }
  ok(`B vacant Workshop gained only workforce income (+1/tick) across 5 ticks to material ${prev} (capacity 25, upkeep 0)`);
}

/**
 * Scenario 2 — the single-workplace upkeep contract with a staffed Workshop.
 * The Workshop is the nearer workplace, so the colonist staffs it.
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
  if (s.materialProduction !== '0' || s.materialUpkeep !== '0' || s.storageCapacity !== '0') {
    fail(`J under-construction flows bad: ${JSON.stringify(s)}`);
  } else ok('J under construction: capacity 0, production 0, upkeep 0');
  s = await stepUntil(page, (v) => v.storageCapacity === '25', 'workshop operational', 10);

  // C. Workshop staffed (the Well is farther): upkeep 1, net +1 below capacity.
  s = await stepUntil(page, (v) => v.materialUpkeep === '1', 'staffed workshop', 10);
  if (s.employed !== '1' || s.storageCapacity !== '25' || Number(s.construction) > 25) {
    fail(`C staffed bad: ${JSON.stringify(s)}`);
  } else ok(`C 1 worker: employed ${s.employed}, upkeep ${s.materialUpkeep}, net ${s.netMaterial} (capacity ${s.storageCapacity}), material ${s.construction}`);
  s = await step(page);
  const causal = await statusText(page);
  if (!causal.includes('1 worker produced 2 material') || !(causal.includes('upkeep 1') || causal.includes('upkeep shortfall'))) {
    fail(`C causal text bad: ${JSON.stringify(causal)}`);
  } else ok(`C status: "${causal}"`);
  await selectAt(page, { x: 3, y: 3 });
  const staffedInspection = await inspectionText(page);
  if (!staffedInspection.includes('upkeep 1/tick')) {
    fail(`C inspection missing staffed upkeep: ${JSON.stringify(staffedInspection)}`);
  } else ok(`C inspection: "${staffedInspection}"`);
  await shot('03-staffed.png');

  // C-sustain (Step 10CZ): below capacity the tick delta is
  // stored production (2) + workforce income (2) - upkeep (1) = stored + 1;
  // above capacity stored production is 0 and the delta is income - upkeep = 1.
  let prev = Number(s.construction);
  for (let i = 0; i < 6; i++) {
    s = await step(page);
    const delta = Number(s.construction) - prev;
    const expected = Number(s.storedProduction) + 1;
    if (delta !== expected || s.materialUpkeep !== '1' || Number(s.storageCapacity) !== 25) {
      fail(`C sustain tick ${i + 1}: delta ${delta} expected ${expected}, ${JSON.stringify(s)}`);
    }
    prev = Number(s.construction);
  }
  ok(`C income-aware refill (stored 2 + income 2 - upkeep 1 = +3 below the cap, +1 above), material now ${prev}`);

  // K. Above the cap there is no equilibrium any more (Step 10CQ): stored
  // production is 0, and the stock still climbs by income (2) - upkeep (1).
  s = await stepUntil(page, (v) => Number(v.construction) >= 25 && v.storedProduction === '0', 'above the storage cap', 30);
  if (s.storageCapacity !== '25' || s.storedProduction !== '0' || s.materialUpkeep !== '1') {
    fail(`K above-cap bad: ${JSON.stringify(s)}`);
  } else {
    const abovePrev = Number(s.construction);
    const aboveNext = await step(page);
    if (Number(aboveNext.construction) !== abovePrev + 1) {
      fail(`K above-cap income delta bad: ${JSON.stringify(aboveNext)}`);
    } else ok(`K above the cap: stored 0, income 2 - upkeep 1 = +1/tick (no dead equilibrium)`);
  }
  await shot('04-equilibrium.png');

  // L. Construction from the income-refilled stock: accepted, non-negative,
  // and the staffed Workshop keeps paying upkeep afterwards.
  await selectPalette(page, 'build-residence', 'Residence selected');
  await placeAt(page, { x: 6, y: 3 });
  s = await stats(page);
  if (s.buildings !== '4' || Number(s.construction) < 0 || s.materialUpkeep !== '1' || s.colonists !== '1') {
    fail(`L construction-from-refill bad: ${JSON.stringify(s)}`);
  } else ok(`L residence built from the refilled stock, material ${s.construction}, upkeep ${s.materialUpkeep} (no debt)`);
  const floorCausal = await statusText(page);
  if (!floorCausal.includes('Residence placed at 6,3 — under construction')) {
    fail(`L placement message bad: ${JSON.stringify(floorCausal)}`);
  } else ok(`L status: "${floorCausal}"`);
  await selectAt(page, { x: 3, y: 3 });
  const floorInspection = await inspectionText(page);
  if (!floorInspection.includes('upkeep 1/tick')) {
    fail(`L workshop inspection bad: ${JSON.stringify(floorInspection)}`);
  } else ok(`L inspection: "${floorInspection}"`);
  await shot('09-construction.png');
}

/**
 * Scenario 3 — below cost: rejection, the 08G stored-inflow gate, recovery.
 * The 10AD bootstrap already leaves 15 Material (below the 25 cost), so no
 * artificial drain is needed.
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
  s = await stepUntil(page, (v) => v.materialUpkeep === '1', 'staffed workshop', 10);
  s = await stats(page);
  if (Number(s.construction) >= 25 || Number(s.construction) < 0) {
    fail(`E bootstrap stock bad: ${JSON.stringify(s)}`);
  } else ok(`E below cost after the 10AD bootstrap: material ${s.construction}, upkeep ${s.materialUpkeep} (never negative)`);
  await shot('05-drained.png');

  // Step 10CZ: below the 25 cost the shared predicate now also counts this
  // tick's stored production (2) and workforce income (2), so a rest stock of
  // 21..24 already reads `ready` (Step 10AD-1 + Step 10CQ). When it does, spend
  // it through the gate; the next placement is then unambiguously short, so the
  // plain rejection path stays proven deterministically.
  await selectPalette(page, 'build-residence', 'Residence selected');
  await moveTo(page, { x: 5, y: 5 });
  if ((await stats(page)).status.includes('ready')) {
    await placeAt(page, { x: 5, y: 5 });
    ok('E gate-covered build accepted through same-tick production + income');
  } else {
    ok(`E below cost at rest: "${(await stats(page)).status}"`);
  }

  // A plain click below cost is rejected and changes nothing.
  const drainedStock = (await stats(page)).construction;
  const drainedBuildings = (await stats(page)).buildings;
  const rejectPt = await moveTo(page, { x: 5, y: 6 });
  await waitFor(async () => (await stats(page)).status.includes('insufficient material'), 'insufficient preview below cost');
  await page.mouse.click(rejectPt.x, rejectPt.y);
  await new Promise((r) => setTimeout(r, 300));
  s = await stats(page);
  if (s.buildings !== drainedBuildings || s.construction !== drainedStock) {
    fail(`E rejection changed state: ${JSON.stringify(s)}`);
  } else ok(`E rejected build keeps stock ${s.construction}, status "${s.status}"`);

  // F. Recovery: the staffed Workshop's net inflow (stored + income - upkeep)
  // refills the stock until construction is possible again.
  s = await stepUntil(page, (v) => Number(v.construction) + Number(v.storedProduction) >= 25, 'recovery refill', 40);
  await selectPalette(page, 'build-residence', 'Residence selected');
  await placeAt(page, { x: 5, y: 6 });
  s = await stats(page);
  if (Number(s.construction) < 0) fail(`F negative after recovery build: ${JSON.stringify(s)}`);
  else ok(`F recovery: rebuilt at material ${s.construction}, upkeep ${s.materialUpkeep}`);
  await shot('06-recovered.png');
}

/** Scenario 4 — zero workers: idle ticks leak nothing, upkeep 0. */
async function scenarioIdle(page) {
  await reload(page);
  await step(page);
  await step(page);
  await step(page);
  let s = await stats(page);
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
}

/**
 * Scenario 6 — excess workers: 2 colonists but one workplace. With the 10AD
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
  ok(`I two colonists admitted, material ${s.construction}`);
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
