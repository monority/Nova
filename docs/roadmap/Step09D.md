# NOVA — Step 09D — Road Network Connectivity

## Context

Step 09A COMPLETE

Commit:
`c29e30e`

Step 09B COMPLETE

Commit:
`a1b5b99`

Step 09C COMPLETE

Commit:
`4dc5451`

Current baseline:

* finite integer grid;
* BuildingState is authoritative;
* RoadState is now authoritative;
* roads occupy one grid cell;
* Building and Road cannot share a cell;
* road placement uses the command architecture;
* road construction uses the existing construction lifecycle;
* road construction costs 5 Material per road cell;
* horizontal/vertical drag construction exists;
* road state participates in save/load/hash;
* SAVE_VERSION remains 4;
* deterministic replay is green;
* existing economy is unchanged;
* 09A adjacency/connectivity foundation exists;
* no road-network connectivity exists yet.

## Objective

Implement the first real road network.

The network must be derived exclusively from **operational RoadState**.

The core rule is:

> Two operational road cells belong to the same road network when their grid cells are orthogonally adjacent.

No diagonal connectivity.

No Building participation in the graph itself.

No movement.

No pathfinding.

No public transit.

No population flow.

No vehicles.

---

# Phase A — Audit first

Before modifying code, inspect:

* RoadState introduced by 09C;
* road storage;
* road IDs;
* operational status;
* grid helpers;
* `areOrthogonallyAdjacent`;
* Step 09A connectivity implementation;
* existing query conventions;
* deterministic ordering conventions;
* save/hash behavior.

Determine the smallest way to derive road connectivity from the authoritative road state.

Do not assume the Step 09A implementation should simply be copied.

Decide whether it should be:

* generalized minimally;
* replaced;
* retained as a lower-level helper;
* or superseded.

Document the decision.

---

# Phase B — Network definition

A road network is a connected component of operational road cells.

Examples:

```text
A ─ B ─ C ─ D
```

= one network.

```text
A ─ B     C ─ D
```

= two networks.

Intersection:

```text
    B
    │
A ─ C ─ D
    │
    E
```

= one network.

Diagonal-only:

```text
A ·
  · B
```

= two networks.

Under-construction roads are not part of the operational network.

---

# Phase C — Derived state only

Network connectivity must NOT be persisted.

Do not add:

* networkId to RoadState;
* connectedComponentId;
* cached reachable roads;
* persisted adjacency lists.

The network is derived from authoritative road positions/status.

Equivalent states must produce equivalent network results.

Queries must remain pure.

---

# Phase D — Determinism

Use deterministic traversal/order.

Do not rely on:

* random ordering;
* wall clock;
* unstable iteration where ordering affects returned results.

If road IDs are returned, normalize them deterministically.

If network components are returned, order components deterministically.

For example:

```text
lowest road ID first
```

may be used as a stable component ordering rule if consistent with repository conventions.

Do not introduce a generic graph framework.

---

# Phase E — API

Introduce only the smallest useful application/domain query surface.

Potential concepts:

```text
getRoadNetwork(...)
getRoadNetworkCount(...)
getConnectedRoadIds(...)
```

Use names appropriate to the repository.

Do not expose more API than tests/UI actually require.

A useful minimal primitive is likely:

```text
getConnectedRoadIds(state, roadId)
```

or an equivalent pure query.

The implementation must reject/handle:

* unknown road;
* under-construction road;
* operational road.

The exact behavior should be documented and tested.

---

# Phase F — Important invariants

Test explicitly:

### 1. Empty

No roads:

```text
network count = 0
```

### 2. One road

One operational road:

```text
network count = 1
```

### 3. Adjacent

```text
A-B
```

one network.

### 4. Multi-hop

```text
A-B-C-D
```

one network.

### 5. Disconnected

```text
A-B    C-D
```

two networks.

### 6. Diagonal

```text
A .
. B
```

two networks.

### 7. Intersection

```text
  B
  |
A-C-D
  |
  E
```

one network.

### 8. Under construction

An under-construction road must not connect two operational road components.

### 9. Lifecycle

After construction completes, the road enters the network without any persisted network mutation.

### 10. Multiple components

Each disconnected component is independently queryable.

### 11. Purity

Network queries do not mutate state.

### 12. Determinism

Equivalent state produces identical network results.

### 13. Save/load

Save/load does not persist a network cache but produces identical derived network results.

### 14. Existing Step 09A behavior

Do not allow the old Building↔Building connectivity query to silently become the production definition of transport.

---

# Phase G — Performance

The current settlement scale is small.

Do NOT optimize prematurely.

An O(n²) scan may be acceptable if that is what the current repository naturally supports.

Prefer correctness and readability.

Do not introduce:

* spatial indexes;
* union-find;
* graph caches;
* memoization;
* generic spatial databases.

Only introduce a more sophisticated algorithm if the existing data model makes it necessary.

---

