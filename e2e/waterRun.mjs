/* NOVA Step 10P Water service E2E — plain Node, playwright core only.
 *
 * Real browser proof of the Water service loop:
 *   Residence -> colonist (bootstrap, no Well yet)
 *   -> Well (operational, roadless) activates the Water admission gate
 *   -> a second Residences is unserved -> admission blocked
 *   -> connect the Well -> service restored -> Water produced -> admission resumes
 *
 * All state changes come from real palette clicks on the canvas and the real
 * STEP control. window.__nova is only read (never mutated).
 *
 * Mode: headed by default, override NOVA_WATER_MODE=headless.
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
const ART = 'artifacts/water';
const MODE = (process.env.NOVA_WATER_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';

const fail = (msg) => {
  console.error(`WATER E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`WATER E2E PASS: ${msg}`);

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

const inspectionHousingText = (page) =>
  page.locator('[data-testid="inspection-housing"]').textContent();
const waterText = (page) => page.locator('[data-testid="stat-water"]').textContent();
/* Step 10AR: the precise Water supply state and its HUD vocabulary. */
const waterStatusText = (page) =>
  page.locator('[data-testid="stat-water-status"]').textContent();

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
    // 1 — Bootstrap: no Well yet, the historical Food + housing gate admits.
    // ---------------------------------------------------------------------
    let s = await fresh(page);
    assert(s.tick === '0' && s.construction === '100', `fresh state bad: ${JSON.stringify(s)}`);
    assert(s.water === '0', `fresh water must be 0, got ${s.water}`);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 2, y: 2 });
    await step(page); // Step 10Y: 1 construction tick left
    s = await step(page);
    assert(s.colonists === '1', `bootstrap colonist expected, got ${s.colonists}`);
    assert(s.hasOperationalWell === 'false', `no Well expected yet, got ${s.hasOperationalWell}`);
    // Step 10AR: no operational Well -> the gate is inactive and the HUD says
    // nothing about supply (there is nothing to supply yet).
    assert(s.waterSupply === 'inactive', `supply expected inactive, got ${s.waterSupply}`);
    assert((await waterStatusText(page)) === '', `HUD must stay silent with no Well, got "${await waterStatusText(page)}"`);
    ok(`bootstrap: 1 colonist admitted without Water (no Well exists), water ${s.water}, supply "${s.waterSupply}"`);

    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 3, y: 2 });
    s = await step(page);

    // ---------------------------------------------------------------------
    // 2 — A roadless Well activates the gate but serves nothing.
    // ---------------------------------------------------------------------
    await selectPalette(page, 'build-well', 'Well selected');
    await placeAt(page, { x: 5, y: 2 }); // roadless for now
    await step(page); // Step 10Y: 1 construction tick left
    s = await step(page); // operational
    assert(s.hasOperationalWell === 'true', `Well should be operational, got ${s.hasOperationalWell}`);
    assert(s.waterServedResidences === '0', `roadless Well must serve nothing, got ${s.waterServedResidences}`);
    // Step 10AR: a Well that serves nothing is "no service", not "shortage".
    assert(s.waterSupply === 'noService', `supply expected noService, got ${s.waterSupply}`);
    assert((await waterStatusText(page)).includes('no service'), `HUD expected "no service", got "${await waterStatusText(page)}"`);
    // Add a second Residence on the main network (no Well on it yet).
    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 3, y: 3 });
    s = await step(page);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 2, y: 3 });
    s = await step(page); // Step 10Y: 1 construction tick left
    s = await step(page);
    s = await step(page);
    assert(s.colonists === '1', `unserved Residence must block admission, got ${s.colonists}`);
    assert(s.status.includes('No water service'), `admission block feedback missing: ${JSON.stringify(s.status)}`);
    // Step 10AR: the Residence inspector names WHICH residence is unserved.
    await selectAt(page, { x: 2, y: 3 });
    const unservedResidence = await inspectionHousingText(page);
    assert(
      unservedResidence.includes('Water: not served'),
      `unserved Residence inspection bad: "${unservedResidence}"`
    );
    ok(`unserved Residence inspection: "${unservedResidence}"`);
    ok(`roadless Well: waterServedResidences ${s.waterServedResidences}, population stays ${s.colonists} ("${s.status}")`);
    await shot('01-blocked.png');

    // ---------------------------------------------------------------------
    // 3 — Connect the Well: service restored, Water produced, admission resumes.
    // ---------------------------------------------------------------------
    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 4, y: 2 }); // adjacent to the Well and to (3,2)
    s = await step(page);
    assert(s.roads !== '0', `connection road expected, got ${s.roads}`);
    // The colonist staffs the Well; Water then flows.
    for (let i = 0; i < 6; i += 1) s = await step(page);
    assert(s.hasOperationalWell === 'true', `Well operational expected, got ${s.hasOperationalWell}`);
    assert(Number(s.water) > 0, `Water production expected, got ${s.water}`);
    assert(s.colonists === '2', `admission should resume after service, got ${s.colonists}`);
    // Step 10AR: service is restored and the flow is balanced (production 2 ==
    // need 2), but nothing is STORED yet: that is `noReserve`, NOT `shortage`.
    // The HUD names the cause instead of crying shortage on a balanced colony.
    assert(s.waterSupply === 'noReserve', `supply expected noReserve, got ${s.waterSupply}`);
    assert(
      (await waterStatusText(page)).includes('reserve 0'),
      `HUD expected "reserve 0", got "${await waterStatusText(page)}"`
    );
    const servedResidence = await (async () => {
      await selectAt(page, { x: 2, y: 3 });
      return inspectionHousingText(page);
    })();
    assert(
      servedResidence.includes('Water: served'),
      `served Residence inspection bad: "${servedResidence}"`
    );
    ok(`connected Well: water ${s.water}, production ${s.waterProduction}, population ${s.colonists}, supply "${s.waterSupply}"`);
    ok(`served Residence inspection: "${servedResidence}"`);
    await shot('02-water-flowing.png');

    // ---------------------------------------------------------------------
    // 4 — Well inspection explains the cause.
    // ---------------------------------------------------------------------
    const well = await selectAt(page, { x: 5, y: 2 });
    assert(well?.type === 'well', `Well selection expected, got ${JSON.stringify(well)}`);
    const wellInspection = await inspectionHousingText(page);
    assert(
      wellInspection === 'Water production — producing +2/tick (staffed)',
      `Well inspection bad: "${wellInspection}"`
    );
    ok(`Well inspection: "${wellInspection}"`);
    await shot('03-well-inspection.png');

    // HUD shows the Water stock.
    assert(Number(await waterText(page)) > 0, `HUD Water must be positive, got ${await waterText(page)}`);
    ok(`HUD Water stock: ${await waterText(page)}`);

    const realErrors = errors.filter((e) => !e.includes('favicon'));
    if (realErrors.length > 0) fail(`browser errors: ${realErrors.join(' | ')}`);
    else ok('zero console/page errors');
  } catch (e) {
    if (!process.exitCode) {
      console.error(`WATER E2E FAIL: ${e.message}`);
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('WATER E2E RESULT: FAIL');
  else console.log('WATER E2E RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`WATER E2E FAIL: ${e.message}`);
  process.exitCode = 1;
});
