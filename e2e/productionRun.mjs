/* NOVA Step 06B production E2E. Plain Node, playwright core only.
 * Real browser causal proof: housing -> colonists -> food consumption ->
 * farm production -> colony sustained (net +2 food/tick, no starvation).
 * Also covers Part A UX: arrival/consumption messages, forecast, farm button.
 * Screenshots: artifacts/production/01..04.
 * Mode: headed by default, override NOVA_PRODUCTION_MODE=headless.
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

const PORT = 4179;
const URL = `http://localhost:${PORT}/`;
const ART = 'artifacts/production';
const MODE = (process.env.NOVA_PRODUCTION_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';

const fail = (msg) => {
  console.error(`PRODUCTION E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`PRODUCTION E2E PASS: ${msg}`);

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

async function clickCell(page, cell) {
  const pt = await page.evaluate((c) => window.__nova.cellToScreen(c), cell);
  if (!pt) throw new Error(`cellToScreen null for ${cell.x},${cell.y}`);
  await page.mouse.move(pt.x, pt.y);
  await waitFor(async () => (await stats(page)).status.includes('ready'), `valid preview at ${cell.x},${cell.y}`);
  await page.mouse.click(pt.x, pt.y);
}

async function step(page) {
  await page.click('[data-testid="simulation-step"]');
}

async function stepToTick(page, target) {
  const before = Number((await stats(page)).tick);
  if (before >= target) throw new Error(`already past tick ${target} (at ${before})`);
  for (let t = before; t < target; t++) {
    await step(page);
    const expectTick = t + 1;
    await waitFor(async () => Number((await stats(page)).tick) === expectTick, `tick ${expectTick}`);
  }
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

    // A. Initial state.
    await page.goto(URL, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
    ok('load, app ready');
    let s = await stats(page);
    if (s.tick !== '0' || s.food !== '100' || s.construction !== '100' || s.colonists !== '0' || s.farms !== '0') {
      fail(`initial stats bad: ${JSON.stringify(s)}`);
    } else ok(`initial stock: food ${s.food}, material ${s.construction}, colonists ${s.colonists}, farms ${s.farms}`);
    await shot('01-initial.png');

    // B. Two residences with real clicks (ticks 1-2). Residence is default.
    await clickCell(page, { x: 6, y: 6 });
    await clickCell(page, { x: 4, y: 4 });
    await waitFor(async () => (await stats(page)).buildings === '2', 'two residences placed');

    // C. Switch to Farm palette, place two farms (ticks 3-4).
    await page.click('[data-testid="build-farm"]');
    s = await stats(page);
    if (!s.status.includes('Farm selected')) {
      fail(`farm palette feedback missing: ${JSON.stringify(s.status)}`);
    } else ok(`palette switch: "${s.status}"`);
    await clickCell(page, { x: 2, y: 2 });
    await clickCell(page, { x: 0, y: 0 });
    await waitFor(async () => (await stats(page)).buildings === '4', 'two farms placed');
    s = await stats(page);
    if (s.construction !== '0' || s.farms !== '2') {
      fail(`after placements expected material 0 / farms 2, got ${JSON.stringify(s)}`);
    } else ok(`material depleted 100 -> 0, farms ${s.farms}`);
    await shot('02-colonists.png');

    // D. STEP to tick 6: residences operational (ends of ticks 2-3) admit 2
    // colonists; farms operational (ends of ticks 4-5) produce the same
    // ticks they complete (production precedes consumption). Expected: 103.
    // Trace: t1 place (100, pop 0); t2 A operational, c1 admitted (100);
    // t3 B operational, c2 admitted, consume 1 -> 99; t4 C operational:
    // produce +2 -> 101, consume 2 -> 99; t5 D operational: +4 -> 103, -2
    // -> 101; t6: +4 -> 105, -2 -> 103.
    await stepToTick(page, 6);
    s = await stats(page);
    if (s.colonists !== '2' || s.operational !== '4' || s.food !== '103') {
      fail(`tick 6 state bad: ${JSON.stringify(s)}`);
    } else ok(`tick 6: 2 colonists, 4 operational, food ${s.food}`);
    if (s.foodStatus !== 'fed') {
      fail(`foodStatus expected 'fed', got ${s.foodStatus}`);
    } else ok(`foodStatus fed, UI: "${s.status}" forecast ~${s.foodForecast} ticks`);
    if (s.foodForecast === '') fail('forecast empty while colony alive');
    await shot('03-producing.png');

    // E. Sustained loop: every tick net food delta is exactly +2
    // (2 farms x +2 production, 2 colonists x -1 consumption).
    let prev = Number(s.food);
    for (let i = 0; i < 10; i++) {
      const tickBefore = Number((await stats(page)).tick);
      await step(page);
      await waitFor(async () => Number((await stats(page)).tick) === tickBefore + 1, `sustain tick ${i + 1}`);
      s = await stats(page);
      const delta = Number(s.food) - prev;
      if (delta !== 2 || s.colonists !== '2' || s.foodStatus !== 'fed') {
        fail(`sustain tick ${i + 1}: expected delta +2 / 2 colonists / fed, got delta ${delta}, ${JSON.stringify(s)}`);
      }
      prev = Number(s.food);
    }
    ok(`sustained 10 ticks at net +2 food/tick, food now ${s.food}, colony alive`);
    await shot('04-sustained.png');

    // F. PLAY: colony keeps thriving under continuous ticks (no starvation).
    await page.click('[data-testid="simulation-play"]');
    await new Promise((r) => setTimeout(r, 1500));
    await page.click('[data-testid="simulation-pause"]');
    s = await stats(page);
    if (s.colonists !== '2' || s.foodStatus !== 'fed' || Number(s.food) <= prev) {
      fail(`PLAY regression: ${JSON.stringify(s)}`);
    } else ok(`PLAY thriving: food ${s.food}, colonists ${s.colonists}, status "${s.status}"`);

    const realErrors = errors.filter((e) => !e.includes('favicon'));
    if (realErrors.length > 0) fail(`browser errors: ${realErrors.join(' | ')}`);
    else ok('zero console/page errors');
  } catch (e) {
    if (!process.exitCode) {
      console.error(`PRODUCTION E2E FAIL: ${e.message}`);
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('PRODUCTION E2E RESULT: FAIL');
  else console.log('PRODUCTION E2E RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`PRODUCTION E2E FAIL: ${e.message}`);
  process.exitCode = 1;
});
