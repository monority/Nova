/* NOVA Step 10AV terrain browser E2E.
 *
 * Real-browser proof that terrain is SPATIAL INPUT and nothing else:
 *   - the blocked cells of the fixture are rendered (one InstancedMesh, one
 *     instance per blocked cell) and visible on the board;
 *   - a building placed on a blocked cell is refused with explicit feedback and
 *     ZERO mutation (no building, no Material, no tick);
 *   - a road command that touches a blocked cell is refused ATOMICALLY, with no
 *     partial road, no Material and no tick;
 *   - the west Well site of the fixture is unusable, so the chokepoint cannot
 *     be solved by a second Well;
 *   - case A (connector = road) merges the two networks and serves both
 *     Residences; case B (connector = building) leaves two networks and one
 *     unserved Residence;
 *   - the responsive viewports stay usable with terrain drawn.
 *
 * The fixture is loaded through the `?scenario=terrain-chokepoint` deep link:
 * a step FIXTURE is never part of the curated scenario select. All state
 * changes come from real palette clicks and real canvas pointer gestures;
 * window.__nova is only read (never mutated).
 * Screenshots: artifacts/terrain/01..09.
 * Mode: headed by default, override NOVA_TERRAIN_MODE=headless.
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

const PORT = 4195;
const BASE = `http://localhost:${PORT}/`;
const URL = `${BASE}?scenario=terrain-chokepoint`;
const ART = 'artifacts/terrain';
const MODE = (process.env.NOVA_TERRAIN_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';

/** Canonical blocked set of the fixture, in canonical (x, y) order. */
const BLOCKED = [
  '0,1',
  ...[0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((y) => `2,${y}`),
];
const CONNECTOR = { x: 2, y: 1 };
const BLOCKED_CELL = { x: 2, y: 3 };
const WEST_WELL_SITE = { x: 0, y: 1 };

const fail = (msg) => {
  console.error(`TERRAIN E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`TERRAIN E2E PASS: ${msg}`);

function assert(condition, message) {
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
const num = (s, key) => Number(s[key]);

async function step(page) {
  const before = num(await stats(page), 'tick');
  await page.click('[data-testid="simulation-step"]');
  await waitFor(async () => num(await stats(page), 'tick') === before + 1, `tick ${before + 1}`);
  return stats(page);
}

async function pointAt(page, cell) {
  const pt = await page.evaluate((c) => window.__nova.cellToScreen(c), cell);
  if (!pt) throw new Error(`cellToScreen null for ${cell.x},${cell.y}`);
  await page.mouse.move(pt.x, pt.y);
  return pt;
}

async function selectPalette(page, testid, expectedLabel) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.click(`[data-testid="${testid}"]`);
    const s = await stats(page);
    if (s.status.includes(expectedLabel)) return s;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    `palette feedback missing for ${testid}: ${JSON.stringify((await stats(page)).status)}`
  );
}

/** Load the terrain fixture afresh. */
async function loadFixture(page) {
  await page.goto(URL, { waitUntil: 'load' });
  await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
  return waitFor(async () => {
    const s = await stats(page);
    return s.blockedCells.length > 0 ? s : null;
  }, 'terrain fixture loaded');
}

async function main() {
  mkdirSync(ART, { recursive: true });
  const preview = spawn(
    process.execPath,
    [VITE_BIN, 'preview', '--port', String(PORT), '--strictPort'],
    { stdio: 'pipe', shell: false }
  );
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) break;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
    if (i === 99) throw new Error('preview start timeout');
  }

  let browser;
  const errors = [];
  try {
    browser = await chromium.launch({ headless: HEADLESS });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      // Match the other suites: the browser's automatic /favicon.ico request
      // 404s and is excluded from the http-status check below.
      if (m.type() === 'error' && !m.text().includes('Failed to load resource')) {
        errors.push(`console: ${m.text()}`);
      }
    });
    page.on('response', (r) => {
      if (r.status() >= 400 && !/\/favicon\.ico$/i.test(r.url())) {
        errors.push(`http ${r.status()}: ${r.url()}`);
      }
    });

    // --- 1. fixture loaded through the deep link -----------------------------
    let s = await loadFixture(page);
    assert(s.blockedCells === BLOCKED.join(' '), `blockedCells: ${s.blockedCells}`);
    assert(s.terrainInstances === String(BLOCKED.length),
      `terrainInstances ${s.terrainInstances} != ${BLOCKED.length}`);
    assert(s.status.includes('Terrain chokepoint'), `status: ${s.status}`);
    ok(`fixture loaded: ${BLOCKED.length} blocked cells, ${s.terrainInstances} rendered instances`);
    await page.screenshot({ path: `${ART}/01-terrain-visible.png` });

    const scenario = await page.evaluate(() => window.__nova.scenario());
    assert(scenario.id === 'terrain-chokepoint', `scenario id ${scenario.id}`);
    const objective = await page.evaluate(() => window.__nova.objective());
    assert(objective && objective.state === 'in_progress',
      `objective should start in progress: ${JSON.stringify(objective)}`);
    ok(`objective framing: ${objective.blockers.join(', ')}`);

    // --- 2. building placement refused on a blocked cell ---------------------
    let before = await stats(page);
    let pt = await pointAt(page, BLOCKED_CELL);
    await waitFor(async () => (await stats(page)).status.includes('blocked by terrain'),
      'blocked hover feedback');
    await page.screenshot({ path: `${ART}/02-blocked-hover.png` });
    await page.mouse.click(pt.x, pt.y);
    let after = await stats(page);
    assert(after.status.includes('blocked by terrain'), `click status: ${after.status}`);
    assert(after.buildings === before.buildings, `building count changed: ${after.buildings}`);
    assert(after.construction === before.construction, `material changed: ${after.construction}`);
    assert(after.tick === before.tick, `tick changed: ${after.tick}`);
    ok(`building refused on ${BLOCKED_CELL.x},${BLOCKED_CELL.y} with zero mutation (${after.status})`);

    // --- 3. the west Well site is terrain-blocked (variant C) ----------------
    await selectPalette(page, 'build-well', 'Well selected');
    pt = await pointAt(page, WEST_WELL_SITE);
    before = await stats(page);
    await page.mouse.click(pt.x, pt.y);
    after = await stats(page);
    assert(after.status.includes('blocked by terrain'), `well status: ${after.status}`);
    assert(after.buildings === before.buildings, 'the west Well was built on terrain');
    assert(after.construction === before.construction, 'the west Well spent Material');
    ok(`west Well site ${WEST_WELL_SITE.x},${WEST_WELL_SITE.y} unusable (${after.status})`);
    await page.screenshot({ path: `${ART}/03-west-well-refused.png` });

    // --- 4. road refused on a blocked cell, and atomically for a drag --------
    await selectPalette(page, 'build-road', 'Road selected');
    before = await stats(page);
    pt = await pointAt(page, BLOCKED_CELL);
    await waitFor(async () => (await stats(page)).status.includes('blocked by terrain'),
      'blocked road hover');
    await page.mouse.click(pt.x, pt.y);
    after = await stats(page);
    assert(after.roads === before.roads, `road count changed: ${after.roads}`);
    assert(after.construction === before.construction, 'a refused road spent Material');
    assert(after.tick === before.tick, 'a refused road advanced the tick');
    ok(`road refused on a blocked cell (${after.status})`);

    // Drag across the ridge: one blocked cell in the middle of the gesture.
    const from = await pointAt(page, { x: 1, y: 3 });
    await page.mouse.down();
    const to = await page.evaluate((c) => window.__nova.cellToScreen(c), { x: 3, y: 3 });
    assert(to, 'cellToScreen null for the drag end');
    await page.mouse.move(to.x, to.y, { steps: 6 });
    await waitFor(async () => (await stats(page)).status.includes('blocked by terrain'),
      'blocked drag preview');
    before = await stats(page);
    await page.mouse.up();
    await new Promise((r) => setTimeout(r, 250));
    after = await stats(page);
    assert(after.roads === before.roads, `partial road placed: ${after.roads}`);
    assert(after.construction === before.construction, 'an atomic refusal spent Material');
    ok('a road drag crossing the ridge is refused atomically (no partial road)');
    await page.screenshot({ path: `${ART}/04-road-drag-refused.png` });

    // --- 5. case A: the connector cell as a road -----------------------------
    await selectPalette(page, 'build-road', 'Road selected');
    before = await stats(page);
    pt = await pointAt(page, CONNECTOR);
    await waitFor(async () => (await stats(page)).status.includes('ready'), 'connector road ready');
    await page.mouse.click(pt.x, pt.y);
    await waitFor(async () => num(await stats(page), 'roads') === num(before, 'roads') + 1,
      'connector road placed');
    await step(page);
    s = await step(page);
    assert(s.operationalRoads === String(num(before, 'operationalRoads') + 1),
      `operational roads: ${s.operationalRoads}`);
    assert(s.roadNetworks === '1', `case A networks: ${s.roadNetworks}`);
    assert(s.waterServedResidences === '2', `case A served residences: ${s.waterServedResidences}`);
    assert(s.servedColonists === '2', `case A served colonists: ${s.servedColonists}`);
    ok(`case A: connector = road -> ${s.roadNetworks} network, ${s.waterServedResidences} served Residences`);
    await page.screenshot({ path: `${ART}/05-case-a-merged.png` });

    // --- 6. case B: the connector cell as a building --------------------------
    s = await loadFixture(page);
    await selectPalette(page, 'build-farm', 'Farm selected');
    before = await stats(page);
    pt = await pointAt(page, CONNECTOR);
    await waitFor(async () => (await stats(page)).status.includes('ready'), 'connector farm ready');
    await page.mouse.click(pt.x, pt.y);
    await waitFor(async () => num(await stats(page), 'buildings') === num(before, 'buildings') + 1,
      'connector building placed');
    await step(page);
    s = await step(page);
    assert(s.roadNetworks === '2', `case B networks: ${s.roadNetworks}`);
    assert(s.waterServedResidences === '1', `case B served residences: ${s.waterServedResidences}`);
    assert(s.servedColonists === '1', `case B served colonists: ${s.servedColonists}`);
    ok(`case B: connector = building -> ${s.roadNetworks} networks, ${s.waterServedResidences} served Residence`);
    await page.screenshot({ path: `${ART}/06-case-b-severed.png` });

    // --- 7. terrain is drawn, not merely stored ------------------------------
    assert(s.terrainInstances === String(BLOCKED.length),
      `terrain instances after case B: ${s.terrainInstances}`);
    const canvasBox = await page.evaluate(() => {
      const canvas = document.querySelector('canvas#nova-canvas');
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    assert(canvasBox && canvasBox.width > 0 && canvasBox.height > 0, 'canvas has no size');
    ok('terrain instances stay drawn after a full scenario tick sequence');

    // --- 8. responsive --------------------------------------------------------
    const responsive = [];
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 420, height: 740 },
      { width: 360, height: 640 },
    ]) {
      await page.setViewportSize(viewport);
      await new Promise((r) => setTimeout(r, 300));
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const canvas = document.querySelector('canvas#nova-canvas');
        const rect = canvas ? canvas.getBoundingClientRect() : null;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          canvasWidth: rect ? rect.width : 0,
          canvasHeight: rect ? rect.height : 0,
          canvasRight: rect ? rect.right : Number.POSITIVE_INFINITY,
          canvasBottom: rect ? rect.bottom : Number.POSITIVE_INFINITY,
        };
      });
      responsive.push({ viewport, ...metrics });
      assert(
        metrics.scrollWidth <= metrics.clientWidth + 1,
        `horizontal overflow at ${viewport.width}x${viewport.height}: ${metrics.scrollWidth} > ${metrics.clientWidth}`
      );
      assert(metrics.canvasWidth > 0 && metrics.canvasHeight > 0,
        `board not usable at ${viewport.width}x${viewport.height}`);
      assert(metrics.canvasRight <= viewport.width + 1,
        `board overflows horizontally at ${viewport.width}x${viewport.height}`);
      // The terrain must still be rendered after the resize.
      const resized = await stats(page);
      assert(resized.terrainInstances === String(BLOCKED.length),
        `terrain instances after resize: ${resized.terrainInstances}`);
      await page.screenshot({ path: `${ART}/07-responsive-${viewport.width}.png` });
    }
    ok(`responsive: no overflow at ${responsive.map((r) => r.viewport.width).join(' / ')}`);

    // --- 9. the curated scenario select stays catalogue-only -----------------
    const options = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-testid="scenario-select"] option')).map(
        (option) => option.value
      )
    );
    assert(!options.includes('terrain-chokepoint'),
      `the fixture leaked into the scenario select: ${options.join(',')}`);
    ok(`scenario select stays catalogue-only (${options.length} entries)`);

    await page.screenshot({ path: `${ART}/08-final.png` });
    const realErrors = errors.filter((e) => !e.includes('favicon'));
    if (realErrors.length > 0) throw new Error(`browser errors: ${realErrors.join(' | ')}`);
    ok('zero console/page errors');
  } catch (e) {
    if (!process.exitCode) {
      console.error(`TERRAIN E2E FAIL: ${e.message}`);
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('TERRAIN E2E RESULT: FAIL');
  else console.log('TERRAIN E2E RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`TERRAIN E2E FAIL: ${e.message}`);
  process.exitCode = 1;
});
