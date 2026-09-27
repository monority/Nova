# Step 10DB — Narrow Viewport Framing Investigation & Gate

## Objective

Investigate the narrow-viewport board clipping identified in Step 10DA.

Step 10DA found:

- no Class-A product problem;
- no gameplay evidence;
- healthy desktop and narrow-viewport interaction;
- 0 HUD-covered playable cells after Step 10CZ;
- a remaining minor observation:
  - at 420×740 and 360×640, the fixed camera causes extreme board columns to extend outside the viewport.

This step is a **measurement and decision gate**.

Do not assume the clipping is a defect.

Do not implement camera changes unless the investigation demonstrates a concrete player-facing problem.

The final decision must be one of:

- **A — Framing improvement justified**
- **B — Current framing is acceptable; freeze**
- **C — New gameplay evidence discovered**

---

# 1. Read the current state

Before changing anything, read:

- `docs/roadmap/Step10DA.md`
- `docs/roadmap/Step10CZ.md`
- `docs/26-roadmap.md`
- current rendering/camera code
- current board/grid rendering
- current placement interaction code
- current scenario catalogue
- current E2E suite
- current responsive/product audits

Treat HEAD as authoritative.

Current baseline:

- Step 10DA commit: `7a2e463`
- `SAVE_VERSION = 8`
- 11 scenarios
- simulation/economy foundations frozen
- Phase 7 complete
- Phase 8 deferred
- product experience classified healthy by 10DA

Do not reopen previous audits unless necessary to verify current behavior.

---

# 2. Reproduce the framing

Run the actual application in headed browser mode at:

```text
1280×800
420×740
360×640
```

Measure the projected board bounds.

Record:

- viewport dimensions;
- board minX;
- board maxX;
- board minY;
- board maxY;
- number of fully visible cells;
- number of partially visible cells;
- number of completely clipped cells;
- which columns/rows are affected.

Use actual rendered coordinates rather than visual estimates.

---

# 3. Distinguish visual clipping from interaction failure

This distinction is mandatory.

For every clipped or partially clipped region determine:

1. Is the cell actually unreachable?
2. Is it still possible to place/interact with it?
3. Is it required by any current scenario?
4. Is it needed for normal sandbox play?
5. Is it visible enough to understand the board boundary?
6. Does the player have a clear way to access the region?
7. Does the clipping create an actual decision or usability failure?

Do not classify:

> "some cells are outside the viewport"

as a product defect by itself.

The relevant question is:

> Does the player lose meaningful control or understanding because of it?

---

# 4. Scenario coverage analysis

For all 11 scenarios, determine whether any important interaction depends on clipped cells.

For each scenario record:

- initial player-relevant cells;
- objective-relevant cells;
- housing cells;
- production cells;
- road cells;
- completion-critical cells;
- whether any are clipped at 420×740;
- whether any are clipped at 360×640.

The analysis must distinguish:

- cells existing outside the viewport;
- cells that are actually required by the scenario.

A large board with some off-screen cells is not inherently a problem.

---

# 5. Normal sandbox analysis

The product is not only its scenarios.

Test the normal sandbox flow:

- inspect the board;
- hover cells across the visible region;
- pan/zoom only if those capabilities actually exist;
- place representative buildings;
- place roads;
- inspect existing buildings;
- interact near each viewport boundary.

Do not invent camera controls if none currently exist.

Determine whether the fixed framing creates:

- inaccessible cells;
- confusing board boundaries;
- inability to plan;
- inability to inspect;
- accidental interaction failures;
- excessive trial-and-error.

---

# 6. Compare desktop and narrow UX

Measure the same product flow at:

### Desktop

```text
1280×800
```

### Narrow

```text
420×740
360×640
```

Compare:

- percentage of board visible;
- central playable area;
- scenario-critical visibility;
- HUD visibility;
- objective visibility;
- palette visibility;
- placement feedback;
- inspection;
- road interaction.

Do not require identical framing across viewports.

The goal is not visual symmetry.

The goal is usable spatial comprehension.

---

# 7. Test possible explanations before proposing a fix

If clipping appears problematic, identify the actual cause.

Inspect whether it is caused by:

- fixed camera position;
- fixed orthographic scale;
- HUD constraints;
- board dimensions;
- canvas sizing;
- device pixel ratio;
- responsive CSS;
- viewport aspect ratio;
- deliberate board framing.

Do not immediately introduce:

- dynamic zoom;
- camera controls;
- camera panning;
- scrollable world;
- minimap;
- alternate mobile layout.

Those are possible solutions only if evidence requires them.

---

# 8. Measure potential minimal fixes conceptually

If a real problem is demonstrated, evaluate the smallest possible framing adjustment.

