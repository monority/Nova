# NOVA — Step 09B — Road Infrastructure Design & Spatial Transport Contract

## Context

Step 09A is COMPLETE.

Commit:

`c29e30e`

Parent:

`fa84cd4`

Current validated state:

* integer grid coordinates already exist;
* building-cell occupancy already exists;
* construction placement already exists;
* no existing road entity;
* no existing road network;
* no existing movement/logistics system;
* operational Residences currently act as connectivity roots;
* Step 09A introduced a minimal derived orthogonal connectivity query;
* connectivity is not persisted;
* SAVE_VERSION remains 4;
* deterministic replay/save/hash invariants are green;
* total Vitest: 251/251;
* transport E2E passes;
* economy remains unchanged.

## Important design clarification

NOVA is a spatial city-builder / settlement optimizer.

Buildings are genuinely spatial.

The player optimizes:

* building placement;
* proximity and separation;
* available land;
* future infrastructure;
* economic consequences of spatial decisions.

Roads are intended to be **constructed infrastructure**, not merely an invisible graph derived from adjacent buildings.

The future transport model should therefore conceptually move toward:

`Building → Road access → Road network → Road access → Building`

rather than permanently treating adjacent buildings as directly connected.

There may eventually be multiple road tiers:

* cheap/basic roads;
* improved roads;
* advanced infrastructure / highways.

However, those are future design concerns.

## Objective

Do NOT implement full transport yet.

Instead, perform a focused architecture + design audit of the current repository and produce the smallest coherent **road infrastructure contract** that NOVA can implement in a subsequent step.

The purpose of this step is to remove ambiguity before introducing persistent road entities.

---

# Phase A — Repository audit

Inspect the existing implementation before making changes.

Trace:

1. canonical map/grid representation;
2. building positions;
3. cell occupancy;
4. placement validation;
5. construction lifecycle;
6. operational state;
7. rendering coordinates;
8. serialization;
9. save/load;
10. hashing;
11. commands;
12. simulation phases;
13. Step 09A network query;
14. any existing concept that could naturally represent infrastructure.

Explicitly determine:

* whether roads can occupy the same cells as buildings;
* whether roads should occupy cells independently;
* whether a road should be a building-like entity or a separate domain entity;
* whether intersections require special representation;
* whether one cell can contain multiple infrastructure layers;
* whether roads need orientation;
* whether roads can be built during construction;
* whether roads can be demolished later;
* whether road construction should use the existing command architecture;
* whether terrain boundaries already exist;
* whether the current grid is finite and how its bounds are represented.

Do not assume answers.

Record observations from the actual repository.

---

# Phase B — Identify the minimal road model

Design the smallest road representation capable of supporting the intended future transport model.

The design must answer:

### 1. Road identity

How is a road represented?

Possible direction:

* deterministic road ID;
* occupied grid cell(s);
* road tier/type.

But choose the representation based on the repository rather than introducing abstractions speculatively.

### 2. Road geometry

Determine whether a road is:

* one grid cell;
* an edge between cells;
* a segment containing multiple cells;
* another existing spatial primitive.

Prefer the smallest model that supports:

* intersections;
* connected road networks;
* building access;
* future movement.

### 3. Connectivity

Define what makes two road pieces connected.

At minimum, establish whether:

* orthogonal adjacent road cells connect;
* diagonal cells do not connect;
* intersections are naturally represented;
* road orientation is required or can be derived.

Do not implement pathfinding yet.

### 4. Building access

Define what it means for a building to have road access.

Do NOT automatically assume:

`building adjacent to building = transport`

Instead investigate a future rule such as:

`building has access when its footprint/frontage is adjacent to a valid road cell`

Only establish the contract here.

Do not yet implement movement or logistics.

### 5. Construction lifecycle

Determine how roads fit into the existing lifecycle:

`planned → under construction → operational`

or another model if the repository already has a suitable canonical lifecycle.

Avoid introducing a second lifecycle system.

### 6. Persistence

Determine what road information must eventually be persisted.

Derived connectivity must remain derived.

Do not persist:

* reachable road sets;
* connected component IDs;
* accessibility caches;
* pathfinding results.

Persist only authoritative road state if the design requires it.

---

# Phase C — Economic interaction audit

Do NOT implement road costs yet.

