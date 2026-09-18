/* NOVA Step 09A transport network E2E. Plain Node, playwright core only.
 * Real browser proof of abstract spatial connectivity:
 *   Residence -> adjacent Farm -> adjacent Workshop: all accessible (3)
 *   disconnected Workshop far away: inaccessible (count stays 3)
 * All state changes come from real palette clicks on the canvas and real
 * STEP controls. window.__nova is only read (never mutated); the accessible
 * count is asserted on the test-only __nova.stats surface (Step 09A §19).
 * Screenshots: artifacts/transport/01..03.
 * Mode: headed by default, override NOVA_TRANSPORT_MODE=headless.
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
const ART = 'artifacts/transport';
const MODE = (process.env.NOVA_TRANSPORT_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';

const fail = (msg) => {
  console.error(`TRANSPORT E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`TRANSPORT E2E PASS: ${msg}`);

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

/** Real canvas click on an empty cell: places the currently selected type. */
async function placeAt(page, cell) {
  const pt = await moveTo(page, cell);
  await waitFor(async () => (await stats(page)).status.includes('ready'), `valid preview at ${cell.x},${cell.y}`);
  const before = Number((await stats(page)).buildings);
  await page.mouse.click(pt.x, pt.y);
  await waitFor(async () => Number((await stats(page)).buildings) === before + 1, `placed at ${cell.x},${cell.y}`);
}

/** Real canvas click through an "insufficient" hover (Step 08G): the rest
 * stock is below cost, but this tick's stored production covers the
 * shortfall, so the domain accepts the transaction mid-tick. */
async function placeThroughShortfall(page, cell) {
  const pt = await moveTo(page, cell);
  await waitFor(async () => (await stats(page)).status.includes('insufficient material'), `shortfall preview at ${cell.x},${cell.y}`);
  const before = Number((await stats(page)).buildings);
  await page.mouse.click(pt.x, pt.y);
  await waitFor(async () => Number((await stats(page)).buildings) === before + 1, `gate-covered placement at ${cell.x},${cell.y}`);
}

async function selectPalette(page, testid, expectedLabel) {
  await page.click(`[data-testid="${testid}"]`);
  const s = await stats(page);
  if (!s.status.includes(expectedLabel)) throw new Error(`palette feedback missing for ${testid}: ${JSON.stringify(s.status)}`);
  return s;
}

/** STEP until a predicate on stats holds (construction needs ticks). */
async function stepUntil(page, pred, label, maxTicks = 30) {
  for (let i = 0; i < maxTicks; i++) {
    const s = await stats(page);
    if (pred(s)) return s;
    await step(page);
  }
  throw new Error(`timeout: ${label}`);
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

    // A. Fresh: no buildings, accessible 0.
    await page.goto(URL, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
    ok('load, app ready');
    let s = await stats(page);
    if (s.tick !== '0' || s.accessibleBuildings !== '0') {
      fail(`A fresh bad: ${JSON.stringify(s)}`);
    } else ok(`A fresh: accessible ${s.accessibleBuildings}`);
    await shot('01-fresh.png');

    // B. Residence -> operational root, accessible 1.
    // Note: canvas placement dispatches through a simulation tick, so the
    // Residence is under construction at tick 1 and operational at tick 2.
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, { x: 4, y: 4 });
    s = await stats(page);
    if (s.accessibleBuildings !== '0') {
      fail(`B under-construction residence must be inaccessible: ${JSON.stringify(s)}`);
    } else ok('B under-construction residence inaccessible');
    s = await stepUntil(page, (v) => v.operational === '1', 'residence operational', 10);
    if (s.accessibleBuildings !== '1') {
      fail(`B root bad: ${JSON.stringify(s)}`);
    } else ok(`B root residence accessible: ${s.accessibleBuildings}`);

    // C. Adjacent Farm -> operational, accessible 2.
    await selectPalette(page, 'build-farm', 'Farm selected');
    await placeAt(page, { x: 4, y: 5 });
    s = await stepUntil(page, (v) => v.accessibleBuildings === '2', 'farm accessible', 10);
    ok(`C adjacent farm accessible: ${s.accessibleBuildings}`);
    await shot('02-farm.png');

    // D. Disconnected Workshop far away -> operational but still inaccessible.
    // Placed third (stock 50 -> 25): the fourth placement needs pre-tick
    // stock >= 25 for a 'ready' preview, and a staffed Workshop equilibrates
    // below 25 (Step 08F), so the disconnected building goes before the
    // connected one.
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, { x: 0, y: 0 });
    s = await stepUntil(page, (v) => v.operational === '3', 'disconnected operational', 10);
    if (s.accessibleBuildings !== '2') {
      fail(`D disconnected must stay inaccessible: ${JSON.stringify(s)}`);
    } else ok(`D disconnected workshop inaccessible: accessible ${s.accessibleBuildings}, operational ${s.operational}`);

    // E. Workshop adjacent to the Farm (multi-hop R-F-W) -> accessible 3.
    // The staffed disconnected Workshop equilibrates the stock at 24 (Step
    // 08F), so the click goes through the Step 08G same-tick gate: rest 24 +
    // stored 1 covers the 25 cost mid-tick.
    await placeThroughShortfall(page, { x: 4, y: 6 });
    s = await stepUntil(page, (v) => v.accessibleBuildings === '3', 'workshop accessible', 10);
    s = await stats(page);
    if (s.operational !== '4' || s.accessibleBuildings !== '3') {
      fail(`E network bad: ${JSON.stringify(s)}`);
    } else ok(`E multi-hop network: accessible ${s.accessibleBuildings}, operational ${s.operational}`);
    await shot('03-network.png');

    const realErrors = errors.filter((e) => !e.includes('favicon'));
    if (realErrors.length > 0) fail(`browser errors: ${realErrors.join(' | ')}`);
    else ok('zero console/page errors');
  } catch (e) {
    if (!process.exitCode) {
      console.error(`TRANSPORT E2E FAIL: ${e.message}`);
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('TRANSPORT E2E RESULT: FAIL');
  else console.log('TRANSPORT E2E RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`TRANSPORT E2E FAIL: ${e.message}`);
  process.exitCode = 1;
});
