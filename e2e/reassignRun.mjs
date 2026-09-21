/* NOVA Step 10M manual workforce reassignment E2E — plain Node, playwright core only.
 *
 * Real browser proof of the manual workforce control:
 *   Residence -> colonist -> Farm (automatic) + vacant Workshop
 *   -> select the Farm -> choose the vacant Workshop -> Move worker
 *   -> manual override sticks -> Material starts flowing
 *   -> reverse move back to the Farm
 *
 * All state changes come from real palette clicks on the canvas, the real
 * inspector select + button, and the real STEP control. window.__nova is only
 * read (never mutated).
 *
 * Mode: headed by default, override NOVA_REASSIGN_MODE=headless.
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

const PORT = 4182;
const URL = `http://localhost:${PORT}/`;
const ART = 'artifacts/reassign';
const MODE = (process.env.NOVA_REASSIGN_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';

const fail = (msg) => {
  console.error(`REASSIGN E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`REASSIGN E2E PASS: ${msg}`);

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

async function moveTo(page, cell) {
  const pt = await page.evaluate((c) => window.__nova.cellToScreen(c), cell);
  if (!pt) throw new Error(`cellToScreen null for ${cell.x},${cell.y}`);
  await page.mouse.move(pt.x, pt.y);
  return pt;
}

async function placeAt(page, cell) {
  const pt = await moveTo(page, cell);
  await waitFor(async () => (await stats(page)).status.includes('ready'), `valid preview at ${cell.x},${cell.y}`);
  const before = Number((await stats(page)).buildings);
  await page.mouse.click(pt.x, pt.y);
  await waitFor(async () => Number((await stats(page)).buildings) === before + 1, `placed at ${cell.x},${cell.y}`);
}

async function placeRoad(page, cell) {
  const pt = await moveTo(page, cell);
  await page.mouse.down();
  await page.mouse.move(pt.x, pt.y, { steps: 2 });
  await waitFor(async () => (await stats(page)).status.includes('ready'), `road preview at ${cell.x},${cell.y}`);
  const before = Number((await stats(page)).roads);
  await page.mouse.up();
  await waitFor(async () => Number((await stats(page)).roads) === before + 1, `road at ${cell.x},${cell.y}`);
}

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

const workerText = (page) => page.locator('[data-testid="inspection-worker"]').textContent();

async function enabledTargets(page) {
  return page.$$eval('[data-testid="reassign-target"] option:not([disabled])', (opts) =>
    opts.map((o) => ({ value: o.value, label: o.textContent ?? '' }))
  );
}

async function disabledTargets(page) {
  return page.$$eval('[data-testid="reassign-target"] option[disabled]', (opts) =>
    opts.map((o) => ({ value: o.value, label: o.textContent ?? '' }))
  );
}

async function moveWorker(page, targetId) {
  await page.selectOption('[data-testid="reassign-target"]', targetId);
  await page.click('[data-testid="reassign-confirm"]');
  return stats(page);
}

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
    // Build: R1 (2,2) + road (3,2),(3,3) + Farm (4,2) + Workshop (4,3)
    // ---------------------------------------------------------------------
    let s = await fresh(page);
    assert(s.tick === '0' && s.construction === '100', `fresh state bad: ${JSON.stringify(s)}`);

    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 2, y: 2 });
    await step(page); // Step 10Y: 1 construction tick left
    s = await step(page);
    assert(s.colonists === '1', `expected 1 colonist, got ${s.colonists}`);

    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 3, y: 2 });
    s = await step(page);
    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 3, y: 3 });
    s = await step(page);

    // Step 10AD note: a Workshop placement now costs the one-off Water
    // construction investment, and a fresh 100-Material colony cannot fund a
    // Well plus two workplaces (4 buildings + a road = 105). The control under
    // test is unchanged — one colonist, two workplaces, a manual move and the
    // reverse move — so this suite now uses two FARMS (no Water cost) and Food
    // as the economic signal. Workshop employment/production is covered by the
    // jobs E2E and the Water cost by tests/workshopWaterConstruction.test.ts.
    await selectPalette(page, 'build-farm', 'Farm selected');
    await placeAt(page, { x: 4, y: 2 });
    await step(page); // Step 10Y: 1 construction tick left
    s = await step(page);
    assert(s.staffedFarmIds !== '', `Farm should be automatically staffed, got "${s.staffedFarmIds}"`);

    await selectPalette(page, 'build-farm', 'Farm selected');
    await placeAt(page, { x: 3, y: 1 });
    await step(page); // Step 10Y: 1 construction tick left
    s = await step(page);

    // Automatic allocation: the first (lowest-id) Farm wins; the second is vacant.
    assert(s.staffedFarmIds === 'building-2', `automatic Farm expected, got farms "${s.staffedFarmIds}"`);
    assert(s.foodForecast === 'sustainable', `one staffed Farm must sustain one colonist, got ${s.foodForecast}`);
    assert(s.manualWorkerIds === '', `no manual worker expected yet, got "${s.manualWorkerIds}"`);
    ok(`automatic allocation: farms "${s.staffedFarmIds}", food ${s.food}, material ${s.construction}`);
    await shot('01-automatic.png');

    // ---------------------------------------------------------------------
    // Manual reassignment through the real inspector control
    // ---------------------------------------------------------------------
    await selectAt(page, { x: 4, y: 2 });
    assert((await workerText(page)) === 'Worker — automatic assignment', `worker line bad: "${await workerText(page)}"`);
    const disabled = await disabledTargets(page);
    assert(disabled.some((o) => o.label.includes('current')), `current workplace must be disabled: ${JSON.stringify(disabled)}`);
    const targets = await enabledTargets(page);
    assert(targets.length === 1, `exactly one eligible Farm expected, got ${JSON.stringify(targets)}`);
    const secondFarmId = targets[0].value;
    assert(targets[0].label.includes('Farm') && targets[0].label.includes('workers 0/1'), `target label bad: "${targets[0].label}"`);
    ok(`inspector options: current disabled "${disabled[0].label}", eligible "${targets[0].label}"`);
    await shot('02-options.png');

    s = await moveWorker(page, secondFarmId);
    assert(s.manualWorkerIds === 'colonist-1', `manual override expected, got "${s.manualWorkerIds}"`);
    assert(s.staffedFarmIds === secondFarmId, `second Farm should now be staffed, got "${s.staffedFarmIds}"`);
    assert(s.status.includes('manual override'), `reassignment feedback missing: ${JSON.stringify(s.status)}`);
    ok(`manual move: farms "${s.staffedFarmIds}", status "${s.status}"`);
    await shot('03-manual.png');

    // Sticky across ticks + Food now flows from the newly staffed Farm.
    const foodAtMove = Number(s.food);
    for (let i = 0; i < 4; i += 1) {
      s = await step(page);
    }
    assert(s.manualWorkerIds === 'colonist-1', `manual override must stick, got "${s.manualWorkerIds}"`);
    assert(s.staffedFarmIds === secondFarmId, `manual Farm must stay staffed, got "${s.staffedFarmIds}"`);
    assert(s.foodForecast === 'sustainable', `the manual Farm must sustain the colony, got ${s.foodForecast}`);
    assert(Number(s.food) >= foodAtMove, `Food must not fall after the manual move: ${foodAtMove} -> ${s.food}`);
    ok(`sticky manual: food ${foodAtMove} -> ${s.food}, farms "${s.staffedFarmIds}", manual "${s.manualWorkerIds}"`);
    await shot('04-food-recovery.png');

    // ---------------------------------------------------------------------
    // Reverse move through the same control
    // ---------------------------------------------------------------------
    await selectAt(page, { x: 3, y: 1 });
    assert((await workerText(page)) === 'Worker — manual override', `manual worker line bad: "${await workerText(page)}"`);
    const reverseTargets = await enabledTargets(page);
    assert(reverseTargets.length === 1, `exactly one eligible Farm expected, got ${JSON.stringify(reverseTargets)}`);
    assert(reverseTargets[0].value === 'building-2', `reverse target should be the first Farm, got "${reverseTargets[0].value}"`);
    s = await moveWorker(page, reverseTargets[0].value);
    assert(s.staffedFarmIds === 'building-2', `reverse move must staff the first Farm, got "${s.staffedFarmIds}"`);
    assert(s.manualWorkerIds === 'colonist-1', `reverse move must still be manual, got "${s.manualWorkerIds}"`);
    ok(`reverse move: farms "${s.staffedFarmIds}", manual "${s.manualWorkerIds}"`);
    await shot('05-reverse.png');

    const realErrors = errors.filter((e) => !e.includes('favicon'));
    if (realErrors.length > 0) fail(`browser errors: ${realErrors.join(' | ')}`);
    else ok('zero console/page errors');
  } catch (e) {
    if (!process.exitCode) {
      console.error(`REASSIGN E2E FAIL: ${e.message}`);
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('REASSIGN E2E RESULT: FAIL');
  else console.log('REASSIGN E2E RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`REASSIGN E2E FAIL: ${e.message}`);
  process.exitCode = 1;
});