Instead inspect the existing economic/construction model and determine how roads could eventually interact with:

* Material;
* construction duration;
* infrastructure tiers;
* limited land.

The goal is only to establish whether the existing construction transaction can naturally support roads.

Do not modify current building costs.

Do not rebalance the economy.

Do not add money.

Do not add maintenance.

---

# Phase D — Interaction with Step 09A

Explicitly decide the future role of the Step 09A connectivity query.

It may become:

1. replaced by road-network connectivity;
2. retained as a low-level spatial helper;
3. temporarily retained for verification;
4. removed once road connectivity supersedes it.

Do not create two competing transport models.

Document the decision.

The important distinction is:

```text
Step 09A:
spatial adjacency / connectivity foundation

Future transport:
constructed road infrastructure
```

Step 09A must not accidentally become the permanent definition of transport.

---

# Phase E — Design contract

Create:

`docs/roadmap/Step09B.md`

The document must contain:

## 1. Current spatial model

Document what actually exists.

## 2. Problems / missing concepts

Document what is required before roads can exist.

## 3. Proposed road domain model

Define the minimum authoritative state.

## 4. Spatial rules

Define:

* road occupancy;
* adjacency;
* intersections;
* boundaries;
* building access;
* operational status.

## 5. Lifecycle

Define how road construction interacts with the existing lifecycle.

## 6. Persistence

Define authoritative vs derived state.

## 7. Future transport contract

Document the intended chain:

`Building → Road → Road Network → Road → Building`

without implementing movement.

## 8. Explicitly deferred systems

At minimum:

* pathfinding;
* colonist movement;
* vehicles;
* logistics;
* cargo;
* congestion;
* travel time;
* road upgrades;
* highways;
* traffic simulation;
* transport costs;
* transport maintenance.

## 9. Migration from Step 09A

Explain how the current adjacency-based foundation transitions toward actual road infrastructure.

---

# Architectural constraints

Do not introduce:

* generic Graph;
* TransportEngine;
* RoadNetworkManager;
* InfrastructureManager;
* PathfindingEngine;
* generic Entity framework;
* generic spatial framework.

Avoid abstraction unless the repository already demonstrates a second real use case.

Keep domain/application/rendering separation intact.

Do not duplicate coordinate systems.

Do not introduce floating-point world coordinates if the canonical simulation already uses integer grid coordinates.

Do not create persisted derived state.

Do not change SAVE_VERSION unless the audit proves that the current save schema must change immediately.

Do not alter simulation phase ordering.

Do not modify existing economic coefficients.

Do not add UI unless needed to validate an already-existing concept.

---

# Required output

This is primarily an **audit/design step**.

The preferred result is:

* repository audit;
* design decision;
* `docs/roadmap/Step09B.md`;
* tests only if needed to lock an already-existing invariant.

Do NOT implement full roads simply because a possible design has been identified.

If the current architecture is not sufficient to support a clean road model, stop after documenting the blocker instead of inventing infrastructure.

---

# Verification

Even though this is primarily a design step, run the normal regression suite:

* Vitest;
* lint;
* typecheck;
* build;
* existing E2E suite if practical.

Confirm:

* 251 existing tests remain green;
* no existing E2E regression;
* SAVE_VERSION remains 4 unless explicitly justified;
* save/hash behavior unchanged;
* determinism unchanged;
* no economy behavior changed.

---

# Final report

Return:

## 1. STATUS

`COMPLETE` or `BLOCKED`

## 2. Commit

Provide commit hash and parent.

## 3. Spatial audit

Summarize the actual repository findings.

## 4. Road model decision

Explain the chosen minimal model and why it fits the existing architecture.

## 5. Step 09A relationship

Explain exactly what remains useful and what should eventually be superseded.

## 6. Files changed

List every modified/created file.

## 7. Tests

Report:

* Vitest;
* E2E;
* lint;
* typecheck;
* build.

## 8. Persistence

Report SAVE_VERSION and save/hash status.

## 9. Determinism

Report replay/hash verification.

## 10. Deferred systems

Explicitly list what was NOT implemented.

## 11. Design questions discovered

If any important game-design question remains unresolved, state it clearly instead of silently choosing an arbitrary answer.

## 12. Scope declaration

Confirm:

