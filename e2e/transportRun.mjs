/* NOVA Step 09A transport network E2E — re-baselined for Step 10AD
 * (Workshop = 25 Material + 1 Water, one-off at placement).
 *
 * The subject of this suite is unchanged: abstract spatial connectivity.
 *
 *   Residence -> orthogonally adjacent Workshop -> adjacent Farm: all
 *   accessible (3); a road-connected but non-adjacent Well stays
 *   inaccessible (count stays 3).
 *
 * All state changes come from real palette clicks on the canvas and real
 * STEP controls. window.__nova is only read (never mutated); the accessible
 * count is asserted on the test-only __nova.stats surface (Step 09A §19).
 *
 * Step 10AD bootstrap reduction (see docs/roadmap/Step10AD.md §browser
 * migration): a Workshop now costs 1 Water, so the old 4-building scenario
 * (Residence + Farm + 2 Workshops = 100 Material, no Water producer) is
 * impossible. This suite keeps only the topology its assertions need:
 *
 *   Residence(4,4) -- adjacent -- Workshop(4,5) -- adjacent -- Farm(4,6)
 *   Well(6,6) is operational and road-connected (it produced the Water that
 *   paid for the Workshop) but touches no accessible building, so it is the
 *   disconnected control. The Farm is financed by real Workshop labour
 *   income, exactly like the historical Step 08G labour loop.
 *
 * Screenshots: artifacts/transport/01..04.
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
const num = (s, key) => Number(s[key]);

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

/**
 * Real canvas click on an empty cell. The wait is on `ready`, which the UI
 * derives from the shared Step 10AD-1 affordability predicate
 * (getPlacementAffordability) — so a placement the domain accepts at the
 * same-tick stored-Material crest is accepted here too. No second
 * affordability rule is introduced in the test.
 */
async function placeAt(page, cell) {
  const pt = await moveTo(page, cell);
  await waitFor(async () => (await stats(page)).status.includes('ready'), `valid preview at ${cell.x},${cell.y}`);
  const before = Number((await stats(page)).buildings);
  await page.mouse.click(pt.x, pt.y);
  await waitFor(async () => Number((await stats(page)).buildings) === before + 1, `placed at ${cell.x},${cell.y}`);
}

/** Real canvas drag placing the road gesture start -> end (single cell too). */
async function placeRoads(page, start, end = start) {
  const from = await moveTo(page, start);
  await page.mouse.down();
  const to = await page.evaluate((c) => window.__nova.cellToScreen(c), end);
  if (!to) throw new Error(`cellToScreen null for ${end.x},${end.y}`);
  await page.mouse.move(to.x, to.y, { steps: 4 });
  await waitFor(async () => (await stats(page)).status.includes('ready'), `road preview ${start.x},${start.y}->${end.x},${end.y}`);
  const before = Number((await stats(page)).roads);
  await page.mouse.up();
  await waitFor(async () => Number((await stats(page)).roads) > before, `road gesture committed`);
}

async function selectPalette(page, testid, expectedLabel) {
  // The palette click is the real UI input under test; a stray OS-level
  // pointermove can overwrite the status line right afterwards, so the
  // feedback assertion is retried instead of racing a single read.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.click(`[data-testid="${testid}"]`);
    const s = await stats(page);
    if (s.status.includes(expectedLabel)) return s;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`palette feedback missing for ${testid}: ${JSON.stringify((await stats(page)).status)}`);
}

/** STEP until a predicate on stats holds (construction needs ticks). */
async function stepUntil(page, pred, label, maxTicks = 60) {
  for (let i = 0; i < maxTicks; i++) {
    const s = await stats(page);
    if (pred(s)) return s;
    await step(page);
  }
  throw new Error(`timeout: ${label}`);
}

