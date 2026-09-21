/* NOVA Step 10Y construction crew E2E — plain Node, playwright core only.
 *
 * Real browser proof of the manual construction crew control:
 *   - A: an uncrewed 2-tick building takes two construction ticks;
 *   - B: a crewed 2-tick building completes on the tick the crew is assigned;
 *   - C: the crew member produces no workplace output on that tick;
 *   - D: construction completion releases the crew and normal work resumes;
 *   - E: two colonists crew two sites independently (one per tick);
 *   - F: an operational building exposes no crew control (no invalid command);
 *   - G: constructionAssignmentId is part of the canonical save payload.
 *
 * All state changes come from real palette clicks on the canvas, the real
 * inspector select + buttons, and the real STEP control. window.__nova is only
 * read (never mutated).
 *
 * Mode: headed by default, override NOVA_CREW_MODE=headless.
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

const PORT = 4184;
const URL = `http://localhost:${PORT}/`;
const ART = 'artifacts/crew';
const MODE = (process.env.NOVA_CREW_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';

const fail = (msg) => {
  console.error(`CREW E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`CREW E2E PASS: ${msg}`);

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
  try {
    await waitFor(async () => (await stats(page)).status.includes('ready'), `valid preview at ${cell.x},${cell.y}`);
  } catch (e) {
    throw new Error(`${e.message} — status "${(await stats(page)).status}"`);
  }
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

const crewText = (page) => page.locator('[data-testid="inspection-crew"]').textContent();
const crewRowVisible = (page) =>
  page.locator('[data-testid="crew-row"]').isVisible();

async function crewOptions(page) {
  return page.$$eval('[data-testid="crew-target"] option', (opts) =>
    opts.map((o) => ({ value: o.value, label: o.textContent ?? '', disabled: o.disabled }))
  );
}

async function assignCrew(page, colonistId) {
  await page.selectOption('[data-testid="crew-target"]', colonistId);
  await page.click('[data-testid="crew-confirm"]');
  return stats(page);
}

/** Step until the construction stock covers a 25-cost build. */
async function stepUntilAffordable(page, cost = 25, maxTicks = 60) {
  for (let i = 0; i < maxTicks; i += 1) {
    if (Number((await stats(page)).construction) >= cost) return stats(page);
    await step(page);
  }
  throw new Error(`material never reached ${cost}: ${JSON.stringify(await stats(page))}`);
}

async function fresh(page) {
  await page.goto(URL, { waitUntil: 'load' });
  await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
  return stats(page);
}