Candidates may include:

- viewport-dependent orthographic scale;
- deterministic camera offset;
- fit-to-board scale;
- narrow-only framing adjustment.

For each candidate determine:

- board visibility;
- central-cell readability;
- HUD relationship;
- interaction precision;
- desktop regression risk;
- scenario regression risk;
- deterministic behavior.

Do not implement any candidate during this investigation.

The purpose is to determine whether a small correction is actually preferable to the current behavior.

---

# 9. Product decision gate

Choose exactly one outcome.

## OUTCOME A — FRAMING IMPROVEMENT JUSTIFIED

Use only if there is reproducible player-facing friction.

Document:

- exact problem;
- viewport(s);
- affected cells;
- affected interactions;
- scenario impact;
- sandbox impact;
- root cause;
- smallest viable fix;
- why the fix does not require new camera mechanics;
- validation required for a future implementation step.

Do not implement the fix in 10DB.

The next step would be a narrowly scoped framing implementation.

---

## OUTCOME B — CURRENT FRAMING ACCEPTABLE

Use if:

- clipped cells remain reachable or non-essential;
- scenario-critical interactions remain usable;
- board comprehension remains adequate;
- no meaningful interaction failure exists;
- the clipping is primarily a consequence of the intentionally fixed camera.

Explicitly freeze the issue.

Record it as an accepted product characteristic, not technical debt.

Do not create a camera implementation step.

---

## OUTCOME C — NEW GAMEPLAY EVIDENCE

Use only if the investigation reveals that spatial limitations create a genuine gameplay problem that cannot be expressed as simple presentation/framing.

Do not implement gameplay.

Document the evidence and stop.

---

# 10. Anti-scope

Do NOT:

- add camera controls;
- add pan;
- add zoom controls;
- add minimap;
- change board dimensions;
- change simulation rules;
- add gameplay mechanics;
- change building placement rules;
- change road rules;
- change scenarios;
- change objectives;
- change persistence;
- change SAVE_VERSION;
- redesign the HUD;
- alter economy behavior;
- alter progression;
- rewrite rendering architecture.

This is a framing investigation only.

---

# 11. Required test artifact

Create:

```text
tests/narrowViewportFramingInvestigation.test.ts
```

The tests must encode deterministic measurements and conclusions from the investigation.

They should cover, as appropriate:

- viewport dimensions;
- board projection;
- visible/clipped cell sets;
- scenario-critical cell visibility;
- deterministic camera behavior;
- absence/presence of interaction failure.

Do not encode subjective visual judgments as tests.

---

# 12. Documentation

Create:

```text
docs/roadmap/Step10DB.md
```

It must contain:

1. original prompt/specification;
2. current rendering model;
3. measured board bounds;
4. clipped-cell measurements;
5. scenario coverage;
6. sandbox interaction analysis;
7. desktop vs narrow comparison;
8. root-cause analysis;
9. candidate minimal fixes, if relevant;
10. classified findings;
11. final decision gate;
12. reopening evidence;
13. explicit non-goals;
14. complete validation results.

---

# 13. Validation

Because this is a browser/rendering investigation, browser validation is mandatory.

### Focused test

```bash
pnpm vitest run tests/narrowViewportFramingInvestigation.test.ts
```

### Full suite

```bash
pnpm vitest run
```

Expected baseline should remain:

```text
1829 / 1829
```

If the current repository has legitimately changed the test count, report the exact result instead of assuming the number.

