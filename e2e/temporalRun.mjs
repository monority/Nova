/* NOVA Step 3 temporal E2E. Plain Node, playwright core only.
 * Causal temporal inspection in a real browser:
 *   LOAD -> placement -> select -> construction -> STEP -> operational
 *   -> colonist/residence -> PLAY/PAUSE -> speed change (deterministic STEP).
 * Screenshots: artifacts/temporal/01..05.
 * Mode: headed by default (real display), override NOVA_TEMPORAL_MODE=headless.
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

const PORT = 4175;
const URL = `http://localhost:${PORT}/`;
const ART = 'artifacts/temporal';
const MODE = (process.env.NOVA_TEMPORAL_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';

const fail = (msg) => {
  console.error(`TEMPORAL E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`TEMPORAL E2E PASS: ${msg}`);

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

async function clickCell(page, cell) {
  const pt = await page.evaluate((c) => window.__nova.cellToScreen(c), cell);
  if (!pt) throw new Error(`cellToScreen null for ${cell.x},${cell.y}`);
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.click(pt.x, pt.y);
}

const stats = (page) => page.evaluate(() => window.__nova.stats());
const selected = (page) => page.evaluate(() => window.__nova.selectedBuilding());
const at = (page, cell) => page.evaluate((c) => window.__nova.buildingAt(c), cell);

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

    // Initial state.
    await page.goto(URL, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
    ok('load, app ready');
    let s = await stats(page);
    if (s.tick !== '0' || s.buildings !== '0' || s.colonists !== '0') fail(`initial stats bad: ${JSON.stringify(s)}`);
    else ok('initial Tick=0 Buildings=0 Colonists=0');
    await shot('01-initial.png');

    // Placement at (6,6): building-1 under construction.
    await clickCell(page, { x: 6, y: 6 });
    await waitFor(async () => (await stats(page)).buildings === '1', 'building placed');
    s = await stats(page);
    if (s.tick !== '1' || s.buildings !== '1') fail(`after placement bad: ${JSON.stringify(s)}`);
    else ok(`building placed, ${JSON.stringify(s)}`);

    // Select the building by clicking it again.
    await clickCell(page, { x: 6, y: 6 });
    await waitFor(async () => (await selected(page))?.id === 'building-1', 'building selected');
    let insp = await selected(page);
    // Step 10Y: no placement catch-up — the catalog's 2 ticks are literal.
    if (insp?.status !== 'underConstruction' || insp?.constructionRemaining !== 2) {
      fail(`inspection under construction expected, got ${JSON.stringify(insp)}`);
    } else ok(`inspection: ${insp.status}, ${insp.constructionRemaining}/${insp.constructionDuration} ticks, capacity ${insp.housingCapacity}`);
    await shot('02-construction.png');

    // Second placement at (4,4): tick 2. building-1 has one construction tick
    // left while building-2 is freshly started: temporal contrast.
    await clickCell(page, { x: 4, y: 4 });
    await waitFor(async () => (await stats(page)).tick === '2', 'tick 2 after second placement');
    const b1 = await at(page, { x: 6, y: 6 });
    const b2 = await at(page, { x: 4, y: 4 });
    if (b1?.status !== 'underConstruction' || b1?.constructionRemaining !== 1) fail(`b1 should have 1 tick left, got ${JSON.stringify(b1)}`);
    else ok(`building-1 has ${b1.constructionRemaining} construction tick left`);
    if (b2?.status !== 'underConstruction' || b2?.constructionRemaining !== 2) fail(`b2 should be under construction, got ${JSON.stringify(b2)}`);
    else ok(`building-2 under construction, ${b2.constructionRemaining}/${b2.constructionDuration} ticks`);
    s = await stats(page);
    if (s.colonists !== '0') fail(`no colonist yet, got ${JSON.stringify(s)}`);
    else ok(`no colonist before the first residence is operational, ${JSON.stringify(s)}`);
    await clickCell(page, { x: 4, y: 4 });
    await waitFor(async () => (await selected(page))?.id === 'building-2', 'building-2 selected');
    await shot('03-progress.png');

    // STEP: building-1 becomes operational, first colonist admitted.
    await page.click('[data-testid="simulation-step"]');
    await waitFor(async () => (await stats(page)).tick === '3', 'step to tick 3');
    const b1After = await at(page, { x: 6, y: 6 });
    if (b1After?.status !== 'operational' || b1After?.occupiedHousing !== 1) fail(`b1 should be operational, got ${JSON.stringify(b1After)}`);
    else ok(`building-1 operational with ${b1After.occupiedHousing} resident`);
    s = await stats(page);
    if (s.colonists !== '1') fail(`colonists should be 1, got ${JSON.stringify(s)}`);
    else ok(`colonist admitted from real housing capacity, ${JSON.stringify(s)}`);

    // STEP: building-2 becomes operational, second colonist admitted.
    await page.click('[data-testid="simulation-step"]');
    await waitFor(async () => (await stats(page)).tick === '4', 'step to tick 4');
    insp = await selected(page);
    if (insp?.status !== 'operational' || insp?.occupiedHousing !== 1) fail(`b2 should be operational, got ${JSON.stringify(insp)}`);
    else ok(`inspection after STEP: ${insp.status}, ${insp.occupiedHousing} resident`);
    await shot('04-operational.png');

    // Select building-1: its inspection shows the residence relation.
    await clickCell(page, { x: 6, y: 6 });
    await waitFor(async () => (await selected(page))?.id === 'building-1', 'building-1 reselected');
    insp = await selected(page);
    if (insp?.status !== 'operational' || insp?.occupiedHousing !== 1) fail(`b1 reselect bad: ${JSON.stringify(insp)}`);
    else ok(`building-1 residence visible, ${insp.occupiedHousing} resident`);
    s = await stats(page);
    if (s.colonists !== '2') fail(`colonists should be 2, got ${JSON.stringify(s)}`);
    else ok(`two colonists with assigned residences, ${JSON.stringify(s)}`);
    await shot('05-colonist.png');

    // PLAY: ticks progress (construction would complete; here state is stable).
    const beforePlay = Number((await stats(page)).tick);
    await page.click('[data-testid="simulation-play"]');
    await waitFor(async () => Number((await stats(page)).tick) > beforePlay, 'play advances ticks');
    ok('PLAY advances ticks');

    // PAUSE: ticks stop advancing.
    await page.click('[data-testid="simulation-pause"]');
    const pausedTick = Number((await stats(page)).tick);
    await new Promise((r) => setTimeout(r, 800));
    const afterWait = Number((await stats(page)).tick);
    if (afterWait !== pausedTick) fail(`tick advanced while paused: ${pausedTick} -> ${afterWait}`);
    else ok(`PAUSE stops ticks at tick ${pausedTick}`);

    // Speed change keeps STEP deterministic (grid simulation unaffected).
    await page.selectOption('#speed', '4');
    await page.click('[data-testid="simulation-play"]');
    await waitFor(async () => Number((await stats(page)).tick) >= pausedTick + 4, '4x speed accelerates');
    ok('4x speed accelerates ticks');
    await page.click('[data-testid="simulation-pause"]');
    const fastPaused = Number((await stats(page)).tick);
    await page.click('[data-testid="simulation-step"]');
    await waitFor(async () => Number((await stats(page)).tick) === fastPaused + 1, 'deterministic STEP');
    ok(`STEP after speed change still advances exactly one tick (${fastPaused} -> ${fastPaused + 1})`);
    s = await stats(page);
    if (s.buildings !== '2') fail(`buildings changed: ${JSON.stringify(s)}`);
    else ok('buildings stable (2) across PLAY/PAUSE/speed');

    const realErrors = errors.filter((e) => !e.includes('favicon'));
    if (realErrors.length > 0) fail(`browser errors: ${realErrors.join(' | ')}`);
    else ok('zero console/page errors');
  } catch (e) {
    if (!process.exitCode) {
      console.error(`TEMPORAL E2E FAIL: ${e.message}`);
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('TEMPORAL E2E RESULT: FAIL');
  else console.log('TEMPORAL E2E RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`TEMPORAL E2E FAIL: ${e.message}`);
  process.exitCode = 1;
});