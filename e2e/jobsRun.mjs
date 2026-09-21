/* NOVA Step 07C jobs E2E — re-baselined for Step 09F (road access),
 * Step 10E (farm employment) and Step 10AD (Workshop = 25 Material + 1 Water).
 *
 * Real browser causal proof of the Jobs loop:
 *   Residence -> Colonist -> Road (09K mobility) -> Workplace
 *   -> Employment -> Food / Water / Material, plus unemployment, vacancy,
 *   starvation, forecast semantics and 10E farm/workshop competition.
 * All state changes come from real palette clicks on the canvas and real
 * STEP/PLAY/speed controls. window.__nova is only read (never mutated).
 *
 * Step 10AD bootstrap consequence (documented in docs/roadmap/Step10AD.md):
 * a Workshop now costs 1 Water, which only a staffed, road-connected Well can
 * produce. Every Workshop scenario therefore uses the canonical minimal
 * chain Residence -> Road -> Well -> Water buffer -> Workshop
 * (25 + 5n + 25 + 25 Material) instead of the old 4-building bootstrap. Two
 * consequences are part of the proof:
 *   - the Well is itself a workplace (Step 10P), so `jobs` counts it;
 *   - the historical 2-Workshop / 2-colonist scenarios exceed the 100
 *     Material bootstrap and are NOT reproducible without a new economy
 *     rule, so surplus/unemployment/vacancy are proven with the affordable
 *     single-workplace setups (Well or Workshop) that keep the assertion
 *     semantics (see Step10AD.md).
 *
 * Screenshots: artifacts/jobs/01..10.
 * Mode: headed by default, override NOVA_JOBS_MODE=headless.
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

const PORT = 4180;
const URL = `http://localhost:${PORT}/`;
const ART = 'artifacts/jobs';
const MODE = (process.env.NOVA_JOBS_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';

const fail = (msg) => {
  console.error(`JOBS E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`JOBS E2E PASS: ${msg}`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitFor(fn, label, timeoutMs = 8000) {
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

async function step(page) {
  const before = Number((await stats(page)).tick);
  await page.click('[data-testid="simulation-step"]');
  await waitFor(async () => Number((await stats(page)).tick) === before + 1, `tick ${before + 1}`);
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

async function moveTo(page, cell) {
  const pt = await page.evaluate((c) => window.__nova.cellToScreen(c), cell);
  if (!pt) throw new Error(`cellToScreen null for ${cell.x},${cell.y}`);
  await page.mouse.move(pt.x, pt.y);
  return pt;
}

/**
 * Real canvas click on an empty cell: places the currently selected type.
 * The `ready` wait is the shared Step 10AD-1 affordability predicate, so the
 * same-tick stored-Material crest is accepted exactly like the domain gate.
 */
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

const inspectionHousingText = (page) =>
  page.locator('[data-testid="inspection-housing"]').textContent();
const jobsText = (page) => page.locator('[data-testid="stat-jobs"]').textContent();
const forecastText = (page) => page.locator('[data-testid="stat-food-forecast"]').textContent();

async function fresh(page) {
  await page.goto(URL, { waitUntil: 'load' });
  await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
  return stats(page);
}

/** Residence + one contact road + a Farm/Workshop workplace (no Water cost). */
async function placeCoreLoop(page, kind) {
  await selectPalette(page, 'build-residence', 'Residence selected');
  await placeAt(page, { x: 2, y: 2 }); // tick 1
  await step(page); // tick 2: Step 10Y — 1 construction tick left
  await step(page); // tick 3: residence operational, colonist admitted
  await selectPalette(page, 'build-road', 'Road selected');
  await placeRoad(page, { x: 3, y: 2 }); // tick 4
  await step(page); // tick 5: road operational
  await selectPalette(page, kind === 'farm' ? 'build-farm' : 'build-workshop', kind === 'farm' ? 'Farm selected' : 'Workshop selected');
  await placeAt(page, { x: 4, y: 2 }); // tick 6
  await step(page); // tick 7: Step 10Y — 1 construction tick left
  return step(page); // tick 8: workplace operational + staffed
}

