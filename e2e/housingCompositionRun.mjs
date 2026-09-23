/* NOVA Step 10BE — "Housing composition" scenario browser playthrough.
 *
 * Real-browser validation of the ONE new curated scenario, using the shipped UI
 * only (scenario select, palette, canvas hover/click, STEP):
 *
 *   - the scenario is identifiable, its objective and constraint are visible and
 *     the start state is in progress (Wilderness, two networks, no Food);
 *   - the placement preview (10BA) distinguishes the three candidate cells
 *     BEFORE the command (served + two workplaces / served + one / not served),
 *     which is what makes the spatial decision readable;
 *   - the bridge solution completes the objective (Village) with real clicks;
 *   - the stranded solution fails with a visible cause and is recoverable with
 *     the remaining 5 Material (road join);
 *   - narrow viewports stay usable and free of horizontal overflow.
 *
 * Screenshots: artifacts/housing-composition/.
 * Mode: headed by default, override NOVA_HOUSING_MODE=headless.
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

const PORT = 4200;
const URL = `http://localhost:${PORT}/`;
const ART = 'artifacts/housing-composition';
const MODE = (process.env.NOVA_HOUSING_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';
const SCENARIO = 'housing-composition';

const fail = (msg) => {
  console.error(`HOUSING E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`HOUSING E2E PASS: ${msg}`);

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
const objective = (page) => page.evaluate(() => window.__nova.objective());
const progression = (page) => page.evaluate(() => window.__nova.progression());
const scenario = (page) => page.evaluate(() => window.__nova.scenario());

async function step(page, times = 1) {
  for (let i = 0; i < times; i += 1) {
    const before = Number((await stats(page)).tick);
    await page.click('[data-testid="simulation-step"]');
    await waitFor(async () => Number((await stats(page)).tick) === before + 1, `tick ${before + 1}`);
  }
  return stats(page);
}

async function loadScenario(page) {
  await page.goto(URL, { waitUntil: 'load' });
  await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
  await page.selectOption('[data-testid="scenario-select"]', SCENARIO);
  await waitFor(async () => (await scenario(page)).id === SCENARIO, 'scenario loaded');
  return stats(page);
}

async function pointAt(page, cell) {
  const point = await page.evaluate((c) => window.__nova.cellToScreen(c), cell);
  if (!point) throw new Error(`cellToScreen null for ${cell.x},${cell.y}`);
  await page.mouse.move(point.x, point.y);
  return point;
}

async function placeResidence(page, cell) {
  await page.click('[data-testid="build-residence"]');
  const point = await pointAt(page, cell);
  await waitFor(async () => (await stats(page)).status.includes('ready'), `residence ready ${cell.x},${cell.y}`);
  const before = Number((await stats(page)).buildings);
  await page.mouse.click(point.x, point.y);
  await waitFor(async () => Number((await stats(page)).buildings) === before + 1, `placed at ${cell.x},${cell.y}`);
  return stats(page);
}

async function placeRoad(page, cell) {
  await page.click('[data-testid="build-road"]');
  const point = await pointAt(page, cell);
  await waitFor(async () => (await stats(page)).status.includes('ready'), `road ready ${cell.x},${cell.y}`);
  const before = Number((await stats(page)).roads);
  await page.mouse.click(point.x, point.y);
  await waitFor(async () => Number((await stats(page)).roads) === before + 1, `road at ${cell.x},${cell.y}`);
  return stats(page);
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
      if ((await fetch(URL)).ok) break;
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
      if (m.type() === 'error' && !m.text().includes('Failed to load resource')) {
        errors.push(`console: ${m.text()}`);
      }
    });

    // --- 1. scenario identity, framing and start state -----------------------
    let s = await loadScenario(page);
    const info = await scenario(page);
    const status = await stats(page);
    assert(info.objective.includes('Reach Village'), `objective label: ${info.objective}`);
    assert(status.status.includes('Housing composition'), `status: ${status.status}`);
    assert(status.roadNetworks === '2', `start networks: ${status.roadNetworks}`);
    assert(status.waterServedResidences === '1', `start served: ${status.waterServedResidences}`);
    assert(status.construction === '30', `start material: ${status.construction}`);
    assert(status.food === '40', `start food: ${status.food}`);
    // No staffed Farm at the start: the Food flow is 0 while one colonist eats.
    assert(status.waterProduction === '2', `start water production: ${status.waterProduction}`);
    assert(status.staffedFarmIds === '' && status.vacantOperationalFarms === '1',
      `start farms: staffed "${status.staffedFarmIds}", vacant ${status.vacantOperationalFarms}`);
    const startProgression = await progression(page);
    assert(startProgression.stage === 'wilderness', `start stage: ${startProgression.stage}`);
    const startObjective = await objective(page);
    assert(startObjective.state === 'in_progress', `start objective: ${startObjective.state}`);
    ok(`start: stage ${startProgression.stage}, objective ${startObjective.state} (${startObjective.blockers.join(', ')}), material ${status.construction}, food ${status.food}`);

    const constraintText = await page.evaluate(
      () => document.querySelector('[data-testid="progression-objective"]')?.textContent ?? ''
    );
    assert(constraintText.includes('Constraint —'), `constraint not visible: ${constraintText}`);
    await page.screenshot({ path: `${ART}/01-start.png` });

    // --- 2. the placement preview distinguishes the candidate cells ----------
    await page.click('[data-testid="build-residence"]');
    const previews = {};
    for (const [label, cell] of [
      ['bridge', { x: 2, y: 1 }],
      ['eastAway', { x: 4, y: 1 }],
      ['west', { x: 0, y: 1 }],
    ]) {
      await pointAt(page, cell);
      previews[label] = await waitFor(async () => {
        const text = (await stats(page)).status;
        return text.includes('ready') ? text : null;
      }, `preview ${label}`);
    }
    assert(/water: served/.test(previews.bridge) && /2 workplaces reachable/.test(previews.bridge),
      `bridge preview: ${previews.bridge}`);
    assert(/water: served/.test(previews.eastAway) && /1 workplace reachable/.test(previews.eastAway),
      `east preview: ${previews.eastAway}`);
    assert(/water: NOT served/.test(previews.west), `west preview: ${previews.west}`);
    ok(`previews: bridge "${previews.bridge}" | east "${previews.eastAway}" | west "${previews.west}"`);
    await page.screenshot({ path: `${ART}/02-previews.png` });

    // --- 3. the bridge solution completes the scenario -----------------------
    await placeResidence(page, { x: 2, y: 1 });
    for (let i = 0; i < 12; i += 1) {
      const current = await objective(page);
      if (current?.state === 'completed') break;
      await step(page);
    }
    s = await stats(page);
    const solved = await objective(page);
    const solvedProgression = await progression(page);
    assert(solved.state === 'completed', `bridge solution objective: ${solved.state}`);
    assert(solvedProgression.stage === 'village', `bridge stage: ${solvedProgression.stage}`);
    assert(s.colonists === '2', `bridge population: ${s.colonists}`);
    assert(s.staffedFarmIds !== '' && s.vacantOperationalFarms === '0',
      `bridge farm staffing: "${s.staffedFarmIds}" / vacant ${s.vacantOperationalFarms}`);
    assert(s.construction === '5', `bridge leftover material: ${s.construction}`);
    ok(`bridge solution: Village at tick ${s.tick}, population ${s.colonists}, staffed Farm "${s.staffedFarmIds}", material left ${s.construction}`);
    await page.screenshot({ path: `${ART}/03-village.png` });

    // --- 4. the stranded solution fails with a visible cause ------------------
    s = await loadScenario(page);
    await placeResidence(page, { x: 4, y: 1 });
    for (let i = 0; i < 60; i += 1) {
      const current = await stats(page);
      if (current.colonists === '0') break;
      await step(page);
    }
    s = await stats(page);
    const failed = await objective(page);
    assert(s.colonists === '0', `stranded run population should collapse: ${s.colonists}`);
    assert(failed.state === 'failed', `stranded objective: ${failed.state}`);
    assert(s.staffedFarmIds === '', `stranded farm staffing: "${s.staffedFarmIds}"`);
    assert(s.food === '0', `stranded food reserve: ${s.food}`);
    ok(`stranded failure: population 0 at tick ${s.tick}, food ${s.food}, objective ${failed.state} ("${s.foodStatus}")`);
    await page.screenshot({ path: `${ART}/04-failure.png` });

    // --- 5. recovery: the remaining 5 Material joins the networks -------------
    s = await loadScenario(page);
    await placeResidence(page, { x: 0, y: 1 });
    await step(page, 2);
    await placeRoad(page, { x: 2, y: 1 });
    for (let i = 0; i < 16; i += 1) {
      const current = await objective(page);
      if (current?.state === 'completed') break;
      await step(page);
    }
    s = await stats(page);
    const recovered = await objective(page);
    const recoveredProgression = await progression(page);
    assert(recovered.state === 'completed', `recovery objective: ${recovered.state}`);
    assert(recoveredProgression.stage === 'village', `recovery stage: ${recoveredProgression.stage}`);
    assert(s.roadNetworks === '1', `recovery networks: ${s.roadNetworks}`);
    assert(s.construction === '0', `recovery material: ${s.construction}`);
    ok(`recovery: road join at tick ${s.tick} → ${recoveredProgression.stage}, networks ${s.roadNetworks}, material ${s.construction}`);
    await page.screenshot({ path: `${ART}/05-recovery.png` });

    // --- 6. narrow viewports --------------------------------------------------
    for (const viewport of [
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
        };
      });
      assert(metrics.scrollWidth <= metrics.clientWidth + 1,
        `horizontal overflow at ${viewport.width}x${viewport.height}`);
      assert(metrics.canvasWidth > 0 && metrics.canvasHeight > 0,
        `board unusable at ${viewport.width}x${viewport.height}`);
      const narrowScenario = await scenario(page);
      assert(narrowScenario.id === SCENARIO, `scenario identity lost at narrow viewport: ${narrowScenario.id}`);
      const narrowStatus = (await stats(page)).status;
      assert(narrowStatus.length > 0, 'status surface empty at narrow viewport');
      ok(`narrow ${viewport.width}x${viewport.height}: no overflow, board ${Math.round(metrics.canvasWidth)}x${Math.round(metrics.canvasHeight)}, scenario readable`);
      await page.screenshot({ path: `${ART}/06-narrow-${viewport.width}.png` });
    }

    const realErrors = errors.filter((e) => !e.includes('favicon'));
    if (realErrors.length > 0) throw new Error(`browser errors: ${realErrors.join(' | ')}`);
    ok('zero console/page errors');
  } catch (e) {
    if (!process.exitCode) {
      console.error(`HOUSING E2E FAIL: ${e.message}`);
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('HOUSING E2E RESULT: FAIL');
  else console.log('HOUSING E2E RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`HOUSING E2E FAIL: ${e.message}`);
  process.exitCode = 1;
});
