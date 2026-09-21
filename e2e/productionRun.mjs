/* NOVA Step 06B production E2E — re-baselined for Step 10E (farm employment).
 * Plain Node, playwright core only.
 *
 * Real browser causal proof of the worker-gated Food chain:
 *   Residence -> Colonist -> Road (mobility) -> Farm -> Employment
 *   -> Food production -> colony sustained.
 *
 * Step 10E changed the rule this suite proved: an operational Farm used to
 * produce +2 Food/tick UNCONDITIONALLY. A Farm now produces only while a
 * colonist is employed there, and Farm employment is mobility-gated (09K),
 * so the proof needs a road connecting the residence to the farm. The
 * scenario below adds that step and proves both directions:
 *   - a road-connected, staffed farm feeds its colonist (+1 food/tick);
 *   - the same farm feeds TWO colonists with net 0 food/tick (1 farm = 2 people).
 * Also covers Part A UX: arrival/consumption messages, forecast, farm button.
 * Screenshots: artifacts/production/01..05.
 * Mode: headed by default, override NOVA_PRODUCTION_MODE=headless.
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

const PORT = 4179;
const URL = `http://localhost:${PORT}/`;
const ART = 'artifacts/production';
const MODE = (process.env.NOVA_PRODUCTION_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';
const ROAD_COST = 5;

const fail = (msg) => {
  console.error(`PRODUCTION E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`PRODUCTION E2E PASS: ${msg}`);

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
const num = (s, key) => Number(s[key]);

async function pointAt(page, cell) {
  const pt = await page.evaluate((c) => window.__nova.cellToScreen(c), cell);
  if (!pt) throw new Error(`cellToScreen null for ${cell.x},${cell.y}`);
  await page.mouse.move(pt.x, pt.y);
  return pt;
}

/** Real canvas click placing the currently selected tool.
 *
 * Step 10AO: the hover status is written by the canvas pointermove, and in
 * HEADED mode a stray OS-level pointermove can overwrite it before the read,
 * which made this suite flake ("timeout: valid preview at 6,1"). The hover is
 * therefore retried; the placement gate itself is unchanged (the UI `ready`
 * status still comes from the shared affordability predicate).
 */
async function clickCell(page, cell) {
  const pt = await pointAt(page, cell);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await waitFor(
        async () => (await stats(page)).status.includes('ready'),
        `valid preview at ${cell.x},${cell.y}`,
        1000
      );
      break;
    } catch {
      await page.mouse.move(pt.x, pt.y - 2);
      await page.mouse.move(pt.x, pt.y);
    }
  }
  await waitFor(async () => (await stats(page)).status.includes('ready'), `valid preview at ${cell.x},${cell.y}`);
  await page.mouse.click(pt.x, pt.y);
}

async function selectPalette(page, testid, expectedLabel) {
  await page.click(`[data-testid="${testid}"]`);
  const s = await stats(page);
  if (!s.status.includes(expectedLabel)) {
    fail(`palette feedback missing for ${testid}: ${JSON.stringify(s.status)}`);
  }
  const pressed = await page.getAttribute(`[data-testid="${testid}"]`, 'aria-pressed');
  if (pressed !== 'true') fail(`${testid} not aria-pressed: ${pressed}`);
  return s;
}

/** Single-cell road through the real road gesture (09H click path). */
async function placeRoad(page, cell) {
  const pt = await pointAt(page, cell);
  await page.mouse.down();
  await page.mouse.move(pt.x, pt.y, { steps: 2 });
  await waitFor(async () => (await stats(page)).status.includes('ready'), `road preview ${cell.x},${cell.y}`);
  const before = await stats(page);
  await page.mouse.up();
  await waitFor(async () => num(await stats(page), 'roads') > num(before, 'roads'), `road committed at ${cell.x},${cell.y}`);
}

async function step(page) {
  await page.click('[data-testid="simulation-step"]');
}

