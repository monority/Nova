/* NOVA Step 09H road construction E2E. Plain Node, playwright core only.
 * Real browser proof of the complete causal loop introduced across Phase 9:
 *
 *   Residence -> Colonist -> Workshop -> roadless production blocked
 *     -> player constructs roads (Road palette tool, real canvas drag)
 *     -> roads under construction -> operational
 *     -> building road access -> production resumes
 *
 * All state changes come from real palette clicks and real canvas pointer
 * gestures; window.__nova is only read (never mutated). Material deltas are
 * asserted against the authoritative stat surface (road cost 5/cell + the
 * unchanged Workshop upkeep), and the derived 09G mobility relation is
 * checked to stay informational.
 * Screenshots: artifacts/road/01..04.
 * Mode: headed by default, override NOVA_ROAD_MODE=headless.
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
const ART = 'artifacts/road';
const MODE = (process.env.NOVA_ROAD_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';
const ROAD_COST = 5;

const fail = (msg) => {
  console.error(`ROAD E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`ROAD E2E PASS: ${msg}`);

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
const num = (s, key) => Number(s[key]);

async function step(page) {
  const before = num(await stats(page), 'tick');
  await page.click('[data-testid="simulation-step"]');
  await waitFor(async () => num(await stats(page), 'tick') === before + 1, `tick ${before + 1}`);
  return stats(page);
}

async function stepUntil(page, pred, label, maxTicks = 30) {
  for (let i = 0; i < maxTicks; i++) {
    const s = await stats(page);
    if (pred(s)) return s;
    await step(page);
  }
  throw new Error(`timeout: ${label}`);
}

async function pointAt(page, cell) {
  const pt = await page.evaluate((c) => window.__nova.cellToScreen(c), cell);
  if (!pt) throw new Error(`cellToScreen null for ${cell.x},${cell.y}`);
  await page.mouse.move(pt.x, pt.y);
  return pt;
}

async function selectPalette(page, testid, expectedLabel) {
  await page.click(`[data-testid="${testid}"]`);
  const s = await stats(page);
  if (!s.status.includes(expectedLabel)) {
    throw new Error(`palette feedback missing for ${testid}: ${JSON.stringify(s.status)}`);
  }
  const pressed = await page.getAttribute(`[data-testid="${testid}"]`, 'aria-pressed');
  if (pressed !== 'true') throw new Error(`${testid} not aria-pressed: ${pressed}`);
  return s;
}

/** Real canvas click placing the selected building tool. */
async function placeBuilding(page, cell) {
  const pt = await pointAt(page, cell);
  await waitFor(async () => (await stats(page)).status.includes('ready'), `valid preview at ${cell.x},${cell.y}`);
  const before = num(await stats(page), 'buildings');
  await page.mouse.click(pt.x, pt.y);
  await waitFor(async () => num(await stats(page), 'buildings') === before + 1, `placed at ${cell.x},${cell.y}`);
}

/** Real canvas drag placing the road gesture start -> end. */
async function dragRoads(page, start, end) {
  const from = await pointAt(page, start);
  await page.mouse.down();
  const to = await page.evaluate((c) => window.__nova.cellToScreen(c), end);
  if (!to) throw new Error(`cellToScreen null for ${end.x},${end.y}`);
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await waitFor(async () => (await stats(page)).status.includes('ready'), `road drag preview ${start.x},${start.y}->${end.x},${end.y}`);
  const before = await stats(page);
  await page.mouse.up();
  await waitFor(async () => num(await stats(page), 'roads') > num(before, 'roads'), `road gesture committed`);
  return { before, after: await stats(page) };
}