/** Residence + colonist-1 (two construction ticks), plus a road at (3,2). */
async function bootstrapResidence(page) {
  await selectPalette(page, 'build-residence', 'Residence selected');
  await placeAt(page, { x: 2, y: 2 }); // t1: placed (2 ticks remaining)
  await step(page); // t2: 1 construction tick left
  const s = await step(page); // t3: operational + colonist-1
  assert(s.colonists === '1', `bootstrap colonist expected, got ${s.colonists}`);
  assert(s.operational === '1', `residence should be operational, got ${s.operational}`);
  return s;
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
    // Setup — a staffed Workshop, so a crew has a measurable cost
    // ---------------------------------------------------------------------
    let s = await fresh(page);
    assert(s.tick === '0' && s.construction === '100', `fresh state bad: ${JSON.stringify(s)}`);
    s = await bootstrapResidence(page);
    ok(`bootstrap: residence operational at tick ${s.tick} with ${s.colonists} colonist`);

    // Two Workshops (only one can be staffed by a single colonist): the second
    // raises the storage cap to 50, so the stock climbs past the 25 build cost
    // (a lone staffed Workshop equilibrates at 24, below it).
    await selectPalette(page, 'build-road', 'Road selected');
    await placeRoad(page, { x: 3, y: 2 });
    await step(page); // road operational
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 3, y: 3 });
    await step(page); // 1 construction tick left
    await step(page); // operational + staffed
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 4, y: 2 });
    await step(page); // 1 construction tick left
    s = await step(page); // second Workshop operational (vacant)
    await stepUntilAffordable(page);
    s = await stats(page);
    assert(s.staffedWorkshopIds !== '', `Workshop should be staffed, got ${JSON.stringify(s)}`);
    assert(s.materialProduction === '2', `Workshop should produce 2, got ${s.materialProduction}`);
    const materialBefore = Number(s.construction);
    ok(`setup: Workshop staffed, material ${s.construction}, production ${s.materialProduction}`);

    // ---------------------------------------------------------------------
    // Scenario A — basic construction: uncrewed 2-tick building
    // ---------------------------------------------------------------------
    // The Well is placed away from the network, so it can never steal the
    // Workshop worker and the comparison stays isolated.
    await selectPalette(page, 'build-well', 'Well selected');
    await placeAt(page, { x: 7, y: 7 });
    s = await step(page); // 1 construction tick left
    assert(s.operational === '3', `Well must still be under construction, got ${JSON.stringify(s)}`);
    await selectAt(page, { x: 7, y: 7 });
    let crew = await crewText(page);
    assert(crew === 'Crew — None · Speed normal', `uncrewed crew line bad: "${crew}"`);
    ok(`A: uncrewed Well at tick ${s.tick}, inspection "${crew}"`);
    await shot('01-uncrewed.png');
    s = await step(page);
    assert(s.operational === '4', `uncrewed Well must complete on the second tick, got ${JSON.stringify(s)}`);
    ok(`A: uncrewed 2-tick Well complete at tick ${s.tick}`);

    // ---------------------------------------------------------------------
    // Scenario B/C/D — crewed construction, worker tradeoff, release
    // ---------------------------------------------------------------------
    await stepUntilAffordable(page);
    await selectPalette(page, 'build-farm', 'Farm selected');
    await placeAt(page, { x: 5, y: 5 });
    await step(page); // 1 construction tick left
    await selectAt(page, { x: 5, y: 5 });
    crew = await crewText(page);
    assert(crew === 'Crew — None · Speed normal', `crew line before assignment bad: "${crew}"`);
    const options = await crewOptions(page);
    assert(options.length === 1 && options[0].value === 'colonist-1', `one crew candidate expected, got ${JSON.stringify(options)}`);
    assert(options[0].disabled === false, `colonist-1 should be eligible, got ${JSON.stringify(options)}`);
    await shot('02-crew-options.png');

    // Assign the crew: the Farm completes on THIS tick, the Workshop goes vacant.
    s = await assignCrew(page, 'colonist-1');
    assert(s.operational === '5', `crewed Farm must complete on the assignment tick, got ${JSON.stringify(s)}`);
    assert(s.crewWorkerIds === '', `crew must be released on completion, got "${s.crewWorkerIds}"`);
    assert(s.staffedWorkshopIds === '', `crew member must not staff the Workshop that tick, got "${s.staffedWorkshopIds}"`);
    assert(s.materialProduction === '0', `crew member must produce nothing that tick, got ${s.materialProduction}`);
    assert(Number(s.construction) <= materialBefore, `material must not grow on a crew tick: ${materialBefore} -> ${s.construction}`);
    assert(s.status.includes('Construction crew assigned'), `crew feedback missing: ${JSON.stringify(s.status)}`);
    ok(`B/C: crewed Farm completed at tick ${s.tick}, Workshop vacant, production ${s.materialProduction}, material ${s.construction}`);
    await shot('03-crewed.png');

    // D: the released colonist returns to normal work on the next tick.
    s = await step(page);
    assert(s.staffedWorkshopIds !== '', `released colonist must resume the Workshop, got "${s.staffedWorkshopIds}"`);
    assert(s.materialProduction === '2', `Workshop production must resume, got ${s.materialProduction}`);
    assert(s.crewWorkerIds === '', `no ghost crew allowed, got "${s.crewWorkerIds}"`);
    ok(`D: colonist released and back at work at tick ${s.tick} (production ${s.materialProduction})`);
    await shot('04-recovered.png');

    // ---------------------------------------------------------------------
    // Scenario E — two colonists crew two sites independently
    // ---------------------------------------------------------------------
    await fresh(page);
    await bootstrapResidence(page);
    await stepUntilAffordable(page);
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 6, y: 6 });
    await step(page); // 1 left
    await step(page); // operational + colonist-2
    s = await stats(page);
    assert(s.colonists === '2', `two colonists expected, got ${s.colonists}`);

    // Site 1: colonist-1 crews it and it completes on that tick.
    await stepUntilAffordable(page);
    await selectPalette(page, 'build-well', 'Well selected');
    await placeAt(page, { x: 4, y: 2 }); // site 1
    await step(page); // 1 construction tick left
    await selectAt(page, { x: 4, y: 2 });
    s = await assignCrew(page, 'colonist-1');
    const site1Done = s.operational;
    assert(s.crewWorkerIds === '', `first crew released, got "${s.crewWorkerIds}"`);
    // Site 2: colonist-2 crews it independently on a later tick.
    await stepUntilAffordable(page);
    await selectPalette(page, 'build-well', 'Well selected');
    await placeAt(page, { x: 8, y: 8 }); // site 2
    await step(page); // 1 construction tick left
    await selectAt(page, { x: 8, y: 8 });
    const options2 = await crewOptions(page);
    assert(options2.some((o) => o.value === 'colonist-2'), `colonist-2 should still be a candidate, got ${JSON.stringify(options2)}`);
    s = await assignCrew(page, 'colonist-2');
    assert(Number(s.operational) === Number(site1Done) + 1, `second crew must complete the second site independently, got ${JSON.stringify(s)}`);
    assert(s.crewWorkerIds === '', `both crews released, got "${s.crewWorkerIds}"`);
    ok(`E: two sites crewed by two colonists independently (operational ${s.operational})`);
    await shot('05-two-sites.png');

    // ---------------------------------------------------------------------
    // Scenario F — operational buildings expose no crew control
    // ---------------------------------------------------------------------
    await selectAt(page, { x: 4, y: 2 });
    assert((await crewRowVisible(page)) === false, 'crew control must be hidden for an operational building');
    assert((await crewText(page)) === '', `crew line must be empty for an operational building, got "${await crewText(page)}"`);
    const beforeInvalid = await stats(page);
    const afterInvalid = await step(page);
    assert(afterInvalid.crewWorkerIds === '', `no crew may appear from an invalid path, got "${afterInvalid.crewWorkerIds}"`);
    assert(afterInvalid.buildings === beforeInvalid.buildings, 'invalid path must not mutate buildings');
    ok('F: operational building has no crew control; no state mutation');
    await shot('06-no-control.png');

    // ---------------------------------------------------------------------
    // Scenario G — constructionAssignmentId is part of canonical save state
    // ---------------------------------------------------------------------
    const payload = await page.evaluate(() => window.__nova.serialize());
    const parsed = JSON.parse(payload);
    assert(parsed.version === 7, `save version expected 7, got ${parsed.version}`);
    const colonists = Object.values(parsed.state.colonists);
    assert(colonists.length >= 1, `save should contain colonists, got ${colonists.length}`);
    assert(
      colonists.every((c) => Object.prototype.hasOwnProperty.call(c, 'constructionAssignmentId')),
      'every colonist must carry constructionAssignmentId in the save'
    );
    assert(colonists.every((c) => c.constructionAssignmentId === null), 'idle colonists carry null');
    ok(`G: save version ${parsed.version}, constructionAssignmentId in canonical save state`);
    await shot('07-save.png');

    const realErrors = errors.filter((e) => !e.includes('favicon'));
    if (realErrors.length > 0) fail(`browser errors: ${realErrors.join(' | ')}`);
    else ok('zero console/page errors');
  } catch (e) {
    if (!process.exitCode) {
      console.error(`CREW E2E FAIL: ${e.message}`);
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('CREW E2E RESULT: FAIL');
  else console.log('CREW E2E RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`CREW E2E FAIL: ${e.message}`);
  process.exitCode = 1;
});
