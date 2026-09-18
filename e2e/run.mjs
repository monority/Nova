/* NOVA Step 2 real browser E2E. Plain Node, playwright core only. */
/* Launches vite preview, drives real mouse, asserts DOM stats, screenshots. */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const VITE_DIR = dirname(fileURLToPath(import.meta.resolve('vite/package.json')));
const VITE_BIN = join(VITE_DIR, require('vite/package.json').bin.vite);

const PORT = 4173;
const URL = `http://localhost:${PORT}/`;
const SHOTS = 'e2e/screenshots';
const TARGET = { x: 6, y: 6 };

const fail = (msg) => {
  console.error(`E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`E2E PASS: ${msg}`);

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

const preview = spawn(process.execPath, [VITE_BIN, 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'pipe',
  shell: false,
});
for (let i = 0; i < 100; i++) {
  try {
    const res = await fetch(URL);
    if (res.ok) break;
  } catch { /* not up yet */ }
  await new Promise((r) => setTimeout(r, 200));
  if (i === 99) throw new Error('preview start timeout');
}

let browser;
const errors = [];
try {
  mkdirSync(SHOTS, { recursive: true });
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

  await page.goto(URL, { waitUntil: 'load' });
  await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
  ok('load, app ready');

  const canvas = await page.$('[data-testid="nova-canvas"]');
  if (!canvas) fail('canvas missing'); else ok('canvas exists');
  const webgl = await page.evaluate(() => window.__nova.webgl());
  if (!webgl.rendererActive || !webgl.engine?.includes('three.js')) fail(`webgl bad: ${JSON.stringify(webgl)}`);
  else ok(`webgl init, engine ${webgl.engine}`);
  await page.screenshot({ path: `${SHOTS}/01-initial.png` });

  let s = await page.evaluate(() => window.__nova.stats());
  if (s.tick !== '0' || s.buildings !== '0' || s.colonists !== '0') fail(`initial stats bad: ${JSON.stringify(s)}`);
  else ok('initial Tick=0 Buildings=0 Colonists=0');

  const pt = await page.evaluate((c) => window.__nova.cellToScreen(c), TARGET);
  if (!pt) fail('cellToScreen null');
  else ok(`cell ${TARGET.x},${TARGET.y} projects to ${Math.round(pt.x)},${Math.round(pt.y)}`);

  await page.mouse.move(pt.x, pt.y);
  await waitFor(async () => (await page.evaluate(() => window.__nova.stats())).status.includes('ready'), 'hover preview');
  ok('hover shows valid placement preview');
  await page.screenshot({ path: `${SHOTS}/02-preview.png` });

  await page.mouse.click(pt.x, pt.y);
  await waitFor(async () => (await page.evaluate(() => window.__nova.stats())).buildings === '1', 'building placed');
  s = await page.evaluate(() => window.__nova.stats());
  if (s.tick !== '1' || s.buildings !== '1' || s.operational !== '0') fail(`after placement bad: ${JSON.stringify(s)}`);
  else ok(`click places building via canvas picking, ${JSON.stringify(s)}`);
  await page.screenshot({ path: `${SHOTS}/03-construction.png` });

  await page.click('[data-testid="simulation-step"]');
  await waitFor(async () => (await page.evaluate(() => window.__nova.stats())).tick === '2', 'step to tick 2');
  s = await page.evaluate(() => window.__nova.stats());
  if (s.operational !== '1' || s.colonists !== '1') fail(`after step2 bad: ${JSON.stringify(s)}`);
  else ok(`STEP drives construction to operational, ${JSON.stringify(s)}`);

  await page.click('[data-testid="simulation-step"]');
  await waitFor(async () => (await page.evaluate(() => window.__nova.stats())).tick === '3', 'step to tick 3');
  s = await page.evaluate(() => window.__nova.stats());
  if (s.colonists !== '1') fail(`colonist missing: ${JSON.stringify(s)}`);
  else ok(`colonist admitted and visible in stats, ${JSON.stringify(s)}`);
  await page.screenshot({ path: `${SHOTS}/04-operational.png` });

  const roundtrip = await page.evaluate((c) => {
    const p = window.__nova.cellToScreen(c);
    return p ? window.__nova.pickCell(p.x, p.y) : null;
  }, TARGET);
  if (roundtrip?.x !== TARGET.x || roundtrip?.y !== TARGET.y) fail(`pick roundtrip bad: ${JSON.stringify(roundtrip)}`);
  else ok('screen pick roundtrips to target cell');

  const realErrors = errors.filter((e) => !e.includes('favicon'));
  if (realErrors.length > 0) fail(`browser errors: ${realErrors.join(' | ')}`);
  else ok('zero console/page errors');
} catch (e) {
  fail(e.message);
} finally {
  await browser?.close();
  preview.kill();
}
if (process.exitCode) console.log('E2E RESULT: FAIL'); else console.log('E2E RESULT: ALL PASS');