* no movement;
* no pathfinding;
* no vehicles;
* no logistics;
* no traffic;
* no road tiers implementation;
* no economic rebalance;
* no generic transport framework.

## Commit

If the step is complete:

`Step 09B: define road infrastructure contract`

Do not begin Step 09C in this task.

---

# AS-BUILT — Step 09B Design Contract (audit + decisions)

Spec above (§Phase A–E) is preserved. What follows is the executed audit
and the binding contract for the subsequent road-implementation step.
No production code was changed in this step.

## 1. Current spatial model (what actually exists)

1. Canonical grid: `src/domain/world/grid.ts:8-12` —
   `WorldConfig { seed, width, height }`. Finite rectangle, origin `(0,0)`.
   Bounds: `isInBounds` (`grid.ts:19-20`) = `0<=x<width && 0<=y<height`.
   No terrain, no zones, no cost map, no infinite world. Config validated in
   `src/domain/simulation/state.ts:57-68` (positive-int w/h, non-empty seed).
2. Building positions: `src/domain/building/building.ts:15-23` —
   `BuildingState { id, type, x, y, status, constructionRemaining }`.
   Single integer cell per building; no w/h, no multi-cell footprint, no
   layer, no orientation. Only three types
   (`building.ts:11`): `residence | farm | workshop`.
3. Cell occupancy: `src/domain/simulation/phases.ts:72-83` — `isCellOccupied`
   linear-scans `iterateBuildings` for exact `x== && y==` match. One building
   per cell; under-construction buildings already block
   (`phases.ts:120-122` → `cellOccupied`).
4. Placement validation: `src/domain/simulation/phases.ts:108-127` —
   `validatePlacement` order: `unknownBuildingType → outOfBounds →
   cellOccupied → insufficientResources`. Single source of truth for sim
   (`applyCommand`) and UI hover (`src/app/main.ts:418-421`).
5. Construction lifecycle: `src/domain/building/building.ts:13` —
   `BuildingStatus = 'underConstruction' | 'operational'`. There is NO
   `planned` state despite the doc comment (`building.ts:4-8`); creation
   (`state.ts:73-88`) hardcodes `underConstruction`. Progress
   (`phases.ts:209-243`): `remaining-1`, `0 → operational`. Orchestrated in
   `src/domain/simulation/step.ts:34` (`advanceConstruction` first each tick)
   plus `progressPlacedBuilding` catch-up (`step.ts:59`, `phases.ts:184-202`)
   preserving the 2-tick contract.
6. Operational state: canonical flag is `status === 'operational'`
   (+ `constructionRemaining === 0`). Helpers: `isOperationalResidence`
   (`housing.ts:19-20`), `isOperationalWorkshop` (`jobs.ts:37-38`),
   `countOperationalFarms` (`phases.ts:314-315`). Renderer/HUD only derive
   from it (`entityViews.ts:75`, `main.ts:275-279`).
7. Rendering coordinates: single mapping pair, no second sim system.
   `simulationCellToWorldPosition` (`renderer/three/coordinates.ts:22-28`,
   centered `y=0`) and inverse `worldPositionToSimulationCell` via
   `Math.round` (`coordinates.ts:31-38`). Picking: `pickCell`
   (`novaRenderer.ts:94-112`) → `isInGrid` mirror (`coordinates.ts:40-44`).
   Renderer holds a duplicate `CellCoordinate`/`GridDimensions`
   (`coordinates.ts:11-19`) as a boundary copy; sim stays authoritative.
8. Serialization: `src/application/persistence/save.ts:15,23-29` —
   `SAVE_FORMAT='nova-save'`, `SAVE_VERSION=4`, `SaveFile { format, version,
   state }` via `canonicalJson`. Load (`save.ts:58-176`) rejects wrong
   format/version, enforces finite-int `x/y/tick/ids/stocks`, key/id match,
   canonical round-trip equality.
9. Hashing: `src/domain/simulation/hash.ts:17-59` — `canonicalJson` (sorted
   keys) + FNV-1a 64-bit hex. Canonical state =
   `config/time/resources/buildings/colonists/counters` (`state.ts:28-35`);
   no derived data hashed.
