/* NOVA Step 10BA spatial & workforce readability verification (real browser).
 *
 * Phase: implementation verification. The 10AZ findings must now be ANSWERABLE
 * with the shipped UI, and the fixes must be observable through real commands:
 *   A  hover a Residence candidate on a SERVED network
 *   B  hover a Residence candidate that would NOT be served
 *   C  select an UNEMPLOYED colonist's Residence and read the cause
 *   D  select an UNSERVED Residence
 *   E  create a road link and watch the workforce/service surfaces change
 * plus the colony-wide served count, the terrain legend, the supply vocabulary
 * (no `served` on the Water row) and the narrow-viewport HUD budget.
 *
 * window.__nova is only read; every state change comes from a real click,
 * gesture or palette selection, or from the real scenario select.
 * Screenshots: artifacts/spatial-readability/.
 * Mode: headed by default, override NOVA_SPATIAL_READABILITY_MODE=headless.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const VITE_DIR = dirname(fileURLToPath(import.meta.resolve('vite/package.json')));
const VITE_BIN = join(VITE_DIR, require('vite/package.json').bin.vite);

const PORT = 4198;
const BASE = `http://localhost:${PORT}/`;
const FIXTURE = `${BASE}?scenario=terrain-chokepoint`;
const ART = 'artifacts/spatial-readability';
const MODE = (process.env.NOVA_SPATIAL_READABILITY_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';
const BLOCKED = ['0,1', ...[0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((y) => `2,${y}`)];

const fail = (msg) => {
  console.error(`SPATIAL READABILITY FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`SPATIAL READABILITY PASS: ${msg}`);
const REPORT = { answers: {}, findings: [] };
const finding = (msg) => {
  console.log(`SPATIAL READABILITY FINDING: ${msg}`);
  REPORT.findings.push(msg);
};

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
const text = (page, testid) =>
  page.evaluate((id) => document.querySelector(`[data-testid="${id}"]`)?.textContent ?? '', testid);

async function load(page, url, readyText, scenarioId = null) {
  await page.goto(url, { waitUntil: 'load' });
  await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
  if (scenarioId !== null) {
    await page.selectOption('[data-testid="scenario-select"]', scenarioId);
  }
  await waitFor(async () => {
    const s = await stats(page);
    return s.status.includes(readyText) ? s : null;
  }, `loaded ${url} ${scenarioId ?? ''}`);
  return stats(page);
}

async function hover(page, cell, expectText = null) {
  const point = await page.evaluate((c) => window.__nova.cellToScreen(c), cell);
  if (point === null) throw new Error(`cellToScreen null for ${cell.x},${cell.y}`);
  await page.mouse.move(point.x, point.y);
  return waitFor(async () => {
    const status = (await stats(page)).status;
    if (expectText !== null) return status.includes(expectText) ? status : null;
    return status.length > 0 ? status : null;
  }, `hover ${cell.x},${cell.y}`);
}

async function selectBuilding(page, cell) {
  const point = await page.evaluate((c) => window.__nova.cellToScreen(c), cell);
  if (point === null) throw new Error(`cellToScreen null for ${cell.x},${cell.y}`);
  await page.mouse.click(point.x, point.y);
  return waitFor(
    () => page.evaluate(() => window.__nova.selectedBuilding()),
    `selected ${cell.x},${cell.y}`
  );
}

async function step(page) {
  const before = Number((await stats(page)).tick);
  await page.click('[data-testid="simulation-step"]');
  await waitFor(async () => Number((await stats(page)).tick) === before + 1, `tick ${before + 1}`);
  return stats(page);
}

async function placeRoads(page, cells) {
  await page.click('[data-testid="build-road"]');
  for (const cell of cells) {
    const point = await page.evaluate((c) => window.__nova.cellToScreen(c), cell);
    if (point === null) throw new Error(`cellToScreen null for road ${cell.x},${cell.y}`);
    await page.mouse.move(point.x, point.y);
    await waitFor(async () => (await stats(page)).status.includes('ready'), `road ready ${cell.x},${cell.y}`);
    await page.mouse.click(point.x, point.y);
    await step(page);
  }
}

async function main() {
  mkdirSync(ART, { recursive: true });
  const preview = spawn(
    process.execPath,
    [VITE_BIN, 'preview', '--port', String(PORT), '--strictPort'],
    { stdio: 'pipe', shell: false }
  );
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
    if (i === 99) throw new Error('preview start timeout');
  }

  let browser;
  const report = REPORT;
  try {
    browser = await chromium.launch({ headless: HEADLESS });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (e) => fail(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('Failed to load resource')) {
        fail(`console: ${m.text()}`);
      }
    });

    // --- HUD vocabulary + colony-wide service + terrain legend --------------
    let s = await load(page, FIXTURE, 'Terrain chokepoint');
    const waterRow = await text(page, 'stat-water');
    const waterSuffix = await text(page, 'stat-water-status');
    const residencesRow = await text(page, 'stat-residences');
    const terrainRow = await text(page, 'stat-terrain');
    report.answers.hud = { waterRow, waterSuffix, residencesRow, terrainRow, stats: s.residenceService };
    if (/served/i.test(waterSuffix)) {
      fail(`the Water row still uses the word "served" for the supply state: "${waterSuffix}"`);
    } else {
      ok(`Water supply vocabulary: "${waterRow}${waterSuffix}" (no "served")`);
    }
    if (!/^\d+ \/ \d+ served$/.test(residencesRow.trim())) {
      fail(`Residences row is not a served count: "${residencesRow}"`);
    } else {
      ok(`colony-wide service: "${residencesRow.trim()}"`);
    }
    if (!/blocked cell/.test(terrainRow)) {
      fail(`terrain legend missing: "${terrainRow}"`);
    } else {
      ok(`terrain legend: "${terrainRow}"`);
    }

    // --- A: a Residence candidate on a SERVED network ----------------------
    await page.click('[data-testid="build-residence"]');
    const servedHover = await hover(page, { x: 3, y: 0 }, 'water: served');
    report.answers.caseA = servedHover;
    ok(`A served candidate: "${servedHover}"`);

    // --- B: a Residence candidate that would NOT be served -----------------
    const unservedHover = await hover(page, { x: 0, y: 0 }, 'never be water-served');
    report.answers.caseB = unservedHover;
    if (/water: served/.test(unservedHover)) {
      fail(`an unserved candidate is predicted as served: "${unservedHover}"`);
    } else {
      ok(`B unserved candidate: "${unservedHover}"`);
    }
    await page.screenshot({ path: `${ART}/01-placement-preview.png` });

    // --- D: an UNSERVED Residence in the inspector -------------------------
    await selectBuilding(page, { x: 1, y: 0 });
    const unservedInspector = await text(page, 'inspection-housing');
    await selectBuilding(page, { x: 5, y: 0 });
    const servedInspector = await text(page, 'inspection-housing');
    report.answers.caseD = { unservedInspector, servedInspector };
    if (!unservedInspector.includes('Water: not served')) {
      fail(`unserved Residence wording missing: "${unservedInspector}"`);
    } else {
      ok(`D unserved Residence: "${unservedInspector}"`);
    }
    if (!servedInspector.includes('Water: served')) {
      fail(`served Residence wording missing: "${servedInspector}"`);
    } else {
      ok(`D served Residence: "${servedInspector}"`);
    }

    // --- C + E: an unemployed colonist, then a real road repair -------------
    s = await load(page, BASE, 'Scenario — Recovery', 'recovery');
    const jobsBefore = (await stats(page)).jobs;
    await selectBuilding(page, { x: 1, y: 0 });
    const workBefore = await text(page, 'inspection-worker');
    report.answers.caseC = { jobsBefore, workBefore };
    if (!/Work — unemployed/.test(workBefore)) {
      fail(`unemployment cause not shown: "${workBefore}"`);
    } else {
      ok(`C unemployment cause: jobs ${jobsBefore}, "${workBefore}"`);
    }
    await page.screenshot({ path: `${ART}/02-unemployed-cause.png` });

    // E: connect the stranded Farm with three real road cells, then watch the
    // workforce surfaces change.
    await placeRoads(page, [
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
    ])
    for (let i = 0; i < 3; i += 1) await step(page);
    const jobsAfter = (await stats(page)).jobs;
    const foodAfter = (await stats(page)).food;
    await selectBuilding(page, { x: 1, y: 0 });
    const workAfter = await text(page, 'inspection-worker');
    report.answers.caseE = { jobsAfter, foodAfter, workAfter };
    if (jobsAfter === jobsBefore) {
      fail(`the road repair changed nothing: jobs ${jobsBefore} -> ${jobsAfter}`);
    } else if (!/Work — employed/.test(workAfter)) {
      fail(`the workforce surface did not follow the repair: "${workAfter}"`);
    } else {
      ok(`E repair: jobs ${jobsBefore} -> ${jobsAfter}, "${workAfter}"`);
    }
    await page.screenshot({ path: `${ART}/03-after-repair.png` });

    // --- mobile budget ------------------------------------------------------
    await load(page, FIXTURE, 'Terrain chokepoint');
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 420, height: 740 },
      { width: 360, height: 640 },
    ]) {
      await page.setViewportSize(viewport);
      await new Promise((r) => setTimeout(r, 350));
      const metrics = await page.evaluate((blockedKeys) => {
        const doc = document.documentElement;
        const panel = document.querySelector('#nova-ui');
        const canvas = document.querySelector('canvas#nova-canvas');
        const panelRect = panel ? panel.getBoundingClientRect() : null;
        const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
        const occluded = blockedKeys.filter((key) => {
          const [x, y] = key.split(',').map(Number);
          const point = window.__nova.cellToScreen({ x, y });
          if (!point || !panelRect) return false;
          return (
            point.x >= panelRect.left &&
            point.x <= panelRect.right &&
            point.y >= panelRect.top &&
            point.y <= panelRect.bottom
          );
        });
        const boardRight = canvasRect ? canvasRect.right : 0;
        const freeWidth = panelRect ? boardRight - panelRect.right : 0;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          panelWidth: panelRect ? panelRect.width : 0,
          panelBottom: panelRect ? panelRect.bottom : 0,
          boardWidth: canvasRect ? canvasRect.width : 0,
          freeBoardWidth: freeWidth,
          freeBoardShare: canvasRect ? freeWidth / canvasRect.width : 0,
          occludedBlockedCells: occluded.length,
          sawtooth: null,
        };
      }, BLOCKED);
      const current = await stats(page);
      report.answers[`viewport-${viewport.width}`] = { ...metrics, terrainInstances: current.terrainInstances };
      if (metrics.scrollWidth > metrics.clientWidth + 1) {
        fail(`horizontal overflow at ${viewport.width}x${viewport.height}`);
      }
      if (metrics.panelWidth > viewport.width * 0.62) {
        fail(
          `HUD too wide at ${viewport.width}x${viewport.height}: ${Math.round(metrics.panelWidth)}px of ${viewport.width}px`
        );
      }
      if (metrics.panelBottom > viewport.height + 1) {
        finding(
          `at ${viewport.width}x${viewport.height} the panel reaches ${Math.round(metrics.panelBottom)}px, past the viewport: the lower rows scroll`
        );
      }
      ok(
        `viewport ${viewport.width}x${viewport.height}: HUD ${Math.round(metrics.panelWidth)}px (${Math.round(
          (metrics.panelWidth / viewport.width) * 100
        )}%), board free ${Math.round(metrics.freeBoardShare * 100)}%, ${metrics.occludedBlockedCells}/${BLOCKED.length} blocked cells behind the HUD`
      );
      await page.screenshot({ path: `${ART}/04-responsive-${viewport.width}.png` });

      // The HUD collapse control: with the panels hidden the whole board is
      // clickable, and the placement/refusal status line stays visible.
      await page.click('[data-testid="hud-toggle"]');
      await new Promise((r) => setTimeout(r, 250));
      const collapsed = await page.evaluate((blockedKeys) => {
        const panel = document.querySelector('#nova-ui');
        const canvas = document.querySelector('canvas#nova-canvas');
        const panelRect = panel ? panel.getBoundingClientRect() : null;
        const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
        const occluded = blockedKeys.filter((key) => {
          const [x, y] = key.split(',').map(Number);
          const point = window.__nova.cellToScreen({ x, y });
          if (!point || !panelRect) return false;
          return (
            point.x >= panelRect.left &&
            point.x <= panelRect.right &&
            point.y >= panelRect.top &&
            point.y <= panelRect.bottom
          );
        });
        return {
          panelWidth: panelRect ? panelRect.width : 0,
          panelHeight: panelRect ? panelRect.height : 0,
          freeBoardShare: canvasRect ? (canvasRect.right - (panelRect?.right ?? 0)) / canvasRect.width : 0,
          occludedBlockedCells: occluded.length,
          expanded: document.querySelector('[data-testid="hud-toggle"]')?.getAttribute('aria-expanded'),
          statusVisible: (document.querySelector('#ui-status')?.textContent ?? '').length > 0,
        };
      }, BLOCKED);
      const collapsedStats = await stats(page);
      report.answers[`collapsed-${viewport.width}`] = { ...collapsed, stats: collapsedStats.panelCollapsed };
      if (collapsedStats.panelCollapsed !== 'true') {
        fail(`HUD did not collapse at ${viewport.width}x${viewport.height}`);
      }
      if (!collapsed.statusVisible) {
        fail(`the status line disappeared when the HUD was collapsed at ${viewport.width}`);
      }
      if (collapsed.occludedBlockedCells > 0 && collapsed.occludedBlockedCells >= metrics.occludedBlockedCells) {
        finding(
          `collapsing the HUD at ${viewport.width}x${viewport.height} left the same occluded cells (${collapsed.occludedBlockedCells}/${BLOCKED.length}): the residual occlusion is the status band, not the panels`
        );
      }
      ok(
        `collapsed ${viewport.width}x${viewport.height}: HUD ${Math.round(collapsed.panelWidth)}px tall ${Math.round(
          collapsed.panelHeight
        )}px, board free ${Math.round(collapsed.freeBoardShare * 100)}%, ${collapsed.occludedBlockedCells}/${BLOCKED.length} blocked cells behind the HUD`
      );
      await page.screenshot({ path: `${ART}/05-collapsed-${viewport.width}.png` });
      await page.click('[data-testid="hud-toggle"]');
      await new Promise((r) => setTimeout(r, 200));
      const restored = await stats(page);
      if (restored.panelCollapsed !== 'false') {
        fail(`HUD did not restore at ${viewport.width}x${viewport.height}`);
      }
    }

    writeFileSync(`${ART}/readability-report.json`, JSON.stringify(report, null, 2));
    ok(`report written to ${ART}/readability-report.json`);
  } catch (e) {
    console.error(`SPATIAL READABILITY FAIL: ${e.message}`);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('SPATIAL READABILITY RESULT: FAIL');
  else console.log('SPATIAL READABILITY RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`SPATIAL READABILITY FAIL: ${e.message}`);
  process.exitCode = 1;
});