### Static validation

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
git diff --check
```

### Browser

Run the relevant existing browser suites plus the investigation.

Required viewports:

```text
1280×800
420×740
360×640
```

At minimum verify:

- scenario selection;
- placement;
- housing;
- roads;
- inspection;
- Town/progression;
- product/responsive audit;
- narrow framing.

### GPU

Run the existing headed GPU/WebGL2 verification.

Expected:

```text
WebGL2
NVIDIA RTX 3070
hardware accelerated
0 errors
```

Do not claim this unless actually executed.

---

# 14. Final scope audit

Before committing:

```bash
git status --short
git diff --stat
git diff --check
git diff --name-only
```

Expected scope should be limited to:

```text
tests/narrowViewportFramingInvestigation.test.ts
docs/roadmap/Step10DB.md
```

If you discover that implementation is required, do NOT silently expand this step into implementation.

Stop at the gate and report the required next step.

Do not touch:

```text
AGENTS.md
docs/roadmap/Step10BO - Copy.md
docs/roadmap/Step10BT.md
```

If those files are absent, simply report that they were absent.

---

# 15. Commit

If the investigation is complete and the audit artifacts are correct:

```text
Step 10DB: Narrow Viewport Framing Investigation
```

Commit only the investigation artifacts.

Do not push.

---

# Final report

Return:

- Outcome A/B/C;
- measured board bounds for all three viewports;
- clipped-cell counts;
- scenario-critical cell analysis;
- actual interaction impact;
- sandbox impact;
- root cause;
- candidate minimal correction if Outcome A;
- tests;
- full Vitest;
- typecheck;
- lint;
- build;
- browser;
- responsive;
- GPU;
- diff-check;
- changed files;
- commit hash;
- confirmation that no gameplay, persistence, economy, scenario, or SAVE_VERSION changes were made.

Core principle:

> A clipped cell is not automatically a product defect.
>
> Only create a framing implementation step if the clipping demonstrably harms player comprehension, control, or meaningful interaction.

---

## As-Built

Audit only. `src/` is unchanged; the artefacts are
`tests/narrowViewportFramingInvestigation.test.ts` (deterministic projection
measurements) and this record.

### Current Rendering Model

`src/renderer/three/scene.ts` creates one fixed `PerspectiveCamera`:

```text
fov 45, near 0.1, far 200
cameraDistance = max(grid.width, grid.height) * 1.4 = 12 * 1.4 = 16.8
position = (0, cameraDistance * 0.8, cameraDistance * 0.9) = (0, 13.44, 15.12)
lookAt(0, 0, 0)
```

`resize(width, height)` only updates `camera.aspect` (and the renderer size);
the position, distance, fov and target never change. `cellToScreen` and
`pickCell` share `simulationCellToWorldPosition` and the live camera, so they
stay mutually consistent at every aspect. The app grid is 12x12
(`WORLD_CONFIG`). There is **no pan, zoom or camera control** anywhere in the
UI or command set.

The investigation test reproduces this exact projection with three.js and is
validated against the browser: the model returns board bounds
`x∈[310, 970], y∈[255, 619]` at 1280x800, matching the Step 10DA product-audit
measurement exactly.

### Measured Board Bounds

| Viewport | minX | maxX | minY | maxY |
| --- | --- | --- | --- | --- |
| 1280x800 | 310 | 970 | 255 | 619 |
| 420x740 | -95 | 515 | 236 | 572 |
| 360x640 | -84 | 444 | 204 | 495 |

The board is centred on the origin, so at narrow widths it is wider than the
viewport and both edges leave the screen.

### Clipped-Cell Measurements

Per-cell classification uses the projected 1x1 tile (4 corners): fully visible
= all corners inside; partially visible = some; clipped = none.

| Viewport | Centre visible | Fully visible | Partially visible | Clipped | Clipped columns |
| --- | --- | --- | --- | --- | --- |
| 1280x800 | 144 / 144 | 144 | 0 | **0** | - |
| 420x740 | 114 / 144 | 100 | 28 | **16** | 0, 1, 10, 11 |
| 360x640 | 112 / 144 | 100 | 28 | **16** | 0, 1, 10, 11 |

At narrow viewports the clipping is confined to the **two outer columns on each
side** (their front/lower half); the 16 fully clipped cells are 11% of the
board and are the physical perimeter corners. Columns 2-9 are fully visible at
every viewport, so the centre is always in view.

### Scenario Coverage

Every scenario's start-state cell (buildings, roads and colonist residences)
is inside the simulated board, and **none is fully clipped at 420x740 or
360x640** (deterministic check, `SCENARIO_CELLS` audit). Start-state cell counts
run from 0 (`first-settlement`, `spatial-efficiency`, which begin empty) to 18
(`town-balance`). Cells the player places during play are free choices; the
narrow viewport still exposes 100 fully visible + 28 partially visible cells
(89% of the board), which is ample room for any scenario's construction cells
(one Residence + up to a few roads, all near the served structures).

Conclusion: no scenario-critical interaction depends on a clipped cell at any
required viewport.

### Sandbox Interaction Analysis

- **Reachability**: a clipped tile extends outside the viewport, so it cannot
  receive a canvas pointer event — it is genuinely unreachable. Partially
  visible tiles remain pickable from their visible area (the raycast hits the
ground tile).
- **Controls**: there is no pan/zoom, so the off-screen perimeter cannot be
  brought into view. This is intentional: the board is a fixed maquette, not a
  scrollable world.
- **Hover/placement/inspection**: verified at all three viewports by the
  product audit and the scenario suites — hover feedback, placement,
  inspection, roads and workforce actions work across the visible region.
- **Boundary comprehension**: the ground plane and grid render continuously, so
  the player reads a board that is larger than the screen rather than a broken
  edge; no clipped cell gives misleading feedback because nothing is drawn for
  it inside the viewport.
- **Normal play**: sandbox building is unrestricted across the visible 128
  cells; the unreachable 16 are perimeter corners with no simulation meaning
  (no scenario, service or progression condition targets them).

No interaction failure was reproduced.

### Desktop vs Narrow Comparison

| Dimension | 1280x800 | 420x740 / 360x640 |
| --- | --- | --- |
| Board fully visible | 144/144 (100%) | 100/144 (69%) |
| Reachable cells | 144/144 | 128/144 (89%) |
| Unreachable | 0 | 16/144 (11%), outer columns only |
| Centre columns 2-9 | fully visible | fully visible |
| Scenario-critical cells | visible | visible |
| HUD / objective / palette | visible, 0 occlusion | visible, 0 occlusion |
| Hover / placement / inspection / roads | works | works |

Framing is not identical across viewports, and does not need to be: the spatial
comprehension required for every current decision is preserved.

### Root-Cause Analysis

The clipping is caused **solely by the fixed camera distance** combined with the
viewport aspect ratio. `resize` adapts only `aspect`, and at 12 world units
wide the board subtends more horizontal pixels than a 360-420px viewport
offers. It is not caused by the HUD (0 cells covered after 10CZ), canvas
sizing, device pixel ratio, CSS, the board dimensions (the grid is a fixed
12x12 by design) or the scenario catalogue. It is the deliberate
fixed-diorama framing, which is why desktop shows the whole board and narrow
viewports show the centre.

### Candidate Minimal Fixes (conceptual only, not implemented)

If narrow full-board access were required, the smallest candidates are:

1. **Narrow-only fit-to-board scale** — increase the camera distance (or reduce
   the effective fov) below a width threshold so the 12-wide board fits; the
   projection stays deterministic and `cellToScreen`/`pickCell` stay consistent.
   Cost: smaller tiles (worse tap precision/readability) at narrow.
2. **Deterministic narrow camera offset** — centre the board horizontally; does
   not help on its own because the board is wider than the viewport.
3. **Clamp interaction to the board instead of the viewport** — no change to
   what is visible; does not recover reachability.

All candidates are camera/framing changes; none is required by the measured
player impact below. Evaluation is therefore deferred.

### Classified Findings

- **A — meaningful product problem: none.** The clipping does not break any
  scenario, comprehension path, or sandbox decision available today.
- **B — minor, accepted characteristic:** the outer two columns' front corners
  are off-screen at 420x740 / 360x640 under the fixed camera (16 cells, 11%).
  Reachable board area remains 89%, the centre is always framed, and no scenario
  references the clipped cells. Recorded as an accepted framing consequence,
  not technical debt.
- **C — no problem:** desktop framing, centre visibility, scenario coverage,
  hover/placement/inspection/road/workforce interaction, HUD non-occlusion,
  deterministic projection.
- **D — new gameplay evidence: none.** No spatial limitation reveals a gameplay
  problem beyond presentation/framing.

### Final Decision Gate

**OUTCOME B — CURRENT FRAMING IS ACCEPTABLE; FREEZE.**

### Reopening Evidence

Reopen only if:

- a scenario is authored (or an objective introduced) that requires a cell in
  columns 0-1 or 10-11 in the clipped front rows at a narrow viewport; or
- narrow-viewport sandbox play over the full 12x12 board becomes an explicit
  product goal; or
- player evidence shows lost comprehension, control or meaningful interaction
  (not merely "a cell is off-screen").

A reopening would justify the narrow-only fit-to-board scale (candidate 1), not
a new camera mechanic.

### Explicit Non-Goals

No camera controls, pan, zoom, minimap, board-dimension change, simulation
rule, gameplay mechanic, placement/road rule, scenario/objective change,
persistence field or `SAVE_VERSION` change, HUD redesign, economy/progression
change, or rendering rewrite.

### Complete Validation Results

- focused: `tests/narrowViewportFramingInvestigation.test.ts` — **7/7 PASS**
  (projection model validated against the browser bounds)
- full Vitest: **1836 passed / 0 failed (114 files)** (10DA baseline 1829 + 7)
- typecheck: PASS; lint: PASS; production build: PASS; `git diff --check`: clean
- browser (headed): product audit PASS; housing, progression, town-gate,
  upkeep, jobs, road, water, farm-well-allocation, spatial-readability — all
  pass; required viewports 1280x800 / 420x740 / 360x640
- GPU/WebGL2: PASS — NVIDIA GeForce RTX 3070 (unmasked), WebGL2, hardware path,
  zero console/page errors
- `SAVE_VERSION` remains **8**; no gameplay, persistence, economy, scenario or
  SAVE_VERSION change.

Commit: `Step 10DB: Narrow Viewport Framing Investigation`