const RESIDENCE = { x: 4, y: 4 };
const ROADS = [{ x: 5, y: 4 }, { x: 5, y: 5 }, { x: 5, y: 6 }];
const WELL = { x: 6, y: 6 };
const WORKSHOP = { x: 4, y: 5 };
const FARM = { x: 4, y: 6 };

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
    if (s.tick !== '0' || s.accessibleBuildings !== '0' || s.construction !== '100') {
      fail(`A fresh bad: ${JSON.stringify(s)}`);
    } else ok(`A fresh: accessible ${s.accessibleBuildings}, material ${s.construction}`);
    await shot('01-fresh.png');

    // B. Residence -> operational root, accessible 1.
    // Note: canvas placement dispatches through a simulation tick, so the
    // Residence is under construction at tick 1 and operational at tick 3.
    await selectPalette(page, 'build-residence', 'Residence selected');
    await placeAt(page, RESIDENCE);
    s = await stats(page);
    if (s.accessibleBuildings !== '0') {
      fail(`B under-construction residence must be inaccessible: ${JSON.stringify(s)}`);
    } else ok('B under-construction residence inaccessible');
    s = await stepUntil(page, (v) => v.operational === '1', 'residence operational', 10);
    if (s.accessibleBuildings !== '1' || s.colonists !== '1') {
      fail(`B root bad: ${JSON.stringify(s)}`);
    } else ok(`B root residence accessible: ${s.accessibleBuildings}, colonist ${s.colonists}`);

    // B1. Step 10AD causal proof: with 0 Water the Workshop is rejected.
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    const rejectedPt = await moveTo(page, WORKSHOP);
    await waitFor(
      async () => (await stats(page)).status.includes('insufficient water'),
      'workshop water rejection preview'
    );
    const beforeRejection = await stats(page);
    if (!beforeRejection.status.includes('insufficient water (0/1)')) {
      fail(`B1 Workshop preview must name its Water cost: ${JSON.stringify(beforeRejection.status)}`);
    }
    await page.mouse.click(rejectedPt.x, rejectedPt.y);
    await new Promise((r) => setTimeout(r, 300));
    s = await stats(page);
    if (s.buildings !== beforeRejection.buildings || s.construction !== beforeRejection.construction) {
      fail(`B1 zero-Water Workshop must be rejected: ${JSON.stringify(s)}`);
    } else {
      ok(`B1 Workshop rejected with 0 Water ("${s.status}"): no building, material still ${s.construction}`);
    }

    // B2. Road network + Well: the Water producer needed by Step 10AD.
    //     The Well is road-connected (so it can be staffed and produce the
    //     Water that pays for the Workshop) but orthogonally distant from
    //     every building, which is exactly the disconnected control this
    //     suite needs.
    await selectPalette(page, 'build-road', 'Road selected');
    for (const cell of ROADS) await placeRoads(page, cell);
    s = await stepUntil(page, (v) => v.operationalRoads === String(ROADS.length), 'roads operational', 10);
    ok(`B2 roads operational: ${s.operationalRoads}, material ${s.construction}`);
    await selectPalette(page, 'build-well', 'Well selected');
    await placeAt(page, WELL);
    s = await stepUntil(page, (v) => v.hasOperationalWell === 'true', 'well operational', 10);
    s = await stepUntil(page, (v) => v.waterProduction === '2', 'well staffed and producing', 10);
    if (s.accessibleBuildings !== '1') {
      fail(`B2 disconnected operational Well must stay inaccessible: ${JSON.stringify(s)}`);
    } else {
      ok(`B2 road-connected Well operational (water ${s.water}, production ${s.waterProduction}) but inaccessible: accessible ${s.accessibleBuildings} of ${s.operational} operational`);
    }
    await shot('02-disconnected-well.png');

    // C. Adjacent Workshop -> operational, accessible 2. The Workshop is
    //    placed with the Water the Well produced (Step 10AD contract).
    s = await stepUntil(page, (v) => Number(v.water) >= 1, 'water buffer for the Workshop', 10);
    await selectPalette(page, 'build-workshop', 'Workshop selected');
    await placeAt(page, WORKSHOP);
    s = await stats(page);
    if (s.workshops !== '1' || !s.status.includes('under construction')) {
      fail(`C Workshop must be accepted once Water exists: ${JSON.stringify(s)}`);
    } else ok(`C Workshop accepted with Water ${s.water} available, material ${s.construction}`);
    await stepUntil(page, (v) => v.operational === '3', 'workshop operational', 10);
    s = await stats(page);
    if (s.accessibleBuildings !== '2') {
      fail(`C adjacent Workshop must be accessible: ${JSON.stringify(s)}`);
    } else ok(`C adjacent Workshop accessible: ${s.accessibleBuildings} of ${s.operational} operational`);
    await shot('03-workshop.png');

    // D. Multi-hop Farm -> accessible 3. The Farm is financed by the staffed
    //    Workshop's real labour income (net +1/tick up to the storage crest),
    //    so the suite needs no artificial credit.
    s = await stepUntil(
      page,
      (v) => v.employed === '1' && v.materialProduction === '2',
      'workshop staffed',
      10
    );
    ok(`D Workshop staffed (production ${s.materialProduction}, upkeep ${s.materialUpkeep}, material ${s.construction})`);
    s = await stepUntil(
      page,
      (v) => Number(v.construction) + Number(v.storedProduction) >= 25,
      'labour-financed construction crest',
      60
    );
    ok(`D labour funded the Farm: rest ${s.construction} + stored ${s.storedProduction}`);
    await selectPalette(page, 'build-farm', 'Farm selected');
    await placeAt(page, FARM);
    s = await stepUntil(page, (v) => v.operational === '4', 'farm operational', 10);
    if (s.accessibleBuildings !== '3') {
      fail(`D adjacent Farm must be accessible (multi-hop): ${JSON.stringify(s)}`);
    } else {
      ok(`D multi-hop Residence -> Workshop -> Farm accessible: ${s.accessibleBuildings} of ${s.operational} operational`);
    }
    // The Well is still operational and still not accessible.
    if (s.hasOperationalWell !== 'true' || s.accessibleBuildings !== '3') {
      fail(`D disconnected Well must stay out of the accessible set: ${JSON.stringify(s)}`);
    } else {
      ok(`D disconnected Well excluded: accessible ${s.accessibleBuildings} of ${s.operational} operational (Well counted as operational, not accessible)`);
    }
    await shot('04-network.png');

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
