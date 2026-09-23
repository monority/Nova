/* NOVA Step 10AW terrain READABILITY audit (audit-only, no production change).
 *
 * Measures whether a player can UNDERSTAND terrain with the shipped UI:
 *   1. which cells are blocked (rendered instances + visual distinction);
 *   2. why a placement is refused (hover and click feedback);
 *   3. whether the reason is visible in the layout at every viewport;
 *   4. how a blocked cell is visually separated from ground/road/building;
 *   5. what the HUD explains about terrain OUTSIDE the transient status line.
 *
 * Presentation problems found here are DOCUMENTED, not fixed (Step 10AW §13).
 * Screenshots: artifacts/terrain-readability/.
 * Mode: headed by default, override NOVA_TERRAIN_READABILITY_MODE=headless.
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

const PORT = 4196;
const BASE = `http://localhost:${PORT}/`;
const URL = `${BASE}?scenario=terrain-chokepoint`;
const ART = 'artifacts/terrain-readability';
const MODE = (process.env.NOVA_TERRAIN_READABILITY_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';
const BLOCKED = ['0,1', ...[0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((y) => `2,${y}`)];
const BLOCKED_CELL = { x: 2, y: 3 };
const FREE_CELL = { x: 3, y: 3 };

const fail = (msg) => {
  console.error(`READABILITY FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`READABILITY PASS: ${msg}`);
const finding = (msg) => console.log(`READABILITY FINDING: ${msg}`);

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

async function main() {
  mkdirSync(ART, { recursive: true });
  const preview = spawn(
    process.execPath,
    [VITE_BIN, 'preview', '--port', String(PORT), '--strictPort'],
    { stdio: 'pipe', shell: false }
  );
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) break;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
    if (i === 99) throw new Error('preview start timeout');
  }

  let browser;
  const report = { viewports: [], refused: {}, huds: {}, findings: [] };
  try {
    browser = await chromium.launch({ headless: HEADLESS });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(URL, { waitUntil: 'load' });
    await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
    await waitFor(async () => (await stats(page)).terrainInstances === String(BLOCKED.length), 'terrain drawn');
    const initial = await stats(page);
    ok(`terrain rendered: ${initial.terrainInstances} instances for ${BLOCKED.length} blocked cells`);
    report.terrainInstances = initial.terrainInstances;

    // --- 2. refusal feedback: hover and click on a blocked cell ---------------
    const hover = await page.evaluate(async (cell) => {
      const point = window.__nova.cellToScreen(cell);
      return point;
    }, BLOCKED_CELL);
    if (hover === null) throw new Error('cellToScreen null');
    await page.mouse.move(hover.x, hover.y);
    await waitFor(async () => (await stats(page)).status.includes('blocked by terrain'), 'hover reason');
    report.refused.hover = (await stats(page)).status;
    ok(`hover on a blocked cell explains the refusal: "${report.refused.hover}"`);

    const before = await stats(page);
    await page.mouse.click(hover.x, hover.y);
    const after = await stats(page);
    if (after.buildings !== before.buildings || after.construction !== before.construction || after.tick !== before.tick) {
      fail('a refused click mutated the state');
    } else {
      ok(`refused click mutates nothing (${after.buildings} buildings, material ${after.construction}, tick ${after.tick})`);
    }
    report.refused.click = after.status;

    // A FREE neighbour must still read as buildable: the refusal is cell-specific.
    const freePoint = await page.evaluate((cell) => window.__nova.cellToScreen(cell), FREE_CELL);
    await page.mouse.move(freePoint.x, freePoint.y);
    await waitFor(async () => (await stats(page)).status.includes('ready'), 'free cell ready');
    report.refused.freeNeighbour = (await stats(page)).status;
    ok(`the free neighbour of a blocked cell still reads ready: "${report.refused.freeNeighbour}"`);

    // The ROAD tool has its own feedback path for the same cell.
    await page.click('[data-testid="build-road"]');
    await page.mouse.move(hover.x, hover.y);
    await waitFor(async () => (await stats(page)).status.includes('blocked by terrain'), 'road hover reason');
    report.refused.roadHover = (await stats(page)).status;
    ok(`road tool hover on a blocked cell: "${report.refused.roadHover}"`);

    // --- 3/5. what explains terrain outside the transient status line? --------
    report.huds = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      const status = document.querySelector('[data-testid="ui-status"]');
      return {
        bodyMentionsTerrain: text.includes('terrain'),
        bodyMentionsBlocked: text.includes('blocked'),
        statusTestId: status ? status.getAttribute('data-testid') : null,
        panelText: (document.querySelector('#nova-ui')?.textContent ?? '').slice(0, 300),
        legendTestIds: Array.from(document.querySelectorAll('[data-testid]'))
          .map((element) => element.getAttribute('data-testid'))
          .filter((id) => id && /terrain|legend/i.test(id)),
        permanentTerrainText: (document.querySelector('#nova-ui')?.textContent ?? '')
          .toLowerCase()
          .includes('terrain'),
      };
    });
    if (report.huds.legendTestIds.length === 0) {
      finding('no HUD surface (legend/label/test id) explains terrain: the only explanation is the transient status line, so a player who moves the pointer away loses the information');
    }
    if (report.huds.bodyMentionsTerrain && !report.huds.permanentTerrainText) {
      finding('the word "terrain" appears in the UI only through the scenario name and the transient status line: the panel itself carries no terrain legend or explanation of what a blocked cell does');
    }
    if (report.huds.permanentTerrainText) {
      finding('the panel mentions terrain only as scenario framing (the objective constraint sentence), never as a rule: nothing in the HUD states that a blocked cell can never hold a road or a building, and there is no legend for the visual style');
    }

    // --- 1/4. visual distinction and layout at every viewport ----------------
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 420, height: 740 },
      { width: 360, height: 640 },
    ]) {
      await page.setViewportSize(viewport);
      await new Promise((r) => setTimeout(r, 350));
      const metrics = await page.evaluate((cells) => {
        const doc = document.documentElement;
        const canvas = document.querySelector('canvas#nova-canvas');
        const panel = document.querySelector('#nova-ui');
        const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
        const panelRect = panel ? panel.getBoundingClientRect() : null;
        const hiddenBlocked = cells.filter((cell) => {
          const point = window.__nova.cellToScreen(cell);
          if (!point || !panelRect) return false;
          return (
            point.x >= panelRect.left &&
            point.x <= panelRect.right &&
            point.y >= panelRect.top &&
            point.y <= panelRect.bottom
          );
        });
        const status = document.querySelector('[data-testid="ui-status"]');
        const statusRect = status ? status.getBoundingClientRect() : null;
        const hiddenKeys = hiddenBlocked.map((cell) => `${cell.x},${cell.y}`);
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          canvasWidth: canvasRect ? canvasRect.width : 0,
          canvasHeight: canvasRect ? canvasRect.height : 0,
          panelWidth: panelRect ? panelRect.width : 0,
          panelBottom: panelRect ? panelRect.bottom : 0,
          statusWidth: statusRect ? statusRect.width : 0,
          statusInsideViewport: statusRect ? statusRect.right <= viewportWidthSafe(doc) + 1 : false,
          blockedCellsBehindPanel: hiddenKeys,
        };
        function viewportWidthSafe(document) {
          return document.clientWidth;
        }
      }, BLOCKED.map((key) => {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
      }));
      const s = await stats(page);
      report.viewports.push({ viewport, ...metrics, terrainInstances: s.terrainInstances });
      await page.screenshot({ path: `${ART}/viewport-${viewport.width}.png` });
      if (metrics.scrollWidth > metrics.clientWidth + 1) {
        fail(`horizontal overflow at ${viewport.width}x${viewport.height}`);
      }
      if (metrics.canvasWidth <= 0 || metrics.canvasHeight <= 0) {
        fail(`board unusable at ${viewport.width}x${viewport.height}`);
      }
      if (s.terrainInstances !== String(BLOCKED.length)) {
        fail(`terrain instances after resize: ${s.terrainInstances}`);
      }
      if (metrics.blockedCellsBehindPanel.length > 0) {
        finding(
          `at ${viewport.width}x${viewport.height} ${metrics.blockedCellsBehindPanel.length} of ${BLOCKED.length} blocked cells project behind the left HUD overlay (e.g. ${metrics.blockedCellsBehindPanel.slice(0, 3).join(' ')}) — the terrain there is obscured by the panel, which cannot be collapsed`
        );
      }
      ok(`viewport ${viewport.width}x${viewport.height}: no overflow, board usable, terrain drawn (${s.terrainInstances})`);
    }

    writeFileSync(`${ART}/readability-report.json`, JSON.stringify(report, null, 2));
    ok(`report written to ${ART}/readability-report.json`);
  } catch (e) {
    console.error(`READABILITY FAIL: ${e.message}`);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('READABILITY RESULT: FAIL');
  else console.log('READABILITY RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`READABILITY FAIL: ${e.message}`);
  process.exitCode = 1;
});