10. Commands: exactly one command exists
    (`src/domain/simulation/command.ts:10-17`):
    `PlaceBuildingCommand { type:'placeBuilding', x, y, buildingType }`,
    `SimulationCommand` closed union. Sole mutation path:
    `dispatchCommand → stepSimulation` (`application/commands/dispatch.ts:14-17`,
    `step.ts:27-30`). `applyCommand` (`phases.ts:139-173`) re-validates and
    atomically creates + deducts; invalid = explicit no-op.
11. Simulation phases (fixed order, `phases.ts:1-22`, `step.ts:34-64`):
    `1 advanceConstruction, 2 updateNeeds, 3 produceFood, 4 consumeFood,
    5 updatePopulation, 6 assignJobs, 7 produceMaterial, 8a applyCommand,
    8b upkeepBuildings, 9 advanceTime`. Transport participates in none yet.
12. Step 09A query: `src/domain/network/network.ts:36-95` —
    `areOrthogonallyAdjacent` (`|dx|+|dy|===1`, diagonal excluded),
    `getAccessibleBuildingIds` (multi-source BFS from operational Residences
    over operational buildings, ascending-id expansion, sorted return),
    `isBuildingAccessible`; app surface `getAccessibleBuildingCount`
    (`application/queries/network.ts:11-12`). Derived only, never persisted
    (`network.ts:24-25`). Tests: `tests/transportNetwork.test.ts` (12 cases).
13. Infrastructure concept: NONE. `grep road` in `src` hits only the
    absence comment (`network.ts:7`). No `Road/Tile/Segment/Network/Manager/
    Engine`, no tier, edge, orientation, layer. E2E `e2e/transportRun.mjs`
    asserts 09A accessibility only.
14. Economy: uniform construction catalog (`building.ts:43-53`) — all types
    `ticks:2, cost:25 Material, housing 1/0/0`. `INITIAL_CONSTRUCTION_MATERIAL
    =100`, `INITIAL_FOOD=100` (`resource.ts:21-23`); production
    `MATERIAL_PER_WORKER_PER_TICK=2`, `FOOD_PER_FARM_PER_TICK=2`,
    upkeep `1/staffed-workshop/tick`, storage `25/operational-workshop`
    (`resource.ts:27-49`). Atomic `has/deductResources` (`resource.ts:56-70`);
    08F clamp discards overflow (`phases.ts:495-517`); upkeep is partial,
    never debt (`phases.ts:567-595`).
15. Demolition: NONE. No `removeBuilding/destroy/bulldoze` command, phase, or
    query. `remove` hits are renderer view disposal (`entityViews.ts:102-103`,
    `novaRenderer.ts:80,89`, `reconcile.ts:13,35`) and colonist starvation
    (`phases.ts:363-365`) only.

## 2. Problems / missing concepts (blockers for roads)

1. No road entity, no road collection, no road counter — nowhere to persist
   authoritative road state.
2. `isCellOccupied` only scans `buildings`; a second occupant class needs a
   unified blocker check or buildings and roads will stack.
3. `BuildingType` is closed and economically loaded (housing/jobs/food); a
   road must NOT extend it or it inherits housing, jobs, upkeep, storage.
4. `validatePlacement` / `applyCommand` only know `placeBuilding`; no road
   command shape, no road validation entry point.
5. `advanceConstruction` / `progressOneBuilding` only iterate `buildings`;
   roads need the same lifecycle without a second system.
6. `validateStateShape` / save schema know only `buildings/colonists`; a new
   collection forces a principled `SAVE_VERSION` bump at implementation time
   (NOT in this step).
7. No demolition primitive — road removal (and building removal) is undefined;
   must stay deferred rather than invented here.
8. No orientation/layer/edge primitive — must be decided (this contract:
   derived orientation, no layers, cell-based geometry).

## 3. Proposed road domain model (minimum authoritative state)

```text
RoadState {
  id: string            // deterministic, e.g. road-N via nextRoadId
  x: number             // integer grid cell, same CellCoordinate primitive
  y: number
  status: 'underConstruction' | 'operational'   // reuse BuildingStatus shape
  constructionRemaining: number
}
SimulationState += {
  roads: Readonly<Record<string, RoadState>>
  counters += { nextRoadId: number }
}
```

Why this shape:

* Mirrors `BuildingState` lifecycle fields without reusing `BuildingState`
  itself — reuse the *lifecycle pattern*, not the type, so housing/jobs/food
  selectors (`isOperationalResidence`, `jobCapacityOf`, farm counters,
  upkeep, storage) never match a road.
