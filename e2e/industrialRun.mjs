/* NOVA Step 10AQ industrial content browser E2E.
 *
 * Real-browser proof of the ONE content addition of the step, the
 * `water-reserve-industry` scenario, on the unchanged 2/2 economy:
 *   - scenario framing: stage, objective label, constraint, initial state;
 *   - Workshop construction really costs 25 Material + 1 Water;
 *   - the manual reassignment of a Well worker onto the Workshop (the burst);
 *   - the burst's Water -> Material conversion and its storage bound;
 *   - the Village requirement regressing while the Well is unstaffed;
 *   - the second Well being paid for by the burst Material;
 *   - the recovery restoring Village and completing the objective;
 *   - persistence boundaries (no scenario/progression state in the save).
 *
 * All state changes come from real palette clicks and the real inspector
 * reassignment control. window.__nova is only read (never mutated).
 * Screenshots: artifacts/industrial/01..07.
 * Mode: headed by default, override NOVA_INDUSTRIAL_MODE=headless.
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

const PORT = 4189;
const URL = `http://localhost:${PORT}/`;
const ART = 'artifacts/industrial';
const MODE = (process.env.NOVA_INDUSTRIAL_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';

const fail = (msg) => {
  console.error(`INDUSTRIAL E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`INDUSTRIAL E2E PASS: ${msg}`);

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
  return stats(page);
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

async function selectPalette(page, testid, expectedLabel) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.click(`[data-testid="${testid}"]`);
    const s = await stats(page);
    if (s.status.includes(expectedLabel)) return s;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`palette feedback missing for ${testid}`);
}

const enabledTargets = (page) =>
  page.$$eval('[data-testid="reassign-target"] option:not([disabled])', (opts) =>
    opts.map((o) => ({ value: o.value, label: o.textContent ?? '' }))
  );

async function moveWorker(page, targetId) {
  await page.selectOption('[data-testid="reassign-target"]', targetId);
  await page.click('[data-testid="reassign-confirm"]');
  return stats(page);
}

const progressionText = async (page) => ({
  stage: await page.locator('[data-testid="progression-stage"]').textContent(),
  next: await page.locator('[data-testid="progression-next"]').textContent(),
  objective: await page.locator('[data-testid="progression-objective"]').textContent(),
  progress: await page.locator('[data-testid="progression-progress"]').textContent(),
  blocked: await page.locator('[data-testid="progression-blocked"]').textContent(),
  objectiveStatus: await page.locator('[data-testid="progression-objective-status"]').textContent(),
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

    // --- 1. Scenario framing and initial state ---------------------------
    let s = await loadScenario(page, 'water-reserve-industry');
    let text = await progressionText(page);
    const info = await scenario(page);
    assert(info.id === 'water-reserve-industry', `scenario id expected water-reserve-industry, got ${info.id}`);
    assert(
      info.objective.includes('Workshop') && info.objective.includes('second Well'),
      `objective label unexpected: "${info.objective}"`
    );
    assert(text.objective.includes('Objective —'), `objective not displayed: "${text.objective}"`);
    assert(text.objective.includes('Constraint —'), `constraint not displayed: "${text.objective}"`);
    assert(text.objective.includes('Money 25, Water 51'), `constraint budget wrong: "${text.objective}"`);
    assert(text.stage === 'Village', `stage expected Village, got "${text.stage}"`);
    assert(s.money === '25', `Material expected 25, got ${s.money}`);
    assert(s.water === '51', `Water expected 51, got ${s.water}`);
    assert(s.food === '50', `Food expected 50, got ${s.food}`);
    assert(s.buildings === '4' && s.operational === '4', `initial buildings wrong: ${JSON.stringify(s)}`);
    assert(s.roads === '4' && s.operationalRoads === '4', `initial roads wrong: ${s.roads}/${s.operationalRoads}`);
    assert(s.colonists === '2' && s.jobs === '2 / 2', `workforce wrong: ${s.colonists}, ${s.jobs}`);
    // Step 10AR: the reserve covers the need and the flow is balanced.
    assert(s.waterSupply === 'supplied', `supply expected supplied at the start, got ${s.waterSupply}`);
    let objectiveState = await objective(page);
    assert(objectiveState?.state === 'in_progress', `objective expected in_progress, got ${JSON.stringify(objectiveState)}`);
    assert(
      JSON.stringify(objectiveState.blockers) === JSON.stringify(['Workshop built', 'Well built']),
      `initial blockers wrong: ${JSON.stringify(objectiveState.blockers)}`
    );
    assert(text.objectiveStatus.includes('1 / 3'), `objective status line wrong: "${text.objectiveStatus}"`);
    ok(`framing: "${text.stage}", objective "${info.objective}", Material ${s.money}, Water ${s.water}, blockers ${JSON.stringify(objectiveState.blockers)}`);
    await shot('01-scenario-start.png');

    // --- 2. Workshop construction costs 25 Material + 1 Water ------------
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    s = await placeAt(page, { x: 4, y: 2 });
    // Workshop-only income: the Farm/Well workers earn nothing before the
    // command, so the 25-cost placement leaves exactly 0.
    assert(s.money === '0', `Workshop must spend the whole Material: ${s.money}`);
    assert(s.water === '50', `Workshop must spend 1 Water: ${s.water}`);
    s = await step(page);
    s = await step(page);
    assert(s.workshops === '1' && s.staffedWorkshopIds === '', `Workshop expected operational and vacant: ${JSON.stringify(s)}`);
    objectiveState = await objective(page);
    assert(
      JSON.stringify(objectiveState.blockers) === JSON.stringify(['Well built']),
      `after the Workshop the only blocker must be the Well: ${JSON.stringify(objectiveState.blockers)}`
    );
    ok(`Workshop built: Material 25 -> ${s.money}, Water 51 -> ${s.water}, blockers ${JSON.stringify(objectiveState.blockers)}`);
    await shot('02-workshop-built.png');

    // --- 3. The industrial burst is a manual conversion ------------------
    // The inspector is colonist-centric: select the Well that holds the worker,
    // then choose the vacant Workshop as that worker's new workplace.
    await selectAt(page, { x: 3, y: 2 });
    const targets = await enabledTargets(page);
    assert(targets.length >= 1, `an eligible Workshop target is expected, got ${JSON.stringify(targets)}`);
    const workshopTarget = targets.find((target) => target.label.includes('Workshop'));
    assert(workshopTarget !== undefined, `the Workshop must be an eligible target: ${JSON.stringify(targets)}`);
    assert(workshopTarget.label.includes('workers 0/1'), `the Workshop target must be free: "${workshopTarget.label}"`);
    s = await moveWorker(page, workshopTarget.value);
    assert(s.manualWorkerIds !== '', `manual override expected, got "${s.manualWorkerIds}"`);
    assert(s.staffedWorkshopIds !== '', `the Workshop must be staffed, got "${s.staffedWorkshopIds}"`);
    // Step 10AR: the Well is unstaffed so the WATER FLOW stops while the
    // reserve still covers the need: "draining", not yet a shortage.
    assert(s.waterSupply === 'draining', `supply expected draining, got ${s.waterSupply}`);
    assert(s.waterProduction === '0', `the Well must be vacated (no production), got ${s.waterProduction}`);
    assert(s.status.includes('manual override'), `reassignment feedback missing: ${JSON.stringify(s.status)}`);
    ok(`burst started manually: workshop ${s.staffedWorkshopIds}, well "${s.staffedWellIds}", "${s.status}"`);
    await shot('03-burst-started.png');

    // 25 ticks of drain: the vacated Well stops the flow, so the 2 served
    // colonists spend the 50 reserve exactly. Step001: the treasury is
    // uncapped and stays clamped at 0 (revenue 4 = 2 taxes + 2 commerce vs
    // maintenance 5) — there is no storage bound to reach.
    const waterAtBurstStart = Number(s.water);
    for (let i = 0; i < 25; i += 1) s = await step(page);
    assert(Number(s.water) === 0, `the reserve must be exhausted after 25 ticks: ${s.water}`);
    assert(s.money === '0', `the treasury stays clamped at 0 (revenue 4 - maintenance 5), got ${s.money}`);
    assert(s.staffedWorkshopIds !== '', `the Workshop must still be staffed: "${s.staffedWorkshopIds}"`);
    // The Money row names the flow (the Step001 replacement for the old
    // storage note), so the treasury reading is causal, not opaque.
    const materialNote = await page.locator('[data-testid="stat-material-status"]').textContent();
    assert(
      materialNote.includes('revenue') && materialNote.includes('maintenance'),
      `Money row expected the flow note, got "${materialNote}"`
    );
    text = await progressionText(page);
    {
      const st = await objective(page);
      assert(st.state === 'in_progress', `objective must regress to in_progress while industry runs: ${JSON.stringify(st)}`);
      assert(st.blockers.includes('Reach Village'), `the Village requirement must be the blocker during the burst: ${JSON.stringify(st.blockers)}`);
    }
    assert(text.stage === 'Settlement', `industrialising must drop the stage out of Village: "${text.stage}"`);
    ok(`burst: Water ${waterAtBurstStart} -> ${s.water}, Money ${s.money}, stage "${text.stage}" (Village requirement unmet while the Well is unstaffed)`);
    await shot('04-burst-converted.png');

    // --- 4. The second Well is NOT fundable (Step001 D1 finding) ---------
    // The burst stock is gone and the treasury is clamped at 0 with a net
    // −1/tick, so neither the 25 Money nor the 1 construction Water can be
    // paid. This is the measured D1 reality recorded in
    // docs/audits/REPOSITORY-AUDIT-2026-10-08.md — not recalibrated here.
    await selectPalette(page, 'build-well', 'Well selected');
    const wellPt = await moveTo(page, { x: 2, y: 2 });
    await waitFor(
      async () => /insufficient/.test((await stats(page)).status),
      'the second Well must show an insufficient preview'
    );
    const beforeSecondWell = await stats(page);
    await page.mouse.click(wellPt.x, wellPt.y);
    await new Promise((r) => setTimeout(r, 300));
    s = await stats(page);
    assert(s.buildings === beforeSecondWell.buildings, `the unfunded Well must be rejected: ${JSON.stringify(s)}`);
    assert(s.money === '0', `the rejected Well must not spend: ${s.money}`);
    ok(`second Well rejected unfunded (status "${s.status}"), blockers unchanged`);
    await shot('05-second-well.png');

    // --- 5. The recovery restores Village; the objective stays open ------
    // Select the Workshop (which now holds the worker) and send it back.
    await selectAt(page, { x: 4, y: 2 });
    const backTargets = await enabledTargets(page);
    const wellTarget = backTargets.find((target) => target.label.includes('Well'));
    assert(wellTarget !== undefined, `the Well must be an eligible target again: ${JSON.stringify(backTargets)}`);
    s = await moveWorker(page, wellTarget.value);
    for (let i = 0; i < 3; i += 1) s = await step(page);
    assert(s.waterProduction === '2' && s.staffedWorkshopIds === '', `recovery must staff the Well and vacate the Workshop: ${JSON.stringify(s)}`);
    // RECORDED (Step 10AQ, not fixed): the burst spends the reserve, so the
    // recovered colony has production == need with a 0 stock and the HUD
    // reports Water "not sustainable" (stock-based label) while the objective's
    // Village condition (capacity-based) is met.
    assert(s.water === '0' && s.waterSustainable === 'false', `the spent reserve must read 0: ${JSON.stringify(s)}`);
    // Step 10AR: the recovered colony has production == need with an empty
    // reserve: `noReserve` (a named cause), not the conflated "shortage" word.
    assert(s.waterSupply === 'noReserve', `supply expected noReserve after recovery, got ${s.waterSupply}`);
    assert(
      (await page.locator('[data-testid="stat-water-status"]').textContent()).includes('reserve 0'),
      'the HUD must name the empty reserve after recovery'
    );
    text = await progressionText(page);
    assert(text.stage === 'Village', `recovery must restore Village: "${text.stage}"`);
    const finalObjective = await objective(page);
    // The second Well was never fundable (D1), so the objective stays
    // in_progress with exactly the Well blocker — the measured Step001 end
    // state of this scenario.
    assert(finalObjective?.state === 'in_progress', `objective expected in_progress (second Well unfunded), got ${JSON.stringify(finalObjective)}`);
    assert(
      JSON.stringify(finalObjective.blockers) === JSON.stringify(['Well built']),
      `the only remaining blocker must be the Well: ${JSON.stringify(finalObjective.blockers)}`
    );
    ok(`recovery: stage "${text.stage}", water production ${s.waterProduction}, objective open on the unfunded Well (D1)`);
    await shot('06-complete.png');

    // --- 6. Persistence boundaries ---------------------------------------
    const first = JSON.stringify(await progression(page));
    const second = JSON.stringify(await progression(page));
    assert(first === second, 'progression must be recomputed identically');
    const saved = JSON.parse(await page.evaluate(() => window.__nova.serialize()));
    assert(saved.version === 10, `save version expected 10, got ${saved.version}`);
    assert(Object.keys(saved.state).length === 9, `save must keep 9 top-level keys, got ${Object.keys(saved.state).length}`);
    const serialized = JSON.stringify(saved);
    for (const term of ['scenario', 'progression', 'stage', 'objective', 'blocker']) {
      assert(!serialized.includes(term), `save must not contain "${term}"`);
    }
    ok('progression recomputed deterministically; save keeps version 8 with 8 keys and no scenario state');
    await shot('07-persistence.png');

    // --- 7. Console/page errors ------------------------------------------
    assert(errors.length === 0, `console/page errors: ${JSON.stringify(errors)}`);
    ok('zero console/page errors');
    console.log('INDUSTRIAL E2E RESULT: ALL PASS');
  } finally {
    if (browser) await browser.close();
    preview.kill();
  }
}

main().catch((error) => {
  fail(error.message);
});