async function stepToTick(page, target) {
  const before = Number((await stats(page)).tick);
  if (before >= target) throw new Error(`already past tick ${target} (at ${before})`);
  for (let t = before; t < target; t++) {
    const expectTick = t + 1;
    await step(page);
    await waitFor(async () => Number((await stats(page)).tick) === expectTick, `tick ${expectTick}`);
  }
}

async function main() {
  mkdirSync(ART, { recursive: true });
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
    browser = await chromium.launch({ headless: HEADLESS });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('console', (m) => {
      // Match the other eleven suites: the browser's automatic /favicon.ico
      // request 404s and is already excluded from the http-status check below.
      if (m.type() === 'error' && !m.text().includes('Failed to load resource')) {
        errors.push(`console: ${m.text()}`);
      }
    });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('response', (r) => {
      if (r.status() >= 400 && !/\/favicon\.ico$/i.test(r.url())) {
        errors.push(`http ${r.status()}: ${r.url()}`);
      }
    });

    const shot = (name) => page.screenshot({ path: `${ART}/${name}` });

    // A. Initial state.
    await page.goto(URL, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
    ok('load, app ready');
    let s = await stats(page);
    if (s.tick !== '0' || s.food !== '100' || s.construction !== '100' || s.colonists !== '0' || s.farms !== '0') {
      fail(`initial stats bad: ${JSON.stringify(s)}`);
    } else ok(`initial stock: food ${s.food}, material ${s.construction}, colonists ${s.colonists}, farms ${s.farms}`);
    await shot('01-initial.png');

    // B. Residence at (3,1) (tick 1). Residence is the default tool.
    await clickCell(page, { x: 3, y: 1 });
    await waitFor(async () => (await stats(page)).buildings === '1', 'residence placed');
    ok('residence placed (material 100 -> 75)');

    // C. Road at (3,2) (tick 2) — the mobility link under the 09K contract.
    await selectPalette(page, 'build-road', 'Road selected');
    const roadLabel = await page.textContent('[data-testid="build-road"]');
    if (!roadLabel.includes(String(ROAD_COST))) fail(`road label missing cost: ${roadLabel}`);
    await placeRoad(page, { x: 3, y: 2 });
    s = await stats(page);
    if (num(s, 'roads') !== 1) fail(`expected 1 road, got ${JSON.stringify(s)}`);
    ok(`road placed at 3,2 (cost ${ROAD_COST}), roads ${s.roads}`);

    // D. Farm at (3,3) (tick 3), adjacent to the same road cell.
    await selectPalette(page, 'build-farm', 'Farm selected');
    await clickCell(page, { x: 3, y: 3 });
    await waitFor(async () => (await stats(page)).buildings === '2', 'farm placed');
    s = await stats(page);
    if (s.construction !== '45' || s.farms !== '1') {
      fail(`after placements expected material 45 / farms 1, got ${JSON.stringify(s)}`);
    } else ok(`material 100 -> 45 (residence 25 + road 5 + farm 25), farms ${s.farms}`);
    await shot('02-placed.png');

    // E. STEP until the farm is operational AND staffed. Under the 10E timing
    //    contract (produceFood before assignJobs) a farm operational on tick T
    //    is staffed at the end of tick T and produces from tick T+1.
    await stepToTick(page, 8);
    s = await stats(page);
    if (s.colonists !== '1') fail(`expected 1 colonist, got ${JSON.stringify(s)}`);
    if (s.farmIds === '' || s.staffedFarmIds === '') {
      fail(`farm must be staffed once road-connected: ${JSON.stringify(s)}`);
    }
    if (s.jobs !== '1 / 1' || s.employed !== '1') {
      fail(`expected the farm job filled, jobs ${s.jobs} employed ${s.employed}`);
    }
    ok(`farm staffed (${s.staffedFarmIds}), jobs "${s.jobs}", vacant farms ${s.vacantOperationalFarms}`);
    if (s.status.includes('vacant')) fail(`farm UI still says vacant: ${JSON.stringify(s.status)}`);
    if (s.foodStatus !== 'fed') fail(`foodStatus expected 'fed', got ${s.foodStatus}`);
    if (s.foodForecast === '') fail('forecast empty while colony alive');
    ok(`foodStatus fed, UI: "${s.status}" forecast ~${s.foodForecast} ticks`);
    await shot('03-producing.png');

    // F. Sustained loop at 1 colonist: every tick net food delta is exactly
    //    +1 (1 staffed farm x +2 production, 1 colonist x -1 consumption).
    let prev = Number(s.food);
    for (let i = 0; i < 6; i++) {
      const tickBefore = Number((await stats(page)).tick);
      await step(page);
      await waitFor(async () => Number((await stats(page)).tick) === tickBefore + 1, `sustain tick ${i + 1}`);
      s = await stats(page);
      const delta = Number(s.food) - prev;
      if (delta !== 1 || s.colonists !== '1' || s.foodStatus !== 'fed' || s.staffedFarmIds === '') {
        fail(`sustain tick ${i + 1}: expected delta +1 / 1 colonist / staffed farm / fed, got delta ${delta}, ${JSON.stringify(s)}`);
      }
      prev = Number(s.food);
    }
    ok(`sustained 6 ticks at net +1 food/tick with 1 staffed farm, food now ${s.food}`);
    await shot('04-sustained.png');

    // G. Step 10E economics: add a second residence. It admits a second
    //    colonist (admission is not road-gated) who cannot work the single
    //    farm, so the colony runs at net 0 food/tick — one farm exactly
    //    feeds two people. This is the observable labour/production contract.
    await selectPalette(page, 'build-residence', 'Residence selected');
    await clickCell(page, { x: 6, y: 1 });
    await waitFor(async () => (await stats(page)).buildings === '3', 'second residence placed');
    await stepToTick(page, Number((await stats(page)).tick) + 4);
    s = await stats(page);
    if (s.colonists !== '2') fail(`expected 2 colonists, got ${JSON.stringify(s)}`);
    if (s.jobs !== '1 / 1' || s.unemployed !== '1') {
      fail(`expected 1 employed + 1 unemployed, got jobs ${s.jobs} unemployed ${s.unemployed}`);
    }
    prev = Number(s.food);
    for (let i = 0; i < 10; i++) {
      const tickBefore = Number((await stats(page)).tick);
      await step(page);
      await waitFor(async () => Number((await stats(page)).tick) === tickBefore + 1, `break-even tick ${i + 1}`);
      s = await stats(page);
      const delta = Number(s.food) - prev;
      if (delta !== 0 || s.colonists !== '2' || s.foodStatus !== 'fed') {
        fail(`break-even tick ${i + 1}: expected delta 0 / 2 colonists / fed, got delta ${delta}, ${JSON.stringify(s)}`);
      }
      prev = Number(s.food);
    }
    ok(`2 colonists, 1 staffed farm: net 0 food/tick for 10 ticks, food stable at ${s.food}`);
    await shot('05-break-even.png');

    // H. PLAY: the colony keeps running under continuous ticks (no starvation).
    await page.click('[data-testid="simulation-play"]');
    await new Promise((r) => setTimeout(r, 1500));
    await page.click('[data-testid="simulation-pause"]');
    s = await stats(page);
    if (s.colonists !== '2' || s.foodStatus !== 'fed') {
      fail(`PLAY regression: ${JSON.stringify(s)}`);
    } else ok(`PLAY thriving: food ${s.food}, colonists ${s.colonists}, status "${s.status}"`);

    const realErrors = errors.filter((e) => !e.includes('favicon'));
    if (realErrors.length > 0) fail(`browser errors: ${realErrors.join(' | ')}`);
    else ok('zero console/page errors');
  } catch (e) {
    if (!process.exitCode) {
      console.error(`PRODUCTION E2E FAIL: ${e.message}`);
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('PRODUCTION E2E RESULT: FAIL');
  else console.log('PRODUCTION E2E RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`PRODUCTION E2E FAIL: ${e.message}`);
  process.exitCode = 1;
});