* Separate `roads` map + `nextRoadId` counter preserves determinism rules
  (`state.ts:7-11`): sorted iteration, counter-derived IDs, no randomness,
  canonical JSON hashing extends naturally.
* One cell per road piece (see §4). No `RoadTier` field in the MVP — tiers
  (`cheap/improved/highway`) are deferred; adding the enum now would be a
  speculative abstraction with one variant.
* No `orientation`, `networkId`, `componentId`, `accessible`, `path`, or
  `tier` fields — all derivable or deferred (§6).

Explicitly rejected alternatives:

* `BuildingType += 'road'` — rejected: pollutes housing (`housing.ts`),
  jobs (`jobs.ts`), food (`phases.ts:314`), upkeep/storage; violates
  "no second use case" only in reverse (wrong reuse).
* Edge-between-cells / multi-cell segment — rejected: requires a second
  spatial primitive with no consumer yet; cell model already supports
  intersections, networks, access, future movement.
* Generic `Graph/TransportEngine/RoadNetworkManager/InfrastructureManager/
  PathfindingEngine/Entity framework` — rejected per architectural
  constraints; no second real use case exists.

## 4. Spatial rules (binding)

1. Road occupancy: a road piece occupies exactly one integer grid cell, same
   `CellCoordinate` primitive as buildings. No floating-point world coords in
   sim; renderer mapping (`coordinates.ts`) is reused unchanged.
2. Exclusivity: one occupant per cell — building XOR road. A future unified
   check (`isCellBlocked = isCellOccupied(buildings) || isRoadAt(roads)`)
   must gate BOTH `validatePlacement` and road placement. Roads can NOT share
   cells with buildings; one cell can NOT contain multiple infrastructure
   layers in the MVP.
3. Adjacency: two road pieces connect iff `areOrthogonallyAdjacent`
   (`network.ts:36-39`, `|dx|+|dy|===1`). Diagonal cells do NOT connect.
   Reuse the existing helper — do not duplicate the rule.
4. Intersections: no special representation. A road cell with 3–4 operational
   road neighbours IS an intersection by topology. No crossing-bridge/tunnel
   concept.
5. Boundaries: finite rectangle only. Road placement reuses
   `isInBounds(state.config.world, cell)` (`grid.ts:19-20`); out-of-bounds is
   rejected with the existing `outOfBounds` reason shape. No terrain costs.
6. Building access (future rule, contract only): a building HAS road access
   iff its footprint cell is orthogonally adjacent to ≥1 OPERATIONAL road
   cell. Building↔building adjacency MUST NOT count as transport once roads
   exist. Under-construction roads grant no access and do not conduct.
7. Operational status: only `status === 'operational'` roads conduct
   connectivity and grant access — mirrors `network.ts:50-52`. Roads under
   construction are invisible to connectivity (neither node nor bridge).
8. Orientation: NOT stored. Direction/throughput shape is derived from the
   operational neighbour mask when (and if) rendering or movement needs it.

## 5. Lifecycle (reuse, no second system)

* Reuse the existing two-state lifecycle: `underConstruction →
  operational`, driven by `constructionRemaining` countdown. Do NOT introduce
  a `planned` state — none exists (`building.ts:13`); the prompt's
  `planned → under construction → operational` chain is aspirational, not
  canonical.
* Implementation sketch (for the later step, NOT this step):
  `advanceConstruction` maps over `roads` with the same `progressOneBuilding`
  semantics (generalised or mirrored `progressOneRoad`); `progressPlacedRoad`
  catch-up mirrors `progressPlacedBuilding` so a road placed via 8a completes
  on the same 2-tick contract. Phase order UNCHANGED (construction stays
  phase 1; road commands join phase 8a).
* Road construction goes through the existing command architecture:
  a future `PlaceRoadCommand { type:'placeRoad', x, y }` (`command.ts`
  union extension) handled by the same `dispatchCommand → stepSimulation →
  applyCommand` path, same validation order
  (`outOfBounds → cellBlocked → insufficientResources`), same atomic
  create+deduct semantics. No second mutation path.
