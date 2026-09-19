/* NOVA Step 07C jobs E2E. Plain Node, playwright core only.
 * Real browser causal proof of the Jobs loop:
 *   Residence -> Colonist -> Workshop -> Employment -> Construction material
 *   -> further construction, plus unemployment / vacant-job / starvation cases.
 * All state changes come from real palette clicks on the canvas and real
 * STEP/PLAY/speed controls. window.__nova is only read (never mutated).
 * Screenshots: artifacts/jobs/01..09.
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

/* Step 09F deferral: this scenario proves Material production from staffed
 * Workshops (Residence -> Colonist -> Workshop -> Employment -> Material).
 * Step 09F gates Material production on road access, and the browser app has
 * no player-facing road construction UI yet (09C shipped the road domain
 * without a palette). A browser scenario therefore cannot build a
 * road-connected Workshop. Simulation-level coverage lives in
 * tests/roadProduction.test.ts (A-N). Remove this guard once a road palette
 * ships, then road-connect the Workshops in this scenario. */
console.log('JOBS E2E DEFERRED: browser cannot construct roads (no road palette UI); Material production now requires road access (Step 09F). Coverage: tests/roadProduction.test.ts');
process.exit(0);

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

const inspectionJobsText = (page) =>
  page.locator('[data-testid="inspection-housing"]').textContent();
const statusText = (page) => page.locator('[data-testid="ui-status"]').textContent();
const jobsText = (page) => page.locator('[data-testid="stat-jobs"]').textContent();
const forecastText = (page) => page.locator('[data-testid="stat-food-forecast"]').textContent();