/**
 * Canonical Step 10AD chain: Residence -> contact roads -> Well -> Water
 * buffer -> Workshop. The Workshop is placed at road distance 0 while the
 * Well sits one road step farther, so the single colonist staffs the
 * Workshop (the Well keeps producing the Water until then).
 */
async function bootstrapWaterWorkshop(page, { residence, roads, well, workshop }) {
  await selectPalette(page, 'build-residence', 'Residence selected');
  await placeAt(page, residence);
  await stepUntil(page, (v) => v.colonists === '1', 'first colonist', 10);
  await selectPalette(page, 'build-road', 'Road selected');
  for (const cell of roads) await placeRoad(page, cell);
  await stepUntil(page, (v) => v.operationalRoads === String(roads.length), 'roads operational', 10);
  await selectPalette(page, 'build-well', 'Well selected');
  await placeAt(page, well);
  await stepUntil(page, (v) => v.waterProduction === '2', 'Well staffed and producing', 10);
  await stepUntil(page, (v) => Number(v.water) >= 1, 'Water buffer for the Workshop', 10);
  await selectPalette(page, 'build-workshop', 'Workshop selected');
  await placeAt(page, workshop);
  return stepUntil(page, (v) => v.storageCapacity === '25', 'Workshop operational', 10);
}