* Demolition: NOT part of the MVP. No `removeRoad/destroy/bulldoze` command
  exists for buildings either; inventing removal now expands scope. Recorded
  as deferred (§8).

## 6. Persistence (authoritative vs derived)

* Authoritative (must persist at implementation time): `roads` map +
  `counters.nextRoadId`. Each entry persists `{ id, x, y, status,
  constructionRemaining }` with the same finite-int checks `save.ts:118-119`
  applies to buildings.
* Derived (MUST NEVER persist): reachable road sets, connected component IDs,
  `accessible` flags on buildings/roads, accessibility caches, neighbour
  masks/orientation, paths, travel times. Recomputed via pure queries over
  canonical state, same as 09A (`network.ts:24-25`).
* Versioning: `SAVE_VERSION` remains **4** in this design step (no schema
  change made). When roads are implemented, bump **4 → 5** following the
  established policy (`save.ts:16-23`): reject older versions explicitly, no
  silent migration. `validateStateShape` must then assert the `roads` record
  and `nextRoadId` counter, plus key/id match and canonical round-trip
  equality, exactly as it does for buildings.
* Hash: `hashCanonicalState` extends automatically once `roads` joins
  canonical state; no hash-function change. This step leaves hash behavior
  unchanged (verified §Verification).

## 7. Future transport contract (no implementation here)

```text
Building → Road access → Road network → Road access → Building
```

* Leg 1 — access: operational building cell orthogonally adjacent to ≥1
  operational road cell (§4.6).
* Leg 2 — network: transitive closure over operational road cells via
  orthogonal adjacency (§4.3). Deterministic BFS/DFS in stable id order,
  mirroring `getAccessibleBuildingIds` but over `roads`.
* Leg 3 — egress: symmetric to leg 1.
* Roots: operational Residences remain connectivity roots during migration
  (they seed the accessible set), but reachability must flow THROUGH roads,
  not through building↔building chains.
* Queries (names indicative for the later step, following repo conventions):
  `getAccessibleRoadIds(state)`, `isRoadAccessible(state, roadId)`,
  `hasRoadAccess(state, buildingId)`, `getAccessibleBuildingIdsViaRoads(state)`.
  Pure, deterministic, sorted output; domain-owned, app-surfaced, never in
  React/canvas code (09A §21 preserved).

## 8. Explicitly deferred systems

Pathfinding, colonist movement, vehicles, logistics, cargo, delivery/pickup,
warehouses/inventories/supply routes, congestion, travel time/speed/commute,
road upgrades, road tiers (`cheap/improved/highway`), highways, traffic
simulation, transport costs, transport maintenance/upkeep, road/building
demolition/bulldoze, multi-layer cells (bridges/tunnels), edge/segment
geometry, orientation persistence, generic graph/transport frameworks,
economy rebalance, money, UI panels/overlays (beyond existing test-only
`__nova.stats` if needed for E2E).

## 9. Migration from Step 09A

* Retain: `areOrthogonallyAdjacent` — the canonical adjacency rule. It is the
  correct low-level spatial helper for BOTH building-access checks and
  road↔road connectivity. No Euclidean-radius substitute.
* Temporarily retain for verification: `getAccessibleBuildingIds /
  isBuildingAccessible / getAccessibleBuildingCount` — they become the
  test oracle. During road implementation, E2E/unit tests assert the new
  road-based query against 09A behaviour on road-free maps (both must agree
  where no roads exist) and diverge exactly where roads are required
  (adjacent-building chains WITHOUT road mediation become inaccessible).
* Supersede then remove: building↔building transitivity as the DEFINITION of
  transport. Step 09A's own header delimits it
  (`network.ts:1-26`: "abstract spatial connectivity layer only"); it must not
  accidentally become permanent transport. Once
  `getAccessibleBuildingIdsViaRoads` lands, the 09A building-graph traversal
  is deleted (or relegated to a test helper), never run alongside the road
  model as a second production transport definition.
* Net effect:

```text
Step 09A: spatial adjacency / connectivity foundation (abstract, road-free)
    ↓
Step 09B (this): road infrastructure contract (no code, this document)
    ↓
Next step: persistent road cells + Building→Road→Network→Road→Building
           query; 09A query becomes oracle, then is superseded
```

## 10. Phase A explicit answers (traceability)

