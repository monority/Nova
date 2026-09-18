/* NOVA GPU E2E validation. Plain Node, playwright core only.
 * Windows + Chromium + ANGLE + NVIDIA hardware acceleration.
 * Distinct from e2e/run.mjs (functional E2E stays untouched).
 *
 * Launch: npm run test:e2e:gpu
 * Mode: headed by default (hardware GPU). Override with NOVA_GPU_MODE=headless.
 *
 * The WebGL renderer actually returned by the browser is the ONLY authority:
 * nvidia-smi is never treated as proof of Chromium GPU usage.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { classifyGpu, isSoftwareRenderer, isNvidia } from './gpuCheck.mjs';

const require = createRequire(import.meta.url);
const PW_VERSION = require('playwright/package.json').version;
const VITE_DIR = dirname(fileURLToPath(import.meta.resolve('vite/package.json')));
const VITE_BIN = join(VITE_DIR, require('vite/package.json').bin.vite);

const PORT = 4174;
const URL = `http://localhost:${PORT}/`;
const ART = 'artifacts/gpu';
const TARGET = { x: 6, y: 6 };
const MODE = (process.env.NOVA_GPU_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';

const lines = [];
const log = (msg) => {
  lines.push(msg);
  console.log(msg);
};
const section = (title) => log(`\n=== ${title} ===`);

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

const stripGl = (s) => (s ?? '').replace(/ \(WebGL\d?\)$/i, '');

/** Build the structured report per GPU-validation.md §16. Uses real values only. */
function report(browserMode, probe, real, stats, errors, shots) {
  const probeOk = probe.available && probe.webglVersion === 'WebGL2';
  const softwareProbe = isSoftwareRenderer(probe);
  const nvidiaProbe = isNvidia(probe);
  const realOk = real.available && real.webglVersion === 'WebGL2';
  const softwareReal = isSoftwareRenderer(real);
  const nvidiaReal = isNvidia(real);
  const canvasOk = !!stats.canvas;
  const threeOk = !!stats.engine && stats.engine.includes('three.js') && stats.rendererActive;
  const gpuPass = !softwareReal && nvidiaReal;
  const errorCount = errors.filter((e) => !e.includes('favicon')).length;

  const pad = (v) => String(v ?? 'n/a');
  log('========================================');
  log(' NOVA GPU E2E VALIDATION');
  log('========================================');
  log('Environment');
  log(`OS: ${process.platform}`);
  log('Browser: Chromium');
  log(`Mode: ${browserMode}`);
  log(`Playwright: ${PW_VERSION}`);
  log('');
  log('WebGL');
  log(`WebGL: ${probeOk && realOk ? 'PASS' : 'FAIL'}`);
  log(`Version: ${pad(real.webglVersion)}`);
  log(`Vendor: ${pad(stripGl(real.vendor))}`);
  log(`Renderer: ${pad(stripGl(real.renderer))}`);
  log(`Unmasked Vendor: ${pad(real.unmaskedVendor)}`);
  log(`Unmasked Renderer: ${pad(real.unmaskedRenderer)}`);
  log(`Software Renderer: ${softwareReal ? 'YES' : 'NO'}`);
  log(`NVIDIA GPU: ${nvidiaReal ? 'YES' : 'NO'}`);
  log('');
  log('NOVA');
  log(`Three.js: ${threeOk ? 'PASS' : 'FAIL'}`);
  log(`Canvas: ${canvasOk ? 'PASS' : 'FAIL'}`);
  log(`Scene: ${shots.initial ? 'PASS' : 'FAIL'}`);
  log('');
  log('Interaction');
  log(`Mouse interaction: ${stats.interaction ? 'PASS' : 'FAIL'}`);
  log(`Simulation update: ${stats.simulation ? 'PASS' : 'FAIL'}`);
  log(`Render update: ${stats.render ? 'PASS' : 'FAIL'}`);
  log('');
  log('Diagnostics');
  log(`Console errors: ${errors.filter((e) => e.startsWith('console')).length}`);
  log(`Page errors: ${errors.filter((e) => e.startsWith('pageerror')).length}`);
  log('');
  log('Screenshots');
  log(`Initial: ${shots.initial ? 'PASS' : 'FAIL'}: ${shots.initial}`);
  log(`Final: ${shots.final ? 'PASS' : 'FAIL'}: ${shots.final}`);
  log('');
  log('========================================');
  log(` GPU E2E: ${gpuPass && !errorCount ? 'PASS' : 'FAIL'}`);
  log('========================================');

  if (!gpuPass) {
    log('\nGPU E2E FAILED');
    log(`Reason: ${classifyGpu(real) ?? classifyGpu(probe) ?? 'GPU validation failed'}`);
    log(`Renderer: ${real.unmaskedRenderer ?? real.renderer ?? 'unknown'}`);
  }
  if (errorCount) {
    log(`Browser errors: ${errors.join(' | ')}`);
  }
}

