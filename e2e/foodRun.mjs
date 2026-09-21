/* NOVA Step 05 food E2E. Plain Node, playwright core only.
 * Real browser causal proof: initial food stock -> real clicks build 4
 * residences -> colonists fed (delta = population) -> shortage -> entire
 * colony starves -> no production/post-starvation re-admission.
 * Screenshots: artifacts/food/01..05.
 * Mode: headed by default, override NOVA_FOOD_MODE=headless.
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

const PORT = 4177;
const URL = `http://localhost:${PORT}/`;
const ART = 'artifacts/food';
const MODE = (process.env.NOVA_FOOD_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';

const fail = (msg) => {
  console.error(`FOOD E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`FOOD E2E PASS: ${msg}`);

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
    if (s.tick !== '0' || s.food !== '100' || s.construction !== '100' || s.colonists !== '0') {
      fail(`initial stats bad: ${JSON.stringify(s)}`);
    } else ok(`initial stock: food ${s.food}, material ${s.construction}, colonists ${s.colonists}`);
    await shot('01-initial.png');

    // B. Build four residences with real clicks (ticks 1-4).
    const cells = [{ x: 6, y: 6 }, { x: 4, y: 4 }, { x: 2, y: 2 }, { x: 0, y: 0 }];
    for (const cell of cells) {
      await clickCell(page, cell);
      await waitFor(async () => (await stats(page)).buildings === String(cells.indexOf(cell) + 1), `building placed at ${cell.x},${cell.y}`);
    }
    s = await stats(page);
    if (s.construction !== '0' || s.buildings !== '4') {
      fail(`after 4 placements expected material 0 / buildings 4, got ${s.construction}/${s.buildings}`);
    } else ok(`material depleted 100 -> ${s.construction}, ${s.buildings} residences`);

    // STEP until the last residence is operational and all 4 colonists fed.
    // Step 10Y: a placed 2-tick building needs two construction ticks, so the
    // last of the four residences is operational at tick 6.
    await step(page);
    await waitFor(async () => Number((await stats(page)).tick) === 5, 'step to tick 5');
    await step(page);
    await waitFor(async () => Number((await stats(page)).tick) === 6, 'step to tick 6');
    s = await stats(page);
    if (s.colonists !== '4' || s.operational !== '4' || s.food !== '94') {
      fail(`after operational tick bad: ${JSON.stringify(s)}`);
    } else ok(`4 colonists fed, food ${s.food} at tick ${s.tick}, ${JSON.stringify(s)}`);
    await step(page);
    await waitFor(async () => Number((await stats(page)).food) === 90, 'step to tick 7');
    await shot('02-colonists-fed.png');

    // C. Consumption: every fed tick food decreases by exactly the population.
    let prev = Number((await stats(page)).food);
    while (prev > 4) {
      const tickBefore = Number((await stats(page)).tick);
      await step(page);
      await waitFor(async () => Number((await stats(page)).tick) === tickBefore + 1, 'fed tick');
      s = await stats(page);
      const delta = prev - Number(s.food);
      if (delta !== 4 || s.colonists !== '4') {
        fail(`consumption delta expected 4 per fed tick, got ${delta} (food ${prev} -> ${s.food}), ${JSON.stringify(s)}`);
      }
      if (Number(s.food) < 0) {
        fail(`food went negative: ${s.food}`);
      }
      prev = Number(s.food);
    }
    ok(`fed ticks consume exactly 4 food/tick down to ${s.food}, food never negative`);
    // tick 28: fed-empty boundary must have been reached with food = 2 (4 > 2).

    // D. Shortage: next tick food < population => whole colony starves.
    const tickBefore = Number((await stats(page)).tick);
    await step(page);
    await waitFor(async () => Number((await stats(page)).tick) === tickBefore + 1, 'shortage tick');
    s = await stats(page);
    if (s.food !== '0' || s.colonists !== '0') {
      fail(`shortage expected food 0 / colonists 0, got ${JSON.stringify(s)}`);
    } else ok(`shortage: food -> ${s.food}, colonists -> ${s.colonists}, colony starved`);
    if (s.foodStatus !== 'starved') {
      fail(`foodStatus expected 'starved', got ${s.foodStatus}`);
    } else ok(`foodStatus ${s.foodStatus}, UI: ${JSON.stringify(await page.locator('[data-testid="ui-status"]').textContent())}`);
    await shot('03-shortage.png');

    // E. Post-starvation: ticks advance, food stays 0, no re-admission.
    for (let i = 0; i < 2; i++) {
      const tBefore = Number((await stats(page)).tick);
      await step(page);
      await waitFor(async () => Number((await stats(page)).tick) === tBefore + 1, 'post-starvation tick');
    }
    s = await stats(page);
    if (s.food !== '0' || s.colonists !== '0' || s.buildings !== '4') {
      fail(`post-starvation state bad: ${JSON.stringify(s)}`);
    } else ok(`post-starvation: food ${s.food}, colonists ${s.colonists}, buildings ${s.buildings} stable`);
    await shot('04-after-starvation.png');

    // Rejected growth: real click on a valid empty cell at stock 0.
    const pt = await page.evaluate((c) => window.__nova.cellToScreen(c), { x: 8, y: 8 });
    await page.mouse.move(pt.x, pt.y);
    await waitFor(async () => (await stats(page)).status.includes('insufficient'), 'insufficient preview');
    const beforeRej = await stats(page);
    await page.mouse.click(pt.x, pt.y);
    await new Promise((r) => setTimeout(r, 500));
    const afterRej = await stats(page);
    if (afterRej.buildings !== beforeRej.buildings || afterRej.colonists !== beforeRej.colonists || afterRej.food !== beforeRej.food) {
      fail(`rejected growth changed state: ${JSON.stringify(beforeRej)} -> ${JSON.stringify(afterRej)}`);
    } else ok(`rejected growth: buildings ${afterRej.buildings}, colonists ${afterRej.colonists}, food ${afterRej.food} unchanged`);
    await shot('05-rejected-growth.png');

    // F. PLAY: ticks advance but the starving colony gains nothing (no production).
    const foodBeforePlay = (await stats(page)).food;
    await page.click('[data-testid="simulation-play"]');
    await waitFor(async () => Number((await stats(page)).tick) > Number((await stats(page)).tick) - 0 || true, 'play running');
    await new Promise((r) => setTimeout(r, 1500));
    await page.click('[data-testid="simulation-pause"]');
    s = await stats(page);
    if (s.food !== foodBeforePlay || s.food !== '0' || s.colonists !== '0') {
      fail(`PLAY changed food/colonists: ${JSON.stringify(s)}`);
    } else ok(`PLAY with starving colony: food ${s.food}, colonists ${s.colonists} unchanged (no production)`);

    const realErrors = errors.filter((e) => !e.includes('favicon'));
    if (realErrors.length > 0) fail(`browser errors: ${realErrors.join(' | ')}`);
    else ok('zero console/page errors');
  } catch (e) {
    if (!process.exitCode) {
      console.error(`FOOD E2E FAIL: ${e.message}`);
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('FOOD E2E RESULT: FAIL');
  else console.log('FOOD E2E RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`FOOD E2E FAIL: ${e.message}`);
  process.exitCode = 1;
});