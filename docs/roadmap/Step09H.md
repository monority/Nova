# NOVA — Step 09H — Player-Facing Road Construction

## Context

NOVA has now completed:

* 09C — road construction domain command;
* 09D — road network connectivity;
* 09E — building road access;
* 09F — Workshop production requires road access;
* 09G — derived Residence ↔ Workplace mobility connectivity.

09G confirmed an important product gap:

* the domain already supports road construction;
* the domain already supports road networks and building road access;
* Workshop production is already blocked without road access;
* but the player-facing UI currently has no Road construction tool.

This means the simulation contains a real dependency that the player cannot currently satisfy through the UI.

The purpose of this step is to close that gap.

---

# 1. Mandatory workflow

Follow:

AUDIT → OBSERVATIONS → DESIGN DECISION → IMPLEMENTATION → VERIFICATION

Do not begin implementation before auditing the current repository.

Do not assume the prompt's proposed file names or APIs are correct if the repository has a different established convention.

Prefer existing NOVA patterns over introducing abstractions.

---

# 2. Primary objective

Make the existing road construction system player-accessible through the current UI.

The player must be able to:

1. select a Road construction tool;
2. preview valid/invalid road cells;
3. construct one or more road cells;
4. use the existing `placeRoads` / road command path;
5. see Material consumed according to the existing domain rule;
6. see construction state;
7. see the road become operational;
8. see adjacent Workshop road access activate;
9. see Workshop production resume.

This is a UI/application integration step.

Do NOT redesign the road domain.

---

# 3. Audit first

Inspect:

* current building palette/tool system;
* building placement interaction;
* pointer/grid picking;
* drag placement implementation;
* placement preview;
* material affordability preview;
* command dispatch architecture;
* simulation stepping;
* HUD/debug state;
* existing browser E2E helpers;
* current road command APIs from 09C;
* current road validation rules;
* current road construction lifecycle.

Determine the smallest way to expose the existing road command through the existing UI architecture.

Document:

### Discovered rule

What the existing code actually does.

### Derived technical rule

What the UI must do to correctly call the existing domain/application layer.

### Intentional design rule

What this step deliberately introduces for gameplay.

---

# 4. Design constraints

## 4.1 Reuse existing domain rules

The UI must NOT duplicate road placement validation.

Do not create a second implementation of:

* bounds validation;
* occupancy validation;
* Material cost;
* road construction duration;
* road lifecycle;
* road/building collision;
* deterministic multi-cell placement.

The domain remains authoritative.

---

## 4.2 Reuse existing placement architecture

If building placement currently follows a path such as:

UI
→ controller
→ dispatchCommand
→ stepSimulation
→ applyCommand

then roads should follow the equivalent existing architecture.

Do not create a direct UI mutation of `SimulationState`.

Do not mutate road state from React components or rendering code.

---

## 4.3 Road tool

Expose a player-facing Road tool using the existing palette/tool conventions.

Do not introduce a generic tool framework merely for this feature.

A simple existing-pattern extension is preferred.

The player must be able to clearly distinguish:

* building tools;
* road tool;
* currently selected tool.

---

# 5. Road placement interaction

Reuse the existing grid interaction model.

Minimum required behavior:

### Single placement

Clicking a valid cell creates a road through the existing command path.

### Drag placement

Dragging across cells creates the existing deterministic multi-cell road placement.

Support:

* horizontal drag;
* vertical drag;
* L-shaped drag if the existing `placeRoads` interaction already supports arbitrary cell sequences.

Do NOT invent a new road geometry system.

If the current domain only accepts an explicit list of cells, the UI should generate that list using the existing interaction convention.

---

# 6. Preview

Provide a clear road placement preview.

The preview must distinguish at least:

* valid placement;
* invalid placement.

The preview must not claim a placement is valid if the authoritative domain would reject it.

Where practical, reuse existing validation/query functions.

Do not create an independent validation algorithm merely for visual feedback.

The preview must respect:

* grid bounds;
* building occupancy;
* existing road occupancy;
* Material affordability.

Do not allow the UI to silently spend resources after an invalid placement.

---

# 7. Material display

