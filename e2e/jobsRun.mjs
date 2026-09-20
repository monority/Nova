/* NOVA Step 07C jobs E2E — re-baselined for Step 09F (road access) and
 * Step 10E (farm employment). Plain Node, playwright core only.
 *
 * Real browser causal proof of the Jobs loop:
 *   Residence -> Colonist -> Road (09K mobility) -> Workplace
 *   -> Employment -> Material / Food, plus unemployment, vacancy,
 *   starvation, forecast semantics and 10E farm/workshop competition.
 * All state changes come from real palette clicks on the canvas and real
 * STEP/PLAY/speed controls. window.__nova is only read (never mutated).
 *
 * Two rule changes since this suite was written are now part of the proof:
 *   - Step 09F: Material production needs road access, so every workshop here
 *     is road-connected through the real 09H road palette (the old
 *     "deferred: no road palette" guard is obsolete and has been removed).
 *   - Step 10E: a Farm produces only while STAFFED, and Farm workers compete
 *     with Workshop workers in one labour pool (scenario 7).
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

async function stepToTick(page, target) {
  for (;;) {
    const s = await stats(page);
    if (Number(s.tick) >= target) return s;
    await step(page);
  }
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
  assert(s.status.includes(expectedLabel), `palette feedback missing for ${testid}: ${JSON.stringify(s.status)}`);
  return s;
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

/** Residence at (2,2), a single contact road at (3,2), workplace at (4,2). */
async function placeCoreLoop(page, kind) {
  await selectPalette(page, 'build-residence', 'Residence selected');
  await placeAt(page, { x: 2, y: 2 }); // tick 1
  await step(page); // tick 2: residence operational, colonist admitted
  await selectPalette(page, 'build-road', 'Road selected');
  await placeRoad(page, { x: 3, y: 2 }); // tick 3
  await step(page); // tick 4: road operational
  await selectPalette(page, kind === 'farm' ? 'build-farm' : 'build-workshop', kind === 'farm' ? 'Farm selected' : 'Workshop selected');
  await placeAt(page, { x: 4, y: 2 }); // tick 5
  return step(page); // tick 6: workplace operational + staffed
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
    // Scenario 1 — core causal loop + material drain above storage capacity
    // ---------------------------------------------------------------------
    console.log('--- Scenario 1: housing -> road -> workshop -> employment -> material ---');
    let s = await fresh(page);
    assert(s.tick === '0', `fresh tick expected 0, got ${s.tick}`);
    assert(s.food === '100' && s.construction === '100', `fresh resources bad: ${JSON.stringify(s)}`);
    assert(s.colonists === '0' && s.employed === '0' && s.jobCapacity === '0', `fresh employment bad: ${JSON.stringify(s)}`);
    assert((await jobsText(page)) === '0 / 0', `fresh HUD jobs bad: ${await jobsText(page)}`);
    assert((await forecastText(page)) === '', `fresh forecast should be empty (population 0), got "${await forecastText(page)}"`);
    ok(`fresh state: material ${s.construction}, food ${s.food}, jobs "${await jobsText(page)}", no forecast`);
    await shot('01-fresh.png');

    // Phase A/B: residence, road, workshop through the real palettes.
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 2, y: 2 }); // t1
    s = await step(page); // t2
    assert(s.colonists === '1', `expected 1 colonist at tick 2, got ${s.colonists}`);
    assert(s.construction === '75', `material after residence expected 75, got ${s.construction}`);
    assert(s.status.includes('Colonist arrived'), `arrival feedback missing: ${JSON.stringify(s.status)}`);
    const finiteForecast = Number((await forecastText(page)).replace(/[^0-9]/g, ''));
    assert(Number.isFinite(finiteForecast) && finiteForecast > 0, `finite forecast expected while declining, got "${await forecastText(page)}"`);
    ok(`colonist admitted at tick ${s.tick}; status "${s.status}"; forecast "${(await forecastText(page)).trim()}"`);
    await shot('02-colonist.png');

    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 3, y: 2 }); // t3
    s = await step(page); // t4
    assert(s.roads === '1' && s.operationalRoads === '1', `road should be operational at tick 4, got ${JSON.stringify(s)}`);
    ok(`road operational at tick ${s.tick} (09K mobility link), material ${s.construction}`);

    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 4, y: 2 }); // t5
    s = await stats(page);
    assert(s.workshops === '1', `expected 1 workshop, got ${s.workshops}`);
    assert(s.jobCapacity === '0', `under-construction workshop must offer no job, got ${s.jobCapacity}`);
    await selectAt(page, { x: 4, y: 2 });
    const underConstruction = await inspectionHousingText(page);
    assert(underConstruction === 'Jobs — Capacity 0 · Workers 0/0 · upkeep 0 (vacant)', `under-construction workshop inspection bad: "${underConstruction}"`);
    ok(`workshop placed at tick ${s.tick}; material ${s.construction}; inspection "${underConstruction}"`);

    s = await step(page); // t6: operational + staffed + producing
    assert(s.employed === '1' && s.jobCapacity === '1', `expected 1/1 employment at tick 6, got ${JSON.stringify(s)}`);
    assert((await jobsText(page)) === '1 / 1', `HUD jobs expected "1 / 1", got "${await jobsText(page)}"`);
    assert(s.materialProduction === '2', `material production expected 2, got ${s.materialProduction}`);
    assert(s.status.includes('Colonist assigned to Workshop'), `employment feedback missing: ${JSON.stringify(s.status)}`);
    assert(s.status.includes('1 worker produced 2 material'), `material feedback missing: ${JSON.stringify(s.status)}`);
    // Step 08F: stock above the 25 capacity stores nothing and drains -1 upkeep.
    assert(s.storageCapacity === '25' && s.storedProduction === '0', `capacity expectations broken: ${JSON.stringify(s)}`);
    assert(s.construction === '44', `material at tick 6 expected 44, got ${s.construction}`);
    const selection = await selectAt(page, { x: 4, y: 2 });
    assert(selection?.type === 'workshop', `selection expected workshop, got ${JSON.stringify(selection)}`);
    assert((await page.locator('[data-testid="inspection-type"]').textContent()) === 'Workshop', 'inspection type label missing');
    const operationalJobs = await inspectionHousingText(page);
    assert(operationalJobs === 'Jobs — Capacity 1 · Workers 1/1 · upkeep 1/tick', `workshop inspection bad: "${operationalJobs}"`);
    ok(`workshop staffed at tick ${s.tick}: jobs "${await jobsText(page)}", inspection "${operationalJobs}", material ${s.construction}`);
    ok(`causal status: "${s.status}"`);
    await shot('03-employed-workshop.png');

    // Phase D: exact drained deltas (−1/tick above capacity).
    let materialBefore = Number(s.construction);
    s = await step(page);
    assert(Number(s.construction) - materialBefore === -1, `over-capacity tick expected -1 drain (0 stored - 1 upkeep), got ${Number(s.construction) - materialBefore}`);
    materialBefore = Number(s.construction);
    for (let i = 0; i < 3; i++) {
      s = await step(page);
    }
    assert(Number(s.construction) - materialBefore === -3, `3 over-capacity ticks expected -3 drain, got ${Number(s.construction) - materialBefore}`);
    assert(s.materialProduction === '2', `gross production must stay 2 with one worker, got ${s.materialProduction}`);
    assert(s.status.includes('1 worker produced 2 material'), `steady material feedback missing: ${JSON.stringify(s.status)}`);
    ok(`material deltas exact: -1 drain/tick over capacity, gross stays 2 at tick ${s.tick} (material ${s.construction})`);
    await shot('04-material-production.png');

    // ---------------------------------------------------------------------
    // Scenario 2 — labor-financed construction (second workshop + refill)
    // ---------------------------------------------------------------------
    console.log('--- Scenario 2: labor income funds further construction ---');
    await fresh(page);
    s = await placeCoreLoop(page, 'workshop'); // tick 6: material 44, one staffed workshop
    assert(s.construction === '44', `core loop expected material 44, got ${s.construction}`);
    // Raise capacity to 50 with a second (road-connected) workshop: 44 - 5
    // road - 1 upkeep = 38, then -25 workshop - 1 upkeep = 12 sub-capacity.
    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 3, y: 3 }); // t7
    s = await step(page); // t8
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 4, y: 3 }); // t9
    s = await step(page); // t10: operational, capacity 50
    assert(s.workshops === '2' && s.storageCapacity === '50', `capacity should be 50 now, got ${JSON.stringify(s)}`);
    assert(Number(s.construction) < 25, `material should be below the 25 cost, got ${s.construction}`);
    assert(s.materialProduction === '2', `only one worker exists, gross must stay 2, got ${s.materialProduction}`);
    // Below capacity the stock refills at +1/tick (2 stored - 1 upkeep).
    let laborTicks = 0;
    while (Number((await stats(page)).construction) < 25) {
      const before = Number((await stats(page)).construction);
      s = await step(page);
      laborTicks += 1;
      assert(laborTicks <= 40, 'labor never produced enough material to build again');
      if (Number(s.construction) < 25) {
        assert(Number(s.construction) - before === 1, `sub-capacity tick must net +1 (2 stored - 1 upkeep), got ${Number(s.construction) - before}`);
      }
    }
    assert(s.construction === '25', `expected 25 material after refill, got ${s.construction}`);
    ok(`labor refilled ${laborTicks} ticks at +1/tick to material ${s.construction} (capacity 50, one worker)`);

    const beforeBuild = Number(s.construction);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 8, y: 8 });
    s = await stats(page);
    assert(Number(s.construction) === beforeBuild - 25 + 2 - 1, `exact deduction expected ${beforeBuild} - 25 + 2 labor - 1 upkeep, got ${s.construction}`);
    assert(s.buildings === '4', `expected 4 buildings, got ${s.buildings}`);
    ok(`labor enabled construction at tick ${s.tick}: ${beforeBuild} -> ${s.construction}, buildings ${s.buildings}`);
    await shot('05-construction-enabled.png');

    // ---------------------------------------------------------------------
    // Scenario 3 — more colonists than jobs (unemployment)
    // ---------------------------------------------------------------------
    console.log('--- Scenario 3: surplus colonists stay unemployed ---');
    await fresh(page);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 2, y: 2 }); // t1
    await step(page); // t2 colonist-1
    await placeAt(page, { x: 2, y: 4 }); // t3 residence-2
    await step(page); // t4 colonist-2
    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 2, y: 3 }); // t5 (touches both residences)
    await step(page); // t6 road operational
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 3, y: 3 }); // t7 (adjacent to the same road cell)
    s = await step(page); // t8
    assert(s.colonists === '2' && s.jobCapacity === '1', `expected 2 colonists / 1 job, got ${JSON.stringify(s)}`);
    assert(s.employed === '1' && s.unemployed === '1', `expected 1 employed / 1 unemployed, got ${JSON.stringify(s)}`);
    assert((await jobsText(page)) === '1 / 1', `HUD jobs expected "1 / 1", got "${await jobsText(page)}"`);
    assert(s.materialProduction === '2', `gross production must be exactly one worker's output, got ${s.materialProduction}`);
    const surplusMaterial = Number(s.construction);
    s = await step(page);
    assert(Number(s.construction) - surplusMaterial === 1, `below-capacity tick must net +1 (2 stored - 1 upkeep): delta ${Number(s.construction) - surplusMaterial}`);
    await selectAt(page, { x: 3, y: 3 });
    const surplusInspection = await inspectionHousingText(page);
    assert(surplusInspection === 'Jobs — Capacity 1 · Workers 1/1 · upkeep 1/tick', `single workshop must not hold two workers: "${surplusInspection}"`);
    ok(`2 colonists / 1 job: employed ${s.employed}, unemployed ${s.unemployed}, +1 net material/tick, inspection "${surplusInspection}"`);
    await shot('06-unemployment.png');

    // ---------------------------------------------------------------------
    // Scenario 4 — more jobs than colonists (vacancies)
    // ---------------------------------------------------------------------
    console.log('--- Scenario 4: surplus jobs stay vacant ---');
    await fresh(page);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 2, y: 2 }); // t1
    await step(page); // t2 colonist-1
    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 3, y: 2 }); // t3
    await step(page); // t4 road operational
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 4, y: 2 }); // t5 workshop-1 (nearest: distance 0)
    await step(page); // t6 operational + staffed
    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 3, y: 3 }); // t7
    await step(page); // t8 road operational
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 4, y: 3 }); // t9 workshop-2 (farther: distance 1)
    s = await step(page); // t10
    assert(s.employed === '1' && s.jobCapacity === '2', `expected 1 employed / 2 jobs, got ${JSON.stringify(s)}`);
    assert((await jobsText(page)) === '1 / 2', `HUD jobs expected "1 / 2", got "${await jobsText(page)}"`);
    assert(s.unemployed === '0', `no colonist should be unemployed, got ${s.unemployed}`);
    // 09M: the nearest workplace is chosen, so the FIRST workshop (lower id,
    // distance 0) is staffed and the second stays vacant.
    assert(s.staffedWorkshopIds === 'building-2', `nearest workshop expected staffed, got "${s.staffedWorkshopIds}"`);
    await selectAt(page, { x: 4, y: 2 });
    const staffed = await inspectionHousingText(page);
    await selectAt(page, { x: 4, y: 3 });
    const vacant = await inspectionHousingText(page);
    assert(staffed === 'Jobs — Capacity 1 · Workers 1/1 · upkeep 1/tick', `staffed workshop inspection bad: "${staffed}"`);
    assert(vacant === 'Jobs — Capacity 1 · Workers 0/1 · upkeep 0 (vacant)', `vacant workshop inspection bad: "${vacant}"`);
    const vacancyMaterial = Number(s.construction);
    s = await step(page);
    assert(s.materialProduction === '2', `material production must stay 2 with one worker, got ${s.materialProduction}`);
    ok(`1 colonist / 2 jobs: HUD "${await jobsText(page)}", staffed "${staffed}", vacant "${vacant}", material ${vacancyMaterial} -> ${s.construction}`);
    await shot('07-surplus-jobs.png');

    // ---------------------------------------------------------------------
    // Scenario 5 — starvation removes employment and material output
    // ---------------------------------------------------------------------
    console.log('--- Scenario 5: starvation ---');
    await fresh(page);
    s = await placeCoreLoop(page, 'workshop'); // t6: employed, material 44
    assert(s.employed === '1', `expected employment before starvation, got ${s.employed}`);
    const beforeStarvationMaterial = Number(s.construction);
    await page.selectOption('#speed', '4');
    await page.click('[data-testid="simulation-play"]');
    await waitFor(async () => Number((await stats(page)).food) <= 8, 'food running low under PLAY 4x', 60000);
    await page.click('[data-testid="simulation-pause"]');
    s = await stats(page);
    assert(s.colonists === '1', `colony must still be alive when PLAY is paused, got ${JSON.stringify(s)}`);
    assert(Number(s.food) > 0, `expected a positive food reserve before starvation, got ${s.food}`);
    assert(Number(s.construction) <= 25, `long PLAY must respect the 25 storage capacity, got ${s.construction}`);
    assert(Number(s.construction) < beforeStarvationMaterial, `over-capacity stock must have drained during PLAY, got ${s.construction}`);
    ok(`PLAY 4x consumed the reserve to food ${s.food} at tick ${s.tick} (material ${s.construction}, jobs "${await jobsText(page)}")`);

    // The stock hovers at the 25 capacity while employed (stored 0 above cap,
    // +2 stored - 1 upkeep below it), so it must never exceed the capacity.
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
    assert(s.employed === '0' && s.jobCapacity === '1', `employment must vanish, got ${JSON.stringify(s)}`);
    assert((await jobsText(page)) === '0 / 1', `HUD jobs expected "0 / 1", got "${await jobsText(page)}"`);
    assert(s.materialProduction === '0', `starvation must stop material production, got ${s.materialProduction}`);
    await selectAt(page, { x: 4, y: 2 });
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
    s = await step(page); // t2 colonist: production 0 < consumption 1
    const declining = (await forecastText(page)).trim();
    assert(/^·\s*~[0-9]+ ticks$/.test(declining), `declining reserve must show a finite forecast, got "${declining}"`);
    assert(Number(s.foodForecast) > 0 && Number(s.foodForecast) < 200, `finite forecast out of range: ${s.foodForecast}`);
    ok(`population 0 -> ""; production 0 -> "${declining}" (finite)`);
    await fresh(page);
    s = await placeCoreLoop(page, 'farm'); // t6: 1 colonist, 1 staffed farm (production 2 > 1)
    assert(s.colonists === '1', `expected 1 colonist, got ${s.colonists}`);
    assert(s.foodForecast === 'sustainable', `production > consumption must be sustainable, got "${s.foodForecast}"`);
    assert((await forecastText(page)).includes('sustainable'), `UI must show " · sustainable", got "${await forecastText(page)}"`);
    ok(`1 colonist + 1 staffed farm: "${(await forecastText(page)).trim()}" (2 > 1)`);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 6, y: 2 }); // t7 residence (admission is not road-gated)
    s = await step(page); // t8 second colonist: production 2 = consumption 2
    assert(s.colonists === '2', `expected 2 colonists, got ${s.colonists}`);
    assert(s.foodForecast === 'sustainable', `production = consumption must be sustainable, got "${s.foodForecast}"`);
    ok(`2 colonists + 1 staffed farm: "${(await forecastText(page)).trim()}" (2 = 2)`);
    await shot('09-forecast-sustainable.png');

    // ---------------------------------------------------------------------
    // Scenario 7 — Step 10E farm employment & worker competition
    // ---------------------------------------------------------------------
    console.log('--- Scenario 7: Step 10E farm employment ---');
    await fresh(page);
    s = await placeCoreLoop(page, 'farm'); // t6: farm operational + staffed
    assert(s.farms === '1' && s.staffedFarmIds !== '', `farm must be staffed once road-connected: ${JSON.stringify(s)}`);
    assert(s.vacantOperationalFarms === '0', `no vacant farm expected, got ${s.vacantOperationalFarms}`);
    assert(s.jobs === '1 / 1' && s.materialProduction === '0', `farm job should be the only one, got ${JSON.stringify(s)}`);
    // Step 10E timing: produceFood precedes assignJobs, so the worker assigned
    // this tick produces from the NEXT tick. The assignment is visible now.
    assert(s.status.includes('Colonist assigned to Farm'), `farm-assignment feedback missing: ${JSON.stringify(s.status)}`);
    assert(!s.status.includes('assigned to Workshop'), `farm assignment must not claim Workshop: ${JSON.stringify(s.status)}`);
    s = await step(page); // t7: first productive tick
    assert(s.status.includes('1 farm produced 2 food'), `staffed-farm production feedback missing: ${JSON.stringify(s.status)}`);
    await selectAt(page, { x: 4, y: 2 });
    const farmInspection = await inspectionHousingText(page);
    assert(farmInspection === 'Food production — producing +2/tick (staffed)', `staffed farm inspection bad: "${farmInspection}"`);
    ok(`staffed farm: jobs "${await jobsText(page)}", inspection "${farmInspection}", status "${s.status}"`);

    // Vacant farm: same farm, no road -> operational but never staffed.
    await fresh(page);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 2, y: 2 }); // t1
    await step(page); // t2 colonist
    await selectPalette(page, 'build-farm', 'Farm selected');
    await placeAt(page, { x: 6, y: 2 }); // t3 (no road anywhere)
    s = await step(page); // t4 farm operational but unreachable
    assert(s.vacantOperationalFarms === '1', `farm with no road must be vacant, got ${JSON.stringify(s)}`);
    assert(s.staffedFarmIds === '', `vacant farm must have no worker, got "${s.staffedFarmIds}"`);
    assert(s.employed === '0' && s.jobCapacity === '1', `farm job must stay open, got ${JSON.stringify(s)}`);
    assert(s.foodForecast !== 'sustainable', `vacant farm cannot sustain: got "${s.foodForecast}"`);
    await selectAt(page, { x: 6, y: 2 });
    const vacantFarmInspection = await inspectionHousingText(page);
    assert(vacantFarmInspection === 'Food production — vacant, producing +0/tick', `vacant farm inspection bad: "${vacantFarmInspection}"`);
    ok(`vacant farm: inspection "${vacantFarmInspection}", forecast "${s.foodForecast}", jobs "${await jobsText(page)}"`);

    // Competition: one colonist, one farm (near) and one workshop (farther).
    await fresh(page);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 2, y: 2 }); // t1
    await step(page); // t2 colonist-1
    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 3, y: 2 }); // t3 (touches residence + farm contact)
    await step(page); // t4 road operational
    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 3, y: 3 }); // t5 (extends the network)
    await step(page); // t6 road operational
    await selectPalette(page, 'build-farm', 'Farm selected');
    await placeAt(page, { x: 4, y: 2 }); // t7 farm, distance 0
    await step(page); // t8 operational + staffed
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 4, y: 3 }); // t9 workshop, distance 1
    s = await step(page); // t10
    assert(s.colonists === '1' && s.jobCapacity === '2', `expected 1 colonist / 2 workplaces, got ${JSON.stringify(s)}`);
    assert(s.employed === '1' && s.unemployed === '0', `exactly one worker must be placed, got ${JSON.stringify(s)}`);
    // 09M is authoritative and type-blind: the NEARER workplace (the farm,
    // distance 0) wins, so Food is produced and the workshop stays vacant.
    assert(s.staffedFarmIds !== '', `nearer farm must win the worker, got farms "${s.staffedFarmIds}"`);
    assert(s.staffedWorkshopIds === '', `farther workshop must stay vacant, got "${s.staffedWorkshopIds}"`);
    assert(s.materialProduction === '0', `no worker in the workshop -> no material, got ${s.materialProduction}`);
    assert(s.status.includes('1 farm produced 2 food'), `competition feedback missing: ${JSON.stringify(s.status)}`);
    ok(`competition: 1 colonist, farm (distance 0) staffed, workshop (distance 1) vacant, materialProduction ${s.materialProduction}`);
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