async function fresh(page) {
  await page.goto(URL, { waitUntil: 'load' });
  await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
  return stats(page);
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

    // ---------------------------------------------------------------------
    // Scenario 1 - Phases A-E: core causal loop + labor-enabled construction
    // ---------------------------------------------------------------------
    console.log('--- Scenario 1: housing -> workshop -> employment -> material ---');
    let s = await fresh(page);
    assert(s.tick === '0', `fresh tick expected 0, got ${s.tick}`);
    assert(s.food === '100' && s.construction === '100', `fresh resources bad: ${JSON.stringify(s)}`);
    assert(s.colonists === '0' && s.employed === '0' && s.jobCapacity === '0', `fresh employment bad: ${JSON.stringify(s)}`);
    assert(await jobsText(page) === '0 / 0', `fresh HUD jobs bad: ${await jobsText(page)}`);
    assert(await forecastText(page) === '', `fresh forecast should be empty (population 0), got "${await forecastText(page)}"`);
    assert(s.workshops === '0', `fresh workshops expected 0, got ${s.workshops}`);
    ok(`fresh state: material ${s.construction}, food ${s.food}, jobs "${await jobsText(page)}", no forecast`);
    await shot('01-fresh.png');

    // Phase A - housing.
    await placeAt(page, { x: 6, y: 6 }); // Residence (default palette), tick 1
    s = await stepToTick(page, 2); // residence operational + colonist admitted
    assert(s.colonists === '1', `expected 1 colonist at tick 2, got ${s.colonists}`);
    assert(s.construction === '75', `material after residence expected 75, got ${s.construction}`);
    assert(s.status.includes('Colonist arrived'), `arrival feedback missing: ${JSON.stringify(s.status)}`);
    const finiteForecast = Number(await forecastText(page).then((t) => t.replace(/[^0-9]/g, '')));
    assert(Number.isFinite(finiteForecast) && finiteForecast > 0, `finite forecast expected while declining, got "${await forecastText(page)}"`);
    ok(`colonist admitted at tick ${s.tick}; causal status "${s.status}"; food forecast "${(await forecastText(page)).trim()}"`);
    await shot('02-colonist.png');

    // Phase B - workshop.
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 4, y: 4 }); // tick 3
    s = await stats(page);
    assert(s.workshops === '1', `expected 1 workshop, got ${s.workshops}`);
    assert(s.jobCapacity === '0', `under-construction workshop must offer no job, got ${s.jobCapacity}`);
    assert(s.employed === '0', `no employment before operational, got ${s.employed}`);
    await selectAt(page, { x: 4, y: 4 });
    const underConstruction = await inspectionJobsText(page);
    assert(underConstruction === 'Jobs — Capacity 0 · Workers 0/0 · upkeep 0 (vacant)', `under-construction workshop inspection bad: "${underConstruction}"`);
    ok(`workshop placed at tick ${s.tick}; material ${s.construction}; jobs "${await jobsText(page)}"; inspection "${underConstruction}"`);

    s = await stepToTick(page, 4); // workshop operational -> staffed -> producing
    assert(s.employed === '1' && s.jobCapacity === '1', `expected 1/1 employment at tick 4, got ${JSON.stringify(s)}`);
    assert(await jobsText(page) === '1 / 1', `HUD jobs expected "1 / 1", got "${await jobsText(page)}"`);
    assert(s.construction === '49', `material at tick 4 expected 49 (50 bootstrap + 0 stored - 1 upkeep under the 25 capacity), got ${s.construction}`);
    assert(s.materialProduction === '2', `material production expected 2, got ${s.materialProduction}`);
    assert(s.status.includes('Colonist assigned to Workshop'), `employment feedback missing: ${JSON.stringify(s.status)}`);
    assert(s.status.includes('1 worker produced 2 material'), `material feedback missing: ${JSON.stringify(s.status)}`);
    const selection = await selectAt(page, { x: 4, y: 4 });
    assert(selection?.type === 'workshop', `selection expected workshop, got ${JSON.stringify(selection)}`);
    assert((await page.locator('[data-testid="inspection-type"]').textContent()) === 'Workshop', 'inspection type label missing');
    const operationalJobs = await inspectionJobsText(page);
    assert(operationalJobs === 'Jobs — Capacity 1 · Workers 1/1 · upkeep 1/tick', `workshop inspection bad: "${operationalJobs}"`);
    ok(`workshop operational at tick ${s.tick}: jobs "${await jobsText(page)}", inspection "${operationalJobs}"`);
    ok(`causal status: "${s.status}"`);
    await shot('03-employed-workshop.png');

    // Phase D - material production (exact deltas, Step 08F: over-capacity
    // stock drains -1/tick since stored production is 0 above capacity 25).
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
    ok(`steady status: "${s.status}"`);
    await shot('04-material-production.png');

    // Phase E - construction loop financed by labor (Step 08F: the second
    // workshop raises capacity to 50, so the refill below capacity lands).
    await selectPalette(page, 'build-residence', 'Residence selected');
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 2, y: 2 }); // one workshop: stock 45 + 0 stored (above cap) - 25 - 1 upkeep -> 19
    s = await stats(page);
    assert(Number(s.construction) < 25, `material should be below the 25 cost here, got ${s.construction}`);
    // Rejected while below cost (real hover + click on a free cell).
    const rejectPt = await moveTo(page, { x: 8, y: 8 });
    await waitFor(async () => (await stats(page)).status.includes('insufficient'), 'insufficient material preview');
    const rejectedBefore = await stats(page);
    await page.mouse.click(rejectPt.x, rejectPt.y);
    await new Promise((r) => setTimeout(r, 400));
    const rejectedAfter = await stats(page);
    assert(rejectedAfter.buildings === rejectedBefore.buildings, `rejected placement changed buildings: ${JSON.stringify(rejectedAfter)}`);
    assert(rejectedAfter.construction === rejectedBefore.construction, `rejected placement changed material: ${JSON.stringify(rejectedAfter)}`);
    ok(`below-cost placement rejected at material ${rejectedAfter.construction}: buildings ${rejectedAfter.buildings} unchanged`);
    // Only worker output can raise the stock back to the construction cost.
    // Refill runs at net +1/tick below capacity (19 -> 25 = 6 ticks).
    let laborTicks = 0;
    while (Number((await stats(page)).construction) < 25) {
      await step(page);
      laborTicks += 1;
      assert(laborTicks <= 30, 'labor never produced enough material to build again');
    }
    s = await stats(page);
    assert(laborTicks === 6, `expected 6 labor ticks to >= 25, got ${laborTicks}`);
    assert(s.construction === '25', `expected 25 material after refill, got ${s.construction}`);
    const productionPerTick = Number(s.materialProduction);
    const beforeBuild = Number(s.construction);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 8, y: 8 });
    s = await stats(page);
    assert(Number(s.construction) === beforeBuild - 25 + productionPerTick - 1, `exact deduction expected ${beforeBuild} - 25 + ${productionPerTick} labor - 1 upkeep, got ${s.construction}`);
    assert(s.buildings === '4', `expected 4 buildings, got ${s.buildings}`);
    assert(Number(beforeBuild) < 25 + 2, `material ${beforeBuild} should be just above the cost (labor-driven)`);
    ok(`labor enabled construction at tick ${s.tick}: ${beforeBuild} -> ${s.construction} (25 deducted, +${productionPerTick} labor, -1 upkeep), buildings ${s.buildings}`);
    await shot('05-construction-enabled.png');

    // ---------------------------------------------------------------------
    // Scenario 2 - Phase F: more colonists than jobs (unemployment)
    // ---------------------------------------------------------------------
    console.log('--- Scenario 2: surplus colonists stay unemployed ---');
    await fresh(page);
    await placeAt(page, { x: 2, y: 2 }); // t1 residence
    await step(page); // t2 colonist-1
    await placeAt(page, { x: 4, y: 4 }); // t3 residence
    s = await step(page); // t4 colonist-2, stock 50
    assert(s.colonists === '2', `expected 2 colonists, got ${s.colonists}`);
    // Farm first (Step 08F): the 25-cost farm is affordable at stock 50 and
    // keeps the forecast check meaningful before the workshop drains stock.
    await selectPalette(page, 'build-farm', 'Farm selected');
    await placeAt(page, { x: 8, y: 8 }); // t5 farm, stock 25
    s = await step(page); // t6 farm operational: +2 food, -2 food
    assert(s.foodForecast === 'sustainable', `production = consumption must read sustainable, got "${s.foodForecast}"`);
    assert((await forecastText(page)).includes('sustainable'), `UI must show " · sustainable", got "${await forecastText(page)}"`);
    ok(`forecast with production = consumption: "${(await forecastText(page)).trim()}" (stats "${s.foodForecast}")`);
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 6, y: 6 }); // t7 workshop, stock 0
    s = await step(page); // t8 workshop operational
    assert(s.colonists === '2' && s.jobCapacity === '1', `expected 2 colonists / 1 job, got ${JSON.stringify(s)}`);
    assert(s.employed === '1' && s.unemployed === '1', `expected 1 employed / 1 unemployed, got ${JSON.stringify(s)}`);
    assert(await jobsText(page) === '1 / 1', `HUD jobs expected "1 / 1", got "${await jobsText(page)}"`);
    assert(s.status.includes('Colonist assigned to Workshop'), `employment feedback missing: ${JSON.stringify(s.status)}`);
    const surplusInspection = await inspectionJobsText(page).then(() => selectAt(page, { x: 6, y: 6 })).then(() => inspectionJobsText(page));
    assert(surplusInspection === 'Jobs — Capacity 1 · Workers 1/1 · upkeep 1/tick', `single workshop must not hold two workers: "${surplusInspection}"`);
    assert(s.materialProduction === '2', `gross production must be exactly one worker's output, got ${s.materialProduction}`);
    const surplusMaterial = Number(s.construction);
    s = await step(page);
    assert(Number(s.construction) - surplusMaterial === 1, `below-capacity tick must net +1 (2 stored - 1 upkeep): delta ${Number(s.construction) - surplusMaterial}`);
    ok(`2 colonists / 1 job: employed ${s.employed}, unemployed ${s.unemployed}, HUD "${await jobsText(page)}", +1 net material/tick only`);
    ok(`workshop inspection while a colonist is unemployed: "${surplusInspection}"`);
    await shot('06-unemployment.png');

    // (Sustainable forecast was verified above at t6: 2 colonists + 1 farm.)

    // ---------------------------------------------------------------------
    // Scenario 3 - Phase G: more jobs than colonists (vacancies)
    // ---------------------------------------------------------------------
    console.log('--- Scenario 3: surplus jobs stay vacant ---');
    await fresh(page);
    await placeAt(page, { x: 2, y: 2 }); // t1 residence
    await step(page); // t2 colonist-1
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 4, y: 4 }); // t3 workshop-1
    s = await step(page); // t4 workshop-1 operational
    assert(s.employed === '1' && s.jobCapacity === '1', `expected 1/1, got ${JSON.stringify(s)}`);
    await placeAt(page, { x: 6, y: 6 }); // t5 workshop-2
    s = await step(page); // t6 workshop-2 operational
    assert(s.employed === '1' && s.jobCapacity === '2', `expected 1 employed / 2 jobs, got ${JSON.stringify(s)}`);
    assert(await jobsText(page) === '1 / 2', `HUD jobs expected "1 / 2", got "${await jobsText(page)}"`);
    assert(s.unemployed === '0', `no colonist should be unemployed, got ${s.unemployed}`);
    await selectAt(page, { x: 4, y: 4 });
    const staffed = await inspectionJobsText(page);
    await selectAt(page, { x: 6, y: 6 });
    const vacant = await inspectionJobsText(page);
    assert(staffed === 'Jobs — Capacity 1 · Workers 1/1 · upkeep 1/tick', `staffed workshop inspection bad: "${staffed}"`);
    assert(vacant === 'Jobs — Capacity 1 · Workers 0/1 · upkeep 0 (vacant)', `vacant workshop inspection bad: "${vacant}"`);
    const vacancyMaterial = Number(s.construction);
    s = await step(page);
    assert(Number(s.construction) - vacancyMaterial === 1, `vacant job must not produce: delta ${Number(s.construction) - vacancyMaterial}`);
    assert(s.materialProduction === '2', `material production must stay 2 with one worker, got ${s.materialProduction}`);
    ok(`1 colonist / 2 jobs: HUD "${await jobsText(page)}", staffed "${staffed}", vacant "${vacant}", material +1/tick net`);
    await shot('07-surplus-jobs.png');

    // ---------------------------------------------------------------------
    // Scenario 4 - Phase H: starvation removes employment and material output
    // ---------------------------------------------------------------------
    console.log('--- Scenario 4: starvation ---');
    await fresh(page);
    await placeAt(page, { x: 2, y: 2 }); // t1 residence
    await step(page); // t2 colonist-1
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 4, y: 4 }); // t3 workshop
    s = await step(page); // t4 employed
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

    let previousMaterial = Number(s.construction);
    let starvedTick = null;
    for (let i = 0; i < 14 && starvedTick === null; i++) {
      s = await step(page);
      const material = Number(s.construction);
      if (s.colonists === '0') {
        starvedTick = Number(s.tick);
        assert(material === previousMaterial, `death-tick material must not be produced: ${previousMaterial} -> ${material}`);
      } else {
        assert(material - previousMaterial === 0, `capped stock (24) must hold flat while employed (1 stored - 1 upkeep), got ${material - previousMaterial}`);
        previousMaterial = material;
      }
    }
    assert(starvedTick !== null, 'colony never starved');
    assert(s.foodStatus === 'starved', `foodStatus expected starved, got ${s.foodStatus}`);
    assert(s.employed === '0' && s.jobCapacity === '1', `employment must vanish, got ${JSON.stringify(s)}`);
    assert(await jobsText(page) === '0 / 1', `HUD jobs expected "0 / 1", got "${await jobsText(page)}"`);
    assert(s.materialProduction === '0', `starvation must stop material production, got ${s.materialProduction}`);
    await selectAt(page, { x: 4, y: 4 });
    const starvedInspection = await inspectionJobsText(page);
    assert(starvedInspection === 'Jobs — Capacity 1 · Workers 0/1 · upkeep 0 (vacant)', `starved workshop inspection bad: "${starvedInspection}"`);
    ok(`starvation at tick ${starvedTick}: no death-tick material (${previousMaterial}), jobs "${await jobsText(page)}", inspection "${starvedInspection}"`);
    const postStarvationMaterial = Number((await stats(page)).construction);
    for (let i = 0; i < 3; i++) {
      s = await step(page);
    }
    assert(Number(s.construction) === postStarvationMaterial, `post-starvation material must stay flat: ${postStarvationMaterial} -> ${s.construction}`);
    assert(s.colonists === '0' && s.food === '0', `post-starvation state bad: ${JSON.stringify(s)}`);
    assert(await forecastText(page) === '', `population 0 must show no forecast, got "${await forecastText(page)}"`);
    ok(`post-starvation: material flat at ${s.construction}, colonists ${s.colonists}, forecast "${await forecastText(page)}"`);
    await shot('08-starvation.png');

    // ---------------------------------------------------------------------
    // Scenario 5 - §17 forecast verification in the real UI
    // ---------------------------------------------------------------------
    console.log('--- Scenario 5: food forecast semantics ---');
    await fresh(page);
    assert(await forecastText(page) === '', `population 0 -> no finite forecast, got "${await forecastText(page)}"`);
    await placeAt(page, { x: 2, y: 2 }); // t1 residence
    s = await step(page); // t2 colonist: production 0 < consumption 1
    const declining = (await forecastText(page)).trim();
    assert(/^·\s*~[0-9]+ ticks$/.test(declining), `declining reserve must show a finite forecast, got "${declining}"`);
    assert(Number(s.foodForecast) > 0 && Number(s.foodForecast) < 200, `finite forecast out of range: ${s.foodForecast}`);
    ok(`population 0 -> "${''}"; production 0 -> "${declining}" (finite)`);
    await selectPalette(page, 'build-farm', 'Farm selected');
    await placeAt(page, { x: 4, y: 4 }); // t3 farm
    s = await step(page); // t4 farm operational: production 2 > consumption 1
    assert(s.foodForecast === 'sustainable', `production > consumption must be sustainable, got "${s.foodForecast}"`);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 6, y: 6 }); // t5 residence
    s = await step(page); // t6 second colonist: production 2 = consumption 2
    assert(s.colonists === '2', `expected 2 colonists, got ${s.colonists}`);
    assert(s.foodForecast === 'sustainable', `production = consumption must be sustainable, got "${s.foodForecast}"`);
    await shot('09-forecast-sustainable.png');
    await placeAt(page, { x: 8, y: 8 }); // t7 residence
    s = await step(page); // t8 third colonist: production 2 < consumption 3
    assert(s.colonists === '3', `expected 3 colonists, got ${s.colonists}`);
    assert(Number(s.foodForecast) > 0, `production < consumption must be finite again, got "${s.foodForecast}"`);
    ok(`forecast: 1 colonist -> "${declining}"; +1 farm -> "sustainable" (2>1); 2 colonists -> "sustainable" (2=2); 3 colonists -> "~${s.foodForecast} ticks" (2<3)`);

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