const BOOT = {
  residence: { x: 2, y: 2 },
  roads: [{ x: 3, y: 2 }, { x: 4, y: 2 }],
  well: { x: 5, y: 2 },
  workshop: { x: 3, y: 3 },
};

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
    // Scenario 1 — core causal loop: housing -> road -> Well -> Workshop ->
    // employment -> material
    // ---------------------------------------------------------------------
    console.log('--- Scenario 1: housing -> road -> Well -> workshop -> employment -> material ---');
    let s = await fresh(page);
    assert(s.tick === '0', `fresh tick expected 0, got ${s.tick}`);
    assert(s.food === '100' && s.construction === '100', `fresh resources bad: ${JSON.stringify(s)}`);
    assert(s.colonists === '0' && s.employed === '0' && s.jobCapacity === '0', `fresh employment bad: ${JSON.stringify(s)}`);
    assert((await jobsText(page)) === '0 / 0', `fresh HUD jobs bad: ${await jobsText(page)}`);
    assert((await forecastText(page)) === '', `fresh forecast should be empty (population 0), got "${await forecastText(page)}"`);
    ok(`fresh state: material ${s.construction}, food ${s.food}, jobs "${await jobsText(page)}", no forecast`);
    await shot('01-fresh.png');

    // Phase A/B: residence, roads, Well, workshop through the real palettes.
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, BOOT.residence); // t1
    s = await step(page); // t2: Step 10Y — 1 construction tick left
    assert(s.colonists === '0', `tick 2 should still be under construction, got ${s.colonists} colonists`);
    s = await step(page); // t3
    assert(s.colonists === '1', `expected 1 colonist at tick 3, got ${s.colonists}`);
    assert(s.construction === '75', `material after residence expected 75, got ${s.construction}`);
    assert(s.status.includes('Colonist arrived'), `arrival feedback missing: ${JSON.stringify(s.status)}`);
    const finiteForecast = Number((await forecastText(page)).replace(/[^0-9]/g, ''));
    assert(Number.isFinite(finiteForecast) && finiteForecast > 0, `finite forecast expected while declining, got "${await forecastText(page)}"`);
    ok(`colonist admitted at tick ${s.tick}; status "${s.status}"; forecast "${(await forecastText(page)).trim()}"`);
    await shot('02-colonist.png');

    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, BOOT.roads[0]);
    await placeRoad(page, BOOT.roads[1]);
    s = await stepUntil(page, (v) => v.operationalRoads === '2', 'roads operational', 10);
    assert(s.roads === '2' && s.operationalRoads === '2', `roads should be operational, got ${JSON.stringify(s)}`);
    ok(`roads operational at tick ${s.tick} (09K mobility link), material ${s.construction}`);

    await selectPalette(page, 'build-well', 'Well selected');
    await placeAt(page, BOOT.well);
    s = await stepUntil(page, (v) => v.waterProduction === '2', 'Well staffed', 10);
    ok(`Well operational and staffed at tick ${s.tick}: water ${s.water}, production ${s.waterProduction}`);

    // Under-construction Workshop: no capacity from it, and its own job slot
    // is closed (the staffed Well is the only open job at this point).
    s = await stepUntil(page, (v) => Number(v.water) >= 1, 'Water buffer for the Workshop', 10);
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, BOOT.workshop);
    s = await stats(page);
    assert(s.workshops === '1', `expected 1 workshop, got ${s.workshops}`);
    assert(s.storageCapacity === '0', `under-construction workshop must add no capacity, got ${s.storageCapacity}`);
    assert(s.jobCapacity === '1', `only the Well job should be open, got ${s.jobCapacity}`);
    await selectAt(page, BOOT.workshop);
    const underConstruction = await inspectionHousingText(page);
    assert(underConstruction === 'Jobs — Capacity 0 · Workers 0/0 · upkeep 0 (vacant)', `under-construction workshop inspection bad: "${underConstruction}"`);
    ok(`workshop placed at tick ${s.tick}; material ${s.construction}; inspection "${underConstruction}"`);

    s = await stepUntil(page, (v) => v.storageCapacity === '25', 'workshop operational', 10);
    s = await stepUntil(page, (v) => v.employed === '1' && v.materialProduction === '2', 'staffed workshop', 10);
    assert(s.jobCapacity === '2', `Well + Workshop must offer 2 jobs, got ${s.jobCapacity}`);
    assert((await jobsText(page)) === '1 / 2', `HUD jobs expected "1 / 2", got "${await jobsText(page)}"`);
    assert(s.storageCapacity === '25' && s.storedProduction === '2', `capacity expectations broken: ${JSON.stringify(s)}`);
    assert(s.staffedWorkshopIds !== '', `the nearer Workshop must win the worker: ${JSON.stringify(s)}`);
    const selection = await selectAt(page, BOOT.workshop);
    assert(selection?.type === 'workshop', `selection expected workshop, got ${JSON.stringify(selection)}`);
    assert((await page.locator('[data-testid="inspection-type"]').textContent()) === 'Workshop', 'inspection type label missing');
    const operationalJobs = await inspectionHousingText(page);
    assert(operationalJobs === 'Jobs — Capacity 1 · Workers 1/1 · upkeep 1/tick', `workshop inspection bad: "${operationalJobs}"`);
    ok(`workshop staffed at tick ${s.tick}: jobs "${await jobsText(page)}", inspection "${operationalJobs}", material ${s.construction}`);
    await shot('03-employed-workshop.png');

    // Phase D (Step 10AD re-baseline): the 85-Material bootstrap leaves the
    // stock BELOW the 25 capacity, so the flow is +1/tick (2 stored - 1
    // upkeep) up to the 24 equilibrium instead of the historical over-capacity
    // -1/tick drain. Gross production stays exactly 2.
    let materialBefore = Number(s.construction);
    s = await step(page);
    assert(Number(s.construction) - materialBefore === 1, `below-capacity tick expected +1 (2 stored - 1 upkeep), got ${Number(s.construction) - materialBefore}`);
    materialBefore = Number(s.construction);
    for (let i = 0; i < 3; i++) {
      s = await step(page);
    }
    assert(Number(s.construction) - materialBefore === 3, `3 below-capacity ticks expected +3, got ${Number(s.construction) - materialBefore}`);
    assert(s.materialProduction === '2', `gross production must stay 2 with one worker, got ${s.materialProduction}`);
    assert(s.status.includes('1 worker produced 2 material'), `steady material feedback missing: ${JSON.stringify(s.status)}`);
    ok(`material deltas exact: +1/tick below capacity, gross stays 2 at tick ${s.tick} (material ${s.construction})`);
    await shot('04-material-production.png');

    // ---------------------------------------------------------------------
    // Scenario 2 — labor-financed construction
    // Reduced for Step 10AD: the old second Workshop (capacity 50) is no
    // longer affordable/Water-available, and it is no longer needed — the
    // capacity-25 crest (24 + this tick's stored 1) is exactly the 08G gate
    // that lets the labour income pay for the next 25-cost building.
    // ---------------------------------------------------------------------
    console.log('--- Scenario 2: labor income funds further construction ---');
    await fresh(page);
    s = await bootstrapWaterWorkshop(page, BOOT);
    s = await stepUntil(page, (v) => v.employed === '1' && v.materialProduction === '2', 'staffed workshop', 10);
    assert(Number(s.construction) < 25, `material should be below the 25 cost after the bootstrap, got ${s.construction}`);
    s = await stepUntil(
      page,
      (v) => Number(v.construction) + Number(v.storedProduction) >= 25,
      'labour-financed construction crest',
      60
    );
    ok(`labour refilled to rest ${s.construction} + stored ${s.storedProduction} (capacity ${s.storageCapacity}, one worker)`);

    const beforeBuild = Number(s.construction);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 8, y: 8 });
    s = await stats(page);
    assert(s.buildings === '4', `expected 4 buildings, got ${s.buildings}`);
    assert(Number(s.construction) <= beforeBuild, `labour-financed build must not create Material: ${beforeBuild} -> ${s.construction}`);
    ok(`labour enabled construction at tick ${s.tick}: ${beforeBuild} -> ${s.construction}, buildings ${s.buildings}`);
    await shot('05-construction-enabled.png');

    // ---------------------------------------------------------------------
    // Scenario 3 — more colonists than jobs (unemployment)
    // Reduced for Step 10AD: a Workshop needs Water and therefore a staffed
    // Well, which itself is a job; the affordable single-job setup is
    // 2 Residences + 1 road + 1 Well (80 Material). The excess-colonist
    // contract is unchanged, the producing workplace is the Well.
    // ---------------------------------------------------------------------
    console.log('--- Scenario 3: surplus colonists stay unemployed ---');
    await fresh(page);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 2, y: 2 });
    await stepUntil(page, (v) => v.colonists === '1', 'colonist-1', 10);
    await placeAt(page, { x: 2, y: 4 });
    await stepUntil(page, (v) => v.colonists === '2', 'colonist-2', 10);
    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 2, y: 3 }); // touches both residences
    await stepUntil(page, (v) => v.operationalRoads === '1', 'road operational', 10);
    await selectPalette(page, 'build-well', 'Well selected');
    await placeAt(page, { x: 3, y: 3 });
    s = await stepUntil(page, (v) => v.waterProduction === '2', 'Well staffed', 10);
    assert(s.colonists === '2' && s.jobCapacity === '1', `expected 2 colonists / 1 job, got ${JSON.stringify(s)}`);
    assert(s.employed === '1' && s.unemployed === '1', `expected 1 employed / 1 unemployed, got ${JSON.stringify(s)}`);
    assert((await jobsText(page)) === '1 / 1', `HUD jobs expected "1 / 1", got "${await jobsText(page)}"`);
    await selectAt(page, { x: 3, y: 3 });
    const surplusInspection = await inspectionHousingText(page);
    assert(surplusInspection === 'Water production — producing +2/tick (staffed)', `single Well inspection bad: "${surplusInspection}"`);
    ok(`2 colonists / 1 job: employed ${s.employed}, unemployed ${s.unemployed}, inspection "${surplusInspection}"`);
    await shot('06-unemployment.png');

    // ---------------------------------------------------------------------
    // Scenario 4 — more jobs than colonists (vacancies)
    // Step 10AD: the Well and the Workshop offer 2 jobs for 1 colonist; the
    // nearer Workshop (higher id) is staffed, the farther Well stays vacant.
    // ---------------------------------------------------------------------
    console.log('--- Scenario 4: surplus jobs stay vacant ---');
    await fresh(page);
    s = await bootstrapWaterWorkshop(page, BOOT);
    s = await stepUntil(page, (v) => v.employed === '1', 'worker placed', 10);
    assert(s.employed === '1' && s.jobCapacity === '2', `expected 1 employed / 2 jobs, got ${JSON.stringify(s)}`);
    assert((await jobsText(page)) === '1 / 2', `HUD jobs expected "1 / 2", got "${await jobsText(page)}"`);
    assert(s.unemployed === '0', `no colonist should be unemployed, got ${s.unemployed}`);
    assert(s.staffedWorkshopIds !== '', `nearest workplace expected staffed, got "${s.staffedWorkshopIds}"`);
    await selectAt(page, BOOT.workshop);
    const staffed = await inspectionHousingText(page);
    await selectAt(page, BOOT.well);
    const vacant = await inspectionHousingText(page);
    assert(staffed === 'Jobs — Capacity 1 · Workers 1/1 · upkeep 1/tick', `staffed workshop inspection bad: "${staffed}"`);
    assert(vacant === 'Water production — vacant, producing +0/tick', `vacant Well inspection bad: "${vacant}"`);
    assert(s.waterProduction === '0', `vacant Well must produce no Water, got ${s.waterProduction}`);
    const vacancyMaterial = Number(s.construction);
    s = await step(page);
    assert(s.materialProduction === '2', `material production must stay 2 with one worker, got ${s.materialProduction}`);
    ok(`1 colonist / 2 jobs: HUD "${await jobsText(page)}", staffed "${staffed}", vacant "${vacant}", material ${vacancyMaterial} -> ${s.construction}`);
    await shot('07-surplus-jobs.png');

    // ---------------------------------------------------------------------
    // Scenario 5 — starvation removes employment and output
    // ---------------------------------------------------------------------
    console.log('--- Scenario 5: starvation ---');
    await fresh(page);
    s = await bootstrapWaterWorkshop(page, BOOT);
    s = await stepUntil(page, (v) => v.employed === '1', 'employment before starvation', 10);
    await page.selectOption('#speed', '4');
    await page.click('[data-testid="simulation-play"]');
    await waitFor(async () => Number((await stats(page)).food) <= 8, 'food running low under PLAY 4x', 60000);
    await page.click('[data-testid="simulation-pause"]');
    s = await stats(page);
    assert(s.colonists === '1', `colony must still be alive when PLAY is paused, got ${JSON.stringify(s)}`);
    assert(Number(s.food) > 0, `expected a positive food reserve before starvation, got ${s.food}`);
    assert(Number(s.construction) <= 25, `long PLAY must respect the 25 storage capacity, got ${s.construction}`);
    // Step 10AD re-baseline: with the Workshop staffed the flow is +1/tick up
    // to the 24 equilibrium, so long PLAY settles AT the capacity instead of
    // the historical over-capacity drain. The capacity bound itself is the
    // assertion; the starvation consequence below is unchanged.
    assert(Number(s.construction) >= 15, `long PLAY must stay within the bounded band, got ${s.construction}`);
    ok(`PLAY 4x consumed the reserve to food ${s.food} at tick ${s.tick} (material ${s.construction}, jobs "${await jobsText(page)}")`);

    let previousMaterial = Number(s.construction);
    let starvedTick = null;
    for (let i = 0; i < 16 && starvedTick === null; i++) {
      s = await step(page);
      const material = Number(s.construction);
      assert(material <= 25, `material must never exceed capacity 25, got ${material}`);
      if (s.colonists === '0') {
        starvedTick = Number(s.tick);
        assert(material <= previousMaterial, `death-tick material must not grow: ${previousMaterial} -> ${material}`);
      } else {
        assert(Math.abs(material - previousMaterial) <= 1, `capped stock must stay within 1 of capacity, got ${material - previousMaterial}`);
        previousMaterial = material;
      }
    }
    assert(starvedTick !== null, 'colony never starved');
    assert(s.foodStatus === 'starved', `foodStatus expected starved, got ${s.foodStatus}`);
    assert(s.employed === '0' && s.jobCapacity === '2', `employment must vanish, got ${JSON.stringify(s)}`);
    assert((await jobsText(page)) === '0 / 2', `HUD jobs expected "0 / 2", got "${await jobsText(page)}"`);
    assert(s.materialProduction === '0', `starvation must stop material production, got ${s.materialProduction}`);
    await selectAt(page, BOOT.workshop);
    const starvedInspection = await inspectionHousingText(page);
    assert(starvedInspection === 'Jobs — Capacity 1 · Workers 0/1 · upkeep 0 (vacant)', `starved workshop inspection bad: "${starvedInspection}"`);
    ok(`starvation at tick ${starvedTick}: jobs "${await jobsText(page)}", inspection "${starvedInspection}"`);
    await shot('08-starvation.png');

    // ---------------------------------------------------------------------
    // Scenario 6 — forecast semantics with worker-gated production
    // ---------------------------------------------------------------------
    console.log('--- Scenario 6: food forecast semantics ---');
    await fresh(page);
    assert((await forecastText(page)) === '', `population 0 -> no forecast, got "${await forecastText(page)}"`);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 2, y: 2 }); // t1
    await step(page); // t2 Step 10Y — 1 construction tick left
    s = await step(page); // t3 colonist: production 0 < consumption 1
    const declining = (await forecastText(page)).trim();
    assert(/^·\s*~[0-9]+ ticks$/.test(declining), `declining reserve must show a finite forecast, got "${declining}"`);
    assert(Number(s.foodForecast) > 0 && Number(s.foodForecast) < 200, `finite forecast out of range: ${s.foodForecast}`);
    ok(`population 0 -> ""; production 0 -> "${declining}" (finite)`);
    await fresh(page);
    s = await placeCoreLoop(page, 'farm'); // t8: 1 colonist, 1 staffed farm (production 2 > 1)
    assert(s.colonists === '1', `expected 1 colonist, got ${s.colonists}`);
    assert(s.foodForecast === 'sustainable', `production > consumption must be sustainable, got "${s.foodForecast}"`);
    assert((await forecastText(page)).includes('sustainable'), `UI must show " · sustainable", got "${await forecastText(page)}"`);
    ok(`1 colonist + 1 staffed farm: "${(await forecastText(page)).trim()}" (2 > 1)`);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 6, y: 2 }); // t9 residence (admission is not road-gated)
    await step(page); // t10 Step 10Y — 1 construction tick left
    s = await step(page); // t11 second colonist: production 2 = consumption 2
    assert(s.colonists === '2', `expected 2 colonists, got ${s.colonists}`);
    assert(s.foodForecast === 'sustainable', `production = consumption must be sustainable, got "${s.foodForecast}"`);
    ok(`2 colonists + 1 staffed farm: "${(await forecastText(page)).trim()}" (2 = 2)`);
    await shot('09-forecast-sustainable.png');

    // ---------------------------------------------------------------------
    // Scenario 7 — Step 10E farm employment & worker competition
    // ---------------------------------------------------------------------
    console.log('--- Scenario 7: Step 10E farm employment ---');
    await fresh(page);
    s = await placeCoreLoop(page, 'farm'); // t8: farm operational + staffed
    assert(s.farms === '1' && s.staffedFarmIds !== '', `farm must be staffed once road-connected: ${JSON.stringify(s)}`);
    assert(s.vacantOperationalFarms === '0', `no vacant farm expected, got ${s.vacantOperationalFarms}`);
    assert(s.jobs === '1 / 1' && s.materialProduction === '0', `farm job should be the only one, got ${JSON.stringify(s)}`);
    // Step 10E timing: produceFood precedes assignJobs, so the worker assigned
    // this tick produces from the NEXT tick. The assignment is visible now.
    assert(s.status.includes('Colonist assigned to Farm'), `farm-assignment feedback missing: ${JSON.stringify(s)}`);
    assert(!s.status.includes('assigned to Workshop'), `farm assignment must not claim Workshop: ${JSON.stringify(s)}`);
    s = await step(page); // t9: first productive tick
    assert(s.status.includes('1 farm produced 2 food'), `staffed-farm production feedback missing: ${JSON.stringify(s)}`);
    await selectAt(page, { x: 4, y: 2 });
    const farmInspection = await inspectionHousingText(page);
    assert(farmInspection === 'Food production — producing +2/tick (staffed)', `staffed farm inspection bad: "${farmInspection}"`);
    ok(`staffed farm: jobs "${await jobsText(page)}", inspection "${farmInspection}", status "${s.status}"`);

    // Vacant farm: same farm, no road -> operational but never staffed.
    await fresh(page);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 2, y: 2 }); // t1
    await step(page); // t2 Step 10Y — 1 construction tick left
    await step(page); // t3 colonist
    await selectPalette(page, 'build-farm', 'Farm selected');
    await placeAt(page, { x: 6, y: 2 }); // t4 (no road anywhere)
    await step(page); // t5 Step 10Y — 1 construction tick left
    s = await step(page); // t6 farm operational but unreachable
    assert(s.vacantOperationalFarms === '1', `farm with no road must be vacant, got ${JSON.stringify(s)}`);
    assert(s.staffedFarmIds === '', `vacant farm must have no worker, got "${s.staffedFarmIds}"`);
    assert(s.employed === '0' && s.jobCapacity === '1', `farm job must stay open, got ${JSON.stringify(s)}`);
    assert(s.foodForecast !== 'sustainable', `vacant farm cannot sustain: got "${s.foodForecast}"`);
    await selectAt(page, { x: 6, y: 2 });
    const vacantFarmInspection = await inspectionHousingText(page);
    assert(vacantFarmInspection === 'Food production — vacant, producing +0/tick', `vacant farm inspection bad: "${vacantFarmInspection}"`);
    ok(`vacant farm: inspection "${vacantFarmInspection}", forecast "${s.foodForecast}", jobs "${await jobsText(page)}"`);

    // Competition: one colonist, one farm (near) and one Well (farther).
    // Step 10AD: the Workshop is not affordable here (it needs Water), but
    // 09M/10E are type-blind, so the Well is the competing workplace and the
    // nearer Farm must still win.
    await fresh(page);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 2, y: 2 }); // t1
    await step(page); // t2 Step 10Y — 1 construction tick left
    await step(page); // t3 colonist-1
    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 3, y: 2 }); // t4 (touches residence + farm contact)
    await step(page); // t5 road operational
    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 3, y: 3 }); // t6 (extends the network)
    await step(page); // t7 road operational
    await selectPalette(page, 'build-farm', 'Farm selected');
    await placeAt(page, { x: 4, y: 2 }); // t8 farm, distance 0
    await step(page); // t9 Step 10Y — 1 construction tick left
    await step(page); // t10 operational + staffed
    await selectPalette(page, 'build-well', 'Well selected');
    await placeAt(page, { x: 4, y: 3 }); // t11 Well, distance 1
    await step(page); // t12 Step 10Y — 1 construction tick left
    s = await step(page); // t13
    assert(s.colonists === '1' && s.jobCapacity === '2', `expected 1 colonist / 2 workplaces, got ${JSON.stringify(s)}`);
    assert(s.employed === '1' && s.unemployed === '0', `exactly one worker must be placed, got ${JSON.stringify(s)}`);
    // 09M is authoritative and type-blind: the NEARER workplace (the farm,
    // distance 0) wins, so Food is produced and the Well stays vacant.
    assert(s.staffedFarmIds !== '', `nearer farm must win the worker, got farms "${s.staffedFarmIds}"`);
    assert(s.waterProduction === '0', `farther vacant Well must produce no Water, got "${s.waterProduction}"`);
    assert(s.materialProduction === '0', `no Workshop -> no material, got ${s.materialProduction}`);
    assert(s.status.includes('1 farm produced 2 food'), `competition feedback missing: ${JSON.stringify(s.status)}`);
    ok(`competition: 1 colonist, farm (distance 0) staffed, Well (distance 1) vacant, materialProduction ${s.materialProduction}`);
    await shot('10-farm-competition.png');

    const realErrors = errors.filter((e) => !e.includes('favicon'));
    if (realErrors.length > 0) fail(`browser errors: ${realErrors.join(' | ')}`);
    else ok('zero console/page errors');
  } catch (e) {
    if (!process.exitCode) {
      console.error(`JOBS E2E FAIL: ${e.message}`);
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('JOBS E2E RESULT: FAIL');
  else console.log('JOBS E2E RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`JOBS E2E FAIL: ${e.message}`);
  process.exitCode = 1;
});