Use the existing Material source of truth.

Road cost remains exactly:

```text
5 Material / road cell
```

Do not change:

* road cost;
* Material production;
* storage;
* Workshop upkeep;
* construction timing.

The UI should expose enough information for the player to understand the construction cost before committing.

Do not add a new economic resource.

---

# 8. Construction lifecycle

Use the existing 09C lifecycle.

A newly placed road must remain:

```text
underConstruction
```

until the existing simulation rules make it:

```text
operational
```

Do not introduce a separate UI-only construction state.

The rendered road should visually distinguish construction from operational status if the existing visual system supports it.

If a visual distinction is needed, derive it from authoritative road state.

---

# 9. Road access gameplay proof

The most important browser scenario is:

```text
Residence
   ↓
Colonist
   ↓
Workshop
   ↓
roadless
   ↓
production = 0
```

Then:

```text
Road construction
   ↓
road becomes operational
   ↓
Workshop gains road access
   ↓
production resumes
```

This must use the existing 09E + 09F rules.

Do NOT add another production rule.

Do NOT make `mobilityConnected` from 09G affect production.

09G remains informational only.

---

# 10. Rendering

Audit the current renderer before changing it.

Roads should be visibly recognizable as roads.

The visual should remain consistent with NOVA's current top-down futuristic architectural-maquette direction.

Prefer a simple deterministic road representation over a large visual system.

The renderer may derive:

* horizontal;
* vertical;
* intersection;
* endpoint;
* under-construction;

from authoritative road geometry/state.

Do NOT persist visual orientation.

Do NOT create a road graph in the renderer.

Do NOT add decorative transit effects yet.

No pedestrians, vehicles or traffic.

---

# 11. No new simulation mechanics

Explicitly DO NOT implement:

* movement;
* pathfinding;
* travel distance;
* travel time;
* commute penalties;
* vehicles;
* public transit;
* passengers;
* cargo;
* logistics;
* traffic;
* congestion;
* road tiers;
* highways;
* road upgrades;
* road demolition;
* road refunds;
* road maintenance/upkeep;
* money;
* pollution;
* job reassignment based on mobility;
* mobility penalties;
* persistent mobility state.

This step only exposes the existing road infrastructure to the player.

---

# 12. Persistence

SAVE_VERSION must remain:

```text
4
```

Do not add derived UI state to persistence.

Do not persist:

* selected tool;
* hover cell;
* preview state;
* mobilityConnected;
* road orientation;
* rendered road metadata.

Existing road persistence must continue to work unchanged.

Verify:

```text
save → load → same state
save → load → same hash
```

---

# 13. Determinism

Verify that repeated equivalent interactions produce identical canonical state/hash.

Road placement must remain deterministic.

Do not introduce:

* random road placement;
* wall-clock behavior;
* nondeterministic iteration;
* renderer-generated simulation state.

---

# 14. Tests

Add focused tests only where needed.

At minimum cover:

### UI/application integration

* Road tool can be selected.
* Valid road placement reaches the authoritative command path.
* Invalid placement does not mutate state.
* Insufficient Material does not mutate state.
* Building/road collision is rejected.
* Existing road occupancy is rejected.

### Interaction

* Single-cell placement.
* Horizontal drag.
* Vertical drag.
* Multi-cell deterministic placement.

### Gameplay proof

* roadless Workshop → production 0;
* operational adjacent road → road access true;
* operational adjacent road → Workshop production resumes.

### Regression

All existing tests must continue passing.

Do not rewrite historical tests merely to make them pass.

---

# 15. Browser verification

This step MUST include real browser verification because it introduces player-facing UI.

Use the existing browser/E2E infrastructure.

Do not fabricate a separate test UI.

At minimum verify with real Chromium:

### Scenario A — construction

1. Load the game.
2. Start from a clean deterministic state.
3. Select Road.
4. Hover a valid cell.
5. Confirm preview is visible.
6. Place a road.
7. Confirm Material decreases by the authoritative road cost.
8. Confirm construction state is visible.
9. Advance simulation.
10. Confirm road becomes operational.

### Scenario B — production dependency

