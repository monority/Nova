/* NOVA Step 10AL progression & scenario framing browser E2E.
 *
 * Real browser proof of the progression layer:
 *   - the derived stage/milestone/checklist/blockers for the default game;
 *   - the Wilderness -> Settlement transition on a real repair sequence;
 *   - the Settlement -> Village transition on a real Well placement;
 *   - every scenario start (state + objective + stage);
 *   - failure cases (a broken condition does not advance the stage);
 *   - persistence boundaries (no scenario/progression state in the save).
 *
 * All state changes come from real palette clicks on the canvas and real
 * STEP controls. window.__nova is only read (never mutated).
 * Screenshots: artifacts/progression/01..06.
 * Mode: headed by default, override NOVA_PROGRESSION_MODE=headless.
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

const PORT = 4185;
const URL = `http://localhost:${PORT}/`;
const ART = 'artifacts/progression';
const MODE = (process.env.NOVA_PROGRESSION_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';

const fail = (msg) => {
  console.error(`PROGRESSION E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`PROGRESSION E2E PASS: ${msg}`);

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
const scenario = (page) => page.evaluate(() => window.__nova.scenario());
const objective = (page) => page.evaluate(() => window.__nova.objective());

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

async function dragRoads(page, start, end) {
  const from = await moveTo(page, start);
  await page.mouse.down();
  const to = await page.evaluate((c) => window.__nova.cellToScreen(c), end);
  if (!to) throw new Error(`cellToScreen null for ${end.x},${end.y}`);
  await page.mouse.move(to.x, to.y, { steps: 4 });
  await waitFor(async () => (await stats(page)).status.includes('ready'), `road drag preview`);
  const before = Number((await stats(page)).roads);
  await page.mouse.up();
  await waitFor(async () => Number((await stats(page)).roads) > before, 'road gesture committed');
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

const progressionText = async (page) => ({
  stage: await page.locator('[data-testid="progression-stage"]').textContent(),
  next: await page.locator('[data-testid="progression-next"]').textContent(),
  objective: await page.locator('[data-testid="progression-objective"]').textContent(),
  progress: await page.locator('[data-testid="progression-progress"]').textContent(),
  blocked: await page.locator('[data-testid="progression-blocked"]').textContent(),
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

    await page.goto(URL, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');

    // --- Default start: Wilderness with the three Settlement blockers ------
    let text = await progressionText(page);
    let status = await progression(page);
    assert(text.stage === 'Wilderness', `default stage expected Wilderness, got "${text.stage}"`);
    assert(text.next === 'Settlement', `default next expected Settlement, got "${text.next}"`);
    assert(text.objective === '', `free play must have no objective, got "${text.objective}"`);
    assert(status.blockers.length === 3, `default must have 3 blockers, got ${JSON.stringify(status.blockers)}`);
    assert(text.progress.includes('✗ Population 1'), `progress list missing population: "${text.progress}"`);
    assert(text.blocked.includes('Blocked by'), `blockers line missing: "${text.blocked}"`);
    assert((await scenario(page)).id === 'default', 'default scenario id expected');
    const dflt = await stats(page);
    assert(dflt.construction === '100' && dflt.food === '100', `default resources changed: ${JSON.stringify(dflt)}`);
    ok(`default start: Wilderness -> Settlement, blockers ${JSON.stringify(status.blockers)}`);
    await shot('01-free-play-wilderness.png');

    // --- Scenario starts: stage + objective + state ------------------------
    const expectations = [
      { id: 'first-settlement', stage: 'Wilderness', buildings: '0' },
      { id: 'water-constraint', stage: 'Settlement', buildings: '3' },
      { id: 'industrial-expansion', stage: 'Village', buildings: '4' },
      { id: 'water-reserve-industry', stage: 'Village', buildings: '4' },
      { id: 'spatial-efficiency', stage: 'Wilderness', buildings: '0' },
      { id: 'population-expansion', stage: 'Settlement', buildings: '5' },
      { id: 'recovery', stage: 'Wilderness', buildings: '2' },
    ];
    for (const expectation of expectations) {
      const s = await loadScenario(page, expectation.id);
      text = await progressionText(page);
      const info = await scenario(page);
      assert(info.id === expectation.id, `scenario id expected ${expectation.id}, got ${info.id}`);
      assert(info.objective.length > 0, `scenario ${expectation.id} has no objective label`);
      assert(text.objective.includes('Objective —'), `objective not displayed for ${expectation.id}: "${text.objective}"`);
      assert(text.objective.includes('Constraint —'), `objective constraint not displayed for ${expectation.id}: "${text.objective}"`);
      assert(text.stage === expectation.stage, `scenario ${expectation.id} stage expected ${expectation.stage}, got ${text.stage}`);
      assert(s.buildings === expectation.buildings, `scenario ${expectation.id} buildings expected ${expectation.buildings}, got ${s.buildings}`);
      ok(`scenario ${expectation.id}: ${text.stage}, objective "${info.objective}", ${s.buildings} buildings`);
    }
    await shot('02-scenario-recovery.png');

    // --- Readability: the scenario framing wins the load frame (Step 10AM) --
    // Regression: before the fix a scenario load produced a per-tick causal
    // message ("0.5 farms produced 1 food") instead of the scenario framing.
    const loadStatus = await page.locator('[data-testid="ui-status"]').textContent();
    assert(
      loadStatus.startsWith('Scenario — '),
      `scenario load must show its framing status, got "${loadStatus}"`
    );
    await step(page);
    const tickStatus = await page.locator('[data-testid="ui-status"]').textContent();
    assert(
      tickStatus.includes('consumed') || tickStatus.includes('produced') || tickStatus.includes('No '),
      `a real tick must show a causal status, got "${tickStatus}"`
    );
    const panelLines = (await progressionText(page)).progress.split('\n');
    assert(panelLines.length === 3, `non-village checklist must have 3 lines, got ${panelLines.length}`);
    ok(`readability: scenario framing on load, causal status after a tick, ${panelLines.length}-line checklist`);

    // --- Failure case: the Recovery scenario stays Wilderness --------------
    const recoveryStart = await progression(page);
    assert(recoveryStart.stage === 'wilderness', 'recovery must start in Wilderness');
    assert(
      JSON.stringify(recoveryStart.blockers) === JSON.stringify(['Food balance']),
      `recovery blockers expected only Food balance, got ${JSON.stringify(recoveryStart.blockers)}`
    );
    for (let i = 0; i < 4; i += 1) await step(page);
    const stillWild = await progression(page);
    assert(stillWild.stage === 'wilderness', `unrepaired recovery must stay Wilderness, got ${stillWild.stage}`);
    ok(`failure case: unrepaired Recovery stays Wilderness (blockers ${JSON.stringify(stillWild.blockers)})`);

    // --- Wilderness -> Settlement by repairing the stranded Farm -----------
    await selectPalette(page, 'build-road', 'Road selected');
    await dragRoads(page, { x: 2, y: 1 }, { x: 4, y: 1 });
    for (let i = 0; i < 4; i += 1) await step(page);
    const settlement = await progression(page);
    text = await progressionText(page);
    assert(settlement.stage === 'settlement', `repaired recovery must reach Settlement, got ${settlement.stage}`);
    assert(text.stage === 'Settlement' && text.next === 'Village', `panel mismatch: ${JSON.stringify(text)}`);
    assert(
      JSON.stringify(settlement.blockers) === JSON.stringify(['Population 2', 'Water capacity 2']),
      `Settlement blockers expected population+water, got ${JSON.stringify(settlement.blockers)}`
    );
    ok(`Wilderness -> Settlement on repair; blockers ${JSON.stringify(settlement.blockers)}`);
    await shot('03-settlement.png');

    // --- Settlement -> Village on a real Well placement --------------------
    await loadScenario(page, 'water-constraint');
    let before = await progression(page);
    assert(before.stage === 'settlement', `water-constraint must start in Settlement, got ${before.stage}`);
    assert(
      JSON.stringify(before.blockers) === JSON.stringify(['Water capacity 2']),
      `water-constraint blockers expected Water capacity 2, got ${JSON.stringify(before.blockers)}`
    );
    text = await progressionText(page);
    assert(text.progress.includes('✗ Water capacity 2'), `checklist must flag Water: "${text.progress}"`);
    await selectPalette(page, 'build-well', 'Well selected');
    await placeAt(page, { x: 3, y: 2 });
    for (let i = 0; i < 6; i += 1) await step(page);
    const village = await progression(page);
    text = await progressionText(page);
    assert(village.stage === 'village', `Well must reach Village, got ${village.stage}`);
    assert(text.next === 'not yet defined', `deferred next label expected, got "${text.next}"`);
    assert(village.deferred === true, 'village must report deferred progression');
    assert(village.blockers.length === 0, `village must have no blockers, got ${JSON.stringify(village.blockers)}`);
    assert(text.blocked === '', `village blockers line must be empty, got "${text.blocked}"`);
    const villageObjective = await objective(page);
    const villageObjectiveText = await page.locator('[data-testid="progression-objective-status"]').textContent();
    assert(villageObjective?.state === 'completed', `water-constraint objective expected completed, got ${JSON.stringify(villageObjective)}`);
    assert(villageObjectiveText.includes('Objective complete'), `objective status line expected complete, got "${villageObjectiveText}"`);
    ok('Settlement -> Village on a real Well placement; further progression deferred; objective complete');
    await shot('04-village.png');

    // --- Objective evaluation: Industrial expansion completes by building ---
    await loadScenario(page, 'industrial-expansion');
    let industrial = await objective(page);
    let industrialText = await page.locator('[data-testid="progression-objective-status"]').textContent();
    assert(industrial?.state === 'in_progress', `industrial objective expected in_progress, got ${JSON.stringify(industrial)}`);
    assert(industrialText.includes('Workshop built'), `industrial blockers expected, got "${industrialText}"`);
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 2, y: 2 });
    for (let i = 0; i < 3; i += 1) await step(page);
    industrial = await objective(page);
    industrialText = await page.locator('[data-testid="progression-objective-status"]').textContent();
    assert(industrial?.state === 'completed', `industrial objective expected completed after the Workshop, got ${JSON.stringify(industrial)}`);
    assert(industrialText.includes('Objective complete'), `industrial objective line expected complete, got "${industrialText}"`);
    ok('objective evaluation: Industrial expansion completes when the Workshop is built (in progress -> complete)');

    // --- Reproducibility: progression is recomputed, never stored ----------
    const first = JSON.stringify(await progression(page));
    const second = JSON.stringify(await progression(page));
    assert(first === second, 'progression must be recomputed identically');
    const saved = JSON.parse(await page.evaluate(() => window.__nova.serialize()));
    assert(saved.version === 7, `save version expected 7, got ${saved.version}`);
    assert(Object.keys(saved.state).length === 7, `save must keep 7 top-level keys, got ${Object.keys(saved.state).length}`);
    const serialized = JSON.stringify(saved);
    for (const term of ['scenario', 'progression', 'stage', 'objective', 'blocker']) {
      assert(!serialized.includes(term), `save must not contain "${term}"`);
    }
    ok('progression recomputed deterministically; save keeps version 7 with 7 keys and no scenario state');
    await shot('05-persistence.png');

    // --- Return to free play: the default game is unchanged ----------------
    const freePlay = await loadScenario(page, 'default');
    const freeProgression = await progression(page);
    assert(freePlay.construction === '100' && freePlay.food === '100' && freePlay.roads === '0', `free play resources changed: ${JSON.stringify(freePlay)}`);
    assert(freeProgression.stage === 'wilderness' && freeProgression.blockers.length === 3, 'free play progression changed');
    assert((await progressionText(page)).objective === '', 'free play must not show an objective');
    ok('free play restored: unchanged starting state, no objective, Wilderness');
    await shot('06-free-play-restored.png');

    const realErrors = errors.filter((e) => !e.includes('favicon'));
    if (realErrors.length > 0) fail(`browser errors: ${realErrors.join(' | ')}`);
    else ok('zero console/page errors');
  } catch (e) {
    if (!process.exitCode) {
      console.error(`PROGRESSION E2E FAIL: ${e.message}`);
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('PROGRESSION E2E RESULT: FAIL');
  else console.log('PROGRESSION E2E RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`PROGRESSION E2E FAIL: ${e.message}`);
  process.exitCode = 1;
});
