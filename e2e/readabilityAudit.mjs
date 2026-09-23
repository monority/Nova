/* NOVA Step 10AT readability audit — real browser, rendered text only.
 *
 * This suite does not assert implementation details: it reads the SAME text a
 * player sees (labels, panels, rows, inspection lines) for every scenario and
 * for the key failure/recovery states, prints it as evidence, and asserts only
 * what a player must be able to answer.
 *
 * Screenshots: artifacts/readability/01..NN.
 * Mode: headed by default, override NOVA_READABILITY_MODE=headless.
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

const PORT = 4192;
const URL = `http://localhost:${PORT}/`;
const ART = 'artifacts/readability';
const MODE = (process.env.NOVA_READABILITY_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`READABILITY FAIL: ${msg}`);
};
const ok = (msg) => console.log(`READABILITY PASS: ${msg}`);
const evidence = (label, value) => console.log(`READABILITY EVIDENCE ${label}: ${JSON.stringify(value)}`);

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
const progression = (page) => page.evaluate(() => window.__nova.progression());
const scenarioInfo = (page) => page.evaluate(() => window.__nova.scenario());
const objectiveInfo = (page) => page.evaluate(() => window.__nova.objective());
const text = (page, testid) => page.locator(`[data-testid="${testid}"]`).textContent();

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

async function selectAt(page, cell) {
  const pt = await moveTo(page, cell);
  await page.mouse.click(pt.x, pt.y);
  await waitFor(
    async () => (await page.evaluate(() => window.__nova.selectedBuilding())) !== null,
    `selected at ${cell.x},${cell.y}`
  );
  return page.evaluate(() => window.__nova.selectedBuilding());
}

async function placeAt(page, cell) {
  const pt = await moveTo(page, cell);
  await waitFor(async () => (await stats(page)).status.includes('ready'), `valid preview at ${cell.x},${cell.y}`);
  const before = Number((await stats(page)).buildings);
  await page.mouse.click(pt.x, pt.y);
  await waitFor(async () => Number((await stats(page)).buildings) === before + 1, `placed at ${cell.x},${cell.y}`);
}

async function selectPalette(page, testid, expectedLabel) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.click(`[data-testid="${testid}"]`);
    const s = await stats(page);
    if (s.status.includes(expectedLabel)) return s;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`palette feedback missing for ${testid}`);
}

const panel = async (page) => ({
  stage: await text(page, 'progression-stage'),
  next: await text(page, 'progression-next'),
  objective: await text(page, 'progression-objective'),
  objectiveStatus: await text(page, 'progression-objective-status'),
  progress: await text(page, 'progression-progress'),
  blocked: await text(page, 'progression-blocked'),
});

const hud = async (page) => ({
  tick: await text(page, 'stat-tick'),
  material: `${await text(page, 'stat-construction')}${await text(page, 'stat-material-status')}`,
  food: `${await text(page, 'stat-food')}${await text(page, 'stat-food-forecast')}`,
  water: `${await text(page, 'stat-water')}${await text(page, 'stat-water-status')}`,
  buildings: await text(page, 'stat-buildings'),
  operational: await text(page, 'stat-operational'),
  colonists: await text(page, 'stat-colonists'),
  jobs: await text(page, 'stat-jobs'),
  roads: await text(page, 'stat-roads'),
  status: await text(page, 'ui-status'),
});

async function loadScenario(page, id) {
  await page.selectOption('[data-testid="scenario-select"]', id);
  await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
  await waitFor(async () => (await stats(page)).tick === '0', 'scenario tick reset');
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
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(`console: ${m.text()}`);
    });
    const shot = (name) => page.screenshot({ path: `${ART}/${name}` });

    await page.goto(URL, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');

    // --- 1. Cost visibility and the default opening ----------------------
    const palette = await page.$$eval('[data-testid^="build-"]', (buttons) =>
      buttons.map((b) => ({ id: b.getAttribute('data-testid'), label: b.textContent ?? '' }))
    );
    evidence('PALETTE', palette);
    for (const button of palette) {
      assert(/·\s*\d+/.test(button.label), `palette button "${button.label}" must show its Material cost`);
    }
    const openingPanel = await panel(page);
    const openingHud = await hud(page);
    evidence('DEFAULT_OPENING', { panel: openingPanel, hud: openingHud });
    assert(openingPanel.stage === 'Wilderness', `default stage Wilderness expected, got ${openingPanel.stage}`);
    assert(openingPanel.next === 'Settlement', `default next must name Settlement, got "${openingPanel.next}"`);
    assert(openingPanel.blocked.includes('Blocked by'), `default must name its blockers: "${openingPanel.blocked}"`);
    assert(openingPanel.progress.split('\n').length === 3, 'Wilderness must list three conditions');
    ok(`opening legible: "${openingPanel.stage}" → "${openingPanel.next}", blockers "${openingPanel.blocked}"`);
    await shot('01-default-opening.png');

    // --- 2. Every scenario: objective, blockers, stage -------------------
    const scenarioIds = await page.$$eval('[data-testid="scenario-select"] option', (options) =>
      options.map((o) => o.value).filter((v) => v !== 'default')
    );
    evidence('SCENARIO_IDS', scenarioIds);
    assert(scenarioIds.length === 7, `expected 7 scenarios, got ${scenarioIds.length}`);
    const catalogue = [];
    for (const id of scenarioIds) {
      await loadScenario(page, id);
      const info = await scenarioInfo(page);
      const state = await panel(page);
      const rows = await hud(page);
      const objective = await objectiveInfo(page);
      catalogue.push({ id, label: info.objective, panel: state, hud: rows, objectiveState: objective?.state ?? null });
      assert(state.objective.includes('Objective —'), `${id}: objective label must be visible`);
      assert(state.objective.includes('Constraint —'), `${id}: objective constraint must be visible`);
      assert(info.objective.length > 0, `${id}: objective label must not be empty`);
      assert(state.objectiveStatus.length > 0, `${id}: objective status must not be empty`);
      assert(
        state.objectiveStatus.startsWith('Objective in progress') || state.objectiveStatus.startsWith('Objective complete'),
        `${id}: unexpected objective status "${state.objectiveStatus}"`
      );
      assert(state.progress.includes('✓') || state.progress.includes('✗'), `${id}: the checklist must show met/unmet marks`);
      ok(`${id}: stage "${state.stage}", next "${state.next}", "${info.objective}"`);
    }
    evidence('SCENARIO_CATALOGUE', catalogue);
    await shot('02-scenario-panels.png');

    // --- 3. Progression legibility: Wilderness -> Settlement -> Village ---
    await loadScenario(page, 'water-constraint');
    const settlementPanel = await panel(page);
    evidence('SETTLEMENT_PANEL', settlementPanel);
    assert(settlementPanel.stage === 'Settlement', 'water-constraint starts in Settlement');
    assert(settlementPanel.next === 'Village', `Settlement must name Village as next, got "${settlementPanel.next}"`);
    assert(settlementPanel.progress.includes('✗ Water capacity 2'), `the missing condition must be listed: "${settlementPanel.progress}"`);
    await selectPalette(page, 'build-well', 'Well selected');
    await placeAt(page, { x: 3, y: 2 });
    for (let i = 0; i < 6; i += 1) await step(page);
    const villagePanel = await panel(page);
    evidence('VILLAGE_PANEL', villagePanel);
    assert(villagePanel.stage === 'Village', 'the Well must reach Village');
    assert(
      villagePanel.next.toLowerCase().includes('not yet defined') &&
        villagePanel.next.includes('final stage'),
      `Village must mark the next stage as undefined AND final, got "${villagePanel.next}"`
    );
    assert(villagePanel.blocked === '', `Village must have no blockers, got "${villagePanel.blocked}"`);
    assert(villagePanel.objectiveStatus.includes('Objective complete'), 'the objective must read complete');
    assert(villagePanel.progress.length > 0, 'Village must still explain what it has achieved');
    ok(`progression legible: Wilderness → Settlement → Village, next "${villagePanel.next}"`);
    await shot('03-village-panel.png');

    // --- 4. Building inspections: production + upkeep + storage ----------
    const inspections = {};
    await loadScenario(page, 'water-reserve-industry');
    await selectAt(page, { x: 1, y: 2 });
    inspections.farm = await text(page, 'inspection-housing');
    await selectAt(page, { x: 3, y: 2 });
    inspections.well = await text(page, 'inspection-housing');
    await selectAt(page, { x: 1, y: 0 });
    inspections.residence = await text(page, 'inspection-housing');
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 4, y: 2 });
    for (let i = 0; i < 3; i += 1) await step(page);
    await selectAt(page, { x: 4, y: 2 });
    inspections.workshopVacant = await text(page, 'inspection-housing');
    inspections.workshopWorker = await text(page, 'inspection-worker');
    evidence('INSPECTIONS', inspections);
    assert(inspections.farm.includes('producing +2/tick'), `Farm inspection must name its production: "${inspections.farm}"`);
    assert(inspections.well.includes('producing +2/tick'), `Well inspection must name its production: "${inspections.well}"`);
    assert(inspections.residence.includes('Water: served'), `Residence inspection must name Water service: "${inspections.residence}"`);
    // Step 10AT: the Workshop must speak the same language as the Farm and the
    // Well (production) and name BOTH industrial constraints: upkeep and the
    // 25-per-Workshop storage.
    assert(
      inspections.workshopVacant.startsWith('Material production —'),
      `Workshop inspection must lead with production: "${inspections.workshopVacant}"`
    );
    assert(
      inspections.workshopVacant.includes('upkeep 0 (vacant)'),
      `Workshop inspection must name its upkeep: "${inspections.workshopVacant}"`
    );
    assert(
      inspections.workshopVacant.includes('storage 25'),
      `Workshop inspection must name the storage cap: "${inspections.workshopVacant}"`
    );
    ok(`Workshop inspection: "${inspections.workshopVacant}"`);
    await shot('04-inspections.png');

    // --- 5. Failure state: Recovery left alone --------------------------
    await loadScenario(page, 'recovery');
    for (let i = 0; i < 40; i += 1) await step(page);
    const failedPanel = await panel(page);
    const failedHud = await hud(page);
    const failedObjective = await objectiveInfo(page);
    evidence('FAILURE_STATE', { panel: failedPanel, hud: failedHud, objective: failedObjective });
    assert(failedHud.colonists === '0', `the colony must be gone, HUD says ${failedHud.colonists}`);
    assert(
      failedObjective?.state === 'failed',
      `a scenario that starts with colonists must report its objective failed, got ${JSON.stringify(failedObjective)}`
    );
    assert(
      failedPanel.objectiveStatus.includes('failed'),
      `the objective status line must say failed, got "${failedPanel.objectiveStatus}"`
    );
    // Step 10AT: the collapse is a STATE in the Food row, not only a message
    // that the next tick overwrites.
    assert(
      failedHud.food.includes('starved'),
      `the Food row must keep naming the collapse, got "${failedHud.food}"`
    );
    ok(`failure legible: "${failedPanel.objectiveStatus}", Food row "${failedHud.food}" (${failedObjective?.blockers?.length} blockers listed)`);
    await shot('05-failure.png');

    // --- 6. Responsive layout --------------------------------------------
    const responsive = [];
    for (const viewport of [{ width: 1280, height: 800 }, { width: 420, height: 740 }, { width: 360, height: 640 }]) {
      await page.setViewportSize(viewport);
      await new Promise((r) => setTimeout(r, 120));
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const panel = document.querySelector('#nova-ui');
        const rect = panel ? panel.getBoundingClientRect() : null;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          panelWidth: rect ? Math.round(rect.width) : 0,
          panelRight: rect ? Math.round(rect.right) : 0,
          panelBottom: rect ? Math.round(rect.bottom) : 0,
          panelScrollable: panel ? panel.scrollHeight > panel.clientHeight : false,
        };
      });
      responsive.push({ viewport, ...metrics });
      assert(
        metrics.scrollWidth <= metrics.clientWidth + 1,
        `horizontal overflow at ${viewport.width}x${viewport.height}: ${metrics.scrollWidth} > ${metrics.clientWidth}`
      );
      // Step 10AT: the overlay must never extend past the viewport (it scrolls
      // instead of clipping when the content is taller than the window).
      assert(
        metrics.panelBottom <= viewport.height,
        `the panel must stay inside ${viewport.height}px, bottom ${metrics.panelBottom}`
      );
      await shot(`06-responsive-${viewport.width}.png`);
    }
    evidence('RESPONSIVE', responsive);
    ok(`responsive: no horizontal overflow at ${responsive.map((r) => r.viewport.width).join(' / ')}`);
    await page.setViewportSize({ width: 1280, height: 800 });

    // --- 7. No stale panel values across scenario loads -------------------
    await loadScenario(page, 'recovery');
    const recoveryStage = (await panel(page)).stage;
    await loadScenario(page, 'water-reserve-industry');
    const reloaded = await panel(page);
    evidence('NO_STALE_VALUES', { recoveryStage, reloadedStage: reloaded.stage, reloadedObjective: reloaded.objective });
    assert(reloaded.stage === 'Village', `a reload must show the new stage, got "${reloaded.stage}"`);
    assert(reloaded.objective.includes('Workshop'), `a reload must show the new objective, got "${reloaded.objective}"`);
    ok('no stale panel values across scenario loads');

    assert(errors.length === 0, `console/page errors: ${JSON.stringify(errors)}`);
    ok('zero console/page errors');
    if (failures > 0) {
      console.error(`READABILITY E2E RESULT: ${failures} FAILURE(S)`);
      process.exitCode = 1;
    } else {
      console.log('READABILITY E2E RESULT: ALL PASS');
    }
  } catch (error) {
    fail(error.message);
    console.error('READABILITY E2E RESULT: FAIL');
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    preview.kill();
  }
}

main();
