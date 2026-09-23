/* NOVA Step 10AZ housing-composition READABILITY audit (audit-only).
 *
 * Phase A: can a player READ the housing-composition phenomenon with the
 * EXISTING UI? No production change, no new fixture: the audit uses the
 * existing terrain-chokepoint fixture (2 networks, one unserved Residence, one
 * vacant workplace — exactly the housing causal shape) plus the Recovery
 * scenario (a stranded workplace and an unemployed colonist).
 *
 * Answers the six questions of the step prompt with real browser interaction and
 * records the presentation gaps as FINDINGS (not fixes).
 * Screenshots: artifacts/housing-readability/.
 * Mode: headed by default, override NOVA_HOUSING_READABILITY_MODE=headless.
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

const PORT = 4197;
const BASE = `http://localhost:${PORT}/`;
const FIXTURE = `${BASE}?scenario=terrain-chokepoint`;
const RECOVERY = `${BASE}?scenario=recovery`;
const ART = 'artifacts/housing-readability';
const MODE = (process.env.NOVA_HOUSING_READABILITY_MODE ?? 'headed').toLowerCase();
const HEADLESS = MODE === 'headless';

const fail = (msg) => {
  console.error(`HOUSING READABILITY FAIL: ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`HOUSING READABILITY PASS: ${msg}`);
const finding = (msg) => {
  console.log(`HOUSING READABILITY FINDING: ${msg}`);
  REPORT.findings.push(msg);
};
const REPORT = { answers: {}, findings: [] };

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

async function load(page, url, expectReadyText, scenarioId = null) {
  await page.goto(url, { waitUntil: 'load' });
  await waitFor(() => page.evaluate(() => window.__nova?.ready === true), 'app ready');
  if (scenarioId !== null) {
    // Catalogue scenarios are chosen through the select (the deep link resolves
    // fixtures only), so the audit drives the real control.
    await page.selectOption('[data-testid="scenario-select"]', scenarioId);
  }
  await waitFor(async () => {
    const s = await stats(page);
    return s.status.includes(expectReadyText) ? s : null;
  }, `loaded ${url}${scenarioId === null ? '' : ` (${scenarioId})`}`);
  return stats(page);
}

async function pointAt(page, cell) {
  const point = await page.evaluate((c) => window.__nova.cellToScreen(c), cell);
  if (!point) throw new Error(`cellToScreen null for ${cell.x},${cell.y}`);
  await page.mouse.move(point.x, point.y);
  return point;
}

async function selectBuilding(page, cell) {
  const point = await pointAt(page, cell);
  await page.mouse.click(point.x, point.y);
  return waitFor(async () => {
    const inspection = await page.evaluate(() => window.__nova.selectedBuilding());
    return inspection !== null ? inspection : null;
  }, `selected building at ${cell.x},${cell.y}`);
}

const panelText = (page, testid) =>
  page.evaluate((id) => document.querySelector(`[data-testid="${id}"]`)?.textContent ?? '', testid);

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

    // --- the housing shape: the existing split fixture -----------------------
    let s = await load(page, FIXTURE, 'Terrain chokepoint');
    ok(`fixture loaded: ${s.roadNetworks} networks, served ${s.waterServedResidences}, jobs ${s.jobs}`);

    // Q1 — how many Residences are served?
    const waterRow = await panelText(page, 'stat-water');
    const waterStatus = await panelText(page, 'stat-water-status');
    report.answers.servedResidences = {
      statsField: s.waterServedResidences,
      hudWaterRow: waterRow,
      hudSupplySuffix: waterStatus,
    };
    const hudShowsServedCount = /\d+\s*(of|\/)\s*\d+/.test(`${waterRow} ${waterStatus}`);
    if (!hudShowsServedCount) {
      finding(
        'Q1 — the colony-wide SERVED RESIDENCE COUNT is not in the HUD: the Water row shows the stock and the supply state only, so the player must inspect Residences one by one to count service'
      );
    }
    if (/served/.test(waterStatus) && Number(s.waterServedResidences) < 2) {
      finding(
        `Q1/label — the HUD can read "Water 20 · served" while a Residence is NOT served: "served" on the Water row is the supply state (supplied), not the coverage count, so the same word describes two different facts on the same screen`
      );
    }
    ok(`Q1 served Residences: stats ${s.waterServedResidences}, HUD "${waterRow}" "${waterStatus}"`);

    // Q2 — why is a Residence not served?
    await selectBuilding(page, { x: 1, y: 0 });
    const housingLine = await panelText(page, 'inspection-housing');
    report.answers.residenceCause = housingLine;
    if (!housingLine.includes('Water not served')) fail(`west Residence cause missing: ${housingLine}`);
    ok(`Q2 residence cause: "${housingLine}"`);

    // Q3 — which workplaces can each colonist reach?
    // The west colonist works the west Farm, so its inspector exposes the
    // reassignment targets and their reasons.
    await selectBuilding(page, { x: 1, y: 2 });
    const options = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-testid="reassign-target"] option')).map(
        (option) => ({ text: option.textContent ?? '', disabled: option.disabled })
      )
    );
    report.answers.workplaceEligibility = options;
    const blockedTarget = options.find((option) => /no road access/.test(option.text));
    if (blockedTarget === undefined) {
      fail(`no visible "no road access" workplace option: ${JSON.stringify(options)}`);
    } else {
      ok(`Q3 workplace eligibility: "${blockedTarget.text}" (disabled ${blockedTarget.disabled})`);
    }

    // Q6 — which action corrects the situation?
    await page.click('[data-testid="build-road"]');
    await pointAt(page, { x: 2, y: 1 });
    const connectorFeedback = await waitFor(async () => {
      const status = (await stats(page)).status;
      return status.includes('ready') ? status : null;
    }, 'connector road feedback');
    report.answers.recoveryAction = connectorFeedback;
    if (!/material 5/.test(connectorFeedback)) fail(`connector road cost missing: ${connectorFeedback}`);
    ok(`Q6 recovery action: "${connectorFeedback}"`);

    // Placement readability: two legal Residence cells on different networks
    // must be distinguishable BEFORE building.
    await page.click('[data-testid="build-residence"]');
    const hoverEast = await (async () => {
      await pointAt(page, { x: 3, y: 0 });
      return waitFor(async () => {
        const status = (await stats(page)).status;
        return status.includes('ready') || status.includes('insufficient') ? status : null;
      }, 'east hover');
    })();
    const hoverUnserved = await (async () => {
      await pointAt(page, { x: 0, y: 0 });
      return waitFor(async () => {
        const status = (await stats(page)).status;
        return status.includes('ready') || status.includes('insufficient') ? status : null;
      }, 'west hover');
    })();
    // The cell coordinates are the only difference a player can see: compare the
    // feedback WITHOUT them.
    const information = (status) => status.replace(/^cell \d+,\d+ — /, '');
    report.answers.placementHover = {
      eastNetwork: hoverEast,
      unservedCell: hoverUnserved,
      eastInformation: information(hoverEast),
      unservedInformation: information(hoverUnserved),
    };
    if (information(hoverEast) === information(hoverUnserved)) {
      finding(
        `placement — the hover feedback carries the SAME information for a cell that yields a served Residence and one that yields an unserved Residence ("${information(hoverEast)}"): which road network a new Residence will join is only visible AFTER building, in the Residence inspector`
      );
    }
    await page.screenshot({ path: `${ART}/01-placement-hover.png` });

    // --- the unemployment and progression questions: the Recovery scenario ---
    s = await load(page, BASE, 'Scenario — Recovery', 'recovery');
    const jobsRow = await panelText(page, 'stat-jobs');
    await selectBuilding(page, { x: 1, y: 0 });
    const recoveryOptions = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-testid="reassign-target"] option')).map(
        (option) => ({ text: option.textContent ?? '', disabled: option.disabled })
      )
    );
    report.answers.unemployment = { statsJobs: s.jobs, hudJobs: jobsRow, options: recoveryOptions };
    const strandedTarget = recoveryOptions.find((option) => /no road access/.test(option.text));
    if (strandedTarget === undefined) {
      finding(
        `Q4 — the unemployment CAUSE is not inspectable: jobs read "${s.jobs}" but the reassignment list is empty for an unemployed colonist, because the reassignment control only appears for a building that already employs someone`
      );
      ok(`Q4 unemployment: jobs ${s.jobs} visible, cause not inspectable (finding recorded)`);
    } else {
      ok(`Q4 unemployment cause: jobs ${s.jobs}, "${strandedTarget.text}"`);
    }

    const stage = await panelText(page, 'progression-stage');
    const next = await panelText(page, 'progression-next');
    const progress = await panelText(page, 'progression-progress');
    const blocked = await panelText(page, 'progression-blocked');
    report.answers.progression = { stage, next, progress, blocked };
    if (!progress.includes('✗') || blocked.trim().length === 0) {
      fail(`Q5 progression blocker missing: ${progress} / ${blocked}`);
    } else {
      ok(`Q5 progression blocker: stage ${stage}, "${blocked}"`);
    }
    await page.screenshot({ path: `${ART}/02-recovery-inspection.png` });

    // The Water-capacity blocker the housing phenomenon produces: the same
    // progression surface in a scenario whose blocker IS Water capacity.
    await load(page, BASE, 'Scenario — Water constraint', 'water-constraint');
    const waterBlocked = await panelText(page, 'progression-blocked');
    report.answers.waterCapacityBlocker = waterBlocked;
    if (!/Water capacity/.test(waterBlocked)) {
      fail(`Q5 Water-capacity blocker missing: ${waterBlocked}`);
    } else {
      ok(`Q5 Water-capacity blocker is named: "${waterBlocked}"`);
    }

    // --- responsive ---------------------------------------------------------
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 420, height: 740 },
      { width: 360, height: 640 },
    ]) {
      await page.setViewportSize(viewport);
      await new Promise((r) => setTimeout(r, 300));
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const panel = document.querySelector('#nova-ui');
        const canvas = document.querySelector('canvas#nova-canvas');
        const panelRect = panel ? panel.getBoundingClientRect() : null;
        const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          panelWidth: panelRect ? panelRect.width : 0,
          canvasWidth: canvasRect ? canvasRect.width : 0,
          panelBottom: panelRect ? panelRect.bottom : 0,
          inspectionVisible: Boolean(document.querySelector('#nova-ui')?.textContent),
        };
      });
      report.answers[`responsive-${viewport.width}`] = metrics;
      if (metrics.scrollWidth > metrics.clientWidth + 1) {
        fail(`horizontal overflow at ${viewport.width}x${viewport.height}`);
      }
      if (metrics.panelWidth > viewport.width * 0.6) {
        finding(
          `at ${viewport.width}x${viewport.height} the HUD occupies ${Math.round((metrics.panelWidth / viewport.width) * 100)}% of the viewport width: the board — and therefore the Residence cells the decision is about — sits behind the panel`
        );
      }
      if (metrics.panelBottom > viewport.height) {
        finding(
          `at ${viewport.width}x${viewport.height} the panel (including the inspection block) extends to ${Math.round(metrics.panelBottom)}px, past the viewport: the answer surfaces scroll instead of staying visible`
        );
      }
      await page.screenshot({ path: `${ART}/03-responsive-${viewport.width}.png` });
      ok(`responsive ${viewport.width}x${viewport.height}: no overflow, panel ${metrics.panelWidth}px`);
    }

    writeFileSync(`${ART}/readability-report.json`, JSON.stringify(report, null, 2));
    ok(`report written to ${ART}/readability-report.json`);
  } catch (e) {
    console.error(`HOUSING READABILITY FAIL: ${e.message}`);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    preview.kill();
  }
  if (process.exitCode) console.log('HOUSING READABILITY RESULT: FAIL');
  else console.log('HOUSING READABILITY RESULT: ALL PASS');
}

main().catch((e) => {
  console.error(`HOUSING READABILITY FAIL: ${e.message}`);
  process.exitCode = 1;
});
