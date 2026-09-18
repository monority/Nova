/* NOVA Step 08C upkeep E2E. Plain Node, playwright core only.
 * Real browser causal proof of operational upkeep:
 *   1 worker -> +2 production, 1 upkeep, net +1/tick
 *   2 workers -> +4 production, 2 upkeep, net +2/tick
 *   vacant/non-workshops pay 0, deficit clamps without deactivation,
 *   recovery refills to affordable construction.
 * All state changes come from real palette clicks on the canvas and real
 * STEP controls. window.__nova is only read (never mutated); causal texts
 * are asserted on the real DOM. Screenshots: artifacts/upkeep/01..06.
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

/** STEP until a predicate on stats holds (construction needs ticks). */
async function stepUntil(page, pred, label, maxTicks = 30) {
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

    // A. Fresh: no operational Workshop, upkeep 0.
    await page.goto(URL, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
    ok('load, app ready');
    let s = await stats(page);
    if (s.tick !== '0' || s.construction !== '100' || s.materialUpkeep !== '0' || s.netMaterial !== '0') {
      fail(`A fresh bad: ${JSON.stringify(s)}`);
    } else ok(`A fresh: material 100, upkeep ${s.materialUpkeep}, net ${s.netMaterial}`);
    await shot('01-fresh.png');

    // B. Workshop first: operational but vacant -> upkeep 0, no leak.
    // Note: canvas placement dispatches through a simulation tick, so the
    // Workshop is under construction at tick 1 and operational at tick 2.
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 4, y: 4 });
    s = await step(page); // t2: operational, vacant
    if (s.materialUpkeep !== '0' || s.netMaterial !== '0' || s.construction !== '75' || s.tick !== '2') {
      fail(`B vacant bad: ${JSON.stringify(s)}`);
    } else ok(`B vacant workshop: upkeep 0, net 0, material ${s.construction} (no leak)`);
    await selectAt(page, { x: 4, y: 4 });
    const vacantInspection = await inspectionText(page);
    if (!vacantInspection.includes('upkeep 0 (vacant)')) {
      fail(`B inspection missing vacant upkeep: ${JSON.stringify(vacantInspection)}`);
    } else ok(`B inspection: "${vacantInspection}"`);
    await shot('02-vacant.png');

    // C. Residence -> colonist staffs the Workshop: upkeep 1, net +1.
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 6, y: 6 });
    s = await step(page); // t4: residence operational, colonist-1 staffed same tick
    if (s.colonists !== '1' || s.materialUpkeep !== '1' || s.netMaterial !== '1') {
      fail(`C staffed bad: ${JSON.stringify(s)}`);
    } else ok(`C 1 worker: upkeep ${s.materialUpkeep}, net +${s.netMaterial}`);
    s = await step(page); // t5: no newcomer, production/upkeep readout visible
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

    // C-sustain: exactly +1/tick over 10 ticks (production 2 - upkeep 1).
    let prev = Number((await stats(page)).construction);
    for (let i = 0; i < 10; i++) {
      s = await step(page);
      const delta = Number(s.construction) - prev;
      if (delta !== 1 || s.materialUpkeep !== '1' || Number(s.construction) < 0) {
        fail(`C sustain tick ${i + 1}: delta ${delta}, ${JSON.stringify(s)}`);
      }
      prev = Number(s.construction);
    }
    ok(`C sustained 10 ticks at net +1/tick, material now ${prev}`);

    // D. Second residence + workshop: 2 workers, upkeep 2, net +2.
    await selectPalette(page, 'build-residence', 'Residence selected');
    await refill(page);
    await placeAt(page, { x: 8, y: 8 });
    s = await stepUntil(page, (v) => v.colonists === '2', 'second colonist');
    ok('D second colonist admitted');
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await refill(page);
    await placeAt(page, { x: 2, y: 2 });
    s = await stepUntil(page, (v) => v.materialUpkeep === '2', 'two staffed workshops');
    s = await stats(page);
    if (s.materialProduction !== '4' || s.netMaterial !== '2') {
      fail(`D flows bad: ${JSON.stringify(s)}`);
    } else ok(`D 2 workers: production ${s.materialProduction}, upkeep ${s.materialUpkeep}, net +${s.netMaterial}`);
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

    // E/F. Drain below cost with real builds, then recover to affordable.
    const farmCells = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 10, y: 10 }, { x: 10, y: 9 }, { x: 10, y: 8 }, { x: 9, y: 10 }];
    await selectPalette(page, 'build-farm', 'Farm selected');
    let fi = 0;
    for (;;) {
      s = await stats(page);
      if (Number(s.construction) < 25) break;
      if (fi >= farmCells.length) throw new Error('out of drain cells');
      await placeAt(page, farmCells[fi]);
      fi += 1;
      s = await stats(page);
      if (Number(s.construction) < 0) fail(`E negative material after build: ${JSON.stringify(s)}`);
    }
    s = await stats(page);
    if (Number(s.construction) >= 25 || Number(s.construction) < 0) {
      fail(`E drain bad: ${JSON.stringify(s)}`);
    } else ok(`E drained below cost: material ${s.construction}, upkeep ${s.materialUpkeep} (never negative)`);
    await shot('05-drained.png');
    // Rejected build shows the real cost feedback, stock untouched.
    const drainedStock = s.construction;
    const drainedBuildings = s.buildings;
    await moveTo(page, { x: 5, y: 5 });
    const pt = await page.evaluate((c) => window.__nova.cellToScreen(c), { x: 5, y: 5 });
    await page.mouse.click(pt.x, pt.y);
    await new Promise((r) => setTimeout(r, 300));
    s = await stats(page);
    if (s.buildings !== drainedBuildings || s.construction !== drainedStock) {
      fail(`E rejection changed state: ${JSON.stringify(s)}`);
    } else ok(`E rejected build keeps stock ${s.construction}, status "${s.status}"`);
    // F. Recovery: net +2/tick refills until construction is possible again.
    await refill(page, 60);
    s = await stats(page);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 5, y: 5 });
    s = await stats(page);
    if (Number(s.construction) < 0) fail(`F negative after recovery build: ${JSON.stringify(s)}`);
    else ok(`F recovery: rebuilt at material ${s.construction}, upkeep ${s.materialUpkeep}`);
    await shot('06-recovered.png');

    // G. Zero workers: fresh reload, idle ticks leak nothing, upkeep 0.
    await page.goto(URL, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
    await step(page);
    await step(page);
    await step(page);
    s = await stats(page);
    if (s.construction !== '100' || s.materialUpkeep !== '0' || s.netMaterial !== '0') {
      fail(`G idle bad: ${JSON.stringify(s)}`);
    } else ok(`G idle 3 ticks: material still 100, upkeep 0`);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 6, y: 6 });
    await step(page);
    await step(page);
    s = await stats(page);
    if (s.colonists !== '1') fail(`G admission bad: ${JSON.stringify(s)}`);
    else ok(`G admission still works after idle: colonists ${s.colonists}`);

    // H. Starvation: 4 residences, no farm -> population hits zero.
    // Expected: workers 0, upkeep 0, material frozen, no failure state.
    await page.goto(URL, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
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