1. Create operational Residence.
2. Create operational Workshop.
3. Confirm colonist/job assignment.
4. Confirm Workshop production is blocked without road access.
5. Build an operational adjacent road.
6. Confirm road access becomes true.
7. Confirm Workshop production resumes.
8. Confirm no browser console errors.

Capture screenshots for the meaningful states if the existing E2E tooling supports this.

---

# 16. GPU verification

If the project already has a GPU browser test path, run it.

Verify:

* canvas renders correctly;
* roads are visible;
* no WebGL errors;
* no console errors;
* no obvious clipping or coordinate mismatch;
* road preview aligns with the actual grid.

Do not add a new GPU framework.

---

# 17. Documentation

Create or update:

```text
docs/roadmap/Step09H.md
```

IMPORTANT:

If the file already exists as a committed roadmap document, NEVER overwrite it with the raw prompt.

Preserve the existing prompt/content and append the as-built implementation report.

Document:

* audit;
* observation;
* design decision;
* implementation;
* tests;
* browser verification;
* GPU verification;
* persistence;
* determinism;
* regression;
* scope audit;
* known limitations;
* next design question.

---

# 18. Scope discipline

Before finishing, explicitly audit the diff.

The step should primarily contain:

* player-facing road tool;
* road placement interaction;
* road preview;
* road rendering;
* application/UI integration;
* tests;
* E2E/browser verification;
* documentation.

If implementation starts creating:

* a generic transport framework;
* a new road graph;
* new economic rules;
* new mobility state;
* pathfinding;
* vehicles;
* transit;

STOP and reassess.

---

# 19. Required verification commands

Run the repository's actual equivalents of:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Run relevant E2E suites.

Run the real browser/GPU verification where available.

Also verify:

```text
save/load roundtrip
hash stability
deterministic replay
```

Do not claim browser/GPU verification if it was not actually executed.

---

# 20. Git

Create one focused commit:

```text
Step 09H: Player-Facing Road Construction
```

Before finishing:

```text
git status --short
git diff --stat
```

Working tree must be clean except for intentionally documented/untracked artifacts that are explicitly explained.

Never commit temporary screenshots, generated artifacts, secrets, or local machine state unless the repository convention explicitly requires them.

---

# 21. Final report

Return a concise but complete report using:

### A. Audit

### B. Observation

### C. Design Decision

### D. Implementation

### E. Tests

### F. Browser / E2E

### G. GPU verification

### H. Persistence

### I. Determinism

### J. Regression

### K. Scope Audit

### L. Git

### M. Known Limitations

### N. Next Design Question

Most importantly, report whether the following complete causal loop is now actually demonstrable in the browser:

```text
Residence
→ Colonist
→ Workshop
→ roadless production blocked
→ player constructs road
→ road operational
→ building road access
→ production resumes
```

If any part cannot be demonstrated, state exactly why instead of marking the step complete.


---

# As-built report (Step 09H implementation)

## Audit

**Discovered rule — what the code actually does:**

- Palette: `selectedBuildingType: BuildingType` (`residence`/`farm`/`workshop`) with one `aria-pressed` group; placement commits on canvas `pointerup` after hover preview; every command flows `controller.dispatch → dispatchCommand → stepSimulation → applyCommand` (single sanctioned path, `src/app/gameController.ts`).
- Rendering: `RenderSnapshot` already projected `roads[]` (`id/x/y/status`) but **nothing rendered them** (`entityViews.ts` had building/colonist ops only); single-cell placement indicator (`showPlacementIndicator`); `pickCell`/`cellToScreen` for grid picking.
- Domain already owns everything the UI needs: `placeRoads` command (09C, atomic multi-cell, normalized + deterministic order), `validateRoadsPlacement` with explicit reasons (`emptyCells/outOfBounds/cellOccupiedByBuilding/cellOccupiedByRoad/insufficientResources`), `expandRoadDrag` (single cell, horizontal, vertical; `null` for diagonal/L-shape — **unused until this step**), `ROAD_CONSTRUCTION_COST = 5`, 2-tick lifecycle with placed-road catch-up.
- `__nova.stats` already exposed `roadNetworks`, `buildingsWithRoadAccess`, `productionBlockedByRoad`, `mobilityConnectedColonists`.