const fail = (msg) => {
  console.error(`GPU E2E FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`GPU E2E PASS: ${msg}`);

async function main() {
  section(`SERVER (vite preview on :${PORT})`);
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
  const shots = { initial: null, final: null };
  const stats = { canvas: false, engine: null, rendererActive: false, interaction: false, simulation: false, render: false };
  try {
    mkdirSync(ART, { recursive: true });

    const browserArgs = [];
    if (HEADLESS) browserArgs.push('--headless=new');
    // --ignore-gpu-blocklist: allow Chromium to enable hardware acceleration
    // even when the GPU/driver combination matches an old blocklist entry.
    // Deliberately NOT using --use-gl=swiftshader: that is the software
    // renderer this test must detect as a failure. The WebGL renderer string
    // returned by the page remains the final authority (GPU-validation.md §13).
    browserArgs.push('--ignore-gpu-blocklist');

    browser = await chromium.launch({ headless: HEADLESS, args: browserArgs });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    // JS console errors only; generic network "Failed to load resource" messages
    // are tracked precisely via the response handler below (they carry no URL).
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('Failed to load resource')) {
        errors.push(`console: ${m.text()}`);
      }
    });
    // Real HTTP error responses. The browser favicon request (404) is expected
    // and intentionally ignored; any other 4xx/5xx is a genuine failure.
    page.on('response', (r) => {
      if (r.status() >= 400 && !/\/favicon\.ico$/i.test(r.url())) {
        errors.push(`http ${r.status()}: ${r.url()}`);
      }
    });

    section('LOAD');
    await page.goto(URL, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
    ok('NOVA loaded, ready');

    section('NOVA SURFACE');
    stats.canvas = !!(await page.$('#nova-canvas'));
    if (!stats.canvas) fail('nova canvas missing');
    else ok('canvas #nova-canvas present');
    const webgl = await page.evaluate(() => window.__nova.webgl());
    stats.engine = webgl.engine;
    stats.rendererActive = webgl.rendererActive;
    if (!webgl.rendererActive || !webgl.engine?.includes('three.js')) {
      fail(`three.js not active: ${JSON.stringify(webgl)}`);
    } else ok(`three.js WebGLRenderer active, engine ${webgl.engine}`);

    section('GPU DIAGNOSTIC');
    const probe = await page.evaluate(() => window.__nova.gpu());
    // The REAL proof: the WebGL context of the canvas NOVA actually renders to.
    const real = await page.evaluate(() => window.__nova.context());
    console.log(`probe: ${JSON.stringify(probe)}`);
    console.log(`nova canvas context: ${JSON.stringify(real)}`);

    const reason = classifyGpu(real) ?? classifyGpu(probe);
    if (reason !== null) {
      await page.screenshot({ path: `${ART}/gpu-fail.png` }).catch(() => {});
      fail(reason);
      throw new Error('gpu classification failed');
    }
    if (!real.available || real.webglVersion !== 'WebGL2') {
      fail(`NOVA canvas is not WebGL2: ${real.webglVersion ?? 'unavailable'}`);
      throw new Error('canvas webgl2 missing');
    }
    ok('WebGL2 active, software renderer excluded, NVIDIA identified');
    shots.initial = `${ART}/gpu-initial.png`;
    await page.screenshot({ path: shots.initial });
    ok(`initial screenshot ${shots.initial}`);

    section('INTERACTION');
    let s = await page.evaluate(() => window.__nova.stats());
    if (s.tick !== '0' || s.buildings !== '0' || s.colonists !== '0' || s.construction !== '100') {
      fail(`initial stats bad: ${JSON.stringify(s)}`);
    } else ok(`initial Tick=0 Buildings=0 Colonists=0 Material=${s.construction}`);

    // --- First placement: building-1 at (6,6) ---
    const pt = await page.evaluate((c) => window.__nova.cellToScreen(c), TARGET);
    if (!pt) fail('cellToScreen null');
    else ok(`cell ${TARGET.x},${TARGET.y} -> ${Math.round(pt.x)},${Math.round(pt.y)}`);

    await page.mouse.move(pt.x, pt.y);
    await waitFor(async () => (await page.evaluate(() => window.__nova.stats())).status.includes('ready'), 'hover preview');
    ok('hover shows valid placement preview');

    await page.mouse.click(pt.x, pt.y);
    await waitFor(async () => (await page.evaluate(() => window.__nova.stats())).buildings === '1', 'building placed');
    s = await page.evaluate(() => window.__nova.stats());
    if (s.tick !== '1' || s.buildings !== '1' || s.construction !== '75') {
      fail(`after placement bad: ${JSON.stringify(s)}`);
    } else ok(`resource deduction 100 -> ${s.construction}, ${JSON.stringify(s)}`);
    stats.interaction = true;

    // Select building-1 to capture underConstruction state before depletion.
    await page.mouse.click(pt.x, pt.y);
    await waitFor(async () => (await page.evaluate(() => window.__nova.selectedBuilding()))?.id === 'building-1', 'building selected');
    const underConstruction = await page.evaluate(() => window.__nova.selectedBuilding());
    if (underConstruction?.status !== 'underConstruction' || underConstruction.constructionRemaining !== 1) {
      fail(`temporal inspection under construction expected, got ${JSON.stringify(underConstruction)}`);
    } else ok(`inspection under construction, ${underConstruction.constructionRemaining}/${underConstruction.constructionDuration} ticks`);

    // --- Temporal: building-1 construction → operational → colonist ---
    section('TEMPORAL');
    await page.click('[data-testid="simulation-step"]');
    await waitFor(async () => (await page.evaluate(() => window.__nova.stats())).tick === '2', 'step to tick 2');
    s = await page.evaluate(() => window.__nova.stats());
    if (s.operational !== '1' || s.colonists !== '1') {
      fail(`after step2 bad: ${JSON.stringify(s)}`);
    } else ok(`STEP tick 2: building-1 operational, colonist admitted, ${JSON.stringify(s)}`);
    const initiallyOperational = await page.evaluate(() => window.__nova.selectedBuilding());
    if (initiallyOperational?.status !== 'operational' || initiallyOperational.occupiedHousing !== 1) {
      fail(`inspection operational expected, got ${JSON.stringify(initiallyOperational)}`);
    } else ok(`inspection operational with ${initiallyOperational.occupiedHousing} resident`);
    stats.simulation = true;

    // --- Resource depletion: 3 additional placements ---
    section('RESOURCES');
    const depletionCells = [{ x: 8, y: 8 }, { x: 10, y: 10 }, { x: 3, y: 3 }];
    for (const cell of depletionCells) {
      const rpt = await page.evaluate((c) => window.__nova.cellToScreen(c), cell);
      await page.mouse.move(rpt.x, rpt.y);
      await waitFor(async () => (await page.evaluate(() => window.__nova.stats())).status.includes('ready'), 'hover valid for depletion');
      await page.mouse.click(rpt.x, rpt.y);
      await waitFor(async () => (await page.evaluate(() => window.__nova.stats())).buildings !== s.buildings, 'building placed for depletion');
      s = await page.evaluate(() => window.__nova.stats());
    }
    // After 1 (original) + 3 = 4 buildings: 100 - 4*25 = 0
    if (s.construction !== '0' || s.buildings !== '4') {
      fail(`depletion expected 0/4, got ${s.construction}/${s.buildings}`);
    } else ok(`stock depleted: material ${s.construction}, buildings ${s.buildings}`);

    // --- Rejection at depleted stock ---
    const rejCell = { x: 7, y: 7 };
    const rejPt = await page.evaluate((c) => window.__nova.cellToScreen(c), rejCell);
    await page.mouse.move(rejPt.x, rejPt.y);
    await waitFor(async () => (await page.evaluate(() => window.__nova.stats())).status.includes('insufficient'), 'insufficient preview');
    const beforeRej = await page.evaluate(() => window.__nova.stats());
    await page.mouse.click(rejPt.x, rejPt.y);
    await new Promise((r) => setTimeout(r, 500));
    const afterRej = await page.evaluate(() => window.__nova.stats());
    if (afterRej.buildings !== beforeRej.buildings || afterRej.construction !== beforeRej.construction) {
      fail(`rejection changed state: buildings ${beforeRej.buildings}->${afterRej.buildings}, stock ${beforeRej.construction}->${afterRej.construction}`);
    } else {
      ok(`rejected placement at stock 0: buildings ${afterRej.buildings}, stock ${afterRej.construction} unchanged`);
    }

    // --- Temporal re-verify at depleted stock ---
    // The depleted resource state must NOT prevent already-created buildings
    // from completing construction. building-1 stays operational.
    const operational = await page.evaluate(() => window.__nova.selectedBuilding());
    if (operational?.status !== 'operational' || operational.occupiedHousing !== 1) {
      fail(`inspection operational at depleted stock expected, got ${JSON.stringify(operational)}`);
    } else ok(`building-1 still operational with ${operational.occupiedHousing} resident at stock 0`);

    // Deterministic STEP from the current tick (tick-agnostic): completes the
    // last remaining construction and admits the final colonist.
    const temporalTickBefore = Number((await page.evaluate(() => window.__nova.stats())).tick);
    await page.click('[data-testid="simulation-step"]');
    await waitFor(async () => Number((await page.evaluate(() => window.__nova.stats())).tick) === temporalTickBefore + 1, 'step advances one tick');
    s = await page.evaluate(() => window.__nova.stats());
    if (s.operational !== '4' || s.colonists !== '4') {
      fail(`after deterministic step bad: ${JSON.stringify(s)}`);
    } else ok(`deterministic STEP: ${s.operational} operational, ${s.colonists} colonists, ${JSON.stringify(s)}`);
    stats.render = true;
    shots.final = `${ART}/gpu-final.png`;
    await page.screenshot({ path: shots.final });
    ok(`final screenshot ${shots.final}`);

    section('ERRORS');
    const realErrors = errors.filter((e) => !e.includes('favicon'));
    if (realErrors.length > 0) fail(`browser errors: ${realErrors.join(' | ')}`);
    else ok('zero console/page errors');

    section('REPORT');
    report(MODE, probe, real, stats, errors, shots);
  } catch (e) {
    if (!process.exitCode) {
      console.error(`GPU E2E FAIL: ${e.message}`);
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('GPU E2E RESULT: FAIL');
  else console.log('GPU E2E RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`GPU E2E FAIL: ${e.message}`);
  process.exitCode = 1;
});