async function main() {
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

    // A. Clean deterministic start; the Road tool is player-selectable.
    await page.goto(URL, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
    let s = await stats(page);
    if (s.tick !== '0' || s.roads !== '0' || s.operationalRoads !== '0' || s.construction !== '100') {
      fail(`fresh state bad: ${JSON.stringify(s)}`);
    } else ok(`A fresh: tick 0, roads 0, material ${s.construction}`);
    await selectPalette(page, 'build-road', 'Road selected');
    const roadLabel = await page.textContent('[data-testid="build-road"]');
    if (!roadLabel.includes(String(ROAD_COST))) fail(`road label missing cost: ${roadLabel}`);
    else ok(`A road tool selected, label "${roadLabel.trim()}"`);

    // B. Preview: valid empty cell vs a building cell (authoritative reasons).
    await pointAt(page, { x: 5, y: 3 });
    s = await stats(page);
    if (!s.status.includes('ready') || !s.status.includes(`material ${ROAD_COST}`)) {
      fail(`B road preview bad: ${JSON.stringify(s.status)}`);
    } else ok(`B valid preview: ${s.status}`);
    await shot('01-road-preview.png');

    // C. Mobility-blocked baseline: Residence -> Colonist -> roadless Workshop.
    //   09K: without an operational road network linking the two buildings the
    //   colonist is not employed at all (no worker -> no production -> no upkeep).
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeBuilding(page, { x: 3, y: 3 });
    await stepUntil(page, (v) => v.colonists === '1', 'first colonist');
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeBuilding(page, { x: 6, y: 6 });
    s = await stepUntil(
      page,
      (v) => v.workshops === '1' && v.employed === '0' && v.materialProduction === '0',
      'roadless workshop idle'
    );
    if (s.buildingsWithRoadAccess !== '0' || s.materialUpkeep !== '0') {
      fail(`C roadless workshop must be idle: ${JSON.stringify(s)}`);
    } else {
      ok(`C roadless Workshop (09K): worker ${s.employed}, production ${s.materialProduction}, upkeep ${s.materialUpkeep}`);
    }
    await shot('02-roadless-production-blocked.png');

    // D. Invalid gestures never spend Material: building cell + diagonal drag.
    // Re-select the Road tool (step C left the Workshop tool active).
    await selectPalette(page, 'build-road', 'Road selected');
    const beforeInvalid = await stats(page);
    const buildingCell = await pointAt(page, { x: 6, y: 6 });
    s = await stats(page);
    if (!s.status.includes('occupied by building')) fail(`D building cell preview bad: ${JSON.stringify(s.status)}`);
    await page.mouse.click(buildingCell.x, buildingCell.y);
    s = await stats(page);
    if (num(s, 'roads') !== num(beforeInvalid, 'roads')) fail(`D click on building added a road: ${JSON.stringify(s)}`);
    else ok('D building cell rejected, no road, no Material spent');

    await pointAt(page, { x: 8, y: 8 });
    await page.mouse.down();
    await pointAt(page, { x: 9, y: 9 });
    s = await stats(page);
    if (!s.status.includes('diagonal drag not supported')) fail(`D diagonal drag feedback bad: ${JSON.stringify(s.status)}`);
    await page.mouse.up();
    s = await stats(page);
    if (num(s, 'roads') !== num(beforeInvalid, 'roads')) fail(`D diagonal drag added roads: ${JSON.stringify(s)}`);
    else ok('D diagonal drag rejected by the existing 09C geometry rule');

    // E. Player constructs the Workshop-side road: vertical drag (5,3)->(5,6)
    //    gives the Workshop access. The Residence is still unconnected, so
    //    under 09K this ALONE does not produce a worker.
    const drag = await dragRoads(page, { x: 5, y: 3 }, { x: 5, y: 6 });
    const upkeep = num(drag.before, 'materialUpkeep');
    const expected = num(drag.before, 'construction') - 4 * ROAD_COST - upkeep;
    if (num(drag.after, 'construction') !== expected) {
      fail(`E road material cost wrong: ${JSON.stringify({ expected, got: drag.after.construction })}`);
    } else {
      ok(`E 4-cell drag placed: material ${drag.before.construction} -> ${drag.after.construction} (4 x ${ROAD_COST} + upkeep ${upkeep})`);
    }
    if (drag.after.roads !== '4' || drag.after.operationalRoads !== '0') {
      fail(`E roads must start under construction: ${JSON.stringify(drag.after)}`);
    } else ok(`E construction state visible: ${drag.after.roads} roads, ${drag.after.operationalRoads} operational`);
    await shot('03-roads-under-construction.png');

    // F. Advancing completes the roads. The Workshop now has road access,
    //    but the Residence still does not, so 09K keeps the colonist
    //    unemployed and production stays 0.
    s = await step(page);
    if (s.operationalRoads !== '4') fail(`F roads not operational: ${JSON.stringify(s)}`);
    if (s.buildingsWithRoadAccess !== '1') fail(`F Workshop has no road access: ${JSON.stringify(s)}`);
    if (s.employed !== '0' || s.materialProduction !== '0') {
      fail(`F unconnected Residence must not employ: ${JSON.stringify(s)}`);
    } else {
      ok(`F roads operational: Workshop access true, Residence unconnected -> worker ${s.employed}, production ${s.materialProduction}`);
    }

    // G. Single-cell placement closes the network to the Residence:
    //    Residence(3,3) <- (4,3) <- (5,3) ... -> (5,6) -> Workshop(6,6).
    const single = await dragRoads(page, { x: 4, y: 3 }, { x: 4, y: 3 });
    if (num(single.after, 'roads') !== 5) fail(`G single-cell placement failed: ${JSON.stringify(single.after)}`);
    else ok('G single-cell road placed via the same command path');
    s = await step(page);
    if (s.operationalRoads !== '5') fail(`G roads not operational: ${JSON.stringify(s)}`);
    if (s.mobilityConnectedColonists !== '1') {
      fail(`G derived mobility relation missing: ${JSON.stringify(s)}`);
    }
    if (s.employed !== '1') fail(`G worker must be employed once connected: ${JSON.stringify(s)}`);
    if (s.materialProduction !== '2') fail(`G production must resume once connected: ${JSON.stringify(s)}`);
    ok(
      `G mobility connected -> employed ${s.employed}, production ${s.materialProduction}/tick, mobilityConnected ${s.mobilityConnectedColonists}`
    );
    await shot('04-roads-operational-production.png');

    const realErrors = errors.filter((e) => !e.includes('favicon'));
    if (realErrors.length > 0) fail(`browser errors: ${realErrors.join(' | ')}`);
    else ok('zero console/page errors');
  } catch (e) {
    if (!process.exitCode) {
      console.error(`ROAD E2E FAIL: ${e.message}`);
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('ROAD E2E RESULT: FAIL');
  else console.log('ROAD E2E RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`ROAD E2E FAIL: ${e.message}`);
  process.exitCode = 1;
});