* Roads on building cells? NO — exclusive occupancy (building XOR road).
* Roads occupy cells independently? YES — own `roads` collection, own
  blocker check, unified against building placement.
* Building-like entity or separate domain? SEPARATE `RoadState`, not a
  `BuildingType` (see §3 rationale).
* Intersections need special representation? NO — emergent from adjacency
  degree.
* Multiple infra layers per cell? NO in MVP — one occupant per cell
  (preserves land scarcity).
* Orientation needed? NO — derived neighbour mask only, never persisted.
* Built during construction (lifecycle)? YES — same
  `underConstruction → operational` pattern via `advanceConstruction`.
* Demolishable later? UNDEFINED in current code (no primitive exists) —
  deferred, not designed here.
* Use existing command architecture? YES — `PlaceRoadCommand` through
  `dispatchCommand → applyCommand`, same validation/deduction atomicity.
* Terrain boundaries exist? NO — only finite rectangular bounds
  (`isInBounds`).
* Grid finite, bounds representation? YES — `WorldConfig { width, height }`,
  `0<=x<width && 0<=y<height`, positive-int validated.

## 11. Economic interaction audit (Phase C — no costs implemented)

The existing construction transaction CAN support roads without redesign:
`validatePlacement` already sequences spatial→resource checks; `applyCommand`
already does atomic create+`deductResources`; `hasSufficientResources`
gates on Material stock; duration is a per-catalog `constructionTicks`
integer. A road entry would need only a catalog-like `{ cost, ticks }`
constant (values UNDECIDED here — cheaper than 25 and/or faster than 2 ticks
are plausible but explicitly NOT chosen to avoid economy tampering). No
maintenance/upkeep for roads ( upkeep today is staffed-workshop-only,
`resource.ts:41`); no storage interaction (storage is workshop-count-based,
`resource.ts:49`); no money/maintenance systems exist to hook into. Land
cost is implicit via exclusive occupancy (§4.2). No building costs modified,
no coefficients touched, no UI added in this step.

## 12. Design questions discovered (unresolved, for game design)

1. Road cost/duration values (cheap/fast vs uniform 25/2)? — needs playtest,
   not chosen here.
2. Should roads require staffed workshops upkeep or stay upkeep-free? —
   recommend upkeep-free MVP; maintenance is deferred scope.
3. Should roads count toward storage capacity or remain neutral? — recommend
   neutral (storage stays workshop-derived).
4. Road demolition/refund policy? — no demolition primitive exists at all;
   whole feature deferred.
5. Multi-cell/edge geometry ever needed (highways)? — deferred; cell model
   suffices until a second real use case appears.
6. Multiple tiers with different speeds/costs? — deferred post-MVP.

## 13. Scope declaration

No movement, no pathfinding, no vehicles, no logistics, no traffic, no road
tiers implementation, no economic rebalance, no generic transport framework,
no production code changes, no SAVE_VERSION change, no phase-order change,
no UI changes. Docs-only step + regression verification.

## 14. Verification (this step)

* Vitest: 251/251 (17 files) — unchanged baseline, see §15.
* Lint / typecheck / build: clean — see §15.
* E2E: existing suites unaffected (no sim change); transport E2E from 09A
  remains the oracle for the next step, not re-run with new scenarios here
  beyond regression practicality.
* SAVE_VERSION: 4 (unchanged). Save/hash/determinism: unchanged (no state
  shape change).
* Economy: unchanged (no coefficients touched).

## 15. Files changed (this step)

* `docs/roadmap/Step09B.md` — appended §§1–15 design contract (this content);
  spec (§§Context–Final report) preserved above. No other files modified.

## STATUS

`COMPLETE`

## Scope confirmation

* [x] repository audit performed, observations recorded from actual code
* [x] minimal road model defined from repo primitives (cell + separate entity)
* [x] spatial rules defined (occupancy/adjacency/intersection/bounds/access)
* [x] lifecycle reuses existing system (no second lifecycle)
* [x] persistence split authoritative/derived, SAVE_VERSION stays 4
* [x] future `Building → Road → Network → Road → Building` contract stated
* [x] deferred systems listed
* [x] 09A migration path decided (retain helper, oracle, then supersede)
* [x] no movement/pathfinding/vehicles/logistics/traffic/tiers/economy change
* [x] no generic framework introduced


