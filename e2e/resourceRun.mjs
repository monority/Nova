/* NOVA Step 4 resource E2E. Plain Node, playwright core only.
 * Real browser flow: initial stock visible -> valid preview -> real click
 * (deduction) -> construction -> operational -> depletion -> rejected click.
 * Screenshots: artifacts/resources/01..06.
 * Mode: headed by default, override NOVA_RESOURCE_MODE=headless.
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

const PORT = 4176;
const URL = `http://localhost:${PORT}/`;
const ART = 'artifacts/resources';
const MODE = (process.env.NOVA_RESOURCE_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';

const fail = (msg) => {
  console.error(`RESOURCE E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`RESOURCE E2E PASS: ${msg}`);

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

    await page.goto(URL, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
    ok('load, app ready');
    let s = await stats(page);
    if (s.tick !== '0' || s.construction !== '100' || s.buildings !== '0') fail(`initial stats bad: ${JSON.stringify(s)}`);
    else ok(`initial stock visible: material ${s.construction}, ${JSON.stringify(s.tick)} ticks`);
    await shot('01-initial.png');

    // Valid preview for an affordable cell.
    const pt1 = await page.evaluate((c) => window.__nova.cellToScreen(c), { x: 6, y: 6 });
    await page.mouse.move(pt1.x, pt1.y);
    await waitFor(async () => (await stats(page)).status.includes('ready'), 'valid preview');
    ok('hover affordable cell shows a valid preview');
    await shot('02-valid-placement.png');

    // Real click: building created, stock deducted atomically.
    await page.mouse.click(pt1.x, pt1.y);
    await waitFor(async () => (await stats(page)).buildings === '1', 'building placed');
    s = await stats(page);
    if (s.tick !== '1' || s.construction !== '75') fail(`after placement bad: ${JSON.stringify(s)}`);
    else ok(`resource deduction 100 -> ${s.construction}, ${JSON.stringify(s)}`);
    await shot('03-after-construction-start.png');

    // STEP: construction progresses to operational (Step 10Y: two ticks).
    await page.click('[data-testid="simulation-step"]');
    await waitFor(async () => (await stats(page)).tick === '2', 'step to tick 2');
    s = await stats(page);
    if (s.operational !== '0') fail(`tick 2 should still be under construction: ${JSON.stringify(s)}`);
    await page.click('[data-testid="simulation-step"]');
    await waitFor(async () => (await stats(page)).tick === '3', 'step to tick 3');
    s = await stats(page);
    if (s.operational !== '1' || s.colonists !== '1' || s.construction !== '75') fail(`after STEP bad: ${JSON.stringify(s)}`);
    else ok(`building operational, stock stable at ${s.construction}, ${JSON.stringify(s)}`);
    await shot('04-operational.png');

    // Deplete the stock two more residences at a time.
    for (const cell of [{ x: 4, y: 4 }, { x: 2, y: 2 }, { x: 0, y: 0 }]) {
      const pt = await page.evaluate((c) => window.__nova.cellToScreen(c), cell);
      await page.mouse.click(pt.x, pt.y);
      await waitFor(async () => (await stats(page)).construction !== s.construction, 'stock changed');
      s = await stats(page);
    }
    // After 4 residences: 100 - 4*25 = 0.
    if (s.construction !== '0' || s.buildings !== '4') fail(`depletion bad: ${JSON.stringify(s)}`);
    else ok(`stock depleted to ${s.construction} after ${s.buildings} buildings`);
    await shot('05-low-resources.png');

    // Hover on a valid empty cell: preview must now be invalid.
    const pt2 = await page.evaluate((c) => window.__nova.cellToScreen(c), { x: 1, y: 1 });
    await page.mouse.move(pt2.x, pt2.y);
    await waitFor(async () => (await stats(page)).status.includes('insufficient'), 'invalid preview');
    ok('hover shows insufficient-material preview');
    await shot('06-rejected-placement.png');

    // Real click: rejected. No command dispatched (main.ts returns early on
    // invalid placement), so stepSimulation never runs and no tick advances.
    const buildingsBefore = (await stats(page)).buildings;
    const stockBefore = (await stats(page)).construction;
    const tickBefore = (await stats(page)).tick;
    await page.mouse.click(pt2.x, pt2.y);
    await new Promise((r) => setTimeout(r, 500));
    s = await stats(page);
    if (s.buildings !== buildingsBefore || s.construction !== stockBefore) fail(`rejection changed state: ${JSON.stringify(s)}`);
    if (s.tick !== tickBefore) fail(`tick advanced during rejected placement: ${tickBefore} -> ${s.tick}`);
    else ok(`rejected placement: buildings ${s.buildings}, stock ${s.construction}, tick ${s.tick} unchanged`);

    // PLAY/PAUSE: stock must not change spontaneously (no production yet).
    const dontChange = s.construction;
    await page.click('[data-testid="simulation-play"]');
    await waitFor(async () => Number((await stats(page)).tick) > Number(s.tick), 'play advances');
    s = await stats(page);
    if (s.construction !== dontChange) fail(`stock changed during PLAY: ${dontChange} -> ${s.construction}`);
    else ok('resource stock stable during PLAY (no production system)');
    await page.click('[data-testid="simulation-pause"]');
    const pausedTick = Number((await stats(page)).tick);
    await new Promise((r) => setTimeout(r, 700));
    if (Number((await stats(page)).tick) !== pausedTick) fail('tick advanced while paused');
    else ok(`PAUSE stops ticks at ${pausedTick}, stock ${dontChange}`);

    const realErrors = errors.filter((e) => !e.includes('favicon'));
    if (realErrors.length > 0) fail(`browser errors: ${realErrors.join(' | ')}`);
    else ok('zero console/page errors');
  } catch (e) {
    if (!process.exitCode) {
      console.error(`RESOURCE E2E FAIL: ${e.message}`);
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('RESOURCE E2E RESULT: FAIL');
  else console.log('RESOURCE E2E RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`RESOURCE E2E FAIL: ${e.message}`);
  process.exitCode = 1;
});