**Derived technical rule — what the UI must do:** reuse, never re-implement. Preview = `validateRoadsPlacement(state, cells)`; drag shape = `expandRoadDrag(start, cell)`; commit = `controller.dispatch({ type: 'placeRoads', cells })`; orientation = derived projection (see Design Decision).

**Intentional design rule (gameplay, this step only):** the player can now satisfy the 09F dependency (Workshop production requires road access) through the UI. No economic number changes; 09G `mobilityConnected` stays informational.

## Observation

The gap was purely integrative: domain (09C), connectivity (09D), access (09E), production gate (09F), and mobility relation (09G) all existed, while the browser offered no way to place a single road cell. The smallest correct step was therefore a tool + interaction + rendering layer over the existing command path — no domain change, no new validation, no new geometry.

## Design Decision

1. **Tool model:** `PlacementTool = { kind: 'building', type } | { kind: 'road' }` — minimal extension of the existing palette convention (`aria-pressed`, status-line feedback). No generic tool framework. Road button label renders from `ROAD_CONSTRUCTION_COST`, never a hardcoded duplicate.
2. **Drag:** pointerdown anchors, pointermove expands via `expandRoadDrag`, pointerup commits. Diagonal/L-shape → explicit "not supported" message, no dispatch. Invalid sets never dispatch (no tick, no Material spent); the set is re-validated against live state at commit time, and `applyCommand` re-validates again — domain stays authoritative.
3. **Preview:** whole candidate set colored by the single authoritative validation (`showRoadPreview(cells, valid)` with a pooled indicator mesh set, shared material). Never per-cell guesses; never claims valid what the domain rejects.
4. **Rendering:** one flat slab per authoritative road cell (gray `0x6b7280` under construction → dark slate `0x39404f` operational) plus a lighter marking whose span derives from snapshot `connections` (segment along each connected axis; pad when isolated/corner/crossing). Reuses the keyed `reconcile()` contract (create/update/remove, stable identity).
5. **Orientation placement:** derived in `toRenderSnapshot` as `RenderRoad.connections` (`north/east/south/west`, operational neighbours only; all-false while under construction) — the renderer consumes it and never derives domain adjacency itself (repo convention). Derived projection only: never persisted, never hashed.
6. **HUD/stats:** `Roads: N (M operational)` row + `__nova.stats` gains `roads`, `operationalRoads` (numeric strings, like the existing road fields).

## Implementation

- `index.html`: `Road · 5` palette button (`data-testid="build-road"`, own `mobility selection` group); `Roads` stat row (`data-testid="stat-roads"`).
- `src/app/main.ts` (+239/−50 with refactor): tool model, road selection, drag state, domain-backed preview/commit, roads HUD, extended `__nova.stats` type + values.
- `src/application/queries/renderSnapshot.ts`: `RenderRoadConnections` + `roadConnections()` derivation.
- `src/renderer/three/entityViews.ts`: `roadOps` (RoadView: slab + marking).
- `src/renderer/three/novaRenderer.ts`: `roadGroup` reconciliation + `showRoadPreview` pool.
- `package.json`: `test:e2e:road` script.
- No domain file touched. `SAVE_VERSION` stays 4.

## Tests

`tests/roadConstruction.test.ts` — 23 tests, all passing:
- Command path (A–K): controller dispatch reaches `placeRoads`; single/vertical/horizontal placement; diagonal unsupported; drag-direction independence (same hash); duplicate-cell collapse; out-of-bounds / building-collision / road-occupancy / insufficient-Material rejection with zero mutation.
- Preview contract (L): every UI status reason comes from the authoritative validator; whole-drag pricing (`3 × 5`).
- Lifecycle + gameplay proof (M–P): under-construction → operational; player-built road unlocks production (`0 → 2/tick`, cost `5 + upkeep 1` on the placement tick); resumed production flows through the unchanged 08F clamp (stock 24 → stored 1 → equilibrium 24); employment/upkeep/buildings/colonists untouched by road construction.
- Projection/persistence/determinism (Q–W): connections for straight/endpoint/isolated/crossing; under-construction never connected; save→load preserves roads with identical hash and serializes no `connections`/`orientation`; deterministic replay; input-state purity; building path unregressed; cost label shares the domain constant.
- Full suite: **22 files / 331 tests pass** (was 21 / 308 at 09G). `pnpm lint`, `pnpm typecheck`, `pnpm build` clean.