# Phase H — UI / rendering

No new gameplay UI is required.

If useful for verification, expose only minimal debug information through the existing test/debug stats mechanism.

Do not build a network panel.

Do not render network IDs.

Do not add visual road highlighting as a product feature.

That belongs to a later visual mobility step.

---

# Phase I — Tests

Create focused tests for:

* empty network;
* one road;
* adjacent roads;
* multi-hop;
* disconnected components;
* diagonal exclusion;
* intersection;
* under-construction exclusion;
* operational transition;
* unknown road;
* multiple components;
* query purity;
* determinism;
* save/load derived equivalence.

Use the smallest useful test fixture.

Do not modify existing economic tests unless regression requires it.

---

# Phase J — E2E

Extend the existing E2E infrastructure only enough to verify:

1. construct multiple roads;
2. create one connected road chain;
3. create a disconnected road segment;
4. verify derived network count/connectivity;
5. advance construction;
6. verify under-construction exclusion;
7. verify operational inclusion.

Screenshots are optional unless the network is visually represented.

Do not implement new product UI just for this test.

---

# Regression

Run:

* full Vitest;
* transport E2E;
* relevant construction E2E;
* lint;
* typecheck;
* build.

Expected:

* all existing tests remain green;
* no economic behavior changes;
* no save schema change;
* SAVE_VERSION remains 4;
* road save/hash remains stable;
* deterministic replay remains identical.

---

# Architectural constraints

Do NOT introduce:

* Graph class;
* TransportEngine;
* RoadNetworkManager;
* NetworkManager;
* PathfindingEngine;
* generic graph library;
* movement system;
* transit system;
* vehicle system;
* logistics;
* congestion;
* travel time;
* road tiers;
* highways.

The road network is a concrete derived query over RoadState.

---

# Documentation

Create:

`docs/roadmap/Step09D.md`

Document:

1. audit;
2. network definition;
3. connectivity rule;
4. operational-state rule;
5. deterministic ordering;
6. API;
7. tests;
8. E2E;
9. performance;
10. relationship to Step 09A;
11. deferred systems.

Explicitly state that:

`Building ↔ Building`

is no longer the intended production transport model.

The intended future model is:

`Building → Road → Road Network → Road → Building`

but Building access is NOT implemented in 09D.

---

# Acceptance criteria

Step 09D is COMPLETE only if:

* [ ] operational roads form derived connected components;
* [ ] orthogonal adjacency connects roads;
* [ ] diagonal adjacency does not;
* [ ] intersections work naturally;
* [ ] under-construction roads are excluded;
* [ ] multiple disconnected networks work;
* [ ] network state is not persisted;
* [ ] queries are pure;
* [ ] results are deterministic;
* [ ] save/load produces identical derived network results;
* [ ] Step 09A remains regression-safe;
* [ ] no Building accessibility is implemented;
* [ ] no movement/pathfinding is implemented;
* [ ] no transit simulation is implemented;
* [ ] no vehicle/logistics system is implemented;
* [ ] full tests pass;
* [ ] lint passes;
* [ ] typecheck passes;
* [ ] build passes;
* [ ] no unnecessary generic abstraction is introduced.

## Commit

If complete:

`Step 09D: establish road network connectivity`

Do not begin Step 09E in this task.

---

# Final report

Return:

## 1. STATUS

`COMPLETE` or `BLOCKED`

## 2. Commit

Hash + parent.

## 3. Audit

What was found before implementation.

## 4. Network model

Exact connectivity rules.

## 5. Step 09A relationship

What was retained, replaced, or deprecated.

## 6. Files changed

Complete list.

## 7. Tests

Vitest / E2E / lint / typecheck / build.

## 8. Persistence

Confirm SAVE_VERSION and absence of persisted network state.

## 9. Determinism

Confirm equivalent road states produce identical derived results.

## 10. Deferred systems

Explicit list.

## 11. Design questions discovered

Do not silently resolve future game-design questions.

## 12. Scope declaration

Confirm that no movement, pathfinding, transit, vehicles, logistics, congestion, or road tiers were implemented.


---

# Final report (AS-BUILT)

## 1. STATUS

`COMPLETE`

## 2. Commit

* **Commit hash:** pending (this commit)
* **Parent commit:** `4dc5451` (Step 09C)

## 3. Audit

Audited before touching the network code:

* `RoadState` (09C): `{ id, x, y, status, constructionRemaining }`, authoritative in `state.roads`;
* road storage: plain record keyed by id; `counters.nextRoadId` allocates `road-N` ids;
* operational status: `isOperationalRoad` (`status === 'operational'`); roads start `underConstruction` with `ROAD_CONSTRUCTION_TICKS = 2` and reuse the building `advanceConstruction` path;
* grid helpers: `cellKey`, `CellCoordinate` (same primitive as buildings);
* Step 09A connectivity: `getAccessibleBuildingIds` — Building↔Building reachability from Residence roots via `areOrthogonallyAdjacent` in `src/domain/network/network.ts`;
* query conventions: pure derivations, ascending-id deterministic iteration (`iterateRoads` mirrors `iterateBuildings`);
* save/hash: `SAVE_VERSION = 4`, roads already serialized/validated in `save.ts`, hashed via canonical serialization.

Decision (documented per Phase A): **retain 09A as-is, add a separate road-only derivation**. The 09A Building graph answers a different question (which buildings reach a Residence); road networks answer component-of-operational-roads. Generalizing 09A into one shared graph would entangle building semantics with road semantics for no test-required benefit. No Graph class introduced.

## 4. Network model

* Two operational road cells are in the same network iff their grid cells are **orthogonally adjacent** (Manhattan distance exactly 1, `areRoadsAdjacent`).
* Diagonal adjacency never connects.
* A network = connected component of operational roads only. Under-construction roads are invisible to the graph (they neither belong nor bridge).
* Multi-source BFS over operational roads; neighbors discovered in ascending road-id order.

## 5. Step 09A relationship

* **Retained**: `areOrthogonallyAdjacent` (grid helper), 09A Building accessibility query unchanged and regression-safe.
* **Not reused for roads**: the Building graph is not the production transport model. Road networks derive from `RoadState` exclusively.
* 09A's `getAccessibleBuildingIds` remains the Building↔Building query; the intended future model is `Building → Road → Road Network → Road → Building`, with Building access NOT implemented in 09D.

## 6. Files changed

* `src/domain/road/road.ts` — `areRoadsAdjacent`, `getConnectedRoadIds`, `getRoadNetworks`, `getRoadNetworkCount` (derived only);
* `src/application/queries/roads.ts` — application-layer re-exports of the three network queries (pure pass-through);
* `src/index.ts` — barrel already exported `domain/road/road.js` (09C); kept as-is;
* `src/app/main.ts` — debug stats only: `roadNetworks` counter added to `window.__nova.stats()` (Phase H, no product UI);
* `tests/roadNetwork.test.ts` — new: 14 focused tests;
* `docs/roadmap/Step09D.md` — this document.

## 7. Tests

* Vitest: **265 passed / 265** (18 files), including new `tests/roadNetwork.test.ts` (14 tests: empty, one road, adjacent, multi-hop, disconnected, diagonal exclusion, intersection, under-construction exclusion + operational inclusion, bridge lifecycle, unknown road, multiple components, purity, determinism, save/load);
* transport E2E (09A): **ALL PASS** (headless), no regression;
* road E2E (Phase J): **DEFERRED**. The browser app has no road palette and no road drag UI yet (road placement exists only in the domain/command layer, per 09C which shipped placement without a road palette). Real-browser road construction therefore cannot drive the E2E without first building product UI, which Phase H explicitly forbids for this step ("no new gameplay UI is required", "Do not implement new product UI just for this test"). The `roadNetworks` debug counter is exposed on `window.__nova.stats()` so the E2E extension is a pure test-runner addition once a road palette ships. Placement/lifecycle coverage is instead provided by the Vitest simulation-path tests (H, I use the real `stepSimulation` command path, not synthetic states);
* lint: **clean**;
* typecheck: **clean**;
* build: **success** (chunk-size warning pre-existing, not from this step).

## 8. Persistence

* `SAVE_VERSION` remains **4**;
* no network field, cache, component id, or adjacency list is serialized — `save.ts` untouched;
* save/load round-trip reproduces byte-identical canonical state and identical derived networks (test N).

## 9. Determinism

* `iterateRoads` sorts ids before iteration; BFS neighbors in ascending id order;
* networks ordered by lowest road id; ids within a network sorted ascending;
* reversed record key insertion produces identical results (test M);
* replay of identical canonical state yields identical derived networks.

## 10. Deferred systems

Not implemented in 09D:

* Building ↔ Road accessibility (door/adjacency model);
* movement, pathfinding, routes;
* public transit, population flow;
* vehicles, logistics, congestion, travel time;
* road tiers, highways, orientation persistence;
* network panel / road highlighting product UI.

## 11. Design questions discovered

* Should a road adjacent to a building make the building "connected" (09E+)? Adjacency vs. dedicated access tile is unresolved — deferred to the Building-access step.
* Road orientation is derivable from the neighbor mask; whether orientation ever needs persistence (rendering sprites) is a later visual decision.
* Network merge/split has no gameplay effect yet; cost/benefit of road networks (upkeep? speed? delivery range?) is a game-design question, not decided here.
* Drag construction of L-shaped roads returns null (09C contract kept); whether L-shapes become legal later is deferred.

## 12. Scope declaration

No movement, no pathfinding, no transit, no vehicles, no logistics, no congestion, no road tiers were implemented. The road network is a pure derived query over authoritative `RoadState`. No Building accessibility was implemented. No generic graph abstraction was introduced.