## Browser verification

New `e2e/roadRun.mjs` (headless-verified; headed by default like sibling suites) — **ROAD E2E RESULT: ALL PASS**, zero console/page errors:
- A: fresh state (tick 0, roads 0, material 100); Road tool selectable, label carries the domain cost.
- B: valid preview (`road 1 cell — ready · material 5`).
- C: Residence → Colonist → roadless staffed Workshop: production `0`, upkeep `1`, `productionBlockedByRoad 1`.
- D: building-cell click and diagonal drag rejected; roads and Material unchanged.
- E: 4-cell vertical drag placed; material `49 → 28` (= `4 × 5` + upkeep `1`); `roads 4, operationalRoads 0` — construction state visible.
- F: one STEP → `operationalRoads 4`, `buildingsWithRoadAccess 1`, blocked `0`, `materialProduction 2/tick` (net `1`).
- G: single-cell road for the Residence → `mobilityConnectedColonists 1` (derived 09G relation appears, production already resumed — informational only).
- Screenshots `artifacts/road/01–04` inspected: preview indicator aligns to the grid; construction slabs gray and marking-less; operational roads dark slate with center marking; no clipping or coordinate mismatch.

## GPU verification

`e2e/gpuRun.mjs` result: **environmental FAIL, not a 09H regression.** The suite requires a physical NVIDIA GPU (`!software && nvidia`); this container exposes only SwiftShader (ANGLE/Vulkan software rasterizer), so the renderer-string assertion fails before any scene content is examined. Evidence gathered instead: canvas present, `three.js WebGLRenderer active (r186)`, WebGL2 context live, road screenshots render correctly with no WebGL/console errors in `roadRun`. Genuine GPU verification (hardware GL, road preview alignment at full raster) remains for a GPU-equipped runner.

## Persistence

`SAVE_VERSION = 4` unchanged. No UI state (tool, hover, preview, orientation, marking) persisted. Roads persist exactly as before (test S).

## Determinism

Road placement deterministic by construction (09C normalization); verified: drag-direction independence, deterministic replay, purity (tests F, T, U).

## Regression

All pre-existing suites pass unmodified: vitest 331/331; E2E `run`, `transport`, `production`, `resource`, `food`, `temporal` ALL PASS; `jobs`/`upkeep` exit 0 with their pre-existing 09F deferral notes.

## Scope audit

Diff: 6 modified + 3 new files (`git diff --stat`: 405 insertions, 50 deletions across app/queries/renderer shells; docs + e2e + tests new). No movement, pathfinding, distance/time, commute, vehicles, transit, cargo, traffic, tiers, highways, upgrades, demolition, refunds, upkeep, money, pollution, mobility-gated jobs, or persistent mobility state. No new road graph (orientation is a per-cell derived projection); no second validation; no UI mutation of canonical state.

## Known limitations

1. `e2e/jobsRun.mjs` and `e2e/upkeepRun.mjs` still print their 09F-era deferral ("no road palette UI") — now stale, since the palette exists. Re-enabling them is intentionally left out of this step's scope.
2. Diagonal/L-shaped drags are rejected by design (09C geometry); the message says so explicitly.
3. Genuine hardware-GPU verification pending (see GPU verification).
4. Road inspection panel (click a road to see its status/network) does not exist; road state is visible via slab color + HUD + stats only.

## Next design question

Now that the player can build roads, the 09F bootstrap tension is real gameplay: the first road costs Material the colony can only renew through road-served Workshops. Should the roadmap keep the cold-start cost (roads as a deliberate early-game investment against the 100 starting stock), or does the economy need a bootstrap carve-out (e.g. first-road discount, cheaper dirt paths) before any further mobility rule raises the stakes?
